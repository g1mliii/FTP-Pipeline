# Current Tasks

This file tracks active work using the template from `AGENT.md`.

---

## Working Notes

**Current Context**:

- App is packaged and released for both macOS and Windows (v0.1.0).
- Windows release is unsigned; SmartScreen warning is expected and documented.
- Auto-update is wired via `electron-updater` on both platforms using GitHub Releases.

**Key Constraints**:

- Desktop wrapper only — do not modify generated Shopify storefront output.
- Dark-only UI; follow design principles in `CLAUDE.md`.
- Electron main/renderer separation must be preserved; avoid coupling IPC with UI logic.
- Packaging: macOS uses signed + notarized DMG/ZIP; Windows uses unsigned NSIS installer.

**Active Invariants**:

- Release artifacts go to `g1mliii/FTP-Pipeline` GitHub Releases.
- `latest.yml` (Windows) and `latest-mac.yml` (macOS) must be published for auto-update to work.
- `apps/desktop/` is the only workspace; root scripts delegate to it via `--workspace`.

---

## Active Tasks

_No active tasks. Add new tasks using the plan template from `AGENT.md`._

---

## Next Suggested Tasks

_None queued. Capture next work here when it begins._
