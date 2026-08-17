/**
 * Configuration schema and load-time validation for the skill-manager plugin.
 * The section schema carries the transient command channel fields alongside
 * the durable configuration so the Settings page can write them through the
 * standard settings seam.
 *
 * @module dsh-skill-manager/config
 */
import z from '@deepseek-ai/schemastery';
/**
 * One client command on the wire. Every field is optional in the schema:
 * schemastery injects a default `{}` for object fields without an explicit
 * default, and a required inner field would fail namespace registration. The
 * controller guards on `command.id` at runtime, so a default-empty command is
 * ignored; real commands always carry `id` and `action`.
 */
const commandSchema = z.object({
    id: z.string(),
    action: z.union(['list', 'install', 'update', 'uninstall']),
    input: z.string(),
});
/** One host result on the wire; fields optional for the same reason. */
const resultSchema = z.object({
    id: z.string(),
    ok: z.boolean(),
    message: z.string(),
    data: z.string(),
});
/** Runtime schema for the whole {@link WireSection}. */
export const Config = z.object({
    proxy: z.object({
        enabled: z.boolean().default(false),
        url: z.string().default(''),
    }),
    compatClaude: z.boolean().default(true),
    command: commandSchema,
    result: resultSchema,
});
/** Composition entry values when no settings layer writes anything. */
export function defaultConfig() {
    return {
        proxy: { enabled: false, url: '' },
        compatClaude: true,
    };
}
/**
 * Reject a section the schema accepts but the plugin cannot serve: a proxy
 * that is enabled without a URL will fail every download at runtime.
 * @param section - the schema-validated section.
 * @throws Error naming the offending field.
 */
export function assertValidConfig(section) {
    if (section.proxy.enabled && section.proxy.url.trim().length === 0) {
        throw new Error('skill-manager: proxy is enabled but no proxy URL is set; disable it or provide http://host:port');
    }
}
/** Convenience projection: the proxy in effect for downloads. */
export function proxyConfig(section) {
    return section.proxy.enabled && section.proxy.url.trim().length > 0
        ? { enabled: true, url: section.proxy.url.trim() }
        : { enabled: false, url: '' };
}
//# sourceMappingURL=config.js.map