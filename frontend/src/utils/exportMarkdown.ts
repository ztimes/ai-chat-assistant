import type { Message } from "../types";

/** 补零：9 → "09" */
const pad = (n: number) => String(n).padStart(2, "0");

/**
 * ISO 时间 字符串 → YYYY-MM-DD HH:mm:ss
 * 注意：不能直接 slice(0,16)，因为后端的 createdAt 不带时区后缀（本地时间），
 * 而前端乐观插入的消息是 toISOString()（UTC 带 Z）。统一走 Date 解析成当地时间。
 */
function formatTime(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso; // 脏数据兜底，不让导出失败
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

/**
 * 会话 → Markdown 文本（纯函数，无副作用，方便单测）
 */
export function messagesToMarkdown(title: string, messages: Message[]): string {
  const lines: string[] = [`# ${title}`, ""];

  for (const m of messages) {
    const who = m.role === "user" ? "用户" : "助手";
    lines.push(`## ${who} · ${formatTime(m.createdAt)}`, "", m.content.trim(), "");
  }

  lines.push("---", "", `> 由 AI Chat Assistant 导出 · 共 ${messages.length} 条消息`);
  return lines.join("\n");
}

/**
 * 会话标题 → 安全文件名
 * Windows 禁止字符：\ / : * ? " < > | 以及换行、制表符
 * 标题是用户输入的第一句消息，很可能带这些字符（比如"Vue/React 怎么选"）
 */
export function buildFileName(title: string): string {
  const safe = title
    .replace(/[\\/:*?"<>|\r\n\t]/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 60); // 文件名（含目录）上限 255 字节，中文 3 字节/字，留足余量

  const d = new Date();
  const stamp = `${d.getFullYear()}${pad(d.getMonth() + 1)}${pad(d.getDate())}-${pad(d.getHours())}${pad(d.getMinutes())}`;

  return `${safe || "会话"}-${stamp}.md`;
}

/**
 * 触发浏览器下载
 */
export function downloadTextFile(filename: string, content: string): void {
  // 开头的 \ufeff 是 UTF-8 BOM：
  // 不加的话，Windows 记事本 / 部分 IDE 会把中文显示成乱码（它靠 BOM 判断编码）
  const blob = new Blob(["\ufeff", content], {
    type: "text/markdown;charset=utf-8",
  });

  const url = URL.createObjectURL(blob);

  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.style.display = "none";

  // 必须真的插入文档再点击：Safari 和部分旧版 Firefox 对游离节点的 click() 不响应
  document.body.appendChild(a);
  a.click();
  a.remove();

  // 必须释放，否则这个 blob 会一直驻留内存到页面关闭（导出 20 次就是 20 份副本）
  // 但**不能同步立刻 revoke**：下载是异步开始的，立刻释放会让 Safari/旧 Firefox 拿不到数据。
  // 延后一拍释放是通行的稳妥写法。
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}