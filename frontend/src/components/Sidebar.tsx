import type { Session } from "../types";

import type { Theme }from "../hooks/useTheme";

interface Props {
  sessions: Session[];
  activeId: string | null;
  onSelect: (id: string) => void;
  onNew: () => void;
  theme: Theme;
  onToggleTheme: () => void;
}

export function Sidebar({ sessions, activeId, onSelect, onNew, theme, onToggleTheme }: Props) {
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
      <div className="sidebar-footer">
        <span>AI Chat Assistant</span> &nbsp;
        <button
          className="theme-toggle"
          onClick={onToggleTheme}
          title={theme === "dark" ? "切换到浅色" : "切换到深色"}
        >
          {theme === "dark" ? "☀ 浅色" : "☾ 深色"}
        </button>
      </div>
    </aside>
  );
}
