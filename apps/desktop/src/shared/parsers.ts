export interface ParsedAuthStatus {
  loggedIn: boolean;
  detail: string;
}

export const parseClaudeAuthStatus = (stdout: string, stderr: string) => {
  const payload = `${stdout}\n${stderr}`.trim();

  try {
    const parsed = JSON.parse(stdout) as { loggedIn?: boolean; email?: string; orgName?: string };
    return {
      loggedIn: Boolean(parsed.loggedIn),
      detail: parsed.email ?? parsed.orgName ?? (parsed.loggedIn ? "Authenticated." : "Authentication required.")
    } satisfies ParsedAuthStatus;
  } catch {
    const lowered = payload.toLowerCase();
    return {
      loggedIn: lowered.includes("loggedin") || lowered.includes("authenticated") || lowered.includes("logged in"),
      detail: payload || "Authentication status unavailable."
    } satisfies ParsedAuthStatus;
  }
};

export interface ParsedPluginStatus {
  installed: boolean;
  enabled: boolean;
  detail: string;
}

export const parseClaudePluginList = (output: string, pluginName: string): ParsedPluginStatus => {
  const marker = `> ${pluginName}`;
  const start = output.indexOf(marker);

  if (start === -1) {
    return {
      installed: false,
      enabled: false,
      detail: `${pluginName} is not installed.`
    };
  }

  const nextPlugin = output.indexOf("\n  >", start + marker.length);
  const block = output.slice(start, nextPlugin === -1 ? undefined : nextPlugin);
  const normalized = block.replace(/\s+/g, " ");
  const enabled = normalized.includes("Status: √ enabled");
  const failed = normalized.includes("Status: × failed to load");

  return {
    installed: true,
    enabled,
    detail: failed ? block.trim() : enabled ? `${pluginName} is enabled.` : `${pluginName} is installed but not enabled.`
  };
};

export interface ParsedClaudeMcpStatus {
  exists: boolean;
  connected: boolean;
  needsAuth: boolean;
  detail: string;
}

export const parseClaudeMcpStatus = (output: string, serverName: "figma" | "playwright"): ParsedClaudeMcpStatus => {
  const lines = output
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);
  const matchingLines = lines.filter((line) => line.toLowerCase().includes(serverName));

  if (matchingLines.length === 0) {
    return {
      exists: false,
      connected: false,
      needsAuth: false,
      detail: `${serverName} MCP is not configured in Claude.`
    };
  }

  const connectedLine = matchingLines.find((line) => line.includes("✓ Connected"));
  if (connectedLine) {
    return {
      exists: true,
      connected: true,
      needsAuth: false,
      detail: connectedLine
    };
  }

  const authLine = matchingLines.find((line) => line.includes("Needs authentication"));
  if (authLine) {
    return {
      exists: true,
      connected: false,
      needsAuth: true,
      detail: authLine
    };
  }

  return {
    exists: true,
    connected: false,
    needsAuth: false,
    detail: matchingLines[0]
  };
};

export interface ParsedCodexMcpStatus {
  exists: boolean;
  enabled: boolean;
  detail: string;
}

export const parseCodexMcpGet = (output: string, serverName: string): ParsedCodexMcpStatus => {
  if (!output.trim()) {
    return {
      exists: false,
      enabled: false,
      detail: `${serverName} MCP is not configured.`
    };
  }

  const enabled = /enabled:\s*true/i.test(output) || /status:\s*enabled/i.test(output);
  return {
    exists: true,
    enabled,
    detail: enabled ? `${serverName} MCP is enabled.` : `${serverName} MCP exists but is not enabled.`
  };
};

export const parseShopifyVersion = (stdout: string, stderr: string) => {
  const text = `${stdout}\n${stderr}`.trim();
  const match = text.match(/\d+\.\d+\.\d+/);
  return {
    installed: Boolean(match),
    detail: match ? `Shopify CLI ${match[0]}` : text || "Shopify CLI not found."
  };
};
