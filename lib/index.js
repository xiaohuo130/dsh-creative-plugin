// dsh-creative-plugin —— DSH 服务端入口
// 注册宿主工具 creative_generate_image：把 DSH 里的 AI 会话接到任意
// OpenAI 兼容的文生图接口（默认阶跃星辰 StepFun step_plan / step-image-edit-2）。
//
// 与 lib/gen.mjs 的分工：本文件只负责「注册工具 + 组织参数 + 拉起子进程」，
// 真正的 HTTP 请求与落盘都在 gen.mjs（零第三方依赖，也能单独当命令行用）。
import { execFileSync } from 'node:child_process'
import { join } from 'node:path'
import { homedir } from 'node:os'
import { fileURLToPath } from 'node:url'

export const name = 'dsh-creative-plugin'

// 需要宿主提供 tools 服务（ctx.tools.register）
export const inject = ['tools']

// 用模块自身位置定位 gen.mjs：插件装在哪个目录都能跑，不要写死安装路径
const GEN_SCRIPT = fileURLToPath(new URL('./gen.mjs', import.meta.url))

function defaultOutPath() {
  const stamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19)
  return join(homedir(), 'Pictures', 'dsh-creative', `creative-${stamp}.png`)
}

export function apply(ctx) {
  console.log('[dsh-creative-plugin] init')

  ctx.effect(() => ctx.tools.register({
    name: 'creative_generate_image',
    description: 'Generate an image through an OpenAI-compatible text-to-image endpoint (default: StepFun step-image-edit-2). Use it when the user asks to generate/create/draw an image.',
    parameters: {
      type: 'object',
      properties: {
        prompt: { type: 'string', description: 'Image prompt; English works best' },
        out: { type: 'string', description: 'Optional output PNG path (default: ~/Pictures/dsh-creative/creative-<timestamp>.png)' },
        model: { type: 'string', description: 'Image model id (default: step-image-edit-2)' },
        baseUrl: { type: 'string', description: 'Base URL of the image endpoint, without /images/generations (default: https://api.stepfun.com/step_plan/v1)' },
      },
      required: ['prompt'],
    },
    output: {
      schema: {
        type: 'object',
        additionalProperties: true,
        properties: {
          ok: { type: 'boolean' },
          message: { type: 'string' },
          path: { type: 'string' },
          logs: { type: 'string' },
          error: { type: 'object', additionalProperties: true },
        },
        required: ['ok', 'message'],
      },
      render: (_args, value) => [{ type: 'text', text: typeof value === 'string' ? value : JSON.stringify(value) }],
    },
    async execute(args) {
      const prompt = args?.prompt
      if (!prompt) return { ok: false, message: 'prompt is required' }

      const outputPath = args?.out || defaultOutPath()
      const argv = [GEN_SCRIPT, '--prompt', prompt, '--out', outputPath]
      if (args?.model) argv.push('--model', args.model)
      if (args?.baseUrl) argv.push('--base-url', args.baseUrl)

      try {
        // 用 execFile 传数组参数，绕开 shell 引号与注入问题
        const logs = execFileSync(process.execPath, argv, { encoding: 'utf8', timeout: 180000 })
        return { ok: true, message: `Image generated: ${outputPath}`, path: outputPath, logs }
      } catch (err) {
        return {
          ok: false,
          message: `Image generation failed: ${err.message}`,
          error: { name: err.name, message: err.message, stderr: String(err.stderr ?? '') },
        }
      }
    },
  }), 'dsh-creative-plugin: image generation tool')
}
