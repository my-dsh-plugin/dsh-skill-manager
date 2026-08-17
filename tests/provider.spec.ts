/**
 * The `.claude/skills` compatibility provider: project-root discovery, the
 * live gate, frontmatter filtering, and body loading.
 *
 * @module dsh-skill-manager/provider.spec
 */

import { promises as fsp } from 'node:fs'
import * as os from 'node:os'
import * as path from 'node:path'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { createClaudeCompatProvider } from '../src/provider.ts'

let projectRoot: string

beforeEach(async () => {
  projectRoot = await fsp.mkdtemp(path.join(os.tmpdir(), 'skill-manager-provider-'))
  await fsp.mkdir(path.join(projectRoot, '.git'), { recursive: true })
  const skills = path.join(projectRoot, '.claude', 'skills')
  await fsp.mkdir(skills, { recursive: true })
  await fsp.mkdir(path.join(skills, 'greeter'), { recursive: true })
  await fsp.writeFile(
    path.join(skills, 'greeter', 'SKILL.md'),
    '---\nname: greeter\ndescription: Greet the user\n---\n# Greeter\nHello!\n',
    'utf8',
  )
  await fsp.writeFile(
    path.join(skills, 'flat-doc.md'),
    '---\nname: flat-doc\ndescription: Flat doc\n---\nbody',
    'utf8',
  )
  await fsp.mkdir(path.join(skills, 'bad'), { recursive: true })
  await fsp.writeFile(
    path.join(skills, 'bad', 'SKILL.md'),
    '---\nname: NotKebab\ndescription: nope\n---\n',
    'utf8',
  )
})

afterEach(async () => {
  await fsp.rm(projectRoot, { recursive: true, force: true })
})

const lookup = { cwd: '', signal: undefined as AbortSignal | undefined }

describe('createClaudeCompatProvider', () => {
  it('lists only valid skills with project metadata', async () => {
    const provider = createClaudeCompatProvider({ enabled: () => true })
    const candidates = await provider.list({ ...lookup, cwd: projectRoot })
    expect(candidates.map(candidate => candidate.name).sort()).toEqual(['flat-doc', 'greeter'])
    const greeter = candidates.find(candidate => candidate.name === 'greeter')!
    expect(greeter.source).toBe('compat-claude')
    expect(greeter.provider).toBe('skill-manager-claude')
    expect(greeter.rank).toBe(250)
    expect(greeter.invocation).toEqual({ modelInvocable: true, userInvocable: true })
    expect(greeter.resourceBase).toEqual({ kind: 'directory', path: path.join(projectRoot, '.claude', 'skills', 'greeter') })
    expect(greeter.path).toBe(path.join(projectRoot, '.claude', 'skills', 'greeter', 'SKILL.md'))
  })

  it('returns nothing while the gate is off', async () => {
    const provider = createClaudeCompatProvider({ enabled: () => false })
    expect(await provider.list({ ...lookup, cwd: projectRoot })).toEqual([])
  })

  it('loads the full body for a candidate', async () => {
    const provider = createClaudeCompatProvider({ enabled: () => true })
    const candidates = await provider.list({ ...lookup, cwd: projectRoot })
    const greeter = candidates.find(candidate => candidate.name === 'greeter')!
    const definition = await provider.get(greeter, { ...lookup, cwd: projectRoot })
    expect(definition?.content).toContain('# Greeter')
    expect(definition?.path).toBe(greeter.path)
    expect(definition?.provider).toBe('skill-manager-claude')
  })

  it('returns undefined once the document no longer matches its candidate', async () => {
    const provider = createClaudeCompatProvider({ enabled: () => true })
    const candidates = await provider.list({ ...lookup, cwd: projectRoot })
    const greeter = candidates.find(candidate => candidate.name === 'greeter')!
    await fsp.writeFile(
      path.join(projectRoot, '.claude', 'skills', 'greeter', 'SKILL.md'),
      '---\nname: renamed\ndescription: changed\n---\n',
      'utf8',
    )
    expect(await provider.get(greeter, { ...lookup, cwd: projectRoot })).toBeUndefined()
  })

  it('walks ancestors to find the project root from a nested cwd', async () => {
    const nested = path.join(projectRoot, 'src', 'deep')
    await fsp.mkdir(nested, { recursive: true })
    const provider = createClaudeCompatProvider({ enabled: () => true })
    const candidates = await provider.list({ ...lookup, cwd: nested })
    expect(candidates.map(candidate => candidate.name).sort()).toEqual(['flat-doc', 'greeter'])
  })
})