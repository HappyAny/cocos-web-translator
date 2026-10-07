# Architecture

`popup.js` requests authorization for page and embedded origins. `site-access.mjs` persists the enabled origins and registers a pair of content scripts. Registration, immediate injection, and background access checks all use that same policy. A permission revocation removes affected registrations.

`bridge.js` runs in the isolated world. It accepts a limited message protocol from its own frame and forwards requests to the extension. `runtime.js` runs in the main world and reads accessible Cocos text components. The background checks extension identity, sender origin, and operation type. Pages cannot change providers, read credentials, or edit translation files.

The runtime preserves original text, rich-text tags, controls, and font ownership. Compatible dialogue interfaces are translated before playback with bounded lookahead; stale scene replies are ignored. Other text components are scanned independently. No overlay is drawn over the page.

`profiles.mjs` manages named profiles and explicit page bindings. Binding keys hash the top page's origin and pathname; query strings and fragments are excluded. Unknown pages receive disabled translation preferences and never select an existing profile. Editing a profile does not bind a page. Pause state and interface language are global; free-service usage and two-request concurrency are shared across profiles.

`engine.mjs` deduplicates concurrent translations and preserves originals on errors. Model body fields, additional profile prompts, target language, text, and optional dialogue context contribute to cache identity. Identity serialization and SHA-256 results are memoized with a bounded key budget. Source Japanese text is translated into the chosen target language.

`cache.mjs` stores automatic records and personal overrides separately in each profile's IndexedDB database. The default profile retains the original database; only it runs compatible older-schema migration. `lru.mjs` provides a shared, bounded Map-based LRU for hot records and negative lookups. Concurrent reads join the same pending operation. Mutations invalidate affected hot data. Personal records take priority, and exported files are validated before any write. Clearing a profile's automatic cache retains its personal edits and other profiles' records.

Configuration, profile-scoped credentials, site policy, and the profile registry use extension storage. Page-side preferences exclude API details, prompts, and secrets. Monotonic preference revisions prevent delayed profile reads from overwriting newer selections. Responses from a previous page binding are discarded. History is bounded by count and lives only in page memory; switching profiles clears it.

`update.mjs` and `updater-core.mjs` handle user-authorized in-place ZIP updates. A standalone bundled HTML supports older installations. Packages are checked for bounded sizes, safe paths, ZIP CRC and declared file hashes before writing. The updater preserves existing extension identity, backs up public files, and attempts rollback on write failure. It keeps the remembered directory handle in its own IndexedDB database. No translation relay is required.

Tests use synthetic Cocos interfaces and isolated storage. The extension itself contains no client scripts, assets, user configuration, or testing dependencies.

Browser APIs: [content script registration](https://developer.chrome.com/docs/extensions/reference/api/scripting), [optional permissions](https://developer.chrome.com/docs/extensions/reference/api/permissions), [frame enumeration](https://developer.chrome.com/docs/extensions/reference/api/webNavigation).
