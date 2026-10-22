#!/usr/bin/env node
/**
 * Plan one daily release for this repo.
 *
 * - Scheduled runs allocate a new date-counter version only when main changed
 *   since the latest release tag (version-only commits excluded).
 * - Manual runs always allocate (an explicit "release now" request).
 * - The tag is vYYYYMMDD-N; package.json uses the equivalent strict SemVer
 *   YYYY.MM.DD-N so pnpm/npm can install the exact tarball.
 *
 * Reads release tag names from a JSON dump (drafts included) so an interrupted
 * upload never reuses a counter. Writes the plan to GITHUB_OUTPUT.
 */
import { execFileSync } from 'node:child_process'
import { existsSync, readFileSync, appendFileSync } from 'node:fs'

const DAY_ZONE_MS = 8 * 60 * 60 * 1000
const TAG_RE = /^v?(\d{8})-([1-9]\d*)$/

function argument(name, fallback = undefined) {
  const index = process.argv.indexOf(name)
  return index >= 0 && process.argv[index + 1] !== undefined ? process.argv[index + 1] : fallback
}

const event = process.env.GITHUB_EVENT_NAME || argument('--event', 'workflow_dispatch')
const releasesPath = argument('--releases', undefined)
if (event !== 'schedule' && event !== 'workflow_dispatch') {
  console.error(`[plan-release] unsupported event: ${event}`)
  process.exit(1)
}

function git(...args) {
  return execFileSync('git', args, { encoding: 'utf8' }).trim()
}
function gitOk(...args) {
  try {
    execFileSync('git', args, { stdio: 'ignore' })
    return true
  } catch {
    return false
  }
}

const local = new Date(Date.now() + DAY_ZONE_MS)
const yyyy = local.getUTCFullYear()
const mm = String(local.getUTCMonth() + 1).padStart(2, '0')
const dd = String(local.getUTCDate()).padStart(2, '0')
const day = `${yyyy}${mm}${dd}`

const releaseTags = releasesPath !== undefined && existsSync(releasesPath)
  ? JSON.parse(readFileSync(releasesPath, 'utf8')).map((release) => String(release.tag_name || '')).filter(Boolean)
  : []
const tags = [...new Set([...git('tag', '--list', 'v*').split('\n').filter(Boolean), ...releaseTags])]
const counters = tags
  .map((tag) => TAG_RE.exec(tag))
  .filter((match) => match !== null && match[1] === day)
  .map((match) => Number(match[2]))
const version = `${day}-${Math.max(0, ...counters) + 1}`
const tag = `v${version}`
const packageVersion = `${yyyy}.${mm}.${dd}-${version.split('-')[1]}`

// The most recent published release tag (date-counter tags sort correctly).
const releaseTagList = tags.filter((tagName) => TAG_RE.test(tagName)).sort()
const lastTag = releaseTagList.length > 0 ? releaseTagList[releaseTagList.length - 1] : null

// A release commit only stamps version files and rebuilds lib/, so compare the
// current main commit with the release commit's "Source-Commit" trailer instead
// of diffing files (which would count the version-only commit as a change).
function changedSince(tagName) {
  const head = git('rev-parse', 'HEAD')
  try {
    const body = git('log', '-1', '--format=%B', tagName)
    const source = /^Source-Commit: ([0-9a-f]{40})$/m.exec(body)
    if (source !== null) return source[1] !== head
  } catch {}
  // Tag without the trailer (older releases): fall back to a file diff that
  // ignores the version-only files.
  return !gitOk('diff', '--quiet', `${tagName}..HEAD`, '--', '.', ':(exclude)package.json', ':(exclude)src/client.ts', ':(exclude)lib/*.js')
}
const changed = lastTag === null || changedSince(lastTag)

let publish
let reason
if (event === 'workflow_dispatch') {
  publish = true
  reason = '手动触发：总是分配新版本'
} else if (lastTag === null) {
  publish = true
  reason = '首次发布：没有历史 release tag'
} else if (changed) {
  publish = true
  reason = `自 ${lastTag} 以来 main 有变更`
} else {
  publish = false
  reason = `自 ${lastTag} 以来没有变更，跳过发版`
}

const outputs = {
  publish: String(publish),
  version,
  tag,
  package_version: packageVersion,
  last_tag: lastTag ?? '',
  reason,
}
const outputFile = process.env.GITHUB_OUTPUT
if (outputFile !== undefined) {
  appendFileSync(outputFile, Object.entries(outputs).map(([key, value]) => `${key}=${value}\n`).join(''))
}
const summaryFile = process.env.GITHUB_STEP_SUMMARY
if (summaryFile !== undefined) {
  appendFileSync(summaryFile, `## Release plan\n\n- ${reason}\n- ${publish ? tag : 'no release'}\n\n`)
}
console.log(JSON.stringify(outputs, null, 2))
