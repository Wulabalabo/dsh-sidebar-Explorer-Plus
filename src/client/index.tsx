/**
 * dsh-sidebar-upload client half.
 *
 * Registers one tab ("上传" / "Upload") in dsh-better-sidebar through the
 * public `ctx.betterSidebar.registerTab` service. The tab is a drag-and-drop
 * surface: drop files or folders to upload them (preserving folder structure)
 * into the conversation workspace via the plugin's own /sidebar-upload route.
 */
import { createElement, useCallback, useEffect, useRef, useState } from 'react'

// ── Structural types (kept local so the client bundle stays self-contained) ─

interface SessionScope {
  sessionId: string
  cwd?: string
}

interface UploadTabProps {
  scope: SessionScope
  visible?: boolean
}

/** The subset of dsh-better-sidebar's TabDescriptor this plugin declares. */
interface UploadTabDescriptor {
  id: string
  title: string | (() => string)
  icon?: (size: number) => ReturnType<typeof createElement>
  order?: number
  single?: boolean
  component: (props: { scope?: SessionScope; visible?: boolean }) => ReturnType<typeof createElement>
}

interface UploadClientContext {
  effect(fn: () => void | (() => void), label?: string): void
  betterSidebar: {
    registerTab(descriptor: UploadTabDescriptor): () => void
  }
}

// ── i18n ────────────────────────────────────────────────────────────────────

function isZh(): boolean {
  try {
    return typeof navigator !== 'undefined' && (navigator.language || '').toLowerCase().startsWith('zh')
  } catch {
    return false
  }
}

function label(zh: string, en: string): string {
  return isZh() ? zh : en
}

// ── Scoped stylesheet (injected once) ───────────────────────────────────────

const STYLE_ID = 'dsh-sidebar-upload-style'

function ensureStyle(): void {
  if (document.getElementById(STYLE_ID)) return
  const css = [
    '.dsu-root{display:flex;flex-direction:column;height:100%;min-height:0;padding:12px;box-sizing:border-box;gap:10px;overflow-y:auto}',
    '.dsu-hint{font:var(--dsw-font-xxs-12,12px/1.5 system-ui);color:var(--dsw-alias-label-tertiary,#888);margin:0}',
    '.dsu-zone{flex:1;min-height:140px;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:10px;border:1.5px dashed var(--dsw-alias-border-l1,rgba(128,128,128,.5));border-radius:12px;padding:24px;text-align:center;transition:border-color .12s ease,background .12s ease}',
    '.dsu-zone.dsu-active{border-color:var(--dsw-alias-state-business-primary,#4d6bfe);background:var(--dsw-alias-state-business-tertiary,rgba(77,107,254,.08))}',
    '.dsu-icon{display:block;width:34px;height:34px;color:var(--dsw-alias-label-tertiary,#888)}',
    '.dsu-zone.dsu-active .dsu-icon{color:var(--dsw-alias-state-business-primary,#4d6bfe)}',
    '.dsu-title{font:var(--dsw-font-s-strong-14,600 14px/1.4 system-ui);color:var(--dsw-alias-label-primary,#222)}',
    '.dsu-sub{font:var(--dsw-font-xxs-12,12px/1.5 system-ui);color:var(--dsw-alias-label-tertiary,#888)}',
    '.dsu-status{font:var(--dsw-font-xxs-12,12px/1.5 system-ui);color:var(--dsw-alias-label-secondary,#555);word-break:break-all}',
    '.dsu-error{color:var(--dsw-alias-state-error-primary,#d05)}',
    '.dsu-bar{width:100%;height:6px;border-radius:999px;background:var(--dsw-alias-interactive-bg-hover,rgba(0,0,0,.06));overflow:hidden}',
    '.dsu-bar-fill{height:100%;background:var(--dsw-alias-state-business-primary,#4d6bfe);transition:width .15s ease}',
    '.dsu-list{margin:4px 0 0;padding-left:16px;font:var(--dsw-font-xxs-12,12px/1.6 system-ui);color:var(--dsw-alias-label-tertiary,#888)}'
  ].join('\n')
  const style = document.createElement('style')
  style.id = STYLE_ID
  style.textContent = css
  document.head.appendChild(style)
}

// ── Drop collection (files + folders via webkitGetAsEntry) ─────────────────

interface DroppedFile {
  file: File
  relPath: string
}

function entryOf(item: DataTransferItem): FileSystemEntry | null {
  const getEntry = item.webkitGetAsEntry as (() => FileSystemEntry | null) | undefined
  return typeof getEntry === 'function' ? getEntry() : null
}

function fileOf(entry: FileSystemFileEntry): Promise<File> {
  return new Promise((resolve, reject) => { entry.file(resolve, reject) })
}

function readAllEntries(reader: FileSystemDirectoryReader): Promise<FileSystemEntry[]> {
  return new Promise((resolve, reject) => {
    const all: FileSystemEntry[] = []
    const readBatch = (): void => {
      reader.readEntries((batch) => {
        if (batch.length === 0) resolve(all)
        else { all.push(...batch); readBatch() }
      }, reject)
    }
    readBatch()
  })
}

function walk(entry: FileSystemEntry, relPath: string, out: DroppedFile[]): Promise<void> {
  if (entry.isFile) {
    return fileOf(entry as FileSystemFileEntry).then((file) => { out.push({ file, relPath }) })
  }
  if (entry.isDirectory) {
    return readAllEntries((entry as FileSystemDirectoryEntry).createReader()).then((children) => {
      return children.reduce((p: Promise<void>, child) => {
        return p.then(() => walk(child, `${relPath}/${child.name}`, out))
      }, Promise.resolve())
    })
  }
  return Promise.resolve()
}

function collectDroppedFiles(dataTransfer: DataTransfer): Promise<DroppedFile[]> {
  const items: DataTransferItem[] = []
  for (let i = 0; i < dataTransfer.items.length; i++) items.push(dataTransfer.items[i]!)
  const entries = items.map(entryOf).filter((entry): entry is FileSystemEntry => entry !== null)
  if (entries.length > 0) {
    const out: DroppedFile[] = []
    return entries.reduce((p: Promise<void>, entry) => {
      return p.then(() => walk(entry, entry.name, out))
    }, Promise.resolve()).then(() => out)
  }
  const files: File[] = []
  for (let i = 0; i < dataTransfer.files.length; i++) files.push(dataTransfer.files[i]!)
  return Promise.resolve(files.map((file) => {
    const rel = file.webkitRelativePath || ''
    return { file, relPath: rel !== '' ? rel : file.name }
  }))
}

// ── Upload one file ─────────────────────────────────────────────────────────

interface UploadResult {
  path: string
  bytes: number
  overwrote: boolean
}

function uploadOne(scope: SessionScope, dir: string | undefined, relPath: string, file: File): Promise<UploadResult> {
  const params = new URLSearchParams({ sessionId: scope.sessionId, name: relPath })
  if (dir) params.set('dir', dir)
  if (scope.cwd) params.set('cwd', scope.cwd)
  return fetch(`/sidebar-upload/upload?${params.toString()}`, {
    method: 'POST',
    headers: { 'content-type': 'application/octet-stream' },
    body: file
  }).then((res) => {
    return res.json().catch(() => null).then((data) => {
      if (!res.ok || data === null || data.ok !== true) {
        const message = data?.error?.message ? String(data.error.message) : `HTTP ${res.status}`
        throw new Error(message)
      }
      return data.value as UploadResult
    })
  })
}

function hasFiles(event: React.DragEvent): boolean {
  const types = event.dataTransfer?.types
  if (!types) return false
  return Array.prototype.indexOf.call(types, 'Files') !== -1
}

// ── Upload tab component ────────────────────────────────────────────────────

function UploadView(props: UploadTabProps): ReturnType<typeof createElement> {
  const scope = props.scope ?? { sessionId: '' }
  const sessionId = scope.sessionId
  const cwd = scope.cwd !== undefined && scope.cwd !== '' ? scope.cwd : undefined

  const dragDepth = useRef(0)
  const [dragActive, setDragActive] = useState(false)
  const [busy, setBusy] = useState(false)
  const [progress, setProgress] = useState<{ done: number; total: number } | null>(null)
  const [result, setResult] = useState<{ uploaded: number; overwrote: number; failed: string[] } | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [resolvedCwd, setResolvedCwd] = useState<string | null>(cwd ?? null)

  useEffect(() => { ensureStyle() }, [])

  useEffect(() => {
    if (sessionId === '' || cwd !== undefined) return
    let cancelled = false
    fetch('/sidebar/api/session.cwd', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ sessionId })
    }).then((r) => r.json()).then((d) => {
      if (!cancelled && d && d.ok && d.value && d.value.cwd) setResolvedCwd(String(d.value.cwd))
    }).catch(() => {})
    return () => { cancelled = true }
  }, [sessionId, cwd])

  const targetDir = cwd ?? resolvedCwd ?? undefined

  const handleDrop = useCallback((event: React.DragEvent) => {
    if (!hasFiles(event)) return
    event.preventDefault()
    event.stopPropagation()
    dragDepth.current = 0
    setDragActive(false)
    if (sessionId === '' || busy) return
    const dataTransfer = event.dataTransfer
    if (!dataTransfer) return
    collectDroppedFiles(dataTransfer).then((files) => {
      if (files.length === 0) return
      setBusy(true)
      setProgress({ done: 0, total: files.length })
      setResult(null)
      setError(null)
      let uploaded = 0
      let overwrote = 0
      const failed: string[] = []
      let index = 0
      const run = (): Promise<void> => {
        if (index >= files.length) return Promise.resolve()
        const i = index++
        const item = files[i]!
        return uploadOne(scope, cwd, item.relPath, item.file).then((value) => {
          uploaded += 1
          if (value.overwrote) overwrote += 1
          setProgress({ done: index, total: files.length })
        }, (e: unknown) => {
          failed.push(`${item.relPath} (${e instanceof Error ? e.message : 'error'})`)
          setProgress({ done: index, total: files.length })
        }).then(run)
      }
      const CONCURRENCY = 4
      const workers: Promise<void>[] = []
      for (let w = 0; w < Math.min(CONCURRENCY, files.length); w++) workers.push(run())
      return Promise.all(workers).then(() => {
        setBusy(false)
        setProgress(null)
        setResult({ uploaded, overwrote, failed })
      })
    }).catch((e: unknown) => {
      setBusy(false)
      setProgress(null)
      setError(e instanceof Error ? e.message : String(e))
    })
  }, [sessionId, scope, cwd, busy])

  const onDragOver = useCallback((event: React.DragEvent) => {
    if (!hasFiles(event)) return
    event.preventDefault()
    event.stopPropagation()
    if (event.dataTransfer) event.dataTransfer.dropEffect = 'copy'
    if (dragDepth.current === 0) setDragActive(true)
  }, [])

  const onDragEnter = useCallback((event: React.DragEvent) => {
    if (!hasFiles(event)) return
    event.preventDefault()
    event.stopPropagation()
    dragDepth.current += 1
    setDragActive(true)
  }, [])

  const onDragLeave = useCallback((event: React.DragEvent) => {
    if (!hasFiles(event)) return
    event.stopPropagation()
    dragDepth.current = Math.max(0, dragDepth.current - 1)
    if (dragDepth.current === 0) setDragActive(false)
  }, [])

  if (sessionId === '') {
    return createElement('div', { className: 'dsu-root' },
      createElement('p', { className: 'dsu-hint' }, label('选择一个会话以使用上传', 'Select a conversation to upload files'))
    )
  }

  const children: ReturnType<typeof createElement>[] = []

  children.push(createElement('div', {
    className: 'dsu-zone' + (dragActive ? ' dsu-active' : ''),
    onDragOver,
    onDragEnter,
    onDragLeave,
    onDrop: handleDrop
  },
    createElement('svg', { className: 'dsu-icon', viewBox: '0 0 24 24', fill: 'none', stroke: 'currentColor', strokeWidth: 2, strokeLinecap: 'round', strokeLinejoin: 'round', 'aria-hidden': 'true' },
      createElement('path', { d: 'M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4' }),
      createElement('polyline', { points: '17 8 12 3 7 8' }),
      createElement('line', { x1: '12', y1: '3', x2: '12', y2: '15' })
    ),
    createElement('div', { className: 'dsu-title' }, label('将文件或文件夹拖到此处', 'Drop files or folders here')),
    createElement('div', { className: 'dsu-sub' }, label('支持任意文件；文件夹会按原目录结构上传', 'Any file type is supported; folders keep their structure'))
  ))

  if (targetDir) {
    children.push(createElement('p', { className: 'dsu-status' },
      label('上传到：', 'Uploading to: ') + targetDir
    ))
  }

  if (busy && progress) {
    const percent = progress.total === 0 ? 0 : Math.round((progress.done / progress.total) * 100)
    children.push(createElement('div', { className: 'dsu-bar' },
      createElement('div', { className: 'dsu-bar-fill', style: { width: `${percent}%` } })
    ))
    children.push(createElement('p', { className: 'dsu-status' },
      `${label('正在上传… ', 'Uploading… ')}${progress.done} / ${progress.total}`
    ))
  }

  if (result) {
    let line = `${label('上传完成：新增 ', 'Uploaded: ')}${result.uploaded}${label('，覆盖 ', ', overwrote ')}${result.overwrote}`
    if (result.failed.length > 0) line += label(`，失败 ${result.failed.length}`, `, failed ${result.failed.length}`)
    children.push(createElement('p', { className: 'dsu-status' }, line))
    if (result.failed.length > 0) {
      const items = result.failed.slice(0, 20).map((name) => createElement('li', { key: name }, name))
      children.push(createElement('ul', { className: 'dsu-list' }, items))
    }
  }

  if (error) {
    children.push(createElement('p', { className: 'dsu-status dsu-error' }, error))
  }

  return createElement('div', { className: 'dsu-root' }, children)
}

// ── Client plugin registration ──────────────────────────────────────────────

export const inject = ['betterSidebar']

export function apply(ctx: UploadClientContext): void {
  ctx.effect(() => ctx.betterSidebar.registerTab({
    id: 'sidebar-upload',
    title: () => label('上传', 'Upload'),
    icon: (size: number) => createElement('svg', { viewBox: '0 0 24 24', width: size, height: size, fill: 'none', stroke: 'currentColor', strokeWidth: 2, strokeLinecap: 'round', strokeLinejoin: 'round', 'aria-hidden': 'true' },
      createElement('path', { d: 'M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4' }),
      createElement('polyline', { points: '17 8 12 3 7 8' }),
      createElement('line', { x1: '12', y1: '3', x2: '12', y2: '15' })
    ),
    order: 60,
    single: true,
    component: (props) => createElement(UploadView, { scope: props.scope ?? { sessionId: '' }, visible: props.visible })
  }), 'dsh-sidebar-upload: register upload tab')
}
