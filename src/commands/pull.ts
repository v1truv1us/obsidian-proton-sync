import { Notice, type Vault, TFile } from "obsidian";
import type WebDAVSyncPlugin from "../main";
import { WebDAVClient } from "../transport/webdav-client";
import { buildSyncPlan, buildLocalFileMap, buildRemoteFileMap, stateToMap, mapToState } from "../sync-engine";
import { loadState, saveState } from "../state";
import type { FileSnapshot } from "../planner/snapshot";
import { normalizePath } from "../planner/snapshot";

export interface PullResult {
	success: boolean;
	pulled: number;
	created: number;
	conflicts: number;
	errors: Array<{ path: string; message: string }>;
}

export async function pullCommand(plugin: WebDAVSyncPlugin): Promise<PullResult> {
	const { webdavUrl, username, password, remoteRoot, timeoutMs, deviceId } = plugin.settings;

	const result: PullResult = {
		success: true,
		pulled: 0,
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

		// Execute pulls
		for (const op of plan.pulls) {
			try {
				await pullFile(plugin.app.vault, client, remoteRoot, op.path);
				result.pulled++;
			} catch (error) {
				const message = error instanceof Error ? error.message : String(error);
				result.errors.push({ path: op.path, message });
			}
		}

		// Execute conflict copies
		for (const op of plan.conflicts) {
			try {
				await createConflictCopy(plugin.app.vault, client, remoteRoot, op.path, deviceId);
				result.conflicts++;
			} catch (error) {
				const message = error instanceof Error ? error.message : String(error);
				result.errors.push({ path: op.path, message });
			}
		}

		// Update state snapshots with current remote state
		const remoteMap = await buildRemoteFileMap(client, remoteRoot);
		const newState = mapToState(remoteMap, state);
		await saveState(plugin, newState);

		// Show summary
		const summary = `Pull complete: ${result.pulled} pulled, ${result.created} created, ${result.conflicts} conflicts, ${result.errors.length} errors`;
		new Notice(summary);

		result.success = result.errors.length === 0;
		return result;
	} catch (error) {
		const message = error instanceof Error ? error.message : String(error);
		new Notice(`Pull failed: ${message}`);
		result.success = false;
		return result;
	}
}

async function pullFile(vault: Vault, client: WebDAVClient, remoteRoot: string, path: string): Promise<void> {
	const remotePath = remoteRoot.endsWith("/") ? remoteRoot + path : remoteRoot + "/" + path;
	const data = await client.get(remotePath);

	// Ensure parent directory exists
	const parts = path.split("/");
	if (parts.length > 1) {
		parts.pop();
		const folderPath = parts.join("/");
		const folder = vault.getAbstractFileByPath(folderPath);
		if (!folder) {
			await vault.createFolder(folderPath);
		}
	}

	const existingFile = vault.getAbstractFileByPath(path);
	if (existingFile && existingFile instanceof TFile) {
		// File exists — update it
		await vault.modifyBinary(existingFile, data.buffer as ArrayBuffer);
	} else {
		// Create new file
		await vault.createBinary(path, data.buffer as ArrayBuffer);
	}
}

async function createConflictCopy(
	vault: Vault,
	client: WebDAVClient,
	remoteRoot: string,
	path: string,
	deviceId: string
): Promise<void> {
	const remotePath = remoteRoot.endsWith("/") ? remoteRoot + path : remoteRoot + "/" + path;
	const data = await client.get(remotePath);

	const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
	const baseName = path.replace(/\.[^/.]+$/, "");
	const ext = path.match(/\.[^/.]+$/)?.[0] || "";
	const conflictName = `${baseName}.conflict-${deviceId || "unknown"}-${timestamp}${ext}`;

	// Ensure parent directory exists
	const parts = conflictName.split("/");
	if (parts.length > 1) {
		parts.pop();
		const folderPath = parts.join("/");
		const folder = vault.getAbstractFileByPath(folderPath);
		if (!folder) {
			await vault.createFolder(folderPath);
		}
	}

	await vault.createBinary(conflictName, data.buffer as ArrayBuffer);
}
