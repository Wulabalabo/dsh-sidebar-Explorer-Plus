window.__ModuleLoader__.load({
  id: "dsh-sidebar-upload",
  factory: (require) => {
    var module = { exports: {} };
    var exports = module.exports;
    Object.defineProperty(exports, Symbol.toStringTag, { value: "Module" });
"use strict";
var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __export = (target, all) => {
  for (var name in all)
    __defProp(target, name, { get: all[name], enumerable: true });
};
var __copyProps = (to, from, except, desc) => {
  if (from && typeof from === "object" || typeof from === "function") {
    for (let key of __getOwnPropNames(from))
      if (!__hasOwnProp.call(to, key) && key !== except)
        __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
  }
  return to;
};
var __toCommonJS = (mod) => __copyProps(__defProp({}, "__esModule", { value: true }), mod);

// src/client/index.tsx
var index_exports = {};
__export(index_exports, {
  apply: () => apply,
  inject: () => inject
});
module.exports = __toCommonJS(index_exports);
var import_react = require("react");
function isZh() {
  try {
    return typeof navigator !== "undefined" && (navigator.language || "").toLowerCase().startsWith("zh");
  } catch {
    return false;
  }
}
function label(zh, en) {
  return isZh() ? zh : en;
}
var STYLE_ID = "dsh-sidebar-upload-style";
function ensureStyle() {
  if (document.getElementById(STYLE_ID)) return;
  const css = [
    ".dsu-root{display:flex;flex-direction:column;height:100%;min-height:0;box-sizing:border-box;overflow-y:auto}",
    ".dsu-head{padding:12px 12px 6px;font:var(--dsw-font-xxs-12,12px/1.5 system-ui);color:var(--dsw-alias-label-tertiary,#888);word-break:break-all}",
    ".dsu-toolbar{display:flex;align-items:center;gap:8px;padding:4px 12px}",
    ".dsu-newbtn{height:26px;padding:0 10px;border:1px solid var(--dsw-alias-border-l1,rgba(128,128,128,.4));border-radius:999px;background:var(--dsw-alias-bg-layer-2,#fff);color:var(--dsw-alias-label-primary,#222);font:var(--dsw-font-xxs-12,12px/1.4 system-ui);cursor:pointer}",
    ".dsu-newbtn:hover{background:var(--dsw-alias-interactive-bg-hover,rgba(0,0,0,.05))}",
    ".dsu-tree{flex:1;min-height:0;overflow-y:auto;padding:0 6px 8px}",
    ".dsu-row{display:flex;align-items:center;gap:4px;height:30px;border-radius:8px;padding:0 6px;cursor:pointer;color:var(--dsw-alias-label-primary,#222);font:var(--dsw-font-s-14,14px/1.4 system-ui);box-sizing:border-box}",
    ".dsu-row:hover{background:var(--dsw-alias-interactive-bg-hover,rgba(0,0,0,.05))}",
    ".dsu-row.dsu-selected{background:var(--dsw-alias-state-business-tertiary,rgba(77,107,254,.1));color:var(--dsw-alias-state-business-primary,#4d6bfe)}",
    ".dsu-row.dsu-drop{outline:1.5px solid var(--dsw-alias-state-business-primary,#4d6bfe);outline-offset:-1.5px;background:var(--dsw-alias-state-business-tertiary,rgba(77,107,254,.1))}",
    ".dsu-chevron{flex:none;width:18px;height:18px;border:none;background:transparent;color:var(--dsw-alias-label-tertiary,#888);cursor:pointer;padding:0;font-size:11px;line-height:18px;text-align:center}",
    ".dsu-name{flex:1;min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;border:none;background:transparent;color:inherit;cursor:pointer;padding:0;text-align:left;font:inherit}",
    ".dsu-file .dsu-name{color:var(--dsw-alias-label-secondary,#555)}",
    ".dsu-hidden{opacity:.5}",
    ".dsu-empty{padding:16px;font:var(--dsw-font-xxs-12,12px/1.5 system-ui);color:var(--dsw-alias-label-tertiary,#888);text-align:center}",
    ".dsu-zone{margin:6px 12px 12px;border:1.5px dashed var(--dsw-alias-border-l1,rgba(128,128,128,.5));border-radius:12px;padding:20px;text-align:center;transition:border-color .12s ease,background .12s ease}",
    ".dsu-zone.dsu-active{border-color:var(--dsw-alias-state-business-primary,#4d6bfe);background:var(--dsw-alias-state-business-tertiary,rgba(77,107,254,.08))}",
    ".dsu-icon{display:block;width:32px;height:32px;margin:0 auto 8px;color:var(--dsw-alias-label-tertiary,#888)}",
    ".dsu-zone.dsu-active .dsu-icon{color:var(--dsw-alias-state-business-primary,#4d6bfe)}",
    ".dsu-title{font:var(--dsw-font-s-strong-14,600 14px/1.4 system-ui);color:var(--dsw-alias-label-primary,#222)}",
    ".dsu-sub{font:var(--dsw-font-xxs-12,12px/1.5 system-ui);color:var(--dsw-alias-label-tertiary,#888)}",
    ".dsu-status{font:var(--dsw-font-xxs-12,12px/1.5 system-ui);color:var(--dsw-alias-label-secondary,#555);word-break:break-all;margin:0 12px 12px}",
    ".dsu-error{color:var(--dsw-alias-state-error-primary,#d05)}",
    ".dsu-bar{width:100%;height:6px;border-radius:999px;background:var(--dsw-alias-interactive-bg-hover,rgba(0,0,0,.06));overflow:hidden;margin:0 12px 8px}",
    ".dsu-bar-fill{height:100%;background:var(--dsw-alias-state-business-primary,#4d6bfe);transition:width .15s ease}",
    ".dsu-list{margin:0 12px 12px;padding-left:16px;font:var(--dsw-font-xxs-12,12px/1.6 system-ui);color:var(--dsw-alias-label-tertiary,#888)}",
    ".dsu-menu{position:fixed;z-index:2147483000;min-width:140px;padding:4px;background:var(--dsw-alias-bg-layer-2,#fff);border:1px solid var(--dsw-alias-border-l1,rgba(128,128,128,.3));border-radius:10px;box-shadow:0 6px 24px rgba(0,0,0,.14)}",
    ".dsu-menu-item{display:block;width:100%;height:30px;padding:0 10px;border:none;background:transparent;color:var(--dsw-alias-label-primary,#222);font:var(--dsw-font-s-14,14px/1.4 system-ui);text-align:left;cursor:pointer;border-radius:6px}",
    ".dsu-menu-item:hover{background:var(--dsw-alias-interactive-bg-hover,rgba(0,0,0,.05))}",
    ".dsu-menu-item.dsu-danger{color:var(--dsw-alias-state-error-primary,#d05)}"
  ].join("\n");
  const style = document.createElement("style");
  style.id = STYLE_ID;
  style.textContent = css;
  document.head.appendChild(style);
}
function fsTree(scope, path) {
  return fetch("/sidebar/api/fs.tree", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ sessionId: scope.sessionId, ...scope.cwd ? { cwd: scope.cwd } : {}, path })
  }).then((res) => {
    return res.json().catch(() => null).then((data) => {
      if (!res.ok || data === null || data.ok !== true) {
        throw new Error(data?.error?.message ? String(data.error.message) : `HTTP ${res.status}`);
      }
      return data.value;
    });
  });
}
function apiJson(method, body) {
  return fetch(`/sidebar-upload/${method}`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body)
  }).then((res) => {
    return res.json().catch(() => null).then((data) => {
      if (!res.ok || data === null || data.ok !== true) {
        throw new Error(data?.error?.message ? String(data.error.message) : `HTTP ${res.status}`);
      }
      return data.value;
    });
  });
}
function deleteOne(scope, path) {
  return apiJson("delete", { sessionId: scope.sessionId, ...scope.cwd ? { cwd: scope.cwd } : {}, path });
}
function moveOne(scope, from, to) {
  return apiJson("move", { sessionId: scope.sessionId, ...scope.cwd ? { cwd: scope.cwd } : {}, from, to });
}
function renameOne(scope, path, name) {
  return apiJson("rename", { sessionId: scope.sessionId, ...scope.cwd ? { cwd: scope.cwd } : {}, path, name });
}
function mkdirOne(scope, path) {
  return apiJson("mkdir", { sessionId: scope.sessionId, ...scope.cwd ? { cwd: scope.cwd } : {}, path });
}
function entryOf(item) {
  const getEntry = item.webkitGetAsEntry;
  return typeof getEntry === "function" ? getEntry() : null;
}
function fileOf(entry) {
  return new Promise((resolve, reject) => {
    entry.file(resolve, reject);
  });
}
function readAllEntries(reader) {
  return new Promise((resolve, reject) => {
    const all = [];
    const readBatch = () => {
      reader.readEntries((batch) => {
        if (batch.length === 0) resolve(all);
        else {
          all.push(...batch);
          readBatch();
        }
      }, reject);
    };
    readBatch();
  });
}
function walk(entry, relPath, out) {
  if (entry.isFile) {
    return fileOf(entry).then((file) => {
      out.push({ file, relPath });
    });
  }
  if (entry.isDirectory) {
    return readAllEntries(entry.createReader()).then((children) => {
      return children.reduce((p, child) => {
        return p.then(() => walk(child, `${relPath}/${child.name}`, out));
      }, Promise.resolve());
    });
  }
  return Promise.resolve();
}
function collectDroppedFiles(dataTransfer) {
  const items = [];
  for (let i = 0; i < dataTransfer.items.length; i++) items.push(dataTransfer.items[i]);
  const entries = items.map(entryOf).filter((entry) => entry !== null);
  if (entries.length > 0) {
    const out = [];
    return entries.reduce((p, entry) => {
      return p.then(() => walk(entry, entry.name, out));
    }, Promise.resolve()).then(() => out);
  }
  const files = [];
  for (let i = 0; i < dataTransfer.files.length; i++) files.push(dataTransfer.files[i]);
  return Promise.resolve(files.map((file) => {
    const rel = file.webkitRelativePath || "";
    return { file, relPath: rel !== "" ? rel : file.name };
  }));
}
function uploadOne(scope, dir, relPath, file) {
  const params = new URLSearchParams({ sessionId: scope.sessionId, name: relPath, dir });
  if (scope.cwd) params.set("cwd", scope.cwd);
  return fetch(`/sidebar-upload/upload?${params.toString()}`, {
    method: "POST",
    headers: { "content-type": "application/octet-stream" },
    body: file
  }).then((res) => {
    return res.json().catch(() => null).then((data) => {
      if (!res.ok || data === null || data.ok !== true) {
        const message = data?.error?.message ? String(data.error.message) : `HTTP ${res.status}`;
        throw new Error(message);
      }
      return data.value;
    });
  });
}
function hasFiles(event) {
  const types = event.dataTransfer?.types;
  if (!types) return false;
  return Array.prototype.indexOf.call(types, "Files") !== -1;
}
var MOVE_TYPE = "application/x-dsh-move";
function isMoveDrag(event) {
  const types = event.dataTransfer?.types;
  if (!types) return false;
  return Array.prototype.indexOf.call(types, MOVE_TYPE) !== -1;
}
function baseName(path) {
  const trimmed = path.replace(/[\\/]+$/, "");
  const at = Math.max(trimmed.lastIndexOf("/"), trimmed.lastIndexOf("\\"));
  return at === -1 ? trimmed : trimmed.slice(at + 1);
}
function joinDir(dir, name) {
  return dir.replace(/[\\/]+$/, "") + "/" + name;
}
function folderIcon() {
  return (0, import_react.createElement)(
    "svg",
    { viewBox: "0 0 24 24", width: 14, height: 14, fill: "none", stroke: "currentColor", strokeWidth: 2, strokeLinecap: "round", strokeLinejoin: "round", "aria-hidden": "true" },
    (0, import_react.createElement)("path", { d: "M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z" })
  );
}
function fileIcon() {
  return (0, import_react.createElement)(
    "svg",
    { viewBox: "0 0 24 24", width: 14, height: 14, fill: "none", stroke: "currentColor", strokeWidth: 2, strokeLinecap: "round", strokeLinejoin: "round", "aria-hidden": "true" },
    (0, import_react.createElement)("path", { d: "M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" }),
    (0, import_react.createElement)("polyline", { points: "14 2 14 8 20 8" })
  );
}
function UploadView(props) {
  const scope = props.scope ?? { sessionId: "" };
  const sessionId = scope.sessionId;
  const cwd = scope.cwd !== void 0 && scope.cwd !== "" ? scope.cwd : void 0;
  const onOpenFile = props.onOpenFile;
  const [tree, setTree] = (0, import_react.useState)({});
  const treeRef = (0, import_react.useRef)({});
  const [expanded, setExpanded] = (0, import_react.useState)([]);
  const [selected, setSelected] = (0, import_react.useState)(null);
  const [resolvedCwd, setResolvedCwd] = (0, import_react.useState)(null);
  const [menu, setMenu] = (0, import_react.useState)(null);
  const [dragMove, setDragMove] = (0, import_react.useState)(null);
  const [dragOverDir, setDragOverDir] = (0, import_react.useState)(null);
  const dragDepth = (0, import_react.useRef)(0);
  const [dragActive, setDragActive] = (0, import_react.useState)(false);
  const [busy, setBusy] = (0, import_react.useState)(false);
  const [progress, setProgress] = (0, import_react.useState)(null);
  const [result, setResult] = (0, import_react.useState)(null);
  const [error, setError] = (0, import_react.useState)(null);
  (0, import_react.useEffect)(() => {
    ensureStyle();
  }, []);
  (0, import_react.useEffect)(() => {
    if (sessionId === "" || cwd !== void 0) return;
    let cancelled = false;
    fetch("/sidebar/api/session.cwd", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ sessionId })
    }).then((r) => r.json()).then((d) => {
      if (!cancelled && d && d.ok && d.value && d.value.cwd) setResolvedCwd(String(d.value.cwd));
    }).catch(() => {
    });
    return () => {
      cancelled = true;
    };
  }, [sessionId, cwd]);
  (0, import_react.useEffect)(() => {
    if (menu === null) return;
    const close = () => setMenu(null);
    document.addEventListener("click", close);
    document.addEventListener("contextmenu", close);
    return () => {
      document.removeEventListener("click", close);
      document.removeEventListener("contextmenu", close);
    };
  }, [menu]);
  const root = cwd ?? resolvedCwd ?? void 0;
  const setTreeLevel = (0, import_react.useCallback)((dir, level) => {
    treeRef.current = { ...treeRef.current, [dir]: level };
    setTree(treeRef.current);
  }, []);
  const loadDir = (0, import_react.useCallback)((dir) => {
    if (treeRef.current[dir] !== void 0) return;
    setTreeLevel(dir, {});
    fsTree(scope, dir).then((listing) => {
      setTreeLevel(dir, { entries: listing.entries });
    }).catch((e) => {
      setTreeLevel(dir, { error: e instanceof Error ? e.message : String(e) });
    });
  }, [scope, setTreeLevel]);
  const reload = (0, import_react.useCallback)(() => {
    treeRef.current = {};
    setTree({});
    if (root === void 0) return;
    loadDir(root);
    for (const dir of expanded) loadDir(dir);
  }, [root, expanded, loadDir]);
  (0, import_react.useEffect)(() => {
    if (root === void 0) return;
    loadDir(root);
    for (const dir of expanded) loadDir(dir);
    if (selected === null) setSelected(root);
  }, [root, expanded, loadDir, selected]);
  const toggleExpand = (0, import_react.useCallback)((dir) => {
    setExpanded((prev) => prev.includes(dir) ? prev.filter((d) => d !== dir) : [...prev, dir]);
    loadDir(dir);
  }, [loadDir]);
  const targetDir = selected ?? root;
  const doDelete = (0, import_react.useCallback)((item) => {
    setMenu(null);
    const message = item.isDir ? label(`\u786E\u5B9A\u5220\u9664\u6587\u4EF6\u5939\u300C${item.name}\u300D\u53CA\u5176\u5168\u90E8\u5185\u5BB9\uFF1F\u6B64\u64CD\u4F5C\u4E0D\u53EF\u6062\u590D\u3002`, `Delete folder "${item.name}" and everything inside? This cannot be undone.`) : label(`\u786E\u5B9A\u5220\u9664\u300C${item.name}\u300D\uFF1F\u6B64\u64CD\u4F5C\u4E0D\u53EF\u6062\u590D\u3002`, `Delete "${item.name}"? This cannot be undone.`);
    if (!window.confirm(message)) return;
    deleteOne(scope, item.path).then(() => {
      reload();
      if (selected === item.path) setSelected(null);
    }).catch((e) => {
      setError(e instanceof Error ? e.message : String(e));
    });
  }, [scope, reload, selected]);
  const doRename = (0, import_react.useCallback)((item) => {
    setMenu(null);
    const next = window.prompt(label("\u91CD\u547D\u540D\u4E3A", "Rename to"), item.name);
    if (next === null || next === "" || next === item.name) return;
    renameOne(scope, item.path, next).then(() => {
      reload();
    }).catch((e) => {
      setError(e instanceof Error ? e.message : String(e));
    });
  }, [scope, reload]);
  const doMkdir = (0, import_react.useCallback)((parentDir) => {
    const next = window.prompt(label("\u6587\u4EF6\u5939\u540D\u79F0", "Folder name"));
    if (next === null || next === "") return;
    mkdirOne(scope, joinDir(parentDir, next)).then(() => {
      setSelected(parentDir);
      if (!expanded.includes(parentDir)) setExpanded((prev) => [...prev, parentDir]);
      reload();
    }).catch((e) => {
      setError(e instanceof Error ? e.message : String(e));
    });
  }, [scope, expanded, reload]);
  const handleDrop = (0, import_react.useCallback)((event) => {
    if (!hasFiles(event)) return;
    event.preventDefault();
    event.stopPropagation();
    dragDepth.current = 0;
    setDragActive(false);
    if (sessionId === "" || busy || targetDir === void 0) return;
    const dataTransfer = event.dataTransfer;
    if (!dataTransfer) return;
    collectDroppedFiles(dataTransfer).then((files) => {
      if (files.length === 0) return;
      setBusy(true);
      setProgress({ done: 0, total: files.length });
      setResult(null);
      setError(null);
      let uploaded = 0;
      let overwrote = 0;
      const failed = [];
      let index = 0;
      const run = () => {
        if (index >= files.length) return Promise.resolve();
        const i = index++;
        const item = files[i];
        return uploadOne(scope, targetDir, item.relPath, item.file).then((value) => {
          uploaded += 1;
          if (value.overwrote) overwrote += 1;
          setProgress({ done: index, total: files.length });
        }, (e) => {
          failed.push(`${item.relPath} (${e instanceof Error ? e.message : "error"})`);
          setProgress({ done: index, total: files.length });
        }).then(run);
      };
      const CONCURRENCY = 4;
      const workers = [];
      for (let w = 0; w < Math.min(CONCURRENCY, files.length); w++) workers.push(run());
      return Promise.all(workers).then(() => {
        setBusy(false);
        setProgress(null);
        setResult({ uploaded, overwrote, failed });
        reload();
      });
    }).catch((e) => {
      setBusy(false);
      setProgress(null);
      setError(e instanceof Error ? e.message : String(e));
    });
  }, [sessionId, scope, targetDir, busy, reload]);
  const onDragOver = (0, import_react.useCallback)((event) => {
    if (!hasFiles(event)) return;
    event.preventDefault();
    event.stopPropagation();
    if (event.dataTransfer) event.dataTransfer.dropEffect = "copy";
    if (dragDepth.current === 0) setDragActive(true);
  }, []);
  const onDragEnter = (0, import_react.useCallback)((event) => {
    if (!hasFiles(event)) return;
    event.preventDefault();
    event.stopPropagation();
    dragDepth.current += 1;
    setDragActive(true);
  }, []);
  const onDragLeave = (0, import_react.useCallback)((event) => {
    if (!hasFiles(event)) return;
    event.stopPropagation();
    dragDepth.current = Math.max(0, dragDepth.current - 1);
    if (dragDepth.current === 0) setDragActive(false);
  }, []);
  const onRowDragStart = (0, import_react.useCallback)((event, path) => {
    event.dataTransfer.setData(MOVE_TYPE, path);
    event.dataTransfer.effectAllowed = "move";
    setDragMove(path);
  }, []);
  const onRowDragEnd = (0, import_react.useCallback)(() => {
    setDragMove(null);
    setDragOverDir(null);
  }, []);
  const onDirDragOver = (0, import_react.useCallback)((event, dir) => {
    if (!isMoveDrag(event)) return;
    event.preventDefault();
    event.stopPropagation();
    event.dataTransfer.dropEffect = "move";
    setDragOverDir(dir);
  }, []);
  const onDirDrop = (0, import_react.useCallback)((event, dir) => {
    if (!isMoveDrag(event)) return;
    event.preventDefault();
    event.stopPropagation();
    const from = event.dataTransfer.getData(MOVE_TYPE);
    setDragOverDir(null);
    setDragMove(null);
    if (from === "" || from === dir) return;
    const to = joinDir(dir, baseName(from));
    if (to === from) return;
    setError(null);
    moveOne(scope, from, to).then(() => {
      reload();
    }).catch((e) => {
      setError(e instanceof Error ? e.message : String(e));
    });
  }, [scope, reload]);
  const openMenu = (0, import_react.useCallback)((event, path, name, isDir) => {
    event.preventDefault();
    event.stopPropagation();
    setMenu({ path, name, isDir, x: event.clientX, y: event.clientY });
  }, []);
  const renderLevel = (dir, depth) => {
    const level = tree[dir];
    if (level === void 0) {
      return [(0, import_react.createElement)("div", { key: `${dir}:loading`, className: "dsu-empty" }, label("\u52A0\u8F7D\u4E2D\u2026", "Loading\u2026"))];
    }
    if (level.error !== void 0) {
      return [(0, import_react.createElement)("div", { key: `${dir}:error`, className: "dsu-empty dsu-error" }, level.error)];
    }
    const entries = level.entries ?? [];
    if (entries.length === 0) return [];
    return entries.map((entry) => {
      const indent = { paddingLeft: `${depth * 18 + 6}px` };
      const draggable = { draggable: true, onDragStart: (event) => onRowDragStart(event, entry.path), onDragEnd: onRowDragEnd };
      if (entry.isDir) {
        const isOpen = expanded.includes(entry.path);
        const isSelected = selected === entry.path;
        const isDrop = dragOverDir === entry.path;
        const children2 = isOpen ? renderLevel(entry.path, depth + 1) : [];
        return (0, import_react.createElement)(
          "div",
          { key: entry.path },
          (0, import_react.createElement)(
            "div",
            {
              className: "dsu-row" + (isSelected ? " dsu-selected" : "") + (isDrop ? " dsu-drop" : ""),
              style: indent,
              ...draggable,
              onDragOver: (event) => onDirDragOver(event, entry.path),
              onDrop: (event) => onDirDrop(event, entry.path),
              onContextMenu: (event) => openMenu(event, entry.path, entry.name, true)
            },
            (0, import_react.createElement)("button", {
              className: "dsu-chevron",
              type: "button",
              onClick: (event) => {
                event.stopPropagation();
                toggleExpand(entry.path);
              }
            }, isOpen ? "\u25BE" : "\u25B8"),
            folderIcon(),
            (0, import_react.createElement)("button", {
              className: "dsu-name",
              type: "button",
              title: entry.path,
              onClick: () => setSelected(entry.path)
            }, entry.name)
          ),
          ...children2
        );
      }
      return (0, import_react.createElement)(
        "div",
        {
          key: entry.path,
          className: "dsu-row dsu-file" + (entry.hidden ? " dsu-hidden" : ""),
          style: indent,
          ...draggable,
          onContextMenu: (event) => openMenu(event, entry.path, entry.name, false)
        },
        fileIcon(),
        (0, import_react.createElement)("button", {
          className: "dsu-name",
          type: "button",
          title: entry.path,
          onClick: onOpenFile !== void 0 ? () => onOpenFile(entry.path) : void 0
        }, entry.name)
      );
    });
  };
  if (sessionId === "") {
    return (0, import_react.createElement)(
      "div",
      { className: "dsu-root" },
      (0, import_react.createElement)("div", { className: "dsu-empty" }, label("\u9009\u62E9\u4E00\u4E2A\u4F1A\u8BDD\u4EE5\u4F7F\u7528\u6587\u4EF6\u7BA1\u7406", "Select a conversation to manage files"))
    );
  }
  const children = [];
  if (targetDir !== void 0) {
    children.push((0, import_react.createElement)(
      "div",
      { className: "dsu-head" },
      `${label("\u4E0A\u4F20\u76EE\u6807\uFF1A", "Upload target: ")}${targetDir}`
    ));
  }
  children.push((0, import_react.createElement)(
    "div",
    { className: "dsu-toolbar" },
    (0, import_react.createElement)("button", {
      className: "dsu-newbtn",
      type: "button",
      disabled: targetDir === void 0,
      onClick: () => targetDir !== void 0 && doMkdir(targetDir)
    }, `+ ${label("\u65B0\u5EFA\u6587\u4EF6\u5939", "New folder")}`)
  ));
  if (root !== void 0) {
    const isRootSelected = selected === root;
    const isRootDrop = dragOverDir === root;
    children.push((0, import_react.createElement)(
      "div",
      { className: "dsu-tree" },
      (0, import_react.createElement)(
        "div",
        {
          className: "dsu-row" + (isRootSelected ? " dsu-selected" : "") + (isRootDrop ? " dsu-drop" : ""),
          style: { paddingLeft: "6px" },
          onDragOver: (event) => onDirDragOver(event, root),
          onDrop: (event) => onDirDrop(event, root),
          onContextMenu: (event) => openMenu(event, root, baseName(root), true)
        },
        folderIcon(),
        (0, import_react.createElement)("button", { className: "dsu-name", type: "button", title: root, onClick: () => setSelected(root) }, baseName(root))
      ),
      ...renderLevel(root, 1)
    ));
  }
  children.push((0, import_react.createElement)(
    "div",
    {
      className: "dsu-zone" + (dragActive ? " dsu-active" : ""),
      onDragOver,
      onDragEnter,
      onDragLeave,
      onDrop: handleDrop
    },
    (0, import_react.createElement)(
      "svg",
      { className: "dsu-icon", viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: 2, strokeLinecap: "round", strokeLinejoin: "round", "aria-hidden": "true" },
      (0, import_react.createElement)("path", { d: "M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" }),
      (0, import_react.createElement)("polyline", { points: "17 8 12 3 7 8" }),
      (0, import_react.createElement)("line", { x1: "12", y1: "3", x2: "12", y2: "15" })
    ),
    (0, import_react.createElement)("div", { className: "dsu-title" }, label("\u5C06\u6587\u4EF6\u6216\u6587\u4EF6\u5939\u62D6\u5230\u6B64\u5904\u4E0A\u4F20", "Drop files or folders here to upload")),
    (0, import_react.createElement)("div", { className: "dsu-sub" }, label("\u62D6\u5230\u4E0A\u65B9\u6587\u4EF6\u5939\u53EF\u79FB\u52A8\uFF1B\u53F3\u952E\u53EF\u91CD\u547D\u540D / \u5220\u9664", "Drag onto a folder to move; right-click to rename / delete"))
  ));
  if (busy && progress) {
    const percent = progress.total === 0 ? 0 : Math.round(progress.done / progress.total * 100);
    children.push((0, import_react.createElement)(
      "div",
      { className: "dsu-bar" },
      (0, import_react.createElement)("div", { className: "dsu-bar-fill", style: { width: `${percent}%` } })
    ));
    children.push((0, import_react.createElement)(
      "p",
      { className: "dsu-status" },
      `${label("\u6B63\u5728\u4E0A\u4F20\u2026 ", "Uploading\u2026 ")}${progress.done} / ${progress.total}`
    ));
  }
  if (result) {
    let line = `${label("\u4E0A\u4F20\u5B8C\u6210\uFF1A\u65B0\u589E ", "Uploaded: ")}${result.uploaded}${label("\uFF0C\u8986\u76D6 ", ", overwrote ")}${result.overwrote}`;
    if (result.failed.length > 0) line += label(`\uFF0C\u5931\u8D25 ${result.failed.length}`, `, failed ${result.failed.length}`);
    children.push((0, import_react.createElement)("p", { className: "dsu-status" }, line));
    if (result.failed.length > 0) {
      const items = result.failed.slice(0, 20).map((name) => (0, import_react.createElement)("li", { key: name }, name));
      children.push((0, import_react.createElement)("ul", { className: "dsu-list" }, items));
    }
  }
  if (error) {
    children.push((0, import_react.createElement)("p", { className: "dsu-status dsu-error" }, error));
  }
  if (menu !== null) {
    const menuItems = [];
    if (menu.isDir) {
      menuItems.push((0, import_react.createElement)("button", {
        key: "mkdir",
        className: "dsu-menu-item",
        type: "button",
        onClick: () => doMkdir(menu.path)
      }, label("\u65B0\u5EFA\u6587\u4EF6\u5939", "New folder")));
    }
    menuItems.push((0, import_react.createElement)("button", {
      key: "rename",
      className: "dsu-menu-item",
      type: "button",
      onClick: () => doRename(menu)
    }, label("\u91CD\u547D\u540D", "Rename")));
    menuItems.push((0, import_react.createElement)("button", {
      key: "delete",
      className: "dsu-menu-item dsu-danger",
      type: "button",
      onClick: () => doDelete(menu)
    }, label("\u5220\u9664", "Delete")));
    children.push((0, import_react.createElement)("div", {
      key: "menu",
      className: "dsu-menu",
      style: { left: `${menu.x}px`, top: `${menu.y}px` }
    }, menuItems));
  }
  return (0, import_react.createElement)("div", { className: "dsu-root" }, children);
}
var inject = ["betterSidebar"];
function apply(ctx) {
  ctx.effect(() => ctx.betterSidebar.registerTab({
    id: "sidebar-upload",
    title: () => label("\u6587\u4EF6", "Files"),
    icon: (size) => (0, import_react.createElement)(
      "svg",
      { viewBox: "0 0 24 24", width: size, height: size, fill: "none", stroke: "currentColor", strokeWidth: 2, strokeLinecap: "round", strokeLinejoin: "round", "aria-hidden": "true" },
      (0, import_react.createElement)("path", { d: "M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z" })
    ),
    order: 60,
    single: true,
    component: (props) => {
      const scope = props.scope ?? { sessionId: "" };
      const openFile = ctx.betterSidebar.openFile;
      return (0, import_react.createElement)(UploadView, {
        scope,
        visible: props.visible,
        onOpenFile: typeof openFile === "function" && props.scope !== void 0 ? (path) => openFile(props.scope, path) : void 0
      });
    }
  }), "dsh-sidebar-upload: register file-manager tab");
}

    return module.exports;
  }
});
