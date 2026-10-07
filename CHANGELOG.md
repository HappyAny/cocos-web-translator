# Changelog

## 0.9.1

- Collapse the popup's page-origin authorization controls by default while retaining profile selection and translation switches.
- Restore Test translation in the shared provider section and retain Test this profile below.
- Keep unsaved profile prompts intact during the shared-provider test; profile tests save and use the current prompt.
- Display the browser's running manifest version in the popup, settings, and extension updater instead of a hard-coded settings header.
- Distinguish written update files from the running version and explain that reloading activates the new version.

## 0.9.0

- Share the translation provider, API key, target language, pretranslation, dialogue context, fonts, and text switches across all profiles.
- Separate shared configuration from profile-specific prompts, caches, and personal edits in the settings page.
- Preserve unsaved shared form fields when switching or creating profiles; optional copying now copies only the additional prompt.
- Migrate the previously edited profile's service and language, retaining existing prompts, bindings, translations, and a private backup of older local settings.
- Apply shared changes to active and future profiles; cancel stale and queued requests across profiles.
- Check the expected target language before editing personal translations, and verify migration, shared credentials, profile isolation, and settings UI behavior.

## 0.8.0

- Add named profiles with independent translation settings, API keys, automatic caches, and personal edits.
- Bind profiles to the current page and switch from the popup; unknown pages require an explicit choice.
- Keep existing settings and compatible caches in the default profile. Settings editing does not select a page profile.
- Add per-profile model prompts for names, menu terminology, and translation guidance, with prompt-aware cache keys.
- Add bounded Map-based LRU caches, negative read caching, concurrent read joining, and memoized SHA-256 keys.
- Keep a shared free-service usage budget and network concurrency limit across profiles.

- Add pause / resume to the popup, preserving dialogue and interface switches.
- Remember pause state and broadcast changes to authorized frames immediately; stop active and queued page translation requests.
- Add a ZIP drag-and-drop updater with a remembered, user-authorized original folder.
- Verify CRC and file hashes, preserve extension identity, back up original public files, and roll back failed writes.
- Publish a standalone offline updater HTML for existing installations, with Chinese / English UI.

## 0.6.1

- Adopt GNU GPL version 3 only (`GPL-3.0-only`).
- Include the complete GPL license and updated copyright notices in the project and extension package.

## 0.6.0

- Standalone Cocos Web browser extension with Chinese / English interface.
- Origin-based page authorization with embedded-frame support.
- Seven target languages, configurable providers, body parameters, and reasoning presets.
- Bounded pretranslation and optional speaker/dialogue context by line count.
- Per-language automatic cache, editable JSON, and personal overrides.
- Compatible older cache and translation file migration.
- In-place updater, documented development workflow, automated checks, and packaged Releases.
