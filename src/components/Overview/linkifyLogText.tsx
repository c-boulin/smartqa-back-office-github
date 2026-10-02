import React from 'react';

const URL_RE = /https?:\/\/[^\s<>)"']+/g;
const TRAILING_PUNCT_RE = /[.,;:!?)]+$/;

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
    let url = match[0];
    let trailing = '';
    const punctMatch = TRAILING_PUNCT_RE.exec(url);
    if (punctMatch) {
      trailing = punctMatch[0];
      url = url.slice(0, -trailing.length);
    }
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
    if (trailing) {
      parts.push(trailing);
    }
    lastIndex = match.index + match[0].length;
  }

  if (lastIndex === 0) return text;
  if (lastIndex < text.length) {
    parts.push(text.slice(lastIndex));
  }
  return <>{parts}</>;
}
