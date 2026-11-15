import type { ReactNode } from "react";

/**
 * 轻量 Markdown 渲染（行内代码 / 加粗 / 代码块）。
 * 自己实现而不是引入 marked / react-markdown：
 * - 聊天场景只需要这三个语法，引入完整库体积不划算；
 * - 基于分词拼接 React 节点而不是 dangerouslySetInnerHTML，天然免疫 XSS。
 */

function renderInline(line: string, keyPrefix: string): ReactNode[] {
  const nodes: ReactNode[] = [];
  const pattern = /(`[^`]+`)|(\*\*[^*]+\*\*)/g;
  let last = 0;
  let match: RegExpExecArray | null;
  let i = 0;
  while ((match = pattern.exec(line)) !== null) {
    if (match.index > last) {
      nodes.push(line.slice(last, match.index));
    }
    const token = match[0];
    if (token.startsWith("`")) {
      nodes.push(<code key={`${keyPrefix}-c${i}`}>{token.slice(1, -1)}</code>);
    } else {
      nodes.push(<strong key={`${keyPrefix}-b${i}`}>{token.slice(2, -2)}</strong>);
    }
    last = match.index + token.length;
    i++;
  }
  if (last < line.length) {
    nodes.push(line.slice(last));
  }
  return nodes;
}

export function MarkdownLite({ text }: { text: string }) {
  // 先按 ``` 切代码块：偶数段是普通文本，奇数段是代码块
  const segments = text.split("```");
  return (
    <div className="md-body">
      {segments.map((segment, index) => {
        if (index % 2 === 1) {
          // 代码块：去掉可能的语言标记行
          const lines = segment.replace(/^\w*\n/, "");
          return (
            <pre key={`pre-${index}`} className="code-block">
              <code>{lines.trimEnd()}</code>
            </pre>
          );
        }
        return segment.split("\n").map((line, li) => (
          <p key={`p-${index}-${li}`} className="md-line">
            {line ? renderInline(line, `${index}-${li}`) : "\u00A0"}
          </p>
        ));
      })}
    </div>
  );
}
