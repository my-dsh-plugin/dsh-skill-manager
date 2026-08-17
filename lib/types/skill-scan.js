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
import { promises as fsp } from 'node:fs';
import * as path from 'node:path';
import { isValidSkillName } from "./frontmatter.js";
/**
 * Scan one root directory for skill entries (no recursion).
 * @param root - absolute directory to scan.
 * @returns discovered entries, skipping names that are not kebab-case.
 */
export async function scanRoot(root, signal) {
    signal?.throwIfAborted();
    let entries;
    try {
        entries = await fsp.readdir(root, { withFileTypes: true, encoding: 'utf8' });
    }
    catch (error) {
        if (error.code === 'ENOENT')
            return [];
        throw error;
    }
    const cluster = new Map();
    for (const entry of entries) {
        signal?.throwIfAborted();
        const abs = path.join(root, entry.name);
        if (entry.isDirectory()) {
            // Bundle form: a kebab-case directory carrying SKILL.md.
            if (!isValidSkillName(entry.name))
                continue;
            const doc = path.join(abs, 'SKILL.md');
            try {
                await fsp.access(doc);
                cluster.set(entry.name, { name: entry.name, dir: abs, docPath: doc });
            }
            catch {
                // Directory without SKILL.md is not a skill bundle.
            }
        }
        else if (entry.name.endsWith('.md')) {
            // Flat form: a kebab-case `<name>.md` document; the stem is the name.
            const stem = entry.name.slice(0, -3);
            if (!isValidSkillName(stem))
                continue;
            cluster.set(stem, { name: stem, file: abs, docPath: abs });
        }
    }
    return [...cluster.values()].sort((a, b) => a.name.localeCompare(b.name));
}
/**
 * Scan a search root for skill entries, honoring a `skills/` subdirectory as
 * an additional container: `root/<name>` / `root/<name>.md` and
 * `root/skills/<name>` / `root/skills/<name>.md`. Missing directories are
 * empty.
 * @param searchRoot - absolute directory to scan.
 * @param signal - optional cancellation.
 * @returns discovered entries across both containers.
 */
export async function scanSkillEntries(searchRoot, signal) {
    const primary = await scanRoot(searchRoot, signal);
    const nested = await scanRoot(path.join(searchRoot, 'skills'), signal);
    const byName = new Map();
    for (const entry of [...primary, ...nested])
        byName.set(entry.name, entry);
    return [...byName.values()].sort((a, b) => a.name.localeCompare(b.name));
}
//# sourceMappingURL=skill-scan.js.map