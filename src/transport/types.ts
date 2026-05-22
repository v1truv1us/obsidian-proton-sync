export interface WebDAVConfig {
	baseUrl: string;
	username: string;
	password: string;
	timeout: number;
}

export interface WebDAVResource {
	path: string;
	isDirectory: boolean;
	size: number;
	mtime: number;
	etag?: string;
}

export interface ServerCapabilities {
	supportsEtag: boolean;
	supportsXMtime: boolean;
}
