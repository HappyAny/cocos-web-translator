# Cocos Web Translator

A Chrome / Edge extension for translating Cocos Web text. Translate accessible text components and compatible dialogue players with a configurable provider, pretranslation, dialogue context, and personal edits.

[Download the browser extension](https://github.com/HappyAny/cocos-web-translator/releases/latest) · [中文](../README.md)

## Install

1. Download the extension ZIP from Releases and extract it into a permanent folder.
2. Enable Developer mode in your browser's extension manager. Load the extracted **extension** folder as an unpacked extension.
3. Open settings from the popup and configure the shared provider and translation options once. Create a profile below, add an optional prompt, save, and test it.
4. Open a Cocos Web page and select the profile in the extension popup.
5. Select the page and relevant embedded origins, enable them, and confirm browser authorization. Turn on dialogue and/or interface translation. Refresh if needed.

Authorized sites are remembered. Embedded content on another origin needs its own authorization.

Unknown pages never select an existing profile automatically. Bindings use the top page’s origin and path, excluding query strings and fragments. The popup shows the binding path. Switch manually when different content shares a path.

Developer mode reads the selected unpacked directory directly. Keep that directory while using the extension; the downloaded ZIP can be deleted after installation.

## Features

- Separate dialogue, interface, and system font controls.
- One-click pause / resume in the popup, keeping your previous translation switches.
- MyMemory without a key for trials, or an OpenAI-compatible online/local model API.
- Seven target languages: Simplified Chinese, Traditional Chinese, English, Korean, French, German, and Spanish. Chinese / English extension interface.
- Pretranslate 0–20 upcoming lines, default 2.
- Optional speaker and dialogue context: latest 1–20 displayed lines, default 10, with no time expiry. Model APIs only; unplayed lines are excluded.
- One shared provider, API key, target language, pretranslation, dialogue context, and text switches for all profiles.
- Named profiles with separate additional prompts, caches, and personal edits.
- Quick profile selection for the current page in the popup; other pages keep their own bindings.
- Per-profile and per-language cache and personal edits, JSON export/import, and single-line editing.
- Bounded Map-based LRU hot caches, joined concurrent reads, and memoized SHA-256 cache keys.
- Additional request body JSON and configurable reasoning presets.
- Direct background requests with no translation relay required.
- Drag-and-drop ZIP updates, a remembered target folder, and a standalone offline updater.

## Update

Click **Update extension** in the popup. Drop the new Release ZIP into the update page, select the existing loaded extension folder on first use, and allow read/write access. The folder is remembered; the browser may ask to confirm permission again. Click **Update existing extension**, then reload the extension and refresh your pages.

For an older version without this menu, download **cocos-web-translator-updater.html** from Releases and open it in Edge / Chrome. Drop the ZIP, select the original folder, update, and reload the existing extension in the browser extension manager. The ZIP also includes this standalone page as the outer **update.html**. No local service is required.

Keep the original extension installed and select the folder it actually loads. Settings, persistently saved keys, and compatible caches are retained. Session-only keys follow browser reload rules and may need to be re-entered. Invalid packages are rejected before writing. Original code is backed up under `.cocos-update-backups/`; write failures trigger rollback. The Windows **update.cmd** remains available.

When upgrading to shared settings, the service, key, target language, and translation options are taken from the profile previously selected in the settings editor. Existing global pause and interface language are kept. The page identifies the migration source. Previous local profile configurations are retained in a browser-only migration backup; session-only keys are never persisted in it. Prompts, page bindings, caches, and personal edits remain independent. The default profile continues using the original database.

Compatible older JSON files can be imported into the profile currently being edited. Clearing automatic cache affects that profile and preserves its personal edits.

## Profiles and prompts

The upper settings section manages the shared provider, key, languages, pretranslation, context, fonts, and text switches. Saving shared settings updates all profiles. The lower profile section only manages its additional prompt and personal translations. Switching profiles preserves unsaved shared form fields.

The settings dropdown selects the profile being edited. The popup dropdown chooses the profile running on the current page. Multiple pages bound to one profile share its prompt and translations; create separate profiles for independent terminology and caches.

An additional prompt supplies model APIs with character names, menu terminology, and translation style. Changing it gives automatic translations a new cache identity. Personal edits always take priority. A new profile uses the shared provider and language automatically and starts with an empty cache; optional copying only copies the saved additional prompt.

Persistent translations use SHA-256 keys in IndexedDB. A shared in-memory LRU budget holds up to 2,000 entries and approximately 4 MiB of cached data; key memoization has a separate approximately 2 MiB budget. Eviction does not remove persistent translations. JSON export/import operates on the profile and target language currently being edited.

## Pause / resume

Click **Pause translation** in the extension popup to pause dialogue, interface, and pretranslation on all enabled sites. The state is remembered and your previous switches are kept. Click **Resume translation** to continue with those settings. Explicit translation tests in settings remain available.

## Scope

Text access uses exposed `cc.Label`, `cc.RichText`, and scene APIs. Dialogue support uses compatible command playback interfaces. Different Cocos versions or custom renderers may require adapters. Text inside images, chat, and input fields is excluded. Source text is currently Japanese.

History is stored only in page memory. It is cleared when the scene changes, the page refreshes, context is disabled, or the target language or profile changes. Explicit translation tests do not include dialogue history.

## Development

Node.js 22+: `npm ci`, `npm run check`, `npm test`, `npm run build`.

Build outputs in `dist/` include the extension ZIP, standalone updater HTML, SHA-256 checksums, and a public file manifest. Windows updater checks also require Python 3 and PowerShell. CI validates Windows and Linux; tagged releases are packaged automatically.

See [architecture](architecture.md), [privacy](privacy.md), and [contributing](../CONTRIBUTING.md).

## License

Copyright (C) 2026 HappyAny. This project is free software licensed under the [GNU General Public License, version 3 only](../LICENSE) (`GPL-3.0-only`). You may use, modify, and redistribute it under those terms. It comes without any warranty. Release packages include the full license and editable extension source.
