import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { JSDOM } from "jsdom";
import { WebDAVClient } from "../../src/transport/webdav-client";

// Provide DOMParser for Node test environment
const dom = new JSDOM();
global.DOMParser = dom.window.DOMParser;
import { computePlan } from "../../src/planner/planner";
import type { FileSnapshot } from "../../src/planner/snapshot";

describe("Integration: WebDAV Transport + Planner", () => {
	let fetchSpy: ReturnType<typeof vi.spyOn>;

	beforeEach(() => {
		fetchSpy = vi.spyOn(globalThis, "fetch").mockResolvedValue(
			new Response("", { status: 200, statusText: "OK" })
		);
	});

	afterEach(() => {
		vi.restoreAllMocks();
	});

	it("should pull new remote files", async () => {
		const xml = `<?xml version="1.0"?>
<D:multistatus xmlns:D="DAV:">
  <D:response>
    <D:href>/remote.md</D:href>
    <D:propstat>
      <D:prop>
        <D:getcontentlength>100</D:getcontentlength>
        <D:getlastmodified>Mon, 22 May 2025 10:00:00 GMT</D:getlastmodified>
      </D:prop>
    </D:propstat>
  </D:response>
</D:multistatus>`;

		fetchSpy.mockResolvedValueOnce(
			new Response(xml, { status: 207, statusText: "Multi-Status" })
		);

		const client = new WebDAVClient({
			baseUrl: "http://test",
			username: "u",
			password: "p",
			timeout: 5000,
		});

		const local = new Map<string, FileSnapshot>();
		const remoteFiles = await client.propfind("/");
		const remote = new Map(remoteFiles.map((r) => [r.path, { path: r.path, size: r.size, mtime: r.mtime, etag: r.etag }]));
		const snapshot = new Map<string, FileSnapshot>();

		const plan = computePlan(local, remote, snapshot);

		expect(plan.pulls).toHaveLength(1);
		expect(plan.pulls[0].path).toBe("remote.md");
		expect(plan.pushes).toHaveLength(0);
	});

	it("should be idempotent when no changes", async () => {
		const xml = `<?xml version="1.0"?>
<D:multistatus xmlns:D="DAV:">
  <D:response>
    <D:href>/notes.md</D:href>
    <D:propstat>
      <D:prop>
        <D:getcontentlength>100</D:getcontentlength>
        <D:getlastmodified>Mon, 22 May 2025 10:00:00 GMT</D:getlastmodified>
        <D:getetag>"abc123"</D:getetag>
      </D:prop>
    </D:propstat>
  </D:response>
</D:multistatus>`;

		fetchSpy.mockResolvedValueOnce(
			new Response(xml, { status: 207, statusText: "Multi-Status" })
		);

		const client = new WebDAVClient({
			baseUrl: "http://test",
			username: "u",
			password: "p",
			timeout: 5000,
		});

		const remoteFiles = await client.propfind("/");
		const remote = new Map(remoteFiles.map((r) => [r.path, { path: r.path, size: r.size, mtime: r.mtime, etag: r.etag }]));

		const local = new Map([["notes.md", { path: "notes.md", size: 100, mtime: new Date("Mon, 22 May 2025 10:00:00 GMT").getTime(), etag: '"abc123"' }]]);
		const snapshot = new Map([["notes.md", { path: "notes.md", size: 100, mtime: new Date("Mon, 22 May 2025 10:00:00 GMT").getTime(), etag: '"abc123"' }]]);

		const plan = computePlan(local, remote, snapshot);

		expect(plan.skips).toHaveLength(1);
		expect(plan.pulls).toHaveLength(0);
		expect(plan.pushes).toHaveLength(0);
		expect(plan.conflicts).toHaveLength(0);
	});

	it("should detect conflict when both sides diverged", async () => {
		const xml = `<?xml version="1.0"?>
<D:multistatus xmlns:D="DAV:">
  <D:response>
    <D:href>/notes.md</D:href>
    <D:propstat>
      <D:prop>
        <D:getcontentlength>200</D:getcontentlength>
        <D:getlastmodified>Mon, 22 May 2025 12:00:00 GMT</D:getlastmodified>
      </D:prop>
    </D:propstat>
  </D:response>
</D:multistatus>`;

		fetchSpy.mockResolvedValueOnce(
			new Response(xml, { status: 207, statusText: "Multi-Status" })
		);

		const client = new WebDAVClient({
			baseUrl: "http://test",
			username: "u",
			password: "p",
			timeout: 5000,
		});

		const remoteFiles = await client.propfind("/");
		const remote = new Map(remoteFiles.map((r) => [r.path, { path: r.path, size: r.size, mtime: r.mtime, etag: r.etag }]));

		const local = new Map([["notes.md", { path: "notes.md", size: 300, mtime: new Date("Mon, 22 May 2025 14:00:00 GMT").getTime() }]]);
		const snapshot = new Map([["notes.md", { path: "notes.md", size: 100, mtime: new Date("Mon, 22 May 2025 10:00:00 GMT").getTime() }]]);

		const plan = computePlan(local, remote, snapshot);

		expect(plan.conflicts).toHaveLength(1);
		expect(plan.conflicts[0].path).toBe("notes.md");
	});

	it("should retry on transient error then succeed", async () => {
		// First call fails with 500, second succeeds
		fetchSpy
			.mockResolvedValueOnce(new Response("Error", { status: 500, statusText: "Internal Server Error" }))
			.mockResolvedValueOnce(new Response("OK", { status: 200 }));

		const client = new WebDAVClient({
			baseUrl: "http://test",
			username: "u",
			password: "p",
			timeout: 5000,
		});

		const result = await client.get("/file.txt");
		expect(result).toBeDefined();
		expect(fetchSpy).toHaveBeenCalledTimes(2);
	});

	it("should not retry on 401 auth failure", async () => {
		fetchSpy.mockResolvedValueOnce(
			new Response("Unauthorized", { status: 401, statusText: "Unauthorized" })
		);

		const client = new WebDAVClient({
			baseUrl: "http://test",
			username: "u",
			password: "p",
			timeout: 5000,
		});

		await expect(client.get("/file.txt")).rejects.toThrow("GET failed: 401 Unauthorized");
		expect(fetchSpy).toHaveBeenCalledTimes(1);
	});
});
