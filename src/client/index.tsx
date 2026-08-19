/**
 * dsh-sidebar-explorer-plus client half.
 *
 * Registers a file-manager tab ("文件" / "Files") in dsh-better-sidebar through
 * the public `ctx.betterSidebar.registerTab` service. The tab shows a tree of
 * the conversation workspace (cwd) with real file operations:
 * - pick a directory as the upload target and drop files/folders in;
 * - drag a file/folder onto another folder to MOVE it;
 * - right-click a row to RENAME or DELETE;
 * - create a new folder under the selected directory.
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
  onOpenFile?: (path: string) => void
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
    openFile?: (scope: SessionScope, path: string, title?: string) => void
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

const STYLE_ID = 'dsh-sidebar-explorer-plus-style'

function ensureStyle(): void {
  if (document.getElementById(STYLE_ID)) return
  const css = [
    '.dse-root{display:flex;flex-direction:column;height:100%;min-height:0;box-sizing:border-box;overflow-y:auto}',
    '.dse-head{padding:12px 12px 6px;font:var(--dsw-font-xxs-12,12px/1.5 system-ui);color:var(--dsw-alias-label-tertiary,#888);word-break:break-all}',
    '.dse-toolbar{display:flex;align-items:center;gap:8px;padding:4px 12px}',
    '.dse-newbtn{height:26px;padding:0 10px;border:1px solid var(--dsw-alias-border-l1,rgba(128,128,128,.4));border-radius:999px;background:var(--dsw-alias-bg-layer-2,#fff);color:var(--dsw-alias-label-primary,#222);font:var(--dsw-font-xxs-12,12px/1.4 system-ui);cursor:pointer}',
    '.dse-newbtn:hover{background:var(--dsw-alias-interactive-bg-hover,rgba(0,0,0,.05))}',
    '.dse-tree{flex:1;min-height:0;overflow-y:auto;padding:0 6px 8px}',
    '.dse-row{display:flex;align-items:center;gap:4px;height:30px;border-radius:8px;padding:0 6px;cursor:pointer;color:var(--dsw-alias-label-primary,#222);font:var(--dsw-font-s-14,14px/1.4 system-ui);box-sizing:border-box}',
    '.dse-row:hover{background:var(--dsw-alias-interactive-bg-hover,rgba(0,0,0,.05))}',
    '.dse-row.dse-selected{background:var(--dsw-alias-state-business-tertiary,rgba(77,107,254,.1));color:var(--dsw-alias-state-business-primary,#4d6bfe)}',
    '.dse-row.dse-drop{outline:1.5px solid var(--dsw-alias-state-business-primary,#4d6bfe);outline-offset:-1.5px;background:var(--dsw-alias-state-business-tertiary,rgba(77,107,254,.1))}',
    '.dse-chevron{flex:none;width:18px;height:18px;border:none;background:transparent;color:var(--dsw-alias-label-tertiary,#888);cursor:pointer;padding:0;font-size:11px;line-height:18px;text-align:center}',
    '.dse-name{flex:1;min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;border:none;background:transparent;color:inherit;cursor:pointer;padding:0;text-align:left;font:inherit}',
    '.dse-file .dse-name{color:var(--dsw-alias-label-secondary,#555)}',
    '.dse-hidden{opacity:.5}',
    '.dse-empty{padding:16px;font:var(--dsw-font-xxs-12,12px/1.5 system-ui);color:var(--dsw-alias-label-tertiary,#888);text-align:center}',
    '.dse-zone{margin:6px 12px 12px;border:1.5px dashed var(--dsw-alias-border-l1,rgba(128,128,128,.5));border-radius:12px;padding:20px;text-align:center;transition:border-color .12s ease,background .12s ease}',
    '.dse-zone.dse-active{border-color:var(--dsw-alias-state-business-primary,#4d6bfe);background:var(--dsw-alias-state-business-tertiary,rgba(77,107,254,.08))}',
    '.dse-icon{display:block;width:32px;height:32px;margin:0 auto 8px;color:var(--dsw-alias-label-tertiary,#888)}',
    '.dse-zone.dse-active .dse-icon{color:var(--dsw-alias-state-business-primary,#4d6bfe)}',
    '.dse-title{font:var(--dsw-font-s-strong-14,600 14px/1.4 system-ui);color:var(--dsw-alias-label-primary,#222)}',
    '.dse-sub{font:var(--dsw-font-xxs-12,12px/1.5 system-ui);color:var(--dsw-alias-label-tertiary,#888)}',
    '.dse-status{font:var(--dsw-font-xxs-12,12px/1.5 system-ui);color:var(--dsw-alias-label-secondary,#555);word-break:break-all;margin:0 12px 12px}',
    '.dse-error{color:var(--dsw-alias-state-error-primary,#d05)}',
    '.dse-bar{width:100%;height:6px;border-radius:999px;background:var(--dsw-alias-interactive-bg-hover,rgba(0,0,0,.06));overflow:hidden;margin:0 12px 8px}',
    '.dse-bar-fill{height:100%;background:var(--dsw-alias-state-business-primary,#4d6bfe);transition:width .15s ease}',
    '.dse-list{margin:0 12px 12px;padding-left:16px;font:var(--dsw-font-xxs-12,12px/1.6 system-ui);color:var(--dsw-alias-label-tertiary,#888)}',
    '.dse-menu{position:fixed;z-index:2147483000;min-width:140px;padding:4px;background:var(--dsw-alias-bg-layer-2,#fff);border:1px solid var(--dsw-alias-border-l1,rgba(128,128,128,.3));border-radius:10px;box-shadow:0 6px 24px rgba(0,0,0,.14)}',
    '.dse-menu-item{display:block;width:100%;height:30px;padding:0 10px;border:none;background:transparent;color:var(--dsw-alias-label-primary,#222);font:var(--dsw-font-s-14,14px/1.4 system-ui);text-align:left;cursor:pointer;border-radius:6px}',
    '.dse-menu-item:hover{background:var(--dsw-alias-interactive-bg-hover,rgba(0,0,0,.05))}',
    '.dse-menu-item.dse-danger{color:var(--dsw-alias-state-error-primary,#d05)}'
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

// ── File operations (host /sidebar-explorer/*) ────────────────────────────────

function apiJson(method: string, body: Record<string, unknown>): Promise<unknown> {
  return fetch(`/sidebar-explorer/${method}`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(body)
  }).then((res) => {
    return res.json().catch(() => null).then((data) => {
      if (!res.ok || data === null || data.ok !== true) {
        throw new Error(data?.error?.message ? String(data.error.message) : `HTTP ${res.status}`)
      }
      return data.value as unknown
    })
  })
}

function deleteOne(scope: SessionScope, path: string): Promise<unknown> {
  return apiJson('delete', { sessionId: scope.sessionId, ...(scope.cwd ? { cwd: scope.cwd } : {}), path })
}

function moveOne(scope: SessionScope, from: string, to: string): Promise<unknown> {
  return apiJson('move', { sessionId: scope.sessionId, ...(scope.cwd ? { cwd: scope.cwd } : {}), from, to })
}

function renameOne(scope: SessionScope, path: string, name: string): Promise<unknown> {
  return apiJson('rename', { sessionId: scope.sessionId, ...(scope.cwd ? { cwd: scope.cwd } : {}), path, name })
}

function mkdirOne(scope: SessionScope, path: string): Promise<unknown> {
  return apiJson('mkdir', { sessionId: scope.sessionId, ...(scope.cwd ? { cwd: scope.cwd } : {}), path })
}

// ── Drop collection (files + folders via webkitGetAsEntry) ─────────────────

interface DroppedFile {
  file: File
  relPath: string
}

function entryOf(item: DataTransferItem): FileSystemEntry | null {
  const getEntry = item.webkitGetAsEntry as (() => FileSystemEntry | null) | undefined
  return typeof getEntry === 'function' ? getEntry.call(item) : null
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
  return fetch(`/sidebar-explorer/upload?${params.toString()}`, {
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

const MOVE_TYPE = 'application/x-dsh-move'

function isMoveDrag(event: React.DragEvent): boolean {
  const types = event.dataTransfer?.types
  if (!types) return false
  return Array.prototype.indexOf.call(types, MOVE_TYPE) !== -1
}

function baseName(path: string): string {
  const trimmed = path.replace(/[\\/]+$/, '')
  const at = Math.max(trimmed.lastIndexOf('/'), trimmed.lastIndexOf('\\'))
  return at === -1 ? trimmed : trimmed.slice(at + 1)
}

function joinDir(dir: string, name: string): string {
  return dir.replace(/[\\/]+$/, '') + '/' + name
}

function folderIcon(): ReturnType<typeof createElement> {
  return createElement('svg', { viewBox: '0 0 24 24', width: 14, height: 14, fill: 'none', stroke: 'currentColor', strokeWidth: 2, strokeLinecap: 'round', strokeLinejoin: 'round', 'aria-hidden': 'true' },
    createElement('path', { d: 'M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z' })
  )
}

function fileIcon(): ReturnType<typeof createElement> {
  return createElement('svg', { viewBox: '0 0 24 24', width: 14, height: 14, fill: 'none', stroke: 'currentColor', strokeWidth: 2, strokeLinecap: 'round', strokeLinejoin: 'round', 'aria-hidden': 'true' },
    createElement('path', { d: 'M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z' }),
    createElement('polyline', { points: '14 2 14 8 20 8' })
  )
}

// ── Upload tab component ────────────────────────────────────────────────────

function UploadView(props: UploadTabProps): ReturnType<typeof createElement> {
  const scope = props.scope ?? { sessionId: '' }
  const sessionId = scope.sessionId
  const cwd = scope.cwd !== undefined && scope.cwd !== '' ? scope.cwd : undefined
  const onOpenFile = props.onOpenFile

  // Directory tree state.
  const [tree, setTree] = useState<Record<string, DirLevel>>({})
  const treeRef = useRef<Record<string, DirLevel>>({})
  const [expanded, setExpanded] = useState<string[]>([])
  const [selected, setSelected] = useState<string | null>(null)
  const [resolvedCwd, setResolvedCwd] = useState<string | null>(null)

  // Interaction state.
  const [menu, setMenu] = useState<{ path: string; name: string; isDir: boolean; x: number; y: number } | null>(null)
  const [dragMove, setDragMove] = useState<string | null>(null)
  const [dragOverDir, setDragOverDir] = useState<string | null>(null)
  const dragDepth = useRef(0)
  const [dragActive, setDragActive] = useState(false)

  // Upload state.
  const [busy, setBusy] = useState(false)
  const [progress, setProgress] = useState<{ done: number; total: number } | null>(null)
  const [result, setResult] = useState<{ uploaded: number; overwrote: number; failed: string[] } | null>(null)
  const [error, setError] = useState<string | null>(null)

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

  // Close the context menu on any outside click.
  useEffect(() => {
    if (menu === null) return
    const close = (): void => setMenu(null)
    document.addEventListener('click', close)
    document.addEventListener('contextmenu', close)
    return () => {
      document.removeEventListener('click', close)
      document.removeEventListener('contextmenu', close)
    }
  }, [menu])

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

  const reload = useCallback(() => {
    treeRef.current = {}
    setTree({})
    if (root === undefined) return
    loadDir(root)
    for (const dir of expanded) loadDir(dir)
  }, [root, expanded, loadDir])

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

  // ── Actions ───────────────────────────────────────────────────────────────

  const doDelete = useCallback((item: { path: string; name: string; isDir: boolean }) => {
    setMenu(null)
    const message = item.isDir
      ? label(`确定删除文件夹「${item.name}」及其全部内容？此操作不可恢复。`, `Delete folder "${item.name}" and everything inside? This cannot be undone.`)
      : label(`确定删除「${item.name}」？此操作不可恢复。`, `Delete "${item.name}"? This cannot be undone.`)
    if (!window.confirm(message)) return
    deleteOne(scope, item.path).then(() => {
      reload()
      if (selected === item.path) setSelected(null)
    }).catch((e: unknown) => {
      setError(e instanceof Error ? e.message : String(e))
    })
  }, [scope, reload, selected])

  const doRename = useCallback((item: { path: string; name: string }) => {
    setMenu(null)
    const next = window.prompt(label('重命名为', 'Rename to'), item.name)
    if (next === null || next === '' || next === item.name) return
    renameOne(scope, item.path, next).then(() => {
      reload()
    }).catch((e: unknown) => {
      setError(e instanceof Error ? e.message : String(e))
    })
  }, [scope, reload])

  const doMkdir = useCallback((parentDir: string) => {
    const next = window.prompt(label('文件夹名称', 'Folder name'))
    if (next === null || next === '') return
    mkdirOne(scope, joinDir(parentDir, next)).then(() => {
      setSelected(parentDir)
      if (!expanded.includes(parentDir)) setExpanded((prev) => [...prev, parentDir])
      reload()
    }).catch((e: unknown) => {
      setError(e instanceof Error ? e.message : String(e))
    })
  }, [scope, expanded, reload])

  // ── Drop (upload + move) ─────────────────────────────────────────────────

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
        reload()
      })
    }).catch((e: unknown) => {
      setBusy(false)
      setProgress(null)
      setError(e instanceof Error ? e.message : String(e))
    })
  }, [sessionId, scope, targetDir, busy, reload])

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

  // Internal move drag.
  const onRowDragStart = useCallback((event: React.DragEvent, path: string) => {
    event.dataTransfer.setData(MOVE_TYPE, path)
    event.dataTransfer.effectAllowed = 'move'
    setDragMove(path)
  }, [])

  const onRowDragEnd = useCallback(() => {
    setDragMove(null)
    setDragOverDir(null)
  }, [])

  const onDirDragOver = useCallback((event: React.DragEvent, dir: string) => {
    if (!isMoveDrag(event)) return
    event.preventDefault()
    event.stopPropagation()
    event.dataTransfer.dropEffect = 'move'
    setDragOverDir(dir)
  }, [])

  const onDirDrop = useCallback((event: React.DragEvent, dir: string) => {
    if (!isMoveDrag(event)) return
    event.preventDefault()
    event.stopPropagation()
    const from = event.dataTransfer.getData(MOVE_TYPE)
    setDragOverDir(null)
    setDragMove(null)
    if (from === '' || from === dir) return
    const to = joinDir(dir, baseName(from))
    if (to === from) return
    setError(null)
    moveOne(scope, from, to).then(() => {
      reload()
    }).catch((e: unknown) => {
      setError(e instanceof Error ? e.message : String(e))
    })
  }, [scope, reload])

  const openMenu = useCallback((event: React.MouseEvent, path: string, name: string, isDir: boolean) => {
    event.preventDefault()
    event.stopPropagation()
    setMenu({ path, name, isDir, x: event.clientX, y: event.clientY })
  }, [])

  const renderLevel = (dir: string, depth: number): ReturnType<typeof createElement>[] => {
    const level = tree[dir]
    if (level === undefined) {
      return [createElement('div', { key: `${dir}:loading`, className: 'dse-empty' }, label('加载中…', 'Loading…'))]
    }
    if (level.error !== undefined) {
      return [createElement('div', { key: `${dir}:error`, className: 'dse-empty dse-error' }, level.error)]
    }
    const entries = level.entries ?? []
    if (entries.length === 0) return []
    return entries.map((entry) => {
      const indent = { paddingLeft: `${depth * 18 + 6}px` }
      const draggable = { draggable: true, onDragStart: (event: React.DragEvent) => onRowDragStart(event, entry.path), onDragEnd: onRowDragEnd }
      if (entry.isDir) {
        const isOpen = expanded.includes(entry.path)
        const isSelected = selected === entry.path
        const isDrop = dragOverDir === entry.path
        const children = isOpen ? renderLevel(entry.path, depth + 1) : []
        return createElement('div', { key: entry.path },
          createElement('div', {
            className: 'dse-row' + (isSelected ? ' dse-selected' : '') + (isDrop ? ' dse-drop' : ''),
            style: indent,
            ...draggable,
            onDragOver: (event: React.DragEvent) => onDirDragOver(event, entry.path),
            onDrop: (event: React.DragEvent) => onDirDrop(event, entry.path),
            onContextMenu: (event: React.MouseEvent) => openMenu(event, entry.path, entry.name, true)
          },
            createElement('button', {
              className: 'dse-chevron',
              type: 'button',
              onClick: (event: React.MouseEvent) => { event.stopPropagation(); toggleExpand(entry.path) }
            }, isOpen ? '▾' : '▸'),
            folderIcon(),
            createElement('button', {
              className: 'dse-name',
              type: 'button',
              title: entry.path,
              onClick: () => setSelected(entry.path)
            }, entry.name)
          ),
          ...children
        )
      }
      return createElement('div', {
        key: entry.path,
        className: 'dse-row dse-file' + (entry.hidden ? ' dse-hidden' : ''),
        style: indent,
        ...draggable,
        onContextMenu: (event: React.MouseEvent) => openMenu(event, entry.path, entry.name, false)
      },
        fileIcon(),
        createElement('button', {
          className: 'dse-name',
          type: 'button',
          title: entry.path,
          onClick: onOpenFile !== undefined ? () => onOpenFile(entry.path) : undefined
        }, entry.name)
      )
    })
  }

  if (sessionId === '') {
    return createElement('div', { className: 'dse-root' },
      createElement('div', { className: 'dse-empty' }, label('选择一个会话以使用文件管理', 'Select a conversation to manage files'))
    )
  }

  const children: ReturnType<typeof createElement>[] = []

  if (targetDir !== undefined) {
    children.push(createElement('div', { className: 'dse-head' },
      `${label('上传目标：', 'Upload target: ')}${targetDir}`
    ))
  }

  children.push(createElement('div', { className: 'dse-toolbar' },
    createElement('button', {
      className: 'dse-newbtn',
      type: 'button',
      disabled: targetDir === undefined,
      onClick: () => targetDir !== undefined && doMkdir(targetDir)
    }, `+ ${label('新建文件夹', 'New folder')}`)
  ))

  // Root row (always expanded, selectable, a move drop target).
  if (root !== undefined) {
    const isRootSelected = selected === root
    const isRootDrop = dragOverDir === root
    children.push(createElement('div', { className: 'dse-tree' },
      createElement('div', {
        className: 'dse-row' + (isRootSelected ? ' dse-selected' : '') + (isRootDrop ? ' dse-drop' : ''),
        style: { paddingLeft: '6px' },
        onDragOver: (event: React.DragEvent) => onDirDragOver(event, root),
        onDrop: (event: React.DragEvent) => onDirDrop(event, root),
        onContextMenu: (event: React.MouseEvent) => openMenu(event, root, baseName(root), true)
      },
        folderIcon(),
        createElement('button', { className: 'dse-name', type: 'button', title: root, onClick: () => setSelected(root) }, baseName(root))
      ),
      ...renderLevel(root, 1)
    ))
  }

  children.push(createElement('div', {
    className: 'dse-zone' + (dragActive ? ' dse-active' : ''),
    onDragOver,
    onDragEnter,
    onDragLeave,
    onDrop: handleDrop
  },
    createElement('svg', { className: 'dse-icon', viewBox: '0 0 24 24', fill: 'none', stroke: 'currentColor', strokeWidth: 2, strokeLinecap: 'round', strokeLinejoin: 'round', 'aria-hidden': 'true' },
      createElement('path', { d: 'M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4' }),
      createElement('polyline', { points: '17 8 12 3 7 8' }),
      createElement('line', { x1: '12', y1: '3', x2: '12', y2: '15' })
    ),
    createElement('div', { className: 'dse-title' }, label('将文件或文件夹拖到此处上传', 'Drop files or folders here to upload')),
    createElement('div', { className: 'dse-sub' }, label('拖到上方文件夹可移动；右键可重命名 / 删除', 'Drag onto a folder to move; right-click to rename / delete'))
  ))

  if (busy && progress) {
    const percent = progress.total === 0 ? 0 : Math.round((progress.done / progress.total) * 100)
    children.push(createElement('div', { className: 'dse-bar' },
      createElement('div', { className: 'dse-bar-fill', style: { width: `${percent}%` } })
    ))
    children.push(createElement('p', { className: 'dse-status' },
      `${label('正在上传… ', 'Uploading… ')}${progress.done} / ${progress.total}`
    ))
  }

  if (result) {
    let line = `${label('上传完成：新增 ', 'Uploaded: ')}${result.uploaded}${label('，覆盖 ', ', overwrote ')}${result.overwrote}`
    if (result.failed.length > 0) line += label(`，失败 ${result.failed.length}`, `, failed ${result.failed.length}`)
    children.push(createElement('p', { className: 'dse-status' }, line))
    if (result.failed.length > 0) {
      const items = result.failed.slice(0, 20).map((name) => createElement('li', { key: name }, name))
      children.push(createElement('ul', { className: 'dse-list' }, items))
    }
  }

  if (error) {
    children.push(createElement('p', { className: 'dse-status dse-error' }, error))
  }

  // Context menu.
  if (menu !== null) {
    const menuItems: ReturnType<typeof createElement>[] = []
    if (menu.isDir) {
      menuItems.push(createElement('button', {
        key: 'mkdir',
        className: 'dse-menu-item',
        type: 'button',
        onClick: () => doMkdir(menu.path)
      }, label('新建文件夹', 'New folder')))
    }
    menuItems.push(createElement('button', {
      key: 'rename',
      className: 'dse-menu-item',
      type: 'button',
      onClick: () => doRename(menu)
    }, label('重命名', 'Rename')))
    menuItems.push(createElement('button', {
      key: 'delete',
      className: 'dse-menu-item dse-danger',
      type: 'button',
      onClick: () => doDelete(menu)
    }, label('删除', 'Delete')))
    children.push(createElement('div', {
      key: 'menu',
      className: 'dse-menu',
      style: { left: `${menu.x}px`, top: `${menu.y}px` }
    }, menuItems))
  }

  return createElement('div', { className: 'dse-root' }, children)
}

// ── Client plugin registration ──────────────────────────────────────────────

export const inject = ['betterSidebar']

export function apply(ctx: UploadClientContext): void {
  ctx.effect(() => ctx.betterSidebar.registerTab({
    id: 'sidebar-explorer',
    title: () => label('文件', 'Files'),
    icon: (size: number) => createElement('svg', { viewBox: '0 0 24 24', width: size, height: size, fill: 'none', stroke: 'currentColor', strokeWidth: 2, strokeLinecap: 'round', strokeLinejoin: 'round', 'aria-hidden': 'true' },
      createElement('path', { d: 'M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z' })
    ),
    order: 60,
    single: true,
    component: (props) => {
      const scope = props.scope ?? { sessionId: '' }
      const openFile = ctx.betterSidebar.openFile
      return createElement(UploadView, {
        scope,
        visible: props.visible,
        onOpenFile: typeof openFile === 'function' && props.scope !== undefined
          ? (path: string) => openFile(props.scope as SessionScope, path)
          : undefined
      })
    }
  }), 'dsh-sidebar-explorer-plus: register file-manager tab')
}
