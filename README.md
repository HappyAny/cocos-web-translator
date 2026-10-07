<img src="docs/logo.svg" width="72" height="72" alt="Cocos Web Translator">

# Cocos Web Translator · Cocos翻译机

[![Checks](https://github.com/HappyAny/cocos-web-translator/actions/workflows/ci.yml/badge.svg)](https://github.com/HappyAny/cocos-web-translator/actions/workflows/ci.yml)
[![Release](https://img.shields.io/github/v/release/HappyAny/cocos-web-translator)](https://github.com/HappyAny/cocos-web-translator/releases/latest)
[![License: GPL v3](https://img.shields.io/badge/License-GPLv3-blue.svg)](LICENSE)

支持 Cocos Web 文字翻译的 Chrome / Edge 浏览器扩展。在可访问的文字组件和兼容剧情播放器中显示译文，支持独立 Profile、自选翻译服务、额外 Prompt、预翻译与个人修订。

**[下载浏览器插件](https://github.com/HappyAny/cocos-web-translator/releases/latest)** · [English](docs/README.en.md) · [配置说明](docs/settings.md) · [开发说明](CONTRIBUTING.md)

## 功能

- 分别控制剧情文字、界面文字和系统字体。保持富文本标签，失败时保留原文。
- 扩展弹窗一键暂停 / 恢复所有网页翻译，保留原来的剧情与界面开关。
- MyMemory 免密钥试用，或使用 OpenAI 兼容 API；支持在线服务及本地模型。
- 简体中文、繁体中文、英文、韩文、法文、德文、西班牙文；插件界面支持中文和 English。
- 提前翻译 0–20 句，默认 2；0 只处理当前对白。
- 可选角色名和对白历史参考，只保留最近 N 句，默认 10、可设 1–20。仅模型 API 使用，没有分钟限制。
- 翻译服务、API 密钥、目标语言、预翻译、对白参考和文字开关共用，只需配置一次。
- 自建、重命名 Profile；各自保存额外 Prompt、缓存与个人修订。
- 小菜单切换当前网页的 Profile，记住每个网页的选择。未绑定网页需要手动新建或选择。
- 小菜单的网页域名授权区默认折叠，点击“当前网页”展开；共用服务区保留“试译一句”。
- 自动缓存与个人修订按 Profile 和目标语言隔离；支持 JSON 导出、编辑、导入和单句修订。
- 有上限的内存 LRU 热缓存、重复读合并和 SHA-256 键复用，减少重复查库及哈希计算。
- 附加 Body JSON 与 DeepSeek / Qwen / vLLM 关闭思考预设。
- 按网页授权启用，扩展后台请求翻译服务；无需运行本机中转程序。
- 把 Release ZIP 拖入更新页，记住授权的原目录，保留设置与缓存；提供独立离线更新页面。

## 安装与开始使用

1. 在 [Releases](https://github.com/HappyAny/cocos-web-translator/releases/latest) 下载 `cocos-web-translator-v*.zip`，完整解压到固定目录。
2. 打开 Chrome / Edge 的扩展管理页，开启开发者模式，点击“加载解压缩的扩展”，选择解压后的 **extension** 文件夹。
3. 从扩展小菜单打开设置，在上方配置 **共用翻译服务** 与 **共用翻译与语言设置**；下方新建 Profile，填写需要的额外 Prompt，保存并试译。
4. 打开 Cocos Web 页面，点击扩展图标，在 **当前网页的 Profile** 下拉框中选择要运行的 Profile。
5. 选择当前网页及嵌入内容的域名，点击“启用所选网页”，确认浏览器授权，再开启需要的剧情或界面翻译。必要时刷新网页。

页面使用跨域嵌入内容时，需要同时启用承载文字的嵌入域名。没有可访问 Cocos 文字接口的网页不会获得文字翻译效果。

开发者模式直接读取你选择的解压目录，不会自动复制文件；使用期间请保留该目录。安装后下载的 ZIP 可以删除。

新网页不会自动使用已有 Profile。绑定按最外层网页的域名和路径记忆，不包含查询参数或片段；小菜单显示实际绑定路径。不同内容共用同一路径时，请在小菜单手动切换 Profile。

## Profile、术语与缓存

上方共用设置管理服务、API 密钥、目标语言、插件界面语言、预翻译、对白参考、字体和文字开关，所有 Profile 自动使用。下方 Profile 区只管理额外 Prompt、缓存与个人修订；切换 Profile 不会重置正在填写的共用设置。

设置页的 Profile 下拉框用于选择编辑对象，小菜单下拉框用于选择当前网页实际运行的 Profile。一个 Profile 可以绑定多个网页；它们共享该 Profile 的 Prompt 和译文。需要独立术语或缓存时，为它们分别新建 Profile。

额外 Prompt 仅用于模型 API，例如 `アリス = 爱丽丝；ホーム = 主界面；对白使用自然口语`。它会加入系统提示词，适用于名称、菜单术语和风格说明。修改 Prompt 会使用新的自动缓存键；个人修订始终优先。新 Profile 自动沿用共用服务与语言，缓存为空，可选复制当前已保存的额外 Prompt。

长期缓存位于浏览器 IndexedDB，使用 SHA-256 键查找；不是直接写在扩展代码目录里的文本文件。热缓存使用 JavaScript Map 和 LRU 淘汰，所有 Profile 合计最多 2000 条、约 4 MiB 数据预算；另有约 2 MiB 的缓存键预算。热缓存只减少重复读取，自动译文仍持久保存在 IndexedDB。导出 JSON 才会生成可手动修改的文件，导出和导入均针对设置页当前 Profile 及其目标语言。

## 更新已有扩展

点击扩展弹窗的 **更新插件**：

1. 把新版 Release ZIP 拖进更新页，不需要解压。
2. 首次选择原来已经加载到浏览器的 **extension** 文件夹，并允许读写。后续更新会记住该目录，浏览器可能要求再次确认授权。
3. 点击 **更新原插件**。程序先校验 ZIP、CRC 和文件哈希，再备份原代码，最后覆盖原目录。
4. 点击 **重新加载已更新的插件**，并刷新 Cocos Web 页面。

小菜单和设置页显示浏览器当前加载的版本，更新页分别显示当前运行版本与选中的更新包版本。写入文件后必须重新加载插件才能启用新版；关闭旧设置页，再从扩展小菜单重新打开可确认版本。

旧版没有更新入口时，在 [Releases](https://github.com/HappyAny/cocos-web-translator/releases/latest) 下载 **cocos-web-translator-updater.html**，用 Edge / Chrome 打开，把同一 Release 的 ZIP 拖进去即可。写入完成后，在扩展管理页重新加载原插件。ZIP 内的外层 **update.html** 也是这份独立更新页面。全程不需要本机服务。

更新继续使用原目录和原扩展身份，保留设置、已选择持久保存的密钥、缓存及个人修订。请保留原插件，选择它实际加载的目录。会话密钥遵循浏览器的重载规则；未持久保存的密钥可能需要重填。ZIP 校验失败不会写入；写入失败会尝试还原，原代码备份位于原目录的 `.cocos-update-backups/`。

升级到共用设置时，沿用升级前设置页正在编辑的 Profile 的服务、密钥、目标语言和翻译选项；暂停与插件界面语言保留原来的全局值。设置页会显示迁移来源。旧的各 Profile 服务配置以浏览器内的迁移备份保留，未持久保存的密钥不会写入该备份。各 Profile 的 Prompt、网页绑定、缓存和个人修订保持独立。

默认 Profile 继续使用原缓存数据库。旧 JSON 导出文件可继续导入当前 Profile。清空自动缓存只影响当前 Profile，不会删除个人修订。

Windows 仍可运行外层 **update.cmd**，手动覆盖也需使用原目录并重新加载。[目录授权机制](https://developer.chrome.com/docs/capabilities/web-apis/file-system-access) · [浏览器重载说明](https://developer.chrome.com/docs/extensions/get-started/tutorial/hello-world)

## 暂停与恢复

点击浏览器扩展图标，在小菜单点击 **暂停翻译**；再次点击 **恢复翻译**。暂停状态会保存，对所有已启用网页生效，停止剧情、界面和预翻译请求。原来的开关不会改变，恢复后按原设置继续翻译。设置页的手动试译仍可使用。

## 支持范围

当前文字组件接入基于可访问的 `cc.Label`、`cc.RichText` 和 Cocos 场景接口；剧情接入通过兼容的指令播放接口完成。不同 Cocos 版本或自定义播放器可能需要新增适配。图片内文字、聊天和输入框暂不处理。

游戏源文字目前按日文翻译。历史仅记录实际显示的对白；未播放的预翻译内容不进入参考。新剧情、刷新、关闭历史开关、切换目标语言或 Profile 会清空历史，历史不持久保存。

## 开发与构建

Node.js 22 或更高版本；测试依赖不会随扩展分发。

```sh
npm ci
npm run check
npm test
npm run build
```

构建结果位于 `dist/`：浏览器插件 ZIP、独立更新 HTML、`SHA256SUMS.txt` 与发布文件清单。只打包明确列出的公开文件，不包含个人设置、缓存、测试数据或开发依赖。Windows 的更新测试还需要 Python 3 和 PowerShell；其他平台仍会执行核心、存储、网页权限、拖放更新和运行时检查。

```text
extension/          浏览器扩展源码
scripts/            检查、图标生成和打包工具
tests/              独立测试与合成 Cocos 接口
docs/               配置、隐私和英文说明
.github/workflows/  检查与 Release 自动打包
update.cmd/.ps1     Windows 同目录更新工具
```

## 数据与隐私

密钥存储在扩展可信上下文中，不暴露给页面。只有启用的网页可以申请翻译；文字会发送给你选择的翻译服务。配置、缓存与个人修订保存在浏览器中；历史只在当前页面内存中保存。详见 [隐私说明](docs/privacy.md)。

## License

Copyright (C) 2026 HappyAny。

本项目采用 [GNU GPL 第 3 版](LICENSE)（`GPL-3.0-only`）。你可以遵循该许可证使用、修改和再分发本项目。软件不提供任何担保。Release 插件包包含完整许可证与可编辑的扩展源码。
