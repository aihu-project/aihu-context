import { readFileSync } from 'node:fs'
import { spawnSync } from 'node:child_process'

const packageJson = JSON.parse(readFileSync(new URL('../package.json', import.meta.url)))
const spec = `${packageJson.name}@${packageJson.version}`
const result = spawnSync('npm', ['view', spec, 'version', '--json', '--registry=https://registry.npmjs.org'], { encoding: 'utf8' })
const output = `${result.stdout ?? ''}\n${result.stderr ?? ''}`
if (result.status === 0) throw new Error(`${spec} already exists on npm; refusing to publish over it`)
const codes = [...output.matchAll(/(?:npm )?error code (E\d+)/gi)].map((match) => match[1].toUpperCase())
if (!codes.includes('E404') || codes.some((code) => code !== 'E404') || /ECONN|ETIMEDOUT|ENETUNREACH|EAI_AGAIN/i.test(output))
  throw new Error(`npm absence check did not fail closed with E404 for ${spec}`)
console.log(`confirmed E404-only absence for ${spec}`)
