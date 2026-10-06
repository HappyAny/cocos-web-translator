# Cocos Web Translator · Cocos翻译机

Load this folder as an unpacked Chrome / Edge extension. Open a Cocos Web page, click the extension icon, select its page and embedded origins, and enable translation. Open settings to select the provider, target language, pretranslation, and dialogue context.

在扩展管理页加载本文件夹。打开 Cocos Web 页面，在扩展弹窗启用当前网页及需要的嵌入域名，再配置翻译服务和开关。

Update by replacing the public files in your existing extension folder. The outer `update.cmd` can do this on Windows with hash validation and a backup. Reload the existing extension and refresh the page to apply the update. Use the original installation folder to retain settings and cache.

Full documentation, source, and installable releases: [HappyAny/cocos-web-translator](https://github.com/HappyAny/cocos-web-translator).

Supports accessible Cocos Label/RichText components and compatible dialogue interfaces. Custom rendering and engine versions may require adapters. Text in images, chat, and inputs is excluded. Translation source is Japanese; seven target languages are available. History uses only the latest displayed lines with no time expiry, and only model APIs use it.

Personal translations use `format: cocos-translations`, `version: 1`, and a target language field. Export, edit, and import JSON, or edit a single line in settings. Compatible older exports can be imported. Clearing automatic cache keeps personal edits.

No client assets, personal data, API keys, or development dependencies are included in the package.

Copyright (C) 2026 HappyAny. Licensed under the GNU General Public License, version 3 only (`GPL-3.0-only`); see the outer LICENSE file. You may use, modify, and redistribute this software under those terms. It comes without any warranty. The package contains the editable extension source; the full project source is available from the repository linked above.
