import { cp, mkdir, readdir, stat } from "node:fs/promises";
import path from "node:path";

const ensureParent = async (targetPath: string) => {
  await mkdir(path.dirname(targetPath), { recursive: true, mode: 0o700 });
};

export const backupTargets = async (targets: string[], backupRoot: string) => {
  const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
  const destinationRoot = path.join(backupRoot, timestamp);
  await mkdir(destinationRoot, { recursive: true, mode: 0o700 });

  const entries: Array<{ source: string; backup: string }> = [];

  for (const source of targets) {
    try {
      const sourceStat = await stat(source);
      const backup = path.join(destinationRoot, source.replace(/[:\\]/g, "_"));
      await ensureParent(backup);
      await cp(source, backup, { recursive: sourceStat.isDirectory(), force: true });
      entries.push({ source, backup });
    } catch {
      // Missing targets are skipped intentionally.
    }
  }

  return {
    createdAt: timestamp,
    location: destinationRoot,
    entries
  };
};

export const ensureDirectoryCopy = async (sourceDir: string, targetDir: string) => {
  await mkdir(targetDir, { recursive: true, mode: 0o700 });
  const entries = await readdir(sourceDir, { withFileTypes: true });

  for (const entry of entries) {
    const source = path.join(sourceDir, entry.name);
    const target = path.join(targetDir, entry.name);

    if (entry.isDirectory()) {
      await ensureDirectoryCopy(source, target);
    } else {
      await ensureParent(target);
      await cp(source, target, { force: true });
    }
  }
};
