import { createInterface } from 'node:readline'

export function options(args) {
  const flags = { allowWrites: false }
  for (let i = 0; i < args.length; i += 1) {
    if (args[i] === '--allow-writes') flags.allowWrites = true
    else if (args[i] === '--url' && args[i + 1]) flags.url = args[++i]
    else throw new Error('Supported options: --url ORIGIN, --allow-writes')
  }
  return flags
}

export const string = (maxLength, minLength = 1) => ({ type: 'string', minLength, maxLength })
export const integer = (maximum, minimum = 1) => ({ type: 'integer', minimum, maximum })
export const choice = (...values) => ({ type: 'string', enum: values })
export const schema = (properties, ...required) => ({ type: 'object', properties, required, additionalProperties: false })

function validate(spec, value) {
  if (!value || Array.isArray(value) || typeof value !== 'object') throw new Error('Expected an argument object.')
  for (const key of spec.required) if (!Object.hasOwn(value, key)) throw new Error(`Missing argument: ${key}`)
  for (const [key, arg] of Object.entries(value)) {
    const field = spec.properties[key]
    if (!Object.hasOwn(spec.properties, key)) throw new Error('Unknown argument.')
    const valid = field.type === 'string'
      ? typeof arg === 'string' && (field.enum ? field.enum.includes(arg) : arg.trim().length >= field.minLength && arg.length <= field.maxLength)
      : Number.isSafeInteger(arg) && arg >= field.minimum && arg <= field.maximum
    if (!valid) throw new Error(`Invalid argument: ${key}`)
  }
}

export function tool(name, description, inputSchema, run, write = false) {
  return { name, description, inputSchema, run, write }
}

export async function serve(name, tools) {
  const byName = new Map(tools.map((entry) => [entry.name, entry]))
  const reply = (body) => process.stdout.write(JSON.stringify({ jsonrpc: '2.0', ...body }) + '\n')
  for await (const line of createInterface({ input: process.stdin, crlfDelay: Infinity })) {
    let input
    try {
      input = JSON.parse(line)
    } catch {
      reply({ id: null, error: { code: -32700, message: 'Invalid JSON' } })
      continue
    }
    if (!input || !Object.hasOwn(input, 'id')) continue
    const { id, method, params } = input
    if (method === 'initialize') {
      reply({ id, result: { protocolVersion: '2024-11-05', capabilities: { tools: {} }, serverInfo: { name, version: '1.0.0' } } })
    } else if (method === 'ping') {
      reply({ id, result: {} })
    } else if (method === 'tools/list') {
      reply({ id, result: { tools: tools.map(({ name, description, inputSchema, write }) => ({ name, description, inputSchema, annotations: { readOnlyHint: !write, destructiveHint: write, idempotentHint: !write } })) } })
    } else if (method === 'tools/call') {
      const entry = byName.get(params?.name)
      try {
        if (!entry) throw new Error('Tool unavailable. Write tools require explicit owner opt-in.')
        const args = params?.arguments ?? {}
        validate(entry.inputSchema, args)
        const value = await entry.run(args)
        reply({ id, result: { content: [{ type: 'text', text: JSON.stringify(value) }] } })
      } catch (error) {
        reply({ id, result: { isError: true, content: [{ type: 'text', text: error instanceof Error ? error.message : 'Operation failed.' }] } })
      }
    } else {
      reply({ id, error: { code: -32601, message: 'Method not found' } })
    }
  }
}
