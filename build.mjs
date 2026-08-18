/**
 * esbuild build for dsh-sidebar-explorer-plus.
 *
 * Produces:
 * - lib/index.js   — the host half (ESM, node), inlined except node builtins.
 * - lib/client.js  — the browser client half, wrapped in the same
 *   `window.__ModuleLoader__.load({ id, factory })` registration shape the
 *   official DSH client-bundle preset uses. `react` stays external (resolved
 *   through the module loader's frozen module table at runtime); everything
 *   else is inlined.
 *
 * Types ship from lib/types via `tsc -p tsconfig.build.json`, not from here.
 */
import { build } from 'esbuild'
import { writeFileSync } from 'node:fs'

const BUNDLE_ID = 'dsh-sidebar-explorer-plus'

// Host half.
await build({
  entryPoints: ['src/index.ts'],
  outfile: 'lib/index.js',
  bundle: true,
  format: 'esm',
  platform: 'node',
  target: 'node20',
  external: ['node:*'],
  sourcemap: false,
})

// Client half.
const client = await build({
  entryPoints: ['src/client/index.tsx'],
  bundle: true,
  format: 'cjs',
  platform: 'browser',
  target: 'es2020',
  external: ['react'],
  write: false,
  sourcemap: false,
})

const code = client.outputFiles[0].text
const wrapper = `window.__ModuleLoader__.load({\n  id: ${JSON.stringify(BUNDLE_ID)},\n  factory: (require) => {\n    var module = { exports: {} };\n    var exports = module.exports;\n    Object.defineProperty(exports, Symbol.toStringTag, { value: "Module" });\n${code}\n    return module.exports;\n  }\n});\n`

writeFileSync('lib/client.js', wrapper)
console.log('built lib/index.js and lib/client.js')
