export interface BuildLogBuffer {
  segments: string[];
  totalChars: number;
}

export const emptyBuildLogBuffer = (): BuildLogBuffer => ({
  segments: [],
  totalChars: 0
});

const MAX_LOG_CHARS = 160_000;
const MAX_LOG_SEGMENTS = 240;

export const appendBuildLogChunk = (current: BuildLogBuffer, nextChunk: string): BuildLogBuffer => {
  if (!nextChunk) {
    return current;
  }

  const segments = [...current.segments, nextChunk];
  let totalChars = current.totalChars + nextChunk.length;

  while (segments.length > MAX_LOG_SEGMENTS || totalChars > MAX_LOG_CHARS) {
    const removed = segments.shift();
    totalChars -= removed?.length ?? 0;
  }

  return {
    segments,
    totalChars
  };
};
