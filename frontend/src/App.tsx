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
  } = useChat();

  return (
    <div className="app">
      <Sidebar
        sessions={sessions}
        activeId={activeId}
        onSelect={openSession}
        onNew={() => void newSession()}
        theme = {theme}
        onToggleTheme = {toggle}
      />
      <main className="chat-main">
        <ChatWindow
          messages={messages}
          streamText={streamText}
          streaming={streaming}
          error={error}
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
