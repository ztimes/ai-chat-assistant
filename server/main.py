import json

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import StreamingResponse
from pydantic import BaseModel

import llm
from sessions import store

app = FastAPI(title="AI Chat Assistant Server")

# 开发环境直连；生产建议同域部署后收紧
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173"],
    allow_methods=["*"],
    allow_headers=["*"],
)


class ChatRequest(BaseModel):
    session_id: str
    content: str


class SessionCreateResponse(BaseModel):
    id: str
    title: str
    createdAt: str
    updatedAt: str
    messageCount: int


@app.get("/api/sessions")
def list_sessions():
    return store.list_sessions()


@app.post("/api/sessions", response_model=SessionCreateResponse)
def create_session():
    return store.create().to_summary()


@app.get("/api/sessions/{session_id}/messages")
def get_messages(session_id: str):
    try:
        return store.get_messages(session_id)
    except KeyError:
        raise HTTPException(status_code=404, detail="session not found")

@app.delete("/api/sessions/{session_id}")
def delete_session(session_id: str):
    if not store.delete(session_id):
        raise HTTPException(status_code=404, detail="session not found")
    return {"ok": True}


@app.post("/api/chat/stream")
async def chat_stream(req: ChatRequest):
    """流式对话接口（SSE）。

    设计要点：
    - 用户消息先落会话，模型增量实时推送，完整回复在流结束后一次性入库，
      避免半截消息入库；
    - 客户端中断（断开连接）时 async generator 会被终止，
      已生成的部分内容仍会通过 finally 逻辑补齐入库。
    """
    session = store.get(req.session_id)
    if session is None:
        raise HTTPException(status_code=404, detail="session not found")

    store.add_message(req.session_id, "user", req.content)
    messages = [{"role": m.role, "content": m.content} for m in session.messages]

    async def event_generator():
        collected: list[str] = []
        try:
            async for delta in llm.stream_chat(messages):
                collected.append(delta)
                # SSE 事件格式：data: <json>\n\n
                yield f"data: {json.dumps({'delta': delta}, ensure_ascii=False)}\n\n"
        finally:
            if collected:
                try:
                    store.add_message(req.session_id, "assistant", "".join(collected))
                except KeyError:
                    pass  #会话在生成过程中被删除，无处落库
        yield "data: [DONE]\n\n"

    return StreamingResponse(
        event_generator(),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "X-Accel-Buffering": "no",  # 关闭 Nginx 代理缓冲，保证逐块到达
        },
    )


if __name__ == "__main__":
    import uvicorn

    uvicorn.run(app, host="127.0.0.1", port=8000)
