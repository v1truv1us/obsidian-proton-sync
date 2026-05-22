import { Modal, type App } from "obsidian";
import type { SyncPlan } from "../planner/planner";

export class PreviewModal extends Modal {
	private plan: SyncPlan;

	constructor(app: App, plan: SyncPlan) {
		super(app);
		this.plan = plan;
	}

	onOpen(): void {
		const { contentEl } = this;
		contentEl.empty();

		contentEl.createEl("h2", { text: "Sync Preview" });

		const total = this.plan.pulls.length + this.plan.pushes.length + this.plan.conflicts.length + this.plan.skips.length;

		// Summary
		const summary = contentEl.createEl("div", { cls: "sync-preview-summary" });
		summary.createEl("p", {
			text: `Total files: ${total} | Pull: ${this.plan.pulls.length} | Push: ${this.plan.pushes.length} | Conflict: ${this.plan.conflicts.length} | Skip: ${this.plan.skips.length}`,
		});

		// Operations list
		const list = contentEl.createEl("div", { cls: "sync-preview-list" });
		list.style.maxHeight = "400px";
		list.style.overflow = "auto";

		const addSection = (title: string, items: { path: string; reason?: string }[], cls: string) => {
			if (items.length === 0) return;
			const section = list.createEl("div", { cls: `sync-section ${cls}` });
			section.createEl("h3", { text: `${title} (${items.length})` });
			const ul = section.createEl("ul");
			for (const item of items) {
				const li = ul.createEl("li");
				li.createEl("code", { text: item.path });
				if (item.reason) {
					li.createEl("span", { text: ` — ${item.reason}`, cls: "sync-reason" });
				}
			}
		};

		addSection("Pull from remote", this.plan.pulls, "sync-pull");
		addSection("Push to remote", this.plan.pushes, "sync-push");
		addSection("Conflicts", this.plan.conflicts, "sync-conflict");
		addSection("Skip (no change)", this.plan.skips, "sync-skip");

		// Close button
		contentEl.createEl("button", { text: "Close" }).addEventListener("click", () => {
			this.close();
		});
	}

	onClose(): void {
		this.contentEl.empty();
	}
}
