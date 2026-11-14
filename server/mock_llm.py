import asyncio
import random

# Mock 模式下的示例回复：覆盖一些 Markdown 元素，方便前端渲染调试
_REPLIES = [
    "这是一条**模拟的流式回复**。当前未配置 `OPENAI_API_KEY`，服务端走的是 mock 分支。\n\n回复内容会像真实模型一样逐字推送，用来验证前端的流式渲染链路是否顺畅。",
    "你说的我收到了（mock 模式下我不会真的理解它）。\n\n配置 `.env` 中的 API Key 后，这里会变成真实模型的回答。流式传输链路是完全一致的。",
]

# 把文本切成小片段，模拟模型的 token 粒度
def _split_pieces(text: str) -> list[str]:
    pieces = []
    for line in text.split("\n"):
        if not line:
            pieces.append("\n")
            continue
        # 按标点切句，再切小块
        buf = ""
        for ch in line:
            buf += ch
            if ch in "，。；：、！？" or len(buf) >= 4:
                pieces.append(buf)
                buf = ""
        if buf:
            pieces.append(buf)
    return pieces


async def mock_stream(messages: list[dict]):
    """模拟大模型的流式输出：逐片段 yield，带随机延迟。"""
    last_user = next(
        (m["content"] for m in reversed(messages) if m["role"] == "user"),
        "",
    )
    text = _REPLIES[len(messages) % len(_REPLIES)]
    if "mock" in last_user.lower() or len(last_user) > 30:
        text = f"（mock 模式）收到你的消息：{last_user}\n\n" + text

    for piece in _split_pieces(text):
        await asyncio.sleep(random.uniform(0.02, 0.06))
        yield piece
