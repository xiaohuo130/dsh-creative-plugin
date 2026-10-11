# dsh-creative-plugin

> 给 [DSH（DeepSeek Harness）](https://github.com/deepseek-ai) 的 AI 会话装上「画图」能力：装好后直接对 AI 说「帮我画一张 XXX」，它就会调用外部文生图接口，把图片存到你电脑上。
>
> An image-generation plugin for DSH. It registers a host tool **`creative_generate_image`** that bridges the AI session to any OpenAI-compatible text-to-image endpoint (default: StepFun `step-image-edit-2`).

![dsh-plugin](https://img.shields.io/badge/DSH-plugin-7B3FE4) ![node](https://img.shields.io/badge/node-%3E%3D18-green) ![license](https://img.shields.io/badge/license-MIT-blue)

---

## 它能干什么

装上本插件后，DSH 里的 AI 助手会多出一个工具 `creative_generate_image`。你只要用自然语言说：

- 「帮我画一张水墨风格的竹子，宣纸背景」
- 「生成一个像素风游戏角色图标，透明背景」
- 「画一张北欧极简风的咖啡店招牌插画，16:9」

AI 就会自动组织提示词、调用图像接口、把 PNG 保存到本地，并把保存路径告诉你。**你不需要自己写命令。**

除 DSH 之外，`lib/gen.mjs` 也能**当成普通命令行脚本独立使用**（见下文【命令行用法】），不装 DSH 一样能出图。

---

## 安装

### 方式一：从 GitHub 安装（推荐）

```bash
dsh plugin --profile web add github:xiaohuo130/dsh-creative-plugin -w
```

### 方式二：克隆后以本地目录安装

```bash
git clone https://github.com/xiaohuo130/dsh-creative-plugin.git
cd dsh-creative-plugin
dsh plugin --profile web add link:<克隆到的绝对路径> -w
```

安装后**重启 DSH**（客户端插件补丁在启动时加载），新会话里即可使用 `creative_generate_image`。

### 环境要求

- **Node.js ≥ 18**（脚本用内置 `fetch`，无任何第三方依赖）
- **DSH ≥ 0.1.2**（0.2.x 亦可）
- 一个图像生成服务的 **API Key**（自备）

---

## 配置 API Key

插件按下面的顺序找 Key，找到即用：

1. 环境变量 `STEPFUN_API_KEY`
2. `~/.dsh/.credentials.yaml` 里的 `STEPFUN_API_KEY`

```powershell
# Windows PowerShell（当前窗口临时生效）
$env:STEPFUN_API_KEY = 'sk-xxxx'
```

```yaml
# 或写入 ~/.dsh/.credentials.yaml
STEPFUN_API_KEY: sk-xxxx
```

> ⚠️ Key 由使用者自备。**不要把 Key 提交到仓库**，也不要把带 Key 的截图发出去。

---

## 工具参数（`creative_generate_image`）

| 参数 | 必填 | 说明 | 默认值 |
| --- | --- | --- | --- |
| `prompt` | ✅ | 图片提示词（英文描述通常效果更好） | — |
| `out` | — | 输出 PNG 的本地路径 | `~/Pictures/dsh-creative/creative-<时间戳>.png` |
| `model` | — | 图像模型名 | `step-image-edit-2` |
| `baseUrl` | — | 图像服务基础地址（**不含** `/images/generations`） | `https://api.stepfun.com/step_plan/v1` |

返回体形如：

```json
{ "ok": true, "message": "Image generated: C:\\Users\\me\\Pictures\\dsh-creative\\creative-2026-10-11T13-20-05.png", "path": "...", "logs": "IMAGE_BYTES: 1234567\nSAVED: ...\nDONE" }
```

失败时返回 `{ "ok": false, "message": "...", "error": { "name": ..., "message": ..., "stderr": ... } }`，其中 `stderr` 是 `gen.mjs` 打印的原始错误（如 `API_ERROR 401 {...}`）。

---

## 命令行用法（不装 DSH 也能用）

```bash
# 直接出图（默认走 StepFun Step Plan 套餐端点，保存到指定路径）
node lib/gen.mjs --prompt "a red apple on a wooden table, photo" --out ./out.png

# 从文件读提示词（适合长提示词）
node lib/gen.mjs --prompt-file prompt.txt --out ./out.png

# 换服务：任何 OpenAI 兼容的 /images/generations 都能用
node lib/gen.mjs --prompt "cat in space" --base-url https://api.example.com/v1 --model your-image-model --out ./cat.png
```

| 参数 | 说明 | 默认值 |
| --- | --- | --- |
| `--prompt <文本>` | 提示词（与 `--prompt-file` 二选一） | — |
| `--prompt-file <文件>` | 从 UTF-8 文件读取提示词 | — |
| `--out <路径>` | PNG 保存路径；不传则只打印字节数不落盘 | 不保存 |
| `--model <模型名>` | 图像模型名 | `step-image-edit-2` |
| `--base-url <地址>` | 服务基础地址（不含 `/images/generations`） | `https://api.stepfun.com/step_plan/v1` |

---

## 原理

```
用户说「画一张 XXX」
      ↓
DSH 会话 → 工具 creative_generate_image（lib/index.js）
      ↓  以子进程方式调用（execFile，参数走数组，不经 shell）
node lib/gen.mjs --prompt ... --out ...
      ↓  POST <base-url>/images/generations
{ model, prompt, response_format: "b64_json", text_mode: true, cfg_scale: 1.0, steps: 8 }
      ↓  取响应 data[0].b64_json
base64 解码 → 写入 PNG 文件
```

- 只依赖标准 `POST /images/generations`（OpenAI 兼容），所以**任何提供该接口的服务都能接**。
- 请求体里除 `model` / `prompt` / `response_format` 外的字段（`text_mode` / `cfg_scale` / `steps`）是 StepFun 的调优参数，其它服务若报「未知参数」，直接编辑 `lib/gen.mjs` 的请求体即可。
- 若服务返回的是 URL 而不是 `b64_json`，`gen.mjs` 会明确报 `NO_B64_JSON in response`。

---

## 目录结构

```
dsh-creative-plugin/
├── package.json        # 插件清单（dsh.bundle / dsh.client / exports）
├── cordis.patch.yml    # Cordis 补丁声明（把插件挂进 profile）
├── LICENSE             # MIT
├── lib/
│   ├── index.js        # 服务端入口：注册 creative_generate_image 工具
│   ├── client.js       # Web 客户端入口壳
│   └── gen.mjs         # ★ 生图核心：调接口 + 落盘，零依赖，可独立当 CLI
└── README.md
```

---

## 常见问题

**Q：DSH 里调用工具报 `STEPFUN_API_KEY not found`？**
Key 没配到。检查环境变量是否在**启动 DSH 的那个进程**里生效（Windows 下在旧窗口设的变量不会传给已启动的 DSH），或改用 `~/.dsh/.credentials.yaml`。

**Q：报 `API_ERROR 401` / `403`？**
Key 无效或没有该模型的权限。

**Q：报 `NO_B64_JSON in response`？**
该服务/套餐不返回 base64。换支持 `response_format: "b64_json"` 的模型或服务。

**Q：图片存到哪了？**
默认 `~/Pictures/dsh-creative/creative-<时间戳>.png`；调用时传 `out` 可指定任意路径。工具返回的 `path` 字段就是实际保存位置。

**Q：能用来做图生图 / 指定参考图吗？**
本插件走的是 `POST /images/generations`（纯文生图）。图生图需要走 `POST /images/edits`（multipart 上传参考图）——注意 `generations` 接口即使传了 `image` 字段也会被**静默忽略**，别在这条路上试。

---

## 更新日志

- **0.2.0**
  - `lib/index.js` 真正注册宿主工具 **`creative_generate_image`**（0.1.0 的入口只是空壳，装上也用不了）
  - `gen.mjs` 路径改为**按模块相对位置解析**，不再写死 `~/.dsh/plugins/...`
  - 默认输出目录改为通用的 `~/Pictures/dsh-creative/`
  - 改用 `execFileSync(process.execPath, argv)`，去掉拼 shell 字符串
  - `package.json`：移除已被官方删除的 `@deepseek-ai/dsh-client-runtime` 依赖、补 `license` / `repository` / `keywords` / `files`
  - README 重写：补全工具参数表、命令行用法、返回体与常见问题
- **0.1.0** 首个版本（`gen.mjs` 命令行生图可用）

---

## License

MIT © xiaohuo130
