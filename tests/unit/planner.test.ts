import { describe, it, expect } from "vitest";
import { computePlan } from "../../src/planner/planner";
import type { FileSnapshot } from "../../src/planner/snapshot";

function snap(path: string, size: number, mtime: number, etag?: string): FileSnapshot {
	return { path, size, mtime, etag };
}

describe("computePlan", () => {
	it("should skip when no changes", () => {
		const local = new Map([["notes.md", snap("notes.md", 100, 1000, "a")]]);
		const remote = new Map([["notes.md", snap("notes.md", 100, 1000, "a")]]);
		const snapshot = new Map([["notes.md", snap("notes.md", 100, 1000, "a")]]);

		const plan = computePlan(local, remote, snapshot);
		expect(plan.skips).toHaveLength(1);
		expect(plan.pushes).toHaveLength(0);
		expect(plan.pulls).toHaveLength(0);
		expect(plan.conflicts).toHaveLength(0);
	});

	it("should push when local changed", () => {
		const local = new Map([["notes.md", snap("notes.md", 200, 2000, "b")]]);
		const remote = new Map([["notes.md", snap("notes.md", 100, 1000, "a")]]);
		const snapshot = new Map([["notes.md", snap("notes.md", 100, 1000, "a")]]);

		const plan = computePlan(local, remote, snapshot);
		expect(plan.pushes).toHaveLength(1);
		expect(plan.pushes[0].reason).toBe("Local file changed");
	});

	it("should pull when remote changed", () => {
		const local = new Map([["notes.md", snap("notes.md", 100, 1000, "a")]]);
		const remote = new Map([["notes.md", snap("notes.md", 200, 2000, "b")]]);
		const snapshot = new Map([["notes.md", snap("notes.md", 100, 1000, "a")]]);

		const plan = computePlan(local, remote, snapshot);
		expect(plan.pulls).toHaveLength(1);
		expect(plan.pulls[0].reason).toBe("Remote file changed");
	});

	it("should conflict when both changed", () => {
		const local = new Map([["notes.md", snap("notes.md", 200, 2000, "b")]]);
		const remote = new Map([["notes.md", snap("notes.md", 300, 3000, "c")]]);
		const snapshot = new Map([["notes.md", snap("notes.md", 100, 1000, "a")]]);

		const plan = computePlan(local, remote, snapshot);
		expect(plan.conflicts).toHaveLength(1);
		expect(plan.conflicts[0].path).toBe("notes.md");
	});

	it("should push new local file", () => {
		const local = new Map([["new.md", snap("new.md", 100, 1000)]]);
		const remote = new Map<string, FileSnapshot>();
		const snapshot = new Map<string, FileSnapshot>();

		const plan = computePlan(local, remote, snapshot);
		expect(plan.pushes).toHaveLength(1);
		expect(plan.pushes[0].reason).toBe("New file locally");
	});

	it("should pull new remote file", () => {
		const local = new Map<string, FileSnapshot>();
		const remote = new Map([["new.md", snap("new.md", 100, 1000)]]);
		const snapshot = new Map<string, FileSnapshot>();

		const plan = computePlan(local, remote, snapshot);
		expect(plan.pulls).toHaveLength(1);
		expect(plan.pulls[0].reason).toBe("New file on remote");
	});

	it("should skip when file removed from both sides", () => {
		const local = new Map<string, FileSnapshot>();
		const remote = new Map<string, FileSnapshot>();
		const snapshot = new Map([["old.md", snap("old.md", 100, 1000)]]);

		const plan = computePlan(local, remote, snapshot);
		expect(plan.skips).toHaveLength(1);
	});
});
