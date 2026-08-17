/**
 * Command controller: consuming commands from the section, deduplicating ids,
 * writing results, and driving the installer and catalog.
 *
 * @module dsh-skill-manager/controller.spec
 */

import { promises as fsp } from 'node:fs'
import * as os from 'node:os'
import * as path from 'node:path'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { SkillManagerController } from '../src/controller.ts'
import { loadManifest } from '../src/installer.ts'
import type { WireResult, WireSection } from '../src/shared.ts'

let tmpRoot: string

beforeEach(async () => {
  tmpRoot = await fsp.mkdtemp(path.join(os.tmpdir(), 'skill-manager-controller-'))
})

afterEach(async () => {
  await fsp.rm(tmpRoot, { recursive: true, force: true })
})

function makeController(overrides: {
  snapshotSkills?: Array<{ name: string; description: string; source: string; provider: string }>
  writeResult?: (result: WireResult) => Promise<void>
} = {}) {
  const results: WireResult[] = []
  const section: WireSection = { proxy: { enabled: false, url: '' }, compatClaude: true }
  const skillsDir = path.join(tmpRoot, 'skills')
  const tmpBase = path.join(tmpRoot, 'work')
  const manifestFile = path.join(tmpBase, 'manifest.json')
  const controller = new SkillManagerController({
    getSection: () => section,
    writeResult: overrides.writeResult ?? (async (result) => { results.push(result) }),
    skills: {
      snapshot: async () => ({
        skills: overrides.snapshotSkills ?? [],
        complete: true,
      }),
    },
    skillsDir,
    tmpBase,
    manifestFile,
    download: async (_url, file) => {
      // A tiny repo tarball is not needed: tests below supply direct content.
      throw new Error('unused download')
    },
  })
  return { controller, section, results, skillsDir, tmpBase, manifestFile }
}

const waitFor = async (predicate: () => boolean, timeoutMs = 2000): Promise<void> => {
  const start = Date.now()
  while (!predicate()) {
    if (Date.now() - start > timeoutMs) throw new Error('waitFor timeout')
    await new Promise(resolve => setTimeout(resolve, 10))
  }
}

describe('SkillManagerController', () => {
  it('consumes a command id once and writes the result', async () => {
    const { controller, section, results } = makeController({
      snapshotSkills: [{ name: 'a', description: 'A', source: 'user-dsh', provider: 'filesystem' }],
    })
    section.command = { id: 'cmd-1', action: 'list' }
    controller.onSectionChanged(section)
    controller.onSectionChanged(section) // duplicate must be ignored
    await waitFor(() => results.length === 1)
    expect(results[0]!.id).toBe('cmd-1')
    expect(results[0]!.ok).toBe(true)
    const payload = JSON.parse(results[0]!.data ?? '{}') as {
      loaded: Array<{ name: string }>
      installed: Array<{ name: string }>
      complete: boolean
    }
    expect(payload.loaded.map(row => row.name)).toEqual(['a'])
    expect(payload.installed).toEqual([])
    expect(payload.complete).toBe(true)
  })

  it('reports failures as an ok:false result with the message', async () => {
    const { controller, section, results } = makeController()
    section.command = { id: 'cmd-2', action: 'install', input: '' }
    controller.onSectionChanged(section)
    await waitFor(() => results.length === 1)
    expect(results[0]!.ok).toBe(false)
    expect(results[0]!.message).toContain('install requires a source')
  })

  it('records an uninstall in the manifest file', async () => {
    const { controller, section, results, skillsDir, manifestFile } = makeController()
    // Seed a fake installed skill on disk and in the manifest.
    await fsp.mkdir(path.join(skillsDir, 'old-skill'), { recursive: true })
    await fsp.writeFile(path.join(skillsDir, 'old-skill', 'SKILL.md'), '---\nname: old-skill\ndescription: x\n---\n', 'utf8')
    section.command = { id: 'cmd-3', action: 'uninstall', input: 'old-skill' }
    controller.onSectionChanged(section)
    await waitFor(() => results.length === 1)
    expect(results[0]!.ok).toBe(true)
    await fsp.access(path.join(skillsDir, 'old-skill')).catch(() => undefined)
    const manifest = await loadManifest(manifestFile)
    expect(manifest.skills['old-skill']).toBeUndefined()
  })
})