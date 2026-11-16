import json
import uuid
from datetime import datetime

def _now() -> str:
    return datetime.now().isoformat(timespec="seconds")


class Message:
    def __init__(self, role: str, content: str):
        self.id = uuid.uuid4().hex[:12]
        self.role = role          # "user" | "assistant"
        self.content = content
        self.created_at = _now()

    def to_dict(self) -> dict:
        return {
            "id": self.id,
            "role": self.role,
            "content": self.content,
            "createdAt": self.created_at,
        }


class Session:
    def __init__(self):
        self.id = uuid.uuid4().hex[:12]
        self.title = "新会话"
        self.messages: list[Message] = []
        self.created_at = _now()
        self.updated_at = _now()

    def to_summary(self) -> dict:
        return {
            "id": self.id,
            "title": self.title,
            "createdAt": self.created_at,
            "updatedAt": self.updated_at,
            "messageCount": len(self.messages),
        }


class SessionStore:
    """内存会话存储。

    取舍说明（面试可聊的点）：
    - 单进程内存方案，重启即清空，适合 demo 与开发调试；
    - 换 SQLite：每条消息落库时机（流结束后一次性写入，避免半截消息），
      以及并发写锁的处理；
    - 换 Redis：天然适合多进程部署，但要考虑 TTL 与容量上限策略。
    """

    def __init__(self):
        self._sessions: dict[str, Session] = {}

    def create(self) -> Session:
        session = Session()
        self._sessions[session.id] = session
        return session

    def get(self, session_id: str) -> Session | None:
        return self._sessions.get(session_id)

    def list_sessions(self) -> list[dict]:
        # 最近更新的排前面
        sessions = sorted(
            self._sessions.values(),
            key=lambda s: s.updated_at,
            reverse=True,
        )
        return [s.to_summary() for s in sessions]

    def add_message(self, session_id: str, role: str, content: str) -> Message:
        session = self._sessions.get(session_id)
        if session is None:
            raise KeyError(f"session not found: {session_id}")
        message = Message(role, content)
        session.messages.append(message)
        session.updated_at = _now()
        # 首条用户消息作为会话标题
        if role == "user" and session.title == "新会话":
            session.title = content[:20] or "新会话"
        return message

    def get_messages(self, session_id: str) -> list[dict]:
        session = self._sessions.get(session_id)
        if session is None:
            raise KeyError(f"session not found: {session_id}")
        return [m.to_dict() for m in session.messages]

    def delete(self,session_id: str) -> bool:
        """删除会话
        用dict.pop(id,None):
        -键不存在 返回 None，不会抛 KeyError；
        -返回 bool 告诉路由层 "是否真的删除了"，用于 404判断。 
        """
        return self._sessions.pop(session_id, None) is not None


store = SessionStore()
