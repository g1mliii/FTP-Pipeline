import process from "node:process";

const TRUE_VALUES = new Set(["1", "true", "yes", "on"]);
const FALSE_VALUES = new Set(["0", "false", "no", "off"]);

const parseBoolean = (value, fallback) => {
  if (typeof value !== "string") {
    return fallback;
  }

  const normalized = value.trim().toLowerCase();
  if (TRUE_VALUES.has(normalized)) {
    return true;
  }
  if (FALSE_VALUES.has(normalized)) {
    return false;
  }

  return fallback;
};

const parseInteger = (value, fallback, minimum, maximum) => {
  const parsed = Number.parseInt(value ?? "", 10);
  if (!Number.isFinite(parsed)) {
    return fallback;
  }

  return Math.min(maximum, Math.max(minimum, parsed));
};

export const getPlaywrightLaunchOptions = () => ({
  headless: parseBoolean(process.env.PLAYWRIGHT_HEADLESS, false),
  slowMo: parseInteger(process.env.PLAYWRIGHT_SLOWMO, 175, 0, 5_000)
});

export const getHumanPauseMs = (fallback = 325) =>
  parseInteger(process.env.PLAYWRIGHT_HUMAN_PAUSE_MS, fallback, 0, 10_000);

export const waitForHumanPause = async (page, fallback) => {
  await page.waitForTimeout(getHumanPauseMs(fallback));
};

export const waitForClosingBeat = async (page) => {
  const holdMs = parseInteger(process.env.PLAYWRIGHT_KEEP_OPEN_MS, 900, 0, 15_000);
  if (holdMs > 0) {
    await page.waitForTimeout(holdMs);
  }
};
