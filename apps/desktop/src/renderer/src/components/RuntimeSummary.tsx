import { memo } from "react";
import type { CheckResult, SecretStatus } from "../../../shared/setup-types";
import { prettyStatus, statusTone } from "../lib/steps";
import { ExpandableMessage } from "./ExpandableMessage";

interface RuntimeSummaryProps {
  checks: CheckResult[];
  secretStatuses: SecretStatus[];
  onBackupConfigs?: () => void;
  onRefreshChecks?: () => void;
  refreshDisabled?: boolean;
  showWorkspaceTools?: boolean;
  title?: string;
  showSavedExtras?: boolean;
  workspaceToolsDisabled?: boolean;
}

const getSecretBadge = (item: SecretStatus) => {
  if (item.stored) {
    return { label: "Stored", tone: "is-ready" };
  }

  if (item.id === "figmaToken" || item.id === "shopifyStorefrontPassword") {
    return { label: "Optional", tone: "is-action" };
  }

  return { label: "Needed", tone: "is-action" };
};

function RuntimeSummaryComponent({
  checks,
  secretStatuses,
  title = "Needs attention",
  showSavedExtras = true,
  showWorkspaceTools = false,
  onBackupConfigs,
  onRefreshChecks,
  refreshDisabled = false,
  workspaceToolsDisabled = false
}: RuntimeSummaryProps) {
  const blockers = checks.filter((item) => item.required && item.status !== "ready");
  const showPlaceholder = checks.length === 0;
  const orderedSecretStatuses = [...secretStatuses].sort((left, right) => {
    const order = ["shopifyStorefrontPassword", "figmaToken"];
    return order.indexOf(left.id) - order.indexOf(right.id);
  });

  return (
    <section className="summary-panel">
      {showWorkspaceTools ? (
        <div className="summary-section">
          <div className="summary-section-header">
            <p className="eyebrow">Workspace tools</p>
          </div>
          <p className="summary-copy">Refresh checks or back up local config without leaving the build screen.</p>
          <div className="summary-tool-grid">
            <button className="button button-secondary button-inline" type="button" disabled={refreshDisabled} onClick={onRefreshChecks}>
              Refresh Checks
            </button>
            <button className="button button-inline" type="button" disabled={workspaceToolsDisabled} onClick={onBackupConfigs}>
              Back Up Configs
            </button>
          </div>
        </div>
      ) : null}

      <div className="summary-shell">
        <p className="eyebrow">Quick read</p>
        <h3>{showPlaceholder ? "Checking the workspace" : blockers.length > 0 ? title : "Ready to build"}</h3>
        <p className="summary-copy">
          {showPlaceholder
            ? "The desktop app is still checking tools and saved state."
            : blockers.length > 0
              ? `${blockers.length} required item${blockers.length === 1 ? "" : "s"} still need attention.`
              : "Core setup is in place. Move through the steps and run the build when ready."}
        </p>
      </div>

      <div className="summary-list">
        {showPlaceholder ? (
          <article className="summary-item is-muted">
            <strong>Loading checks</strong>
            <p>Status details will appear here once the first pass completes.</p>
          </article>
        ) : (
          <>
            {blockers.length > 0 ? (
              blockers.map((item) => (
                <article key={item.id} className={`summary-item ${statusTone[item.status]}`}>
                  <div className="summary-item-header">
                    <strong>{item.label}</strong>
                    <span className={`runtime-state ${statusTone[item.status]}`}>{prettyStatus(item.status)}</span>
                  </div>
                  <ExpandableMessage
                    summaryLabel="Show blocker details"
                    text={item.detail ?? "Needs attention before the build can continue."}
                  />
                </article>
              ))
            ) : (
              <article className="summary-item is-ready">
                <div className="summary-item-header">
                  <strong>Required setup complete</strong>
                  <span className="runtime-state is-ready">Ready</span>
                </div>
                <p>The required checks have passed. Optional extras can still be added later.</p>
              </article>
            )}
          </>
        )}
      </div>

      {showSavedExtras ? (
        <div className="summary-section">
          <div className="summary-section-header">
            <p className="eyebrow">Saved extras</p>
          </div>
          <div className="summary-list">
            {secretStatuses.length === 0 ? (
              <article className="summary-item is-muted">
                <strong>Vault not loaded yet</strong>
                <p>Saved tokens and storefront passwords will appear here.</p>
              </article>
            ) : (
            orderedSecretStatuses.map((item) => {
              const badge = getSecretBadge(item);
              return (
                <article key={item.id} className="summary-item is-muted">
                    <div className="summary-item-header">
                      <strong>{item.label}</strong>
                      <span className={`runtime-state ${badge.tone}`}>{badge.label}</span>
                    </div>
                    <ExpandableMessage summaryLabel="Show saved state details" text={item.detail} />
                  </article>
                );
              })
            )}
          </div>
        </div>
      ) : null}
    </section>
  );
}

export const RuntimeSummary = memo(RuntimeSummaryComponent);
