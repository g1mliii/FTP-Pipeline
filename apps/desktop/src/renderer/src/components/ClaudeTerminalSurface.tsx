import { memo, useEffect, useEffectEvent, useRef, useState } from "react";

interface ClaudeTerminalSurfaceProps {
  active: boolean;
  storeDomain: string;
  onStarted: () => void;
  onExit: () => void;
}

function ClaudeTerminalSurfaceComponent({ active, onExit, onStarted, storeDomain }: ClaudeTerminalSurfaceProps) {
  const surfaceRef = useRef<HTMLDivElement | null>(null);
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const emitExit = useEffectEvent(onExit);
  const emitStarted = useEffectEvent(onStarted);

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

        terminal = new Terminal({
          theme: {
            background: "#191714",
            foreground: "#FBF7F0",
            cursor: "#D97757",
            selectionBackground: "#4E3A33"
          },
          fontFamily: "ui-monospace, SFMono-Regular, Consolas, monospace",
          fontSize: 14,
          cursorBlink: true,
          scrollback: 3000
        });
        fitAddon = new FitAddon();
        terminal.loadAddon(fitAddon);
        terminal.open(surfaceRef.current);
        scheduleResize();
        terminal.focus();
        terminal.onData((data: string) => {
          void window.desktopApi.writeTerminal(data);
        });

        offData = window.desktopApi.onTerminalData((data: string) => terminal?.write(data));
        offSystem = window.desktopApi.onTerminalSystem((data: string) => terminal?.writeln(`\r\n[system] ${data}\r\n`));
        offExit = window.desktopApi.onTerminalExit(() => {
          terminal?.writeln("\r\n[system] Claude session exited.\r\n");
          emitExit();
        });

        observer = new ResizeObserver(() => {
          scheduleResize();
        });
        observer.observe(surfaceRef.current);
        terminal.writeln("[system] Starting Claude session...");
        await window.desktopApi.launchClaudeTerminal({ storeDomain });
        emitStarted();
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
      observer?.disconnect();
      terminal?.dispose();
    };
  }, [active, storeDomain]);

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
      <div ref={surfaceRef} className="terminal-surface terminal-surface-large" />
    </>
  );
}

export const ClaudeTerminalSurface = memo(ClaudeTerminalSurfaceComponent);
