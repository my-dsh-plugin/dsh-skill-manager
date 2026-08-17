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
import { promises as fsp } from 'node:fs';
import * as path from 'node:path';
import { x as extractTar } from 'tar';
import { parseSkillMeta } from "./frontmatter.js";
import { scanSkillEntries } from "./skill-scan.js";
import { sourceRecord, tarballUrl } from "./source.js";
/** Read the manifest; a missing or corrupt file starts empty. */
export async function loadManifest(file) {
    let text;
    try {
        text = await fsp.readFile(file, 'utf8');
    }
    catch (error) {
        if (error.code === 'ENOENT')
            return { version: 1, skills: {} };
        throw error;
    }
    try {
        const parsed = JSON.parse(text);
        if (parsed?.version !== 1 || typeof parsed.skills !== 'object' || parsed.skills === null) {
            return { version: 1, skills: {} };
        }
        const skills = {};
        for (const [name, entry] of Object.entries(parsed.skills)) {
            if (typeof entry !== 'object' || entry === null)
                continue;
            if (typeof entry.name !== 'string')
                continue;
            skills[name] = entry;
        }
        return { version: 1, skills };
    }
    catch {
        return { version: 1, skills: {} };
    }
}
/** Persist the manifest atomically (write temp, rename). */
export async function saveManifest(file, manifest) {
    await fsp.mkdir(path.dirname(file), { recursive: true });
    const tmp = `${file}.tmp`;
    await fsp.writeFile(tmp, `${JSON.stringify(manifest, null, 2)}\n`, 'utf8');
    await fsp.rename(tmp, file);
}
function entryRecord(meta, source, now) {
    return {
        name: meta.name,
        description: meta.description,
        source: sourceRecord(source),
        owner: source.owner,
        repo: source.repo,
        ...source.path === undefined ? {} : { path: source.path },
        ...source.tag === undefined ? {} : { tag: source.tag },
        installedAt: now,
        updatedAt: now,
    };
}
/**
 * Copy one skill entry into the skills root. Bundle form lands at
 * `<root>/<name>/` (with its assets); flat form must land at the root file
 * `<root>/<name>.md` because the harness' flat discovery only reads
 * root-level documents.
 */
async function copySkill(entry, skillsDir) {
    if (entry.dir !== undefined) {
        const destination = path.join(skillsDir, entry.name);
        await fsp.mkdir(destination, { recursive: true });
        await fsp.cp(entry.dir, destination, {
            recursive: true,
            // Skip VCS metadata; everything else in the bundle is copied.
            filter: (src) => !src.split(path.sep).includes('.git'),
        });
        return;
    }
    // Flat form: the document itself is the skill, at the root file position.
    await fsp.copyFile(entry.docPath, path.join(skillsDir, `${entry.name}.md`));
}
/**
 * Download, validate, and install every skill found in a source's tarball.
 * Mutates `ctx.manifest`; the caller persists it.
 * @param ctx - install inputs.
 * @returns the outcome; throws when the source yields no installable skill.
 */
export async function installFromSource(ctx) {
    const outcome = { installed: [], conflicts: [], invalid: [], root: ctx.skillsDir };
    await fsp.mkdir(ctx.skillsDir, { recursive: true });
    await fsp.mkdir(ctx.tmpBase, { recursive: true });
    const tmpRoot = await fsp.mkdtemp(path.join(ctx.tmpBase, 'install-'));
    try {
        const tarFile = path.join(tmpRoot, 'repo.tgz');
        await ctx.download(tarballUrl(ctx.source), tarFile, ctx.signal);
        const extractDir = path.join(tmpRoot, 'x');
        await fsp.mkdir(extractDir, { recursive: true });
        await extractTar({ file: tarFile, cwd: extractDir, strip: 1 });
        const searchRoot = ctx.source.path === undefined
            ? extractDir
            : path.resolve(extractDir, ctx.source.path);
        if (!searchRoot.startsWith(`${extractDir}${path.sep}`) && searchRoot !== extractDir) {
            throw new Error(`skill-manager: source path escapes the repository archive: ${ctx.source.path}`);
        }
        const entries = await scanSkillEntries(searchRoot, ctx.signal);
        if (entries.length === 0) {
            throw new Error(`skill-manager: no skill found at ${sourceRecord(ctx.source)}; expected <name>/SKILL.md or <name>.md`);
        }
        const now = new Date().toISOString();
        for (const entry of entries) {
            ctx.signal?.throwIfAborted();
            let text;
            try {
                text = await fsp.readFile(entry.docPath, 'utf8');
            }
            catch {
                continue;
            }
            const meta = parseSkillMeta(text);
            if (meta === undefined) {
                outcome.invalid.push(entry.name);
                continue;
            }
            // The harness treats the filesystem name as authoritative: a bundle
            // whose frontmatter `name` mismatches its folder/file is rejected by
            // native discovery, so such entries are never installed under a rename.
            if (meta.name !== entry.name) {
                outcome.invalid.push(entry.name);
                continue;
            }
            const destination = path.join(ctx.skillsDir, meta.name);
            const exists = await existsPath(destination);
            if (exists && ctx.mode === 'install') {
                outcome.conflicts.push(meta.name);
                continue;
            }
            if (exists) {
                await fsp.rm(destination, { recursive: true, force: true });
            }
            await copySkill(entry, ctx.skillsDir);
            const previous = ctx.manifest.skills[meta.name];
            ctx.manifest.skills[meta.name] = {
                ...entryRecord(meta, ctx.source, now),
                ...previous === undefined ? {} : { installedAt: previous.installedAt },
            };
            outcome.installed.push(meta.name);
        }
        if (outcome.installed.length === 0) {
            const reasons = [
                ...outcome.conflicts.map(name => `"${name}" already installed`),
                ...outcome.invalid.map(name => `"${name}" frontmatter invalid`),
            ];
            throw new Error(`skill-manager: nothing installed from ${sourceRecord(ctx.source)}`
                + (reasons.length === 0 ? '' : ` (${reasons.join('; ')})`));
        }
        // Update mode: a renamed skill leaves its old directory behind; remove
        // entries previously recorded from the same source that no longer exist.
        if (ctx.mode === 'update') {
            const recorded = sourceRecord(ctx.source);
            const fresh = new Set(outcome.installed);
            for (const [name, entry] of Object.entries(ctx.manifest.skills)) {
                if (entry.source !== recorded || fresh.has(name))
                    continue;
                await fsp.rm(path.join(ctx.skillsDir, name), { recursive: true, force: true });
                delete ctx.manifest.skills[name];
            }
        }
        return outcome;
    }
    finally {
        await fsp.rm(tmpRoot, { recursive: true, force: true, maxRetries: 3 });
    }
}
async function existsPath(target) {
    try {
        await fsp.access(target);
        return true;
    }
    catch (error) {
        if (error.code === 'ENOENT')
            return false;
        throw error;
    }
}
/**
 * Remove one installed skill and its manifest entry. Bundle form leaves the
 * `<root>/<name>` directory; flat form leaves `<root>/<name>.md`.
 * @param name - skill name.
 * @param skillsDir - absolute user skill root.
 * @param manifest - manifest mutated in place; absent names are a no-op.
 * @returns whether the manifest entry or a filesystem artifact was removed.
 */
export async function uninstallSkill(name, skillsDir, manifest) {
    const entry = manifest.skills[name];
    if (entry !== undefined)
        delete manifest.skills[name];
    const directory = path.join(skillsDir, name);
    const file = path.join(skillsDir, `${name}.md`);
    let removed = false;
    for (const target of [directory, file]) {
        if (await existsPath(target)) {
            await fsp.rm(target, { recursive: true, force: true });
            removed = true;
        }
    }
    return entry !== undefined || removed;
}
//# sourceMappingURL=installer.js.map