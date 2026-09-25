import React from 'react';

const URL_RE = /https?:\/\/[^\s<>)"']+/g;

export function linkifyLogText(text: string): React.ReactNode {
  if (!text) return text;

  const parts: React.ReactNode[] = [];
  let lastIndex = 0;
  let match: RegExpExecArray | null;

  URL_RE.lastIndex = 0;
  while ((match = URL_RE.exec(text)) !== null) {
    if (match.index > lastIndex) {
      parts.push(text.slice(lastIndex, match.index));
    }
    const url = match[0];
    parts.push(
      <a
        key={`${match.index}-${url}`}
        href={url}
        target="_blank"
        rel="noopener noreferrer"
        className="text-blue-400 underline break-all"
        onClick={(e: React.MouseEvent) => e.stopPropagation()}
      >
        {url}
      </a>,
    );
    lastIndex = match.index + url.length;
  }

  if (lastIndex === 0) return text;
  if (lastIndex < text.length) {
    parts.push(text.slice(lastIndex));
  }
  return <>{parts}</>;
}
