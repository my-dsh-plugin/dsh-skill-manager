/**
 * DSH skill frontmatter parsing and validation. Skills are Markdown
 * documents (usually `SKILL.md` inside a `<name>/` bundle, or a flat
 * `<name>.md`) with a YAML frontmatter block requiring kebab-case `name`
 * and a non-empty `description`; the harness' own filesystem provider
 * accepts the same keys.
 *
 * @module dsh-skill-manager/frontmatter
 */

import { parse as parseYaml } from 'yaml'

/** Kebab-case skill name pattern used by the harness (`^[a-z0-9]+(?:-[a-z0-9]+)*$`). */
export const SKILL_NAME = /^[a-z0-9]+(?:-[a-z0-9]+)*$/

/** The frontmatter fields this plugin interprets. */
export interface SkillMeta {
  /** Kebab-case skill id, required. */
  name: string
  /** Short routing description, required. */
  description: string
  /** Optional extended routing guidance. */
  whenToUse?: string
  /** Whether the model-facing catalog may invoke this skill. */
  modelInvocable: boolean
  /** Whether human-facing surfaces may invoke this skill. */
  userInvocable: boolean
  /** Parsed optional metadata object. */
  metadata?: Readonly<Record<string, unknown>>
}

/**
 * Validate a skill name against the harness kebab-case rule.
 * @param name - candidate name.
 * @returns whether the name is a valid DSH skill name.
 */
export function isValidSkillName(name: unknown): name is string {
  return typeof name === 'string' && SKILL_NAME.test(name)
}

/**
 * Extract the YAML frontmatter block of a skill document. The block must
 * open with a `---` line and close with the next `---` line.
 * @param text - full skill document text.
 * @returns the raw YAML block, or `undefined` when absent.
 */
export function frontmatterBlock(text: string): string | undefined {
  if (!text.startsWith('---')) return undefined
  const end = text.indexOf('\n---', 3)
  if (end < 0) return undefined
  return text.slice(3, end)
}

function booleanField(value: unknown, fallback: boolean): boolean {
  if (typeof value === 'boolean') return value
  if (typeof value === 'string') {
    const normalized = value.trim().toLowerCase()
    if (normalized === 'true' || normalized === 'yes' || normalized === 'on' || normalized === '1') return true
    if (normalized === 'false' || normalized === 'no' || normalized === 'off' || normalized === '0') return false
  }
  return fallback
}

/**
 * Parse a skill document into its frontmatter metadata.
 * @param text - full skill document text.
 * @returns parsed metadata, or `undefined` when the frontmatter is missing
 *   or does not carry a valid kebab-case `name` and non-empty `description`.
 */
export function parseSkillMeta(text: string): SkillMeta | undefined {
  const block = frontmatterBlock(text)
  if (block === undefined) return undefined
  let parsed: unknown
  try {
    parsed = parseYaml(block)
  } catch {
    return undefined
  }
  if (typeof parsed !== 'object' || parsed === null || Array.isArray(parsed)) return undefined
  const record = parsed as Record<string, unknown>
  const name = record['name']
  const description = record['description']
  if (!isValidSkillName(name)) return undefined
  if (typeof description !== 'string' || description.trim().length === 0) return undefined

  const whenToUse = record['whenToUse']
  const metadata = record['metadata']
  return {
    name,
    description: description.trim(),
    ...typeof whenToUse === 'string' && whenToUse.trim().length > 0 ? { whenToUse: whenToUse.trim() } : {},
    modelInvocable: !booleanField(record['disable-model-invocation'], false),
    userInvocable: booleanField(record['user-invocable'], true),
    ...typeof metadata === 'object' && metadata !== null && !Array.isArray(metadata)
      ? { metadata: metadata as Readonly<Record<string, unknown>> }
      : {},
  }
}