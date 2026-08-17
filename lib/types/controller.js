/**
 * Host-side command controller: turns Settings-page commands (written into
 * the plugin settings namespace) into installer work and snapshots, and
 * writes results back through the same namespace. Commands run strictly
 * sequentially; a command id is consumed at most once.
 *
 * @module dsh-skill-manager/controller
 */
import { installFromSource, loadManifest, saveManifest, uninstallSkill } from "./installer.js";
import { parseSource } from "./source.js";
function fail(message) {
    throw new Error(`skill-manager: ${message}`);
}
/**
 * Manages the install manifest and the settings command channel.
 */
export class SkillManagerController {
    deps;
    lastCommandId;
    queue = Promise.resolve();
    manifest = { version: 1, skills: {} };
    manifestLoaded = false;
    /** @param deps - plugin wiring. */
    constructor(deps) {
        this.deps = deps;
    }
    async ensureManifest() {
        if (!this.manifestLoaded) {
            const loaded = await loadManifest(this.deps.manifestFile);
            this.manifest.skills = loaded.skills;
            this.manifestLoaded = true;
        }
        return this.manifest;
    }
    async persist() {
        await saveManifest(this.deps.manifestFile, this.manifest);
    }
    async list() {
        let loaded = [];
        let complete = true;
        try {
            const snapshot = await this.deps.skills.snapshot({});
            loaded = snapshot.skills.map(skill => ({
                name: skill.name,
                description: skill.description,
                source: skill.source,
                provider: skill.provider,
                ...skill.resourceBase !== undefined && skill.resourceBase.kind === 'directory'
                    ? { resourcePath: skill.resourceBase.path }
                    : {},
            }));
            complete = snapshot.complete;
        }
        catch (error) {
            // Catalog failures do not fail the page: the manifest alone still renders.
            complete = false;
            console.error(`skill-manager: catalog snapshot failed: ${String(error)}`);
        }
        const manifest = await this.ensureManifest();
        const installed = Object.values(manifest.skills)
            .sort((a, b) => a.name.localeCompare(b.name))
            .map(entry => ({
            name: entry.name,
            description: entry.description,
            source: entry.source,
            ...entry.tag === undefined ? {} : { tag: entry.tag },
            installedAt: entry.installedAt,
            updatedAt: entry.updatedAt,
        }));
        const snapshotView = { loaded, installed, complete, root: this.deps.skillsDir };
        return { ok: true, message: 'ok', data: JSON.stringify(snapshotView) };
    }
    async install(input) {
        if (input === undefined || input.trim().length === 0)
            fail('install requires a source like owner/repo[/path][@tag]');
        const source = parseSource(input);
        const manifest = await this.ensureManifest();
        const outcome = await installFromSource({
            source,
            mode: 'install',
            skillsDir: this.deps.skillsDir,
            tmpBase: this.deps.tmpBase,
            manifest,
            download: this.deps.download,
            signal: this.deps.abortSignal?.(),
        });
        await this.persist();
        const parts = [];
        if (outcome.installed.length > 0)
            parts.push(`installed ${outcome.installed.join(', ')}`);
        if (outcome.conflicts.length > 0)
            parts.push(`already exists: ${outcome.conflicts.join(', ')}`);
        if (outcome.invalid.length > 0)
            parts.push(`invalid frontmatter: ${outcome.invalid.join(', ')}`);
        return {
            ok: outcome.installed.length > 0,
            message: parts.length > 0 ? parts.join('; ') : 'nothing done',
            data: JSON.stringify({
                installed: outcome.installed,
                conflicts: outcome.conflicts,
                invalid: outcome.invalid,
                root: outcome.root,
            }),
        };
    }
    async update(input) {
        if (input === undefined || input.trim().length === 0)
            fail('update requires the installed skill name');
        const manifest = await this.ensureManifest();
        const entry = manifest.skills[input.trim()];
        if (entry === undefined)
            fail(`"${input}" is not in the install manifest; install it first`);
        const source = parseSource(`${entry.source}${entry.tag === undefined ? '' : `@${entry.tag}`}`);
        const outcome = await installFromSource({
            source,
            mode: 'update',
            skillsDir: this.deps.skillsDir,
            tmpBase: this.deps.tmpBase,
            manifest,
            download: this.deps.download,
            signal: this.deps.abortSignal?.(),
        });
        await this.persist();
        return {
            ok: outcome.installed.length > 0,
            message: outcome.installed.length > 0 ? `updated ${outcome.installed.join(', ')}` : 'nothing updated',
            data: JSON.stringify({ updated: outcome.installed, root: outcome.root }),
        };
    }
    async uninstall(input) {
        if (input === undefined || input.trim().length === 0)
            fail('uninstall requires the installed skill name');
        const manifest = await this.ensureManifest();
        const removed = await uninstallSkill(input.trim(), this.deps.skillsDir, manifest);
        if (!removed)
            fail(`"${input}" is not installed`);
        await this.persist();
        return { ok: true, message: `removed ${input.trim()}`, data: JSON.stringify({ removed: [input.trim()] }) };
    }
    async run(command) {
        let result;
        try {
            switch (command.action) {
                case 'list':
                    result = await this.list();
                    break;
                case 'install':
                    result = await this.install(command.input);
                    break;
                case 'update':
                    result = await this.update(command.input);
                    break;
                case 'uninstall':
                    result = await this.uninstall(command.input);
                    break;
            }
            result = { ...result, id: command.id };
        }
        catch (error) {
            result = { id: command.id, ok: false, message: error instanceof Error ? error.message : String(error) };
        }
        try {
            await this.deps.writeResult(result);
        }
        catch (error) {
            console.error(`skill-manager: cannot write result for ${command.action}: ${String(error)}`);
        }
    }
    /**
     * React to a section change: consume a fresh command if one is queued.
     * Called by the settings wiring on every attach/detach/update.
     * @param section - the current section (read fresh by the caller).
     */
    onSectionChanged(section) {
        const command = section.command;
        if (command === undefined || command.id === this.lastCommandId)
            return;
        this.lastCommandId = command.id;
        this.queue = this.queue.then(() => this.run(command));
    }
}
//# sourceMappingURL=controller.js.map