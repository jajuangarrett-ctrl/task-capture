import { describe, it, expect } from "vitest";
import {
  buildSkeleton,
  ensureBucketHeadings,
  insertAtTopOfBucket,
  renderBullet,
} from "./markdown";
import type { TaskItem } from "./types";

describe("buildSkeleton", () => {
  it("creates a file with frontmatter and all 4 headings in order", () => {
    expect(buildSkeleton()).toBe(
      "---\ntype: tasks-master\n---\n\n## Do First\n\n## Do Soon\n\n## Delegate\n\n## Waiting\n"
    );
  });
});

describe("ensureBucketHeadings", () => {
  it("returns full skeleton when content is empty", () => {
    expect(ensureBucketHeadings("")).toBe(buildSkeleton());
  });

  it("returns full skeleton when content is only whitespace", () => {
    expect(ensureBucketHeadings("\n   \n\n")).toBe(buildSkeleton());
  });

  it("leaves content untouched when all 4 headings already exist (in order)", () => {
    const existing =
      "---\ntype: tasks-master\n---\n\n" +
      "## Do First\n- [ ] a\n\n" +
      "## Do Soon\n- [ ] b\n\n" +
      "## Delegate\n- [ ] c\n\n" +
      "## Waiting\n- [ ] d\n";
    expect(ensureBucketHeadings(existing)).toBe(existing);
  });

  it("leaves content untouched when all 4 headings exist out of order", () => {
    const existing =
      "## Waiting\n- [ ] d\n\n" +
      "## Do First\n- [ ] a\n\n" +
      "## Delegate\n- [ ] c\n\n" +
      "## Do Soon\n- [ ] b\n";
    expect(ensureBucketHeadings(existing)).toBe(existing);
  });

  it("appends only the missing headings when some are present", () => {
    const partial = "## Do First\n- [ ] a\n\n## Waiting\n- [ ] d\n";
    expect(ensureBucketHeadings(partial)).toBe(
      "## Do First\n- [ ] a\n\n## Waiting\n- [ ] d\n\n## Do Soon\n\n## Delegate\n"
    );
  });

  it("preserves frontmatter and other content above the headings", () => {
    const content = "---\ntype: custom\n---\n\nIntro text.\n\n## Do First\n";
    const out = ensureBucketHeadings(content);
    expect(out).toContain("---\ntype: custom\n---");
    expect(out).toContain("Intro text.");
    expect(out).toContain("## Do First");
    expect(out).toContain("## Do Soon");
    expect(out).toContain("## Delegate");
    expect(out).toContain("## Waiting");
  });
});

describe("insertAtTopOfBucket", () => {
  const bullet = "- [ ] new task\n";

  it("creates skeleton and inserts bullet under chosen bucket when file is empty", () => {
    const out = insertAtTopOfBucket("", "Do First", bullet);
    expect(out).toBe(
      "---\ntype: tasks-master\n---\n\n## Do First\n- [ ] new task\n\n## Do Soon\n\n## Delegate\n\n## Waiting\n"
    );
  });

  it("inserts new bullet at the TOP of an existing bucket (above older bullets)", () => {
    const existing =
      "---\ntype: tasks-master\n---\n\n## Do First\n- [ ] old task\n\n## Do Soon\n\n## Delegate\n\n## Waiting\n";
    const out = insertAtTopOfBucket(existing, "Do First", bullet);
    expect(out).toBe(
      "---\ntype: tasks-master\n---\n\n## Do First\n- [ ] new task\n- [ ] old task\n\n## Do Soon\n\n## Delegate\n\n## Waiting\n"
    );
  });

  it("inserts only under the chosen bucket, leaves others alone", () => {
    const existing = buildSkeleton();
    const after1 = insertAtTopOfBucket(existing, "Delegate", "- [ ] task A\n");
    const after2 = insertAtTopOfBucket(after1, "Waiting", "- [ ] task B\n");
    expect(after2).toBe(
      "---\ntype: tasks-master\n---\n\n## Do First\n\n## Do Soon\n\n## Delegate\n- [ ] task A\n\n## Waiting\n- [ ] task B\n"
    );
  });

  it("inserts under the bucket even when bucket is missing initially", () => {
    const partial = "## Do First\n- [ ] a\n";
    const out = insertAtTopOfBucket(partial, "Delegate", bullet);
    expect(out).toContain("## Delegate\n- [ ] new task\n");
  });

  it("does NOT match a longer bucket name like ## Do First Plus", () => {
    const existing = "## Do First Plus\n- [ ] not really do first\n";
    const out = insertAtTopOfBucket(existing, "Do First", bullet);
    expect(out).toContain("## Do First Plus\n- [ ] not really do first\n");
    expect(out).toContain("## Do First\n- [ ] new task\n");
  });
});

describe("renderBullet", () => {
  it("renders text with checkbox prefix, #task tag, and trailing newline", () => {
    const item: TaskItem = { bucket: "Do First", text: "Review the budget" };
    expect(renderBullet(item)).toBe("- [ ] Review the budget #task\n");
  });

  it("does NOT include bucket name in the bullet (bucket is implicit from heading)", () => {
    const item: TaskItem = { bucket: "Delegate", text: "Pull SAP report" };
    expect(renderBullet(item)).toBe("- [ ] Pull SAP report #task\n");
  });

  it("does not duplicate the #task tag if the user already typed it", () => {
    const item: TaskItem = { bucket: "Do First", text: "Reply to dean #task" };
    expect(renderBullet(item)).toBe("- [ ] Reply to dean #task\n");
  });

  it("recognizes #task in the middle of the text and does not append a duplicate", () => {
    const item: TaskItem = { bucket: "Do Soon", text: "Follow up #task with HR" };
    expect(renderBullet(item)).toBe("- [ ] Follow up #task with HR\n");
  });

  it("does NOT treat #taskforce as the #task tag (word boundary check)", () => {
    const item: TaskItem = { bucket: "Do First", text: "Email the #taskforce chair" };
    expect(renderBullet(item)).toBe("- [ ] Email the #taskforce chair #task\n");
  });
});
