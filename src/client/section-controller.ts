/**
 * The section's controller: binds the plugin settings scope, sends commands
 * to the Host through the `command` field, and resolves them against the
 * `result` field the Host writes back. Host actions run sequentially, so one
 * outstanding command per promise is enough; a timeout guards against a
 * stalled download.
 *
 * @module dsh-skill-manager/client/section-controller
 */

import type { SettingsScope, SettingsScopeSnapshot } from '@deepseek-ai/dsh-client-runtime/client'
import type { ProxyConfig, WireCommand, WireResult, WireSection } from '../shared.ts'

/** One request-bound snapshot projection. */
export interface CardSnapshot<T> {
  status: 'loading' | 'ready' | 'unavailable'
  writable: boolean
  section: T
}

/** Observable source the renderer binds as a snapshot hook. */
export interface CardSource<T> {
  getSnapshot(): CardSnapshot<T>
  subscribe(listener: () => void): () => void
}

/** Row for one loaded skill (from the Host catalog snapshot). */
export interface LoadedSkillRow {
  name: string
  description: string
  source: string
  provider: string
  resourcePath?: string
}

/** Row for one plugin-managed installed skill. */
export interface InstalledSkillRow {
  name: string
  description: string
  source: string
  tag?: string
  installedAt: string
  updatedAt: string
}

/** Structured payload of the `list` result. */
export interface ListSnapshot {
  loaded: LoadedSkillRow[]
  installed: InstalledSkillRow[]
  complete: boolean
  root: string
}

/** Structured payload of install/update results. */
export interface ChangeSnapshot {
  installed: string[]
  conflicts: string[]
  invalid: string[]
  root: string
}

function bind<S, T>(
  scope: SettingsScope<S>,
  project: (live: SettingsScopeSnapshot<S>) => CardSnapshot<T>,
): CardSource<T> {
  const listeners = new Set<() => void>()
  let snapshot = project(scope.getSnapshot())
  scope.subscribe(() => {
    snapshot = project(scope.getSnapshot())
    for (const listener of [...listeners]) listener()
  })
  return {
    getSnapshot: () => snapshot,
    subscribe: (listener) => {
      listeners.add(listener)
      return () => {
        listeners.delete(listener)
      }
    },
  }
}

/** Awaits the Host result matching one command id. */
interface PendingCommand {
  resolve(result: WireResult): void
  reject(error: Error): void
  timer: ReturnType<typeof setTimeout>
}

/**
 * The command channel: writes commands into the section and resolves the
 * matching result, plus the config writes (proxy, compat toggle).
 */
export class SkillManagerSectionController {
  /** Live section source bound by the renderer as a hook. */
  readonly sectionSource: CardSource<WireSection | undefined>
  private readonly pending = new Map<string, PendingCommand>()
  private commandSeq = 0

  /**
   * @param scope - the bound `skill-manager` settings scope.
   */
  constructor(private readonly scope: SettingsScope<WireSection>) {
    this.sectionSource = bind(scope, live => ({
      status: live.status,
      writable: live.writable,
      section: live.value,
    }))
    scope.subscribe(() => {
      const result: WireResult | undefined = scope.getSnapshot().value?.result
      if (result === undefined || result.id === undefined) return
      const waiter = this.pending.get(result.id)
      if (waiter === undefined) return
      this.pending.delete(result.id)
      clearTimeout(waiter.timer)
      waiter.resolve(result)
    })
  }

  /**
   * Send one command and wait for its result.
   * @param action - the Host action.
   * @param input - action input (source string or skill name).
   * @param timeoutMs - how long to wait before rejecting.
   * @returns the Host result.
   * @throws Error when the section is not writable or the wait times out.
   */
  async run(action: WireCommand['action'], input?: string, timeoutMs = 180_000): Promise<WireResult> {
    const live = this.scope.getSnapshot()
    if (!live.writable) throw new Error('not-writable')
    const id = `skill-manager-${Date.now().toString(36)}-${(this.commandSeq += 1)}`
    const waiter = new Promise<WireResult>((resolve, reject) => {
      const timer = setTimeout(() => {
        if (this.pending.delete(id)) reject(new Error('timeout'))
      }, timeoutMs)
      this.pending.set(id, { resolve, reject, timer })
    })
    try {
      await this.scope.set('command', { id, action, ...input === undefined ? {} : { input } })
    } catch (error: unknown) {
      this.pending.delete(id)
      throw error
    }
    return waiter
  }

  /** Persist the proxy configuration. */
  async setProxy(proxy: ProxyConfig): Promise<void> {
    await this.scope.set('proxy', proxy)
  }

  /** Persist the `.claude/skills` compatibility toggle. */
  async setCompatClaude(enabled: boolean): Promise<void> {
    await this.scope.set('compatClaude', enabled)
  }

  /** Dispose every pending waiter (component unmount). */
  dispose(): void {
    for (const [id, waiter] of this.pending) {
      this.pending.delete(id)
      clearTimeout(waiter.timer)
      waiter.reject(new Error('disposed'))
    }
  }
}