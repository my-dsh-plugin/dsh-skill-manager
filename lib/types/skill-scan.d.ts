/**
 * Filesystem scanning of skill directories. Both the installer (repo
 * tarballs) and the `.claude/skills` compatibility provider share one scan
 * contract: a root whose direct children are skill entries. An entry is a
 * kebab-case directory carrying `SKILL.md` (bundle form) or a kebab-case
 * flat Markdown file. A `skills/` subdirectory is honored as an additional
 * container, mirroring common repo conventions.
 *
 * @module dsh-skill-manager/skill-scan
 */
/** One discovered skill entry on disk. */
export interface SkillEntry {
    /** Kebab-case skill name (the directory or file base name). */
    name: string;
    /** Absolute path of the skill bundle directory (bundle form). */
    dir?: string;
    /** Absolute path of the flat skill document (flat form). */
    file?: string;
    /** Absolute path of the document to parse. */
    docPath: string;
}
/**
 * Scan one root directory for skill entries (no recursion).
 * @param root - absolute directory to scan.
 * @returns discovered entries, skipping names that are not kebab-case.
 */
export declare function scanRoot(root: string, signal?: AbortSignal): Promise<SkillEntry[]>;
/**
 * Scan a search root for skill entries, honoring a `skills/` subdirectory as
 * an additional container: `root/<name>` / `root/<name>.md` and
 * `root/skills/<name>` / `root/skills/<name>.md`. Missing directories are
 * empty.
 * @param searchRoot - absolute directory to scan.
 * @param signal - optional cancellation.
 * @returns discovered entries across both containers.
 */
export declare function scanSkillEntries(searchRoot: string, signal?: AbortSignal): Promise<SkillEntry[]>;
//# sourceMappingURL=skill-scan.d.ts.map