export interface SyncSettings {
	webdavUrl: string;
	username: string;
	password: string;
	remoteRoot: string;
	deviceId: string;
	timeoutMs: number;
	ignorePatterns: string[];
}

export const DEFAULT_SETTINGS: SyncSettings = {
	webdavUrl: "",
	username: "",
	password: "",
	remoteRoot: "/",
	deviceId: "",
	timeoutMs: 30000,
	ignorePatterns: [],
};
