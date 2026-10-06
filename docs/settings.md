# 配置说明

## 翻译服务

MyMemory 适合免密钥试用，译文质量和额度受服务商限制。每日提交预算仅计算实际提交文字，缓存和内置词表不计入。

OpenAI 兼容 API 使用 Chat Completions 格式。填写基础地址、模型名称和密钥，保存时授权对应 API 域名。也可填写本地模型的 HTTP 地址。地址不要重复添加 `/chat/completions`。

“检查连接”不发送密钥，也不调用模型；HTTP 401 / 403 表示收到接口响应。“试译一句”实际请求当前接口，绕过缓存及个人修订，不使用对白历史。

## Body 和禁止思考

附加 Body JSON 填写请求顶层参数，例如：

```json
{ "temperature": 0.1, "max_tokens": 512 }
```

不要加 SDK 的 `extra_body` 外层。`model`、`messages` 和 `stream` 由扩展管理。密钥使用专用字段。

禁止思考预设：DeepSeek 使用 `thinking.type = disabled`，Qwen 使用 `enable_thinking = false`，vLLM 使用 `chat_template_kwargs.enable_thinking = false`。选择自定义时，在 Body 中填写服务支持的参数。只有支持相应参数的模型才会生效。

## 预翻译与历史

提前翻译 0–20 句。0 仅当前对白；角色名随对白处理，不占句数。

历史参考默认关闭。开启后只保留最近 N 句已显示的角色名、原对白和译文；默认 10、可设 1–20，暂停不会使其过期。历史仅供模型 API 使用，可能增加 token 用量；免密钥服务不发送历史。

## 个人译文

导出当前语言的 JSON，修改译文后导入合并，也可在设置页保存单句修订。个人修订优先于自动缓存、词表及在线请求。

```json
{
  "format": "cocos-translations",
  "version": 1,
  "sourceLanguage": "ja",
  "targetLanguage": "en",
  "translations": { "設定": "Settings" }
}
```

保留原文键、富文本标签及目标语言。导入上限为 10 MB、20000 条；文件不得包含 API 密钥。导入语言需与当前保存的目标语言一致。兼容旧版同结构导出文件；未设置目标语言的旧文件按简体中文处理。

清空自动缓存不会删除个人修订。切换目标语言后分别读取该语言的缓存与修订。
