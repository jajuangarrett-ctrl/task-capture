import type { TaskItem } from "./types";

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

const LEGACY_BUCKETS = ["Do First", "Do Soon", "Delegate", "Waiting", "On-Hold"] as const;
const LEGACY_BUCKET_TAGS = ["#DoFirst", "#DoSoon", "#Delegate", "#Waiting", "#On-Hold"];

export function formatDateHeading(d: Date): string {
  return `${MONTHS[d.getMonth()]} ${d.getDate()}, ${d.getFullYear()}`;
}

export function buildSkeleton(today: Date): string {
  return `${FRONTMATTER}\n\n## ${formatDateHeading(today)}\n`;
}

export function renderBullet(item: TaskItem): string {
  const text = item.text.trimEnd();
  return hasTag(text, "task") ? `- [ ] ${text}\n` : `- [ ] ${text} #task\n`;
}

export function needsMigration(content: string): boolean {
  return LEGACY_BUCKETS.some((b) =>
    new RegExp(`^## ${escapeRegex(b)}[ \\t]*$`, "m").test(content)
  );
}

export function migrateBucketsToDate(content: string, today: Date): string {
  const { frontmatter, body } = splitFrontmatter(content);
  const fmPart = frontmatter || `${FRONTMATTER}\n`;
  const heading = `## ${formatDateHeading(today)}`;

  const bullets = body
    .split("\n")
    .filter((line) => /^[ \t]*- \[[ xX]\]/.test(line))
    .map(stripLegacyBucketTags);

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

function stripLegacyBucketTags(line: string): string {
  let result = line;
  for (const tag of LEGACY_BUCKET_TAGS) {
    const escaped = escapeRegex(tag);
    result = result.replace(new RegExp(`[ \\t]+${escaped}(?=[ \\t]|$)`, "g"), "");
    result = result.replace(new RegExp(`(^|[ \\t])${escaped}[ \\t]+`, "g"), "$1");
    result = result.replace(new RegExp(`(^|[ \\t])${escaped}$`, ""), "$1");
  }
  return result.replace(/[ \t]+$/, "");
}

function hasTag(text: string, tag: string): boolean {
  return new RegExp(`(?:^|\\s)#${escapeRegex(tag)}(?:\\s|$)`).test(text);
}

function escapeRegex(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}
