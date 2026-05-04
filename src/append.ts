import { App, normalizePath, TFile } from "obsidian";
import {
  insertAtTopOfDate,
  migrateBucketsToDate,
  needsMigration,
  renderBullet,
} from "./markdown";
import type { TaskItem } from "./types";

export interface AppendResult {
  migrated: boolean;
  migratedCount: number;
}

export async function appendTask(
  app: App,
  filePath: string,
  item: TaskItem,
  capturedAt: Date = new Date()
): Promise<AppendResult> {
  const path = normalizePath(filePath);
  await ensureParentFolder(app, path);
  const bullet = renderBullet(item);
  const file = app.vault.getAbstractFileByPath(path);

  if (file instanceof TFile) {
    let current = await app.vault.read(file);
    let migratedCount = 0;
    let migrated = false;
    if (needsMigration(current)) {
      migratedCount = countTaskLines(current);
      current = migrateBucketsToDate(current, capturedAt);
      migrated = true;
    }
    const next = insertAtTopOfDate(current, capturedAt, bullet);
    await app.vault.modify(file, next);
    return { migrated, migratedCount };
  }

  const seeded = insertAtTopOfDate("", capturedAt, bullet);
  await app.vault.create(path, seeded);
  return { migrated: false, migratedCount: 0 };
}

function countTaskLines(content: string): number {
  return content.split("\n").filter((line) => /^[ \t]*- \[[ xX]\]/.test(line)).length;
}

async function ensureParentFolder(app: App, path: string): Promise<void> {
  const parent = path.includes("/") ? path.slice(0, path.lastIndexOf("/")) : "";
  if (!parent) return;
  const normalized = normalizePath(parent);
  if (!app.vault.getAbstractFileByPath(normalized)) {
    await app.vault.createFolder(normalized);
  }
}
