import { useEffect, useMemo } from "react";
import { AgentStep } from "./components/AgentStep";
import { ConnectionsStep } from "./components/ConnectionsStep";
import { BuildStep } from "./components/BuildStep";
import { CheckCard } from "./components/CheckCard";
import { RuntimeSummary } from "./components/RuntimeSummary";
import { StepSidebar } from "./components/StepSidebar";
import { stepChecks } from "./lib/steps";
import { useDesktopController } from "./hooks/useDesktopController";

function App() {
  const controller = useDesktopController();
  const updateMessage =
    controller.updateStatus.state === "idle"
      ? "Automatic updates run in packaged builds."
      : controller.updateStatus.message ?? `Update status: ${controller.updateStatus.state}.`;
  const currentStep = useMemo(
    () => controller.steps.find((item) => item.id === controller.activeStep),
    [controller.activeStep, controller.steps]
  );
  const currentStepChecks = useMemo(
    () => controller.snapshot?.checks.filter((item) => stepChecks[controller.activeStep].includes(item.id)) ?? [],
    [controller.activeStep, controller.snapshot?.checks]
  );
  const unresolvedCurrentStepChecks = useMemo(
    () => currentStepChecks.filter((item) => item.status !== "ready"),
    [currentStepChecks]
  );
  const showRuntimeSummary = !["dependencies", "connections", "build"].includes(controller.activeStep);
  const showSavedExtras = !["agent", "connections"].includes(controller.activeStep);
  const showTopToolbar = controller.activeStep !== "build";

  useEffect(() => {
    if (!controller.resultMessage || controller.resultIsError) {
      return;
    }

    const timeout = window.setTimeout(() => {
      controller.clearResult();
    }, 4000);

    return () => window.clearTimeout(timeout);
  }, [controller.clearResult, controller.resultIsError, controller.resultMessage]);

  return (
    <div className="app-shell">
      <StepSidebar
        activeStep={controller.activeStep}
        completedSteps={controller.completedSteps}
        steps={controller.steps}
        workspaceRoot={controller.snapshot?.workspaceRoot}
        onSelectStep={controller.setActiveStep}
      />

      <main id="app-main" className="app-main">
        {showTopToolbar ? (
          <div className="top-toolbar utility-toolbar">
            <div className="utility-copy">
              <p className="eyebrow">Workspace tools</p>
              <p>Refresh checks or back up the local config before you run the build.</p>
              <p className="utility-status" role="status">
                {updateMessage}
              </p>
            </div>
            <div className="button-row">
              <button
                className="button button-secondary button-toolbar"
                type="button"
                disabled={controller.busy || controller.checksRefreshing}
                onClick={() => void controller.refreshAll()}
              >
                {controller.checksRefreshing ? "Refreshing…" : "Refresh Checks"}
              </button>
              <button
                className="button button-toolbar"
                type="button"
                disabled={controller.busy}
                onClick={() => void controller.runAction("backup", () => window.desktopApi.backupConfigs())}
              >
                Back Up Configs
              </button>
              <button
                className="button button-secondary button-toolbar"
                type="button"
                disabled={controller.updateCheckBusy}
                onClick={() => void controller.checkForUpdates()}
              >
                {controller.updateCheckBusy ? "Checking…" : "Check for Updates"}
              </button>
            </div>
          </div>
        ) : null}

        {controller.activeStep === "dependencies" ? (
          <header className="hero-panel">
            <div className="min-w-0">
              <p className="eyebrow">Getting started</p>
              <h2>Save the essentials, check the tools, and run the build</h2>
              <p className="hero-copy">The wrapper keeps your store details, saves optional secrets, and opens preview checks after the build.</p>
            </div>
          </header>
        ) : null}

        {controller.resultMessage ? (
          <div aria-live="polite" className={`banner${controller.resultIsError ? " is-error-banner" : ""}`} role="status">
            {controller.resultMessage}
          </div>
        ) : null}

        <section className={`panel-grid${showRuntimeSummary ? "" : " is-single-column"}`}>
          <section className="panel">
            <div className="panel-header">
              <div className="min-w-0">
                <p className="eyebrow">Current step</p>
                <h3>{currentStep?.title}</h3>
                {currentStep?.description ? <p className="step-note">{currentStep.description}</p> : null}
              </div>
              <div className="panel-header-side">
                {controller.busyLabel ? <span className="busy-pill">{controller.busyLabel}…</span> : null}
                {!controller.busyLabel && controller.checksRefreshing ? <span className="busy-pill">Refreshing checks…</span> : null}
              </div>
            </div>

            {controller.activeStep === "dependencies" ? (
              <>
                <div className="panel-actions">
                  <button
                    className="button button-action"
                    type="button"
                    disabled={controller.busy}
                    onClick={() => void controller.runAction("dependencies", () => window.desktopApi.installDependencies())}
                  >
                    Install Core Tools
                  </button>
                </div>
                {currentStepChecks.length > 0 ? (
                  unresolvedCurrentStepChecks.length > 0 ? (
                    <div className="check-list">
                      {unresolvedCurrentStepChecks.map((item) => (
                        <CheckCard key={item.id} item={item} />
                      ))}
                    </div>
                  ) : (
                    <article className="check-card is-ready runtime-card-placeholder">
                      <div className="check-row">
                        <div className="min-w-0">
                          <h4>Dependencies ready</h4>
                          <p>Node, repo packages, Shopify CLI, and Playwright Chromium are already in place.</p>
                        </div>
                        <span className="status-chip">Ready</span>
                      </div>
                    </article>
                  )
                ) : (
                  <article className="check-card runtime-card-placeholder">
                    <div className="check-row">
                      <div className="min-w-0">
                        <h4>Loading dependency state</h4>
                        <p>The desktop app is resolving Node, Shopify CLI, Playwright, and workspace readiness.</p>
                      </div>
                      <span className="status-chip">Loading</span>
                    </div>
                  </article>
                )}
              </>
            ) : null}

            {controller.activeStep === "agent" ? (
              <>
                <AgentStep
                  activeProvider={controller.activeProvider}
                  busy={controller.busy}
                  checks={controller.agentChecks}
                  onSelectProvider={controller.setActiveProvider}
                  onConfigureClaude={() => void controller.runAction("claude", () => window.desktopApi.configureClaude())}
                  onConfigureCodex={() => void controller.runAction("codex", () => window.desktopApi.configureCodex())}
                  onStartClaudeAuth={() => void controller.runAction("claude-auth", () => window.desktopApi.startClaudeAuth())}
                  onStartCodexAuth={() => void controller.runAction("codex-auth", () => window.desktopApi.startCodexAuth())}
                  onStartClaudeFigmaAuth={() => void controller.runAction("claude-figma-auth", () => window.desktopApi.startFigmaAuth("claude"))}
                  onStartCodexFigmaAuth={() => void controller.runAction("codex-figma-auth", () => window.desktopApi.startFigmaAuth("codex"))}
                />
              </>
            ) : null}

            {controller.activeStep === "connections" ? (
              <ConnectionsStep
                busy={controller.busy}
                designSlugDraft={controller.designSlugDraft}
                designSlugRef={controller.designSlugRef}
                errors={controller.fieldErrors}
                figmaTokenInput={controller.figmaTokenInput}
                figmaTokenStatus={controller.figmaTokenStatus}
                figmaUrl={controller.figmaUrl}
                figmaUrlRef={controller.figmaUrlRef}
                storefrontPasswordInput={controller.storefrontPasswordInput}
                storefrontPasswordStatus={controller.storefrontPasswordStatus}
                storeDomain={controller.storeDomain}
                storeDomainRef={controller.storeDomainRef}
                onChangeDesignSlugDraft={controller.setDesignSlugDraft}
                onChangeFigmaTokenInput={controller.setFigmaTokenInput}
                onChangeFigmaUrl={controller.setFigmaUrl}
                onChangeStoreDomain={controller.setStoreDomain}
                onChangeStorefrontPasswordInput={controller.setStorefrontPasswordInput}
                onClearFigmaToken={() => void controller.runAction("clear-figma-token", () => window.desktopApi.deleteSecret("figmaToken"))}
                onClearStorefrontPassword={() => void controller.runAction("clear-storefront-password", () => window.desktopApi.deleteSecret("shopifyStorefrontPassword"))}
                onSaveConnections={() => void controller.saveConnections()}
                onSaveFigmaToken={() =>
                  void controller.runAction(
                    "save-figma-token",
                    () => window.desktopApi.saveSecret("figmaToken", controller.figmaTokenInput),
                    { clearSecret: "figmaToken" }
                  )
                }
                onSaveStorefrontPassword={() =>
                  void controller.runAction(
                    "save-storefront-password",
                    () => window.desktopApi.saveSecret("shopifyStorefrontPassword", controller.storefrontPasswordInput),
                    { clearSecret: "shopifyStorefrontPassword" }
                  )
                }
                onStartShopifyAuth={() => void controller.startShopifyAuth()}
                shopifyAuthCheck={controller.shopifyAuthCheck}
              />
            ) : null}

            {controller.activeStep === "build" ? (
              <BuildStep
                buildDraft={controller.buildDraft}
                buildState={controller.buildState}
                busy={controller.busy}
                launchContext={controller.terminalLaunchContext}
                launchNonce={controller.terminalLaunchNonce}
                onCancelBuild={() => void controller.cancelBuild()}
                onLaunchTerminal={() => void controller.launchClaude()}
                onTerminalExit={controller.handleTerminalExit}
                onTerminalStarted={controller.handleTerminalStarted}
                onStartBuild={() => void controller.startBuild()}
                shouldLaunchTerminalSession={!controller.terminalReady}
                terminalReady={controller.terminalReady}
                terminalVisible={controller.terminalVisible}
              />
            ) : null}
          </section>

          {showRuntimeSummary ? (
            <div className="side-column">
              <RuntimeSummary
                checks={controller.snapshot?.checks ?? []}
                secretStatuses={controller.secretStatuses}
                onBackupConfigs={() => void controller.runAction("backup", () => window.desktopApi.backupConfigs())}
                onRefreshChecks={() => void controller.refreshAll()}
                refreshDisabled={controller.busy || controller.checksRefreshing}
                showSavedExtras={showSavedExtras}
                showWorkspaceTools={controller.activeStep === "build"}
                title={currentStep?.title ? `${currentStep.title} blockers` : "Needs attention"}
                workspaceToolsDisabled={controller.busy}
              />
            </div>
          ) : null}
        </section>
      </main>
    </div>
  );
}

export default App;
