// ==UserScript==
// @name         淘宝/天猫商品详情数据抓取工具
// @namespace    https://github.com/Triclouds/TemperMonkey-Scripts
// @version      1.3.1
// @description  一键获取商品数据并发送至指定的 Webhook 地址，支持按钮自由拖拽位置
// @author       Assistant
// @match        *://detail.tmall.com/item.htm*
// @match        *://item.taobao.com/item.htm*
// @grant        GM_setClipboard
// @grant        GM_addStyle
// @grant        unsafeWindow
// @grant        GM_xmlhttpRequest
// @grant        GM_getValue
// @grant        GM_setValue
// @grant        GM_registerMenuCommand
// @connect      *
// @downloadURL  https://raw.githubusercontent.com/Triclouds/TemperMonkey-Scripts/master/scripts/tm_grabber.user.js
// @updateURL    https://raw.githubusercontent.com/Triclouds/TemperMonkey-Scripts/master/scripts/tm_grabber.user.js
// ==/UserScript==

(function() {
    'use strict';

    /**
     * 模块名称：淘宝/天猫商品抓取模块
     * 模块描述：淘宝与天猫详情页面的商品信息自动化抓取与上传。
     * 模块职责：通过解析页面 ICE 上下文获取商品元数据，并通过 UI 拖拽按钮实现用户交互及 Webhook 发送。
     */

    //------------------
    // 状态管理变量
    //------------------
    let isDragging = false; // 是否正在拖拽中
    let startX, startY, startRight, startTop; // 拖拽初始坐标记录

    //------------------
    // 配置逻辑
    //------------------

    // 配置项定义，便于后续扩展
    const SETTINGS_CONFIG = [
        { id: 'tm_username', label: '用户名', type: 'text', placeholder: '请输入您的用户名' },
        { id: 'tm_webhook', label: 'Webhook 地址', type: 'url', placeholder: '请输入 Webhook 存储地址' }
    ];

    /**
     * 函数名称：显示设置界面
     * 
     * 概述: 创建并显示一个现代化的配置弹窗
     * 详细描述: 
     * 1. 生成半透明遮罩层和居中的配置容器；
     * 2. 根据 SETTINGS_CONFIG 动态生成输入表单；
     * 3. 实现保存逻辑，将数据持久化至 GM 存储并刷新页面；
     * 4. 实现取消逻辑，销毁 DOM 元素。
     * 调用的函数: 无
     * 参数: 无
     * 修改时间: 2026-03-06 13:57
     */
    function showSettingsModal() {
        // 移除已存在的弹窗
        const existing = document.getElementById('tm-settings-overlay');
        if (existing) existing.remove();

        // 创建遮罩层
        const overlay = document.createElement('div');
        overlay.id = 'tm-settings-overlay';
        
        // 创建内容容器
        const container = document.createElement('div');
        container.id = 'tm-settings-container';
        
        let html = `
            <div class="tm-settings-header">⚙️ 提取参数设置</div>
            <div class="tm-settings-body">
        `;

        SETTINGS_CONFIG.forEach(item => {
            const val = GM_getValue(item.id, "");
            html += `
                <div class="tm-settings-item">
                    <label>${item.label}</label>
                    <input type="${item.type}" id="input-${item.id}" value="${val}" placeholder="${item.placeholder}">
                </div>
            `;
        });

        html += `
            </div>
            <div class="tm-settings-footer">
                <button id="tm-settings-save" class="tm-btn-primary">保存配置</button>
                <button id="tm-settings-cancel" class="tm-btn-secondary">取消</button>
            </div>
        `;

        container.innerHTML = html;
        overlay.appendChild(container);
        document.body.appendChild(overlay);

        // 绑定事件
        document.getElementById('tm-settings-save').onclick = () => {
            SETTINGS_CONFIG.forEach(item => {
                const input = document.getElementById(`input-${item.id}`);
                GM_setValue(item.id, input.value.trim());
            });
            alert("✅ 配置已更新！");
            location.reload();
        };

        document.getElementById('tm-settings-cancel').onclick = () => {
            overlay.remove();
        };

        // 点击遮罩关闭
        overlay.onclick = (e) => {
            if (e.target === overlay) overlay.remove();
        };
    }

    // 注册油猴菜单配置项
    GM_registerMenuCommand("⚙️ 设置提取参数", showSettingsModal);

    //------------------
    // UI 样式分区
    //------------------
    GM_addStyle(`
        #tm-data-grabber {
            position: fixed;
            z-index: 999999;
            background: #ff5000;
            color: white;
            padding: 10px 15px;
            border-radius: 25px;
            cursor: move; /* 移动指针样式 */
            box-shadow: 0 4px 12px rgba(0,0,0,0.3);
            font-weight: bold;
            transition: transform 0.2s, background 0.2s;
            font-family: "Microsoft YaHei", sans-serif;
            font-size: 14px;
            user-select: none; /* 防止拖拽时选中文字 */
        }
        #tm-data-grabber:hover {
            transform: scale(1.05);
            background: #e64500;
        }
        #tm-data-grabber.loading {
            background: #999;
            cursor: not-allowed;
        }

        /* 设置弹窗样式 */
        #tm-settings-overlay {
            position: fixed;
            top: 0; left: 0; width: 100%; height: 100%;
            background: rgba(0,0,0,0.5);
            z-index: 1000000;
            display: flex;
            align-items: center;
            justify-content: center;
            font-family: "Microsoft YaHei", sans-serif;
        }
        #tm-settings-container {
            background: white;
            width: 400px;
            border-radius: 12px;
            box-shadow: 0 10px 30px rgba(0,0,0,0.2);
            overflow: hidden;
            animation: tmFadeIn 0.3s ease;
        }
        @keyframes tmFadeIn {
            from { opacity: 0; transform: translateY(-20px); }
            to { opacity: 1; transform: translateY(0); }
        }
        .tm-settings-header {
            background: #f8f8f8;
            padding: 15px 20px;
            font-size: 18px;
            font-weight: bold;
            border-bottom: 1px solid #eee;
            color: #333;
        }
        .tm-settings-body {
            padding: 20px;
        }
        .tm-settings-item {
            margin-bottom: 15px;
        }
        .tm-settings-item label {
            display: block;
            margin-bottom: 8px;
            font-weight: bold;
            color: #666;
        }
        .tm-settings-item input {
            width: 100%;
            padding: 10px;
            border: 1px solid #ddd;
            border-radius: 6px;
            box-sizing: border-box;
            outline: none;
            transition: border-color 0.2s;
        }
        .tm-settings-item input:focus {
            border-color: #ff5000;
        }
        .tm-settings-footer {
            padding: 15px 20px;
            border-top: 1px solid #eee;
            text-align: right;
            background: #f8f8f8;
        }
        .tm-btn-primary {
            background: #ff5000;
            color: white;
            border: none;
            padding: 8px 20px;
            border-radius: 6px;
            cursor: pointer;
            font-weight: bold;
            margin-left: 10px;
        }
        .tm-btn-secondary {
            background: #eee;
            color: #666;
            border: none;
            padding: 8px 20px;
            border-radius: 6px;
            cursor: pointer;
        }
        .tm-btn-primary:hover { background: #e64500; }
        .tm-btn-secondary:hover { background: #ddd; }
    `);

    //------------------
    // 辅助工具方法
    //------------------

    /**
     * 函数名称：使元素可拖拽
     * 
     * 概述: 为指定元素添加鼠标事件监听，实现自由移动并持久化坐标
     * 详细描述: 
     * 1. 从 GM 存储中恢复上次按钮位置；
     * 2. 监听 mousedown 初始化拖拽状态；
     * 3. mousemove 阶段计算鼠标偏移量并实时更新元素位置；
     * 4. mouseup 阶段移除监听并保存最新位置到 GM 存储。
     * 调用的函数: 无
     * 参数: @param {HTMLElement} el - 需要实现拖拽的 DOM 元素
     * 修改时间: 2026-03-06 13:57
     */
    function makeDraggable(el) {
        // 读取存储的位置信息，默认 右 20px, 上 150px
        const savedPos = GM_getValue("tm_btn_pos", { top: 150, right: 20 });
        el.style.top = savedPos.top + 'px';
        el.style.right = savedPos.right + 'px';

        el.addEventListener('mousedown', (e) => {
            isDragging = false; // 重置拖动状态
            startX = e.clientX;
            startY = e.clientY;
            startRight = parseInt(el.style.right || 20);
            startTop = parseInt(el.style.top || 150);
            
            const onMouseMove = (ev) => {
                const deltaX = startX - ev.clientX;
                const deltaY = ev.clientY - startY;
                
                // 如果位移超过 5px，则判断为正在拖动
                if (Math.abs(deltaX) > 5 || Math.abs(deltaY) > 5) {
                    isDragging = true;
                    el.style.right = (startRight + deltaX) + 'px';
                    el.style.top = (startTop + deltaY) + 'px';
                }
            };

            const onMouseUp = () => {
                window.removeEventListener('mousemove', onMouseMove);
                window.removeEventListener('mouseup', onMouseUp);
                
                // 如果发生了拖动，保存当前位置
                if (isDragging) {
                    GM_setValue("tm_btn_pos", {
                        top: parseInt(el.style.top),
                        right: parseInt(el.style.right)
                    });
                }
            };

            window.addEventListener('mousemove', onMouseMove);
            window.addEventListener('mouseup', onMouseUp);
        });
    }

    /**
     * 函数名称：发送数据至 Webhook
     * 
     * 概述: 将提取出的 JSON 数据通过 POST 方式发送到 Webhook 地址
     * 详细描述: 
     * 1. 构造 GM_xmlhttpRequest 请求；
     * 2. 设置 JSON 请求头；
     * 3. 处理请求成功与失败的回调并封装为 Promise。
     * 调用的函数: 无
     * 参数: 
     *   @param {string} url - 目标 Webhook URL
     *   @param {object} data - 提取出的商品信息对象
     * 返回值: @returns {Promise<string>} 服务器响应或错误信息
     * 修改时间: 2026-03-06 13:57
     */
    function sendToWebhook(url, data) {
        return new Promise((resolve, reject) => {
            GM_xmlhttpRequest({
                method: "POST",
                url: url,
                headers: { "Content-Type": "application/json" },
                data: JSON.stringify(data),
                onload: (res) => (res.status >= 200 && res.status < 300) ? resolve(res.responseText) : reject(`HTTP错误 ${res.status}`),
                onerror: () => reject("网络错误")
            });
        });
    }

    //------------------
    // 核心业务逻辑
    //------------------

    /**
     * 函数名称：解析商品详细数据
     * 
     * 概述: 从页面渲染上下文 `__ICE_APP_CONTEXT__` 中解析并组装商品数据
     * 详细描述: 
     * 1. 接入 unsafeWindow 获取页面私有变量；
     * 2. 提取店铺名称、商品图片、ID、链接、标题等基础信息；
     * 3. 遍历 skuBase 属性获取颜色分类；
     * 4. 结合行业参数（industryParamVO）与扩展信息（extensionInfoVO）解析动态参数列表。
     * 调用的函数: 无
     * 参数: @param {string} username - 当前执行抓取的用户标识
     * 返回值: @returns {object|null} 组装好的商品信息对象，上下文丢失时返回 null
     * 修改时间: 2026-03-06 13:57
     */
    function extractProductData(username) {
        // 通过 unsafeWindow 穿透油猴沙盒获取淘宝/天猫页面变量
        const ctx = unsafeWindow.__ICE_APP_CONTEXT__;
        if (!ctx) return null;

        const res = ctx.loaderData?.home?.data?.res || {};
        const data = {
            username: username,
            grabTime: new Date().toLocaleString(),
            shopName: res.seller?.shopName,
            images: res.item?.images || [],
            itemId: res.item?.itemId,
            itemLink: res.item?.qrCode || window.location.href,
            title: res.item?.title,
            salesCount: res.item?.vagueSellCount,
            colors: (res.skuBase?.props || []).find(p => p.name === "颜色分类")?.values.map(v => v.name) || [],
            parameters: []
        };

        //------------------
        // 参数多源提取
        //------------------
        let params = [];
        const industry = res.plusViewVO?.industryParamVO || {};
        const ext = res.extensionInfoVO || {};
        
        // 尝试从行业参数视图中提取
        if (industry.enhanceParamList) params = params.concat(industry.enhanceParamList.map(p => ({ label: p.propertyName, value: p.valueName })));
        if (industry.basicParamList) params = params.concat(industry.basicParamList.map(p => ({ label: p.propertyName, value: p.valueName })));
        
        // 备选方案：从扩展信息的基础属性中提取
        if (params.length === 0 && ext.infos) {
            const baseProps = ext.infos.find(i => i.type === "BASE_PROPS");
            if (baseProps?.items) params = baseProps.items.map(p => ({ label: p.title || p.name, value: p.text?.[0] || p.valueName || "" }));
        }
        data.parameters = params;
        return data;
    }

    /**
     * 函数名称：触发商品抓取流程
     * 
     * 概述: 点击按钮后的主控函数，执行验证、提取、复制、上传全流程
     * 详细描述: 
     * 1. 判断是否刚结束拖拽以防止误触；
     * 2. 校验用户名与 Webhook 配置是否存在；
     * 3. 调用 extractProductData 提取数据；
     * 4. 数据成功获取后调用 GM_setClipboard 写入剪贴板；
     * 5. 调用 sendToWebhook 异步上传数据并显示提示框。
     * 调用的函数: 
     * - scripts/tm_grabber.user.js 的 extractProductData (提取详情数据)
     * - scripts/tm_grabber.user.js 的 sendToWebhook (数据上传接口)
     * 修改时间: 2026-03-06 13:57
     */
    async function handleGrab() {
        if (isDragging) return; // 如果刚才是在拖动按钮，则不触发抓取

        // 获取配置信息
        const username = GM_getValue("tm_username", "");
        const webhook = GM_getValue("tm_webhook", "");
        
        if (!username || !webhook) {
            alert("⚠️ 请先在油猴菜单中设置用户名和 Webhook 地址！");
            return;
        }

        const btn = document.getElementById('tm-data-grabber');
        btn.classList.add('loading');
        btn.innerHTML = '⏳ 发送中...';

        try {
            const data = extractProductData(username);
            if (data) {
                // 成功提取数据
                GM_setClipboard(JSON.stringify(data, null, 4));
                await sendToWebhook(webhook, data);
                alert("✅ 成功！数据已发送并复制到剪贴板。");
            } else {
                alert("❌ 提取失败：未找到商品渲染上下文 (ICE_APP_CONTEXT)。");
            }
        } catch (e) {
            alert(`❌ 执行异常: ${e}`);
        } finally {
            // 恢复按钮状态
            btn.classList.remove('loading');
            btn.innerHTML = '🔍 提取商品JSON';
        }
    }

    /**
     * 函数名称：主启动入口
     * 
     * 概述: 脚本主执行入口，负责初始化 UI 和交互逻辑
     * 详细描述: 
     * 1. 创建悬浮按钮并设置初始文本；
     * 2. 挂载点击事件监听器；
     * 3. 将按钮注入页面 body；
     * 4. 初始化拖拽功能。
     * 调用的函数: 
     * - scripts/tm_grabber.user.js 的 handleGrab (抓取业务主控)
     * - scripts/tm_grabber.user.js 的 makeDraggable (拖拽功能初始化)
     * 修改时间: 2026-03-06 13:57
     */
    function main() {
        const btn = document.createElement('div');
        btn.id = 'tm-data-grabber';
        btn.innerHTML = '🔍 提取商品JSON';
        
        // 绑定点击事件，处理逻辑在 handleGrab 中
        btn.addEventListener('click', handleGrab);
        
        document.body.appendChild(btn);
        makeDraggable(btn); // [新增] 使按钮可拖拽并持久化位置
    }

    //------------------
    // 初始化入口
    //------------------
    // 遵循 AGENT.md 规范，包含对 document.readyState 的判断
    if (document.readyState === 'complete' || document.readyState === 'interactive') {
        main();
    } else {
        window.addEventListener('DOMContentLoaded', main);
    }

})();