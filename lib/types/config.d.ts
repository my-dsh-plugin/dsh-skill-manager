/**
 * Configuration schema and load-time validation for the skill-manager plugin.
 * The section schema carries the transient command channel fields alongside
 * the durable configuration so the Settings page can write them through the
 * standard settings seam.
 *
 * @module dsh-skill-manager/config
 */
import z from '@deepseek-ai/schemastery';
import type { ProxyConfig, WireSection } from './shared.ts';
/** Runtime schema for the whole {@link WireSection}. */
export declare const Config: z<WireSection>;
/** Composition entry values when no settings layer writes anything. */
export declare function defaultConfig(): WireSection;
/**
 * Reject a section the schema accepts but the plugin cannot serve: a proxy
 * that is enabled without a URL will fail every download at runtime.
 * @param section - the schema-validated section.
 * @throws Error naming the offending field.
 */
export declare function assertValidConfig(section: WireSection): void;
/** Convenience projection: the proxy in effect for downloads. */
export declare function proxyConfig(section: WireSection): ProxyConfig;
//# sourceMappingURL=config.d.ts.map