/*
```mermaid
flowchart LR
  Read --> Issues --> Label
  Label -->|implemented| Local --> Exit
  Label -->|verified| Deployed --> SHA --> Exit
```
*/
import { readFile } from 'node:fs/promises';
import { basename } from 'node:path';

const args = process.argv.slice(2);
const usage = 'Use: node check-evidence.mjs [--label implemented|verified] <file>';
try {
  if (args.length === 1 && args[0] === '--help') {
    console.log(`${usage}\nUse implemented to check local results.\nUse verified to check deployed results and merge SHA (default).`);
    process.exit(0);
  }
  let label = 'verified';
  const labelIndex = args.indexOf('--label');
  if (labelIndex !== -1) {
    label = args[labelIndex + 1];
    args.splice(labelIndex, 2);
  }
  const [file, ...extra] = args;
  if (!file || extra.length || !['implemented', 'verified'].includes(label)) throw new Error(usage);
  const record = JSON.parse(await readFile(file, 'utf8'));
  if (!Array.isArray(record?.issues) || !record.issues.length) {
    throw new Error('Provide at least one issue.');
  }
  const mergeSha = record.pr?.mergeSha;
  let failures = 0;
  const requireValue = (path, value) => {
    if (value == null || (typeof value === 'string' && /^(?:\s*|\.\.\.|…|TODO|<[^>]*>)$/.test(value.trim()))) {
      failures++;
      console.error(`Provide a non-placeholder value for ${path}.`);
    }
  };
  requireValue('round', record.round);
  requireValue('reference.value', record.reference?.value);
  for (const field of ['url', 'head', 'base']) requireValue(`pr.${field}`, record.pr?.[field]);
  if (label === 'verified') requireValue('pr.mergeSha', mergeSha);
  for (const [field, value] of Object.entries(record.dispatch ?? {})) requireValue(`dispatch.${field}`, value);
  if (typeof record.round === 'string' && record.round.split('/').at(-1) !== basename(file).replace(/(?:\.evidence)?\.json$/, '')) {
    console.warn(`Warning: round ${record.round} does not match evidence file ${basename(file)}.`);
  }
  for (const [index, issue] of record.issues.entries()) {
    requireValue(`issues[${index}].expected`, issue?.expected);
    for (const field of ['result', 'artifact']) requireValue(`issues[${index}].local.${field}`, issue?.local?.[field]);
    if (label === 'verified') {
      for (const field of ['env', 'buildSha', 'artifact']) requireValue(`issues[${index}].deployed.${field}`, issue?.deployed?.[field]);
    }
    const reasons = [];
    if (label === 'implemented') {
      if (issue?.local?.result !== 'pass') reasons.push('Set local.result to pass.');
    } else {
      if (issue?.deployed?.result !== 'pass') reasons.push('Set deployed.result to pass.');
      if (typeof mergeSha !== 'string' || !mergeSha.trim()) {
        reasons.push('Provide pr.mergeSha.');
      } else if (typeof issue?.deployed?.buildSha !== 'string' || !issue.deployed.buildSha.includes(mergeSha)) {
        reasons.push('Include pr.mergeSha in deployed.buildSha.');
      }
    }
    if (reasons.length) {
      failures++;
      console.error(`Issue ${issue?.id ?? index + 1}: ${reasons.join(' ')}`);
    }
  }
  if (failures) process.exitCode = 1;
  else console.log(`PASS: ${record.issues.length} issues.`);
} catch (error) {
  console.error(error.message);
  process.exitCode = 1;
}
