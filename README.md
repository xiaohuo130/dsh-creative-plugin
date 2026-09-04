# dsh-creative-plugin

DSH creative mode plugin：给 DSH（DeepSeek Harness）的 AI 会话提供 **文生图能力**（桥接任意 OpenAI 兼容图像生成接口）。

![test](https://img.shields.io/badge/DSH-plugin-7B3FE4) ![node](https://img.shields.io/badge/node-%3E%3D18-green)

## 它能做什么

安装后，DSH 里的 AI 助手可以通过本插件的 `lib/gen.mjs` 生成图片并保存到本地，例如：

> 「帮我画一张水墨风格的竹子」「生成一个像素风游戏角色图标」

脚本通过 `POST /images/generations` 调用外部图像生成服务，默认配置为 **StepFun Step Plan（包月套餐）**（端点 `https://api.stepfun.com/step_plan/v1`，模型 `step-image-edit-2`），生成真实 PNG 图片并保存到本地。

## 环境要求

- Node.js ≥ 18（内置 `fetch`）
- 一个**你所使用的图像生成服务**对应的 API Key

> ⚠️ API Key 由使用者自备，请勿把 Key 提交到仓库或分享给他人。

## 安装到 DSH

```bash
# 本机是 Windows，把插件目录放进无空格路径（如 ~/.dsh/plugins/）后：
dsh plugin add link:C:/Users/<你>/.dsh/plugins/dsh-creative-plugin --profile web
# 或从 GitHub 安装（发布后）：
dsh plugin add github:<owner>/dsh-creative-plugin --profile web
```

配置 Key（二选一）：
1. 环境变量：`set STEPFUN_API_KEY=sk-xxxx`（PowerShell: `$env:STEPFUN_API_KEY='sk-xxxx'`）
2. 或写入 `~/.dsh/.credentials.yaml`：
   ```yaml
   STEPFUN_API_KEY: sk-xxxx
   ```

之后告诉你的 AI 助手「本机已装 dsh-creative-plugin，画图请运行 `node <插件目录>/lib/gen.mjs`」，即可在对话中出图。

## 独立命令行用法（不装 DSH 也能用）

```bash
# 默认走 StepFun Step Plan（包月）套餐端点
node lib/gen.mjs --prompt "a red apple on a wooden table, photo"

# 可自行切换端点/模型（适用于任意 OpenAI 兼容的图像生成服务）
node lib/gen.mjs --prompt "a red apple on a wooden table, photo" --base-url https://api.stepfun.com/v1 --model step-2x-large

# 从文件读提示词，并保存到本地
node lib/gen.mjs --prompt-file prompt.txt --out C:/path/out.png
```

### 参数说明

| 参数 | 说明 | 默认值 |
| --- | --- | --- |
| `--prompt <文本>` | 文生图提示词（与 `--prompt-file` 二选一） | - |
| `--prompt-file <文件>` | 从 UTF-8 文件读取提示词 | - |
| `--out <路径>` | 保存 PNG 的本地路径 | 不保存 |
| `--model <模型名>` | 图像生成模型名 | `step-image-edit-2` |
| `--base-url <端点>` | 外部图像生成服务的基础地址（**不含** `/images/generations`） | `https://api.stepfun.com/step_plan/v1` |

## 切换外部服务

`gen.mjs` 只依赖标准 `POST /images/generations`（OpenAI 兼容），理论上任何提供该接口的服务都能用：

```bash
# 示例：使用其他 OpenAI 兼容图像服务
node lib/gen.mjs --prompt "cat in space" --base-url https://你的服务地址/v1 --model 该服务支持的图像模型
```

常见需要同步调整的：
- `--base-url`：换成你所用服务的图像生成地址
- `--model`：换成该服务支持的文生图/图像编辑模型
- 部分服务可能需要额外参数，可直接编辑 `gen.mjs` 的请求体

## 目录结构

```
dsh-creative-plugin/
├── package.json        # 插件清单（dsh.client / exports / dsh.bundle）
├── cordis.patch.yml    # Cordis 补丁声明
├── lib/
│   ├── index.js        # 服务端 Cordis 入口（apply）
│   ├── client.js       # Web 客户端入口壳
│   └── gen.mjs         # ★ 生图核心：调外部图像生成接口
└── README.md
```

## 原理

- `gen.mjs` 向 `POST <base-url>/images/generations` 发送图像生成请求（默认 **StepFun Step Plan**：`https://api.stepfun.com/step_plan/v1/images/generations`）
- 默认请求体：`{ model: "step-image-edit-2", prompt, response_format: "b64_json", text_mode: true }`，可通过 `--model` 切换模型
- 返回 `data[0].b64_json`（base64 编码的 PNG）
- `--out` 会把 base64 解码保存为本地 PNG 文件

## License

MIT
