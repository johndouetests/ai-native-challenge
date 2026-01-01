import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { Ajv2020, type ValidateFunction } from 'ajv/dist/2020.js'
import addFormatsModule from 'ajv-formats'
import { parse } from 'yaml'

const addFormats = addFormatsModule as unknown as (ajv: Ajv2020) => Ajv2020

type Json = Record<string, unknown>

export interface OpenApiValidator {
  /** Returns a list of problems, empty when the response matches the documented schema. */
  validateResponse(method: string, path: string, status: number, body: unknown): string[]
  validateFrame(frame: unknown): string[]
  validateSchema(name: string, value: unknown): string[]
}

function escapePointer(s: string): string {
  return s.replace(/~/g, '~0').replace(/\//g, '~1')
}

export function createValidator(
  specPath = fileURLToPath(new URL('../openapi.yaml', import.meta.url)),
): OpenApiValidator {
  const doc = parse(readFileSync(specPath, 'utf8')) as Json
  const ajv = new Ajv2020({ strict: false, allErrors: true })
  addFormats(ajv)
  ajv.addSchema(doc, 'openapi')
  const cache = new Map<string, ValidateFunction>()

  function compile(pointer: string): ValidateFunction {
    let fn = cache.get(pointer)
    if (!fn) {
      fn = ajv.compile({ $ref: `openapi#${pointer}` })
      cache.set(pointer, fn)
    }
    return fn
  }

  function errors(fn: ValidateFunction, value: unknown): string[] {
    return fn(value) ? [] : (fn.errors ?? []).map((e) => `${e.instancePath || '/'} ${e.message ?? ''}`)
  }

  const paths = doc.paths as Record<string, Json>

  return {
    validateResponse(method, path, status, body) {
      const template = path.replace(/:([A-Za-z]+)/g, '{$1}')
      const op = paths[template]?.[method.toLowerCase()] as Json | undefined
      if (!op) return [`${method} ${template} is not documented`]
      const responses = op.responses as Record<string, Json>
      let response = responses[String(status)]
      if (!response) return [`${method} ${template} ${status} is not documented`]
      let pointer = `/paths/${escapePointer(template)}/${method.toLowerCase()}/responses/${status}`
      if (typeof response.$ref === 'string') {
        pointer = response.$ref.slice(1)
        const name = pointer.split('/').pop() as string
        response = ((doc.components as Json).responses as Record<string, Json>)[name]
      }
      const content = response.content as Record<string, Json> | undefined
      if (!content) return body === undefined || body === '' ? [] : ['expected an empty body']
      const type = Object.keys(content)[0]
      if (type !== 'application/json') return []
      return errors(compile(`${pointer}/content/${escapePointer(type)}/schema`), body)
    },
    validateFrame(frame) {
      return errors(compile('/components/schemas/WsFrame'), frame)
    },
    validateSchema(name, value) {
      return errors(compile(`/components/schemas/${name}`), value)
    },
  }
}
