/*
```mermaid
flowchart LR
  Read --> Issues --> Label
  Label -->|implemented| Local --> Exit
  Label -->|verified| Deployed --> SHA --> Exit
```
*/
import { readFile } from 'node:fs/promises';

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
  for (const [index, issue] of record.issues.entries()) {
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
