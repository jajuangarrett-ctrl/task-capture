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
  it("renders text with checkbox prefix, #task tag, bucket tag, and trailing newline", () => {
    const item: TaskItem = { bucket: "Do First", text: "Review the budget" };
    expect(renderBullet(item)).toBe("- [ ] Review the budget #task #DoFirst\n");
  });

  it("appends the matching bucket tag for each bucket", () => {
    expect(renderBullet({ bucket: "Do First", text: "a" })).toBe("- [ ] a #task #DoFirst\n");
    expect(renderBullet({ bucket: "Do Soon", text: "b" })).toBe("- [ ] b #task #DoSoon\n");
    expect(renderBullet({ bucket: "Delegate", text: "c" })).toBe("- [ ] c #task #Delegate\n");
    expect(renderBullet({ bucket: "Waiting", text: "d" })).toBe("- [ ] d #task #Waiting\n");
    expect(renderBullet({ bucket: "On-Hold", text: "e" })).toBe("- [ ] e #task #On-Hold\n");
  });

  it("does not duplicate the #task tag if the user already typed it", () => {
    const item: TaskItem = { bucket: "Do First", text: "Reply to dean #task" };
    expect(renderBullet(item)).toBe("- [ ] Reply to dean #task #DoFirst\n");
  });

  it("does not duplicate the bucket tag if the user already typed it", () => {
    const item: TaskItem = { bucket: "Delegate", text: "Pull SAP report #Delegate" };
    expect(renderBullet(item)).toBe("- [ ] Pull SAP report #Delegate #task\n");
  });

  it("does not duplicate either tag if both are already present", () => {
    const item: TaskItem = { bucket: "Waiting", text: "#task ping legal #Waiting" };
    expect(renderBullet(item)).toBe("- [ ] #task ping legal #Waiting\n");
  });

  it("does NOT treat #taskforce as the #task tag (word boundary check)", () => {
    const item: TaskItem = { bucket: "Do First", text: "Email the #taskforce chair" };
    expect(renderBullet(item)).toBe("- [ ] Email the #taskforce chair #task #DoFirst\n");
  });

  it("does NOT treat #DoFirstly as the #DoFirst tag (word boundary check)", () => {
    const item: TaskItem = { bucket: "Do First", text: "Note #DoFirstly draft" };
    expect(renderBullet(item)).toBe("- [ ] Note #DoFirstly draft #task #DoFirst\n");
  });
});

describe("insertAtTopOfDate", () => {
  const bullet = "- [ ] new task #task #DoFirst\n";

  it("creates skeleton + today's heading + bullet when file is empty", () => {
    expect(insertAtTopOfDate("", MAY_3, bullet)).toBe(
      "---\ntype: tasks-master\n---\n\n## May 3, 2026\n- [ ] new task #task #DoFirst\n"
    );
  });

  it("inserts bullet at TOP of today's section when the heading already exists", () => {
    const existing =
      "---\ntype: tasks-master\n---\n\n## May 3, 2026\n- [ ] earlier task #task #DoSoon\n";
    expect(insertAtTopOfDate(existing, MAY_3, bullet)).toBe(
      "---\ntype: tasks-master\n---\n\n## May 3, 2026\n- [ ] new task #task #DoFirst\n- [ ] earlier task #task #DoSoon\n"
    );
  });

  it("creates today's heading at the TOP of body, above older date sections", () => {
    const existing =
      "---\ntype: tasks-master\n---\n\n## May 2, 2026\n- [ ] yesterday's task #task #Waiting\n";
    expect(insertAtTopOfDate(existing, MAY_3, bullet)).toBe(
      "---\ntype: tasks-master\n---\n\n## May 3, 2026\n- [ ] new task #task #DoFirst\n\n## May 2, 2026\n- [ ] yesterday's task #task #Waiting\n"
    );
  });

  it("preserves frontmatter type that isn't tasks-master", () => {
    const existing = "---\ntype: custom\nfoo: bar\n---\n\n## May 2, 2026\n- [ ] x #task #DoFirst\n";
    const out = insertAtTopOfDate(existing, MAY_3, bullet);
    expect(out.startsWith("---\ntype: custom\nfoo: bar\n---\n")).toBe(true);
    expect(out).toContain("## May 3, 2026\n- [ ] new task #task #DoFirst\n");
    expect(out).toContain("## May 2, 2026\n- [ ] x #task #DoFirst\n");
  });

  it("adds frontmatter if the existing file has none", () => {
    const existing = "## May 2, 2026\n- [ ] yesterday #task #DoSoon\n";
    expect(insertAtTopOfDate(existing, MAY_3, bullet)).toBe(
      "---\ntype: tasks-master\n---\n\n## May 3, 2026\n- [ ] new task #task #DoFirst\n\n## May 2, 2026\n- [ ] yesterday #task #DoSoon\n"
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
      needsMigration(
        "---\ntype: tasks-master\n---\n\n## May 3, 2026\n- [ ] x #task #DoFirst\n"
      )
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
  it("collects bullets under one date heading while PRESERVING existing bucket tags", () => {
    const old =
      "---\ntype: tasks-master\n---\n\n" +
      "## Do First\n- [ ] alpha #task #DoFirst\n\n" +
      "## Do Soon\n- [ ] beta #task #DoSoon\n\n" +
      "## Delegate\n- [ ] gamma #task #Delegate\n\n" +
      "## Waiting\n- [ ] delta #task #Waiting\n\n" +
      "## On-Hold\n- [ ] epsilon #task #On-Hold\n";
    expect(migrateBucketsToDate(old, MAY_3)).toBe(
      "---\ntype: tasks-master\n---\n\n## May 3, 2026\n" +
        "- [ ] alpha #task #DoFirst\n" +
        "- [ ] beta #task #DoSoon\n" +
        "- [ ] gamma #task #Delegate\n" +
        "- [ ] delta #task #Waiting\n" +
        "- [ ] epsilon #task #On-Hold\n"
    );
  });

  it("backfills missing bucket tag from the section heading the bullet was under", () => {
    const old = "## Do First\n- [ ] no tag yet\n## Waiting\n- [ ] also no tag #task\n";
    const migrated = migrateBucketsToDate(old, MAY_3);
    expect(migrated).toContain("- [ ] no tag yet #task #DoFirst\n");
    expect(migrated).toContain("- [ ] also no tag #task #Waiting\n");
  });

  it("preserves completed (- [x]) bullets", () => {
    const old = "## Do First\n- [x] done thing #task #DoFirst\n";
    expect(migrateBucketsToDate(old, MAY_3)).toContain(
      "- [x] done thing #task #DoFirst\n"
    );
  });

  it("drops non-task content (free text, sub-headings) — task lines only", () => {
    const old =
      "---\ntype: tasks-master\n---\n\n" +
      "Random intro text.\n\n" +
      "## Do First\n" +
      "Some commentary line.\n" +
      "- [ ] kept task #task #DoFirst\n";
    const migrated = migrateBucketsToDate(old, MAY_3);
    expect(migrated).not.toContain("Random intro text");
    expect(migrated).not.toContain("Some commentary line");
    expect(migrated).toContain("- [ ] kept task #task #DoFirst\n");
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
    expect(migrated).toContain("## May 3, 2026\n- [ ] x #task #DoFirst\n");
  });

  it("does not mutate bullets under non-bucket sub-headings", () => {
    const old = "## Some Random\n- [ ] foreign #task\n";
    const migrated = migrateBucketsToDate(old, MAY_3);
    expect(migrated).toContain("- [ ] foreign #task\n");
    expect(migrated).not.toContain("#DoFirst");
  });
});
