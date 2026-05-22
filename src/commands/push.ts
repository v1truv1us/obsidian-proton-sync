import { Notice, type Vault, TFile } from "obsidian";
import type WebDAVSyncPlugin from "../main";
import { WebDAVClient } from "../transport/webdav-client";
import { buildSyncPlan, buildLocalFileMap, buildRemoteFileMap, stateToMap, mapToState } from "../sync-engine";
import { loadState, saveState } from "../state";

export interface PushResult {
	success: boolean;
	pushed: number;
	created: number;
	conflicts: number;
	errors: Array<{ path: string; message: string }>;
}

export async function pushCommand(plugin: WebDAVSyncPlugin): Promise<PushResult> {
	const { webdavUrl, username, password, remoteRoot, timeoutMs, deviceId } = plugin.settings;

	const result: PushResult = {
		success: true,
		pushed: 0,
		created: 0,
		conflicts: 0,
		errors: [],
	};

	if (!webdavUrl) {
		new Notice("WebDAV URL is not configured. Please check settings.");
		result.success = false;
		return result;
	}

	const client = new WebDAVClient({
		baseUrl: webdavUrl,
		username,
		password,
		timeout: timeoutMs,
	});

	try {
		const state = await loadState(plugin);
		const plan = await buildSyncPlan(plugin.app.vault, client, plugin.settings, state);

		// Execute pushes
		for (const op of plan.pushes) {
			try {
				await pushFile(plugin.app.vault, client, remoteRoot, op.path);
				result.pushed++;
			} catch (error) {
				const message = error instanceof Error ? error.message : String(error);
				result.errors.push({ path: op.path, message });
			}
		}

		// Execute conflict copies on remote
		for (const op of plan.conflicts) {
			try {
				await createRemoteConflictCopy(plugin.app.vault, client, remoteRoot, op.path, deviceId);
				result.conflicts++;
			} catch (error) {
				const message = error instanceof Error ? error.message : String(error);
				result.errors.push({ path: op.path, message });
			}
		}

		// Update state snapshots with current local state
		const localMap = await buildLocalFileMap(plugin.app.vault, plugin.settings);
		const newState = mapToState(localMap, state);
		await saveState(plugin, newState);

		// Show summary
		const summary = `Push complete: ${result.pushed} pushed, ${result.created} created, ${result.conflicts} conflicts, ${result.errors.length} errors`;
		new Notice(summary);

		result.success = result.errors.length === 0;
		return result;
	} catch (error) {
		const message = error instanceof Error ? error.message : String(error);
		new Notice(`Push failed: ${message}`);
		result.success = false;
		return result;
	}
}

async function pushFile(vault: Vault, client: WebDAVClient, remoteRoot: string, path: string): Promise<void> {
	const file = vault.getAbstractFileByPath(path);
	if (!file || !(file instanceof TFile)) {
		throw new Error(`File not found: ${path}`);
	}

	const buffer = await vault.readBinary(file);
	const data = new Uint8Array(buffer);
	const remotePath = remoteRoot.endsWith("/") ? remoteRoot + path : remoteRoot + "/" + path;

	// Ensure parent directories exist
	const parts = path.split("/");
	if (parts.length > 1) {
		let currentPath = remoteRoot;
		for (let i = 0; i < parts.length - 1; i++) {
			currentPath = currentPath.endsWith("/") ? currentPath + parts[i] : currentPath + "/" + parts[i];
			try {
				await client.mkcol(currentPath);
			} catch {
				// Directory may already exist
			}
		}
	}

	await client.put(remotePath, data);
}

async function createRemoteConflictCopy(
	vault: Vault,
	client: WebDAVClient,
	remoteRoot: string,
	path: string,
	deviceId: string
): Promise<void> {
	const file = vault.getAbstractFileByPath(path);
	if (!file || !(file instanceof TFile)) {
		throw new Error(`File not found: ${path}`);
	}

	const buffer = await vault.readBinary(file);
	const data = new Uint8Array(buffer);

	const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
	const baseName = path.replace(/\.[^/.]+$/, "");
	const ext = path.match(/\.[^/.]+$/)?.[0] || "";
	const conflictName = `${baseName}.conflict-${deviceId || "unknown"}-${timestamp}${ext}`;
	const remotePath = remoteRoot.endsWith("/") ? remoteRoot + conflictName : remoteRoot + "/" + conflictName;

	await client.put(remotePath, data);
}
