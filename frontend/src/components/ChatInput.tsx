import { KeyboardEvent, useRef, useState } from "react";

interface Props {
  disabled: boolean;
  streaming: boolean;
  onSend: (content: string) => void;
  onStop: () => void;
}

export function ChatInput({ disabled, streaming, onSend, onStop }: Props) {
  const [value, setValue] = useState("");
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const submit = () => {
    const content = value.trim();
    if (!content || disabled) return;
    onSend(content);
    setValue("");
    if (textareaRef.current) {
      textareaRef.current.style.height = "auto";
    }
  };

  const handleKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey && !e.nativeEvent.isComposing) {
      e.preventDefault();
      submit();
    }
  };

  // 简单的自适应高度（上限 6 行）
  const autoResize = (el: HTMLTextAreaElement) => {
    el.style.height = "auto";
    el.style.height = Math.min(el.scrollHeight, 132) + "px";
  };

  return (
    <div className="input-bar">
      <textarea
        ref={textareaRef}
        value={value}
        placeholder="输入消息，Enter 发送，Shift + Enter 换行"
        onChange={(e) => {
          setValue(e.target.value);
          autoResize(e.target);
        }}
        onKeyDown={handleKeyDown}
        rows={1}
        disabled={disabled && !streaming}
      />
      {streaming ? (
        <button className="stop-btn" onClick={onStop}>
          停止
        </button>
      ) : (
        <button className="send-btn" onClick={submit} disabled={!value.trim() || disabled}>
          发送
        </button>
      )}
    </div>
  );
}
