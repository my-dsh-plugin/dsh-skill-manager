/**
 * Skill frontmatter parsing and validation.
 *
 * @module dsh-skill-manager/frontmatter.spec
 */

import { describe, expect, it } from 'vitest'
import { frontmatterBlock, isValidSkillName, parseSkillMeta } from '../src/frontmatter.ts'

describe('isValidSkillName', () => {
  it('accepts kebab-case names', () => {
    expect(isValidSkillName('doc-skill')).toBe(true)
    expect(isValidSkillName('a')).toBe(true)
    expect(isValidSkillName('a1-b2')).toBe(true)
  })

  it('rejects invalid names', () => {
    expect(isValidSkillName('DocSkill')).toBe(false)
    expect(isValidSkillName('doc_skill')).toBe(false)
    expect(isValidSkillName('-doc')).toBe(false)
    expect(isValidSkillName('doc-')).toBe(false)
    expect(isValidSkillName('')).toBe(false)
    expect(isValidSkillName(12)).toBe(false)
  })
})

describe('frontmatterBlock', () => {
  it('extracts a YAML block', () => {
    const text = '---\nname: x\ndescription: y\n---\nbody'
    expect(frontmatterBlock(text)).toBe('\nname: x\ndescription: y')
  })

  it('returns undefined without a block', () => {
    expect(frontmatterBlock('no frontmatter')).toBeUndefined()
    expect(frontmatterBlock('---\nunclosed')).toBeUndefined()
  })
})

describe('parseSkillMeta', () => {
  it('parses name, description, and invocation controls', () => {
    const meta = parseSkillMeta(`---
name: doc-skill
description: Summarize documents
disable-model-invocation: true
whenToUse: long PDFs
metadata:
  author: demo
---
# Body`)
    expect(meta).toMatchObject({
      name: 'doc-skill',
      description: 'Summarize documents',
      whenToUse: 'long PDFs',
      modelInvocable: false,
      userInvocable: true,
    })
    expect(meta?.metadata).toEqual({ author: 'demo' })
  })

  it('defaults invocation to enabled', () => {
    const meta = parseSkillMeta('---\nname: flat-skill\ndescription: d\n---\nbody')
    expect(meta?.modelInvocable).toBe(true)
    expect(meta?.userInvocable).toBe(true)
  })

  it('accepts YAML boolean spellings for user-invocable', () => {
    const meta = parseSkillMeta('---\nname: x\ndescription: d\nuser-invocable: "no"\n---')
    expect(meta?.userInvocable).toBe(false)
  })

  it('rejects missing or invalid required fields', () => {
    expect(parseSkillMeta('---\nname: NotKebab\ndescription: d\n---')).toBeUndefined()
    expect(parseSkillMeta('---\ndescription: d\n---')).toBeUndefined()
    expect(parseSkillMeta('---\nname: x\n---')).toBeUndefined()
    expect(parseSkillMeta('---\nname: x\ndescription: 42\n---')).toBeUndefined()
    expect(parseSkillMeta('---\nname: [broken\ndescription: d\n---')).toBeUndefined()
    expect(parseSkillMeta('plain body')).toBeUndefined()
  })
})