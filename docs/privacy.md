# Privacy / 隐私

The extension runs translation only on origins explicitly enabled through its popup. `activeTab` identifies the current page; `webNavigation` reads its frame origins so embedded Cocos content can be selected. `scripting` registers and injects the packaged runtime only on enabled origins. Optional host permissions are requested for selected pages and API endpoints.

翻译只在弹窗启用的网页域名中运行。扩展读取当前标签页的框架域名，供用户选择跨域嵌入内容；没有收集或上传浏览记录的功能。

The chosen provider receives source text. Model requests also include the selected profile's additional prompt and, when enabled, the selected amount of displayed dialogue context. No analytics or telemetry endpoints are included.

原文会发送给当前网页所选 Profile 的服务。模型请求包含该 Profile 的额外 Prompt；启用历史参考时，还会包含已播放角色名、对白与当时译文。扩展没有分析或遥测端点。

API keys remain in extension storage restricted to trusted extension contexts. They are attached only to model API requests, not passed to page scripts or included in exported translation files. Users can select persistent or session-only key storage.

Profile 设置、密钥、缓存与个人修订分别保存在浏览器中。网页绑定仅在本地保存最外层网页域名和路径的哈希，不保存查询参数或片段；未知网页需要明确选择 Profile。清空当前 Profile 自动缓存保留个人修订及其他 Profile 的缓存。导出的 JSON 包含当前 Profile 名称、ID、语言、原文与译文，不含 API 密钥或额外 Prompt。

历史仅在当前页面内存中保留，切换 Profile 后清空。停用当前网页会解除其运行时接入；其他已打开的同域页面可刷新以移除原有页面脚本。

Compatible older caches migrate within the same extension origin. Old cache databases are retained rather than deleted. Unpacked updates must use the same installation folder to preserve the extension identity.

The drag-and-drop updater requests access to the existing extension directory through a browser file picker. It remembers the directory handle locally, writes public extension code, and backs up code in that directory. It does not export browser-stored settings, keys, profile bindings, or translations into the backup.
