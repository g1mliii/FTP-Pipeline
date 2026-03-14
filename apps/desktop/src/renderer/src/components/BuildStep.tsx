import { memo } from "react";
import type { BuildDraft, BuildRunState, LaunchClaudeContext } from "../../../shared/setup-types";
import { buildTone, prettyStatus } from "../lib/steps";
import { ClaudeTerminalSurface } from "./ClaudeTerminalSurface";
import { ExpandableMessage } from "./ExpandableMessage";

interface BuildStepProps {
  buildDraft: BuildDraft | null;
  buildState: BuildRunState;
  busy: boolean;
  launchContext?: LaunchClaudeContext;
  launchNonce: number;
  onLaunchTerminal: () => void;
  onTerminalExit: () => void;
  onTerminalStarted: () => void;
  onStartBuild: () => void;
  onCancelBuild: () => void;
  shouldLaunchTerminalSession: boolean;
  terminalReady: boolean;
  terminalVisible: boolean;
}

function BuildStepComponent({
  buildDraft,
  buildState,
  busy,
  launchContext,
  launchNonce,
  onCancelBuild,
  onLaunchTerminal,
  onTerminalExit,
  onTerminalStarted,
  onStartBuild,
  shouldLaunchTerminalSession,
  terminalReady,
  terminalVisible
}: BuildStepProps) {
  const hasSavedDetails = Boolean(buildDraft?.figmaUrl && buildDraft.storeDomain && buildDraft.designSlug);
  const savedBuildDraft = hasSavedDetails ? buildDraft : null;
  const isReadyToRun = hasSavedDetails && buildState.status === "idle";
  const readinessTitle =
    buildState.status === "running"
      ? "Build in progress"
      : buildState.status === "succeeded"
        ? "Build finished"
        : buildState.status === "failed"
          ? "Build needs attention"
          : buildState.status === "cancelled"
            ? "Build cancelled"
            : isReadyToRun
              ? "Ready to run"
              : "Missing build details";
  const readinessCopy =
    buildState.status === "running"
      ? "Claude is building the theme now. The preview checks will open after it finishes."
      : buildState.status === "succeeded"
        ? "The last build completed. Run it again any time after updating the design or store details."
        : buildState.status === "failed"
          ? "The last build failed. Review the details below, then run it again."
          : buildState.status === "cancelled"
            ? "The build was stopped before completion. You can start it again when ready."
            : isReadyToRun
              ? "All required details are saved. You can run the build now."
              : "Save the project name, store, and Figma file in Details before you start the build.";
  const readinessClassName = isReadyToRun && buildState.status === "idle" ? "build-ready-card is-launch-ready" : "build-ready-card";

  return (
    <div className="build-stack build-step">
      <div className="build-summary">
        <article className={`check-card is-compact ${readinessClassName}`}>
          <div className="build-ready-header">
            <div className="min-w-0">
              <p className="eyebrow">Build status</p>
              <h4>{readinessTitle}</h4>
              <p>{readinessCopy}</p>
            </div>
            <span className={`status-chip ${buildTone[buildState.status]}${isReadyToRun && buildState.status === "idle" ? " is-ready-pill" : ""}`}>
              {isReadyToRun && buildState.status === "idle" ? "Ready" : prettyStatus(buildState.status)}
            </span>
          </div>
          {buildState.summary ? <ExpandableMessage summaryLabel="Show build details" text={buildState.summary} /> : null}
          {savedBuildDraft ? (
            <div className="build-ready-grid">
              <span>Project: {savedBuildDraft.designSlug}</span>
              <span>Store: {savedBuildDraft.storeDomain}</span>
              <span className="draft-wide">Figma source saved</span>
            </div>
          ) : null}
          {buildDraft ? (
            <div className="build-optional-row">
              <span className={`build-optional-pill${buildDraft.figmaTokenStored ? " is-stored" : ""}`}>
                Figma API token: {buildDraft.figmaTokenStored ? "stored" : "not set"}
              </span>
              <span className={`build-optional-pill${buildDraft.storefrontPasswordStored ? " is-stored" : ""}`}>
                Storefront password: {buildDraft.storefrontPasswordStored ? "stored" : "not set"}
              </span>
            </div>
          ) : null}
        </article>
      </div>

      <div className="panel-actions build-actions">
        <button className="button button-action" type="button" disabled={busy || buildState.status === "running"} onClick={onStartBuild}>
          {buildState.status === "running" ? "Building…" : "Run Build in Terminal"}
        </button>
        <button className="button button-secondary button-action" type="button" disabled={buildState.status !== "running"} onClick={onCancelBuild}>
          Stop Build
        </button>
        <button className="button button-secondary button-action" type="button" disabled={busy && !terminalVisible} onClick={onLaunchTerminal}>
          {terminalVisible ? "Close Terminal" : "Open Claude Terminal"}
        </button>
      </div>

      <section className={`build-terminal-panel ${terminalVisible ? "is-active" : "is-idle"}`}>
        <div className="terminal-header">
          <div className="min-w-0">
            <p className="eyebrow">Interactive control</p>
            <h3>{terminalVisible ? (terminalReady ? "Claude Terminal Active" : "Launching Claude Terminal") : "Claude Terminal"}</h3>
            <p>The build now runs in this terminal so you can interrupt it, adjust prompts, and continue manually.</p>
          </div>
        </div>

        <ClaudeTerminalSurface
          active={terminalVisible}
          launchContext={launchContext}
          launchNonce={launchNonce}
          onExit={onTerminalExit}
          onStarted={onTerminalStarted}
          shouldLaunchSession={shouldLaunchTerminalSession}
        />
      </section>
    </div>
  );
}

export const BuildStep = memo(BuildStepComponent);
