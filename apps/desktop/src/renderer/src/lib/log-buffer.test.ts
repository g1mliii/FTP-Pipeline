import { describe, expect, it } from "vitest";
import { appendBuildLogChunk, emptyBuildLogBuffer } from "./log-buffer";

describe("build log buffer", () => {
  it("appends chunks and tracks total chars", () => {
    const next = appendBuildLogChunk(emptyBuildLogBuffer(), "alpha");
    expect(next.segments).toEqual(["alpha"]);
    expect(next.totalChars).toBe(5);
  });

  it("trims old chunks once the buffer limit is exceeded", () => {
    let current = emptyBuildLogBuffer();
    for (let index = 0; index < 300; index += 1) {
      current = appendBuildLogChunk(current, `${index}-chunk-`);
    }

    expect(current.segments.length).toBeLessThanOrEqual(240);
    expect(current.totalChars).toBeLessThanOrEqual(160000);
  });
});
