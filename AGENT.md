# AI Agent 开发指令集 (TemperMonkey-Scripts)

## 1. 核心运行原则 (Core Principles)
- **零构建 (Zero-Build)**: 严禁引入 Webpack, Vite, TypeScript 等编译流程。所有脚本必须为纯 JavaScript，确保“即写即用”。
- **单文件/扁平化 (Flat Structure)**: 严禁创建深层目录结构。所有 `.user.js` 脚本必须存放于根目录下的 `scripts/` 目录。
- **自动更新 (Auto-Update)**: 脚本必须包含完整的 GitHub Raw 引用 URL，以支持 Tampermonkey 的自动更新机制。

## 2. 目录结构约束 (Directory Constraints)
AI 在执行文件操作前必须确认并维护以下结构：
```
/
├── scripts/                    # 仅存放 .user.js 脚本文件
├── README.md                   # 脚本索引与安装说明（AI 自动维护）
└── AGENT.md                    # 本指令集
```
**禁止行为**:
- 禁止生成 `package.json`, `node_modules`, `webpack.config.js` 等任何构建或依赖管理文件。
- 禁止在 `scripts/` 目录之外创建业务相关的脚本文件。

## 3. 脚本元数据 (Metadata Block) 强制规范
所有新生成或修改的脚本必须包含符合 Tampermonkey 标准的元数据块：
```javascript
// ==UserScript==
// @name         [脚本名称]
// @namespace    https://github.com/Triclouds/TemperMonkey-Scripts
// @version      1.0.0
// @description  [功能简述]
// @author       [作者]
// @match        [精确匹配的 URL]
// @grant        none
// @downloadURL  https://raw.githubusercontent.com/Triclouds/TemperMonkey-Scripts/master/scripts/[文件名].user.js
// @updateURL    https://raw.githubusercontent.com/Triclouds/TemperMonkey-Scripts/master/scripts/[文件名].user.js
// ==/UserScript==
```
**自动处理逻辑**:
- **URL 拼接**: AI 必须根据当前文件名自动生成正确的 `@downloadURL` 和 `@updateURL`。
- **版本控制**: 逻辑变更后，AI 必须自动递增修订号（例如 1.0.0 -> 1.0.1），除非用户明确要求指定版本。
- **Match 精度**: 严禁默认使用 `*://*/*`。AI 必须推断或询问用户以获取精确的匹配范围。

## 4. 代码实现规范 (Coding Standards)
### 4.1 强制注释要求 (Documentation)
AI 生成的代码必须包含以下中文注释结构：
- **文件头注释**:
  ```javascript
  /**
   * 模块名称：[名称]
   * 模块描述：[1-2句话概述功能]
   * 模块职责：[核心职责与功能边界]
   */
  ```
- **函数/方法注释**:
  ```javascript
  /**
   * 函数名称：[动词短语描述功能]
   * 概述: [一句话核心功能]
   * 详细描述: [关键逻辑与步骤说明]
   * 调用的函数: [文件目录] 的 [函数名]
   * @param {类型} 名称 - 描述
   * @returns {类型} 描述
   * 修改时间: YYYY-MM-DD HH:MM
   */
  ```

### 4.2 实现技术细节
- **运行时日志**: 所有 `console.log`、`alert` 或 UI 提示文本必须使用 **中文**。
- **代码结构**: 默认使用 IIFE (立即调用函数表达式) 以避免全局变量污染。
- **防御性编程**: 在操作 DOM 元素前，必须进行 `null` 或 `undefined` 检查。
- **加载策略**: 必须包含对 `document.readyState` 的判断，确保在正确的时机执行 `main` 函数。

## 5. 任务处理逻辑 (Instruction Processing Logic)
### 5.1 新建脚本 (Create)
1. 识别需求中的目标网站 URL 和核心功能。
2. 若关键信息（如 DOM 选择器）缺失，应主动要求用户提供页面片段或 URL。
3. 按照标准模板生成带完整元数据和注释的代码。

### 5.2 修改脚本 (Modify)
1. 必须执行 `Read` 操作完整读取既有代码。
2. 仅针对需求部分进行精确修改。
3. **禁止删除**既有的被注释掉的代码行，以保留修改历史。
4. 自动同步更新版本号和修改时间。

### 5.3 调试辅助 (Debug)
1. 优先提供可在浏览器 Console 中直接运行的验证代码片段。
2. 引导用户提供具体的控制台报错信息。

## 6. 环境与工具约束 (Environment & Tools)
- **终端 (Terminal)**: 仅限 Windows PowerShell。禁止使用 `&&` 命令连接符，必须使用 `;` 或换行。
- **Python 依赖**: 涉及 Python 脚本时，安装指令必须包含阿里云镜像：`-i https://mirrors.aliyun.com/pypi/simple/`。
- **Git 提交**: 自动生成 Conventional Commits 格式的提交说明（如 `feat: 新增某功能`）。

## 7. AI 行为黑名单 (The "10-No" Rules)
1. **不**写缺失元数据的脚本。
2. **不**使用全局匹配规则 `*://*/*`。
3. **不**在无 DOM 检查的情况下直接操作页面元素。
4. **不**在无错误处理（try-catch）的情况下执行异步网络请求。
5. **不**删除已存在的注释代码行。
6. **不**输出非中文的运行时日志或提示信息。
7. **不**在未读取原始文件内容的情况下执行重写或大规模修改。
8. **不**生成与业务无关的冗余配置文件（如 package.json 等）。
9. **不**硬编码账号密码、API Key 等敏感信息。
10. **不**违反定义的注释格式与当前时间获取规范。
