import { execFileSync } from 'node:child_process'
import { mkdtempSync, realpathSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join, resolve, sep } from 'node:path'
import { fileURLToPath } from 'node:url'

const archiveArgument = process.argv[2]
if (!archiveArgument) throw new Error('usage: node scripts/consumer-smoke.mjs /absolute/path/package.tgz')
const archive = resolve(archiveArgument)
const consumer = mkdtempSync(join(tmpdir(), 'aihu-context-consumer-'))
execFileSync('npm', ['init', '--yes'], { cwd: consumer, stdio: 'ignore' })
execFileSync('npm', ['install', '--ignore-scripts', '--no-package-lock', '--no-audit', '--no-fund', archive], { cwd: consumer, stdio: 'inherit' })
const code = `
import { createContext, inject, provide } from '@aihu/context'
import { clearSsrContextMap, runWithContext, setSsrContextMap } from '@aihu/context/ssr'
import { fileURLToPath } from 'node:url'
import { realpathSync } from 'node:fs'
import { sep } from 'node:path'
const root = realpathSync(process.cwd())
for (const name of ['@aihu/context', '@aihu/context/ssr']) {
  const file = realpathSync(fileURLToPath(await import.meta.resolve(name)))
  if (!file.startsWith(root + sep)) throw new Error(name + ' resolved outside isolated consumer: ' + file)
}
const token = createContext('fallback')
const map = new Map()
setSsrContextMap(map)
provide(token, 'set-map')
if (inject(token) !== 'set-map') throw new Error('SSR subpath setSsrContextMap is inert')
clearSsrContextMap()
const value = runWithContext(new Map(), () => { provide(token, 'run-map'); return inject(token) })
if (value !== 'run-map' || inject(token) !== 'fallback') throw new Error('SSR subpath runWithContext is not live or does not clear')
console.log('isolated context and SSR subpath consumer passed')
`
execFileSync(process.execPath, ['--input-type=module', '--eval', code], { cwd: consumer, stdio: 'inherit' })
console.log(`isolated consumer passed against ${archive}`)
