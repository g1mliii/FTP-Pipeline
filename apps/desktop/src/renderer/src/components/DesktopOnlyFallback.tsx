export function DesktopOnlyFallback() {
  return (
    <main className="desktop-only-shell">
      <section className="desktop-only-card">
        <p className="eyebrow">Desktop app required</p>
        <h1>Open this UI in Electron</h1>
        <p>This wrapper uses the Electron bridge for setup, secrets, and the embedded terminal. Open the desktop app to continue.</p>
        <div className="desktop-only-actions">
          <code>npm run desktop:dev</code>
          <span>or launch the packaged installer</span>
        </div>
      </section>
    </main>
  );
}
