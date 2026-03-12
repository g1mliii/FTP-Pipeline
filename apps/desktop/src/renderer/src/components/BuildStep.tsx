import { memo, useMemo, type RefObject } from "react";
import type { BuildDraft, BuildRunState } from "../../../shared/setup-types";
import { buildTone, prettyStatus } from "../lib/steps";
import { ClaudeTerminalSurface } from "./ClaudeTerminalSurface";

interface ConnectionFieldErrors {
  storeDomain?: string;
  figmaUrl?: string;
  designSlugDraft?: string;
}

interface BuildStepProps {
  buildDraft: BuildDraft | null;
  buildLogSegments: string[];
  buildState: BuildRunState;
  busy: boolean;
  designSlugDraft: string;
  designSlugRef: RefObject<HTMLInputElement | null>;
  errors: ConnectionFieldErrors;
  figmaUrl: string;
  figmaUrlRef: RefObject<HTMLInputElement | null>;
  onChangeDesignSlugDraft: (value: string) => void;
  onChangeFigmaUrl: (value: string) => void;
  onChangeStoreDomain: (value: string) => void;
  onLaunchTerminal: () => void;
  onTerminalExit: () => void;
  onTerminalStarted: () => void;
  onStartBuild: () => void;
  onCancelBuild: () => void;
  storeDomain: string;
  storeDomainRef: RefObject<HTMLInputElement | null>;
  terminalReady: boolean;
  terminalVisible: boolean;
}

function BuildStepComponent({
  buildDraft,
  buildLogSegments,
  buildState,
  busy,
  designSlugDraft,
  designSlugRef,
  errors,
  figmaUrl,
  figmaUrlRef,
  onCancelBuild,
  onChangeDesignSlugDraft,
  onChangeFigmaUrl,
  onChangeStoreDomain,
  onLaunchTerminal,
  onTerminalExit,
  onTerminalStarted,
  onStartBuild,
  storeDomain,
  storeDomainRef,
  terminalReady,
  terminalVisible
}: BuildStepProps) {
  const buildOutputText = useMemo(
    () => (buildLogSegments.length > 0 ? buildLogSegments.join("") : "No build output yet."),
    [buildLogSegments]
  );
  const hasBuildOutput = buildLogSegments.length > 0;

  return (
    <div className="build-stack build-step">
      <div className="form-grid build-form-grid">
        <label className="is-wide">
          <span>Figma File URL</span>
          <input
            ref={figmaUrlRef}
            autoComplete="off"
            inputMode="url"
            name="buildFigmaUrl"
            placeholder="https://www.figma.com/design/FILE_KEY/Example…"
            spellCheck={false}
            type="url"
            value={figmaUrl}
            onChange={(event) => onChangeFigmaUrl(event.target.value)}
          />
          {errors.figmaUrl ? <small className="field-error">{errors.figmaUrl}</small> : null}
        </label>

        <label>
          <span>Shopify Store Domain</span>
          <input
            ref={storeDomainRef}
            autoComplete="off"
            inputMode="url"
            name="buildShopifyStoreDomain"
            placeholder="your-store.myshopify.com…"
            spellCheck={false}
            type="text"
            value={storeDomain}
            onChange={(event) => onChangeStoreDomain(event.target.value)}
          />
          {errors.storeDomain ? <small className="field-error">{errors.storeDomain}</small> : null}
        </label>

        <label>
          <span>Project Name</span>
          <input
            ref={designSlugRef}
            autoComplete="off"
            name="buildDesignSlug"
            placeholder="my-project-name…"
            spellCheck={false}
            type="text"
            value={designSlugDraft}
            onChange={(event) => onChangeDesignSlugDraft(event.target.value)}
          />
          {errors.designSlugDraft ? <small className="field-error">{errors.designSlugDraft}</small> : null}
        </label>
      </div>

      <div className="build-summary">
        <article className="check-card is-idle is-compact">
          <div className="check-row">
            <div className="min-w-0">
              <h4>Draft Context</h4>
              <p>Saved store and Figma context feed the Claude build env. After Claude finishes, the wrapper opens a visible Chromium window and runs the local Playwright preview checks for you.</p>
            </div>
            <span className={`status-chip ${buildTone[buildState.status]}`}>{prettyStatus(buildState.status)}</span>
          </div>
          {buildState.summary ? <p>{buildState.summary}</p> : null}
          {buildDraft ? (
            <div className="draft-metadata">
              <span>Optional Figma API token: {buildDraft.figmaTokenStored ? "stored" : "not set"}</span>
              <span>Storefront password: {buildDraft.storefrontPasswordStored ? "stored" : "not set"}</span>
            </div>
          ) : null}
        </article>
      </div>

      <div className="panel-actions build-actions">
        <button className="button button-action" type="button" disabled={busy || buildState.status === "running"} onClick={onStartBuild}>
          {buildState.status === "running" ? "Building…" : "Start Build & Watch Tests"}
        </button>
        <button className="button button-secondary button-action" type="button" disabled={buildState.status !== "running"} onClick={onCancelBuild}>
          Cancel Build
        </button>
        <button className="button button-secondary button-action" type="button" disabled={busy && !terminalVisible} onClick={onLaunchTerminal}>
          {terminalVisible ? "Close Claude Terminal" : "Launch Claude Terminal"}
        </button>
      </div>

      <section className={`build-terminal-panel ${terminalVisible ? "is-active" : "is-idle"}`}>
        <div className="terminal-header">
          <div className="min-w-0">
            <p className="eyebrow">Interactive orchestration</p>
            <h3>{terminalVisible ? (terminalReady ? "Claude Terminal Active" : "Launching Claude Terminal") : "Claude Terminal"}</h3>
            <p>Keep the terminal front-and-center when you need to drive Claude directly from the repo workspace.</p>
          </div>
        </div>

        <ClaudeTerminalSurface active={terminalVisible} onExit={onTerminalExit} onStarted={onTerminalStarted} storeDomain={storeDomain} />
      </section>

      <div className="build-console">
        <div className="terminal-header">
          <div className="min-w-0">
            <p className="eyebrow">Live progress</p>
            <h3>Claude Build Output</h3>
            <p>A real browser window opens automatically during the homepage and route preview checks.</p>
          </div>
        </div>
        <pre className={hasBuildOutput ? "has-output" : "is-empty"}>{buildOutputText}</pre>
      </div>
    </div>
  );
}

export const BuildStep = memo(BuildStepComponent);
