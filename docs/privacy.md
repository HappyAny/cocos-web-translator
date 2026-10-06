# Privacy / 隐私

The extension runs translation only on origins explicitly enabled through its popup. `activeTab` identifies the current page; `webNavigation` reads its frame origins so embedded Cocos content can be selected. `scripting` registers and injects the packaged runtime only on enabled origins. Optional host permissions are requested for selected pages and API endpoints.

翻译只在弹窗启用的网页域名中运行。扩展读取当前标签页的框架域名，供用户选择跨域嵌入内容；没有收集或上传浏览记录的功能。

The chosen provider receives source text. Model requests can also include the selected amount of displayed dialogue context when enabled. No analytics or telemetry endpoints are included.

原文会发送给用户选择的服务。启用历史参考时，模型请求还会包含已播放角色名、对白与当时译文。扩展没有分析或遥测端点。

API keys remain in extension storage restricted to trusted extension contexts. They are attached only to model API requests, not passed to page scripts or included in exported translation files. Users can select persistent or session-only key storage.

缓存、个人修订、偏好与已启用域名保存在浏览器中；历史仅在当前页面内存中保留。清空自动缓存保留个人修订。停用当前网页会解除其运行时接入；其他已打开的同域页面可刷新以移除原有页面脚本。

Compatible older caches migrate within the same extension origin. Old cache databases are retained rather than deleted. Unpacked updates must use the same installation folder to preserve the extension identity.
