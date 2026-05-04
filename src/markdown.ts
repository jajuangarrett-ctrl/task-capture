import { BUCKETS } from "./types";
import type { Bucket, TaskItem } from "./types";

const FRONTMATTER = "---\ntype: tasks-master\n---";

const MONTHS = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
];

export const BUCKET_TAGS: Record<Bucket, string> = {
  "Do First": "#DoFirst",
  "Do Soon": "#DoSoon",
  Delegate: "#Delegate",
  Waiting: "#Waiting",
  "On-Hold": "#On-Hold",
};

export function formatDateHeading(d: Date): string {
  return `${MONTHS[d.getMonth()]} ${d.getDate()}, ${d.getFullYear()}`;
}

export function buildSkeleton(today: Date): string {
  return `${FRONTMATTER}\n\n## ${formatDateHeading(today)}\n`;
}

export function renderBullet(item: TaskItem): string {
  return `- [ ] ${ensureTags(item.text.trimEnd(), item.bucket)}\n`;
}

export function needsMigration(content: string): boolean {
  return BUCKETS.some((b) =>
    new RegExp(`^## ${escapeRegex(b)}[ \\t]*$`, "m").test(content)
  );
}

export function migrateBucketsToDate(content: string, today: Date): string {
  const { frontmatter, body } = splitFrontmatter(content);
  const fmPart = frontmatter || `${FRONTMATTER}\n`;
  const heading = `## ${formatDateHeading(today)}`;

  const bullets: string[] = [];
  let currentBucket: Bucket | null = null;

  for (const line of body.split("\n")) {
    const headingMatch = line.match(/^##[ \t]+(.+?)[ \t]*$/);
    if (headingMatch) {
      const headingName = headingMatch[1];
      currentBucket = (BUCKETS as readonly string[]).includes(headingName)
        ? (headingName as Bucket)
        : null;
      continue;
    }
    if (/^[ \t]*- \[[ xX]\]/.test(line)) {
      bullets.push(currentBucket ? ensureBulletTags(line, currentBucket) : line);
    }
  }

  if (bullets.length === 0) {
    return `${fmPart}\n${heading}\n`;
  }
  return `${fmPart}\n${heading}\n${bullets.join("\n")}\n`;
}

export function insertAtTopOfDate(
  content: string,
  today: Date,
  bullet: string
): string {
  const { frontmatter, body } = splitFrontmatter(content);
  const fmPart = frontmatter || `${FRONTMATTER}\n`;
  const headingText = `## ${formatDateHeading(today)}`;
  const headingRegex = new RegExp(`^${escapeRegex(headingText)}[ \\t]*$`, "m");

  const match = headingRegex.exec(body);
  if (match) {
    const idx = match.index + match[0].length;
    const insertAt = body.charAt(idx) === "\n" ? idx + 1 : idx;
    const newBody = body.slice(0, insertAt) + bullet + body.slice(insertAt);
    return fmPart + newBody;
  }

  const trimmedBody = body.replace(/^\n+/, "");
  if (!trimmedBody) {
    return `${fmPart}\n${headingText}\n${bullet}`;
  }
  return `${fmPart}\n${headingText}\n${bullet}\n${trimmedBody}`;
}

function splitFrontmatter(content: string): { frontmatter: string; body: string } {
  const match = content.match(/^---\n[\s\S]*?\n---\n?/);
  if (!match) return { frontmatter: "", body: content };
  return { frontmatter: match[0], body: content.slice(match[0].length) };
}

function ensureBulletTags(line: string, bucket: Bucket): string {
  const checkboxMatch = line.match(/^([ \t]*- \[[ xX]\][ \t]*)(.*)$/);
  if (!checkboxMatch) return line;
  const prefix = checkboxMatch[1];
  const rest = checkboxMatch[2].trimEnd();
  return `${prefix}${ensureTags(rest, bucket)}`;
}

function ensureTags(text: string, bucket: Bucket): string {
  let result = text;
  const append: string[] = [];
  if (!hasTag(result, "task")) append.push("#task");
  const bucketTag = BUCKET_TAGS[bucket];
  if (!hasTag(result, bucketTag.slice(1))) append.push(bucketTag);
  if (append.length === 0) return result;
  return result.length === 0 ? append.join(" ") : `${result} ${append.join(" ")}`;
}

function hasTag(text: string, tag: string): boolean {
  return new RegExp(`(?:^|\\s)#${escapeRegex(tag)}(?:\\s|$)`).test(text);
}

function escapeRegex(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}
