import type { FileSnapshot } from "./snapshot";

export interface SyncPlan {
	pulls: PullOp[];
	pushes: PushOp[];
	conflicts: ConflictOp[];
	skips: SkipOp[];
}

export interface PullOp {
	type: "pull";
	path: string;
	reason: string;
}

export interface PushOp {
	type: "push";
	path: string;
	reason: string;
}

export interface ConflictOp {
	type: "conflict";
	path: string;
	localSnapshot: FileSnapshot | null;
	remoteSnapshot: FileSnapshot;
}

export interface SkipOp {
	type: "skip";
	path: string;
	reason: string;
}

export function computePlan(
	local: Map<string, FileSnapshot>,
	remote: Map<string, FileSnapshot>,
	snapshot: Map<string, FileSnapshot>
): SyncPlan {
	const plan: SyncPlan = {
		pulls: [],
		pushes: [],
		conflicts: [],
		skips: [],
	};

	// Collect all unique paths
	const allPaths = new Set<string>([
		...local.keys(),
		...remote.keys(),
		...snapshot.keys(),
	]);

	for (const path of allPaths) {
		const localSnap = local.get(path) || null;
		const remoteSnap = remote.get(path) || null;
		const lastSnap = snapshot.get(path) || null;

		// Skip directories
		if (localSnap?.path.endsWith("/") || remoteSnap?.path.endsWith("/")) {
			continue;
		}

		// Neither side has it anymore — skip (MVP: no auto-delete)
		if (!localSnap && !remoteSnap) {
			plan.skips.push({ type: "skip", path, reason: "File no longer exists on either side" });
			continue;
		}

		// New remote file — pull
		if (!localSnap && remoteSnap) {
			plan.pulls.push({ type: "pull", path, reason: "New file on remote" });
			continue;
		}

		// New local file — push
		if (localSnap && !remoteSnap) {
			plan.pushes.push({ type: "push", path, reason: "New file locally" });
			continue;
		}

		// Both sides exist — compare
		// At this point, both localSnap and remoteSnap are non-null
		const localFile = localSnap!;
		const remoteFile = remoteSnap!;
		const localChanged = !lastSnap || !snapshotsEqual(localFile, lastSnap);
		const remoteChanged = !lastSnap || !snapshotsEqual(remoteFile, lastSnap);

		if (!localChanged && !remoteChanged) {
			plan.skips.push({ type: "skip", path, reason: "No changes since last sync" });
		} else if (localChanged && !remoteChanged) {
			plan.pushes.push({ type: "push", path, reason: "Local file changed" });
		} else if (!localChanged && remoteChanged) {
			plan.pulls.push({ type: "pull", path, reason: "Remote file changed" });
		} else {
			// Both changed — conflict
			plan.conflicts.push({
				type: "conflict",
				path,
				localSnapshot: localFile,
				remoteSnapshot: remoteFile,
			});
		}
	}

	return plan;
}

function snapshotsEqual(a: FileSnapshot, b: FileSnapshot): boolean {
	if (a.etag && b.etag) {
		return a.etag === b.etag;
	}
	return a.size === b.size && a.mtime === b.mtime;
}
