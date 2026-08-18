// dsh-sidebar-upload client half.
//
// Registers one tab ("上传" / "Upload") in dsh-better-sidebar through the
// public `ctx.betterSidebar.registerTab` service. The tab is a drag-and-drop
// surface: drop files or folders to upload them (preserving folder structure)
// into the conversation workspace via the plugin's own /sidebar-upload route.
window.__ModuleLoader__.load({
  id: "dsh-sidebar-upload",
  factory: (require) => {
    var module = { exports: {} };
    var exports = module.exports;
    Object.defineProperty(exports, Symbol.toStringTag, { value: "Module" });

    var React = require("react");
    var createElement = React.createElement;
    var useState = React.useState;
    var useEffect = React.useEffect;
    var useRef = React.useRef;
    var useCallback = React.useCallback;

    // ── i18n ───────────────────────────────────────────────────────────────
    function isZh() {
      try {
        return typeof navigator !== "undefined" && (navigator.language || "").toLowerCase().indexOf("zh") === 0;
      } catch (error) {
        return false;
      }
    }
    function label(zh, en) {
      return isZh() ? zh : en;
    }

    // ── Scoped stylesheet (injected once) ──────────────────────────────────
    var STYLE_ID = "dsh-sidebar-upload-style";
    function ensureStyle() {
      if (document.getElementById(STYLE_ID)) return;
      var css = [
        ".dsu-root{display:flex;flex-direction:column;height:100%;min-height:0;padding:12px;box-sizing:border-box;gap:10px;overflow-y:auto}",
        ".dsu-hint{font:var(--dsw-font-xxs-12,12px/1.5 system-ui);color:var(--dsw-alias-label-tertiary,#888);margin:0}",
        ".dsu-zone{flex:1;min-height:140px;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:10px;border:1.5px dashed var(--dsw-alias-border-l1,rgba(128,128,128,.5));border-radius:12px;padding:24px;text-align:center;transition:border-color .12s ease,background .12s ease}",
        ".dsu-zone.dsu-active{border-color:var(--dsw-alias-state-business-primary,#4d6bfe);background:var(--dsw-alias-state-business-tertiary,rgba(77,107,254,.08))}",
        ".dsu-icon{display:block;width:34px;height:34px;color:var(--dsw-alias-label-tertiary,#888)}",
        ".dsu-zone.dsu-active .dsu-icon{color:var(--dsw-alias-state-business-primary,#4d6bfe)}",
        ".dsu-title{font:var(--dsw-font-s-strong-14,600 14px/1.4 system-ui);color:var(--dsw-alias-label-primary,#222)}",
        ".dsu-sub{font:var(--dsw-font-xxs-12,12px/1.5 system-ui);color:var(--dsw-alias-label-tertiary,#888)}",
        ".dsu-status{font:var(--dsw-font-xxs-12,12px/1.5 system-ui);color:var(--dsw-alias-label-secondary,#555);word-break:break-all}",
        ".dsu-error{color:var(--dsw-alias-state-error-primary,#d05)}",
        ".dsu-bar{width:100%;height:6px;border-radius:999px;background:var(--dsw-alias-interactive-bg-hover,rgba(0,0,0,.06));overflow:hidden}",
        ".dsu-bar-fill{height:100%;background:var(--dsw-alias-state-business-primary,#4d6bfe);transition:width .15s ease}",
        ".dsu-list{margin:4px 0 0;padding-left:16px;font:var(--dsw-font-xxs-12,12px/1.6 system-ui);color:var(--dsw-alias-label-tertiary,#888)}"
      ].join("\n");
      var style = document.createElement("style");
      style.id = STYLE_ID;
      style.textContent = css;
      document.head.appendChild(style);
    }

    // ── Drop collection (files + folders via webkitGetAsEntry) ────────────
    function entryOf(item) {
      if (typeof item.webkitGetAsEntry === "function") return item.webkitGetAsEntry();
      return null;
    }
    function fileOf(entry) {
      return new Promise(function (resolve, reject) { entry.file(resolve, reject); });
    }
    function readAllEntries(reader) {
      return new Promise(function (resolve, reject) {
        var all = [];
        function readBatch() {
          reader.readEntries(function (batch) {
            if (batch.length === 0) resolve(all);
            else { all.push.apply(all, batch); readBatch(); }
          }, reject);
        }
        readBatch();
      });
    }
    function walk(entry, relPath, out) {
      if (entry.isFile) {
        return fileOf(entry).then(function (file) { out.push({ file: file, relPath: relPath }); });
      }
      if (entry.isDirectory) {
        return readAllEntries(entry.createReader()).then(function (children) {
          return children.reduce(function (p, child) {
            return p.then(function () { return walk(child, relPath + "/" + child.name, out); });
          }, Promise.resolve());
        });
      }
      return Promise.resolve();
    }
    function collectDroppedFiles(dataTransfer) {
      var items = [];
      if (dataTransfer && dataTransfer.items) {
        for (var i = 0; i < dataTransfer.items.length; i++) items.push(dataTransfer.items[i]);
      }
      var entries = items.map(entryOf).filter(function (e) { return e !== null; });
      if (entries.length > 0) {
        var out = [];
        return entries.reduce(function (p, entry) {
          return p.then(function () { return walk(entry, entry.name, out); });
        }, Promise.resolve()).then(function () { return out; });
      }
      var files = [];
      if (dataTransfer && dataTransfer.files) {
        for (var j = 0; j < dataTransfer.files.length; j++) files.push(dataTransfer.files[j]);
      }
      return Promise.resolve(files.map(function (file) {
        var rel = file.webkitRelativePath || "";
        return { file: file, relPath: rel !== "" ? rel : file.name };
      }));
    }

    // ── Upload one file ────────────────────────────────────────────────────
    function uploadOne(scope, dir, relPath, file) {
      var params = new URLSearchParams({ sessionId: scope.sessionId, name: relPath });
      if (dir) params.set("dir", dir);
      if (scope.cwd) params.set("cwd", scope.cwd);
      return fetch("/sidebar-upload/upload?" + params.toString(), {
        method: "POST",
        headers: { "content-type": "application/octet-stream" },
        body: file
      }).then(function (res) {
        return res.json().catch(function () { return null; }).then(function (data) {
          if (!res.ok || !data || data.ok !== true) {
            var message = data && data.error && data.error.message ? data.error.message : ("HTTP " + res.status);
            throw new Error(message);
          }
          return data.value;
        });
      });
    }

    function hasFiles(event) {
      var types = event.dataTransfer && event.dataTransfer.types;
      if (!types) return false;
      return Array.prototype.indexOf.call(types, "Files") !== -1;
    }

    // ── Upload tab component ───────────────────────────────────────────────
    function UploadView(props) {
      var scope = props.scope || {};
      var sessionId = scope.sessionId;
      var cwd = scope.cwd !== undefined && scope.cwd !== "" ? scope.cwd : undefined;

      var dragDepth = useRef(0);
      var dragActiveState = useState(false);
      var dragActive = dragActiveState[0];
      var setDragActive = dragActiveState[1];
      var busyState = useState(false);
      var busy = busyState[0];
      var setBusy = busyState[1];
      var progressState = useState(null);
      var progress = progressState[0];
      var setProgress = progressState[1];
      var resultState = useState(null);
      var result = resultState[0];
      var setResult = resultState[1];
      var errorState = useState(null);
      var error = errorState[0];
      var setError = errorState[1];
      var resolvedCwdState = useState(cwd || null);
      var resolvedCwd = resolvedCwdState[0];
      var setResolvedCwd = resolvedCwdState[1];

      useEffect(function () {
        ensureStyle();
      }, []);

      // Resolve the workspace path for display when the scope summary lacks it.
      useEffect(function () {
        if (sessionId === undefined || cwd !== undefined) return;
        var cancelled = false;
        fetch("/sidebar/api/session.cwd", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ sessionId: sessionId })
        }).then(function (r) { return r.json(); }).then(function (d) {
          if (!cancelled && d && d.ok && d.value && d.value.cwd) setResolvedCwd(d.value.cwd);
        }).catch(function () {});
        return function () { cancelled = true; };
      }, [sessionId, cwd]);

      var targetDir = cwd || resolvedCwd;

      var handleDrop = useCallback(function (event) {
        if (!hasFiles(event)) return;
        event.preventDefault();
        event.stopPropagation();
        dragDepth.current = 0;
        setDragActive(false);
        if (sessionId === undefined || busy) return;
        var dataTransfer = event.dataTransfer;
        if (!dataTransfer) return;
        collectDroppedFiles(dataTransfer).then(function (files) {
          if (files.length === 0) return;
          setBusy(true);
          setProgress({ done: 0, total: files.length });
          setResult(null);
          setError(null);
          var uploaded = 0;
          var overwrote = 0;
          var failed = [];
          var index = 0;
          function run() {
            if (index >= files.length) return Promise.resolve();
            var i = index++;
            var item = files[i];
            return uploadOne(scope, cwd, item.relPath, item.file).then(function (value) {
              uploaded += 1;
              if (value && value.overwrote) overwrote += 1;
              setProgress({ done: index, total: files.length });
            }, function (e) {
              failed.push(item.relPath + " (" + (e && e.message ? e.message : "error") + ")");
              setProgress({ done: index, total: files.length });
            }).then(run);
          }
          var workers = [];
          var CONCURRENCY = 4;
          for (var w = 0; w < Math.min(CONCURRENCY, files.length); w++) workers.push(run());
          return Promise.all(workers).then(function () {
            setBusy(false);
            setProgress(null);
            setResult({ uploaded: uploaded, overwrote: overwrote, failed: failed });
          });
        }).catch(function (e) {
          setBusy(false);
          setProgress(null);
          setError(e && e.message ? e.message : String(e));
        });
      }, [sessionId, scope, cwd, busy]);

      var onDragOver = useCallback(function (event) {
        if (!hasFiles(event)) return;
        event.preventDefault();
        event.stopPropagation();
        if (event.dataTransfer) event.dataTransfer.dropEffect = "copy";
        if (dragDepth.current === 0) setDragActive(true);
      }, []);

      var onDragEnter = useCallback(function (event) {
        if (!hasFiles(event)) return;
        event.preventDefault();
        event.stopPropagation();
        dragDepth.current += 1;
        setDragActive(true);
      }, []);

      var onDragLeave = useCallback(function (event) {
        if (!hasFiles(event)) return;
        event.stopPropagation();
        dragDepth.current = Math.max(0, dragDepth.current - 1);
        if (dragDepth.current === 0) setDragActive(false);
      }, []);

      if (sessionId === undefined) {
        return createElement("div", { className: "dsu-root" },
          createElement("p", { className: "dsu-hint" }, label("选择一个会话以使用上传", "Select a conversation to upload files"))
        );
      }

      var children = [];
      children.push(createElement("div", {
        className: "dsu-zone" + (dragActive ? " dsu-active" : ""),
        onDragOver: onDragOver,
        onDragEnter: onDragEnter,
        onDragLeave: onDragLeave,
        onDrop: handleDrop
      },
        createElement("svg", { className: "dsu-icon", viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: "2", strokeLinecap: "round", strokeLinejoin: "round", "aria-hidden": "true" },
          createElement("path", { d: "M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" }),
          createElement("polyline", { points: "17 8 12 3 7 8" }),
          createElement("line", { x1: "12", y1: "3", x2: "12", y2: "15" })
        ),
        createElement("div", { className: "dsu-title" }, label("将文件或文件夹拖到此处", "Drop files or folders here")),
        createElement("div", { className: "dsu-sub" }, label("支持任意文件；文件夹会按原目录结构上传", "Any file type is supported; folders keep their structure"))
      ));

      if (targetDir) {
        children.push(createElement("p", { className: "dsu-status" },
          label("上传到：", "Uploading to: ") + targetDir
        ));
      }

      if (busy && progress) {
        var percent = progress.total === 0 ? 0 : Math.round((progress.done / progress.total) * 100);
        children.push(createElement("div", { className: "dsu-bar" },
          createElement("div", { className: "dsu-bar-fill", style: { width: percent + "%" } })
        ));
        children.push(createElement("p", { className: "dsu-status" },
          label("正在上传… ", "Uploading… ") + progress.done + " / " + progress.total
        ));
      }

      if (result) {
        var line = label("上传完成：新增 ", "Uploaded: ") + result.uploaded
          + label("，覆盖 ", ", overwrote ") + result.overwrote;
        if (result.failed.length > 0) {
          line += label("，失败 " + result.failed.length, ", failed " + result.failed.length);
        }
        children.push(createElement("p", { className: "dsu-status" }, line));
        if (result.failed.length > 0) {
          var items = result.failed.slice(0, 20).map(function (name) {
            return createElement("li", { key: name }, name);
          });
          children.push(createElement("ul", { className: "dsu-list" }, items));
        }
      }

      if (error) {
        children.push(createElement("p", { className: "dsu-status dsu-error" }, error));
      }

      return createElement("div", { className: "dsu-root" }, children);
    }

    // ── Client plugin registration ─────────────────────────────────────────
    var inject = ["betterSidebar"];

    function apply(ctx) {
      ctx.effect(function () {
        return ctx.betterSidebar.registerTab({
          id: "sidebar-upload",
          title: function () { return label("上传", "Upload"); },
          icon: function (size) {
            size = size || 16;
            return createElement("svg", { viewBox: "0 0 24 24", width: size, height: size, fill: "none", stroke: "currentColor", strokeWidth: "2", strokeLinecap: "round", strokeLinejoin: "round", "aria-hidden": "true" },
              createElement("path", { d: "M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" }),
              createElement("polyline", { points: "17 8 12 3 7 8" }),
              createElement("line", { x1: "12", y1: "3", x2: "12", y2: "15" })
            );
          },
          order: 60,
          single: true,
          component: function (props) {
            return createElement(UploadView, { scope: props.scope, visible: props.visible });
          }
        });
      }, "dsh-sidebar-upload: register upload tab");
    }

    exports.apply = apply;
    exports.inject = inject;
    return module.exports;
  }
});
