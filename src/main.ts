import { Plugin, Notice } from "obsidian";
import { DEFAULT_SETTINGS, type SyncSettings } from "./settings";
import { SettingsTab } from "./ui/settings-tab";
import { WebDAVClient } from "./transport/webdav-client";
import { previewSyncCommand } from "./commands/preview";
import { pullCommand } from "./commands/pull";
import { pushCommand } from "./commands/push";

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

		this.addCommand({
			id: "preview-sync",
			name: "Preview Sync Plan",
			callback: async () => {
				await previewSyncCommand(this);
			},
		});

		this.addCommand({
			id: "pull-from-remote",
			name: "Pull from Remote",
			callback: async () => {
				await pullCommand(this);
			},
		});

		this.addCommand({
			id: "push-to-remote",
			name: "Push to Remote",
			callback: async () => {
				await pushCommand(this);
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
