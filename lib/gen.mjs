// dsh-creative-plugin 生图脚本（零第三方依赖，Node 18+）
// 用法: node lib/gen.mjs --prompt-file <utf8文件> [--out <目标png路径>] [--model step-image-edit-2]
// 通道: StepFun Step Plan 包月套餐端点（文生图模型 step-image-edit-2，返回 b64_json）
// key 读取顺序: env STEPFUN_API_KEY -> C:\Users\ASUS\.dsh\.credentials.yaml
import { readFileSync, writeFileSync, existsSync } from 'node:fs'
import { join } from 'node:path'
import { homedir } from 'node:os'

function parseArgs(argv) {
  const args = {
    model: 'step-image-edit-2',
    baseUrl: 'https://api.stepfun.com/step_plan/v1',
    out: null,
    promptFile: null,
    prompt: null,
  }
  for (let i = 2; i < argv.length; i++) {
    const a = argv[i]
    if (a === '--prompt-file') args.promptFile = argv[++i]
    else if (a === '--out') args.out = argv[++i]
    else if (a === '--model') args.model = argv[++i]
    else if (a === '--base-url') args.baseUrl = argv[++i]
    else if (a === '--prompt') args.prompt = argv[++i]
  }
  return args
}

function readKey() {
  if (process.env.STEPFUN_API_KEY) return process.env.STEPFUN_API_KEY
  const p = join(homedir(), '.dsh', '.credentials.yaml')
  if (existsSync(p)) {
    const raw = readFileSync(p, 'utf8')
    const m = raw.match(/STEPFUN_API_KEY\s*[:=]\s*(\S+)/)
    if (m) return m[1]
  }
  throw new Error('STEPFUN_API_KEY not found')
}

const args = parseArgs(process.argv)
let prompt = args.prompt
if (!prompt && args.promptFile) prompt = readFileSync(args.promptFile, 'utf8').trim()
if (!prompt) { console.error('usage: --prompt <text> or --prompt-file <file>'); process.exit(2) }

const key = readKey()
const controller = new AbortController()
const timer = setTimeout(() => controller.abort(), 180000)

let res
try {
  res = await fetch(`${args.baseUrl}/images/generations`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${key}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      model: args.model,
      prompt,
      response_format: 'b64_json',
      text_mode: true,
      cfg_scale: 1.0,
      steps: 8,
    }),
    signal: controller.signal,
  })
} catch (e) {
  clearTimeout(timer)
  console.error('REQUEST_FAILED:', e.message)
  process.exit(1)
}

const body = await res.json()
clearTimeout(timer)
if (!res.ok || !body.data || !body.data[0]) {
  console.error('API_ERROR', res.status, JSON.stringify(body))
  process.exit(1)
}

const b64 = body.data[0].b64_json
if (!b64) {
  console.error('NO_B64_JSON in response (does this model/plan support images?)', JSON.stringify(body.data[0]))
  process.exit(1)
}

const buf = Buffer.from(b64, 'base64')
console.log('IMAGE_BYTES:', buf.length)

if (args.out) {
  writeFileSync(args.out, buf)
  console.log('SAVED:', args.out)
} else {
  console.log('NO_OUT specified, skip save')
}
console.log('DONE')
