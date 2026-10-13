/*
```mermaid
flowchart LR
  Read --> Strip --> Count --> Sentences --> Links --> Exit
```
*/
import { readFile, access } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';

function visibleLines(source) {
  let frontmatter = false;
  let fence;
  return source.split(/\r?\n/).map((line, index) => {
    if (index === 0 && line.trim() === '---') { frontmatter = true; return ''; }
    if (frontmatter) {
      if (/^(---|\.\.\.)\s*$/.test(line)) frontmatter = false;
      return '';
    }
    const marker = line.match(/^\s*(`{3,}|~{3,})/);
    if (fence) {
      if (marker && marker[1][0] === fence[0] && marker[1].length >= fence.length) fence = undefined;
      return '';
    }
    if (marker) { fence = marker[1]; return ''; }
    return line;
  });
}

const words = text => text.match(/[\p{L}\p{N}]+(?:['’-][\p{L}\p{N}]+)*/gu) ?? [];
const normalize = text => text.toLowerCase().replace(/[^\p{L}\p{N}]+/gu, '');
async function skillsRoot(file) {
  let folder = dirname(resolve(file));
  while (true) {
    try {
      await access(resolve(folder, 'SKILL.md'));
      return dirname(folder);
    } catch {
      const parent = dirname(folder);
      if (parent === folder) return dirname(dirname(resolve(file)));
      folder = parent;
    }
  }
}

const files = process.argv.slice(2);
if (!files.length) {
  console.error('Use: node check-skill-text.mjs <file...>');
  process.exitCode = 1;
}
for (const file of files) {
  try {
    const lines = visibleLines(await readFile(file, 'utf8'));
    const text = lines.join('\n');
    console.log(`${file}: ${words(text).length} words`);
    const report = (line, message) => {
      console.error(`${file}:${line}: ${message}`);
      process.exitCode = 1;
    };
    const headings = lines.flatMap(line => {
      const match = line.match(/^\s{0,3}#{1,6}\s+(.+?)(?:\s+#+)?$/);
      return match ? [normalize(match[1])] : [];
    });
    let paragraph = [];
    function checkParagraph() {
      const joined = paragraph.map(item => item.text).join('\n').replace(/[*`_~]/g, ' ');
      for (const match of joined.matchAll(/.+?(?:[.!?](?=[\s"'”’)]|$)|$)/gs)) {
        const sentence = match[0].trim();
        const count = words(sentence).length;
        if (count > 25) {
          const offset = match.index + match[0].search(/\S/);
          const line = paragraph[0].line + joined.slice(0, offset).split('\n').length - 1;
          report(line, `${count} words: ${sentence.replace(/\s+/g, ' ')}`);
        }
      }
      paragraph = [];
    }
    for (const [index, line] of lines.entries()) {
      if (!line.trim() || /^\s*(?:#{1,6}\s|[-*+]\s|\d+\.\s|\|)/.test(line)) checkParagraph();
      if (line.trim()) paragraph.push({ text: line, line: index + 1 });
      for (const match of line.matchAll(/(`?ui-loop-core`?[ \t]+)?§[ \t]*([\p{L}\p{N}][\p{L}\p{N}_–—-]*(?:[ \t]+[\p{L}\p{N}][\p{L}\p{N}_–—-]*)*)/gu)) {
        const target = normalize(match[2]);
        let targets = headings;
        if (match[1]) {
          try {
            const linked = visibleLines(await readFile(resolve(await skillsRoot(file), 'ui-loop-core/SKILL.md'), 'utf8'));
            targets = linked.filter(value => /^\s{0,3}#{1,6}\s/.test(value)).map(normalize);
          } catch {
            targets = [];
          }
        }
        if (!targets.some(heading => heading === target)) report(index + 1, `Find the target for ${match[0]}.`);
      }
      for (const match of line.matchAll(/(?:ui-loop-core\/|(?:\.\.\/)*)references\/[^\s`<>()[\]"']+\.md(?:#[^\s`<>()[\]"']*)?/g)) {
        const [target, anchor] = match[0].split('#');
        try {
          const root = target.startsWith('ui-loop-core/') ? await skillsRoot(file) : dirname(resolve(file));
          const absolute = resolve(root, target);
          await access(absolute);
          if (anchor) {
            const linked = visibleLines(await readFile(absolute, 'utf8'));
            const found = linked.some(value => /^\s*#{1,6}\s/.test(value) && normalize(value) === normalize(anchor));
            if (!found) throw new Error('Missing anchor');
          }
        } catch {
          report(index + 1, `Find the target for ${match[0]}.`);
        }
      }
    }
    checkParagraph();
  } catch (error) {
    console.error(`${file}: ${error.message}`);
    process.exitCode = 1;
  }
}
