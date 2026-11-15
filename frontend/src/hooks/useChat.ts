import { useCallback, useEffect, useRef, useState } from "react";
import { createSession, getMessages, getSessions, streamChat } from "../api/chat";
import type { Message, Session } from "../types";

function localMessage(role: "user" | "assistant", content: string): Message {
  return {
    id: crypto.randomUUID(),
    role,
    content,
    createdAt: new Date().toISOString(),
  };
}

export function useChat() {
  const [sessions, setSessions] = useState<Session[]>([]);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [streaming, setStreaming] = useState(false);
  const [streamText, setStreamText] = useState("");
  const [error, setError] = useState<string | null>(null);
  const abortRef = useRef<AbortController | null>(null);

  const refreshSessions = useCallback(async () => {
    try {
      setSessions(await getSessions());
    } catch (e) {
      setError((e as Error).message);
    }
  }, []);

  const openSession = useCallback(async (id: string) => {
    setActiveId(id);
    setError(null);
    try {
      setMessages(await getMessages(id));
    } catch (e) {
      setMessages([]);
      setError((e as Error).message);
    }
  }, []);

  const newSession = useCallback(async () => {
    const session = await createSession();
    await refreshSessions();
    setActiveId(session.id);
    setMessages([]);
    return session;
  }, [refreshSessions]);

  /**
   * 发送消息：
   * - 用户消息本地乐观插入（不等后端返回，交互无延迟感）；
   * - 模型增量累积在单独的 streamText state，流结束后一次性转成正式消息，
   *   避免每个 delta 触发整个消息列表的重渲染。
   */
  const send = useCallback(
    async (content: string) => {
      if (!activeId || streaming || !content.trim()) return;
      setError(null);
      setMessages((prev) => [...prev, localMessage("user", content)]);
      setStreaming(true);
      setStreamText("");

      const controller = new AbortController();
      abortRef.current = controller;
      let acc = "";

      try {
        await streamChat(
          activeId,
          content,
          (delta) => {
            acc += delta;
            setStreamText(acc);
          },
          controller.signal,
        );
        setMessages((prev) => [...prev, localMessage("assistant", acc)]);
      } catch (e) {
        const err = e as Error;
        if (err.name === "AbortError") {
          // 用户主动停止：保留已生成的部分
          if (acc) {
            setMessages((prev) => [...prev, localMessage("assistant", acc)]);
          }
        } else {
          setError(err.message || "请求出错，请重试");
        }
      } finally {
        setStreaming(false);
        setStreamText("");
        abortRef.current = null;
        void refreshSessions();
      }
    },
    [activeId, streaming, refreshSessions],
  );

  const stop = useCallback(() => {
    abortRef.current?.abort();
  }, []);

  // 初始化：加载会话列表并打开最近一个（没有则新建）
  useEffect(() => {
    (async () => {
      const list = await getSessions().catch(() => [] as Session[]);
      setSessions(list);
      if (list.length > 0) {
        await openSession(list[0].id);
      } else {
        await newSession().catch(() => setError("后端未启动？请先运行 server"));
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return {
    sessions,
    activeId,
    messages,
    streaming,
    streamText,
    error,
    send,
    stop,
    openSession,
    newSession,
  };
}
