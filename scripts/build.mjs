import { execFileSync } from 'node:child_process'
import { rmSync } from 'node:fs'
import { resolve } from 'node:path'

rmSync(resolve('dist'), { recursive: true, force: true })
execFileSync('rolldown', ['-c'], { stdio: 'inherit' })
