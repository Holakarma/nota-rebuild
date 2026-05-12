export const NOTE_PREVIEW_TEXT_LENGTH = 80;

export function buildNoteContentFields(bodyMarkdown: string) {
  const bodyText = markdownToPlainText(bodyMarkdown);

  return {
    bodyMarkdown,
    bodyText,
    previewText: getNotePreviewText(bodyText),
  };
}

export function getNotePreviewText(bodyText: string) {
  return [...bodyText].slice(0, NOTE_PREVIEW_TEXT_LENGTH).join('');
}

export function markdownToPlainText(markdown: string) {
  return markdown
    .replace(/\r\n?/g, '\n')
    .replace(/```[^\n]*\n?([\s\S]*?)```/g, '$1')
    .replace(/~~~[^\n]*\n?([\s\S]*?)~~~/g, '$1')
    .replace(/!\[([^\]]*)\]\([^)]+\)/g, '$1')
    .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1')
    .replace(/`([^`]*)`/g, '$1')
    .replace(/^\s{0,3}#{1,6}\s+/gm, '')
    .replace(/^\s{0,3}>\s?/gm, '')
    .replace(/^\s*[-+*]\s+/gm, '')
    .replace(/^\s*\d+[.)]\s+/gm, '')
    .replace(/^\s*([-*_])(?:\s*\1){2,}\s*$/gm, '')
    .replace(/<[^>\n]+>/g, '')
    .replace(/[*_~]{1,3}/g, '')
    .replace(/\\([\\`*_{}[\]()#+\-.!|>])/g, '$1')
    .replace(/\s+/g, ' ')
    .trim();
}
