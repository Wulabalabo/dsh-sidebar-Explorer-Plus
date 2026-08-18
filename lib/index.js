// src/index.ts
import { mkdir, rename, rm, stat, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";
var name = "dsh-sidebar-explorer-plus";
var inject = ["webServer", "sessions", "webRuntime"];
var DEFAULT_UPLOAD_LIMIT = 50 * 1024 * 1024;
var MAX_JSON_BODY = 1024 * 1024;
var UploadError = class extends Error {
  constructor(code, message, status = 400) {
    super(message);
    this.code = code;
    this.status = status;
  }
};
function writeJson(res, status, body) {
  res.writeHead(status, { "content-type": "application/json; charset=utf-8" });
  res.end(JSON.stringify(body));
}
function writeOk(res, value) {
  writeJson(res, 200, { ok: true, value });
}
function writeError(res, error) {
  if (error instanceof UploadError) {
    writeJson(res, error.status, { ok: false, error: { code: error.code, message: error.message } });
    return;
  }
  const message = error instanceof Error ? error.message : String(error);
  writeJson(res, 500, { ok: false, error: { code: "internal", message } });
}
function header(headers, name2) {
  const value = headers[name2];
  return typeof value === "string" ? value : void 0;
}
function parseAuthority(authority) {
  try {
    return new URL(`http://${authority}`);
  } catch {
    return void 0;
  }
}
function isLoopbackHostname(hostname) {
  if (hostname === "localhost" || hostname === "[::1]") return true;
  const parts = hostname.split(".");
  return parts.length === 4 && parts[0] === "127" && parts.every((part) => /^\d{1,3}$/.test(part) && Number(part) <= 255);
}
function canonicalAuthority(entry, entryUrl) {
  const port = entryUrl.port !== "" ? entryUrl.port : new URL(`https://${entry}`).port;
  return port === "" ? entryUrl.hostname : `${entryUrl.hostname}:${port}`;
}
function isTrustedAuthority(hostUrl, trustedHosts) {
  return trustedHosts.some((entry) => {
    const entryUrl = parseAuthority(entry);
    if (entryUrl === void 0) return false;
    return canonicalAuthority(entry, entryUrl) === entryUrl.hostname ? entryUrl.hostname === hostUrl.hostname : entryUrl.host === hostUrl.host;
  });
}
function isTrustedRequest(req, trustedHosts) {
  const host = header(req.headers, "host");
  if (host === void 0) return false;
  const hostUrl = parseAuthority(host);
  if (hostUrl === void 0) return false;
  if (!isLoopbackHostname(hostUrl.hostname) && !isTrustedAuthority(hostUrl, trustedHosts)) return false;
  if (header(req.headers, "sec-fetch-site") === "cross-site") return false;
  const origin = header(req.headers, "origin");
  if (origin === void 0) return true;
  try {
    return new URL(origin).host === hostUrl.host;
  } catch {
    return false;
  }
}
function requireAbsolute(path) {
  if (!path.startsWith("/") && !/^[A-Za-z]:[\\/]/.test(path)) {
    throw new UploadError("bad-request", `"${path}" is not an absolute path`);
  }
  return path;
}
function normalizePath(value) {
  return value.replace(/[\\/]+/g, "/").replace(/\/$/, "");
}
function isWithin(base, target, platform = process.platform) {
  const b = normalizePath(base);
  const t = normalizePath(target);
  if (platform === "win32") {
    const lb = b.toLowerCase();
    const lt = t.toLowerCase();
    return lt === lb || lt.startsWith(`${lb}/`);
  }
  return t === b || t.startsWith(`${b}/`);
}
function requireNotRoot(cwd, path) {
  if (normalizePath(path) === normalizePath(cwd)) {
    throw new UploadError("fs-error", "cannot operate on the workspace root", 403);
  }
}
function sessionCwdOf(ctx, sessionId, clientCwd) {
  const headerCwd = ctx.sessions.get(sessionId)?.header.cwd;
  if (headerCwd !== void 0 && headerCwd !== "") return headerCwd;
  if (clientCwd !== void 0 && clientCwd !== "") {
    try {
      return requireAbsolute(clientCwd);
    } catch {
      throw new UploadError("bad-request", `invalid working directory "${clientCwd}"`);
    }
  }
  return process.cwd();
}
async function readRawBody(req, limit) {
  const chunks = [];
  let total = 0;
  for await (const chunk of req) {
    const buffer = Buffer.from(chunk);
    total += buffer.length;
    if (total > limit) throw new UploadError("bad-request", "request body too large");
    chunks.push(buffer);
  }
  return Buffer.concat(chunks);
}
async function readJsonBody(req) {
  const text = (await readRawBody(req, MAX_JSON_BODY)).toString("utf8");
  if (text.trim() === "") return {};
  try {
    return JSON.parse(text);
  } catch {
    throw new UploadError("bad-request", "request body is not valid JSON");
  }
}
function payloadField(payload, key) {
  const value = payload?.[key];
  if (typeof value !== "string" || value === "") {
    throw new UploadError("bad-request", `missing or invalid "${key}"`);
  }
  return value;
}
function scopedAbsPath(ctx, payload, key) {
  const sessionId = payloadField(payload, "sessionId");
  const record = payload;
  const clientCwd = typeof record?.cwd === "string" && record.cwd !== "" ? record.cwd : void 0;
  const cwd = sessionCwdOf(ctx, sessionId, clientCwd);
  const path = requireAbsolute(payloadField(payload, key));
  if (!isWithin(cwd, path)) {
    throw new UploadError("fs-error", `${key} outside the session working directory`, 403);
  }
  return { cwd, path };
}
function messageOf(error) {
  return error instanceof Error ? error.message : String(error);
}
async function handleUpload(ctx, req, res, url, uploadLimit) {
  const sessionId = url.searchParams.get("sessionId");
  const rawDir = url.searchParams.get("dir");
  const name2 = url.searchParams.get("name");
  if (sessionId === null || name2 === null) {
    throw new UploadError("bad-request", "sessionId and name are required");
  }
  const cwd = sessionCwdOf(ctx, sessionId, url.searchParams.get("cwd") ?? void 0);
  const dir = rawDir === null || rawDir === "" ? cwd : requireAbsolute(rawDir);
  if (!isWithin(cwd, dir)) {
    throw new UploadError("fs-error", "upload target outside the session working directory", 403);
  }
  const segments = name2.split("/").filter((segment) => segment !== "");
  if (segments.length === 0 || segments.some((segment) => segment === "." || segment === ".." || segment.includes("\\") || segment.includes("\0"))) {
    throw new UploadError("bad-request", "invalid upload name");
  }
  const target = join(dir, ...segments);
  if (!isWithin(cwd, target)) {
    throw new UploadError("fs-error", "upload target outside the session working directory", 403);
  }
  const bytes = await readRawBody(req, uploadLimit);
  const existed = await stat(target).then((info) => info.isFile(), () => false);
  const tmp = `${target}.dsh-upload-${process.pid}-${Math.random().toString(36).slice(2)}`;
  try {
    await mkdir(dirname(target), { recursive: true });
    await writeFile(tmp, bytes);
    await rename(tmp, target);
  } catch (error) {
    await rm(tmp, { force: true }).catch(() => {
    });
    throw new UploadError("fs-error", `cannot upload "${target}": ${messageOf(error)}`, 400);
  }
  writeOk(res, { path: target, bytes: bytes.length, overwrote: existed });
}
async function handleDelete(ctx, req, res) {
  const payload = await readJsonBody(req);
  const { cwd, path } = scopedAbsPath(ctx, payload, "path");
  requireNotRoot(cwd, path);
  await rm(path, { recursive: true, force: false }).catch((error) => {
    throw new UploadError("fs-error", `cannot delete "${path}": ${messageOf(error)}`, 400);
  });
  writeOk(res, { ok: true });
}
async function handleMove(ctx, req, res) {
  const payload = await readJsonBody(req);
  const { cwd, path: from } = scopedAbsPath(ctx, payload, "from");
  const { path: to } = scopedAbsPath(ctx, payload, "to");
  requireNotRoot(cwd, from);
  const fromInfo = await stat(from).catch(() => {
    throw new UploadError("fs-error", `cannot move "${from}": not found`, 400);
  });
  if (fromInfo.isDirectory() && isWithin(from, to)) {
    throw new UploadError("fs-error", "cannot move a directory into itself", 400);
  }
  const toExists = await stat(to).then(() => true, () => false);
  if (toExists) {
    throw new UploadError("fs-error", `destination already exists: "${to}"`, 409);
  }
  await rename(from, to).catch((error) => {
    throw new UploadError("fs-error", `cannot move "${from}": ${messageOf(error)}`, 400);
  });
  writeOk(res, { ok: true, from, to });
}
async function handleRename(ctx, req, res) {
  const payload = await readJsonBody(req);
  const { cwd, path } = scopedAbsPath(ctx, payload, "path");
  requireNotRoot(cwd, path);
  const name2 = payloadField(payload, "name");
  if (name2 === "" || name2 === "." || name2 === ".." || name2.includes("/") || name2.includes("\\") || name2.includes("\0")) {
    throw new UploadError("bad-request", "invalid name");
  }
  const to = join(dirname(path), name2);
  if (!isWithin(cwd, to)) {
    throw new UploadError("fs-error", "target outside the session working directory", 403);
  }
  const toExists = await stat(to).then(() => true, () => false);
  if (toExists) {
    throw new UploadError("fs-error", `destination already exists: "${to}"`, 409);
  }
  await rename(path, to).catch((error) => {
    throw new UploadError("fs-error", `cannot rename "${path}": ${messageOf(error)}`, 400);
  });
  writeOk(res, { ok: true, path: to });
}
async function handleMkdir(ctx, req, res) {
  const payload = await readJsonBody(req);
  const { path } = scopedAbsPath(ctx, payload, "path");
  await mkdir(path).catch((error) => {
    throw new UploadError("fs-error", `cannot create "${path}": ${messageOf(error)}`, 400);
  });
  writeOk(res, { ok: true, path });
}
function apply(ctx, config) {
  const uploadLimit = config !== void 0 && Number.isFinite(config.uploadLimit) && (config.uploadLimit ?? 0) > 0 ? config.uploadLimit : DEFAULT_UPLOAD_LIMIT;
  ctx.effect(() => ctx.webServer.register({
    kind: "prefix",
    path: "/sidebar-explorer",
    handler: async (req, res) => {
      if (!isTrustedRequest(req, ctx.webRuntime.trustedHosts)) {
        res.writeHead(403);
        res.end("forbidden");
        return;
      }
      if (req.method !== "POST") {
        res.writeHead(405);
        res.end();
        return;
      }
      try {
        const url = new URL(req.url ?? "/", "http://dsh.internal");
        const op = url.pathname.startsWith("/sidebar-explorer/") ? url.pathname.slice("/sidebar-explorer/".length) : "upload";
        switch (op) {
          case "upload":
            await handleUpload(ctx, req, res, url, uploadLimit);
            return;
          case "delete":
            await handleDelete(ctx, req, res);
            return;
          case "move":
            await handleMove(ctx, req, res);
            return;
          case "rename":
            await handleRename(ctx, req, res);
            return;
          case "mkdir":
            await handleMkdir(ctx, req, res);
            return;
          default:
            throw new UploadError("not-found", `unknown operation "${op}"`, 404);
        }
      } catch (error) {
        writeError(res, error);
      }
    }
  }), "dsh-sidebar-explorer-plus: file routes");
}
export {
  apply,
  inject,
  name
};
