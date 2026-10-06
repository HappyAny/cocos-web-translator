# Cocos Web Translator

A Chrome / Edge extension for translating Cocos Web text. Translate accessible text components and compatible dialogue players with a configurable provider, pretranslation, dialogue context, and personal edits.

[Download the browser extension](https://github.com/HappyAny/cocos-web-translator/releases/latest) · [中文](../README.md)

## Install

1. Download the extension ZIP from Releases and extract it into a permanent folder.
2. Enable Developer mode in your browser's extension manager. Load the extracted **extension** folder as an unpacked extension.
3. Open a Cocos Web page, click the extension icon, select the page and relevant embedded origins, and enable them. Confirm the browser's permission prompt.
4. Open settings, choose a translation provider and target language, save, and test a sentence.
5. Enable dialogue and/or interface translation. Refresh the page if needed.

Authorized sites are remembered. Embedded content on another origin needs its own authorization.

## Features

- Separate dialogue, interface, and system font controls.
- MyMemory without a key for trials, or an OpenAI-compatible online/local model API.
- Seven target languages: Simplified Chinese, Traditional Chinese, English, Korean, French, German, and Spanish. Chinese / English extension interface.
- Pretranslate 0–20 upcoming lines, default 2.
- Optional speaker and dialogue context: latest 1–20 displayed lines, default 10, with no time expiry. Model APIs only; unplayed lines are excluded.
- Per-language cache and personal edits, JSON export/import, and single-line editing.
- Additional request body JSON and configurable reasoning presets.
- Direct background requests with no translation relay required.
- In-place updates that retain the existing extension identity.

## Update

Extract the new release. On Windows, run the outer **update.cmd** and select your existing extension folder. The updater verifies hashes, backs up public files, and updates that folder. Otherwise, overwrite the existing folder with the new `extension` contents. Reload the existing extension and refresh the page.

Settings, persistent keys, and compatible caches are retained. Session-only keys follow browser session rules. Compatible older translation JSON files remain importable. After updating, enable the origins you want through the new site controls.

## Scope

Text access uses exposed `cc.Label`, `cc.RichText`, and scene APIs. Dialogue support uses compatible command playback interfaces. Different Cocos versions or custom renderers may require adapters. Text inside images, chat, and input fields is excluded. Source text is currently Japanese.

History is stored only in page memory. It is cleared when the scene changes, the page refreshes, context is disabled, or the target language changes. Explicit translation tests do not include dialogue history.

## Development

Node.js 22+: `npm ci`, `npm run check`, `npm test`, `npm run build`.

Build outputs in `dist/` include the extension ZIP, SHA-256 checksums, and a public file manifest. Windows updater checks also require Python 3 and PowerShell. CI validates Windows and Linux; tagged releases are packaged automatically.

See [architecture](architecture.md), [privacy](privacy.md), and [contributing](../CONTRIBUTING.md).

## License

Copyright (C) 2026 HappyAny. This project is free software licensed under the [GNU General Public License, version 3 only](../LICENSE) (`GPL-3.0-only`). You may use, modify, and redistribute it under those terms. It comes without any warranty. Release packages include the full license and editable extension source.
