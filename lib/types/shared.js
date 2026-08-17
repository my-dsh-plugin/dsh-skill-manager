/**
 * Wire types shared by the Host and Client halves of the skill-manager
 * plugin. This module must stay dependency-free: the Client bundle can only
 * import modules with no Node or Host imports.
 *
 * The plugin rides the standard settings capability as its command channel:
 * the Settings page writes a `command` into the plugin's settings namespace,
 * the Host watches the namespace, executes the action, and writes the
 * `result` back. Both fields are transient; `proxy` and `compatClaude` are
 * the durable configuration.
 *
 * @module dsh-skill-manager/shared
 */
/** Settings namespace this plugin registers on both halves. */
export const SETTINGS_NS = 'skill-manager';
/** Installation manifest file, stored under `<dshHome>/.skill-manager/`. */
export const MANIFEST_FILE = 'manifest.json';
/** Work directory under `<dshHome>/.skill-manager/` for downloads/extract. */
export const WORK_DIR = '.skill-manager';
/** User-level skill root scanned by the harness (`<dshHome>/skills`). */
export const USER_SKILLS_DIR = 'skills';
/** Rank for the `.claude/skills` compatibility provider candidates. */
export const CLAUDE_COMPAT_RANK = 250;
/** Provider name registered on `ctx.skills`. */
export const CLAUDE_COMPAT_PROVIDER = 'skill-manager-claude';
/** Source label attached to compatibility candidates. */
export const CLAUDE_COMPAT_SOURCE = 'compat-claude';
//# sourceMappingURL=shared.js.map