import { ConnectionsStep } from "./components/ConnectionsStep";
import { BuildStep } from "./components/BuildStep";
import { CheckCard } from "./components/CheckCard";
import { RuntimeSummary } from "./components/RuntimeSummary";
import { StepSidebar } from "./components/StepSidebar";
import { stepChecks } from "./lib/steps";
import { useDesktopController } from "./hooks/useDesktopController";

function App() {
  const controller = useDesktopController();
  const checksForStep = (stepId: (typeof controller.steps)[number]["id"]) =>
    controller.snapshot?.checks.filter((item) => stepChecks[stepId].includes(item.id)) ?? [];

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
        <header className="hero-panel">
          <div className="min-w-0">
            <p className="eyebrow">Guided setup</p>
            <h2>Persist store context, secure vault values, and launch Claude from the repo root</h2>
            <p className="hero-copy">
              The wrapper keeps store and Figma context across restarts, stores sensitive values in the OS credential
              vault, and runs a non-interactive Claude build without bypassing the existing route-aware repo flow.
            </p>
          </div>
          <div className="hero-actions">
            <button
              className="button button-secondary"
              type="button"
              disabled={controller.busy || controller.checksRefreshing}
              onClick={() => void controller.refreshAll()}
            >
              {controller.checksRefreshing ? "Refreshing…" : "Refresh Checks"}
            </button>
            <button
              className="button"
              type="button"
              disabled={controller.busy}
              onClick={() => void controller.runAction("backup", () => window.desktopApi.backupConfigs())}
            >
              Backup Configs
            </button>
          </div>
        </header>

        {controller.resultMessage ? (
          <div aria-live="polite" className={`banner${controller.resultIsError ? " is-error-banner" : ""}`} role="status">
            {controller.resultMessage}
          </div>
        ) : null}

        <section className="panel-grid">
          <section className="panel">
            <div className="panel-header">
              <div className="min-w-0">
                <p className="eyebrow">Current step</p>
                <h3>{controller.steps.find((item) => item.id === controller.activeStep)?.title}</h3>
              </div>
              {controller.busyLabel ? <span className="busy-pill">{controller.busyLabel}…</span> : null}
              {!controller.busyLabel && controller.checksRefreshing ? <span className="busy-pill">Refreshing checks…</span> : null}
            </div>

            {controller.activeStep === "dependencies" ? (
              <>
                <div className="panel-actions">
                  <button
                    className="button"
                    type="button"
                    disabled={controller.busy}
                    onClick={() => void controller.runAction("dependencies", () => window.desktopApi.installDependencies())}
                  >
                    Install Dependencies
                  </button>
                </div>
                {checksForStep("dependencies").length > 0 ? (
                  <div className="check-list">
                    {checksForStep("dependencies").map((item) => (
                      <CheckCard key={item.id} item={item} />
                    ))}
                  </div>
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

            {controller.activeStep === "claude" ? (
              <>
                <div className="panel-actions">
                  <button
                    className="button"
                    type="button"
                    disabled={controller.busy}
                    onClick={() => void controller.runAction("claude", () => window.desktopApi.configureClaude())}
                  >
                    Configure Claude
                  </button>
                  <button
                    className="button button-secondary"
                    type="button"
                    disabled={controller.busy}
                    onClick={() => void controller.runAction("claude-figma-auth", () => window.desktopApi.startFigmaAuth("claude"))}
                  >
                    Setup Claude Figma
                  </button>
                </div>
                <div className="check-list">
                  {checksForStep("claude").map((item) => (
                    <CheckCard key={item.id} item={item} />
                  ))}
                </div>
              </>
            ) : null}

            {controller.activeStep === "codex" ? (
              <>
                <div className="panel-actions">
                  <button
                    className="button"
                    type="button"
                    disabled={controller.busy}
                    onClick={() => void controller.runAction("codex", () => window.desktopApi.configureCodex())}
                  >
                    Configure Codex
                  </button>
                  <button
                    className="button button-secondary"
                    type="button"
                    disabled={controller.busy}
                    onClick={() => void controller.runAction("codex-figma-auth", () => window.desktopApi.startFigmaAuth("codex"))}
                  >
                    Connect Codex Figma
                  </button>
                </div>
                <div className="check-list">
                  {checksForStep("codex").map((item) => (
                    <CheckCard key={item.id} item={item} />
                  ))}
                </div>
              </>
            ) : null}

            {controller.activeStep === "connections" ? (
              <ConnectionsStep
                busy={controller.busy}
                claudeAuthCheck={controller.claudeAuthCheck}
                claudeFigmaCheck={controller.claudeFigmaCheck}
                connectionChecks={controller.connectionChecks}
                codexFigmaCheck={controller.codexFigmaCheck}
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
                onStartClaudeAuth={() => void controller.runAction("claude-auth", () => window.desktopApi.startConnectionClaudeAuth())}
                onStartClaudeFigmaAuth={() => void controller.runAction("claude-figma-auth", () => window.desktopApi.startFigmaAuth("claude"))}
                onStartCodexFigmaAuth={() => void controller.runAction("codex-figma-auth", () => window.desktopApi.startFigmaAuth("codex"))}
                onStartShopifyAuth={() => void controller.startShopifyAuth()}
                shopifyAuthCheck={controller.shopifyAuthCheck}
              />
            ) : null}

            {controller.activeStep === "build" ? (
              <BuildStep
                buildDraft={controller.buildDraft}
                buildLogSegments={controller.deferredBuildLogSegments}
                buildState={controller.buildState}
                busy={controller.busy}
                designSlugDraft={controller.designSlugDraft}
                designSlugRef={controller.designSlugRef}
                errors={controller.fieldErrors}
                figmaUrl={controller.figmaUrl}
                figmaUrlRef={controller.figmaUrlRef}
                storeDomain={controller.storeDomain}
                storeDomainRef={controller.storeDomainRef}
                onCancelBuild={() => void controller.cancelBuild()}
                onChangeDesignSlugDraft={controller.setDesignSlugDraft}
                onChangeFigmaUrl={controller.setFigmaUrl}
                onChangeStoreDomain={controller.setStoreDomain}
                onLaunchTerminal={() => void controller.launchClaude()}
                onTerminalExit={controller.handleTerminalExit}
                onTerminalStarted={controller.handleTerminalStarted}
                onStartBuild={() => void controller.startBuild()}
                terminalReady={controller.terminalReady}
                terminalVisible={controller.terminalVisible}
              />
            ) : null}
          </section>

          <RuntimeSummary runtimeStates={controller.snapshot?.runtimeStates ?? []} secretStatuses={controller.secretStatuses} />
        </section>
      </main>
    </div>
  );
}

export default App;
