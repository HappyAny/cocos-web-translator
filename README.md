<img src="docs/logo.svg" width="72" height="72" alt="Cocos Web Translator">

# Cocos Web Translator · Cocos翻译机

[![Checks](https://github.com/HappyAny/cocos-web-translator/actions/workflows/ci.yml/badge.svg)](https://github.com/HappyAny/cocos-web-translator/actions/workflows/ci.yml)
[![Release](https://img.shields.io/github/v/release/HappyAny/cocos-web-translator)](https://github.com/HappyAny/cocos-web-translator/releases/latest)
[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)

支持 Cocos Web 文字翻译的 Chrome / Edge 浏览器扩展。在可访问的文字组件和兼容剧情播放器中显示译文，支持自选翻译服务、预翻译、对白参考与个人修订。

**[下载浏览器插件](https://github.com/HappyAny/cocos-web-translator/releases/latest)** · [English](docs/README.en.md) · [配置说明](docs/settings.md) · [开发说明](CONTRIBUTING.md)

## 功能

- 分别控制剧情文字、界面文字和系统字体。保持富文本标签，失败时保留原文。
- MyMemory 免密钥试用，或使用 OpenAI 兼容 API；支持在线服务及本地模型。
- 简体中文、繁体中文、英文、韩文、法文、德文、西班牙文；插件界面支持中文和 English。
- 提前翻译 0–20 句，默认 2；0 只处理当前对白。
- 可选角色名和对白历史参考，只保留最近 N 句，默认 10、可设 1–20。仅模型 API 使用，没有分钟限制。
- 自动缓存与个人修订按目标语言隔离；支持 JSON 导出、编辑、导入和单句修订。
- 附加 Body JSON 与 DeepSeek / Qwen / vLLM 关闭思考预设。
- 按网页授权启用，扩展后台请求翻译服务；无需运行本机中转程序。
- 提供同目录更新工具，不必为每个版本安装一份扩展。

## 安装与开始使用

1. 在 [Releases](https://github.com/HappyAny/cocos-web-translator/releases/latest) 下载 `cocos-web-translator-v*.zip`，完整解压到固定目录。
2. 打开 Chrome / Edge 的扩展管理页，开启开发者模式，点击“加载解压缩的扩展”，选择解压后的 **extension** 文件夹。
3. 打开 Cocos Web 页面，点击扩展图标。选择当前网页及嵌入内容的域名，点击“启用所选网页”，确认浏览器授权。
4. 从弹窗打开设置，选择翻译服务和目标语言，保存设置并试译一句。
5. 开启需要的剧情或界面翻译。已授权页面会在后续访问时自动接入；必要时刷新网页。

页面使用跨域嵌入内容时，需要同时启用承载文字的嵌入域名。没有可访问 Cocos 文字接口的网页不会获得文字翻译效果。

## 更新已有扩展

完整解压新版本，运行外层 **update.cmd**，选择原来已经加载的扩展文件夹。工具校验公开文件哈希、备份原代码并覆盖原目录，然后在扩展管理页重新加载并刷新网页。macOS / Linux 可手动把新 `extension` 内的内容覆盖到原扩展目录。

始终使用原目录，可以沿用扩展身份、配置和已保存的密钥。新版会迁移兼容的旧缓存；个人修订不会被清空自动缓存操作删除。旧 JSON 导出文件可继续导入。更新后首次使用网页授权功能时，在弹窗启用需要的域名。

设置页也提供“重新加载已更新的扩展”按钮，需要先覆盖文件。解压加载的扩展采用浏览器的重新加载流程。[Chrome 官方说明](https://developer.chrome.com/docs/extensions/get-started/tutorial/hello-world)

## 支持范围

当前文字组件接入基于可访问的 `cc.Label`、`cc.RichText` 和 Cocos 场景接口；剧情接入通过兼容的指令播放接口完成。不同 Cocos 版本或自定义播放器可能需要新增适配。图片内文字、聊天和输入框暂不处理。

游戏源文字目前按日文翻译。历史仅记录实际显示的对白；未播放的预翻译内容不进入参考。新剧情、刷新、关闭历史开关或切换目标语言会清空历史，历史不持久保存。

## 开发与构建

Node.js 22 或更高版本；测试依赖不会随扩展分发。

```sh
npm ci
npm run check
npm test
npm run build
```

构建结果位于 `dist/`：浏览器插件 ZIP、`SHA256SUMS.txt` 与发布文件清单。只打包明确列出的公开文件，不包含个人设置、缓存、测试数据或开发依赖。Windows 的更新测试还需要 Python 3 和 PowerShell；其他平台仍会执行核心、存储、网页权限和运行时检查。

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

[MIT](LICENSE)。
