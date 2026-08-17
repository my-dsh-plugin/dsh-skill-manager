# dsh-skill-manager

Install, update, and uninstall DeepSeek Harness **Skills** from GitHub repositories, right from Settings. Loaded skills are listed grouped by scope (project / user / bundled / Claude-compat), and Claude Code style skills under `.claude/skills` can be loaded read-only.

> 中文：[README.zh.md](README.zh.md)

## Features

- **Install a skill from any GitHub source**: `owner/repo`, `owner/repo/sub/path`, optionally `@tag` (or paste a `https://github.com/...` URL). Repo conventions like a top-level `skills/` directory are understood.
- **Update / uninstall** any skill this plugin installed, with the install manifest kept at `<dshHome>/.skill-manager/manifest.json`.
- **Loaded-skills overview**: the live catalog from `ctx.skills`, grouped by scope — project-level, user-level, custom, bundled — so you can see exactly what is effective and which level wins.
- **Proxy support for GitHub downloads** (env-agnostic): auto-configurable in the page, e.g. `http://127.0.0.1:10808` for mixed proxies.
- **Claude Code compatibility** (optional, on by default): a read-only skill provider that loads `.claude/skills/<name>/SKILL.md` from the project root — same SKILL.md + YAML frontmatter spec, zero file copying.

## How it works

The harness itself owns skill loading: `dsh-skill-filesystem` watches the skill roots and hot-picks-up anything written there, and `dsh-tool-skill` publishes the catalog into every session. **Installing a skill is therefore just filesystem work** — this plugin downloads a codeload tarball, validates the frontmatter (kebab-case `name`, non-empty `description`), and copies the bundle into `<dshHome>/skills/<name>/`. No registry writes, no restart, no core patch.

The Settings page talks to the host half through the plugin's settings namespace (`skill-manager`) — the standard settings seam, so no custom RPC surface is needed. Commands run sequentially; results are written back into the same namespace.

The optional `.claude/skills` compatibility provider registers on `ctx.skills` at rank 250 (between the native project rows and the user rows), so a same-name project skill still wins over it.

## Requirements

- A harness that mounts the skills capability (`dsh-skill` / `dsh-skill-filesystem` / `dsh-tool-skill`) — standard in current desktop builds.
- **One-line exposure patch** (the same precedent as thinking-level-override): the Web client can only read/write settings namespaces on the gateway's allowlist. Add `'skill-manager'` to `WEB_SETTINGS_NAMESPACES` in `packages/host/apiproxy/src/api-proxy.ts` (source builds) or the corresponding constant in the built `@deepseek-ai/dsh-host-apiproxy/lib/index.js` (prebuilt deployments), then restart. Without it the Skills page renders read-only.

## Install

**The plugin never needs to be built by the consumer** — the repository ships the prebuilt host entry and browser bundle in `lib/` (committed).

```sh
# From a local clone (recommended for iterating) — installs as a link
git clone https://github.com/my-dsh-plugin/dsh-skill-manager.git
pnpm dsh plugin add --profile web /path/to/dsh-skill-manager

# Or straight from git
pnpm dsh plugin add --profile web github:my-dsh-plugin/dsh-skill-manager
```

(`dsh` CLI from your harness checkout; set `DSH_HOME` to your harness home if it is not the default `~/.dsh`.)

The manual equivalent is editing the profile's `package.json`:

```json
"dependencies": {
  "dsh-skill-manager": "link:/path/to/dsh-skill-manager"
}
```

```json
"dsh": {
  "profile": {
    "bundles": ["@deepseek-ai/dsh-base", "@deepseek-ai/dsh-web-app", "dsh-skill-manager"]
  }
}
```

then `pnpm install` inside the profile directory, and restart the harness. The **Skills** entry appears in Settings (after the plugin-managed sections).

## Usage

Open Settings → **Skills**:

- **Install a new skill** — paste a source (`owner/repo[/path][@tag]`); installs into `<dshHome>/skills`. An already-existing name is reported as a conflict and left untouched (use **Update** on a matching entry instead).
- **Managed by this plugin** — every installed skill with its source, ref, and timestamps; **Update** refetches the recorded source (HEAD unless a tag was pinned), **Uninstall** removes the directory and the manifest entry. The harness hot-detects both.
- **Currently loaded** — grouped by scope; the `loaded` badge marks plugin-managed skills currently active in the catalog.
- **GitHub download proxy** — enable + URL for environments that need one (e.g. `http://127.0.0.1:10808`).
- **Claude Code compatibility** — toggle the read-only `.claude/skills` provider.

## Development

Building is only for **changing the plugin itself** — consumers never build. It requires the sibling `deepseek-harness` checkout (`../deepseek-harness`) for project references and the shared client preset:

```sh
pnpm install
pnpm test       # vitest: source, frontmatter, installer, provider, controller suites
pnpm typecheck  # tsc -b over src + client
pnpm build      # tsc declarations + tsdown host + client bundle into lib/
```

After a build, commit `lib/` so consumers keep getting the prebuilt artifacts.

## Known Limitations and Deferred Work

- **Install target is the user level only** (`<dshHome>/skills`); project-level installs are not offered yet.
- **The loaded-skills list reflects the host process cwd**: skills in a different project's `.dsh/skills` are only visible once that project is the working directory.
- **Update uses the recorded source**: without a pinned `@tag` it refetches the default branch head.
- **The `.claude/skills` provider is not file-watched**: edits appear on the next catalog invalidation (e.g. the next session, or any skill change), not instantly.
- Malformed skill entries are skipped with a warning by design (matching native discovery); an install source whose frontmatter is entirely invalid reports it in the result.

## License

Apache-2.0