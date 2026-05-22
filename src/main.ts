import { Plugin } from "obsidian";

export default class WebDAVSyncPlugin extends Plugin {
	async onload(): Promise<void> {
		console.log("Proton Drive Sync plugin loaded");
	}

	onunload(): void {
		console.log("Proton Drive Sync plugin unloaded");
	}
}
