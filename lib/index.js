import { homedir } from "node:os";
import * as path from "node:path";
import z from "@deepseek-ai/schemastery";
import { createWriteStream, promises } from "node:fs";
import { x } from "tar";
import { parse } from "yaml";
import { get } from "node:https";
import { HttpsProxyAgent } from "https-proxy-agent";
//#region lib/types/config.js
/**
* Configuration schema and load-time validation for the skill-manager plugin.
* The section schema carries the transient command channel fields alongside
* the durable configuration so the Settings page can write them through the
* standard settings seam.
*
* @module dsh-skill-manager/config
*/
/**
* One client command on the wire. Every field is optional in the schema:
* schemastery injects a default `{}` for object fields without an explicit
* default, and a required inner field would fail namespace registration. The
* controller guards on `command.id` at runtime, so a default-empty command is
* ignored; real commands always carry `id` and `action`.
*/
const commandSchema = z.object({
	id: z.string(),
	action: z.union([
		"list",
		"install",
		"update",
		"uninstall"
	]),
	input: z.string()
});
/** One host result on the wire; fields optional for the same reason. */
const resultSchema = z.object({
	id: z.string(),
	ok: z.boolean(),
	message: z.string(),
	data: z.string()
});
/** Runtime schema for the whole {@link WireSection}. */
const Config = z.object({
	proxy: z.object({
		enabled: z.boolean().default(false),
		url: z.string().default("")
	}),
	compatClaude: z.boolean().default(true),
	command: commandSchema,
	result: resultSchema
});
/** Composition entry values when no settings layer writes anything. */
function defaultConfig() {
	return {
		proxy: {
			enabled: false,
			url: ""
		},
		compatClaude: true
	};
}
/**
* Reject a section the schema accepts but the plugin cannot serve: a proxy
* that is enabled without a URL will fail every download at runtime.
* @param section - the schema-validated section.
* @throws Error naming the offending field.
*/
function assertValidConfig(section) {
	if (section.proxy.enabled && section.proxy.url.trim().length === 0) throw new Error("skill-manager: proxy is enabled but no proxy URL is set; disable it or provide http://host:port");
}
//#endregion
//#region lib/types/frontmatter.js
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
const SKILL_NAME = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
/**
* Validate a skill name against the harness kebab-case rule.
* @param name - candidate name.
* @returns whether the name is a valid DSH skill name.
*/
function isValidSkillName(name) {
	return typeof name === "string" && SKILL_NAME.test(name);
}
/**
* Extract the YAML frontmatter block of a skill document. The block must
* open with a `---` line and close with the next `---` line.
* @param text - full skill document text.
* @returns the raw YAML block, or `undefined` when absent.
*/
function frontmatterBlock(text) {
	if (!text.startsWith("---")) return void 0;
	const end = text.indexOf("\n---", 3);
	if (end < 0) return void 0;
	return text.slice(3, end);
}
function booleanField(value, fallback) {
	if (typeof value === "boolean") return value;
	if (typeof value === "string") {
		const normalized = value.trim().toLowerCase();
		if (normalized === "true" || normalized === "yes" || normalized === "on" || normalized === "1") return true;
		if (normalized === "false" || normalized === "no" || normalized === "off" || normalized === "0") return false;
	}
	return fallback;
}
/**
* Parse a skill document into its frontmatter metadata.
* @param text - full skill document text.
* @returns parsed metadata, or `undefined` when the frontmatter is missing
*   or does not carry a valid kebab-case `name` and non-empty `description`.
*/
function parseSkillMeta(text) {
	const block = frontmatterBlock(text);
	if (block === void 0) return void 0;
	let parsed;
	try {
		parsed = parse(block);
	} catch {
		return;
	}
	if (typeof parsed !== "object" || parsed === null || Array.isArray(parsed)) return void 0;
	const record = parsed;
	const name = record["name"];
	const description = record["description"];
	if (!isValidSkillName(name)) return void 0;
	if (typeof description !== "string" || description.trim().length === 0) return void 0;
	const whenToUse = record["whenToUse"];
	const metadata = record["metadata"];
	return {
		name,
		description: description.trim(),
		...typeof whenToUse === "string" && whenToUse.trim().length > 0 ? { whenToUse: whenToUse.trim() } : {},
		modelInvocable: !booleanField(record["disable-model-invocation"], false),
		userInvocable: booleanField(record["user-invocable"], true),
		...typeof metadata === "object" && metadata !== null && !Array.isArray(metadata) ? { metadata } : {}
	};
}
//#endregion
//#region lib/types/skill-scan.js
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
/**
* Scan one root directory for skill entries (no recursion).
* @param root - absolute directory to scan.
* @returns discovered entries, skipping names that are not kebab-case.
*/
async function scanRoot(root, signal) {
	signal?.throwIfAborted();
	let entries;
	try {
		entries = await promises.readdir(root, {
			withFileTypes: true,
			encoding: "utf8"
		});
	} catch (error) {
		if (error.code === "ENOENT") return [];
		throw error;
	}
	const cluster = /* @__PURE__ */ new Map();
	for (const entry of entries) {
		signal?.throwIfAborted();
		const abs = path.join(root, entry.name);
		if (entry.isDirectory()) {
			if (!isValidSkillName(entry.name)) continue;
			const doc = path.join(abs, "SKILL.md");
			try {
				await promises.access(doc);
				cluster.set(entry.name, {
					name: entry.name,
					dir: abs,
					docPath: doc
				});
			} catch {}
		} else if (entry.name.endsWith(".md")) {
			const stem = entry.name.slice(0, -3);
			if (!isValidSkillName(stem)) continue;
			cluster.set(stem, {
				name: stem,
				file: abs,
				docPath: abs
			});
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
async function scanSkillEntries(searchRoot, signal) {
	const primary = await scanRoot(searchRoot, signal);
	const nested = await scanRoot(path.join(searchRoot, "skills"), signal);
	const byName = /* @__PURE__ */ new Map();
	for (const entry of [...primary, ...nested]) byName.set(entry.name, entry);
	return [...byName.values()].sort((a, b) => a.name.localeCompare(b.name));
}
//#endregion
//#region lib/types/source.js
/**
* Parsing of GitHub skill sources into a canonical repo locator, and building
* the codeload tarball URL. Pure functions with no I/O so they are unit
* tested directly.
*
* @module dsh-skill-manager/source
*/
const SEGMENT = /^[A-Za-z0-9_.-]+$/;
const TAG = /^[A-Za-z0-9_.-]+$/;
/** Canonical string form of a source, used in manifest records. */
function sourceRecord(source) {
	return `${`${source.owner}/${source.repo}`}${source.path === void 0 ? "" : `/${source.path.split("/").join("/")}`}${source.tag === void 0 ? "" : `@${source.tag}`}`;
}
/** codeload tarball URL for a source (the `tar.gz/HEAD` form selects the default branch). */
function tarballUrl(source) {
	const ref = source.tag ?? "HEAD";
	return `https://codeload.github.com/${source.owner}/${source.repo}/tar.gz/${ref}`;
}
function fail$1(input) {
	throw new Error(`skill-manager: "${input}" is not a valid GitHub skill source; use owner/repo, owner/repo/sub/path, optionally @tag (or a https://github.com/... URL)`);
}
/**
* Parse a user-supplied source into a {@link RepoSource}.
* Accepts `owner/repo[/path][@tag]` and the full GitHub URL forms
* `https://github.com/owner/repo` / `.../tree/<ref>/<path>` /
* `.../blob/<ref>/<path>`.
* @param input - the raw source string.
* @returns the parsed source.
* @throws Error on a malformed or unsafe source.
*/
function parseSource(input) {
	const raw = input.trim();
	if (raw.length === 0) fail$1(raw);
	let rest = raw;
	let tag;
	const urlMatch = /^https?:\/\/github\.com\/(.+)$/i.exec(rest);
	if (urlMatch !== null) {
		const marker = /^([^/]+)\/([^/]+)\/(tree|blob)\/([^/]+)\/?(.*)$/.exec(urlMatch[1]);
		if (marker !== null) {
			tag = marker[4];
			const tail = marker[5];
			rest = tail.length === 0 ? `${marker[1]}/${marker[2]}` : `${marker[1]}/${marker[2]}/${tail}`;
		} else rest = urlMatch[1];
	}
	const at = rest.lastIndexOf("@");
	if (at > 0 && rest[at - 1] !== "/") {
		const candidate = rest.slice(at + 1);
		if (TAG.test(candidate)) {
			tag = candidate;
			rest = rest.slice(0, at);
		}
	}
	if (rest.endsWith("/")) fail$1(raw);
	const segments = rest.split("/");
	if (segments.some((segment) => segment.length === 0)) fail$1(raw);
	if (segments.length < 2) fail$1(raw);
	const owner = segments[0];
	const repo = segments[1];
	if (!SEGMENT.test(owner) || !SEGMENT.test(repo) || owner === "." || owner === ".." || repo === "." || repo === "..") fail$1(raw);
	const pathSegments = segments.slice(2);
	for (const segment of pathSegments) if (!SEGMENT.test(segment) || segment === "." || segment === "..") fail$1(raw);
	const path = pathSegments.length === 0 ? void 0 : pathSegments.join("/");
	return {
		owner,
		repo,
		...path === void 0 ? {} : { path },
		...tag === void 0 ? {} : { tag }
	};
}
//#endregion
//#region lib/types/installer.js
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
/** Read the manifest; a missing or corrupt file starts empty. */
async function loadManifest(file) {
	let text;
	try {
		text = await promises.readFile(file, "utf8");
	} catch (error) {
		if (error.code === "ENOENT") return {
			version: 1,
			skills: {}
		};
		throw error;
	}
	try {
		const parsed = JSON.parse(text);
		if (parsed?.version !== 1 || typeof parsed.skills !== "object" || parsed.skills === null) return {
			version: 1,
			skills: {}
		};
		const skills = {};
		for (const [name, entry] of Object.entries(parsed.skills)) {
			if (typeof entry !== "object" || entry === null) continue;
			if (typeof entry.name !== "string") continue;
			skills[name] = entry;
		}
		return {
			version: 1,
			skills
		};
	} catch {
		return {
			version: 1,
			skills: {}
		};
	}
}
/** Persist the manifest atomically (write temp, rename). */
async function saveManifest(file, manifest) {
	await promises.mkdir(path.dirname(file), { recursive: true });
	const tmp = `${file}.tmp`;
	await promises.writeFile(tmp, `${JSON.stringify(manifest, null, 2)}\n`, "utf8");
	await promises.rename(tmp, file);
}
function entryRecord(meta, source, now) {
	return {
		name: meta.name,
		description: meta.description,
		source: sourceRecord(source),
		owner: source.owner,
		repo: source.repo,
		...source.path === void 0 ? {} : { path: source.path },
		...source.tag === void 0 ? {} : { tag: source.tag },
		installedAt: now,
		updatedAt: now
	};
}
/**
* Copy one skill entry into the skills root. Bundle form lands at
* `<root>/<name>/` (with its assets); flat form must land at the root file
* `<root>/<name>.md` because the harness' flat discovery only reads
* root-level documents.
*/
async function copySkill(entry, skillsDir) {
	if (entry.dir !== void 0) {
		const destination = path.join(skillsDir, entry.name);
		await promises.mkdir(destination, { recursive: true });
		await promises.cp(entry.dir, destination, {
			recursive: true,
			filter: (src) => !src.split(path.sep).includes(".git")
		});
		return;
	}
	await promises.copyFile(entry.docPath, path.join(skillsDir, `${entry.name}.md`));
}
/**
* Download, validate, and install every skill found in a source's tarball.
* Mutates `ctx.manifest`; the caller persists it.
* @param ctx - install inputs.
* @returns the outcome; throws when the source yields no installable skill.
*/
async function installFromSource(ctx) {
	const outcome = {
		installed: [],
		conflicts: [],
		invalid: [],
		root: ctx.skillsDir
	};
	await promises.mkdir(ctx.skillsDir, { recursive: true });
	await promises.mkdir(ctx.tmpBase, { recursive: true });
	const tmpRoot = await promises.mkdtemp(path.join(ctx.tmpBase, "install-"));
	try {
		const tarFile = path.join(tmpRoot, "repo.tgz");
		await ctx.download(tarballUrl(ctx.source), tarFile, ctx.signal);
		const extractDir = path.join(tmpRoot, "x");
		await promises.mkdir(extractDir, { recursive: true });
		await x({
			file: tarFile,
			cwd: extractDir,
			strip: 1
		});
		const searchRoot = ctx.source.path === void 0 ? extractDir : path.resolve(extractDir, ctx.source.path);
		if (!searchRoot.startsWith(`${extractDir}${path.sep}`) && searchRoot !== extractDir) throw new Error(`skill-manager: source path escapes the repository archive: ${ctx.source.path}`);
		const entries = await scanSkillEntries(searchRoot, ctx.signal);
		if (entries.length === 0) throw new Error(`skill-manager: no skill found at ${sourceRecord(ctx.source)}; expected <name>/SKILL.md or <name>.md`);
		const now = (/* @__PURE__ */ new Date()).toISOString();
		for (const entry of entries) {
			ctx.signal?.throwIfAborted();
			let text;
			try {
				text = await promises.readFile(entry.docPath, "utf8");
			} catch {
				continue;
			}
			const meta = parseSkillMeta(text);
			if (meta === void 0) {
				outcome.invalid.push(entry.name);
				continue;
			}
			if (meta.name !== entry.name) {
				outcome.invalid.push(entry.name);
				continue;
			}
			const destination = path.join(ctx.skillsDir, meta.name);
			const exists = await existsPath(destination);
			if (exists && ctx.mode === "install") {
				outcome.conflicts.push(meta.name);
				continue;
			}
			if (exists) await promises.rm(destination, {
				recursive: true,
				force: true
			});
			await copySkill(entry, ctx.skillsDir);
			const previous = ctx.manifest.skills[meta.name];
			ctx.manifest.skills[meta.name] = {
				...entryRecord(meta, ctx.source, now),
				...previous === void 0 ? {} : { installedAt: previous.installedAt }
			};
			outcome.installed.push(meta.name);
		}
		if (outcome.installed.length === 0) {
			const reasons = [...outcome.conflicts.map((name) => `"${name}" already installed`), ...outcome.invalid.map((name) => `"${name}" frontmatter invalid`)];
			throw new Error(`skill-manager: nothing installed from ${sourceRecord(ctx.source)}` + (reasons.length === 0 ? "" : ` (${reasons.join("; ")})`));
		}
		if (ctx.mode === "update") {
			const recorded = sourceRecord(ctx.source);
			const fresh = new Set(outcome.installed);
			for (const [name, entry] of Object.entries(ctx.manifest.skills)) {
				if (entry.source !== recorded || fresh.has(name)) continue;
				await promises.rm(path.join(ctx.skillsDir, name), {
					recursive: true,
					force: true
				});
				delete ctx.manifest.skills[name];
			}
		}
		return outcome;
	} finally {
		await promises.rm(tmpRoot, {
			recursive: true,
			force: true,
			maxRetries: 3
		});
	}
}
async function existsPath(target) {
	try {
		await promises.access(target);
		return true;
	} catch (error) {
		if (error.code === "ENOENT") return false;
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
async function uninstallSkill(name, skillsDir, manifest) {
	const entry = manifest.skills[name];
	if (entry !== void 0) delete manifest.skills[name];
	const directory = path.join(skillsDir, name);
	const file = path.join(skillsDir, `${name}.md`);
	let removed = false;
	for (const target of [directory, file]) if (await existsPath(target)) {
		await promises.rm(target, {
			recursive: true,
			force: true
		});
		removed = true;
	}
	return entry !== void 0 || removed;
}
//#endregion
//#region lib/types/controller.js
/**
* Host-side command controller: turns Settings-page commands (written into
* the plugin settings namespace) into installer work and snapshots, and
* writes results back through the same namespace. Commands run strictly
* sequentially; a command id is consumed at most once.
*
* @module dsh-skill-manager/controller
*/
function fail(message) {
	throw new Error(`skill-manager: ${message}`);
}
/**
* Manages the install manifest and the settings command channel.
*/
var SkillManagerController = class {
	deps;
	lastCommandId;
	queue = Promise.resolve();
	manifest = {
		version: 1,
		skills: {}
	};
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
			loaded = snapshot.skills.map((skill) => ({
				name: skill.name,
				description: skill.description,
				source: skill.source,
				provider: skill.provider,
				...skill.resourceBase !== void 0 && skill.resourceBase.kind === "directory" ? { resourcePath: skill.resourceBase.path } : {}
			}));
			complete = snapshot.complete;
		} catch (error) {
			complete = false;
			console.error(`skill-manager: catalog snapshot failed: ${String(error)}`);
		}
		const manifest = await this.ensureManifest();
		const installed = Object.values(manifest.skills).sort((a, b) => a.name.localeCompare(b.name)).map((entry) => ({
			name: entry.name,
			description: entry.description,
			source: entry.source,
			...entry.tag === void 0 ? {} : { tag: entry.tag },
			installedAt: entry.installedAt,
			updatedAt: entry.updatedAt
		}));
		const snapshotView = {
			loaded,
			installed,
			complete,
			root: this.deps.skillsDir
		};
		return {
			ok: true,
			message: "ok",
			data: JSON.stringify(snapshotView)
		};
	}
	async install(input) {
		if (input === void 0 || input.trim().length === 0) fail("install requires a source like owner/repo[/path][@tag]");
		const source = parseSource(input);
		const manifest = await this.ensureManifest();
		const outcome = await installFromSource({
			source,
			mode: "install",
			skillsDir: this.deps.skillsDir,
			tmpBase: this.deps.tmpBase,
			manifest,
			download: this.deps.download,
			signal: this.deps.abortSignal?.()
		});
		await this.persist();
		const parts = [];
		if (outcome.installed.length > 0) parts.push(`installed ${outcome.installed.join(", ")}`);
		if (outcome.conflicts.length > 0) parts.push(`already exists: ${outcome.conflicts.join(", ")}`);
		if (outcome.invalid.length > 0) parts.push(`invalid frontmatter: ${outcome.invalid.join(", ")}`);
		return {
			ok: outcome.installed.length > 0,
			message: parts.length > 0 ? parts.join("; ") : "nothing done",
			data: JSON.stringify({
				installed: outcome.installed,
				conflicts: outcome.conflicts,
				invalid: outcome.invalid,
				root: outcome.root
			})
		};
	}
	async update(input) {
		if (input === void 0 || input.trim().length === 0) fail("update requires the installed skill name");
		const manifest = await this.ensureManifest();
		const entry = manifest.skills[input.trim()];
		if (entry === void 0) fail(`"${input}" is not in the install manifest; install it first`);
		const outcome = await installFromSource({
			source: parseSource(`${entry.source}${entry.tag === void 0 ? "" : `@${entry.tag}`}`),
			mode: "update",
			skillsDir: this.deps.skillsDir,
			tmpBase: this.deps.tmpBase,
			manifest,
			download: this.deps.download,
			signal: this.deps.abortSignal?.()
		});
		await this.persist();
		return {
			ok: outcome.installed.length > 0,
			message: outcome.installed.length > 0 ? `updated ${outcome.installed.join(", ")}` : "nothing updated",
			data: JSON.stringify({
				updated: outcome.installed,
				root: outcome.root
			})
		};
	}
	async uninstall(input) {
		if (input === void 0 || input.trim().length === 0) fail("uninstall requires the installed skill name");
		const manifest = await this.ensureManifest();
		if (!await uninstallSkill(input.trim(), this.deps.skillsDir, manifest)) fail(`"${input}" is not installed`);
		await this.persist();
		return {
			ok: true,
			message: `removed ${input.trim()}`,
			data: JSON.stringify({ removed: [input.trim()] })
		};
	}
	async run(command) {
		let result;
		try {
			switch (command.action) {
				case "list":
					result = await this.list();
					break;
				case "install":
					result = await this.install(command.input);
					break;
				case "update":
					result = await this.update(command.input);
					break;
				case "uninstall": result = await this.uninstall(command.input);
			}
			result = {
				...result,
				id: command.id
			};
		} catch (error) {
			result = {
				id: command.id,
				ok: false,
				message: error instanceof Error ? error.message : String(error)
			};
		}
		try {
			await this.deps.writeResult(result);
		} catch (error) {
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
		if (command === void 0 || command.id === this.lastCommandId) return;
		this.lastCommandId = command.id;
		this.queue = this.queue.then(() => this.run(command));
	}
};
//#endregion
//#region lib/types/download.js
/**
* Minimal HTTPS download for GitHub codeload tarballs, with optional HTTP
* proxy (CONNECT) support via `https-proxy-agent`. Redirects are followed
* (codeload can redirect); the payload streams to disk, so memory stays flat
* regardless of archive size.
*
* @module dsh-skill-manager/download
*/
const MAX_REDIRECTS = 5;
function requestOnce(url, proxyUrl, signal) {
	return new Promise((resolve, reject) => {
		const agent = proxyUrl === void 0 ? void 0 : new HttpsProxyAgent(proxyUrl);
		get(url, {
			agent,
			signal
		}, resolve).on("error", reject);
	});
}
/**
* Download `url` into `destFile` (streamed), following redirects.
* @param url - target URL.
* @param destFile - destination file; its directory must exist.
* @param options - proxy and cancellation.
* @throws Error naming the failure stage on HTTP, network, or abort errors.
*/
async function downloadUrl(url, destFile, options = {}) {
	let current = url;
	for (let hop = 0; hop <= MAX_REDIRECTS; hop += 1) {
		const response = await requestOnce(current, options.proxyUrl, options.signal);
		const status = response.statusCode ?? 0;
		if (status >= 300 && status < 400 && response.headers.location !== void 0) {
			response.resume();
			const next = new URL(response.headers.location, current).toString();
			if (next === current) throw new Error(`skill-manager: redirect loop at ${current}`);
			current = next;
			continue;
		}
		if (status !== 200) {
			response.resume();
			throw new Error(`skill-manager: download failed with HTTP ${status} for ${current}`);
		}
		const writer = createWriteStream(destFile, { flags: "w" });
		await new Promise((resolve, reject) => {
			const fail = (error) => {
				response.destroy();
				writer.destroy();
				reject(error);
			};
			response.on("error", (error) => fail(/* @__PURE__ */ new Error(`skill-manager: download stream failed: ${error.message}`)));
			writer.on("error", (error) => fail(/* @__PURE__ */ new Error(`skill-manager: cannot write ${path.basename(destFile)}: ${error.message}`)));
			writer.on("finish", () => resolve());
			response.pipe(writer);
		});
		return;
	}
	throw new Error(`skill-manager: too many redirects downloading ${url}`);
}
//#endregion
//#region lib/types/shared.js
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
const SETTINGS_NS = "skill-manager";
/** Installation manifest file, stored under `<dshHome>/.skill-manager/`. */
const MANIFEST_FILE = "manifest.json";
/** Work directory under `<dshHome>/.skill-manager/` for downloads/extract. */
const WORK_DIR = ".skill-manager";
/** User-level skill root scanned by the harness (`<dshHome>/skills`). */
const USER_SKILLS_DIR = "skills";
/** Provider name registered on `ctx.skills`. */
const CLAUDE_COMPAT_PROVIDER = "skill-manager-claude";
/** Source label attached to compatibility candidates. */
const CLAUDE_COMPAT_SOURCE = "compat-claude";
//#endregion
//#region lib/types/provider.js
/**
* Read-only skill provider for Claude Code style skill directories
* (`.claude/skills/<name>/SKILL.md`). Claude Code, Cline, and friends share
* the same SKILL.md + YAML frontmatter convention as DSH, so their skills
* become loadable in DeepSeek Harness without moving files. The provider is
* project-scoped (rank 250, between the native `.agents/skills` project row
* and the user rows).
*
* @module dsh-skill-manager/provider
*/
/** Walk ancestors of `cwd` for a `.git` directory (the harness' project root rule). */
async function findProjectRoot(cwd, signal) {
	let current = cwd;
	for (;;) {
		signal?.throwIfAborted();
		try {
			await promises.access(path.join(current, ".git"));
			return current;
		} catch {}
		const parent = path.dirname(current);
		if (parent === current) return void 0;
		current = parent;
	}
}
async function readEntry(entry, signal) {
	try {
		return await promises.readFile(entry.docPath, {
			encoding: "utf8",
			...signal === void 0 ? {} : { signal }
		});
	} catch {
		return;
	}
}
/**
* Create the `.claude/skills` compatibility provider.
* @param options - live gate and (reserved) configuration.
* @returns a provider object suitable for `ctx.skills.registerProvider`.
*/
function createClaudeCompatProvider(options) {
	return {
		name: CLAUDE_COMPAT_PROVIDER,
		async list(lookup) {
			if (!options.enabled()) return [];
			const cwd = lookup.cwd ?? process.cwd();
			const projectRoot = await findProjectRoot(cwd, lookup.signal) ?? cwd;
			const entries = await scanSkillEntries(path.join(projectRoot, ".claude", "skills"), lookup.signal);
			const candidates = [];
			for (const entry of entries) {
				const text = await readEntry(entry, lookup.signal);
				if (text === void 0) continue;
				const meta = parseSkillMeta(text);
				if (meta === void 0) continue;
				if (meta.name !== entry.name) continue;
				candidates.push({
					name: meta.name,
					description: meta.description,
					...meta.whenToUse === void 0 ? {} : { whenToUse: meta.whenToUse },
					invocation: {
						modelInvocable: meta.modelInvocable,
						userInvocable: meta.userInvocable
					},
					source: CLAUDE_COMPAT_SOURCE,
					provider: CLAUDE_COMPAT_PROVIDER,
					rank: 250,
					locator: { entry },
					...entry.dir === void 0 ? {} : { resourceBase: {
						kind: "directory",
						path: entry.dir
					} },
					path: entry.docPath
				});
			}
			return candidates;
		},
		async get(candidate, lookup) {
			const locator = candidate.locator;
			if (locator?.entry === void 0) return void 0;
			const text = await readEntry(locator.entry, lookup.signal);
			if (text === void 0) return void 0;
			const meta = parseSkillMeta(text);
			if (meta === void 0 || meta.name !== candidate.name) return void 0;
			return {
				name: meta.name,
				description: meta.description,
				...meta.whenToUse === void 0 ? {} : { whenToUse: meta.whenToUse },
				invocation: {
					modelInvocable: meta.modelInvocable,
					userInvocable: meta.userInvocable
				},
				source: CLAUDE_COMPAT_SOURCE,
				provider: CLAUDE_COMPAT_PROVIDER,
				...candidate.resourceBase === void 0 ? {} : { resourceBase: candidate.resourceBase },
				content: text,
				...candidate.path === void 0 ? {} : { path: candidate.path },
				...meta.metadata === void 0 ? {} : { metadata: meta.metadata }
			};
		}
	};
}
//#endregion
//#region lib/types/index.js
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
const name = "skill-manager";
const inject = ["skills"];
/** The user config root: `$DSH_HOME` or `~/.dsh` (the harness default). */
function resolveDshHome(env = process.env) {
	return env["DSH_HOME"]?.trim() || path.join(homedir(), ".dsh");
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
function installSettingsWiring(ctx, ns, schema, entry, hooks) {
	ctx.inject(["settings"], (sctx) => {
		const settings = ctx.get("settings");
		if (settings === void 0) return;
		const scope = settings.register(ns, schema, {
			base: entry,
			...hooks.validate === void 0 ? {} : { validate: hooks.validate }
		});
		hooks.setSource(() => scope.get());
		let disposed = false;
		sctx.effect(() => () => {
			if (disposed) return;
			disposed = true;
			hooks.setSource(() => entry);
			hooks.onChange();
		});
		hooks.onChange();
		scope.watch(() => {
			if (disposed) return;
			hooks.onChange();
		});
	});
}
/**
* Mount the host half: the settings command channel, the install controller,
* and the `.claude/skills` compatibility provider.
* @param ctx - plugin context; `ctx.skills` is injected.
* @param config - schema-validated composition configuration (defaults applied).
*/
function apply(ctx, config) {
	const entry = config ?? defaultConfig();
	const dshHome = resolveDshHome();
	const skillsDir = path.join(dshHome, USER_SKILLS_DIR);
	const workDir = path.join(dshHome, WORK_DIR);
	const manifestFile = path.join(workDir, MANIFEST_FILE);
	let current = () => entry;
	const controller = new SkillManagerController({
		getSection: () => current(),
		writeResult: async (result) => {
			const settings = ctx.get("settings");
			if (settings === void 0) return;
			await settings.update(SETTINGS_NS, { result });
		},
		skills: ctx.skills,
		skillsDir,
		tmpBase: workDir,
		manifestFile,
		download: (url, file, signal) => {
			const section = current();
			return downloadUrl(url, file, {
				proxyUrl: section.proxy.enabled && section.proxy.url.trim().length > 0 ? section.proxy.url.trim() : void 0,
				signal
			});
		}
	});
	installSettingsWiring(ctx, SETTINGS_NS, Config, entry, {
		validate: assertValidConfig,
		setSource: (source) => {
			current = source;
		},
		onChange: () => {
			controller.onSectionChanged(current());
		}
	});
	ctx.effect(() => {
		return ctx.skills.registerProvider(() => createClaudeCompatProvider({ enabled: () => current().compatClaude }));
	}, "skill-manager: claude compat provider");
}
//#endregion
export { apply, inject, installSettingsWiring, name, resolveDshHome };
