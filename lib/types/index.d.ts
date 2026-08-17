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
import type { Context } from '@deepseek-ai/cordis';
import z from '@deepseek-ai/schemastery';
import { type WireSection } from './shared.ts';
export declare const name = "skill-manager";
export declare const inject: string[];
/** The user config root: `$DSH_HOME` or `~/.dsh` (the harness default). */
export declare function resolveDshHome(env?: NodeJS.ProcessEnv): string;
/** The host settings service shape this plugin needs (structural). */
export interface SettingsServiceLike {
    register<T>(ns: string, schema: z<T>, options?: {
        base?: T;
        validate?: (value: T) => void;
    }): {
        get(): unknown;
        watch(callback: () => void): void;
    };
    update(ns: string, patch: object): Promise<void>;
}
/** Optional-settings consumer wiring, mirroring `dsh-settings`' own helper. */
interface SettingsWiringHooks<T> {
    /** Receive the active configuration source (scope while attached, entry otherwise). */
    setSource(current: () => T): void;
    /** Re-judge derived state after attach, detach, or a committed change. */
    onChange(): void;
    validate?: (value: T) => void;
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
export declare function installSettingsWiring<T>(ctx: Context, ns: string, schema: z<T>, entry: T, hooks: SettingsWiringHooks<T>): void;
/**
 * Mount the host half: the settings command channel, the install controller,
 * and the `.claude/skills` compatibility provider.
 * @param ctx - plugin context; `ctx.skills` is injected.
 * @param config - schema-validated composition configuration (defaults applied).
 */
export declare function apply(ctx: Context, config?: WireSection): void;
export {};
//# sourceMappingURL=index.d.ts.map