export interface FileSnapshot {
	path: string;
	size: number;
	mtime: number;
	etag?: string;
	hash?: string;
}

export function normalizePath(path: string): string {
	// Remove leading slash
	let normalized = path.startsWith("/") ? path.slice(1) : path;

	// Split into segments and resolve . and ..
	const segments = normalized.split("/");
	const resolved: string[] = [];

	for (const segment of segments) {
		if (segment === "" || segment === ".") {
			continue;
		}
		if (segment === "..") {
			resolved.pop();
		} else {
			resolved.push(segment);
		}
	}

	return resolved.join("/");
}

export function snapshotsEqual(a: FileSnapshot, b: FileSnapshot): boolean {
	if (a.etag && b.etag) {
		return a.etag === b.etag;
	}
	return a.size === b.size && a.mtime === b.mtime;
}
