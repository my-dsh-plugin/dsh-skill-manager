/**
 * Source parsing and tarball URL building.
 *
 * @module dsh-skill-manager/source.spec
 */

import { describe, expect, it } from 'vitest'
import { parseSource, sourceRecord, tarballUrl } from '../src/source.ts'

describe('parseSource', () => {
  it('parses owner/repo', () => {
    expect(parseSource('anthropics/skills')).toEqual({ owner: 'anthropics', repo: 'skills' })
  })

  it('parses owner/repo with a subpath', () => {
    expect(parseSource('my-org/repo-a/document-skills/deep-dive'))
      .toEqual({ owner: 'my-org', repo: 'repo-a', path: 'document-skills/deep-dive' })
  })

  it('parses a @tag suffix', () => {
    expect(parseSource('owner/repo/skills@v1.2.3'))
      .toEqual({ owner: 'owner', repo: 'repo', path: 'skills', tag: 'v1.2.3' })
    expect(parseSource('owner/repo@main')).toEqual({ owner: 'owner', repo: 'repo', tag: 'main' })
  })

  it('parses full GitHub URLs', () => {
    expect(parseSource('https://github.com/owner/repo')).toEqual({ owner: 'owner', repo: 'repo' })
    expect(parseSource('https://github.com/owner/repo/tree/main/skills'))
      .toEqual({ owner: 'owner', repo: 'repo', path: 'skills', tag: 'main' })
    expect(parseSource('http://github.com/owner/repo/blob/v1/doc-skills'))
      .toEqual({ owner: 'owner', repo: 'repo', path: 'doc-skills', tag: 'v1' })
  })

  it('normalizes surrounding whitespace', () => {
    expect(parseSource('  owner/repo  ')).toEqual({ owner: 'owner', repo: 'repo' })
  })

  it('rejects malformed sources', () => {
    expect(() => parseSource('')).toThrow()
    expect(() => parseSource('single')).toThrow()
    expect(() => parseSource('a@b')).toThrow()
    expect(() => parseSource('owner/repo/../escape')).toThrow()
    expect(() => parseSource('owner/repo/@tag')).toThrow()
    expect(() => parseSource('../repo')).toThrow()
  })
})

describe('sourceRecord', () => {
  it('round-trips a parsed source', () => {
    const source = parseSource('owner/repo/skills@v2')
    expect(sourceRecord(source)).toBe('owner/repo/skills@v2')
    expect(sourceRecord({ owner: 'a', repo: 'b' })).toBe('a/b')
  })
})

describe('tarballUrl', () => {
  it('uses the tag ref when present', () => {
    expect(tarballUrl({ owner: 'a', repo: 'b', tag: 'v1' }))
      .toBe('https://codeload.github.com/a/b/tar.gz/v1')
  })

  it('falls back to HEAD (default branch)', () => {
    expect(tarballUrl({ owner: 'a', repo: 'b' }))
      .toBe('https://codeload.github.com/a/b/tar.gz/HEAD')
  })
})