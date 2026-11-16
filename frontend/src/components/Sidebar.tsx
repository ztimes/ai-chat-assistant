import type { Session } from "../types";

import type { Theme }from "../hooks/useTheme";

interface Props {
  sessions: Session[];
  activeId: string | null;
  onSelect: (id: string) => void;
  onNew: () => void;
  theme: Theme;
  onToggleTheme: () => void;
  onDelete: (id: string) => void;
}

export function Sidebar({ sessions, activeId, onSelect, onNew, theme, onToggleTheme, onDelete }: Props) {
  return (
    <aside className="sidebar">
      <button className="new-chat-btn" onClick={onNew}>
        ＋ 新建会话
      </button>
      <div className="session-list">
        {sessions.map((s) => (
          <div
            key={s.id}
            className={`session-row ${s.id === activeId ? "active" : ""}`}
          >
            <button
              className="session-select"
              onClick={() => onSelect(s.id)}
              title={s.title}
            >
              <span className="session-title">{s.title}</span>
              <span className="session-meta">{s.messageCount} 条</span>
            </button>
            <button
              className="session-delete"
              onClick={() => {
                if (window.confirm(`删除会话「${s.title}」？`)) {
                  onDelete(s.id);
                }
              }}
              title="删除会话"
            >
              ✕
            </button>
          </div>
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
