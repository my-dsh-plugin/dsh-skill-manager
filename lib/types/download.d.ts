/**
 * Minimal HTTPS download for GitHub codeload tarballs, with optional HTTP
 * proxy (CONNECT) support via `https-proxy-agent`. Redirects are followed
 * (codeload can redirect); the payload streams to disk, so memory stays flat
 * regardless of archive size.
 *
 * @module dsh-skill-manager/download
 */
/** Abortable download of one URL to a local file. */
export interface DownloadOptions {
    /** Proxy URL forwarded to `HttpsProxyAgent`; no proxy when absent. */
    proxyUrl?: string | undefined;
    signal?: AbortSignal | undefined;
}
/**
 * Download `url` into `destFile` (streamed), following redirects.
 * @param url - target URL.
 * @param destFile - destination file; its directory must exist.
 * @param options - proxy and cancellation.
 * @throws Error naming the failure stage on HTTP, network, or abort errors.
 */
export declare function downloadUrl(url: string, destFile: string, options?: DownloadOptions): Promise<void>;
/** Download a tarball into a fresh temp directory, returning the file path. */
export declare function downloadToTemp(url: string, tmpBase: string, options?: DownloadOptions): Promise<string>;
//# sourceMappingURL=download.d.ts.map