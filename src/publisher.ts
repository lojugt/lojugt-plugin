import { Notice, TFile, requestUrl, getAllTags } from "obsidian";
import type DenoKVPublisherPlugin from "./main";

export class DenoKVPublisher {
	plugin: DenoKVPublisherPlugin;

	constructor(plugin: DenoKVPublisherPlugin) {
		this.plugin = plugin;
	}

	async publishAll(): Promise<void> {
		const { settings } = this.plugin;

		if (!settings.endpointUrl) {
			new Notice("LOJU: Please configure your Endpoint URL in the settings.");
			return;
		}

		new Notice("Checking notes for updates...");

		const allFiles = this.plugin.app.vault.getMarkdownFiles();
		const currentVaultPaths = new Set(allFiles.map((f) => f.path));

		const toPublish: TFile[] = [];
		const toUnpublish: { path: string; title: string }[] = [];

		// 1. Identify new/modified notes to publish and notes to unpublish
		for (const file of allFiles) {
			const cache = this.plugin.app.metadataCache.getFileCache(file);
			const frontmatter = cache?.frontmatter;

			// Check if publish: true (accept boolean or equivalent string/number)
			const pubVal = frontmatter?.publish;
			const isPublishEnabled =
				pubVal === true ||
				pubVal === "true" ||
				pubVal === 1 ||
				pubVal === "yes" ||
				(Array.isArray(pubVal) && (pubVal.includes("true") || pubVal.includes(true) || pubVal.includes("yes")));

			const tracked = settings.publishedNotes[file.path];

			if (isPublishEnabled) {
				const isNew = !tracked;
				const isModified = tracked && file.stat.mtime > tracked.mtime;

				if (isNew || isModified) {
					toPublish.push(file);
				}
			} else {
				// If not publish: true but we previously tracked it, we need to unpublish it
				if (tracked) {
					toUnpublish.push({
						path: file.path,
						title: tracked.title || file.basename,
					});
				}
			}
		}

		// 2. Identify deleted notes (tracked locally but no longer in vault)
		for (const path of Object.keys(settings.publishedNotes)) {
			if (!currentVaultPaths.has(path)) {
				const tracked = settings.publishedNotes[path];
				toUnpublish.push({
					path: path,
					title: tracked.title || "",
				});
			}
		}

		const totalTasks = toPublish.length + toUnpublish.length;
		if (totalTasks === 0) {
			new Notice("LOJU: Everything is up to date!");
			return;
		}

		new Notice(`Syncing ${totalTasks} change(s) to LOJU...`);

		let successPublishCount = 0;
		let successUnpublishCount = 0;
		let errorCount = 0;

		const authHeader = settings.authToken ? `Bearer ${settings.authToken}` : "";

		// 3. Process unpublish requests
		for (const note of toUnpublish) {
			try {
				const response = await requestUrl({
					url: settings.endpointUrl,
					method: "POST",
					headers: {
						"Content-Type": "application/json",
						"Authorization": authHeader,
					},
					body: JSON.stringify({
						action: "unpublish",
						path: note.path,
						title: note.title,
					}),
				});

				if (response.status >= 200 && response.status < 300) {
					delete settings.publishedNotes[note.path];
					successUnpublishCount++;
				} else {
					console.error(`Failed to unpublish ${note.path}: status ${response.status}`, response.text);
					errorCount++;
				}
			} catch (err) {
				console.error(`Error unpublishing ${note.path}:`, err);
				errorCount++;
			}
		}

		// 4. Process publish/update requests
		for (const file of toPublish) {
			try {
				let cache = this.plugin.app.metadataCache.getFileCache(file);
				let frontmatter = cache ? { ...cache.frontmatter } : {};
				let firstPublishedVal = frontmatter.first_published;
				let mtime = file.stat.mtime;

				if (!firstPublishedVal) {
					firstPublishedVal = new Date().toISOString();
					await this.plugin.app.fileManager.processFrontMatter(file, (fm) => {
						if (!fm.first_published) {
							fm.first_published = firstPublishedVal;
						}
					});

					// Wait a moment for Obsidian to update file stat & cache
					await new Promise((resolve) => setTimeout(resolve, 100));

					const nextCache = this.plugin.app.metadataCache.getFileCache(file);
					if (nextCache) {
						cache = nextCache;
						frontmatter = { ...nextCache.frontmatter };
					}
					frontmatter.first_published = firstPublishedVal;
					mtime = file.stat.mtime;
				}

				const content = await this.plugin.app.vault.read(file);
				const tags = cache ? getAllTags(cache) || [] : [];
				const cleanTags = tags.map((t) => t.replace(/^#/, ""));

				const payload = {
					action: "publish",
					path: file.path,
					title: file.basename,
					content: content,
					frontmatter: frontmatter,
					tags: cleanTags,
					mtime: mtime,
					ctime: file.stat.ctime,
				};

				const response = await requestUrl({
					url: settings.endpointUrl,
					method: "POST",
					headers: {
						"Content-Type": "application/json",
						"Authorization": authHeader,
					},
					body: JSON.stringify(payload),
				});

				if (response.status >= 200 && response.status < 300) {
					settings.publishedNotes[file.path] = {
						path: file.path,
						title: file.basename,
						mtime: mtime,
					};
					successPublishCount++;
				} else {
					console.error(`Failed to publish ${file.path}: status ${response.status}`, response.text);
					errorCount++;
				}
			} catch (err) {
				console.error(`Error publishing ${file.path}:`, err);
				errorCount++;
			}
		}

		// 5. Save settings and show final status
		await this.plugin.saveSettings();

		if (errorCount === 0) {
			new Notice(
				`LOJU Sync Success!\nPublished/Updated: ${successPublishCount}\nUnpublished: ${successUnpublishCount}`
			);
		} else {
			new Notice(
				`LOJU Sync completed with ${errorCount} error(s).\nSucceeded: ${
					successPublishCount + successUnpublishCount
				}\nFailed: ${errorCount}`
			);
		}
	}

	async wipeAll(): Promise<void> {
		const { settings } = this.plugin;

		if (!settings.endpointUrl) {
			new Notice("LOJU: Please configure your Endpoint URL in the settings.");
			return;
		}

		new Notice("Wiping remote LOJU database...");

		const authHeader = settings.authToken ? `Bearer ${settings.authToken}` : "";

		try {
			const response = await requestUrl({
				url: settings.endpointUrl,
				method: "POST",
				headers: {
					"Content-Type": "application/json",
					"Authorization": authHeader,
				},
				body: JSON.stringify({
					action: "wipe",
				}),
			});

			if (response.status >= 200 && response.status < 300) {
				settings.publishedNotes = {};
				await this.plugin.saveSettings();
				new Notice("Remote LOJU database wiped successfully and local published cache cleared.");
			} else {
				console.error("Failed to wipe remote LOJU database:", response.status, response.text);
				new Notice(`Wipe failed: remote server returned status ${response.status}`);
			}
		} catch (err) {
			console.error("Error during remote LOJU database wipe:", err);
			new Notice(`Wipe failed: ${err instanceof Error ? err.message : String(err)}`);
		}
	}
}
