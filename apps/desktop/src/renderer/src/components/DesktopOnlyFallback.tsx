export function DesktopOnlyFallback() {
  return (
    <main className="desktop-only-shell">
      <section className="desktop-only-card">
        <p className="eyebrow">Desktop app required</p>
        <h1>Open this UI in Electron</h1>
        <p>
          This wrapper depends on the Electron preload bridge for Claude, Shopify, Figma, keytar, and the embedded
          terminal. The browser-only preview path has been removed.
        </p>
        <div className="desktop-only-actions">
          <code>npm run desktop:dev</code>
          <span>or launch the packaged installer</span>
        </div>
      </section>
    </main>
  );
}
