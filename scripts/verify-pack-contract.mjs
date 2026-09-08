import { execFileSync } from 'node:child_process'
import { existsSync, mkdirSync, readFileSync, readdirSync, rmSync, statSync } from 'node:fs'
import { join, resolve } from 'node:path'

const manifestFields = [
  'name',
  'version',
  'main',
  'module',
  'types',
  'exports',
  'files',
  'sideEffects',
  'license',
  'type',
  'scripts',
  'description',
  'repository',
  'homepage',
  'bugs',
  'publishConfig',
  'engines',
  'packageManager',
  'directories',
  'author',
  'keywords',
  'funding',
  'dependencies',
  'peerDependencies',
  'peerDependenciesMeta',
  'optionalDependencies',
  'os',
  'cpu',
  'libc',
]

const number = '(?:0|[1-9]\\d*)'
const fullVersion = `${number}\\.${number}\\.${number}(?:-[0-9A-Za-z-]+(?:\\.[0-9A-Za-z-]+)*)?(?:\\+[0-9A-Za-z-]+(?:\\.[0-9A-Za-z-]+)*)?`
const partialVersion = `${number}(?:\\.${number}){0,2}`
const wildcardVersion = `(?:${number}|[xX*])(?:\\.(?:${number}|[xX*])){0,2}`
const rangeAtom = new RegExp(
  `^(?:[v=]\\s*)?(?:(?:[<>]=?|[~^])\\s*)?(?:${fullVersion}|${partialVersion}|${wildcardVersion})$`,
)

function isSemverRange(spec) {
  if (typeof spec !== 'string' || !spec.trim()) return false
  const value = spec.trim()
  if (/^(?:workspace|file|link|git|github|git\\+|https?|ssh|npm):/i.test(value)) return false
  if (/^git@/i.test(value)) return false
  return value.split('||').every((part) => {
    const range = part.trim().replace(/([<>]=?|[~^])\\s+/g, '$1')
    if (!range) return false
    const hyphen = range.match(/^(.+?)\\s+-\\s+(.+)$/)
    if (hyphen) return rangeAtom.test(hyphen[1].trim()) && rangeAtom.test(hyphen[2].trim())
    return range.split(/\\s+/).every((atom) => rangeAtom.test(atom))
  })
}

export function assertPublicRegistrySemverDependencies(manifest) {
  for (const section of ['dependencies', 'peerDependencies', 'optionalDependencies']) {
    for (const [name, spec] of Object.entries(manifest[section] ?? {})) {
      if (!isSemverRange(spec))
        throw new Error(`${section}.${name} must be a public registry semver range`)
    }
  }
}

export function verifyPackage(root, packDir) {
  root = resolve(root)
  packDir = resolve(packDir)
  rmSync(packDir, { recursive: true, force: true })
  mkdirSync(packDir, { recursive: true })
  const source = JSON.parse(readFileSync(join(root, 'package.json'), 'utf8'))
  assertPublicRegistrySemverDependencies(source)
  const allowlist = JSON.parse(
    readFileSync(join(root, 'scripts/dist-allowlist.json'), 'utf8'),
  )
  const expected = new Set(['package/package.json', ...allowlist.map((file) => `package/${file}`)])
  for (const file of allowlist) {
    if (!existsSync(join(root, file)) || !statSync(join(root, file)).isFile())
      throw new Error(`allowlisted package file is missing: ${file}`)
  }

  const packed = JSON.parse(
    execFileSync('npm', ['pack', '--ignore-scripts', '--json', '--pack-destination', packDir], {
      cwd: root,
      encoding: 'utf8',
    }),
  )
  if (packed.length !== 1) throw new Error('npm pack did not produce exactly one archive')
  const archive = resolve(packDir, packed[0].filename)
  const archives = readdirSync(packDir).filter((name) => name.endsWith('.tgz'))
  if (!existsSync(archive) || archives.length !== 1 || archives[0] !== packed[0].filename)
    throw new Error('pack directory must contain exactly one archive')

  const packedManifest = JSON.parse(
    execFileSync('tar', ['-xOzf', archive, 'package/package.json'], { encoding: 'utf8' }),
  )
  for (const field of manifestFields) {
    if (JSON.stringify(packedManifest[field]) !== JSON.stringify(source[field]))
      throw new Error(`manifest field ${field} changed in tarball`)
  }
  assertPublicRegistrySemverDependencies(packedManifest)

  const entries = execFileSync('tar', ['-tzf', archive], { encoding: 'utf8' })
    .trim()
    .split('\n')
    .filter((entry) => entry && !entry.endsWith('/'))
  const actual = new Set(entries)
  for (const file of expected) if (!actual.has(file)) throw new Error(`missing tarball file: ${file}`)
  for (const file of actual) if (!expected.has(file)) throw new Error(`unexpected tarball file: ${file}`)
  if (entries.some((file) => /^package\/(?:src|tests|scripts|node_modules|\.github)(?:\/|$)/.test(file)))
    throw new Error('source or release tooling leaked into tarball')

  console.log(`verified ${archive}: ${packedManifest.name}@${packedManifest.version} (${entries.length} files)`)
  return archive
}
