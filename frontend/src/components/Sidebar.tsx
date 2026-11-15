import type { Session } from "../types";

interface Props {
  sessions: Session[];
  activeId: string | null;
  onSelect: (id: string) => void;
  onNew: () => void;
}

export function Sidebar({ sessions, activeId, onSelect, onNew }: Props) {
  return (
    <aside className="sidebar">
      <button className="new-chat-btn" onClick={onNew}>
        ＋ 新建会话
      </button>
      <div className="session-list">
        {sessions.map((s) => (
          <button
            key={s.id}
            className={`session-item ${s.id === activeId ? "active" : ""}`}
            onClick={() => onSelect(s.id)}
          >
            <span className="session-title">{s.title}</span>
            <span className="session-meta">{s.messageCount} 条</span>
          </button>
        ))}
      </div>
      <div className="sidebar-footer">AI Chat Assistant</div>
    </aside>
  );
}
