import json
import os

import httpx

# 兼容 OpenAI 接口规范的模型服务；中转地址同样适用
API_KEY = os.getenv("OPENAI_API_KEY", "")
BASE_URL = os.getenv("OPENAI_BASE_URL", "https://api.openai.com/v1")
MODEL = os.getenv("MODEL_NAME", "gpt-4o-mini")


async def stream_chat(messages: list[dict]):
    """流式调用大模型，逐块 yield 文本增量。

    未配置 API Key 时自动回落到 mock 流式输出，
    保证整个链路（前端 SSE 解析 -> 后端转发）无需 Key 即可调试。
    """
    if not API_KEY:
        from mock_llm import mock_stream

        async for chunk in mock_stream(messages):
            yield chunk
        return

    payload = {
        "model": MODEL,
        "messages": messages,
        "stream": True,
    }
    headers = {
        "Authorization": f"Bearer {API_KEY}",
        "Content-Type": "application/json",
    }

    async with httpx.AsyncClient(timeout=httpx.Timeout(60.0, connect=10.0)) as client:
        async with client.stream(
            "POST",
            f"{BASE_URL}/chat/completions",
            json=payload,
            headers=headers,
        ) as resp:
            resp.raise_for_status()
            async for line in resp.aiter_lines():
                if not line.startswith("data:"):
                    continue
                data = line[5:].strip()
                if data == "[DONE]":
                    break
                try:
                    parsed = json.loads(data)
                    delta = parsed["choices"][0]["delta"].get("content")
                except (json.JSONDecodeError, KeyError, IndexError):
                    continue
                if delta:
                    yield delta
