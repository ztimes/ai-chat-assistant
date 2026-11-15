# AI Chat Assistant

基于 React 18 + TypeScript + FastAPI 的流式 AI 对话助手。前端手写 SSE 流式解析，后端 FastAPI 承接大模型流式响应并管理多轮会话，一个项目打通「前端 → 接口 → 模型」完整链路。

> 未配置 API Key 时自动进入 Mock 模式，开箱即可体验完整流式对话交互。

## 技术栈

| 层 | 选型 |
|---|---|
| 前端 | React 18 · TypeScript · Vite |
| 后端 | Python 3 · FastAPI · httpx |
| 通信 | SSE（fetch + ReadableStream 手写解析） |

## 快速开始

```bash
# 1. 启动后端（默认 8000 端口）
cd server
pip install -r requirements.txt
python main.py

# 2. 启动前端（默认 5173 端口，已代理 /api -> localhost:8000）
cd frontend
npm install
npm run dev
```

浏览器打开 http://localhost:5173 即可使用。Mock 模式下无需任何 Key。

接入真实大模型：复制 `server/.env.example` 为 `server/.env`，填入 API Key（兼容 OpenAI 接口规范的中转地址也可以）。

## 功能

- 流式输出：逐字渲染 + 打字光标，支持中途停止（AbortController）
- 多会话管理：创建 / 切换 / 历史消息回载
- 轻量 Markdown 渲染：行内代码、加粗、代码块
- 会话标题自动生成（取首条用户消息）

## 目录结构

```
ai-chat-assistant/
├── frontend/src
│   ├── api/chat.ts          # SSE 流式解析器（fetch + ReadableStream）
│   ├── hooks/useChat.ts     # 会话与流式状态管理
│   ├── components/          # Sidebar / ChatWindow / MessageBubble / ChatInput
│   └── types.ts
└── server/
    ├── main.py              # FastAPI 路由与 SSE 响应
    ├── llm.py               # 大模型流式调用（无 Key 时回落 Mock）
    ├── mock_llm.py          # Mock 流式回复
    └── sessions.py          # 内存会话存储
```

## 技术要点

1. **手写 SSE 解析**：不依赖 EventSource 库，POST + ReadableStream 逐块读取，处理了「一个 chunk 包含多个事件」「事件被切断在 chunk 边界」两个经典坑（`api/chat.ts` 的 buffer 拼接逻辑）。
2. **流式渲染性能**：增量文本累积到单一 state，避免每个 delta 触发整棵消息列表重渲染。
3. **可中止的请求**：AbortController 贯穿 fetch 与 UI 停止按钮，中止后保留已生成的部分内容。
4. **FastAPI 流式转发**：`StreamingResponse + async generator` 逐块转发模型响应；回复在 `finally` 中入库——正常结束时写入完整内容，客户端中途断开（generator 被关闭）时写入已生成的部分，两种路径都不会产生"半截消息丢失"。
5. **内存会话存储的取舍**：单进程内存方案，简单够用；换成 SQLite / Redis 时需要考虑的问题已在 `sessions.py` 注释里列出。

## Roadmap

- [ ] 会话持久化（SQLite）
- [ ] 简单鉴权
- [ ] 多模型切换
- [ ] 深色模式
