/**
 * dsh-sidebar-upload host half.
 *
 * Registers a single raw-bytes upload route (`POST /sidebar-upload/upload`)
 * that writes dropped files/folders under the conversation's working
 * directory. The browser client half (lib/client.js) registers a
 * dsh-better-sidebar tab whose drag-drop surface POSTs here.
 *
 * The route is gated by the same browser-trust fence as DSH's /api gateway
 * (Host-header loopback or the web runtime's `trustedHosts`), and every
 * write is confined to the session cwd via `isWithin` checks.
 */
import { mkdir, rename, rm, stat, writeFile } from 'node:fs/promises'
import { dirname, join } from 'node:path'

export const name = 'dsh-sidebar-upload'
export const inject = ['webServer', 'sessions', 'webRuntime']

/** Default cap of one uploaded file's bytes (50 MiB). */
const DEFAULT_UPLOAD_LIMIT = 50 * 1024 * 1024

// ── Tiny self-contained error/envelope helpers ────────────────────────────

class UploadError extends Error {
  constructor(code, message, status = 400) {
    super(message)
    this.code = code
    this.status = status
  }
}

function writeJson(res, status, body) {
  res.writeHead(status, { 'content-type': 'application/json; charset=utf-8' })
  res.end(JSON.stringify(body))
}

function writeOk(res, value) {
  writeJson(res, 200, { ok: true, value })
}

function writeError(res, error) {
  if (error instanceof UploadError) {
    writeJson(res, error.status, { ok: false, error: { code: error.code, message: error.message } })
    return
  }
  const message = error instanceof Error ? error.message : String(error)
  writeJson(res, 500, { ok: false, error: { code: 'internal', message } })
}

// ── Browser-trust fence (behaviorally identical to DSH's api gateway) ─────

function header(headers, name) {
  const value = headers[name]
  return typeof value === 'string' ? value : undefined
}

function parseAuthority(authority) {
  try {
    return new URL(`http://${authority}`)
  } catch {
    return undefined
  }
}

function isLoopbackHostname(hostname) {
  if (hostname === 'localhost' || hostname === '[::1]') return true
  const parts = hostname.split('.')
  return parts.length === 4
    && parts[0] === '127'
    && parts.every((part) => /^\d{1,3}$/.test(part) && Number(part) <= 255)
}

function canonicalAuthority(entry, entryUrl) {
  const port = entryUrl.port !== '' ? entryUrl.port : new URL(`https://${entry}`).port
  return port === '' ? entryUrl.hostname : `${entryUrl.hostname}:${port}`
}

function isTrustedAuthority(hostUrl, trustedHosts) {
  return (trustedHosts || []).some((entry) => {
    const entryUrl = parseAuthority(entry)
    if (entryUrl === undefined) return false
    return canonicalAuthority(entry, entryUrl) === entryUrl.hostname
      ? entryUrl.hostname === hostUrl.hostname
      : entryUrl.host === hostUrl.host
  })
}

function isTrustedRequest(req, trustedHosts) {
  const host = header(req.headers, 'host')
  if (host === undefined) return false
  const hostUrl = parseAuthority(host)
  if (hostUrl === undefined) return false
  if (!isLoopbackHostname(hostUrl.hostname) && !isTrustedAuthority(hostUrl, trustedHosts)) return false
  if (header(req.headers, 'sec-fetch-site') === 'cross-site') return false
  const origin = header(req.headers, 'origin')
  if (origin === undefined) return true
  try {
    return new URL(origin).host === hostUrl.host
  } catch {
    return false
  }
}

// ── Path helpers ──────────────────────────────────────────────────────────

function requireAbsolute(path) {
  if (!path.startsWith('/') && !/^[A-Za-z]:[\\/]/.test(path)) {
    throw new UploadError('bad-request', `"${path}" is not an absolute path`)
  }
  return path
}

function normalizePath(value) {
  return value.replace(/[\\/]+/g, '/').replace(/\/$/, '')
}

function isWithin(base, target, platform = process.platform) {
  const b = normalizePath(base)
  const t = normalizePath(target)
  if (platform === 'win32') {
    const lb = b.toLowerCase()
    const lt = t.toLowerCase()
    return lt === lb || lt.startsWith(`${lb}/`)
  }
  return t === b || t.startsWith(`${b}/`)
}

/**
 * Resolve a session's authoritative working directory: session header cwd,
 * then the client-provided cwd, then the process cwd.
 */
function sessionCwdOf(ctx, sessionId, clientCwd) {
  const session = ctx.sessions.get(sessionId)
  const headerCwd = session?.header?.cwd
  if (headerCwd !== undefined && headerCwd !== '') return headerCwd
  if (clientCwd !== undefined && clientCwd !== '') {
    try {
      return requireAbsolute(clientCwd)
    } catch {
      throw new UploadError('bad-request', `invalid working directory "${clientCwd}"`)
    }
  }
  return process.cwd()
}

/** Read the raw request body, bounded by `limit` bytes. */
async function readRawBody(req, limit) {
  const chunks = []
  let total = 0
  for await (const chunk of req) {
    const buffer = Buffer.from(chunk)
    total += buffer.length
    if (total > limit) throw new UploadError('bad-request', 'request body too large')
    chunks.push(buffer)
  }
  return Buffer.concat(chunks)
}

// ── Plugin body ───────────────────────────────────────────────────────────

export function apply(ctx, config) {
  const configured = config && Number.isFinite(config.uploadLimit) && config.uploadLimit > 0
    ? config.uploadLimit
    : DEFAULT_UPLOAD_LIMIT

  ctx.effect(() => ctx.webServer.register({
    kind: 'prefix',
    path: '/sidebar-upload',
    handler: async (req, res) => {
      if (!isTrustedRequest(req, ctx.webRuntime.trustedHosts)) {
        res.writeHead(403)
        res.end('forbidden')
        return
      }
      if (req.method !== 'POST') {
        res.writeHead(405)
        res.end()
        return
      }
      try {
        const url = new URL(req.url ?? '/', 'http://dsh.internal')
        const sessionId = url.searchParams.get('sessionId')
        const rawDir = url.searchParams.get('dir')
        const name = url.searchParams.get('name')
        if (sessionId === null || name === null) {
          throw new UploadError('bad-request', 'sessionId and name are required')
        }
        const cwd = sessionCwdOf(ctx, sessionId, url.searchParams.get('cwd') ?? undefined)
        const dir = rawDir === null || rawDir === '' ? cwd : requireAbsolute(rawDir)
        if (!isWithin(cwd, dir)) {
          throw new UploadError('fs-error', 'upload target outside the session working directory', 403)
        }
        // `name` is a '/' separated relative path from the drop target; reject
        // any segment that could traverse outside the tree.
        const segments = name.split('/').filter((segment) => segment !== '')
        if (segments.length === 0 || segments.some((segment) => segment === '.' || segment === '..' || segment.includes('\\') || segment.includes('\0'))) {
          throw new UploadError('bad-request', 'invalid upload name')
        }
        const target = join(dir, ...segments)
        if (!isWithin(cwd, target)) {
          throw new UploadError('fs-error', 'upload target outside the session working directory', 403)
        }
        const bytes = await readRawBody(req, configured)
        const existed = await stat(target).then((info) => info.isFile(), () => false)
        const tmp = `${target}.dsh-upload-${process.pid}-${Math.random().toString(36).slice(2)}`
        try {
          await mkdir(dirname(target), { recursive: true })
          await writeFile(tmp, bytes)
          await rename(tmp, target)
        } catch (error) {
          await rm(tmp, { force: true }).catch(() => {})
          throw new UploadError('fs-error', `cannot upload "${target}": ${error instanceof Error ? error.message : String(error)}`, 400)
        }
        writeOk(res, { path: target, bytes: bytes.length, overwrote: existed })
      } catch (error) {
        writeError(res, error)
      }
    },
  }), 'dsh-sidebar-upload: upload route')
}
