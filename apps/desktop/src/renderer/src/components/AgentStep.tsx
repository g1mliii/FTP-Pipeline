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

  return (
    <div className="agent-step">
      <div className="provider-toggle" role="tablist" aria-label="Agent provider">
        <button
          aria-selected={isClaude}
          className={`provider-toggle-button${isClaude ? " is-active" : ""}`}
          role="tab"
          type="button"
          onClick={() => onSelectProvider("claude")}
        >
          Claude
        </button>
        <button
          aria-selected={!isClaude}
          className={`provider-toggle-button${!isClaude ? " is-active" : ""}`}
          role="tab"
          type="button"
          onClick={() => onSelectProvider("codex")}
        >
          Codex
        </button>
      </div>

      <article className="check-card runtime-card-placeholder agent-intro-card">
        <h4>{isClaude ? "Claude is the primary path" : "Codex is optional"}</h4>
        <p>
          {isClaude
            ? "Use Claude for the default repo workflow, auth, skill install, and Figma/Playwright readiness."
            : "Use Codex only if this machine also needs Codex CLI, login, and MCP connectivity."}
        </p>
      </article>

      <div className="panel-actions agent-actions">
        {isClaude ? (
          <>
            <button className="button button-action" type="button" disabled={busy} onClick={onConfigureClaude}>
              Configure Claude
            </button>
            <button className="button button-secondary button-action" type="button" disabled={busy} onClick={onStartClaudeAuth}>
              Claude Auth
            </button>
            <button className="button button-secondary button-action" type="button" disabled={busy} onClick={onStartClaudeFigmaAuth}>
              Claude Figma
            </button>
          </>
        ) : (
          <>
            <button className="button button-action" type="button" disabled={busy} onClick={onConfigureCodex}>
              Configure Codex
            </button>
            <button className="button button-secondary button-action" type="button" disabled={busy} onClick={onStartCodexAuth}>
              Codex Auth
            </button>
            <button className="button button-secondary button-action" type="button" disabled={busy} onClick={onStartCodexFigmaAuth}>
              Codex Figma
            </button>
          </>
        )}
      </div>

      <div className="check-list agent-checks">
        {checks.map((item) => (
          <CheckCard key={item.id} item={item} compact />
        ))}
      </div>
    </div>
  );
}
