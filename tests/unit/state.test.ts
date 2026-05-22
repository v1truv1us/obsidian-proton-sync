import { describe, it, expect, vi } from "vitest";
import { loadState, saveState, createEmptyState } from "../../src/state";

describe("SyncState", () => {
	it("should create empty state", () => {
		const state = createEmptyState();
		expect(state.version).toBe(1);
		expect(state.lastSyncAt).toBe(0);
		expect(state.snapshots).toEqual({});
	});

	it("should load empty state when no data", async () => {
		const plugin = {
			loadData: vi.fn().mockResolvedValue(null),
		} as unknown as import("obsidian").Plugin;

		const state = await loadState(plugin);
		expect(state.version).toBe(1);
		expect(Object.keys(state.snapshots)).toHaveLength(0);
	});

	it("should load existing state", async () => {
		const plugin = {
			loadData: vi.fn().mockResolvedValue({
				syncState: {
					version: 1,
					lastSyncAt: 12345,
					snapshots: {
						"notes.md": { path: "notes.md", size: 100, mtime: 1000 },
					},
				},
			}),
		} as unknown as import("obsidian").Plugin;

		const state = await loadState(plugin);
		expect(state.version).toBe(1);
		expect(state.snapshots["notes.md"].size).toBe(100);
	});

	it("should throw on unsupported version", async () => {
		const plugin = {
			loadData: vi.fn().mockResolvedValue({
				syncState: {
					version: 999,
					lastSyncAt: 0,
					snapshots: {},
				},
			}),
		} as unknown as import("obsidian").Plugin;

		await expect(loadState(plugin)).rejects.toThrow("Unsupported sync state version");
	});

	it("should save state", async () => {
		const saveData = vi.fn().mockResolvedValue(undefined);
		const loadData = vi.fn().mockResolvedValue({});
		const plugin = {
			loadData,
			saveData,
		} as unknown as import("obsidian").Plugin;

		const state = createEmptyState();
		await saveState(plugin, state);

		expect(saveData).toHaveBeenCalled();
		const saved = saveData.mock.calls[0][0];
		expect(saved.syncState.version).toBe(1);
		expect(saved.syncState.lastSyncAt).toBeGreaterThan(0);
	});
});
