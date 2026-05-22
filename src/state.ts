import type { Plugin } from "obsidian";
import type { FileSnapshot } from "./planner/snapshot";

export interface SyncState {
	version: number;
	lastSyncAt: number;
	snapshots: Record<string, FileSnapshot>;
}

const CURRENT_VERSION = 1;

export function createEmptyState(): SyncState {
	return {
		version: CURRENT_VERSION,
		lastSyncAt: 0,
		snapshots: {},
	};
}

export async function loadState(plugin: Plugin): Promise<SyncState> {
	const data = await plugin.loadData();

	if (!data || !data.syncState) {
		return createEmptyState();
	}

	const state = data.syncState as SyncState;

	if (state.version !== CURRENT_VERSION) {
		// Future: migration logic here
		throw new Error(
			`Unsupported sync state version: ${state.version}. Expected: ${CURRENT_VERSION}. Please reset sync state in settings.`
		);
	}

	return state;
}

export async function saveState(plugin: Plugin, state: SyncState): Promise<void> {
	const data = await plugin.loadData() || {};
	data.syncState = {
		...state,
		version: CURRENT_VERSION,
		lastSyncAt: Date.now(),
	};
	await plugin.saveData(data);
}
