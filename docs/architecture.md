# Architecture

`popup.js` requests authorization for page and embedded origins. `site-access.mjs` persists the enabled origins and registers a pair of content scripts. Registration, immediate injection, and background access checks all use that same policy. A permission revocation removes affected registrations.

`bridge.js` runs in the isolated world. It accepts a limited message protocol from its own frame and forwards requests to the extension. `runtime.js` runs in the main world and reads accessible Cocos text components. The background checks extension identity, sender origin, and operation type. Pages cannot change providers, read credentials, or edit translation files.

The runtime preserves original text, rich-text tags, controls, and font ownership. Compatible dialogue interfaces are translated before playback with bounded lookahead; stale scene replies are ignored. Other text components are scanned independently. No overlay is drawn over the page.

`engine.mjs` serializes budget updates, bounds request concurrency, deduplicates concurrent translations, and preserves originals on errors. Selected model body fields contribute to cache identity. Source Japanese text is translated into the chosen target language.

`cache.mjs` stores automatic records and personal overrides separately in IndexedDB. `cache-migration.mjs` discovers compatible older schemas within the same extension origin and imports them once without deleting the old database. Personal records take priority, and exported files are validated before any write.

Configuration, site policy, and credentials use extension storage. Page-side preferences exclude provider details and secrets. History is bounded by count and lives only in page memory.

Tests use synthetic Cocos interfaces and isolated storage. The extension itself contains no client scripts, assets, user configuration, or testing dependencies.

Browser APIs: [content script registration](https://developer.chrome.com/docs/extensions/reference/api/scripting), [optional permissions](https://developer.chrome.com/docs/extensions/reference/api/permissions), [frame enumeration](https://developer.chrome.com/docs/extensions/reference/api/webNavigation).
