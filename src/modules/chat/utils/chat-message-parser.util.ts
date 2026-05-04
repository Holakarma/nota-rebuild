import {
  prepareStreamName,
  type PreparedStreamName,
} from '@modules/stream/utils/prepare-stream-name.util';

export type ParsedChatMessageForNote = {
  bodyMarkdown: string;
  streamNames: string[];
};

export function parseChatMessageForNote(
  bodyMarkdown: string,
): ParsedChatMessageForNote {
  const lines = bodyMarkdown.replace(/\r\n?/g, '\n').split('\n');
  let start = firstContentLineIndex(lines);
  let end = lastContentLineIndex(lines);
  const streamsByNormalizedName = new Map<string, PreparedStreamName>();

  if (start === -1) {
    return {
      bodyMarkdown: '',
      streamNames: [],
    };
  }

  while (start <= end && isServiceLine(lines[start])) {
    addStreamName(streamsByNormalizedName, lines[start]);
    start += 1;
  }

  while (end >= start && isServiceLine(lines[end])) {
    addStreamName(streamsByNormalizedName, lines[end]);
    end -= 1;
  }

  const noteLines = trimOuterBlankLines(lines.slice(start, end + 1));

  return {
    bodyMarkdown: noteLines.join('\n'),
    streamNames: [...streamsByNormalizedName.values()].map((name) => name.name),
  };
}

function addStreamName(
  streamsByNormalizedName: Map<string, PreparedStreamName>,
  serviceLine: string,
) {
  const streamName = prepareStreamName(serviceLine.slice(1));

  if (!streamsByNormalizedName.has(streamName.normalizedName)) {
    streamsByNormalizedName.set(streamName.normalizedName, streamName);
  }
}

function firstContentLineIndex(lines: string[]) {
  return lines.findIndex((line) => !isBlankLine(line));
}

function lastContentLineIndex(lines: string[]) {
  for (let i = lines.length - 1; i >= 0; i -= 1) {
    if (!isBlankLine(lines[i])) {
      return i;
    }
  }

  return -1;
}

function trimOuterBlankLines(lines: string[]) {
  let start = firstContentLineIndex(lines);
  let end = lastContentLineIndex(lines);

  if (start === -1) {
    return [];
  }

  while (start <= end && isBlankLine(lines[start])) {
    start += 1;
  }

  while (end >= start && isBlankLine(lines[end])) {
    end -= 1;
  }

  return lines.slice(start, end + 1);
}

function isBlankLine(line: string) {
  return line.trim().length === 0;
}

function isServiceLine(line: string) {
  return line.startsWith(':');
}
