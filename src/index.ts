/**
 * dsh-skill-manager: a DeepSeek Harness plugin that installs, updates, and
 * removes Skills from GitHub repositories into the user skill root
 * (`<dshHome>/skills`), lists the currently loaded skill catalog grouped by
 * scope, and optionally loads Claude Code style skills from
 * `.claude/skills` read-only.
 *
 * Installation is filesystem-only by design: the harness' own skill
 * filesystem provider watches the user root, so a written bundle becomes
 * loadable without any registry involvement or restart.
 *
 * The browser Settings page talks to this host half through the plugin's
 * settings namespace (`skill-manager`): the page writes a `command`, this
 * plugin executes it, and writes the `result` back. The same namespace holds
 * the durable proxy and compatibility configuration. The wiring is
 * reimplemented locally against the runtime's `settings` service (structural
 * typing) instead of importing `@deepseek-ai/dsh-settings`, whose rc.5
 * build the desktop runtime ships is not published to the npm registry.
 *
 * @module dsh-skill-manager
 */

import type { Context } from '@deepseek-ai/cordis'
import z from '@deepseek-ai/schemastery'
import { homedir } from 'node:os'
import * as path from 'node:path'
import { assertValidConfig, Config, defaultConfig } from './config.ts'
import { SkillManagerController } from './controller.ts'
import { downloadUrl } from './download.ts'
import { createClaudeCompatProvider } from './provider.ts'
import {
  MANIFEST_FILE,
  SETTINGS_NS,
  USER_SKILLS_DIR,
  WORK_DIR,
  type WireSection,
} from './shared.ts'

export const name = 'skill-manager'
export const inject = ['skills']

/** The user config root: `$DSH_HOME` or `~/.dsh` (the harness default). */
export function resolveDshHome(env: NodeJS.ProcessEnv = process.env): string {
  return env['DSH_HOME']?.trim() || path.join(homedir(), '.dsh')
}

/** The host settings service shape this plugin needs (structural). */
export interface SettingsServiceLike {
  register<T>(ns: string, schema: z<T>, options?: { base?: T; validate?: (value: T) => void }): {
    get(): unknown
    watch(callback: () => void): void
  }
  update(ns: string, patch: object): Promise<void>
}

/** Optional-settings consumer wiring, mirroring `dsh-settings`' own helper. */
interface SettingsWiringHooks<T> {
  /** Receive the active configuration source (scope while attached, entry otherwise). */
  setSource(current: () => T): void
  /** Re-judge derived state after attach, detach, or a committed change. */
  onChange(): void
  validate?: (value: T) => void
}

/**
 * Install the canonical optional-settings consumer wiring: while a settings
 * service exists, register `ns` with the composition entry as `base` and
 * point the source thunk at the resolved scope; when the service goes away,
 * fall back to the entry. Implemented here so the plugin needs no runtime
 * dependency on `@deepseek-ai/dsh-settings`.
 * @param ctx - plugin context owning the wiring.
 * @param ns - the consumer-owned settings namespace.
 * @param schema - schema resolving the namespace.
 * @param entry - the composition entry config, used as `base`.
 * @param hooks - source sink and change notification.
 */
export function installSettingsWiring<T>(
  ctx: Context,
  ns: string,
  schema: z<T>,
  entry: T,
  hooks: SettingsWiringHooks<T>,
): void {
  ctx.inject(['settings'], (sctx) => {
    const settings = ctx.get('settings') as SettingsServiceLike | undefined
    if (settings === undefined) return
    const scope = settings.register(ns, schema, {
      base: entry,
      ...hooks.validate === undefined ? {} : { validate: hooks.validate },
    })
    hooks.setSource(() => scope.get() as T)
    let disposed = false
    sctx.effect(() => () => {
      // A settings provider detaching leaves the consumer running, so it must
      // fall back to its composition entry; the consumer's own unload runs the
      // disposer too, where notifications would touch released resources.
      if (disposed) return
      disposed = true
      hooks.setSource(() => entry)
      hooks.onChange()
    })
    hooks.onChange()
    scope.watch(() => {
      if (disposed) return
      hooks.onChange()
    })
  })
}

/**
 * Mount the host half: the settings command channel, the install controller,
 * and the `.claude/skills` compatibility provider.
 * @param ctx - plugin context; `ctx.skills` is injected.
 * @param config - schema-validated composition configuration (defaults applied).
 */
export function apply(ctx: Context, config?: WireSection): void {
  const entry = config ?? defaultConfig()
  const dshHome = resolveDshHome()
  const skillsDir = path.join(dshHome, USER_SKILLS_DIR)
  const workDir = path.join(dshHome, WORK_DIR)
  const manifestFile = path.join(workDir, MANIFEST_FILE)

  let current: () => WireSection = () => entry

  const controller = new SkillManagerController({
    getSection: () => current(),
    writeResult: async (result) => {
      const settings = ctx.get('settings') as SettingsServiceLike | undefined
      if (settings === undefined) return
      await settings.update(SETTINGS_NS, { result })
    },
    skills: ctx.skills,
    skillsDir,
    tmpBase: workDir,
    manifestFile,
    download: (url, file, signal) => {
      const section = current()
      const proxy = section.proxy.enabled && section.proxy.url.trim().length > 0
        ? section.proxy.url.trim()
        : undefined
      return downloadUrl(url, file, { proxyUrl: proxy, signal })
    },
  })

  // Settings seam: while a settings service is mounted, the namespace is
  // registered with the composition entry as base and `current()` follows the
  // resolved section; commands arriving through it drive the controller.
  installSettingsWiring(ctx, SETTINGS_NS, Config, entry, {
    validate: assertValidConfig,
    setSource: (source) => {
      current = source
    },
    onChange: () => {
      controller.onSectionChanged(current())
    },
  })

  // Read-only `.claude/skills` compatibility provider, gated live by the
  // section so toggling the setting takes effect on the next catalog read.
  ctx.effect(() => {
    const disposer = ctx.skills.registerProvider(() => createClaudeCompatProvider({
      enabled: () => current().compatClaude,
    }))
    return disposer
  }, 'skill-manager: claude compat provider')
}