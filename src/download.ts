/**
 * Minimal HTTPS download for GitHub codeload tarballs, with optional HTTP
 * proxy (CONNECT) support via `https-proxy-agent`. Redirects are followed
 * (codeload can redirect); the payload streams to disk, so memory stays flat
 * regardless of archive size.
 *
 * @module dsh-skill-manager/download
 */

import { createWriteStream } from 'node:fs'
import * as path from 'node:path'
import { promises as fsp } from 'node:fs'
import { get as httpsGet } from 'node:https'
import type { IncomingMessage } from 'node:http'
import { HttpsProxyAgent } from 'https-proxy-agent'

const MAX_REDIRECTS = 5

/** Abortable download of one URL to a local file. */
export interface DownloadOptions {
  /** Proxy URL forwarded to `HttpsProxyAgent`; no proxy when absent. */
  proxyUrl?: string | undefined
  signal?: AbortSignal | undefined
}

function requestOnce(url: string, proxyUrl: string | undefined, signal: AbortSignal | undefined): Promise<IncomingMessage> {
  return new Promise((resolve, reject) => {
    const agent = proxyUrl === undefined ? undefined : new HttpsProxyAgent(proxyUrl)
    const req = httpsGet(url, { agent, signal }, resolve)
    req.on('error', reject)
  })
}

/**
 * Download `url` into `destFile` (streamed), following redirects.
 * @param url - target URL.
 * @param destFile - destination file; its directory must exist.
 * @param options - proxy and cancellation.
 * @throws Error naming the failure stage on HTTP, network, or abort errors.
 */
export async function downloadUrl(url: string, destFile: string, options: DownloadOptions = {}): Promise<void> {
  let current = url
  for (let hop = 0; hop <= MAX_REDIRECTS; hop += 1) {
    const response = await requestOnce(current, options.proxyUrl, options.signal)
    const status = response.statusCode ?? 0
    if (status >= 300 && status < 400 && response.headers.location !== undefined) {
      response.resume()
      const next = new URL(response.headers.location, current).toString()
      if (next === current) throw new Error(`skill-manager: redirect loop at ${current}`)
      current = next
      continue
    }
    if (status !== 200) {
      response.resume()
      throw new Error(`skill-manager: download failed with HTTP ${status} for ${current}`)
    }

    const writer = createWriteStream(destFile, { flags: 'w' })
    await new Promise<void>((resolve, reject) => {
      const fail = (error: Error): void => {
        response.destroy()
        writer.destroy()
        reject(error)
      }
      response.on('error', (error: Error) => fail(new Error(`skill-manager: download stream failed: ${error.message}`)))
      writer.on('error', (error: Error) => fail(new Error(`skill-manager: cannot write ${path.basename(destFile)}: ${error.message}`)))
      writer.on('finish', () => resolve())
      response.pipe(writer)
    })
    return
  }
  throw new Error(`skill-manager: too many redirects downloading ${url}`)
}

/** Download a tarball into a fresh temp directory, returning the file path. */
export async function downloadToTemp(
  url: string,
  tmpBase: string,
  options: DownloadOptions = {},
): Promise<string> {
  await fsp.mkdir(tmpBase, { recursive: true })
  const dir = await fsp.mkdtemp(path.join(tmpBase, 'download-'))
  const file = path.join(dir, 'repo.tgz')
  await downloadUrl(url, file, options)
  return file
}