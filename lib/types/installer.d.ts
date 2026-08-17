/**
 * Install, update, and remove skill packages in the user skill root.
 * A source is downloaded as a codeload tarball, extracted, scanned for skill
 * bundles, validated, and copied into `<dshHome>/skills/<name>/`, with the
 * install manifest kept in `<dshHome>/.skill-manager/manifest.json`. The
 * harness' own filesystem provider watches the root, so installation takes
 * effect without any registry involvement.
 *
 * @module dsh-skill-manager/installer
 */
import { type RepoSource } from './source.ts';
/** One record in the install manifest. */
export interface ManifestEntry {
    /** Skill name (also the directory name under the skills root). */
    name: string;
    /** Frontmatter description captured at install time. */
    description: string;
    /** Canonical source string (`owner/repo[/path][@tag]`). */
    source: string;
    owner: string;
    repo: string;
    /** Skill subpath inside the repository, when one was given. */
    path?: string;
    /** Ref the skill was fetched from, when one was given. */
    tag?: string;
    /** ISO timestamp of the first installation. */
    installedAt: string;
    /** ISO timestamp of the latest installation. */
    updatedAt: string;
}
/** The install manifest: name-keyed records, versioned for future migration. */
export interface Manifest {
    version: 1;
    skills: Record<string, ManifestEntry>;
}
/** Outcome of one install/update pass. */
export interface InstallOutcome {
    /** Skills actually installed or replaced. */
    installed: string[];
    /** Names skipped because a same-name skill already exists (install mode). */
    conflicts: string[];
    /** Names skipped because their frontmatter failed validation. */
    invalid: string[];
    /** Where each installed skill landed (`<name>` = `<root>/<name>`). */
    root: string;
}
/** Inputs for one install/update pass (download injected for testability). */
export interface InstallContext {
    /** Repository location to fetch. */
    source: RepoSource;
    /** Whether to refuse existing names (`install`) or replace them (`update`). */
    mode: 'install' | 'update';
    /** Absolute user skill root where bundles are copied. */
    skillsDir: string;
    /** Base directory for temp work; a unique subdir is created and removed. */
    tmpBase: string;
    /** Manifest object mutated in place by the pass. */
    manifest: Manifest;
    /** Download hook (defaults to the real GitHub downloader). */
    download: (url: string, file: string, signal?: AbortSignal) => Promise<void>;
    signal?: AbortSignal | undefined;
}
/** Read the manifest; a missing or corrupt file starts empty. */
export declare function loadManifest(file: string): Promise<Manifest>;
/** Persist the manifest atomically (write temp, rename). */
export declare function saveManifest(file: string, manifest: Manifest): Promise<void>;
/**
 * Download, validate, and install every skill found in a source's tarball.
 * Mutates `ctx.manifest`; the caller persists it.
 * @param ctx - install inputs.
 * @returns the outcome; throws when the source yields no installable skill.
 */
export declare function installFromSource(ctx: InstallContext): Promise<InstallOutcome>;
/**
 * Remove one installed skill and its manifest entry. Bundle form leaves the
 * `<root>/<name>` directory; flat form leaves `<root>/<name>.md`.
 * @param name - skill name.
 * @param skillsDir - absolute user skill root.
 * @param manifest - manifest mutated in place; absent names are a no-op.
 * @returns whether the manifest entry or a filesystem artifact was removed.
 */
export declare function uninstallSkill(name: string, skillsDir: string, manifest: Manifest): Promise<boolean>;
//# sourceMappingURL=installer.d.ts.map