/**
 * Parsing of GitHub skill sources into a canonical repo locator, and building
 * the codeload tarball URL. Pure functions with no I/O so they are unit
 * tested directly.
 *
 * @module dsh-skill-manager/source
 */

/** A GitHub repository location plus optional skill subpath and ref. */
export interface RepoSource {
  /** Repository owner login. */
  owner: string
  /** Repository name. */
  repo: string
  /** Directory inside the repo that holds the skill(s); repo root when absent. */
  path?: string
  /** Git ref (tag or branch); the repository default branch when absent. */
  tag?: string
}

const SEGMENT = /^[A-Za-z0-9_.-]+$/
const TAG = /^[A-Za-z0-9_.-]+$/

/** Canonical string form of a source, used in manifest records. */
export function sourceRecord(source: RepoSource): string {
  const base = `${source.owner}/${source.repo}`
  const path = source.path === undefined ? '' : `/${source.path.split('/').join('/')}`
  const tag = source.tag === undefined ? '' : `@${source.tag}`
  return `${base}${path}${tag}`
}

/** codeload tarball URL for a source (the `tar.gz/HEAD` form selects the default branch). */
export function tarballUrl(source: RepoSource): string {
  const ref = source.tag ?? 'HEAD'
  return `https://codeload.github.com/${source.owner}/${source.repo}/tar.gz/${ref}`
}

function fail(input: string): never {
  throw new Error(
    `skill-manager: "${input}" is not a valid GitHub skill source; `
    + 'use owner/repo, owner/repo/sub/path, optionally @tag (or a https://github.com/... URL)',
  )
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
export function parseSource(input: string): RepoSource {
  const raw = input.trim()
  if (raw.length === 0) fail(raw)

  let rest = raw
  let tag: string | undefined

  // URL forms: strip the host; the `tree|blob` marker folds its ref into tag
  // so the remainder reads `owner/repo[/path]`.
  const urlMatch = /^https?:\/\/github\.com\/(.+)$/i.exec(rest)
  if (urlMatch !== null) {
    const marker = /^([^/]+)\/([^/]+)\/(tree|blob)\/([^/]+)\/?(.*)$/.exec(urlMatch[1]!)
    if (marker !== null) {
      tag = marker[4]!
      const tail = marker[5]!
      rest = tail.length === 0 ? `${marker[1]}/${marker[2]}` : `${marker[1]}/${marker[2]}/${tail}`
    } else {
      rest = urlMatch[1]!
    }
  }

  // @tag suffix: the marker must follow a real path character, so a path
  // segment starting with '@' is not misread as a tag.
  const at = rest.lastIndexOf('@')
  if (at > 0 && rest[at - 1] !== '/') {
    const candidate = rest.slice(at + 1)
    if (TAG.test(candidate)) {
      tag = candidate
      rest = rest.slice(0, at)
    }
  }
  if (rest.endsWith('/')) fail(raw)

  const segments = rest.split('/')
  if (segments.some(segment => segment.length === 0)) fail(raw)
  if (segments.length < 2) fail(raw)
  const owner = segments[0]!
  const repo = segments[1]!
  if (!SEGMENT.test(owner) || !SEGMENT.test(repo) || owner === '.' || owner === '..' || repo === '.' || repo === '..') {
    fail(raw)
  }
  const pathSegments = segments.slice(2)
  for (const segment of pathSegments) {
    if (!SEGMENT.test(segment) || segment === '.' || segment === '..') fail(raw)
  }
  const path = pathSegments.length === 0 ? undefined : pathSegments.join('/')

  return { owner, repo, ...path === undefined ? {} : { path }, ...tag === undefined ? {} : { tag } }
}