/**
 * Host-side command controller: turns Settings-page commands (written into
 * the plugin settings namespace) into installer work and snapshots, and
 * writes results back through the same namespace. Commands run strictly
 * sequentially; a command id is consumed at most once.
 *
 * @module dsh-skill-manager/controller
 */

import { installFromSource, loadManifest, saveManifest, uninstallSkill, type Manifest } from './installer.ts'
import { parseSource } from './source.ts'
import type { WireCommand, WireResult, WireSection } from './shared.ts'
import type { ManifestEntry } from './installer.ts'

/** The minimal slice of `ctx.skills` the controller reads. */
export interface SkillsCatalogLike {
  snapshot(options: { cwd?: string; signal?: AbortSignal }): Promise<{
    skills: Array<{
      name: string
      description: string
      source: string
      provider: string
      resourceBase?: { kind: string; path?: string } | undefined
    }>
    complete: boolean
  }>
}

/** Row on the Settings page for one loaded skill (from the live catalog). */
export interface LoadedSkillRow {
  name: string
  description: string
  source: string
  provider: string
  resourcePath?: string
}

/** Row on the Settings page for one plugin-managed skill (from the manifest). */
export interface InstalledSkillRow {
  name: string
  description: string
  source: string
  tag?: string
  installedAt: string
  updatedAt: string
}

/** Screenshot of the controller's world, returned for the `list` command. */
export interface ListSnapshot {
  loaded: LoadedSkillRow[]
  installed: InstalledSkillRow[]
  complete: boolean
  root: string
}

/** Callbacks wiring the controller to its plugin context. */
export interface ControllerDeps {
  /** Read the current settings section (composition or settings layer). */
  getSection(): WireSection
  /** Persist one command result into the settings section. */
  writeResult(result: WireResult): Promise<void>
  /** The live skill catalog (host `ctx.skills`). */
  skills: SkillsCatalogLike
  /** Absolute user skill root (`<dshHome>/skills`). */
  skillsDir: string
  /** Absolute temp work base (`<dshHome>/.skill-manager`). */
  tmpBase: string
  /** Absolute manifest file path. */
  manifestFile: string
  /** Download hook (proxy resolved by the caller from the current section). */
  download(url: string, file: string, signal?: AbortSignal): Promise<void>
  /** Abort source forwarded to downloads, when provided. */
  abortSignal?: () => AbortSignal | undefined
}

function fail(message: string): never {
  throw new Error(`skill-manager: ${message}`)
}

/**
 * Manages the install manifest and the settings command channel.
 */
export class SkillManagerController {
  private lastCommandId: string | undefined
  private queue: Promise<void> = Promise.resolve()
  private readonly manifest: Manifest = { version: 1, skills: {} }
  private manifestLoaded = false

  /** @param deps - plugin wiring. */
  constructor(private readonly deps: ControllerDeps) {}

  private async ensureManifest(): Promise<Manifest> {
    if (!this.manifestLoaded) {
      const loaded = await loadManifest(this.deps.manifestFile)
      this.manifest.skills = loaded.skills
      this.manifestLoaded = true
    }
    return this.manifest
  }

  private async persist(): Promise<void> {
    await saveManifest(this.deps.manifestFile, this.manifest)
  }

  private async list(): Promise<WireResult> {
    let loaded: LoadedSkillRow[] = []
    let complete = true
    try {
      const snapshot = await this.deps.skills.snapshot({})
      loaded = snapshot.skills.map(skill => ({
        name: skill.name,
        description: skill.description,
        source: skill.source,
        provider: skill.provider,
        ...skill.resourceBase !== undefined && skill.resourceBase.kind === 'directory'
          ? { resourcePath: skill.resourceBase.path }
          : {},
      }))
      complete = snapshot.complete
    } catch (error: unknown) {
      // Catalog failures do not fail the page: the manifest alone still renders.
      complete = false
      console.error(`skill-manager: catalog snapshot failed: ${String(error)}`)
    }
    const manifest = await this.ensureManifest()
    const installed: InstalledSkillRow[] = Object.values(manifest.skills)
      .sort((a, b) => a.name.localeCompare(b.name))
      .map(entry => ({
        name: entry.name,
        description: entry.description,
        source: entry.source,
        ...entry.tag === undefined ? {} : { tag: entry.tag },
        installedAt: entry.installedAt,
        updatedAt: entry.updatedAt,
      }))
    const snapshotView: ListSnapshot = { loaded, installed, complete, root: this.deps.skillsDir }
    return { ok: true, message: 'ok', data: JSON.stringify(snapshotView) }
  }

  private async install(input: string | undefined): Promise<WireResult> {
    if (input === undefined || input.trim().length === 0) fail('install requires a source like owner/repo[/path][@tag]')
    const source = parseSource(input)
    const manifest = await this.ensureManifest()
    const outcome = await installFromSource({
      source,
      mode: 'install',
      skillsDir: this.deps.skillsDir,
      tmpBase: this.deps.tmpBase,
      manifest,
      download: this.deps.download,
      signal: this.deps.abortSignal?.(),
    })
    await this.persist()
    const parts: string[] = []
    if (outcome.installed.length > 0) parts.push(`installed ${outcome.installed.join(', ')}`)
    if (outcome.conflicts.length > 0) parts.push(`already exists: ${outcome.conflicts.join(', ')}`)
    if (outcome.invalid.length > 0) parts.push(`invalid frontmatter: ${outcome.invalid.join(', ')}`)
    return {
      ok: outcome.installed.length > 0,
      message: parts.length > 0 ? parts.join('; ') : 'nothing done',
      data: JSON.stringify({
        installed: outcome.installed,
        conflicts: outcome.conflicts,
        invalid: outcome.invalid,
        root: outcome.root,
      }),
    }
  }

  private async update(input: string | undefined): Promise<WireResult> {
    if (input === undefined || input.trim().length === 0) fail('update requires the installed skill name')
    const manifest = await this.ensureManifest()
    const entry: ManifestEntry | undefined = manifest.skills[input.trim()]
    if (entry === undefined) fail(`"${input}" is not in the install manifest; install it first`)
    const source = parseSource(`${entry.source}${entry.tag === undefined ? '' : `@${entry.tag}`}`)
    const outcome = await installFromSource({
      source,
      mode: 'update',
      skillsDir: this.deps.skillsDir,
      tmpBase: this.deps.tmpBase,
      manifest,
      download: this.deps.download,
      signal: this.deps.abortSignal?.(),
    })
    await this.persist()
    return {
      ok: outcome.installed.length > 0,
      message: outcome.installed.length > 0 ? `updated ${outcome.installed.join(', ')}` : 'nothing updated',
      data: JSON.stringify({ updated: outcome.installed, root: outcome.root }),
    }
  }

  private async uninstall(input: string | undefined): Promise<WireResult> {
    if (input === undefined || input.trim().length === 0) fail('uninstall requires the installed skill name')
    const manifest = await this.ensureManifest()
    const removed = await uninstallSkill(input.trim(), this.deps.skillsDir, manifest)
    if (!removed) fail(`"${input}" is not installed`)
    await this.persist()
    return { ok: true, message: `removed ${input.trim()}`, data: JSON.stringify({ removed: [input.trim()] }) }
  }

  private async run(command: WireCommand): Promise<void> {
    let result: WireResult
    try {
      switch (command.action) {
        case 'list':
          result = await this.list()
          break
        case 'install':
          result = await this.install(command.input)
          break
        case 'update':
          result = await this.update(command.input)
          break
        case 'uninstall':
          result = await this.uninstall(command.input)
          break
      }
      result = { ...result, id: command.id }
    } catch (error: unknown) {
      result = { id: command.id, ok: false, message: error instanceof Error ? error.message : String(error) }
    }
    try {
      await this.deps.writeResult(result)
    } catch (error: unknown) {
      console.error(`skill-manager: cannot write result for ${command.action}: ${String(error)}`)
    }
  }

  /**
   * React to a section change: consume a fresh command if one is queued.
   * Called by the settings wiring on every attach/detach/update.
   * @param section - the current section (read fresh by the caller).
   */
  onSectionChanged(section: WireSection): void {
    const command = section.command
    if (command === undefined || command.id === this.lastCommandId) return
    this.lastCommandId = command.id
    this.queue = this.queue.then(() => this.run(command))
  }
}