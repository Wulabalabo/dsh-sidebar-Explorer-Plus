/**
 * dsh-sidebar-upload client half.
 *
 * Registers one tab ("上传" / "Upload") in dsh-better-sidebar through the
 * public `ctx.betterSidebar.registerTab` service. The tab shows a folder tree
 * rooted at the conversation workspace (cwd) — pick a directory, then drop
 * files or folders onto the panel to upload them (preserving folder
 * structure) into that directory via the plugin's own /sidebar-upload route.
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
    '.dsu-root{display:flex;flex-direction:column;height:100%;min-height:0;box-sizing:border-box;overflow-y:auto}',
    '.dsu-head{padding:12px 12px 6px;font:var(--dsw-font-xxs-12,12px/1.5 system-ui);color:var(--dsw-alias-label-tertiary,#888);word-break:break-all}',
    '.dsu-tree{flex:1;min-height:0;overflow-y:auto;padding:0 6px 8px}',
    '.dsu-row{display:flex;align-items:center;gap:4px;height:30px;border-radius:8px;padding:0 6px;cursor:pointer;color:var(--dsw-alias-label-primary,#222);font:var(--dsw-font-s-14,14px/1.4 system-ui)}',
    '.dsu-row:hover{background:var(--dsw-alias-interactive-bg-hover,rgba(0,0,0,.05))}',
    '.dsu-row.dsu-selected{background:var(--dsw-alias-state-business-tertiary,rgba(77,107,254,.1));color:var(--dsw-alias-state-business-primary,#4d6bfe)}',
    '.dsu-chevron{flex:none;width:18px;height:18px;border:none;background:transparent;color:var(--dsw-alias-label-tertiary,#888);cursor:pointer;padding:0;font-size:11px;line-height:18px;text-align:center}',
    '.dsu-name{flex:1;min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;border:none;background:transparent;color:inherit;cursor:pointer;padding:0;text-align:left;font:inherit}',
    '.dsu-empty{padding:16px;font:var(--dsw-font-xxs-12,12px/1.5 system-ui);color:var(--dsw-alias-label-tertiary,#888);text-align:center}',
    '.dsu-zone{margin:6px 12px 12px;border:1.5px dashed var(--dsw-alias-border-l1,rgba(128,128,128,.5));border-radius:12px;padding:20px;text-align:center;transition:border-color .12s ease,background .12s ease}',
    '.dsu-zone.dsu-active{border-color:var(--dsw-alias-state-business-primary,#4d6bfe);background:var(--dsw-alias-state-business-tertiary,rgba(77,107,254,.08))}',
    '.dsu-icon{display:block;width:32px;height:32px;margin:0 auto 8px;color:var(--dsw-alias-label-tertiary,#888)}',
    '.dsu-zone.dsu-active .dsu-icon{color:var(--dsw-alias-state-business-primary,#4d6bfe)}',
    '.dsu-title{font:var(--dsw-font-s-strong-14,600 14px/1.4 system-ui);color:var(--dsw-alias-label-primary,#222)}',
    '.dsu-sub{font:var(--dsw-font-xxs-12,12px/1.5 system-ui);color:var(--dsw-alias-label-tertiary,#888)}',
    '.dsu-status{font:var(--dsw-font-xxs-12,12px/1.5 system-ui);color:var(--dsw-alias-label-secondary,#555);word-break:break-all;margin:0 12px 12px}',
    '.dsu-error{color:var(--dsw-alias-state-error-primary,#d05)}',
    '.dsu-bar{width:100%;height:6px;border-radius:999px;background:var(--dsw-alias-interactive-bg-hover,rgba(0,0,0,.06));overflow:hidden;margin:0 12px 8px}',
    '.dsu-bar-fill{height:100%;background:var(--dsw-alias-state-business-primary,#4d6bfe);transition:width .15s ease}',
    '.dsu-list{margin:0 12px 12px;padding-left:16px;font:var(--dsw-font-xxs-12,12px/1.6 system-ui);color:var(--dsw-alias-label-tertiary,#888)}'
  ].join('\n')
  const style = document.createElement('style')
  style.id = STYLE_ID
  style.textContent = css
  document.head.appendChild(style)
}

// ── Directory tree data (reuses better-sidebar's fenced /sidebar/api) ───────

interface DirEntry {
  name: string
  path: string
  isDir: boolean
  hidden?: boolean
}

interface DirLevel {
  entries?: DirEntry[]
  error?: string
}

function fsTree(scope: SessionScope, path: string): Promise<DirLevel> {
  return fetch('/sidebar/api/fs.tree', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ sessionId: scope.sessionId, ...(scope.cwd ? { cwd: scope.cwd } : {}), path })
  }).then((res) => {
    return res.json().catch(() => null).then((data) => {
      if (!res.ok || data === null || data.ok !== true) {
        throw new Error(data?.error?.message ? String(data.error.message) : `HTTP ${res.status}`)
      }
      return data.value as { entries: DirEntry[]; truncated: boolean }
    })
  })
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

function uploadOne(scope: SessionScope, dir: string, relPath: string, file: File): Promise<UploadResult> {
  const params = new URLSearchParams({ sessionId: scope.sessionId, name: relPath, dir })
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

function baseName(path: string): string {
  const trimmed = path.replace(/[\\/]+$/, '')
  const at = Math.max(trimmed.lastIndexOf('/'), trimmed.lastIndexOf('\\'))
  return at === -1 ? trimmed : trimmed.slice(at + 1)
}

// ── Upload tab component ────────────────────────────────────────────────────

function UploadView(props: UploadTabProps): ReturnType<typeof createElement> {
  const scope = props.scope ?? { sessionId: '' }
  const sessionId = scope.sessionId
  const cwd = scope.cwd !== undefined && scope.cwd !== '' ? scope.cwd : undefined

  // Directory tree state.
  const [tree, setTree] = useState<Record<string, DirLevel>>({})
  const treeRef = useRef<Record<string, DirLevel>>({})
  const [expanded, setExpanded] = useState<string[]>([])
  const [selected, setSelected] = useState<string | null>(null)
  const [resolvedCwd, setResolvedCwd] = useState<string | null>(null)

  // Upload state.
  const dragDepth = useRef(0)
  const [dragActive, setDragActive] = useState(false)
  const [busy, setBusy] = useState(false)
  const [progress, setProgress] = useState<{ done: number; total: number } | null>(null)
  const [result, setResult] = useState<{ uploaded: number; overwrote: number; failed: string[] } | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => { ensureStyle() }, [])

  // Resolve the workspace path for the tree root when the scope summary lacks it.
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

  const root = cwd ?? resolvedCwd ?? undefined

  const setTreeLevel = useCallback((dir: string, level: DirLevel) => {
    treeRef.current = { ...treeRef.current, [dir]: level }
    setTree(treeRef.current)
  }, [])

  const loadDir = useCallback((dir: string) => {
    if (treeRef.current[dir] !== undefined) return
    setTreeLevel(dir, {})
    fsTree(scope, dir).then((listing) => {
      setTreeLevel(dir, { entries: listing.entries })
    }).catch((e: unknown) => {
      setTreeLevel(dir, { error: e instanceof Error ? e.message : String(e) })
    })
  }, [scope, setTreeLevel])

  // Load the root and the expanded set.
  useEffect(() => {
    if (root === undefined) return
    loadDir(root)
    for (const dir of expanded) loadDir(dir)
    if (selected === null) setSelected(root)
  }, [root, expanded, loadDir, selected])

  const toggleExpand = useCallback((dir: string) => {
    setExpanded((prev) => prev.includes(dir) ? prev.filter((d) => d !== dir) : [...prev, dir])
    loadDir(dir)
  }, [loadDir])

  const targetDir = selected ?? root

  const handleDrop = useCallback((event: React.DragEvent) => {
    if (!hasFiles(event)) return
    event.preventDefault()
    event.stopPropagation()
    dragDepth.current = 0
    setDragActive(false)
    if (sessionId === '' || busy || targetDir === undefined) return
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
        return uploadOne(scope, targetDir, item.relPath, item.file).then((value) => {
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
  }, [sessionId, scope, targetDir, busy])

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

  const renderLevel = (dir: string, depth: number): ReturnType<typeof createElement>[] => {
    const level = tree[dir]
    if (level === undefined) {
      return [createElement('div', { key: `${dir}:loading`, className: 'dsu-empty' }, label('加载中…', 'Loading…'))]
    }
    if (level.error !== undefined) {
      return [createElement('div', { key: `${dir}:error`, className: 'dsu-empty dsu-error' }, level.error)]
    }
    const dirs = (level.entries ?? []).filter((entry) => entry.isDir)
    if (dirs.length === 0) return []
    return dirs.map((entry) => {
      const isOpen = expanded.includes(entry.path)
      const isSelected = selected === entry.path
      const children = isOpen ? renderLevel(entry.path, depth + 1) : []
      return createElement('div', { key: entry.path },
        createElement('div', {
          className: 'dsu-row' + (isSelected ? ' dsu-selected' : ''),
          style: { paddingLeft: `${depth * 18 + 6}px` }
        },
          createElement('button', {
            className: 'dsu-chevron',
            type: 'button',
            onClick: (event: React.MouseEvent) => { event.stopPropagation(); toggleExpand(entry.path) }
          }, isOpen ? '▾' : '▸'),
          createElement('svg', { viewBox: '0 0 24 24', width: 14, height: 14, fill: 'none', stroke: 'currentColor', strokeWidth: 2, strokeLinecap: 'round', strokeLinejoin: 'round', 'aria-hidden': 'true' },
            createElement('path', { d: 'M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z' })
          ),
          createElement('button', {
            className: 'dsu-name',
            type: 'button',
            title: entry.path,
            onClick: () => setSelected(entry.path)
          }, entry.name)
        ),
        ...children
      )
    })
  }

  if (sessionId === '') {
    return createElement('div', { className: 'dsu-root' },
      createElement('div', { className: 'dsu-empty' }, label('选择一个会话以使用上传', 'Select a conversation to upload files'))
    )
  }

  const children: ReturnType<typeof createElement>[] = []

  if (targetDir !== undefined) {
    children.push(createElement('div', { className: 'dsu-head' },
      `${label('上传目标：', 'Upload target: ')}${targetDir}`
    ))
  }

  // Root row (always expanded, selectable).
  if (root !== undefined) {
    const isRootSelected = selected === root
    children.push(createElement('div', { className: 'dsu-tree' },
      createElement('div', { className: 'dsu-row' + (isRootSelected ? ' dsu-selected' : ''), style: { paddingLeft: '6px' } },
        createElement('svg', { viewBox: '0 0 24 24', width: 14, height: 14, fill: 'none', stroke: 'currentColor', strokeWidth: 2, strokeLinecap: 'round', strokeLinejoin: 'round', 'aria-hidden': 'true' },
          createElement('path', { d: 'M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z' })
        ),
        createElement('button', { className: 'dsu-name', type: 'button', title: root, onClick: () => setSelected(root) }, baseName(root))
      ),
      ...renderLevel(root, 1)
    ))
  }

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
