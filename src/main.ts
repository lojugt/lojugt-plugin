import { Plugin } from "obsidian";
import { DenoKVPublisherSettings, DEFAULT_SETTINGS, DenoKVPublisherSettingTab } from "./settings";
import { DenoKVPublisher } from "./publisher";

export default class DenoKVPublisherPlugin extends Plugin {
	settings: DenoKVPublisherSettings;
	publisher: DenoKVPublisher;

	async onload() {
		console.log("Loading LOJU Plugin");

		await this.loadSettings();

		this.publisher = new DenoKVPublisher(this);

		// Add Ribbon Icon (menu item) with grape emoji
		const ribbonIconEl = this.addRibbonIcon("share-2", "Send to LOJU", async () => {
			await this.publisher.publishAll();
		});
		
		ribbonIconEl.empty();
		ribbonIconEl.createSpan({ text: "🍇", cls: "loju-ribbon-grape" });
		ribbonIconEl.addClass("loju-publisher-ribbon-class");

		// Add command palette option
		this.addCommand({
			id: "send-to-loju",
			name: "Send to LOJU",
			callback: async () => {
				await this.publisher.publishAll();
			},
		});

		this.addCommand({
			id: "wipe-loju",
			name: "Wipe remote LOJU database",
			callback: async () => {
				if (confirm("WARNING: Are you sure you want to wipe the remote LOJU database? This will permanently delete all published notes from the server.")) {
					await this.publisher.wipeAll();
				}
			},
		});

		// Add settings tab
		this.addSettingTab(new DenoKVPublisherSettingTab(this.app, this));
	}

	onunload() {
		console.log("Unloading LOJU Plugin");
	}

	async loadSettings() {
		this.settings = Object.assign({}, DEFAULT_SETTINGS, await this.loadData());
	}

	async saveSettings() {
		await this.saveData(this.settings);
	}
}
