# Cocos Web Translator · Cocos翻译机

Load this folder as an unpacked Chrome / Edge extension. Configure the shared provider, key, target language, pretranslation, and dialogue context once. Create a profile below and add an optional prompt. Open a Cocos Web page, select the profile in the popup, authorize the page and relevant embedded origins, and enable translation.

在扩展管理页加载本文件夹。设置页上方配置共用翻译服务与语言，下方新建 Profile 并设置额外 Prompt。在 Cocos Web 网页的小菜单选择运行 Profile，启用当前网页及需要的嵌入域名。使用期间请保留本文件夹，开发者模式不会自动复制它；下载的 ZIP 可以删除。

Click **Update extension** in the popup and drop the new Release ZIP. Select your original loaded extension folder on first use, allow read/write access, and update. The folder is remembered, public files are verified and backed up, and write failures trigger rollback. Reload the existing extension and refresh the page. Older installations can use the outer **update.html** or the standalone updater HTML from Releases. The Windows `update.cmd` is also available. Keep the original folder and extension installed to retain settings and cache.

The popup also has **Pause translation / Resume translation**. Pause applies to every enabled page, remembers its state, and keeps the previous dialogue and interface switches. Explicit translation tests in settings remain available.

All profiles share their provider, credentials, languages, pretranslation, context, fonts, and text switches. Each profile has its own additional prompt, cache, and personal edits. The popup remembers the current page's selection by its top-level origin and path. Unknown pages require an explicit profile choice. Settings-page selection only changes the editing target and retains unsaved shared fields. Old settings migrate from the previously edited profile; existing prompts, bindings, caches, and personal edits are retained. Additional prompts apply to model APIs; prompt changes use separate automatic cache keys, while personal edits take priority.

Full documentation, source, and installable releases: [HappyAny/cocos-web-translator](https://github.com/HappyAny/cocos-web-translator).

Supports accessible Cocos Label/RichText components and compatible dialogue interfaces. Custom rendering and engine versions may require adapters. Text in images, chat, and inputs is excluded. Translation source is Japanese; seven target languages are available. History uses only the latest displayed lines with no time expiry, and only model APIs use it.

Personal translations use `format: cocos-translations`, `version: 1`, and a target language field. Export the current profile and language, edit, and import JSON, or edit a single line in settings. Compatible older exports can be imported into the current profile. Clearing its automatic cache keeps personal edits and other profiles' records. Bounded memory caches reduce repeated IndexedDB reads and hash computations without deleting persistent data.

No client assets, personal data, API keys, or development dependencies are included in the package.

Copyright (C) 2026 HappyAny. Licensed under the GNU General Public License, version 3 only (`GPL-3.0-only`); see the outer LICENSE file. You may use, modify, and redistribute this software under those terms. It comes without any warranty. The package contains the editable extension source; the full project source is available from the repository linked above.
