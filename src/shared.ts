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

/** HTTP proxy configuration used for GitHub tarball downloads. */
export interface ProxyConfig {
  /** Whether downloads route through {@link ProxyConfig.url}. */
  enabled: boolean
  /** Proxy URL, e.g. `http://127.0.0.1:10808`; may be a mixed proxy. */
  url: string
}

/** One action the Settings page asks the Host to run. */
export interface WireCommand {
  /** Opaque client-generated id echoed on the matching result. */
  id: string
  /** The action to perform. */
  action: 'list' | 'install' | 'update' | 'uninstall'
  /**
   * `install`/`update`: the skill source (`owner/repo[/path][@tag]`).
   * `uninstall`: the installed skill name.
   */
  input?: string
}

/** The outcome of one command, written back by the Host. */
export interface WireResult {
  /** The command id this result answers; absent for host-initiated errors. */
  id?: string
  /** Whether the action completed. */
  ok: boolean
  /** Human-readable outcome or failure text. */
  message: string
  /** JSON payload for structured results (`list`, `install`, ...). */
  data?: string
}

/** The settings namespace section this plugin owns. */
export interface WireSection {
  /** GitHub download proxy configuration. */
  proxy: ProxyConfig
  /** Whether the read-only `.claude/skills` compatibility provider is on. */
  compatClaude: boolean
  /** Pending client command; the Host consumes it once. */
  command?: WireCommand
  /** Latest command outcome the Client renders. */
  result?: WireResult
}

/** Settings namespace this plugin registers on both halves. */
export const SETTINGS_NS = 'skill-manager'

/** Installation manifest file, stored under `<dshHome>/.skill-manager/`. */
export const MANIFEST_FILE = 'manifest.json'
/** Work directory under `<dshHome>/.skill-manager/` for downloads/extract. */
export const WORK_DIR = '.skill-manager'
/** User-level skill root scanned by the harness (`<dshHome>/skills`). */
export const USER_SKILLS_DIR = 'skills'

/** Rank for the `.claude/skills` compatibility provider candidates. */
export const CLAUDE_COMPAT_RANK = 250
/** Provider name registered on `ctx.skills`. */
export const CLAUDE_COMPAT_PROVIDER = 'skill-manager-claude'
/** Source label attached to compatibility candidates. */
export const CLAUDE_COMPAT_SOURCE = 'compat-claude'