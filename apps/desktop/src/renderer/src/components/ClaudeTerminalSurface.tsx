import type { LaunchClaudeContext } from "../../../shared/setup-types";
import { memo, useEffect, useRef, useState } from "react";

interface ClaudeTerminalSurfaceProps {
  active: boolean;
  launchContext?: LaunchClaudeContext;
  launchNonce: number;
  onStarted: () => void;
  onExit: () => void;
  shouldLaunchSession: boolean;
}

function ClaudeTerminalSurfaceComponent({ active, launchContext, launchNonce, onExit, onStarted, shouldLaunchSession }: ClaudeTerminalSurfaceProps) {
  const surfaceRef = useRef<HTMLDivElement | null>(null);
  const launchContextRef = useRef<LaunchClaudeContext | undefined>(launchContext);
  const onExitRef = useRef(onExit);
  const onStartedRef = useRef(onStarted);
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    launchContextRef.current = launchContext;
  }, [launchContext]);

  useEffect(() => {
    onExitRef.current = onExit;
  }, [onExit]);

  useEffect(() => {
    onStartedRef.current = onStarted;
  }, [onStarted]);

  useEffect(() => {
    if (!active || !surfaceRef.current) {
      return;
    }

    let disposed = false;
    let terminal: any = null;
    let fitAddon: any = null;
    let observer: ResizeObserver | null = null;
    let offData: () => void = () => {};
    let offSystem: () => void = () => {};
    let offExit: () => void = () => {};
    let resizeFrame: number | null = null;
    let lastTerminalSize: { cols: number; rows: number } | null = null;
    let terminalTextarea: HTMLTextAreaElement | null = null;
    let pasteTarget: HTMLElement | null = null;

    const copySelection = async () => {
      const selectedText = terminal?.hasSelection?.() ? terminal.getSelection?.() ?? "" : "";
      if (!selectedText || disposed) {
        return false;
      }

      await window.desktopApi.writeClipboardText(selectedText);
      return true;
    };

    const flushResize = () => {
      fitAddon?.fit();
      if (!terminal) {
        return;
      }

      const nextSize = { cols: terminal.cols, rows: terminal.rows };
      if (lastTerminalSize && lastTerminalSize.cols === nextSize.cols && lastTerminalSize.rows === nextSize.rows) {
        return;
      }

      lastTerminalSize = nextSize;
      void window.desktopApi.resizeTerminal(nextSize.cols, nextSize.rows);
    };

    const scheduleResize = () => {
      if (resizeFrame !== null || disposed) {
        return;
      }

      resizeFrame = window.requestAnimationFrame(() => {
        resizeFrame = null;
        if (!disposed) {
          flushResize();
        }
      });
    };

    const pasteText = async (text: string) => {
      if (!text || disposed) {
        return;
      }

      terminal?.focus();
      await window.desktopApi.writeTerminal(text);
    };

    const pasteFromClipboard = async () => {
      const text = await window.desktopApi.readClipboardText();
      await pasteText(text);
    };

    const handlePaste = (event: ClipboardEvent) => {
      event.preventDefault();
      const text = event.clipboardData?.getData("text") ?? "";
      void pasteText(text);
    };

    const handleContextMenu = (event: MouseEvent) => {
      event.preventDefault();
      void (async () => {
        const copied = await copySelection();
        if (!copied) {
          await pasteFromClipboard();
        }
      })();
    };

    const handleKeyDown = (event: KeyboardEvent) => {
      const isCopyShortcut = (event.ctrlKey || event.metaKey) && event.key.toLowerCase() === "c";
      const isPasteShortcut =
        ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === "v") || (event.shiftKey && event.key === "Insert");

      if (isCopyShortcut) {
        if (!terminal?.hasSelection?.()) {
          return;
        }

        event.preventDefault();
        void copySelection();
        return;
      }

      if (!isPasteShortcut) {
        return;
      }

      event.preventDefault();
      void pasteFromClipboard();
    };

    const setup = async () => {
      try {
        setLoading(true);
        setErrorMessage(null);
        const [{ Terminal }, { FitAddon }] = await Promise.all([
          import("@xterm/xterm"),
          import("@xterm/addon-fit"),
          import("@xterm/xterm/css/xterm.css")
        ]);

        if (disposed || !surfaceRef.current) {
          return;
        }

        const themeStyles = getComputedStyle(document.documentElement);
        const background = themeStyles.getPropertyValue("--surface-muted").trim() || "#181512";
        const foreground = themeStyles.getPropertyValue("--text").trim() || "#F4EDE3";
        const accent = themeStyles.getPropertyValue("--accent").trim() || "#C88360";
        const selection = "rgba(200, 131, 96, 0.24)";
        const fontMono = themeStyles.getPropertyValue("--font-mono").trim() || "ui-monospace, SFMono-Regular, Consolas, monospace";

        terminal = new Terminal({
          theme: {
            background,
            foreground,
            cursor: accent,
            selectionBackground: selection
          },
          allowTransparency: false,
          customGlyphs: false,
          drawBoldTextInBrightColors: false,
          fontFamily: fontMono,
          fontSize: 14,
          letterSpacing: 0,
          lineHeight: 1.15,
          cursorBlink: true,
          smoothScrollDuration: 0,
          scrollback: 3000
        });
        fitAddon = new FitAddon();
        terminal.loadAddon(fitAddon);
        terminal.open(surfaceRef.current);
        pasteTarget = surfaceRef.current;
        terminalTextarea = surfaceRef.current.querySelector("textarea");
        pasteTarget.addEventListener("paste", handlePaste);
        pasteTarget.addEventListener("contextmenu", handleContextMenu);
        terminalTextarea?.addEventListener("keydown", handleKeyDown);
        scheduleResize();
        terminal.focus();
        terminal.onData((data: string) => {
          void window.desktopApi.writeTerminal(data);
        });

        offData = window.desktopApi.onTerminalData((data: string) => terminal?.write(data));
        offSystem = window.desktopApi.onTerminalSystem((data: string) => terminal?.writeln(`\r\n[system] ${data}\r\n`));
        offExit = window.desktopApi.onTerminalExit(() => {
          terminal?.writeln("\r\n[system] Claude session exited.\r\n");
          onExitRef.current();
        });

        observer = new ResizeObserver(() => {
          scheduleResize();
        });
        observer.observe(surfaceRef.current);
        if (shouldLaunchSession) {
          terminal.writeln("[system] Starting Claude session...");
          await window.desktopApi.launchClaudeTerminal(launchContextRef.current);
        } else {
          terminal.writeln("[system] Reattached to the running Claude session.");
        }
        onStartedRef.current();
      } catch (error) {
        const message = error instanceof Error ? error.message : "Claude terminal failed to start.";
        if (!disposed) {
          setErrorMessage(message);
        }
        terminal?.writeln(`\r\n[system] ${message}\r\n`);
      } finally {
        if (!disposed) {
          setLoading(false);
        }
      }
    };

    void setup();

    return () => {
      disposed = true;
      if (resizeFrame !== null) {
        window.cancelAnimationFrame(resizeFrame);
      }
      offData();
      offSystem();
      offExit();
      pasteTarget?.removeEventListener("paste", handlePaste);
      pasteTarget?.removeEventListener("contextmenu", handleContextMenu);
      terminalTextarea?.removeEventListener("keydown", handleKeyDown);
      observer?.disconnect();
      terminal?.dispose();
    };
  }, [active, launchNonce, shouldLaunchSession]);

  if (!active) {
    return (
      <div className="terminal-placeholder">
        <p>Launch the embedded Claude terminal when you need an interactive session. The xterm surface loads on demand to keep the initial UI lighter.</p>
      </div>
    );
  }

  return (
    <>
      {loading ? <p className="hint-copy">Loading terminal…</p> : null}
      {errorMessage ? <p className="field-error">{errorMessage}</p> : null}
      <div className="terminal-shell terminal-surface-large">
        <div ref={surfaceRef} className="terminal-surface" />
      </div>
    </>
  );
}

export const ClaudeTerminalSurface = memo(ClaudeTerminalSurfaceComponent);
