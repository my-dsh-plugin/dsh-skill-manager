/**
 * DSH skill frontmatter parsing and validation. Skills are Markdown
 * documents (usually `SKILL.md` inside a `<name>/` bundle, or a flat
 * `<name>.md`) with a YAML frontmatter block requiring kebab-case `name`
 * and a non-empty `description`; the harness' own filesystem provider
 * accepts the same keys.
 *
 * @module dsh-skill-manager/frontmatter
 */
/** Kebab-case skill name pattern used by the harness (`^[a-z0-9]+(?:-[a-z0-9]+)*$`). */
export declare const SKILL_NAME: RegExp;
/** The frontmatter fields this plugin interprets. */
export interface SkillMeta {
    /** Kebab-case skill id, required. */
    name: string;
    /** Short routing description, required. */
    description: string;
    /** Optional extended routing guidance. */
    whenToUse?: string;
    /** Whether the model-facing catalog may invoke this skill. */
    modelInvocable: boolean;
    /** Whether human-facing surfaces may invoke this skill. */
    userInvocable: boolean;
    /** Parsed optional metadata object. */
    metadata?: Readonly<Record<string, unknown>>;
}
/**
 * Validate a skill name against the harness kebab-case rule.
 * @param name - candidate name.
 * @returns whether the name is a valid DSH skill name.
 */
export declare function isValidSkillName(name: unknown): name is string;
/**
 * Extract the YAML frontmatter block of a skill document. The block must
 * open with a `---` line and close with the next `---` line.
 * @param text - full skill document text.
 * @returns the raw YAML block, or `undefined` when absent.
 */
export declare function frontmatterBlock(text: string): string | undefined;
/**
 * Parse a skill document into its frontmatter metadata.
 * @param text - full skill document text.
 * @returns parsed metadata, or `undefined` when the frontmatter is missing
 *   or does not carry a valid kebab-case `name` and non-empty `description`.
 */
export declare function parseSkillMeta(text: string): SkillMeta | undefined;
//# sourceMappingURL=frontmatter.d.ts.map