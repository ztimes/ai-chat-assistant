import { useEffect, useRef } from "react";
import type { Message } from "../types";
import { MarkdownLite } from "./MessageBubble";

interface Props {
  messages: Message[];
  streamText: string;
  streaming: boolean;
  error: string | null;
  title: string;
  onExport: () => void;
}

export function ChatWindow({
  messages,
  streamText,
  streaming,
  error,
  title,
  onExport,
}: Props) {
  const bottomRef = useRef<HTMLDivElement>(null);

  // 新内容时滚动到底部（流式期间也跟随）
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [messages, streamText]);

  return (
    <>
      <header className="chat-header">
        <span className="chat-title" title={title}>
          {title}
        </span>
        <button
          className="export-btn"
          onClick={onExport}
          disabled={streaming || messages.length === 0}
          title={
            streaming
              ? "生成中，结束后可导出"
              : messages.length === 0
                ? "当前会话没有消息"
                : "导出为 Markdown"
          }
        >
          导出 Markdown
        </button>
      </header>
      <div className="chat-window">
        {messages.length === 0 && !streaming && (
          <div className="empty-hint">
            输入消息开始对话（Mock 模式开箱可用）
          </div>
        )}
        {messages.map((m) => (
          <div key={m.id} className={`bubble-row ${m.role}`}>
            <div className={`bubble ${m.role}`}>
              <MarkdownLite text={m.content} />
            </div>
          </div>
        ))}
        {streaming && (
          <div className="bubble-row assistant">
            <div className="bubble assistant streaming">
              {streamText ? (
                <>
                  <MarkdownLite text={streamText} />
                  <span className="cursor" />
                </>
              ) : (
                <span className="thinking">正在思考…</span>
              )}
            </div>
          </div>
        )}
        {error && <div className="error-tip">{error}</div>}
        <div ref={bottomRef} />
      </div>
    </>
  );
}
