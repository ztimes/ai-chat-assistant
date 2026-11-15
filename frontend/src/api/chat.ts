import type { Message, Session } from "../types";

async function request<T>(url: string, init?: RequestInit): Promise<T> {
  const resp = await fetch(url, init);
  if (!resp.ok) {
    throw new Error(`请求失败：${resp.status}`);
  }
  return resp.json() as Promise<T>;
}

export function getSessions(): Promise<Session[]> {
  return request<Session[]>("/api/sessions");
}

export function createSession(): Promise<Session> {
  return request<Session>("/api/sessions", { method: "POST" });
}

export function getMessages(sessionId: string): Promise<Message[]> {
  return request<Message[]>(`/api/sessions/${sessionId}/messages`);
}

/**
 * 流式对话。不使用 EventSource（它只支持 GET 且无法带自定义 header），
 * 改用 fetch + ReadableStream 手写 SSE 解析。
 *
 * 两个必须处理的坑：
 * 1. 一个网络 chunk 可能包含多个 SSE 事件（按 \n\n 分隔）；
 * 2. 一个事件也可能被切断在 chunk 边界上 —— 所以必须维护 buffer，
 *    只有凑齐完整事件（找到 \n\n）才消费。
 */
export async function streamChat(
  sessionId: string,
  content: string,
  onDelta: (delta: string) => void,
  signal?: AbortSignal,
): Promise<void> {
  const resp = await fetch("/api/chat/stream", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ session_id: sessionId, content }),
    signal,
  });
  if (!resp.ok || !resp.body) {
    throw new Error(`请求失败：${resp.status}`);
  }

  const reader = resp.body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";

  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });

    // 消费 buffer 里所有完整事件
    let sep: number;
    while ((sep = buffer.indexOf("\n\n")) !== -1) {
      const event = buffer.slice(0, sep);
      buffer = buffer.slice(sep + 2);
      for (const line of event.split("\n")) {
        if (!line.startsWith("data:")) continue;
        const data = line.slice(5).trim();
        if (data === "[DONE]") return;
        try {
          const parsed = JSON.parse(data);
          if (typeof parsed.delta === "string") {
            onDelta(parsed.delta);
          }
        } catch {
          // 忽略无法解析的行，保持流不中断
        }
      }
    }
  }
}
