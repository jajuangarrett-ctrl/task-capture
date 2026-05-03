import { BUCKETS } from "./types";
import type { Bucket, TaskItem } from "./types";

const FRONTMATTER = "---\ntype: tasks-master\n---";

export function buildSkeleton(): string {
  const headings = BUCKETS.map((b) => `## ${b}\n`).join("\n");
  return `${FRONTMATTER}\n\n${headings}`;
}

export function ensureBucketHeadings(content: string): string {
  if (content.trim().length === 0) {
    return buildSkeleton();
  }

  let result = content;
  for (const bucket of BUCKETS) {
    const pattern = new RegExp(`^## ${escapeRegex(bucket)}[ \\t]*$`, "m");
    if (!pattern.test(result)) {
      const trimmed = result.replace(/\s+$/, "");
      result = `${trimmed}\n\n## ${bucket}\n`;
    }
  }
  return result;
}

export function insertAtTopOfBucket(
  content: string,
  bucket: Bucket,
  bullet: string
): string {
  const ensured = ensureBucketHeadings(content);
  const pattern = new RegExp(`^## ${escapeRegex(bucket)}[ \\t]*$`, "m");
  const match = pattern.exec(ensured);
  if (!match) {
    throw new Error(`Bucket heading "${bucket}" missing after ensureBucketHeadings`);
  }
  const headingEnd = match.index + match[0].length;
  const insertAt = ensured.charAt(headingEnd) === "\n" ? headingEnd + 1 : headingEnd;
  return ensured.slice(0, insertAt) + bullet + ensured.slice(insertAt);
}

export function renderBullet(item: TaskItem): string {
  const text = item.text.trimEnd();
  const needsTag = !/(?:^|\s)#task(?:\s|$)/.test(text);
  return needsTag ? `- [ ] ${text} #task\n` : `- [ ] ${text}\n`;
}

function escapeRegex(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}
