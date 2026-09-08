import { readFile } from 'node:fs/promises'

const tag = process.env.RELEASE_TAG
if (!tag) {
  console.error('RELEASE_TAG is required')
  process.exit(1)
}

const packageJson = JSON.parse(
  await readFile(new URL('../package.json', import.meta.url), 'utf8'),
) as {
  name: string
  version: string
}
const expected = `context-v${packageJson.version}`
if (tag !== expected) {
  console.error(`release tag ${tag} must exactly match ${expected} for ${packageJson.name}`)
  process.exit(1)
}

console.log(`release tag ${tag} matches ${packageJson.name}@${packageJson.version}`)
