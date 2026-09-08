import { spawnSync } from 'node:child_process'
import { mkdtemp, readFile, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

const root = new URL('..', import.meta.url)
const rootPath = new URL(root).pathname.replace(/\/$/, '')
const staging = await mkdtemp(join(tmpdir(), 'aihu-context-pack-'))

try {
  const packed = spawnSync('npm', ['pack', '--json', '--ignore-scripts'], {
    cwd: rootPath,
    encoding: 'utf8',
    stdio: ['ignore', 'pipe', 'inherit'],
  })
  if (packed.status !== 0) process.exit(packed.status ?? 1)
  const [result] = JSON.parse(packed.stdout) as Array<{ filename: string }>
  const tarball = join(rootPath, result.filename)
  const extracted = spawnSync('tar', ['-xzf', tarball, '-C', staging], { stdio: 'inherit' })
  if (extracted.status !== 0) process.exit(extracted.status ?? 1)

  const manifest = JSON.parse(await readFile(join(staging, 'package', 'package.json'), 'utf8')) as {
    name: string
    version: string
    repository?: { url?: string; directory?: string }
    dependencies?: Record<string, string>
    devDependencies?: Record<string, string>
  }
  const expected = JSON.parse(
    await readFile(join(rootPath, 'package.json'), 'utf8'),
  ) as typeof manifest
  const failures: string[] = []
  if (manifest.name !== expected.name) failures.push(`name ${manifest.name} != ${expected.name}`)
  if (manifest.version !== expected.version)
    failures.push(`version ${manifest.version} != ${expected.version}`)
  if (manifest.repository?.url !== 'git+https://github.com/aihu-project/aihu-context.git') {
    failures.push('repository URL is not the standalone aihu-context repository')
  }
  if (manifest.repository && 'directory' in manifest.repository) {
    failures.push('repository.directory must not be present in the standalone package')
  }
  for (const section of [manifest.dependencies, manifest.devDependencies]) {
    for (const [name, spec] of Object.entries(section ?? {})) {
      if (spec.startsWith('workspace:'))
        failures.push(`${name} retains workspace dependency ${spec}`)
    }
  }
  if (failures.length) {
    console.error(failures.join('\n'))
    process.exit(1)
  }
  console.log(`packed manifest valid: ${manifest.name}@${manifest.version}`)
} finally {
  await rm(staging, { recursive: true, force: true })
}
