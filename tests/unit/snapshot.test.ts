import { describe, it, expect } from "vitest";
import { normalizePath, snapshotsEqual } from "../../src/planner/snapshot";

describe("normalizePath", () => {
	it("should remove leading slash", () => {
		expect(normalizePath("/notes/daily.md")).toBe("notes/daily.md");
	});

	it("should collapse . segments", () => {
		expect(normalizePath("notes/./daily.md")).toBe("notes/daily.md");
	});

	it("should collapse .. segments", () => {
		expect(normalizePath("notes/../daily.md")).toBe("daily.md");
	});

	it("should handle complex paths", () => {
		expect(normalizePath("/a/b/../c/./d.md")).toBe("a/c/d.md");
	});
});

describe("snapshotsEqual", () => {
	it("should match by etag", () => {
		const a = { path: "x", size: 1, mtime: 1, etag: "abc" };
		const b = { path: "x", size: 2, mtime: 2, etag: "abc" };
		expect(snapshotsEqual(a, b)).toBe(true);
	});

	it("should differ by etag", () => {
		const a = { path: "x", size: 1, mtime: 1, etag: "abc" };
		const b = { path: "x", size: 1, mtime: 1, etag: "def" };
		expect(snapshotsEqual(a, b)).toBe(false);
	});

	it("should fallback to size and mtime", () => {
		const a = { path: "x", size: 100, mtime: 12345 };
		const b = { path: "x", size: 100, mtime: 12345 };
		expect(snapshotsEqual(a, b)).toBe(true);
	});

	it("should detect size change", () => {
		const a = { path: "x", size: 100, mtime: 12345 };
		const b = { path: "x", size: 200, mtime: 12345 };
		expect(snapshotsEqual(a, b)).toBe(false);
	});
});
