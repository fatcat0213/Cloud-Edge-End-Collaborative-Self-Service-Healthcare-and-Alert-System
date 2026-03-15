import { existsSync } from 'fs'
import { resolve, dirname } from 'path'
import { fileURLToPath } from 'url'
import { describe, it, expect } from 'vitest'

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)

describe('CSS token files', () => {
  it('variables.css exists', () => {
    const path = resolve(__dirname, '../styles/variables.css')
    expect(existsSync(path)).toBe(true)
  })
  it('element-override.css exists', () => {
    const path = resolve(__dirname, '../styles/element-override.css')
    expect(existsSync(path)).toBe(true)
  })
})
