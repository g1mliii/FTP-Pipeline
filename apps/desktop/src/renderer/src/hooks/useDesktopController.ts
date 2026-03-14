import { startTransition, useDeferredValue, useEffect, useMemo, useRef, useState } from "react";
import type { ActionResult, BackupReport, BuildDraft, BuildRunState, LaunchClaudeContext, ProviderId, SecretStatus, SetupSnapshot, SetupStepId, UpdateStatus } from "../../../shared/setup-types";
import { buildClaudePrompt, isValidDesignSlug, isValidFigmaUrl, isValidStoreDomain, normalizeStoreDomain, sanitizeDesignSlug, suggestDesignSlug } from "../../../shared/build-utils";
import { appendBuildLogChunk, emptyBuildLogBuffer } from "../lib/log-buffer";
import { stepChecks, steps } from "../lib/steps";

export interface DesktopFieldErrors {
  storeDomain?: string;
  figmaUrl?: string;
  designSlugDraft?: string;
}

const actionMessage = (result: ActionResult | BackupReport | null) => {
  if (!result) {
    return null;
  }

  if ("entries" in result) {
    return result.entries.length > 0 ? `Backed up ${result.entries.length} config targets.` : "No config files needed backup.";
  }

  return result.message;
};

const validateConnectionFields = (values: { storeDomain: string; figmaUrl: string; designSlugDraft: string }, mode: "save" | "shopifyAuth" | "build"): DesktopFieldErrors => {
  const errors: DesktopFieldErrors = {};
  const normalizedStore = normalizeStoreDomain(values.storeDomain);
  const normalizedSlug = sanitizeDesignSlug(values.designSlugDraft);

  if (mode !== "save" || values.storeDomain.trim()) {
    if (!normalizedStore) {
      errors.storeDomain = mode === "shopifyAuth" || mode === "build" ? "Enter the Shopify store domain before continuing." : undefined;
    } else if (!isValidStoreDomain(normalizedStore)) {
      errors.storeDomain = "Use a valid *.myshopify.com hostname.";
    }
  }

  if (mode === "build" || values.figmaUrl.trim()) {
    if (!values.figmaUrl.trim()) {
      errors.figmaUrl = "Enter the Figma file URL before continuing.";
    } else if (!isValidFigmaUrl(values.figmaUrl)) {
      errors.figmaUrl = "Use a Figma design or file URL.";
    }
  }

  if (mode === "build" || values.designSlugDraft.trim()) {
    if (!normalizedSlug) {
      errors.designSlugDraft = "Enter a project name before continuing.";
    } else if (!isValidDesignSlug(normalizedSlug)) {
      errors.designSlugDraft = "Use letters, numbers, and dashes only.";
    }
  }

  return errors;
};

export function useDesktopController() {
  const [snapshot, setSnapshot] = useState<SetupSnapshot | null>(null);
  const [buildDraft, setBuildDraft] = useState<BuildDraft | null>(null);
  const [buildState, setBuildState] = useState<BuildRunState>({ status: "idle", command: "" });
  const [activeStep, setActiveStep] = useState<SetupStepId>("dependencies");
  const [activeProvider, setActiveProvider] = useState<ProviderId>("claude");
  const [storeDomain, setStoreDomain] = useState("");
  const [figmaUrl, setFigmaUrl] = useState("");
  const [designSlugDraft, setDesignSlugDraft] = useState("");
  const [figmaTokenInput, setFigmaTokenInput] = useState("");
  const [storefrontPasswordInput, setStorefrontPasswordInput] = useState("");
  const [fieldErrors, setFieldErrors] = useState<DesktopFieldErrors>({});
  const [busy, setBusy] = useState<string | null>(null);
  const [checksRefreshing, setChecksRefreshing] = useState(false);
  const [result, setResult] = useState<ActionResult | BackupReport | null>(null);
  const [terminalReady, setTerminalReady] = useState(false);
  const [terminalVisible, setTerminalVisible] = useState(false);
  const [terminalLaunchContext, setTerminalLaunchContext] = useState<LaunchClaudeContext | undefined>(undefined);
  const [terminalLaunchNonce, setTerminalLaunchNonce] = useState(0);
  const [pendingTerminalCommand, setPendingTerminalCommand] = useState<string | null>(null);
  const [buildLogBuffer, setBuildLogBuffer] = useState(emptyBuildLogBuffer);
  const [updateStatus, setUpdateStatus] = useState<UpdateStatus>({ state: "idle" });
  const [updateCheckBusy, setUpdateCheckBusy] = useState(false);
  const storeDomainRef = useRef<HTMLInputElement | null>(null);
  const figmaUrlRef = useRef<HTMLInputElement | null>(null);
  const designSlugRef = useRef<HTMLInputElement | null>(null);
  const autoStepInitializedRef = useRef(false);

  const deferredBuildLogSegments = useDeferredValue(buildLogBuffer.segments);
  const secretStatuses = useMemo(() => snapshot?.secretStatuses ?? [], [snapshot?.secretStatuses]);
  const figmaTokenStatus = useMemo(() => secretStatuses.find((item) => item.id === "figmaToken"), [secretStatuses]);
  const storefrontPasswordStatus = useMemo(
    () => secretStatuses.find((item) => item.id === "shopifyStorefrontPassword"),
    [secretStatuses]
  );
  const shopifyAuthCheck = useMemo(() => snapshot?.checks.find((item) => item.id === "shopifyAuth"), [snapshot?.checks]);
  const claudeAuthCheck = useMemo(() => snapshot?.checks.find((item) => item.id === "claudeAuth"), [snapshot?.checks]);
  const claudeFigmaCheck = useMemo(() => snapshot?.checks.find((item) => item.id === "claudeFigma"), [snapshot?.checks]);
  const codexAuthCheck = useMemo(() => snapshot?.checks.find((item) => item.id === "codexAuth"), [snapshot?.checks]);
  const codexFigmaCheck = useMemo(() => snapshot?.checks.find((item) => item.id === "codexFigmaMcp"), [snapshot?.checks]);
  const agentChecks = useMemo(
    () =>
      snapshot?.checks.filter((item) =>
        activeProvider === "claude"
          ? ["claudeCli", "claudeAuth", "claudeSkill", "claudeFigma", "claudePlaywright"].includes(item.id)
          : ["codexCli", "codexAuth", "codexFigmaMcp", "codexPlaywrightMcp"].includes(item.id)
      ) ?? [],
    [activeProvider, snapshot?.checks]
  );
  const resultMessage = actionMessage(result);
  const resultIsError = Boolean(result && "ok" in result && !result.ok);
  const persistedDesignSlug = useMemo(
    () => sanitizeDesignSlug(buildDraft?.designSlug ?? snapshot?.inputs.designSlugDraft ?? ""),
    [buildDraft?.designSlug, snapshot?.inputs.designSlugDraft]
  );
  const formIsDirty = snapshot
    ? snapshot.inputs.storeDomain !== storeDomain ||
      snapshot.inputs.figmaUrl !== figmaUrl ||
      persistedDesignSlug !== sanitizeDesignSlug(designSlugDraft) ||
      figmaTokenInput.length > 0 ||
      storefrontPasswordInput.length > 0
    : figmaTokenInput.length > 0 || storefrontPasswordInput.length > 0;

  const syncState = (
    nextSnapshot: SetupSnapshot,
    nextDraft: BuildDraft | null,
    nextBuildState?: BuildRunState,
    options?: { syncInputs?: boolean }
  ) => {
    startTransition(() => {
      setSnapshot(nextSnapshot);
      setBuildDraft(nextDraft);
      if (options?.syncInputs ?? true) {
        setStoreDomain(nextSnapshot.inputs.storeDomain || nextDraft?.storeDomain || "");
        setFigmaUrl(nextSnapshot.inputs.figmaUrl || nextDraft?.figmaUrl || "");
        setDesignSlugDraft(nextDraft?.designSlug || nextSnapshot.inputs.designSlugDraft || "");
      }
      if (nextBuildState) {
        setBuildState(nextBuildState);
      }
    });
  };

  const refreshAll = async (nextInputs?: Partial<{ storeDomain: string; figmaUrl: string; designSlugDraft: string }>) => {
    setChecksRefreshing(true);
    try {
      const [nextSnapshot, nextDraft, nextBuildState] = await Promise.all([
        window.desktopApi.runChecks(nextInputs),
        window.desktopApi.getBuildDraft(),
        window.desktopApi.getBuildStatus()
      ]);
      syncState(nextSnapshot, nextDraft, nextBuildState, { syncInputs: !formIsDirty });
    } finally {
      setChecksRefreshing(false);
    }
  };

  const clearFieldError = (field: keyof DesktopFieldErrors) => {
    setFieldErrors((current) => (current[field] ? { ...current, [field]: undefined } : current));
  };

  const focusFirstError = (errors: DesktopFieldErrors) => {
    if (errors.storeDomain) {
      storeDomainRef.current?.focus();
      return;
    }
    if (errors.figmaUrl) {
      figmaUrlRef.current?.focus();
      return;
    }
    if (errors.designSlugDraft) {
      designSlugRef.current?.focus();
    }
  };

  const updateDerivedSlug = (nextStoreDomain: string, nextFigmaUrl: string, currentSlug: string) => {
    const currentSuggested = suggestDesignSlug(figmaUrl, storeDomain);
    const nextSuggested = suggestDesignSlug(nextFigmaUrl, nextStoreDomain);
    if (!currentSlug || currentSlug === currentSuggested) {
      return nextSuggested;
    }
    return currentSlug;
  };

  const createTerminalContext = (overrides?: Partial<LaunchClaudeContext>): LaunchClaudeContext => ({
    storeDomain: overrides?.storeDomain ?? storeDomain,
    designSlug: overrides?.designSlug ?? sanitizeDesignSlug(designSlugDraft),
    useStoredBuildSecrets: overrides?.useStoredBuildSecrets ?? true
  });

  const runAction = async <T extends ActionResult | BackupReport>(
    label: string,
    action: () => Promise<T>,
    options?: { clearSecret?: "figmaToken" | "shopifyStorefrontPassword"; syncInputs?: boolean }
  ) => {
    setBusy(label);
    setResult(null);
    try {
      const nextResult = await action();
      setResult(nextResult);
      if (options?.clearSecret === "figmaToken" && !("entries" in nextResult) && nextResult.ok) {
        setFigmaTokenInput("");
      }
      if (options?.clearSecret === "shopifyStorefrontPassword" && !("entries" in nextResult) && nextResult.ok) {
        setStorefrontPasswordInput("");
      }
      if ("snapshot" in nextResult) {
        const nextDraft = await window.desktopApi.getBuildDraft();
        const nextBuildState = await window.desktopApi.getBuildStatus();
        syncState(nextResult.snapshot, nextDraft, nextBuildState, { syncInputs: options?.syncInputs ?? false });
      } else {
        await refreshAll();
      }
    } finally {
      setBusy(null);
    }
  };

  const saveConnections = async () => {
    const errors = validateConnectionFields({ storeDomain, figmaUrl, designSlugDraft }, "save");
    setFieldErrors(errors);
    if (Object.values(errors).some(Boolean)) {
      focusFirstError(errors);
      return;
    }

    setFieldErrors({});
    await runAction("save-connections", () =>
      window.desktopApi.saveConnectionState({
        storeDomain,
        figmaUrl,
        designSlugDraft: sanitizeDesignSlug(designSlugDraft)
      }),
      { syncInputs: true }
    );
  };

  const startShopifyAuth = async () => {
    const errors = validateConnectionFields({ storeDomain, figmaUrl, designSlugDraft }, "shopifyAuth");
    setFieldErrors(errors);
    if (Object.values(errors).some(Boolean)) {
      focusFirstError(errors);
      return;
    }

    setFieldErrors({});
    await runAction(shopifyAuthCheck?.status === "ready" ? "checking Shopify session" : "starting Shopify auth", () => window.desktopApi.startShopifyAuth(storeDomain));
  };

  const startBuild = async () => {
    const errors = validateConnectionFields({ storeDomain, figmaUrl, designSlugDraft }, "build");
    setFieldErrors(errors);
    if (Object.values(errors).some(Boolean)) {
      focusFirstError(errors);
      return;
    }

    setFieldErrors({});
    setBusy("build");
    setResult(null);
    setBuildLogBuffer(emptyBuildLogBuffer());
    try {
      const normalizedSlug = sanitizeDesignSlug(designSlugDraft);
      const normalizedFigmaUrl = figmaUrl.trim();
      const normalizedStoreDomain = normalizeStoreDomain(storeDomain);
      const saveResult = await window.desktopApi.saveConnectionState({
        storeDomain: normalizedStoreDomain,
        figmaUrl: normalizedFigmaUrl,
        designSlugDraft: normalizedSlug
      });
      setResult(saveResult);
      if (!saveResult.ok) {
        const nextDraft = await window.desktopApi.getBuildDraft();
        syncState(saveResult.snapshot, nextDraft, await window.desktopApi.getBuildStatus());
        return;
      }

      const nextDraft = await window.desktopApi.getBuildDraft();
      const prompt = buildClaudePrompt({
        figmaUrl: normalizedFigmaUrl,
        storeDomain: normalizedStoreDomain,
        designSlug: normalizedSlug
      });
      syncState(
        saveResult.snapshot,
        nextDraft,
        {
          status: "running",
          command: "Claude terminal build session",
          startedAt: new Date().toISOString(),
          summary: `Build prompt sent to the Claude terminal for ${normalizedSlug}.`
        },
        { syncInputs: true }
      );
      setTerminalLaunchContext(
        createTerminalContext({
          storeDomain: normalizedStoreDomain,
          designSlug: normalizedSlug,
          useStoredBuildSecrets: true
        })
      );
      setPendingTerminalCommand(`${prompt}\r`);
      setTerminalReady(false);
      setTerminalVisible(true);
      setTerminalLaunchNonce((current) => current + 1);
      setActiveStep("build");
    } catch (error) {
      setBuildState({
        status: "failed",
        command: "",
        finishedAt: new Date().toISOString(),
        summary: error instanceof Error ? error.message : "Build launch failed."
      });
    } finally {
      setBusy(null);
    }
  };

  const cancelBuild = async () => {
    if (buildState.status === "running") {
      await window.desktopApi.writeTerminal("\u0003");
      startTransition(() =>
        setBuildState((current) => ({
          ...current,
          status: "cancelled",
          finishedAt: new Date().toISOString(),
          summary: "Build interrupted in the Claude terminal."
        }))
      );
    }

    const nextState = await window.desktopApi.cancelBuild();
    if (nextState && nextState.status !== "idle") {
      startTransition(() => setBuildState(nextState));
    }
  };

  const checkForUpdates = async () => {
    setUpdateCheckBusy(true);
    try {
      const nextStatus = await window.desktopApi.checkForUpdates();
      setUpdateStatus(nextStatus);
    } finally {
      setUpdateCheckBusy(false);
    }
  };

  const toggleClaudeTerminal = async () => {
    if (terminalVisible) {
      setTerminalReady(false);
      setTerminalVisible(false);
      setPendingTerminalCommand(null);
      void window.desktopApi.closeClaudeTerminal();
      return;
    }

    setTerminalLaunchContext(createTerminalContext());
    setTerminalLaunchNonce((current) => current + 1);
    setTerminalVisible(true);
  };

  const completedSteps = useMemo(
    () => {
      if (!snapshot) {
        return new Set<SetupStepId>();
      }

      return new Set(
        steps
          .filter((step) => {
            const stepItems = snapshot.checks.filter((item) => stepChecks[step.id].includes(item.id));
            const requiredItems = stepItems.filter((item) => item.required);
            return requiredItems.length === 0 || requiredItems.every((item) => item.status === "ready");
          })
          .map((step) => step.id)
      );
    },
    [snapshot?.checks]
  );

  useEffect(() => {
    let cancelled = false;

    const bootstrap = async () => {
      try {
        const [bootstrapSnapshot, nextDraft, nextBuildState, nextUpdateStatus] = await Promise.all([
          window.desktopApi.getBootstrapState(),
          window.desktopApi.getBuildDraft(),
          window.desktopApi.getBuildStatus(),
          window.desktopApi.getUpdateStatus()
        ]);

        if (!cancelled) {
          syncState(bootstrapSnapshot, nextDraft, nextBuildState, { syncInputs: true });
          setUpdateStatus(nextUpdateStatus);
        }
      } finally {
        if (!cancelled) {
          void refreshAll();
        }
      }
    };

    void bootstrap();

    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (!snapshot) {
      return;
    }

    if (autoStepInitializedRef.current) {
      return;
    }

    const firstIncomplete = steps.find((step) =>
      snapshot.checks
        .filter((item) => stepChecks[step.id].includes(item.id))
        .filter((item) => item.required)
        .some((item) => item.status !== "ready")
    );
    setActiveStep(firstIncomplete?.id ?? "build");
    autoStepInitializedRef.current = true;
  }, [snapshot]);

  useEffect(() => {
    if (!terminalReady || !pendingTerminalCommand) {
      return;
    }

    void window.desktopApi.writeTerminal(pendingTerminalCommand);
    setPendingTerminalCommand(null);
  }, [pendingTerminalCommand, terminalReady]);

  useEffect(() => {
    const offBuildOutput = window.desktopApi.onBuildOutput((data) => {
      startTransition(() => {
        setBuildLogBuffer((current) => appendBuildLogChunk(current, data));
      });
    });
    const offBuildStatus = window.desktopApi.onBuildStatus((nextState) => {
      startTransition(() => setBuildState(nextState));
    });
    const offUpdateStatus = window.desktopApi.onUpdateStatus((nextStatus) => {
      setUpdateStatus(nextStatus);
      if (nextStatus.state !== "checking") {
        setUpdateCheckBusy(false);
      }
    });

    return () => {
      offBuildOutput();
      offBuildStatus();
      offUpdateStatus();
    };
  }, []);

  useEffect(() => {
    if (!formIsDirty) {
      return;
    }

    const handleBeforeUnload = (event: BeforeUnloadEvent) => {
      event.preventDefault();
      event.returnValue = "";
    };

    window.addEventListener("beforeunload", handleBeforeUnload);
    return () => window.removeEventListener("beforeunload", handleBeforeUnload);
  }, [formIsDirty]);

  return {
    activeStep,
    activeProvider,
    agentChecks,
    buildDraft,
    buildState,
    busy: Boolean(busy),
    busyLabel: busy,
    checksRefreshing,
    cancelBuild,
    completedSteps,
    shopifyAuthCheck,
    claudeAuthCheck,
    claudeFigmaCheck,
    codexAuthCheck,
    codexFigmaCheck,
    deferredBuildLogSegments,
    designSlugDraft,
    designSlugRef,
    fieldErrors,
    figmaTokenInput,
    figmaTokenStatus,
    figmaUrl,
    figmaUrlRef,
    launchClaude: toggleClaudeTerminal,
    refreshAll,
    result,
    resultIsError,
    resultMessage,
    clearResult: () => setResult(null),
    runAction,
    saveConnections,
    secretStatuses,
    setActiveStep,
    setActiveProvider,
    setDesignSlugDraft: (value: string) => {
      clearFieldError("designSlugDraft");
      setDesignSlugDraft(value);
    },
    setFigmaTokenInput,
    setFigmaUrl: (value: string) => {
      clearFieldError("figmaUrl");
      setFigmaUrl(value);
      setDesignSlugDraft((current) => updateDerivedSlug(storeDomain, value, current));
    },
    setStoreDomain: (value: string) => {
      clearFieldError("storeDomain");
      setStoreDomain(value);
      setDesignSlugDraft((current) => updateDerivedSlug(value, figmaUrl, current));
    },
    setStorefrontPasswordInput,
    snapshot,
    startBuild,
    startShopifyAuth,
    steps,
    storeDomain,
    storeDomainRef,
    storefrontPasswordInput,
    storefrontPasswordStatus,
    terminalReady,
    terminalVisible,
    terminalLaunchContext,
    terminalLaunchNonce,
    updateCheckBusy,
    updateStatus,
    checkForUpdates,
    handleTerminalExit: () => {
      setTerminalReady(false);
      setTerminalVisible(false);
      setPendingTerminalCommand(null);
      setBuildState((current) =>
        current.status === "running"
          ? {
              ...current,
              status: "cancelled",
              finishedAt: new Date().toISOString(),
              summary: "Claude terminal closed before the build finished."
            }
          : current
      );
    },
    handleTerminalStarted: () => setTerminalReady(true)
  };
}
