# Lessons Learned

This file captures mistakes, corrections, and insights from development work.

**Format**:

- **Date**: When the lesson was recorded
- **Failure Mode**: What went wrong
- **Detection Signal**: How it was caught
- **Prevention Rule**: How to avoid it next time

---

## Entries

### 2026-03-15 — Stale artifacts uploaded to GitHub release

- **Failure Mode**: Windows publish script globbed all `.exe` files in `dist/`, picking up a stale artifact from a previous build with a different naming convention (spaces → GitHub converts to dots). Two Windows installers appeared in the release.
- **Detection Signal**: Noticed duplicate `Figma.Shopify.AutoBuild-*` and `Figma-Shopify-AutoBuild-*` assets in the release page.
- **Prevention Rule**: Publish scripts now match only the exact artifact filename derived from the `artifactName` pattern in `package.json`. Always verify release asset list after publishing.
