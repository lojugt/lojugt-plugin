# Loju Obsidian Plugin (`lojugt-plugin`)

An Obsidian plugin that publishes markdown notes from your vault directly to your personal website.

This repository is the plugin component of the Loju ecosystem. The web rendering frontend is hosted in the [lojugt-fresh](https://github.com/lojugt/lojugt-fresh) repository.

## Use Case

This plugin enables seamless, instant publishing of personal markdown notes directly from your local Obsidian vault to a public website hosted on Deno Fresh. By adding `publish: true` to a note's YAML frontmatter, the plugin automatically detects additions, modifications, and deletions, and syncs those changes via a secure JSON POST request to your web application's ingest API. This allows you to write notes in your favorite editor and make them live instantly.

## Project Vision & Inspiration

Together, these repositories form **Loju**, a custom, lightweight, edge-native note-publishing pipeline. The project is inspired by traditional static-site-generator publishing setups (like Hugo, Jekyll, or Astro) and official Obsidian Publish, but aims for a zero-build, dynamic, database-driven approach. By utilizing Deno Fresh for speedy server-side rendering and Deno KV for lightweight, edge-native storage, it avoids slow rebuilds or full site redeploys, replacing them with instant database updates. Visually, the site features a bold, graphic aesthetic with Korean/Japanese-inspired headings (`Do Hyeon` and `Dela Gothic One`) and a clean monospace body font (`JetBrains Mono`).

## Settings & Setup

1. **Endpoint URL**: The URL of your Deno Fresh API route (e.g. `https://your-domain.com/api/ingest`).
2. **Auth Token**: A bearer token defined on your Deno server via the `AUTH_TOKEN` environment variable to authenticate sync requests.
3. **Usage**:
   - Install the plugin.
   - Configure your Endpoint URL and Auth Token in settings.
   - Add `publish: true` to any note's YAML frontmatter.
   - Click the "Loju" ribbon icon or run the command `Deno KV Publisher: Publish Notes` to synchronize.
