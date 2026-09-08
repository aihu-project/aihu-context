import { execFileSync } from 'node:child_process'
import { existsSync, unlinkSync, writeFileSync } from 'node:fs'
import { join, resolve } from 'node:path'

const root = resolve('.')
const injected = join(root, 'dist', 'unexpected-release-file.txt')
if (!existsSync(join(root, 'dist'))) throw new Error('build before running injected-dist regression')
writeFileSync(injected, 'must be rejected')
try {
  try {
    execFileSync(process.execPath, ['scripts/verify-pack.mjs'], { cwd: root, stdio: 'pipe' })
    throw new Error('pack verifier accepted an injected dist file')
  } catch (error) {
    if (error.message === 'pack verifier accepted an injected dist file') throw error
    const output = `${error.stdout ?? ''}\n${error.stderr ?? ''}`
    if (!output.includes('unexpected tarball file')) throw error
    console.log('injected dist file was rejected as expected')
  }
} finally {
  unlinkSync(injected)
}
