import { renderMarkdownLite } from '../lib/markdown';

/** Renders card text with markdown-lite formatting (input is escaped). */
export function Markdown({ text }: { text: string }) {
  return <span dangerouslySetInnerHTML={{ __html: renderMarkdownLite(text) }} />;
}
