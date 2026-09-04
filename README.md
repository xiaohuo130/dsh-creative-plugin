# dsh-creative-plugin

DSH creative mode plugin：给 DSH（DeepSeek Harness）的 AI 会话提供 **文生图能力**（桥接阶跃星辰 StepFun 图像生成 API）。

![test](https://img.shields.io/badge/DSH-plugin-7B3FE4) ![node](https://img.shields.io/badge/node-%3E%3D18-green)

## 它能做什么

安装后，DSH 里的 AI 助手可以通过本插件的 `lib/gen.mjs` 生成图片并保存到本地，例如：

> 「帮我画一张水墨风格的竹子」「生成一个像素风游戏角色图标」

脚本直接调用兼容 OpenAI 的图像生成接口（默认 **StepFun Step Plan（包月套餐）**：`step_plan/v1/images/generations`，模型 `step-image-edit-2`），生成真实 PNG 图片并保存到本地。

## 环境要求

- Node.js ≥ 18（内置 `fetch`）
- 一个 **StepFun（阶跃星辰）API Key** 且已订阅 **Step Plan 套餐**（生图走套餐端点 `step_plan/v1`，与对话共用包月额度）

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
# 默认走 StepFun Step Plan（包月）套餐端点；可通过 --base-url 换成你自己的端点/供应商
node lib/gen.mjs --prompt "a red apple on a wooden table, photo"
node lib/gen.mjs --prompt-file prompt.txt --out C:/path/out.png
# 可选参数：--model 默认 step-image-edit-2；--base-url 默认 https://api.stepfun.com/step_plan/v1；--out 指定保存路径
```

输出：默认打印图片字节数；带 `--out` 时把图片保存为本地 PNG 文件。

## 目录结构

```
dsh-creative-plugin/
├── package.json        # 插件清单（dsh.client / exports / dsh.bundle）
├── cordis.patch.yml    # Cordis 补丁声明
├── lib/
│   ├── index.js        # 服务端 Cordis 入口（apply）
│   ├── client.js       # Web 客户端入口壳
│   └── gen.mjs         # ★ 生图核心：调 StepFun images/generations
└── README.md
```

## 原理

- `gen.mjs` 向任意兼容 OpenAI 的图像生成端点发送 `POST /images/generations`（默认 **StepFun Step Plan**：`https://api.stepfun.com/step_plan/v1`），可通过 `--base-url` 切换到你自己的套餐/供应商
- 默认请求体：`{ model: "step-image-edit-2", prompt, response_format: "b64_json", text_mode: true }`，`--model` 可改模型
- 返回 `data[0].b64_json`（base64 编码的 PNG）
- `--out` 会把 base64 解码保存为本地 PNG 文件

## License

MIT
