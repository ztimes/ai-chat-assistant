import { ChatInput } from "./components/ChatInput";
import { ChatWindow } from "./components/ChatWindow";
import { Sidebar } from "./components/Sidebar";
import { useChat } from "./hooks/useChat";
import { useTheme } from "./hooks/useTheme";

export default function App() {
  const {
    theme,
    toggle
  } = useTheme();
  const {
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
    removeSession,
    exportCurrent,
  } = useChat();

  // 当前会话标题（找不到就给个默认值，避免 header 空着）
  const activeTitle = sessions.find((s) => s.id === activeId)?.title ?? "新会话";

  return (
    <div className="app">
      <Sidebar
        sessions={sessions}
        activeId={activeId}
        onSelect={openSession}
        onNew={() => void newSession()}
        theme = {theme}
        onToggleTheme = {toggle}
        onDelete = {(id)=> void removeSession(id)}
      />
      <main className="chat-main">
        <ChatWindow
          messages={messages}
          streamText={streamText}
          streaming={streaming}
          error={error}
          title={activeTitle}
          onExport={exportCurrent}
        />
        <ChatInput
          disabled={!activeId}
          streaming={streaming}
          onSend={(content) => void send(content)}
          onStop={stop}
        />
      </main>
    </div>
  );
}
