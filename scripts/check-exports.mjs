// Checks that every target in package.json "exports" is an existing file.
// Usage: node scripts/check-exports.mjs [package-directory]   (default: the repository root)
import { existsSync, readFileSync, statSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

/** Every string target in an exports value (a string, a conditions object, or an array of alternatives). */
function collectTargets(value, subpath, out) {
  if (typeof value === 'string') {
    out.push({ subpath, target: value });
  } else if (Array.isArray(value)) {
    for (const item of value) collectTargets(item, subpath, out);
  } else if (value !== null && typeof value === 'object') {
    for (const inner of Object.values(value)) collectTargets(inner, subpath, out);
  }
}

/**
 * @param {string} packageDir directory holding package.json
 * @returns {{ checked: number, problems: string[] }}
 */
export function checkExports(packageDir) {
  const manifestPath = path.join(packageDir, 'package.json');
  const manifest = JSON.parse(readFileSync(manifestPath, 'utf8'));
  const problems = [];
  if (manifest.exports === undefined || manifest.exports === null) {
    return { checked: 0, problems: ['package.json has no "exports"'] };
  }
  const entries = [];
  if (typeof manifest.exports === 'string' || Array.isArray(manifest.exports)) {
    collectTargets(manifest.exports, '.', entries);
  } else {
    for (const [subpath, value] of Object.entries(manifest.exports)) {
      collectTargets(value, subpath, entries);
    }
  }
  for (const { subpath, target } of entries) {
    if (!target.startsWith('./')) {
      problems.push(`exports "${subpath}": target "${target}" must start with "./"`);
      continue;
    }
    if (target.includes('*')) {
      problems.push(`exports "${subpath}": pattern target "${target}" is not checked; list files explicitly`);
      continue;
    }
    const file = path.join(packageDir, target);
    if (!existsSync(file) || !statSync(file).isFile()) {
      problems.push(`exports "${subpath}": "${target}" does not exist`);
    }
  }
  return { checked: entries.length, problems };
}

const isMain = process.argv[1] !== undefined && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url);

if (isMain) {
  const packageDir = path.resolve(process.argv[2] ?? path.join(path.dirname(fileURLToPath(import.meta.url)), '..'));
  const { checked, problems } = checkExports(packageDir);
  if (problems.length > 0) {
    for (const problem of problems) console.error(problem);
    console.error(`check:exports failed: ${problems.length} of ${checked} targets`);
    process.exit(1);
  }
  console.log(`check:exports ok: ${checked} targets resolve to existing files`);
}
