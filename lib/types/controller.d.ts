/**
 * Host-side command controller: turns Settings-page commands (written into
 * the plugin settings namespace) into installer work and snapshots, and
 * writes results back through the same namespace. Commands run strictly
 * sequentially; a command id is consumed at most once.
 *
 * @module dsh-skill-manager/controller
 */
import type { WireResult, WireSection } from './shared.ts';
/** The minimal slice of `ctx.skills` the controller reads. */
export interface SkillsCatalogLike {
    snapshot(options: {
        cwd?: string;
        signal?: AbortSignal;
    }): Promise<{
        skills: Array<{
            name: string;
            description: string;
            source: string;
            provider: string;
            resourceBase?: {
                kind: string;
                path?: string;
            } | undefined;
        }>;
        complete: boolean;
    }>;
}
/** Row on the Settings page for one loaded skill (from the live catalog). */
export interface LoadedSkillRow {
    name: string;
    description: string;
    source: string;
    provider: string;
    resourcePath?: string;
}
/** Row on the Settings page for one plugin-managed skill (from the manifest). */
export interface InstalledSkillRow {
    name: string;
    description: string;
    source: string;
    tag?: string;
    installedAt: string;
    updatedAt: string;
}
/** Screenshot of the controller's world, returned for the `list` command. */
export interface ListSnapshot {
    loaded: LoadedSkillRow[];
    installed: InstalledSkillRow[];
    complete: boolean;
    root: string;
}
/** Callbacks wiring the controller to its plugin context. */
export interface ControllerDeps {
    /** Read the current settings section (composition or settings layer). */
    getSection(): WireSection;
    /** Persist one command result into the settings section. */
    writeResult(result: WireResult): Promise<void>;
    /** The live skill catalog (host `ctx.skills`). */
    skills: SkillsCatalogLike;
    /** Absolute user skill root (`<dshHome>/skills`). */
    skillsDir: string;
    /** Absolute temp work base (`<dshHome>/.skill-manager`). */
    tmpBase: string;
    /** Absolute manifest file path. */
    manifestFile: string;
    /** Download hook (proxy resolved by the caller from the current section). */
    download(url: string, file: string, signal?: AbortSignal): Promise<void>;
    /** Abort source forwarded to downloads, when provided. */
    abortSignal?: () => AbortSignal | undefined;
}
/**
 * Manages the install manifest and the settings command channel.
 */
export declare class SkillManagerController {
    private readonly deps;
    private lastCommandId;
    private queue;
    private readonly manifest;
    private manifestLoaded;
    /** @param deps - plugin wiring. */
    constructor(deps: ControllerDeps);
    private ensureManifest;
    private persist;
    private list;
    private install;
    private update;
    private uninstall;
    private run;
    /**
     * React to a section change: consume a fresh command if one is queued.
     * Called by the settings wiring on every attach/detach/update.
     * @param section - the current section (read fresh by the caller).
     */
    onSectionChanged(section: WireSection): void;
}
//# sourceMappingURL=controller.d.ts.map