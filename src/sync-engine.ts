import type { Vault, TFile } from "obsidian";
import type { SyncSettings } from "./settings";
import type { FileSnapshot } from "./planner/snapshot";
import { normalizePath } from "./planner/snapshot";
import { shouldIgnore } from "./planner/ignore";
import { WebDAVClient } from "./transport/webdav-client";
import type { WebDAVResource } from "./transport/types";
import { computePlan, type SyncPlan } from "./planner/planner";
import type { SyncState } from "./state";

export interface FileMaps {
	local: Map<string, FileSnapshot>;
	remote: Map<string, FileSnapshot>;
}

export async function buildLocalFileMap(
	vault: Vault,
	settings: SyncSettings
): Promise<Map<string, FileSnapshot>> {
	const map = new Map<string, FileSnapshot>();
	const files = vault.getFiles();

	for (const file of files) {
		const path = normalizePath(file.path);

		if (shouldIgnore(path, settings.ignorePatterns)) {
			continue;
		}

		map.set(path, {
			path,
			size: file.stat.size,
			mtime: file.stat.mtime,
		});
	}

	return map;
}

export async function buildRemoteFileMap(
	client: WebDAVClient,
	remoteRoot: string
): Promise<Map<string, FileSnapshot>> {
	const map = new Map<string, FileSnapshot>();
	await collectRemoteFiles(client, remoteRoot, map);
	return map;
}

async function collectRemoteFiles(
	client: WebDAVClient,
	remotePath: string,
	map: Map<string, FileSnapshot>
): Promise<void> {
	const resources = await client.propfind(remotePath);

	for (const resource of resources) {
		if (resource.isDirectory) {
			// Recurse into subdirectories
			const subPath = remotePath.endsWith("/")
				? remotePath + resource.path
				: remotePath + "/" + resource.path;
			await collectRemoteFiles(client, subPath, map);
		} else {
			map.set(resource.path, {
				path: resource.path,
				size: resource.size,
				mtime: resource.mtime,
				etag: resource.etag,
			});
		}
	}
}

export function stateToMap(state: SyncState): Map<string, FileSnapshot> {
	const map = new Map<string, FileSnapshot>();
	for (const [path, snapshot] of Object.entries(state.snapshots)) {
		map.set(path, snapshot);
	}
	return map;
}

export function mapToState(
	map: Map<string, FileSnapshot>,
	existingState: SyncState
): SyncState {
	const snapshots: Record<string, FileSnapshot> = {};
	for (const [path, snapshot] of map) {
		snapshots[path] = snapshot;
	}
	return {
		...existingState,
		snapshots,
	};
}

export async function buildSyncPlan(
	vault: Vault,
	client: WebDAVClient,
	settings: SyncSettings,
	state: SyncState
): Promise<SyncPlan> {
	const local = await buildLocalFileMap(vault, settings);
	const remote = await buildRemoteFileMap(client, settings.remoteRoot);
	const snapshot = stateToMap(state);
	return computePlan(local, remote, snapshot);
}
