import { execFileSync } from 'node:child_process'
import { readFileSync } from 'node:fs'
import { assertPublicRegistrySemverDependencies } from './verify-pack-contract.mjs'

const workflow = readFileSync(new URL('../.github/workflows/release.yml', import.meta.url), 'utf8')
const auth = readFileSync(new URL('./check-oidc-auth.mjs', import.meta.url), 'utf8')
for (const marker of ['--ignore-scripts', '--provenance', 'verify-pack.mjs', 'consumer-smoke.mjs', 'assert-unpublished.mjs', 'assert-reviewed-release.mjs'])
  if (!workflow.includes(marker)) throw new Error(`release workflow omits ${marker}`)
for (const marker of ['NPM_TOKEN', 'NODE_AUTH_TOKEN', 'NPM_CONFIG_USERCONFIG', 'NPM_CONFIG_GLOBALCONFIG', '_authToken', '_auth', '_password', 'username', 'email', 'certfile', 'keyfile'])
  if (!auth.includes(marker)) throw new Error(`OIDC guard omits ${marker}`)
if (/registry-url|secrets\.NPM_TOKEN|NODE_AUTH_TOKEN/.test(workflow)) throw new Error('release workflow contains token or setup-node registry wiring')
if (!workflow.includes('context-v$version') || !workflow.includes('merge-base --is-ancestor') || !workflow.includes('github.sha'))
  throw new Error('release workflow does not bind the exact reviewed default-branch tag')
assertPublicRegistrySemverDependencies({ dependencies: { valid: '^1.2.3' } })
for (const spec of ['workspace:*', 'file:../x', 'link:../x', 'git+https://example.test/x.git', 'https://example.test/x.tgz', 'latest']) {
  try {
    assertPublicRegistrySemverDependencies({ dependencies: { invalid: spec } })
    throw new Error(`dependency bypass accepted: ${spec}`)
  } catch (error) {
    if (error.message.startsWith('dependency bypass accepted:')) throw error
  }
}
execFileSync(process.execPath, ['scripts/injected-dist-regression.mjs'], { stdio: 'inherit' })
console.log('release contract regression checks passed for @aihu/context')
