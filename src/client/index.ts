/**
 * dsh-skill-manager Settings page, browser half. Registers one section in the
 * Settings nav (below the bundled sections), bound to the plugin's
 * `skill-manager` settings namespace. Every action on the page is a command
 * written into that namespace; the Host executes it and writes the result
 * back.
 *
 * @module dsh-skill-manager/client
 */

// Type-only: the ctx.locale Context merge.
import type {} from '@deepseek-ai/dsh-client-locale/client'
// Type-only: the ctx.settingsScope Context merge and the settings.section SlotMap entry.
import type {} from '@deepseek-ai/dsh-client-ui-settings/client'
import type { ClientContext } from '@deepseek-ai/dsh-client-runtime/client'
import type { SettingsScope } from '@deepseek-ai/dsh-client-runtime/client'
import type { WireSection } from '../shared.ts'
import { SETTINGS_NS } from '../shared.ts'
import { SkillManagerSection, type SkillManagerSectionFace } from './section.tsx'
import { SkillManagerSectionController } from './section-controller.ts'
import { en, zh } from './locales.ts'
import type { Dictionary } from './locales.ts'

declare module '@deepseek-ai/dsh-client-ui-slots' {
  interface LocaleNamespaceMap {
    /** The Skills settings page copy. */
    'skill-manager': Dictionary
  }
}

/** Locale dictionary namespace owned by this section. */
const NS = 'skill-manager'

/** Required services (cordis fiber inject). */
export const inject = ['slots', 'locale', 'settingsScope']

/**
 * Mount the Skills settings section.
 * @param ctx - the browser plugin context.
 */
export function apply(ctx: ClientContext): void {
  const t = ctx.locale.bind(NS)
  ctx.effect(() => ctx.locale.register(NS, { zh, en }), 'skill-manager: section dictionaries')

  const controller = new SkillManagerSectionController(
    ctx.settingsScope.bind({ namespace: SETTINGS_NS }) as unknown as SettingsScope<WireSection>,
  )
  ctx.effect(() => () => controller.dispose(), 'skill-manager: command waiters')

  ctx.slots.inject('settings.section', () => ctx.slots.register({
    name: 'settings.section',
    // Below the plugin-managed sections (session-archive-manager order 16).
    id: 'skill-manager',
    order: 17,
    label: () => t('nav'),
    locale: NS,
    inject: (): SkillManagerSectionFace => ({
      hooks: {
        section: controller.sectionSource,
      },
      actions: {
        run: (action, input) => controller.run(action, input),
        setProxy: proxy => controller.setProxy(proxy),
        setCompatClaude: enabled => controller.setCompatClaude(enabled),
      },
    }),
  }, SkillManagerSection))
}