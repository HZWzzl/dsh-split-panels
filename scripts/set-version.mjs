#!/usr/bin/env node
/**
 * Set or check the single release version.
 *
 * The version is stamped in two places so help output and
 * `window.__dshSplitPanels.health()` report the release:
 * - package.json `version`
 * - src/client.ts `PLUGIN_VERSION`
 *
 * Accepted forms:
 * - YYYY.MM.DD-N  strict SemVer used by release tags vYYYYMMDD-N
 * - legacy SemVer  x.y.z or x.y.z-pre (kept for older checkouts/CI)
 *
 * Usage:
 *   node scripts/set-version.mjs 2026.10.22-1
 *   node scripts/set-version.mjs --check
 */
import { readFileSync, writeFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..')
const PACKAGE = join(ROOT, 'package.json')
const CLIENT = join(ROOT, 'src/client.ts')
const CLIENT_VERSION_RE = /(const PLUGIN_VERSION = ")([^"]*)(";)/

const DATE_RE = /^(\d{4})\.(\d{2})\.(\d{2})-([1-9]\d*)$/
const SEMVER_RE = /^(0|[1-9]\d*)\.(0|[1-9]\d*)\.(0|[1-9]\d*)(?:-[0-9A-Za-z.-]+)?$/

function validate(version) {
  const date = DATE_RE.exec(version)
  if (date !== null) {
    const month = Number(date[2])
    const day = Number(date[3])
    if (month < 1 || month > 12 || day < 1 || day > 31) throw new Error(`invalid calendar date in ${version}`)
    return
  }
  if (!SEMVER_RE.test(version)) throw new Error(`expected YYYY.MM.DD-N (date-counter) or legacy SemVer, got ${version}`)
}

const check = process.argv.includes('--check')
const requested = process.argv.slice(2).find((argument) => !argument.startsWith('--'))
const pkg = JSON.parse(readFileSync(PACKAGE, 'utf8'))

if (check) {
  validate(String(pkg.version))
  const client = readFileSync(CLIENT, 'utf8')
  const match = CLIENT_VERSION_RE.exec(client)
  if (match === null) throw new Error('PLUGIN_VERSION constant not found in src/client.ts')
  if (match[2] !== pkg.version) {
    throw new Error(`package.json version ${pkg.version} and src/client.ts PLUGIN_VERSION ${match[2]} differ`)
  }
  console.log(`version ok: ${pkg.version}`)
  process.exit(0)
}
if (requested === undefined) {
  console.error('usage: node scripts/set-version.mjs <version> | --check')
  process.exit(1)
}
validate(requested)
pkg.version = requested
writeFileSync(PACKAGE, `${JSON.stringify(pkg, null, 2)}\n`)
const client = readFileSync(CLIENT, 'utf8')
if (CLIENT_VERSION_RE.exec(client) === null) throw new Error('PLUGIN_VERSION constant not found in src/client.ts')
writeFileSync(CLIENT, client.replace(CLIENT_VERSION_RE, `$1${requested}$3`))
console.log(`version set: ${requested}`)
