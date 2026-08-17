/**
 * Installer behavior against real tarball fixtures (created with the `tar`
 * package) and real temp directories.
 *
 * @module dsh-skill-manager/installer.spec
 */

import { promises as fsp } from 'node:fs'
import * as os from 'node:os'
import * as path from 'node:path'
import { c as createArchive } from 'tar'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import {
  installFromSource,
  loadManifest,
  saveManifest,
  uninstallSkill,
  type Manifest,
} from '../src/installer.ts'
import type { RepoSource } from '../src/source.ts'

let tmpRoot: string

beforeEach(async () => {
  tmpRoot = await fsp.mkdtemp(path.join(os.tmpdir(), 'skill-manager-test-'))
})

afterEach(async () => {
  await fsp.rm(tmpRoot, { recursive: true, force: true })
})

/** Pack a file map into a GitHub-style tarball (`<prefix>/...` entries). Each
 * call uses a fresh staging directory so archives never accumulate leftovers
 * from earlier calls in the same test. */
async function packRepo(fileMap: Record<string, string>, prefix = 'repo-main', file?: string): Promise<string> {
  const stage = await fsp.mkdtemp(path.join(tmpRoot, 'stage-'))
  const target = file ?? path.join(tmpRoot, 'fixture.tgz')
  for (const [relative, content] of Object.entries(fileMap)) {
    const abs = path.join(stage, relative)
    await fsp.mkdir(path.dirname(abs), { recursive: true })
    await fsp.writeFile(abs, content, 'utf8')
  }
  await createArchive({ file: target, cwd: stage, gzip: true, prefix }, ['.'])
  return target
}

async function setup(overrides: {
  skillsRoot?: string
  tmpBase?: string
  source?: RepoSource
  mode?: 'install' | 'update'
  manifest?: Manifest
  fixture?: string
} = {}): Promise<{
  skillsDir: string
  tmpBase: string
  manifest: Manifest
  installed: string[]
}> {
  const skillsDir = overrides.skillsRoot ?? path.join(tmpRoot, 'skills')
  const tmpBase = overrides.tmpBase ?? path.join(tmpRoot, 'work')
  const manifest = overrides.manifest ?? { version: 1, skills: {} }
  const fixture = overrides.fixture ?? await packRepo({
    'doc-skill/SKILL.md': '---\nname: doc-skill\ndescription: A doc skill\n---\n# Body\n',
  })
  const source = overrides.source ?? { owner: 'acme', repo: 'repo-ke' }
  const outcome = await installFromSource({
    source,
    mode: overrides.mode ?? 'install',
    skillsDir,
    tmpBase,
    manifest,
    download: async (_url, file) => { await fsp.copyFile(fixture, file) },
  })
  return { skillsDir, tmpBase, manifest, installed: outcome.installed }
}

describe('installFromSource', () => {
  it('installs a bundle skill and records the manifest', async () => {
    const { skillsDir, manifest, installed } = await setup()
    expect(installed).toEqual(['doc-skill'])
    const doc = path.join(skillsDir, 'doc-skill', 'SKILL.md')
    expect(await fsp.readFile(doc, 'utf8')).toContain('# Body')
    const entry = manifest.skills['doc-skill']
    expect(entry.source).toBe('acme/repo-ke')
    expect(entry.owner).toBe('acme')
    expect(Array.isArray(entry.installedAt)).toBe(false)
  })

  it('installs a flat <name>.md skill at the root file position', async () => {
    const fixture = await packRepo({ 'flat-skill.md': '---\nname: flat-skill\ndescription: Flat\n---\nbody' })
    const skillsDir = path.join(tmpRoot, 'skills')
    const manifest = { version: 1, skills: {} }
    const outcome = await installFromSource({
      source: { owner: 'a', repo: 'b' },
      mode: 'install',
      skillsDir,
      tmpBase: path.join(tmpRoot, 'work'),
      manifest,
      download: async (_url, file) => { await fsp.copyFile(fixture, file) },
    })
    expect(outcome.installed).toEqual(['flat-skill'])
    expect(await fsp.readFile(path.join(skillsDir, 'flat-skill.md'), 'utf8')).toContain('body')
  })

  it('honors a repo subpath for discovery', async () => {
    const fixture = await packRepo({ 'skills/deep-skill/SKILL.md': '---\nname: deep-skill\ndescription: Deep\n---\nbody' }, 'repo-main', path.join(tmpRoot, 'sub.tgz'))
    const skillsDir = path.join(tmpRoot, 'skills')
    const manifest = { version: 1, skills: {} }
    const outcome = await installFromSource({
      source: { owner: 'a', repo: 'b', path: 'skills' },
      mode: 'install',
      skillsDir,
      tmpBase: path.join(tmpRoot, 'work'),
      manifest,
      download: async (_url, file) => { await fsp.copyFile(fixture, file) },
    })
    expect(outcome.installed).toEqual(['deep-skill'])
  })

  it('reports conflicts in install mode and replaces in update mode', async () => {
    const fixtureOne = await packRepo({
      'one/SKILL.md': '---\nname: one\ndescription: One\n---\nold-content',
    }, 'repo-main', path.join(tmpRoot, 'one.tgz'))
    const fixtureBoth = await packRepo({
      'one/SKILL.md': '---\nname: one\ndescription: One\n---\nupdated-content',
      'two/SKILL.md': '---\nname: two\ndescription: Two\n---\nnew-content',
    }, 'repo-main', path.join(tmpRoot, 'both.tgz'))
    const skillsDir = path.join(tmpRoot, 'skills')
    const manifest = { version: 1, skills: {} }

    // Pre-install only "one".
    await installFromSource({
      source: { owner: 'a', repo: 'b' }, mode: 'install', skillsDir, tmpBase: path.join(tmpRoot, 'work-a'), manifest,
      download: async (_url, file) => { await fsp.copyFile(fixtureOne, file) },
    })

    // install mode now refuses the existing name, keeps the new one.
    const outcome = await installFromSource({
      source: { owner: 'a', repo: 'b' }, mode: 'install', skillsDir, tmpBase: path.join(tmpRoot, 'work-b'), manifest,
      download: async (_url, file) => { await fsp.copyFile(fixtureBoth, file) },
    })
    expect(outcome.conflicts).toEqual(['one'])
    expect(outcome.installed).toEqual(['two'])
    expect(await fsp.readFile(path.join(skillsDir, 'one', 'SKILL.md'), 'utf8')).toContain('old-content')

    // update mode replaces the bundle content.
    const updated = await installFromSource({
      source: { owner: 'a', repo: 'b' }, mode: 'update', skillsDir, tmpBase: path.join(tmpRoot, 'work-c'), manifest,
      download: async (_url, file) => { await fsp.copyFile(fixtureBoth, file) },
    })
    expect(updated.installed.sort()).toEqual(['one', 'two'])
    expect(await fsp.readFile(path.join(skillsDir, 'one', 'SKILL.md'), 'utf8')).toContain('updated-content')
  })

  it('skips invalid frontmatter and throws when nothing installable', async () => {
    const fixture = await packRepo({
      'bad/SKILL.md': '---\nname: NotKebab\ndescription: nope\n---\n',
      'good/SKILL.md': '---\nname: good\ndescription: ok\n---\nbody',
    }, 'repo-main', path.join(tmpRoot, 'mixed.tgz'))
    const skillsDir = path.join(tmpRoot, 'skills')
    const manifest = { version: 1, skills: {} }
    const outcome = await installFromSource({
      source: { owner: 'a', repo: 'b' }, mode: 'install', skillsDir, tmpBase: path.join(tmpRoot, 'work'), manifest,
      download: async (_url, file) => { await fsp.copyFile(fixture, file) },
    })
    expect(outcome.installed).toEqual(['good'])
    expect(outcome.invalid).toEqual(['bad'])

    const onlyBad = await packRepo({ 'bad/SKILL.md': '---\nname: AlsoBad\ndescription: nope\n---\n' }, 'repo-main', path.join(tmpRoot, 'bad.tgz'))
    await expect(installFromSource({
      source: { owner: 'a', repo: 'b' }, mode: 'install', skillsDir, tmpBase: path.join(tmpRoot, 'work'), manifest,
      download: async (_url, file) => { await fsp.copyFile(onlyBad, file) },
    })).rejects.toThrow(/invalid/)

    const empty = await packRepo({ 'LICENSE': 'MIT' }, 'repo-main', path.join(tmpRoot, 'empty.tgz'))
    await expect(installFromSource({
      source: { owner: 'a', repo: 'b' }, mode: 'install', skillsDir, tmpBase: path.join(tmpRoot, 'work'), manifest,
      download: async (_url, file) => { await fsp.copyFile(empty, file) },
    })).rejects.toThrow(/no skill found/)
  })

  it('cleans up the temp work directory', async () => {
    const tmpBase = path.join(tmpRoot, 'work')
    await setup({ tmpBase })
    const leftovers = await fsp.readdir(tmpBase).catch(() => [])
    expect(leftovers).toEqual([])
  })
})

describe('uninstallSkill', () => {
  it('removes the directory, the flat file, and the manifest entry', async () => {
    const skillsDir = path.join(tmpRoot, 'skills')
    const manifest = { version: 1, skills: {} }
    await setup({ skillsRoot: skillsDir })

    const fixture = await packRepo({ 'flat-skill.md': '---\nname: flat-skill\ndescription: Flat\n---\nbody' }, 'repo-main', path.join(tmpRoot, 'flat.tgz'))
    await installFromSource({
      source: { owner: 'a', repo: 'b' }, mode: 'install', skillsDir, tmpBase: path.join(tmpRoot, 'work'), manifest,
      download: async (_url, file) => { await fsp.copyFile(fixture, file) },
    })

    expect(await uninstallSkill('doc-skill', skillsDir, manifest)).toBe(true)
    expect(manifest.skills['doc-skill']).toBeUndefined()
    await expect(fsp.access(path.join(skillsDir, 'doc-skill'))).rejects.toThrow()

    expect(await uninstallSkill('flat-skill', skillsDir, manifest)).toBe(true)
    await expect(fsp.access(path.join(skillsDir, 'flat-skill.md'))).rejects.toThrow()

    expect(await uninstallSkill('ghost', skillsDir, manifest)).toBe(false)
  })
})

describe('manifest persistence', () => {
  it('round-trips through a file', async () => {
    const file = path.join(tmpRoot, 'dir', 'manifest.json')
    const manifest: Manifest = {
      version: 1,
      skills: {
        'doc-skill': {
          name: 'doc-skill', description: 'd', source: 'a/b', owner: 'a', repo: 'b',
          installedAt: '2026-01-01T00:00:00.000Z', updatedAt: '2026-01-01T00:00:00.000Z',
        },
      },
    }
    await saveManifest(file, manifest)
    expect(await loadManifest(file)).toEqual(manifest)
  })

  it('starts empty for a missing or corrupt file', async () => {
    expect(await loadManifest(path.join(tmpRoot, 'nope.json'))).toEqual({ version: 1, skills: {} })
    const corrupt = path.join(tmpRoot, 'corrupt.json')
    await fsp.writeFile(corrupt, '{not json', 'utf8')
    expect(await loadManifest(corrupt)).toEqual({ version: 1, skills: {} })
  })
})