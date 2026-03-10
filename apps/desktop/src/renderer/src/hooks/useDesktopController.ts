import { startTransition, useDeferredValue, useEffect, useMemo, useRef, useState } from "react";
import type { ActionResult, BackupReport, BuildDraft, BuildRunState, SecretStatus, SetupSnapshot, SetupStepId } from "../../../shared/setup-types";
import { isValidDesignSlug, isValidFigmaUrl, isValidStoreDomain, normalizeStoreDomain, sanitizeDesignSlug, suggestDesignSlug } from "../../../shared/build-utils";
import { appendBuildLogChunk, emptyBuildLogBuffer } from "../lib/log-buffer";
import { connectionDependencyIds, stepChecks, steps } from "../lib/steps";

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
      errors.designSlugDraft = "Enter a design slug before continuing.";
    } else if (!isValidDesignSlug(normalizedSlug)) {
      errors.designSlugDraft = "Use lowercase letters, numbers, and dashes only.";
    }
  }

  return errors;
};

export function useDesktopController() {
  const [snapshot, setSnapshot] = useState<SetupSnapshot | null>(null);
  const [buildDraft, setBuildDraft] = useState<BuildDraft | null>(null);
  const [buildState, setBuildState] = useState<BuildRunState>({ status: "idle", command: "" });
  const [activeStep, setActiveStep] = useState<SetupStepId>("dependencies");
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
  const [buildLogBuffer, setBuildLogBuffer] = useState(emptyBuildLogBuffer);
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
  const connectionChecks = useMemo(
    () =>
      snapshot?.checks.filter(
        (item) =>
          connectionDependencyIds.includes(item.id) &&
          item.id !== "shopifyAuth" &&
          item.id !== "claudeAuth" &&
          item.id !== "claudeFigma" &&
          item.id !== "codexFigmaMcp"
      ) ?? [],
    [snapshot?.checks]
  );
  const shopifyAuthCheck = useMemo(() => snapshot?.checks.find((item) => item.id === "shopifyAuth"), [snapshot?.checks]);
  const claudeAuthCheck = useMemo(() => snapshot?.checks.find((item) => item.id === "claudeAuth"), [snapshot?.checks]);
  const claudeFigmaCheck = useMemo(() => snapshot?.checks.find((item) => item.id === "claudeFigma"), [snapshot?.checks]);
  const codexFigmaCheck = useMemo(() => snapshot?.checks.find((item) => item.id === "codexFigmaMcp"), [snapshot?.checks]);
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
    await runAction("shopify-auth", () => window.desktopApi.startShopifyAuth(storeDomain));
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
      const saveResult = await window.desktopApi.saveConnectionState({
        storeDomain,
        figmaUrl,
        designSlugDraft: normalizedSlug
      });
      setResult(saveResult);
      if (!saveResult.ok) {
        const nextDraft = await window.desktopApi.getBuildDraft();
        syncState(saveResult.snapshot, nextDraft, await window.desktopApi.getBuildStatus());
        return;
      }

      const nextDraft = await window.desktopApi.getBuildDraft();
      const launchState = await window.desktopApi.launchBuild({
        storeDomain,
        figmaUrl,
        designSlug: normalizedSlug
      });
      syncState(saveResult.snapshot, nextDraft, launchState, { syncInputs: true });
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
    const nextState = await window.desktopApi.cancelBuild();
    if (nextState) {
      startTransition(() => setBuildState(nextState));
    }
  };

  const launchClaude = async () => {
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
            return stepItems.length === 0 || stepItems.every((item) => item.status === "ready");
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
        const [bootstrapSnapshot, nextDraft, nextBuildState] = await Promise.all([
          window.desktopApi.getBootstrapState(),
          window.desktopApi.getBuildDraft(),
          window.desktopApi.getBuildStatus()
        ]);

        if (!cancelled) {
          syncState(bootstrapSnapshot, nextDraft, nextBuildState, { syncInputs: true });
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
        .some((item) => item.status !== "ready")
    );
    setActiveStep(firstIncomplete?.id ?? "build");
    autoStepInitializedRef.current = true;
  }, [snapshot]);

  useEffect(() => {
    const offBuildOutput = window.desktopApi.onBuildOutput((data) => {
      startTransition(() => {
        setBuildLogBuffer((current) => appendBuildLogChunk(current, data));
      });
    });
    const offBuildStatus = window.desktopApi.onBuildStatus((nextState) => {
      startTransition(() => setBuildState(nextState));
    });

    return () => {
      offBuildOutput();
      offBuildStatus();
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
    buildDraft,
    buildState,
    busy: Boolean(busy),
    busyLabel: busy,
    checksRefreshing,
    cancelBuild,
    completedSteps,
    connectionChecks,
    shopifyAuthCheck,
    claudeAuthCheck,
    claudeFigmaCheck,
    codexFigmaCheck,
    deferredBuildLogSegments,
    designSlugDraft,
    designSlugRef,
    fieldErrors,
    figmaTokenInput,
    figmaTokenStatus,
    figmaUrl,
    figmaUrlRef,
    launchClaude,
    refreshAll,
    result,
    resultIsError,
    resultMessage,
    runAction,
    saveConnections,
    secretStatuses,
    setActiveStep,
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
    handleTerminalExit: () => {
      setTerminalReady(false);
      setTerminalVisible(false);
    },
    handleTerminalStarted: () => setTerminalReady(true)
  };
}
