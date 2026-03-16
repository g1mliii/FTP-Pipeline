import type { CheckResult, ProviderId } from "../../../shared/setup-types";
import { CheckCard } from "./CheckCard";

interface AgentStepProps {
  activeProvider: ProviderId;
  busy: boolean;
  checks: CheckResult[];
  onSelectProvider: (provider: ProviderId) => void;
  onConfigureClaude: () => void;
  onConfigureCodex: () => void;
  onStartClaudeAuth: () => void;
  onStartCodexAuth: () => void;
  onStartClaudeFigmaAuth: () => void;
  onStartCodexFigmaAuth: () => void;
}

export function AgentStep({
  activeProvider,
  busy,
  checks,
  onSelectProvider,
  onConfigureClaude,
  onConfigureCodex,
  onStartClaudeAuth,
  onStartCodexAuth,
  onStartClaudeFigmaAuth,
  onStartCodexFigmaAuth
}: AgentStepProps) {
  const isClaude = activeProvider === "claude";
  const unresolvedChecks = checks.filter((item) => item.status !== "ready");
  const claudeSetupReady = checks
    .filter((item) => ["claudeCli", "claudeSkill", "claudePlaywright", "claudeContextMode"].includes(item.id))
    .every((item) => item.status === "ready");
  const codexSetupReady = checks
    .filter((item) => ["codexCli", "codexFigmaMcp", "codexPlaywrightMcp", "codexContextModeMcp"].includes(item.id))
    .every((item) => item.status === "ready");
  const claudeAuthReady = checks.find((item) => item.id === "claudeAuth")?.status === "ready";
  const codexAuthReady = checks.find((item) => item.id === "codexAuth")?.status === "ready";
  const claudeFigmaReady = checks.find((item) => item.id === "claudeFigma")?.status === "ready";
  const codexFigmaReady = checks.find((item) => item.id === "codexFigmaMcp")?.status === "ready";

  return (
    <div className="agent-step">
      <div className="agent-switcher" aria-label="Agent setup mode">
        <button className="button button-secondary button-inline" type="button" onClick={() => onSelectProvider(isClaude ? "codex" : "claude")}>
          {isClaude ? "Need Codex too?" : "Back to Claude path"}
        </button>
      </div>

      <article className="check-card runtime-card-placeholder agent-intro-card">
        <h4>{isClaude ? "Claude is the default path" : "Codex setup is optional"}</h4>
        <p>
          {isClaude
            ? "Set up Claude, confirm Figma access, and move on. Most users do not need anything else here."
            : "Set up Codex only if this machine also needs Codex CLI and MCP support in addition to Claude."}
        </p>
      </article>

      <div className="panel-actions agent-actions">
        {isClaude ? (
          <>
            {!claudeSetupReady ? (
              <button className="button button-action" type="button" disabled={busy} onClick={onConfigureClaude}>
                Set Up Claude
              </button>
            ) : null}
            {!claudeAuthReady ? (
              <button className="button button-secondary button-action" type="button" disabled={busy} onClick={onStartClaudeAuth}>
                Claude Login
              </button>
            ) : null}
            {!claudeFigmaReady ? (
              <button className="button button-secondary button-action" type="button" disabled={busy} onClick={onStartClaudeFigmaAuth}>
                Figma Access
              </button>
            ) : null}
          </>
        ) : (
          <>
            {!codexSetupReady ? (
              <button className="button button-action" type="button" disabled={busy} onClick={onConfigureCodex}>
                Set Up Codex
              </button>
            ) : null}
            {!codexAuthReady ? (
              <button className="button button-secondary button-action" type="button" disabled={busy} onClick={onStartCodexAuth}>
                Codex Login
              </button>
            ) : null}
            {!codexFigmaReady ? (
              <button className="button button-secondary button-action" type="button" disabled={busy} onClick={onStartCodexFigmaAuth}>
                Codex Figma
              </button>
            ) : null}
          </>
        )}
      </div>

      {unresolvedChecks.length > 0 ? (
        <div className="check-list agent-checks">
          {unresolvedChecks.map((item) => (
            <CheckCard key={item.id} item={item} compact />
          ))}
        </div>
      ) : (
        <article className="check-card is-ready is-compact runtime-card-placeholder">
          <div className="check-row">
            <div className="min-w-0">
              <h4>{isClaude ? "Claude path ready" : "Codex path ready"}</h4>
              <p>{isClaude ? "Claude CLI, auth, skill, and integrations are all set." : "Codex CLI, auth, and MCP setup are all in place."}</p>
            </div>
            <span className="status-chip">Ready</span>
          </div>
        </article>
      )}
    </div>
  );
}
