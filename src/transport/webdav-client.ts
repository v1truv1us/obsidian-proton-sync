import type { WebDAVConfig, WebDAVResource, ServerCapabilities } from "./types";

export class WebDAVClient {
	private config: WebDAVConfig;

	constructor(config: WebDAVConfig) {
		this.config = config;
	}

	private async request(
		method: string,
		path: string,
		options: RequestInit = {}
	): Promise<Response> {
		const url = new URL(path, this.config.baseUrl).toString();
		const auth = btoa(`${this.config.username}:${this.config.password}`);

		const maxRetries = 3;
		const delays = [1000, 2000, 4000]; // Exponential backoff: 1s, 2s, 4s

		for (let attempt = 0; attempt <= maxRetries; attempt++) {
			const controller = new AbortController();
			const timeoutId = setTimeout(() => controller.abort(), this.config.timeout);

			try {
				const response = await fetch(url, {
					method,
					signal: controller.signal,
					headers: {
						Authorization: `Basic ${auth}`,
						"Content-Type": "application/xml; charset=utf-8",
						...options.headers,
					},
					...options,
				});

				// Non-transient errors: fail immediately
				if (!response.ok && [401, 403, 404].includes(response.status)) {
					return response;
				}

				// Success or non-retryable error
				if (response.ok || attempt === maxRetries) {
					return response;
				}

				// Transient error: retry after delay
				if (attempt < maxRetries) {
					await sleep(delays[attempt]);
					continue;
				}

				return response;
			} catch (error) {
				// Network errors (timeout, ECONNRESET, etc.) — retry
				if (attempt < maxRetries) {
					await sleep(delays[attempt]);
					continue;
				}
				throw error;
			} finally {
				clearTimeout(timeoutId);
			}
		}

		// Should never reach here, but TypeScript needs a return
		throw new Error(`Request failed after ${maxRetries} retries`);
	}

	async propfind(remotePath: string): Promise<WebDAVResource[]> {
		const response = await this.request("PROPFIND", remotePath, {
			headers: {
				Depth: "1",
			},
			body: `<?xml version="1.0" encoding="utf-8"?>
<D:propfind xmlns:D="DAV:">
  <D:prop>
    <D:displayname/>
    <D:getcontentlength/>
    <D:getlastmodified/>
    <D:getetag/>
    <D:resourcetype/>
  </D:prop>
</D:propfind>`,
		});

		if (!response.ok) {
			throw new Error(`PROPFIND failed: ${response.status} ${response.statusText}`);
		}

		const text = await response.text();
		return this.parsePropfind(text, remotePath);
	}

	async get(remotePath: string): Promise<Uint8Array> {
		const response = await this.request("GET", remotePath);

		if (!response.ok) {
			throw new Error(`GET failed: ${response.status} ${response.statusText}`);
		}

		const buffer = await response.arrayBuffer();
		return new Uint8Array(buffer);
	}

	async put(remotePath: string, data: Uint8Array): Promise<void> {
		const response = await this.request("PUT", remotePath, {
			headers: {
				"Content-Type": "application/octet-stream",
			},
			body: data.buffer as ArrayBuffer,
		});

		if (!response.ok) {
			throw new Error(`PUT failed: ${response.status} ${response.statusText}`);
		}
	}

	async mkcol(remotePath: string): Promise<void> {
		const response = await this.request("MKCOL", remotePath);

		if (!response.ok && response.status !== 405) {
			throw new Error(`MKCOL failed: ${response.status} ${response.statusText}`);
		}
	}

	async probe(): Promise<ServerCapabilities> {
		const response = await this.request("OPTIONS", "/", {
			headers: { Depth: "0" },
		});

		const davHeader = response.headers.get("DAV") || "";
		const allows = response.headers.get("Allow") || "";

		return {
			supportsEtag: davHeader.includes("1") || allows.includes("PUT"),
			supportsXMtime: false, // Will be refined based on server behavior
		};
	}

	private parsePropfind(xmlText: string, basePath: string): WebDAVResource[] {
		const parser = new DOMParser();
		const doc = parser.parseFromString(xmlText, "application/xml");
		const responses = doc.querySelectorAll("response, D\\:response");
		const resources: WebDAVResource[] = [];

		for (const response of responses) {
			const hrefEl = response.querySelector("href, D\\:href");
			const href = hrefEl?.textContent || "";

			// Skip the base collection itself (depth=1 includes it)
			const normalizedHref = href.replace(/\/$/, "");
			const normalizedBase = basePath.replace(/\/$/, "");
			if (normalizedHref === normalizedBase || normalizedHref === "" || normalizedHref === "/") {
				continue;
			}

			const prop = response.querySelector("prop, D\\:prop");
			if (!prop) continue;

			const isDir = !!prop.querySelector("resourcetype collection, D\\:resourcetype D\\:collection");
			const sizeText = prop.querySelector("getcontentlength, D\\:getcontentlength")?.textContent || "0";
			const mtimeText = prop.querySelector("getlastmodified, D\\:getlastmodified")?.textContent || "";
			const etag = prop.querySelector("getetag, D\\:getetag")?.textContent || undefined;

			const path = this.normalizeRemotePath(href, basePath);
			const size = parseInt(sizeText, 10) || 0;
			const mtime = mtimeText ? new Date(mtimeText).getTime() : 0;

			resources.push({ path, isDirectory: isDir, size, mtime, etag });
		}

		return resources;
	}

	private normalizeRemotePath(href: string, basePath: string): string {
		// Extract path from href, relative to basePath
		let path = href;
		
		// Remove base URL prefix if present
		if (path.startsWith(this.config.baseUrl)) {
			path = path.slice(this.config.baseUrl.length);
		}
		
		// Ensure leading slash
		if (!path.startsWith("/")) {
			path = "/" + path;
		}
		
		// Make relative to remoteRoot if provided
		if (basePath !== "/" && path.startsWith(basePath)) {
			path = path.slice(basePath.length);
		}
		
		// Remove leading slash for vault-relative paths
		if (path.startsWith("/")) {
			path = path.slice(1);
		}
		
		return path;
	}
}

function sleep(ms: number): Promise<void> {
	return new Promise((resolve) => setTimeout(resolve, ms));
}
