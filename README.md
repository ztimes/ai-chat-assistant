# AI Chat Assistant

基于 **React 18 + TypeScript + FastAPI** 的流式 AI 对话助手。前端手写 SSE 流式解析，后端以 `async generator` 逐块转发模型响应并管理多轮会话，打通「前端 → 接口 → 模型」完整链路。

> 未配置 API Key 时自动进入 **Mock 模式**，克隆下来就能体验完整的流式对话交互。

## 功能

| 功能 | 说明 |
|---|---|
| 流式对话 | 逐字渲染 + 打字光标；`AbortController` 支持中途停止，已生成内容保留 |
| 多会话管理 | 创建 / 切换 / 删除，历史消息回载，标题取首条用户消息自动生成 |
| 深色模式 | CSS 变量重定向 + `localStorage` 持久化 + `prefers-color-scheme` 跟随系统，首屏无闪白 |
| 会话导出 | 导出为 Markdown（Blob 下载，文件名清洗 Windows 非法字符，UTF-8 BOM 防乱码） |
| 轻量 Markdown 渲染 | 行内代码、加粗、代码块，自实现解析器，不引入第三方库 |
| Mock 模式 | 无需 API Key，本地模拟逐字流式输出，方便演示与调试 |

## 技术栈

| 层 | 选型 |
|---|---|
| 前端 | React 18 · TypeScript · Vite |
| 后端 | Python 3.10+ · FastAPI · Uvicorn · httpx |
| 通信 | SSE（`fetch` + `ReadableStream` 手写解析，非 EventSource） |

## 请求链路

```
浏览器                           FastAPI                       大模型
  │                                │                             │
  ├─ POST /api/chat/stream ───────▶│                             │
  │   {session_id, content}        ├─ 用户消息落库                │
  │                                ├─ httpx 流式请求 ───────────▶│
  │                                │                             │
  │◀─ data: {"delta":"你"}\n\n ────┤◀─ 增量 chunk ───────────────┤
  │◀─ data: {"delta":"好"}\n\n ────┤                             │
  │   ...（逐块到达，前端 buffer 拼接解析）                       │
  │◀─ data: [DONE]\n\n ────────────┤                             │
  │                                ├─ finally: 完整回复一次性入库  │
```

## 快速开始

**前置要求**：Node.js 18+、Python 3.10+

```bash
# 1. 后端（默认 8000 端口）
cd server
python -m venv .venv
# Windows: .venv\Scripts\activate    macOS/Linux: source .venv/bin/activate
pip install -r requirements.txt
python main.py

# 2. 前端（默认 5173 端口，已配置 /api -> localhost:8000 代理）
cd frontend
npm install
npm run dev
```

浏览器打开 http://localhost:5173 即可使用，Mock 模式下无需任何 Key。

### 接入真实大模型

```bash
cp server/.env.example server/.env
# 填入 API Key 与 base_url（兼容 OpenAI 接口规范的中转地址同样可用）
```

未配置或配置为空时，`llm.py` 自动回落到 `mock_llm.py` 的模拟流，接口行为完全一致。

## 核心实现要点

1. **手写 SSE 解析**（`frontend/src/api/chat.ts`）
   不用 `EventSource`（只支持 GET、无法带自定义 header、无法携带请求体），改用 `fetch` + `ReadableStream`。必须处理两个经典坑：一个 chunk 可能包含多个事件（按 `\n\n` 切分）；一个事件也可能被切断在 chunk 边界（维护 `buffer`，凑齐完整事件才消费）。`TextDecoder.decode(value, { stream: true })` 用于处理中文被切在字节边界上导致的乱码。

2. **流式渲染性能**（`frontend/src/hooks/useChat.ts`）
   增量文本累积在独立的 `streamText` state，不逐个 push 进 `messages`。否则一秒钟几十个 token 会触发整棵消息列表重渲染，长会话下明显掉帧。

3. **可中止请求**
   `AbortController` 贯穿 fetch 与 UI 停止按钮。中止后前端保留已生成内容；后端 generator 被关闭时在 `finally` 中把**已生成部分**入库——正常结束写完整内容，中途断开写已生成部分，两条路径都不会出现"半截消息丢失"。

4. **FastAPI 流式转发**（`server/main.py`）
   `StreamingResponse` + `async generator` 逐块转发；关闭 Nginx 缓冲（`X-Accel-Buffering: no`）保证逐块到达而不是攒完一次性吐出。

5. **主题切换用变量重定向**（`frontend/src/styles.css`）
   所有颜色走 CSS 变量，深色模式只是在 `[data-theme="dark"]` 下重新赋值同名变量，组件代码零改动。`index.html` 里同步内联脚本在 React 挂载前设置 `data-theme`，避免首屏闪白。

6. **纯函数化的导出逻辑**（`frontend/src/utils/exportMarkdown.ts`）
   数组转 Markdown 抽成无副作用纯函数，便于单测；下载侧处理 Windows 非法文件名字符、UTF-8 BOM（否则记事本打开中文乱码）、`URL.revokeObjectURL` 的延后释放（立即释放会让部分浏览器拿不到数据）。

## 目录结构

```
ai-chat-assistant/
├── frontend/src
│   ├── api/chat.ts            # SSE 流式解析器（fetch + ReadableStream）
│   ├── hooks/useChat.ts       # 会话列表、消息、流式状态管理
│   ├── hooks/useTheme.ts      # 主题切换与持久化
│   ├── utils/exportMarkdown.ts# 会话导出（纯函数 + Blob 下载）
│   ├── components/
│   │   ├── Sidebar.tsx        # 会话列表 / 新建 / 删除 / 主题开关
│   │   ├── ChatWindow.tsx     # 消息流 + 导出按钮 + 自动滚动
│   │   ├── MessageBubble.tsx  # 气泡与轻量 Markdown 渲染
│   │   └── ChatInput.tsx      # 输入框（Enter 发送 / Shift+Enter 换行）
│   ├── styles.css             # CSS 变量与深浅色主题
│   └── types.ts
└── server
    ├── main.py                # FastAPI 路由与 SSE 响应
    ├── llm.py                 # 大模型流式调用（无 Key 自动回落 Mock）
    ├── mock_llm.py            # 模拟逐字输出
    └── sessions.py            # 内存会话存储（含换 SQLite / Redis 的取舍说明）
```

## 已知取舍

- **会话存内存**：单进程、重启即清空，适合演示。换 SQLite 要考虑流结束后统一写入的时机与并发写锁；换 Redis 要考虑 TTL 与容量上限。相关讨论写在 `sessions.py` 的注释里。
- **无鉴权**：仅本机使用，生产部署需要补用户体系与 CORS 收紧。
- **Markdown 渲染是自实现的极简版**：只覆盖行内代码、加粗、代码块，不支持表格 / 嵌套列表。用 `react-markdown` 能一步解决，但手写的目的是不引入依赖并可控。

## Roadmap

- [x] 流式对话（SSE 手写解析 + 中止）
- [x] 多会话管理（创建 / 切换 / 删除）
- [x] 深色模式
- [x] 会话导出 Markdown
- [ ] 会话持久化（SQLite）
- [ ] 多模型切换
- [ ] 用户鉴权与配额

## License

MIT
