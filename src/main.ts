import { Plugin, Notice } from "obsidian";
import { DEFAULT_SETTINGS, type SyncSettings } from "./settings";
import { SettingsTab } from "./ui/settings-tab";
import { WebDAVClient } from "./transport/webdav-client";

export default class WebDAVSyncPlugin extends Plugin {
	settings: SyncSettings;

	async onload(): Promise<void> {
		await this.loadSettings();

		this.addSettingTab(new SettingsTab(this.app, this));

		this.addCommand({
			id: "validate-connection",
			name: "Validate Connection",
			callback: async () => {
				await this.validateConnection();
			},
		});

		console.log("Proton Drive Sync plugin loaded");
	}

	onunload(): void {
		console.log("Proton Drive Sync plugin unloaded");
	}

	async loadSettings(): Promise<void> {
		this.settings = Object.assign({}, DEFAULT_SETTINGS, await this.loadData());
	}

	async saveSettings(): Promise<void> {
		await this.saveData(this.settings);
	}

	async validateConnection(): Promise<void> {
		const { webdavUrl, username, password, remoteRoot, timeoutMs } = this.settings;

		if (!webdavUrl) {
			new Notice("WebDAV URL is not configured. Please check settings.");
			return;
		}

		try {
			const client = new WebDAVClient({
				baseUrl: webdavUrl,
				username,
				password,
				timeout: timeoutMs,
			});

			await client.propfind(remoteRoot || "/");
			new Notice("Connection valid! WebDAV server is reachable.");
		} catch (error) {
			const message = error instanceof Error ? error.message : String(error);
			if (message.includes("401")) {
				new Notice("Authentication failed. Check username and password.");
			} else if (message.includes("timeout") || message.includes("abort")) {
				new Notice(`Connection timed out after ${timeoutMs}ms. Check URL and network.`);
			} else {
				new Notice(`Connection failed: ${message}`);
			}
		}
	}
}
