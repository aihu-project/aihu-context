import { execFileSync } from 'node:child_process'
import { existsSync, readFileSync } from 'node:fs'

const classicEnv = /(?:^|_)(?:NPM_TOKEN|NODE_AUTH_TOKEN|NPM_CONFIG_(?:_AUTHTOKEN|AUTHTOKEN|_AUTH|USERNAME|PASSWORD|EMAIL|CERTFILE|KEYFILE|TOKEN))$/i
for (const [name, value] of Object.entries(process.env)) {
  if (value && classicEnv.test(name)) throw new Error('classic npm authentication environment is set; trusted publishing requires OIDC')
}

const paths = new Set(['.npmrc', process.env.NPM_CONFIG_USERCONFIG, process.env.NPM_CONFIG_GLOBALCONFIG])
for (const command of [['config', 'get', 'userconfig'], ['config', 'get', 'globalconfig']]) {
  try { paths.add(execFileSync('npm', command, { encoding: 'utf8' }).trim()) } catch {}
}
const authKey = /^\s*(?:[^#;=\s]+:)?(?:_authToken|_auth|username|_password|password|email|certfile|keyfile|token)\s*=/i
for (const path of paths) {
  if (!path || !existsSync(path)) continue
  if (readFileSync(path, 'utf8').split(/\r?\n/).some((line) => authKey.test(line)))
    throw new Error('classic npm authentication was found in npm config; trusted publishing requires OIDC')
}
const [major, minor, patch] = execFileSync('npm', ['--version'], { encoding: 'utf8' }).trim().split('.').map(Number)
if (major < 11 || (major === 11 && (minor < 5 || (minor === 5 && patch < 1))))
  throw new Error(`npm ${major}.${minor}.${patch} is below the trusted-publishing minimum 11.5.1`)
console.log(`verified npm ${major}.${minor}.${patch}, sanitized config, and OIDC-only auth contract`)
