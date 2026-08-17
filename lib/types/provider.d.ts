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
import type { SkillProvider } from '@deepseek-ai/dsh-skill';
/** Options captured at provider creation. */
export interface ClaudeCompatProviderOptions {
    /** Live gate; `false` hides every candidate (defaults to enabled). */
    enabled: () => boolean;
}
/**
 * Create the `.claude/skills` compatibility provider.
 * @param options - live gate and (reserved) configuration.
 * @returns a provider object suitable for `ctx.skills.registerProvider`.
 */
export declare function createClaudeCompatProvider(options: ClaudeCompatProviderOptions): SkillProvider;
//# sourceMappingURL=provider.d.ts.map