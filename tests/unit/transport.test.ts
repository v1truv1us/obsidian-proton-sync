import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { WebDAVClient } from "../../src/transport/webdav-client";
import { JSDOM } from "jsdom";

// Provide DOMParser for Node test environment
const dom = new JSDOM();
global.DOMParser = dom.window.DOMParser;

describe("WebDAVClient", () => {
	const config = {
		baseUrl: "http://localhost:8080",
		username: "testuser",
		password: "testpass",
		timeout: 5000,
	};

	let client: WebDAVClient;
	let fetchSpy: ReturnType<typeof vi.spyOn>;

	beforeEach(() => {
		client = new WebDAVClient(config);
		fetchSpy = vi.spyOn(globalThis, "fetch").mockResolvedValue(
			new Response("", { status: 200, statusText: "OK" })
		);
	});

	afterEach(() => {
		vi.restoreAllMocks();
	});

	describe("propfind", () => {
		it("should parse directory listing", async () => {
			const xml = `<?xml version="1.0"?>
<D:multistatus xmlns:D="DAV:">
  <D:response>
    <D:href>/vault/</D:href>
    <D:propstat>
      <D:prop>
        <D:resourcetype><D:collection/></D:resourcetype>
      </D:prop>
    </D:propstat>
  </D:response>
  <D:response>
    <D:href>/vault/notes.md</D:href>
    <D:propstat>
      <D:prop>
        <D:getcontentlength>1024</D:getcontentlength>
        <D:getlastmodified>Mon, 22 May 2025 10:00:00 GMT</D:getlastmodified>
        <D:getetag>"abc123"</D:getetag>
      </D:prop>
    </D:propstat>
  </D:response>
</D:multistatus>`;

			fetchSpy.mockResolvedValueOnce(
				new Response(xml, { status: 207, statusText: "Multi-Status" })
			);

			const resources = await client.propfind("/vault/");

			expect(resources).toHaveLength(1);
			expect(resources[0]).toEqual({
				path: "notes.md",
				isDirectory: false,
				size: 1024,
				mtime: new Date("Mon, 22 May 2025 10:00:00 GMT").getTime(),
				etag: '"abc123"',
			});
		});

		it("should throw on error response", async () => {
			fetchSpy.mockResolvedValueOnce(
				new Response("Unauthorized", { status: 401, statusText: "Unauthorized" })
			);

			await expect(client.propfind("/vault/")).rejects.toThrow("PROPFIND failed: 401 Unauthorized");
		});
	});

	describe("get", () => {
		it("should return file contents as Uint8Array", async () => {
			const data = new Uint8Array([1, 2, 3, 4, 5]);
			fetchSpy.mockResolvedValueOnce(
				new Response(data, { status: 200 })
			);

			const result = await client.get("/vault/notes.md");
			expect(result).toEqual(data);
		});

		it("should throw on 404", async () => {
			fetchSpy.mockResolvedValueOnce(
				new Response("Not Found", { status: 404, statusText: "Not Found" })
			);

			await expect(client.get("/vault/missing.md")).rejects.toThrow("GET failed: 404 Not Found");
		});
	});

	describe("put", () => {
		it("should upload data", async () => {
			fetchSpy.mockResolvedValueOnce(
				new Response("", { status: 201, statusText: "Created" })
			);

			const data = new Uint8Array([1, 2, 3]);
			await client.put("/vault/notes.md", data);

			expect(fetchSpy).toHaveBeenCalledWith(
				"http://localhost:8080/vault/notes.md",
				expect.objectContaining({
					method: "PUT",
					body: data.buffer,
					headers: expect.objectContaining({
						"Content-Type": "application/octet-stream",
					}),
				})
			);
		});

		it("should throw on error", async () => {
			fetchSpy.mockResolvedValueOnce(
				new Response("Forbidden", { status: 403, statusText: "Forbidden" })
			);

			const data = new Uint8Array([1, 2, 3]);
			await expect(client.put("/vault/notes.md", data)).rejects.toThrow("PUT failed: 403 Forbidden");
		});
	});

	describe("mkcol", () => {
		it("should create directory", async () => {
			fetchSpy.mockResolvedValueOnce(
				new Response("", { status: 201, statusText: "Created" })
			);

			await client.mkcol("/vault/folder/");

			expect(fetchSpy).toHaveBeenCalledWith(
				"http://localhost:8080/vault/folder/",
				expect.objectContaining({ method: "MKCOL" })
			);
		});

		it("should treat 405 as success (already exists)", async () => {
			fetchSpy.mockResolvedValueOnce(
				new Response("Method Not Allowed", { status: 405, statusText: "Method Not Allowed" })
			);

			await expect(client.mkcol("/vault/folder/")).resolves.toBeUndefined();
		});

		it("should throw on other errors", async () => {
			fetchSpy.mockResolvedValueOnce(
				new Response("Forbidden", { status: 403, statusText: "Forbidden" })
			);

			await expect(client.mkcol("/vault/folder/")).rejects.toThrow("MKCOL failed: 403 Forbidden");
		});
	});

	describe("probe", () => {
		it("should detect capabilities", async () => {
			fetchSpy.mockResolvedValueOnce(
				new Response("", {
					status: 200,
					headers: { DAV: "1,2", Allow: "GET, PUT, DELETE" },
				})
			);

			const caps = await client.probe();
			expect(caps.supportsEtag).toBe(true);
		});
	});
});
