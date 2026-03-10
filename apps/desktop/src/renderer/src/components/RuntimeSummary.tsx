import { memo } from "react";
import type { RuntimeState, SecretStatus } from "../../../shared/setup-types";

interface RuntimeSummaryProps {
  runtimeStates: RuntimeState[];
  secretStatuses: SecretStatus[];
}

function RuntimeSummaryComponent({ runtimeStates, secretStatuses }: RuntimeSummaryProps) {
  const showRuntimePlaceholders = runtimeStates.length === 0;
  const showSecretPlaceholders = secretStatuses.length === 0;

  return (
    <section className="panel summary-panel">
      <div className="panel-header">
        <div>
          <p className="eyebrow">Status</p>
          <h3>Runtime Summary</h3>
        </div>
      </div>

      <div className="runtime-grid">
        {showRuntimePlaceholders ? (
          <article className="runtime-card runtime-card-placeholder">
            <div className="runtime-header">
              <strong>Runtime checks</strong>
              <span className="runtime-state is-action">Loading</span>
            </div>
            <p>The desktop app is still resolving Claude, Codex, and integration status.</p>
          </article>
        ) : (
          runtimeStates.map((runtime) => (
            <article key={runtime.provider} className="runtime-card">
              <div className="runtime-header">
                <strong>{runtime.provider === "claude" ? "Claude" : "Codex"}</strong>
                <span className={`runtime-state ${runtime.installed ? "is-ready" : "is-error"}`}>{runtime.installed ? "Installed" : "Missing"}</span>
              </div>
              <p>{runtime.authenticated ? "Authenticated or ready." : "Authentication required."}</p>
              <ul>
                {runtime.integrations.length > 0 ? runtime.integrations.map((item) => <li key={item}>{item}</li>) : <li>No integrations ready yet.</li>}
              </ul>
            </article>
          ))
        )}
      </div>

      <div className="runtime-grid">
        {showSecretPlaceholders ? (
          <article className="runtime-card runtime-card-placeholder">
            <div className="runtime-header">
              <strong>Vault state</strong>
              <span className="runtime-state is-action">Loading</span>
            </div>
            <p>Secure token and storefront-password status will appear here once the initial checks complete.</p>
          </article>
        ) : (
          secretStatuses.map((item) => (
            <article key={item.id} className="runtime-card">
              <div className="runtime-header">
                <strong>{item.label}</strong>
                <span className={`runtime-state ${item.stored ? "is-ready" : "is-action"}`}>{item.stored ? "Stored" : "Needed"}</span>
              </div>
              <p>{item.detail}</p>
            </article>
          ))
        )}
      </div>
    </section>
  );
}

export const RuntimeSummary = memo(RuntimeSummaryComponent);
