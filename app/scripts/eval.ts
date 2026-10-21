// npm run eval -> runs eval/danger_eval.csv through checkDanger and writes evidence/results.md
import fs from 'node:fs';
import path from 'node:path';
import { checkDanger } from '../lib/student/checkDanger';
import { dangerRules } from '../lib/rules';

const root = path.resolve(__dirname, '..', '..');
const rows = fs.readFileSync(path.join(root, 'eval', 'danger_eval.csv'), 'utf8').trim().split(/\r?\n/).slice(1).map((line) => {
  const [id, lang, ...rest] = line.split(',');
  const expected = rest.pop() as string;
  return { id, lang, question: rest.join(','), expected };
});

try {
  let caught = 0, rightAction = 0, falseAlarms = 0;
  const dangerous = rows.filter((r) => r.expected !== 'none');
  const safe = rows.filter((r) => r.expected === 'none');
  const missed: string[] = [];
  const alarms: string[] = [];
  for (const r of dangerous) {
    const hit = checkDanger(r.question, dangerRules);
    if (hit) { caught++; if (hit.action === r.expected) rightAction++; }
    else missed.push(`${r.id} ${r.question}`);
  }
  for (const r of safe) {
    const hit = checkDanger(r.question, dangerRules);
    if (hit) { falseAlarms++; alarms.push(`${r.id} ${r.question} -> ${hit.id}`); }
  }
  console.log(`Danger questions caught: ${caught}/${dangerous.length} (right action: ${rightAction}/${dangerous.length})`);
  console.log(`False alarms on safe questions: ${falseAlarms}/${safe.length}`);
  if (missed.length) console.log('\nMISSED (improve your rules, do not edit the eval file):\n  ' + missed.join('\n  '));
  if (alarms.length) console.log('\nFALSE ALARMS:\n  ' + alarms.join('\n  '));

  const file = path.join(root, 'evidence', 'results.md');
  let md = fs.readFileSync(file, 'utf8');
  md = md.replace(/- Danger questions caught: .*/, `- Danger questions caught: ${caught}/${dangerous.length}`);
  md = md.replace(/- False alarms on safe questions: .*/, `- False alarms on safe questions: ${falseAlarms}/${safe.length}`);
  fs.writeFileSync(file, md);
  console.log('\nWrote evidence/results.md');
} catch (e) {
  if (e instanceof Error && e.message.includes('TODO(implementation)')) {
    console.log('checkDanger is not implemented yet (TODO). Complete lib/student/checkDanger.ts, then run this again.');
  } else {
    throw e;
  }
}
