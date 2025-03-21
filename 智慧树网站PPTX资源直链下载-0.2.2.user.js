// ==UserScript==
// @name         智慧树网站PPTX资源直链下载
// @namespace    https://your-namespace-url
// @version      0.2.2
// @description  修复原型污染和回调类型错误
// @author       二海
// @match        *://smartcoursestudent.zhihuishu.com/*
// @run-at       document-start
// @grant        unsafeWindow
// ==/UserScript==

(function() {
    'use strict';
    const TARGET_DOMAIN = 'smartcoursestudent.zhihuishu.com';
    const PPTX_EXTENSION = '.pptx';
    const MAX_OBSERVER_CALLS = 20;
    const DELAY_INTERVALS = [0, 1000, 2000, 3000];

    // 安全工具函数
    const utils = {
        tap: (obj, callback) => {
            if (typeof callback === 'function') {
                callback(obj);
            }
            return obj;
        }
    };

    // 跨域处理增强
    function handleCrossOrigin() {
        if (unsafeWindow.top === unsafeWindow) return;

        const nativeOpen = unsafeWindow.XMLHttpRequest.prototype.open;
        unsafeWindow.XMLHttpRequest.prototype.open = function(method, url) {
            if (url.includes('download link keyword')) {
                this.addEventListener('load', handleXhrResponse);
            }
            return nativeOpen.apply(this, arguments);
        };
    }

    // 安全处理XHR响应
    function handleXhrResponse() {
        try {
            if (this.responseType === '' || this.responseType === 'text') {
                const responseText = this.responseText;
                if (typeof responseText === 'string' && responseText.includes("download link keyword")) {
                    const { objectid, download } = JSON.parse(responseText);
                    if (unsafeWindow.top.decdata) {
                        unsafeWindow.top.decdata[objectid] = download;
                    }
                }
            }
        } catch (error) {
            console.error('XHR处理错误:', error);
        }
    }

    // DOM处理器
    const domHandler = {
        createElement: (tag, attributes) => {
            const element = document.createElement(tag);
            Object.entries(attributes).forEach(([key, value]) => {
                element.setAttribute(key, value);
            });
            return element;
        },

        removeExistingElements: () => {
            document.querySelectorAll('[id^="pptx-"]').forEach(element => {
                element.parentNode?.removeChild(element);
            });
        },

        createDownloadButton: (src) => {
            return utils.tap(domHandler.createElement('div', {
                id: 'pptx-download-link',
                class: 'ct11_dl',
                style: 'cursor:pointer; display: inline-block; border: 2px solid blue; padding: 5px; background-color: yellow;'
            }), el => {
                el.textContent = '下载PPTX';
                el.onclick = () => window.location.assign(src);
            });
        },

        createNotFoundTag: () => {
            return utils.tap(domHandler.createElement('div', {
                id: 'pptx-not-found',
                style: 'display: inline-block; border: 2px solid gray; padding: 5px; color: gray;'
            }), el => {
                el.textContent = '未找到';
            });
        }
    };

    // 主检查逻辑
    function checkAndAddLinks() {
        domHandler.removeExistingElements();

        document.querySelectorAll('div.tab').forEach(div => {
            if (/AI研习室/.test(div.textContent)) {
                const pptxImg = Array.from(document.images)
                    .find(img => img.src.endsWith(PPTX_EXTENSION));

                const targetElement = pptxImg
                    ? domHandler.createDownloadButton(pptxImg.src)
                    : domHandler.createNotFoundTag();

                div.insertAdjacentElement('afterend', targetElement);
            }
        });
    }

    // 优化的MutationObserver
    function setupMutationObserver() {
        let observerCount = 0;
        const observer = new MutationObserver(() => {
            if (observerCount++ > MAX_OBSERVER_CALLS) {
                return observer.disconnect();
            }
            checkAndAddLinks();
        });

        if (document.body) {
            observer.observe(document.body, {
                childList: true,
                subtree: true,
                attributes: false,
                characterData: false
            });
        }
    }

    // 安全事件监听
    function setupEventListeners() {
        const handler = () => checkAndAddLinks();

        document.addEventListener('click', event => {
            if (event.target.closest('.img-bg')) {
                DELAY_INTERVALS.forEach(interval => {
                    setTimeout(handler, interval);
                });
            }
        });

        document.addEventListener('DOMContentLoaded', () => {
            setupMutationObserver();
            checkAndAddLinks();
        });
    }

    // 主入口
    if (location.host === TARGET_DOMAIN) {
        try {
            if (unsafeWindow.top === unsafeWindow) {
                unsafeWindow.decdata = {};
            }
            handleCrossOrigin();
            setupEventListeners();
        } catch (error) {
            location.reload();
        }
    }
})();