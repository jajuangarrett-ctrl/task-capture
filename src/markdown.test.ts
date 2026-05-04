import { describe, it, expect } from "vitest";
import {
  buildSkeleton,
  formatDateHeading,
  insertAtTopOfDate,
  migrateBucketsToDate,
  needsMigration,
  renderBullet,
} from "./markdown";
import type { TaskItem } from "./types";

const MAY_3 = new Date(2026, 4, 3);
const MAY_2 = new Date(2026, 4, 2);
const APR_30 = new Date(2026, 3, 30);

describe("formatDateHeading", () => {
  it("formats as 'Month D, YYYY'", () => {
    expect(formatDateHeading(MAY_3)).toBe("May 3, 2026");
    expect(formatDateHeading(APR_30)).toBe("April 30, 2026");
    expect(formatDateHeading(new Date(2026, 0, 1))).toBe("January 1, 2026");
    expect(formatDateHeading(new Date(2026, 11, 31))).toBe("December 31, 2026");
  });
});

describe("buildSkeleton", () => {
  it("creates a file with frontmatter and today's date heading", () => {
    expect(buildSkeleton(MAY_3)).toBe(
      "---\ntype: tasks-master\n---\n\n## May 3, 2026\n"
    );
  });
});

describe("renderBullet", () => {
  it("renders text with checkbox prefix, #task tag, and trailing newline", () => {
    const item: TaskItem = { text: "Review the budget" };
    expect(renderBullet(item)).toBe("- [ ] Review the budget #task\n");
  });

  it("does not duplicate the #task tag if the user already typed it", () => {
    const item: TaskItem = { text: "Reply to dean #task" };
    expect(renderBullet(item)).toBe("- [ ] Reply to dean #task\n");
  });

  it("recognizes #task in the middle of the text and does not append a duplicate", () => {
    const item: TaskItem = { text: "Follow up #task with HR" };
    expect(renderBullet(item)).toBe("- [ ] Follow up #task with HR\n");
  });

  it("does NOT treat #taskforce as the #task tag (word boundary check)", () => {
    const item: TaskItem = { text: "Email the #taskforce chair" };
    expect(renderBullet(item)).toBe("- [ ] Email the #taskforce chair #task\n");
  });
});

describe("insertAtTopOfDate", () => {
  const bullet = "- [ ] new task #task\n";

  it("creates skeleton + today's heading + bullet when file is empty", () => {
    expect(insertAtTopOfDate("", MAY_3, bullet)).toBe(
      "---\ntype: tasks-master\n---\n\n## May 3, 2026\n- [ ] new task #task\n"
    );
  });

  it("inserts bullet at TOP of today's section when the heading already exists", () => {
    const existing =
      "---\ntype: tasks-master\n---\n\n## May 3, 2026\n- [ ] earlier task #task\n";
    expect(insertAtTopOfDate(existing, MAY_3, bullet)).toBe(
      "---\ntype: tasks-master\n---\n\n## May 3, 2026\n- [ ] new task #task\n- [ ] earlier task #task\n"
    );
  });

  it("creates today's heading at the TOP of body, above older date sections", () => {
    const existing =
      "---\ntype: tasks-master\n---\n\n## May 2, 2026\n- [ ] yesterday's task #task\n";
    expect(insertAtTopOfDate(existing, MAY_3, bullet)).toBe(
      "---\ntype: tasks-master\n---\n\n## May 3, 2026\n- [ ] new task #task\n\n## May 2, 2026\n- [ ] yesterday's task #task\n"
    );
  });

  it("preserves frontmatter type that isn't tasks-master", () => {
    const existing = "---\ntype: custom\nfoo: bar\n---\n\n## May 2, 2026\n- [ ] x #task\n";
    const out = insertAtTopOfDate(existing, MAY_3, bullet);
    expect(out.startsWith("---\ntype: custom\nfoo: bar\n---\n")).toBe(true);
    expect(out).toContain("## May 3, 2026\n- [ ] new task #task\n");
    expect(out).toContain("## May 2, 2026\n- [ ] x #task\n");
  });

  it("adds frontmatter if the existing file has none", () => {
    const existing = "## May 2, 2026\n- [ ] yesterday #task\n";
    expect(insertAtTopOfDate(existing, MAY_3, bullet)).toBe(
      "---\ntype: tasks-master\n---\n\n## May 3, 2026\n- [ ] new task #task\n\n## May 2, 2026\n- [ ] yesterday #task\n"
    );
  });
});

describe("needsMigration", () => {
  it("returns true when any legacy bucket heading is present", () => {
    expect(needsMigration("## Do First\n- [ ] x\n")).toBe(true);
    expect(needsMigration("## Waiting\n")).toBe(true);
    expect(needsMigration("## On-Hold\n")).toBe(true);
  });

  it("returns false for date-format files", () => {
    expect(
      needsMigration("---\ntype: tasks-master\n---\n\n## May 3, 2026\n- [ ] x #task\n")
    ).toBe(false);
  });

  it("returns false for empty content", () => {
    expect(needsMigration("")).toBe(false);
  });

  it("does not match a heading that starts with a bucket name but is longer", () => {
    expect(needsMigration("## Do First Plus\n- [ ] x\n")).toBe(false);
  });
});

describe("migrateBucketsToDate", () => {
  it("collects bullets from all buckets under one date heading", () => {
    const old =
      "---\ntype: tasks-master\n---\n\n" +
      "## Do First\n- [ ] alpha #task #DoFirst\n\n" +
      "## Do Soon\n- [ ] beta #task #DoSoon\n\n" +
      "## Delegate\n- [ ] gamma #task #Delegate\n\n" +
      "## Waiting\n- [ ] delta #task #Waiting\n\n" +
      "## On-Hold\n- [ ] epsilon #task #On-Hold\n";
    expect(migrateBucketsToDate(old, MAY_3)).toBe(
      "---\ntype: tasks-master\n---\n\n## May 3, 2026\n" +
        "- [ ] alpha #task\n" +
        "- [ ] beta #task\n" +
        "- [ ] gamma #task\n" +
        "- [ ] delta #task\n" +
        "- [ ] epsilon #task\n"
    );
  });

  it("strips bucket tag whether it's leading, middle, or trailing on the line", () => {
    const old =
      "## Do First\n- [ ] #DoFirst alpha #task\n- [ ] beta #DoFirst middle #task\n";
    const migrated = migrateBucketsToDate(old, MAY_3);
    expect(migrated).toContain("- [ ] alpha #task\n");
    expect(migrated).toContain("- [ ] beta middle #task\n");
  });

  it("preserves completed (- [x]) bullets", () => {
    const old = "## Do First\n- [x] done thing #task #DoFirst\n";
    expect(migrateBucketsToDate(old, MAY_3)).toContain("- [x] done thing #task\n");
  });

  it("drops non-task content (comments, headings, free text) — task lines only", () => {
    const old =
      "---\ntype: tasks-master\n---\n\n" +
      "Random intro text.\n\n" +
      "## Do First\n" +
      "Some commentary line.\n" +
      "- [ ] kept task #task #DoFirst\n";
    const migrated = migrateBucketsToDate(old, MAY_3);
    expect(migrated).not.toContain("Random intro text");
    expect(migrated).not.toContain("Some commentary line");
    expect(migrated).toContain("- [ ] kept task #task\n");
  });

  it("returns just the skeleton when there are no bullets to migrate", () => {
    const old =
      "---\ntype: tasks-master\n---\n\n## Do First\n\n## Waiting\n";
    expect(migrateBucketsToDate(old, MAY_3)).toBe(
      "---\ntype: tasks-master\n---\n\n## May 3, 2026\n"
    );
  });

  it("preserves frontmatter that isn't the canonical tasks-master one", () => {
    const old = "---\ntype: custom\n---\n\n## Do First\n- [ ] x #task #DoFirst\n";
    const migrated = migrateBucketsToDate(old, MAY_3);
    expect(migrated.startsWith("---\ntype: custom\n---\n")).toBe(true);
    expect(migrated).toContain("## May 3, 2026\n- [ ] x #task\n");
  });
});
