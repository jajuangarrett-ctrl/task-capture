import { App, normalizePath, TFile } from "obsidian";
import {
  buildSkeleton,
  ensureBucketHeadings,
  insertAtTopOfBucket,
  renderBullet,
} from "./markdown";
import type { TaskItem } from "./types";

export async function appendTask(
  app: App,
  filePath: string,
  item: TaskItem
): Promise<void> {
  const path = normalizePath(filePath);
  await ensureParentFolder(app, path);
  const bullet = renderBullet(item);
  const file = app.vault.getAbstractFileByPath(path);

  if (file instanceof TFile) {
    const current = await app.vault.read(file);
    const next = insertAtTopOfBucket(current, item.bucket, bullet);
    await app.vault.modify(file, next);
  } else {
    const seeded = insertAtTopOfBucket(buildSkeleton(), item.bucket, bullet);
    await app.vault.create(path, seeded);
  }
}

async function ensureParentFolder(app: App, path: string): Promise<void> {
  const parent = path.includes("/") ? path.slice(0, path.lastIndexOf("/")) : "";
  if (!parent) return;
  const normalized = normalizePath(parent);
  if (!app.vault.getAbstractFileByPath(normalized)) {
    await app.vault.createFolder(normalized);
  }
}
