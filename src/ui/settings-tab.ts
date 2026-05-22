import { App, PluginSettingTab, Setting } from "obsidian";
import type WebDAVSyncPlugin from "../main";

export class SettingsTab extends PluginSettingTab {
	plugin: WebDAVSyncPlugin;

	constructor(app: App, plugin: WebDAVSyncPlugin) {
		super(app, plugin);
		this.plugin = plugin;
	}

	display(): void {
		const { containerEl } = this;
		containerEl.empty();

		containerEl.createEl("h2", { text: "Proton Drive Sync Settings" });

		new Setting(containerEl)
			.setName("WebDAV URL")
			.setDesc("The URL of your WebDAV server (e.g., http://localhost:8080)")
			.addText((text) =>
				text
					.setPlaceholder("http://localhost:8080")
					.setValue(this.plugin.settings.webdavUrl)
					.onChange(async (value) => {
						this.plugin.settings.webdavUrl = value;
						await this.plugin.saveSettings();
					})
			);

		new Setting(containerEl)
			.setName("Username")
			.setDesc("Your WebDAV username")
			.addText((text) =>
				text
					.setPlaceholder("username")
					.setValue(this.plugin.settings.username)
					.onChange(async (value) => {
						this.plugin.settings.username = value;
						await this.plugin.saveSettings();
					})
			);

		new Setting(containerEl)
			.setName("Password")
			.setDesc("Your WebDAV password")
			.addText((text) => {
				text.inputEl.type = "password";
				text
					.setPlaceholder("password")
					.setValue(this.plugin.settings.password)
					.onChange(async (value) => {
						this.plugin.settings.password = value;
						await this.plugin.saveSettings();
					});
			});

		new Setting(containerEl)
			.setName("Remote root path")
			.setDesc("The root directory on the remote server (e.g., /vault)")
			.addText((text) =>
				text
					.setPlaceholder("/")
					.setValue(this.plugin.settings.remoteRoot)
					.onChange(async (value) => {
						this.plugin.settings.remoteRoot = value || "/";
						await this.plugin.saveSettings();
					})
			);

		new Setting(containerEl)
			.setName("Device ID")
			.setDesc("A unique identifier for this device (used in conflict file names)")
			.addText((text) =>
				text
					.setPlaceholder("macbook-pro")
					.setValue(this.plugin.settings.deviceId)
					.onChange(async (value) => {
						this.plugin.settings.deviceId = value;
						await this.plugin.saveSettings();
					})
			);

		new Setting(containerEl)
			.setName("Connection timeout (ms)")
			.setDesc("Timeout for WebDAV requests in milliseconds")
			.addText((text) => {
				text.inputEl.type = "number";
				text
					.setPlaceholder("30000")
					.setValue(String(this.plugin.settings.timeoutMs))
					.onChange(async (value) => {
						const num = parseInt(value, 10);
						this.plugin.settings.timeoutMs = isNaN(num) ? 30000 : num;
						await this.plugin.saveSettings();
					});
			});

		new Setting(containerEl)
			.setName("Ignore patterns")
			.setDesc("Comma-separated glob patterns for files to ignore (e.g., *.tmp, .git/**)")
			.addText((text) =>
				text
					.setPlaceholder("*.tmp, .git/**")
					.setValue(this.plugin.settings.ignorePatterns.join(", "))
					.onChange(async (value) => {
						this.plugin.settings.ignorePatterns = value
							.split(",")
							.map((p) => p.trim())
							.filter((p) => p.length > 0);
						await this.plugin.saveSettings();
					})
			);
	}
}
