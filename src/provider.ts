/**
 * Read-only skill provider for Claude Code style skill directories
 * (`.claude/skills/<name>/SKILL.md`). Claude Code, Cline, and friends share
 * the same SKILL.md + YAML frontmatter convention as DSH, so their skills
 * become loadable in DeepSeek Harness without moving files. The provider is
 * project-scoped (rank 250, between the native `.agents/skills` project row
 * and the user rows).
 *
 * @module dsh-skill-manager/provider
 */

import { promises as fsp } from 'node:fs'
import * as path from 'node:path'
import type {
  SkillCandidate,
  SkillDefinition,
  SkillLookupOptions,
  SkillProvider,
} from '@deepseek-ai/dsh-skill'
import { parseSkillMeta } from './frontmatter.ts'
import { scanSkillEntries, type SkillEntry } from './skill-scan.ts'
import { CLAUDE_COMPAT_PROVIDER, CLAUDE_COMPAT_RANK, CLAUDE_COMPAT_SOURCE } from './shared.ts'

/** Locator stored on candidates by this provider. */
interface Locator {
  entry: SkillEntry
}

/** Options captured at provider creation. */
export interface ClaudeCompatProviderOptions {
  /** Live gate; `false` hides every candidate (defaults to enabled). */
  enabled: () => boolean
}

/** Walk ancestors of `cwd` for a `.git` directory (the harness' project root rule). */
async function findProjectRoot(cwd: string, signal?: AbortSignal): Promise<string | undefined> {
  let current = cwd
  for (;;) {
    signal?.throwIfAborted()
    try {
      await fsp.access(path.join(current, '.git'))
      return current
    } catch {
      // Continue upward.
    }
    const parent = path.dirname(current)
    if (parent === current) return undefined
    current = parent
  }
}

async function readEntry(entry: SkillEntry, signal?: AbortSignal): Promise<string | undefined> {
  try {
    return await fsp.readFile(entry.docPath, { encoding: 'utf8', ...(signal === undefined ? {} : { signal }) })
  } catch {
    return undefined
  }
}

/**
 * Create the `.claude/skills` compatibility provider.
 * @param options - live gate and (reserved) configuration.
 * @returns a provider object suitable for `ctx.skills.registerProvider`.
 */
export function createClaudeCompatProvider(options: ClaudeCompatProviderOptions): SkillProvider {
  return {
    name: CLAUDE_COMPAT_PROVIDER,

    async list(lookup: SkillLookupOptions): Promise<SkillCandidate[]> {
      if (!options.enabled()) return []
      const cwd = lookup.cwd ?? process.cwd()
      const projectRoot = (await findProjectRoot(cwd, lookup.signal)) ?? cwd
      const scanRoot = path.join(projectRoot, '.claude', 'skills')
      const entries = await scanSkillEntries(scanRoot, lookup.signal)
      const candidates: SkillCandidate[] = []
      for (const entry of entries) {
        const text = await readEntry(entry, lookup.signal)
        if (text === undefined) continue
        const meta = parseSkillMeta(text)
        if (meta === undefined) continue
        // Native discovery keys a skill by its folder/file name; a frontmatter
        // name that does not match is rejected there, so it is skipped here too.
        if (meta.name !== entry.name) continue
        candidates.push({
          name: meta.name,
          description: meta.description,
          ...meta.whenToUse === undefined ? {} : { whenToUse: meta.whenToUse },
          invocation: { modelInvocable: meta.modelInvocable, userInvocable: meta.userInvocable },
          source: CLAUDE_COMPAT_SOURCE,
          provider: CLAUDE_COMPAT_PROVIDER,
          rank: CLAUDE_COMPAT_RANK,
          locator: { entry } satisfies Locator,
          // Bundle form has a real resource base; flat form has none.
          ...entry.dir === undefined ? {} : { resourceBase: { kind: 'directory' as const, path: entry.dir } },
          path: entry.docPath,
        })
      }
      return candidates
    },

    async get(candidate: SkillCandidate, lookup: SkillLookupOptions): Promise<SkillDefinition | undefined> {
      const locator = candidate.locator as Locator | undefined
      if (locator?.entry === undefined) return undefined
      const text = await readEntry(locator.entry, lookup.signal)
      if (text === undefined) return undefined
      const meta = parseSkillMeta(text)
      // A renamed or malformed document no longer matches its candidate.
      if (meta === undefined || meta.name !== candidate.name) return undefined
      return {
        name: meta.name,
        description: meta.description,
        ...meta.whenToUse === undefined ? {} : { whenToUse: meta.whenToUse },
        invocation: { modelInvocable: meta.modelInvocable, userInvocable: meta.userInvocable },
        source: CLAUDE_COMPAT_SOURCE,
        provider: CLAUDE_COMPAT_PROVIDER,
        ...candidate.resourceBase === undefined ? {} : { resourceBase: candidate.resourceBase },
        content: text,
        ...candidate.path === undefined ? {} : { path: candidate.path },
        ...meta.metadata === undefined ? {} : { metadata: meta.metadata },
      }
    },
  }
}