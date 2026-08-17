/**
 * The Skills settings page: the installed-and-loaded skill surface this
 * plugin adds. Rows come from the Host (`list` command through the settings
 * channel); every action rides the same command/result pair.
 *
 * @module dsh-skill-manager/client/section
 */

import { useEffect, useMemo, useState } from 'react'
import { Button } from '@deepseek-ai/dsh-client-ui-primitives'
import type { InjectFace, PropsLocale, PropsRuntime } from '@deepseek-ai/dsh-client-ui-slots'
import type {} from '@deepseek-ai/dsh-client-ui-settings/client'
import css from './section.module.css'
import type { ProxyConfig, WireResult, WireSection } from '../shared.ts'
import type {
  CardSource,
  ChangeSnapshot,
  InstalledSkillRow,
  ListSnapshot,
  LoadedSkillRow,
} from './section-controller.ts'

/** The registration-side face the section injects. */
export interface SkillManagerSectionFace {
  hooks: {
    /** Live settings section bound as useSection. */
    section: CardSource<WireSection | undefined>
  }
  actions: {
    /** Run one Host command and await its result. */
    run(action: 'list' | 'install' | 'update' | 'uninstall', input?: string): Promise<WireResult>
    /** Persist the proxy configuration. */
    setProxy(proxy: ProxyConfig): Promise<void>
    /** Persist the `.claude/skills` compatibility toggle. */
    setCompatClaude(enabled: boolean): Promise<void>
  }
}

/** The section slice the renderer reads. */
export interface WireSectionForUi {
  proxy?: ProxyConfig
  compatClaude?: boolean
}

/** Props the renderer binds for the section. */
export type SkillManagerSectionProps =
  PropsRuntime<'settings.section'>
  & PropsLocale<'skill-manager'>
  & InjectFace<SkillManagerSectionFace>

/** Status notice shown under the controls. */
type Notice = { kind: 'ok' | 'error'; text: string }

/** Loaded-skill grouping buckets. */
const GROUP_BY_SOURCE: Record<string, string> = {
  'project-dsh': 'groupProject',
  'project-agents': 'groupProject',
  'user-dsh': 'groupUser',
  'user-agents': 'groupUser',
  custom: 'groupCustom',
  bundled: 'groupBundled',
  'compat-claude': 'groupCompat',
}

function groupKey(source: string): string {
  return GROUP_BY_SOURCE[source] ?? 'groupOther'
}

function parseChangeResult(result: WireResult): ChangeSnapshot | undefined {
  if (!result.ok || result.data === undefined) return undefined
  try {
    return JSON.parse(result.data) as ChangeSnapshot
  } catch {
    return undefined
  }
}

function parseListResult(result: WireResult): ListSnapshot | undefined {
  if (!result.ok || result.data === undefined) return undefined
  try {
    return JSON.parse(result.data) as ListSnapshot
  } catch {
    return undefined
  }
}

/**
 * Render the Skills settings page.
 * @param props - locale copy, the live section, and the command actions.
 * @returns the section.
 */
export function SkillManagerSection(props: SkillManagerSectionProps): React.ReactElement | null {
  const { t } = props
  const section = props.useSection(value => value)

  const [loaded, setLoaded] = useState<ListSnapshot | undefined>(undefined)
  const [sourceInput, setSourceInput] = useState('')
  const [proxyDraft, setProxyDraft] = useState<ProxyConfig>({ enabled: false, url: '' })
  const [compatDraft, setCompatDraft] = useState(true)
  const [busy, setBusy] = useState(false)
  const [notice, setNotice] = useState<Notice | undefined>(undefined)
  const [confirmName, setConfirmName] = useState<string | undefined>(undefined)

  // Initialize drafts once the settings section resolves.
  useEffect(() => {
    if (section.status !== 'ready' || section.writable === false) return
    const value = section.section
    setProxyDraft(value?.proxy ?? { enabled: false, url: '' })
    setCompatDraft(value?.compatClaude ?? true)
  }, [section.status, section.writable, section.section])

  // Prime the page with the loaded/installed snapshot.
  const refresh = async (): Promise<void> => {
    const result = await props.actions.run('list')
    const snapshot = parseListResult(result)
    if (snapshot !== undefined) setLoaded(snapshot)
  }
  useEffect(() => {
    if (section.status !== 'ready' || section.writable === false) return
    void refresh().catch(() => {
      setNotice({ kind: 'error', text: t('failed', { message: t('unavailable') }) })
    })
    // Mount-time prime only; refresh() is re-invoked manually afterwards.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [section.status, section.writable])

  const report = (result: WireResult, success: string): void => {
    setNotice({ kind: result.ok ? 'ok' : 'error', text: result.ok ? success : t('failed', { message: result.message }) })
  }

  const onInstall = async (): Promise<void> => {
    const input = sourceInput.trim()
    if (input.length === 0) return
    setBusy(true)
    setNotice(undefined)
    try {
      const result = await props.actions.run('install', input)
      const change = parseChangeResult(result)
      if (result.ok && change !== undefined) {
        setSourceInput('')
        const parts: string[] = [t('installedCount', { count: String(change.installed.length) })]
        if (change.conflicts.length > 0) parts.push(t('alreadyExists', { names: change.conflicts.join(', ') }))
        if (change.invalid.length > 0) parts.push(t('invalidList', { names: change.invalid.join(', ') }))
        report(result, parts.join('; '))
      } else {
        report(result, t('done'))
      }
      await refresh()
    } catch (error: unknown) {
      setNotice({ kind: 'error', text: error instanceof Error && error.message === 'timeout' ? t('timeout') : t('failed', { message: error instanceof Error ? error.message : String(error) }) })
    } finally {
      setBusy(false)
    }
  }

  const onUpdate = async (name: string): Promise<void> => {
    setBusy(true)
    setNotice(undefined)
    try {
      const result = await props.actions.run('update', name)
      report(result, t('updatedCount', { count: '1' }))
      await refresh()
    } catch (error: unknown) {
      setNotice({ kind: 'error', text: error instanceof Error && error.message === 'timeout' ? t('timeout') : t('failed', { message: error instanceof Error ? error.message : String(error) }) })
    } finally {
      setBusy(false)
    }
  }

  const onUninstall = async (): Promise<void> => {
    if (confirmName === undefined) return
    const name = confirmName
    setConfirmName(undefined)
    setBusy(true)
    setNotice(undefined)
    try {
      const result = await props.actions.run('uninstall', name)
      report(result, t('removedCount', { count: '1' }))
      await refresh()
    } catch (error: unknown) {
      setNotice({ kind: 'error', text: error instanceof Error && error.message === 'timeout' ? t('timeout') : t('failed', { message: error instanceof Error ? error.message : String(error) }) })
    } finally {
      setBusy(false)
    }
  }

  const onSaveConfig = async (): Promise<void> => {
    setBusy(true)
    setNotice(undefined)
    try {
      await props.actions.setProxy(proxyDraft)
      await props.actions.setCompatClaude(compatDraft)
      setNotice({ kind: 'ok', text: t('safe') })
    } catch (error: unknown) {
      setNotice({ kind: 'error', text: t('failed', { message: error instanceof Error ? error.message : String(error) }) })
    } finally {
      setBusy(false)
    }
  }

  const loadedNames = useMemo(
    () => new Set((loaded?.loaded ?? []).map(row => row.name)),
    [loaded],
  )

  if (section.status === 'loading') {
    return (
      <div className={css.section}>
        <h2 className={css.title}>{t('title')}</h2>
        <p className={css.notice}>{t('loading')}</p>
      </div>
    )
  }

  if (section.status === 'unavailable' || section.writable === false) {
    return (
      <div className={css.section}>
        <h2 className={css.title}>{t('title')}</h2>
        <p className={`${css.notice} ${css.noticeError}`}>{t('unavailable')}</p>
      </div>
    )
  }

  const groups = useMemo(() => {
    const buckets = new Map<string, LoadedSkillRow[]>()
    for (const row of loaded?.loaded ?? []) {
      const key = groupKey(row.source)
      const list = buckets.get(key) ?? []
      list.push(row)
      buckets.set(key, list)
    }
    return [...buckets.entries()].sort(([a], [b]) => a.localeCompare(b))
  }, [loaded])

  return (
    <div className={css.section}>
      <h2 className={css.title}>{t('title')}</h2>
      <p className={css.intro}>{t('intro')}</p>

      <section className={css.card}>
        <h3 className={css.groupTitle}>{t('installTitle')}</h3>
        <p className={css.hint}>{t('installHint')}</p>
        <div className={css.formRow}>
          <input
            className={css.input}
            value={sourceInput}
            placeholder={t('installPlaceholder')}
            disabled={busy}
            onChange={event => { setSourceInput(event.target.value) }}
            onKeyDown={event => { if (event.key === 'Enter') void onInstall() }}
          />
          <Button variant="primary" disabled={busy || sourceInput.trim().length === 0} onClick={() => { void onInstall() }}>
            {t('install')}
          </Button>
        </div>
      </section>

      <section className={css.card}>
        <h3 className={css.groupTitle}>{t('installedTitle')}</h3>
        {loaded === undefined || loaded.installed.length === 0
          ? <p className={css.empty}>{t('installedEmpty')}</p>
          : (
            <ul className={css.list}>
              {loaded.installed.map((row: InstalledSkillRow) => (
                <li key={row.name} className={css.row}>
                  <span className={css.cellTitle}>
                    <span className={css.name}>
                      {row.name}
                      {loadedNames.has(row.name) && <span className={`${css.badge} ${css.badgeLoaded}`}>{t('loadedBadge')}</span>}
                    </span>
                    <span className={css.meta}>
                      {row.source}
                      {row.tag !== undefined ? ` @${row.tag}` : ''} · {t('updatedAt', { time: new Date(row.updatedAt).toLocaleString() })}
                    </span>
                  </span>
                  <span className={css.actions}>
                    <Button variant="outline" disabled={busy} onClick={() => { void onUpdate(row.name) }}>
                      {t('update')}
                    </Button>
                    <Button variant="outline" disabled={busy} onClick={() => { setConfirmName(row.name) }}>
                      {t('uninstall')}
                    </Button>
                  </span>
                </li>
              ))}
            </ul>
          )}
      </section>

      {confirmName !== undefined && (
        <div className={css.confirm}>
          <p className={css.confirmText}>{t('confirmUninstall', { name: confirmName })}</p>
          <Button variant="primary" disabled={busy} onClick={() => { void onUninstall() }}>
            {t('confirm')}
          </Button>
          <Button variant="outline" disabled={busy} onClick={() => { setConfirmName(undefined) }}>
            {t('cancel')}
          </Button>
        </div>
      )}

      <section className={css.card}>
        <div className={css.configHeader}>
          <h3 className={css.groupTitle}>{t('loadedTitle')}</h3>
          <Button variant="outline" disabled={busy} onClick={() => { void refresh() }}>
            {t('refresh')}
          </Button>
        </div>
        <p className={css.hint}>{t('loadedHint')}</p>
        {groups.length === 0
          ? <p className={css.empty}>{t('loadedEmpty')}</p>
          : groups.map(([key, rows]) => (
            <section key={key}>
              <h4 className={css.subGroupTitle}>{t(key as 'groupProject')}</h4>
              <ul className={css.list}>
                {rows.map(row => (
                  <li key={`${row.source}\u0000${row.name}`} className={css.row}>
                    <span className={css.cellTitle}>
                      <span className={css.name}>{row.name}</span>
                      <span className={css.meta}>
                        {row.description}{row.resourcePath !== undefined ? ` · ${row.resourcePath}` : ''}
                      </span>
                    </span>
                    <span className={css.meta}>{row.provider}</span>
                  </li>
                ))}
              </ul>
            </section>
          ))}
      </section>

      <section className={css.card}>
        <h3 className={css.groupTitle}>{t('proxyLabel')}</h3>
        <p className={css.hint}>{t('proxyHint')}</p>
        <label className={css.checkRow}>
          <input
            type="checkbox"
            className={css.checkbox}
            checked={proxyDraft.enabled}
            disabled={busy}
            onChange={event => { setProxyDraft(current => ({ ...current, enabled: event.target.checked })) }}
          />
          {t('proxyLabel')}
        </label>
        <input
          className={css.input}
          value={proxyDraft.url}
          placeholder="http://127.0.0.1:10808"
          disabled={busy || !proxyDraft.enabled}
          onChange={event => { setProxyDraft(current => ({ ...current, url: event.target.value })) }}
        />
        <label className={css.checkRow}>
          <input
            type="checkbox"
            className={css.checkbox}
            checked={compatDraft}
            disabled={busy}
            onChange={event => { setCompatDraft(event.target.checked) }}
          />
          {t('compatLabel')}
        </label>
        <p className={css.hint}>{t('compatHint')}</p>
        <Button variant="outline" disabled={busy} onClick={() => { void onSaveConfig() }}>
          {t('proxySave')}
        </Button>
      </section>

      {notice !== undefined && (
        <p className={notice.kind === 'ok' ? `${css.notice} ${css.noticeOk}` : `${css.notice} ${css.noticeError}`}>
          {notice.text}
        </p>
      )}
    </div>
  )
}