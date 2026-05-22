import { Notice } from "obsidian";
import type WebDAVSyncPlugin from "../main";
import { WebDAVClient } from "../transport/webdav-client";
import { buildSyncPlan } from "../sync-engine";
import { PreviewModal } from "../ui/preview-modal";
import { loadState } from "../state";

export async function previewSyncCommand(plugin: WebDAVSyncPlugin): Promise<void> {
	const { webdavUrl, username, password, remoteRoot, timeoutMs } = plugin.settings;

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

		const state = await loadState(plugin);
		const plan = await buildSyncPlan(plugin.app.vault, client, plugin.settings, state);

		new PreviewModal(plugin.app, plan).open();
	} catch (error) {
		const message = error instanceof Error ? error.message : String(error);
		new Notice(`Preview failed: ${message}`);
	}
}
