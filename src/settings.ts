import { App, PluginSettingTab, Setting, ButtonComponent } from "obsidian";
import type DenoKVPublisherPlugin from "./main";

export interface PublishedNoteInfo {
	path: string;
	title: string;
	mtime: number;
}

export interface DenoKVPublisherSettings {
	endpointUrl: string;
	authToken: string;
	publishedNotes: Record<string, PublishedNoteInfo>;
}

export const DEFAULT_SETTINGS: DenoKVPublisherSettings = {
	endpointUrl: "",
	authToken: "",
	publishedNotes: {},
};

export class DenoKVPublisherSettingTab extends PluginSettingTab {
	plugin: DenoKVPublisherPlugin;

	constructor(app: App, plugin: DenoKVPublisherPlugin) {
		super(app, plugin);
		this.plugin = plugin;
	}

	display(): void {
		const { containerEl } = this;
		containerEl.empty();

		containerEl.createEl("h2", { text: "LOJU Settings" });

		new Setting(containerEl)
			.setName("Endpoint URL")
			.setDesc("The HTTP URL to ingest your notes (e.g. your LOJU app endpoint)")
			.addText((text) =>
				text
					.setPlaceholder("https://loju.ca/api/ingest")
					.setValue(this.plugin.settings.endpointUrl)
					.onChange(async (value) => {
						this.plugin.settings.endpointUrl = value.trim();
						await this.plugin.saveSettings();
					})
			);

		new Setting(containerEl)
			.setName("Authorization Token")
			.setDesc("The bearer token required to authenticate with your LOJU server")
			.addText((text) => {
				text.inputEl.type = "password";
				text
					.setPlaceholder("Enter auth token")
					.setValue(this.plugin.settings.authToken)
					.onChange(async (value) => {
						this.plugin.settings.authToken = value.trim();
						await this.plugin.saveSettings();
					});
			});

		// Collapsible Advanced Settings section
		const advancedDetails = containerEl.createEl("details");
		advancedDetails.style.marginTop = "2rem";
		advancedDetails.style.padding = "1rem";
		advancedDetails.style.border = "1px solid var(--background-modifier-border)";
		advancedDetails.style.borderRadius = "6px";
		advancedDetails.style.backgroundColor = "var(--background-secondary)";

		const advancedSummary = advancedDetails.createEl("summary", { text: "Advanced Settings & Troubleshooting" });
		advancedSummary.style.cursor = "pointer";
		advancedSummary.style.fontWeight = "600";
		advancedSummary.style.color = "var(--text-muted)";
		advancedSummary.style.outline = "none";

		const advancedContainer = advancedDetails.createEl("div");
		advancedContainer.style.marginTop = "1rem";

		const numPublished = Object.keys(this.plugin.settings.publishedNotes).length;
		
		new Setting(advancedContainer)
			.setName("Tracked Notes")
			.setDesc(`Currently publishing ${numPublished} note(s).`)
			.addButton((btn: ButtonComponent) => {
				btn.setButtonText("Clear Local Tracking Cache")
					.setWarning()
					.setTooltip("This forgets which notes were published locally. It does not delete notes on LOJU.")
					.onClick(async () => {
						if (confirm("Are you sure you want to clear the local tracking cache? The next publish will re-upload all publish:true notes.")) {
							this.plugin.settings.publishedNotes = {};
							await this.plugin.saveSettings();
							this.display();
						}
					});
			});

		new Setting(advancedContainer)
			.setName("Wipe Remote LOJU Database")
			.setDesc("Deletes all notes currently stored in the remote LOJU database and clears local tracking cache.")
			.addButton((btn: ButtonComponent) => {
				btn.setButtonText("Wipe Database")
					.setWarning()
					.setTooltip("Destructive action. Wipes the remote LOJU database.")
					.onClick(async () => {
						if (confirm("WARNING: Are you sure you want to wipe the remote LOJU database? This will permanently delete all published notes from the server.")) {
							await this.plugin.publisher.wipeAll();
							this.display();
						}
					});
			});

		// Footer with grape emoji
		const footerEl = containerEl.createEl("div", { cls: "loju-settings-footer" });
		footerEl.style.marginTop = "3rem";
		footerEl.style.textAlign = "center";
		footerEl.style.fontSize = "0.9em";
		footerEl.style.color = "var(--text-muted)";
		footerEl.createEl("span", { text: "🍇 Thank you!" });
	}
}
