import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { fetchCensus } from './fetch/census.ts';
import { fetchMedsl } from './fetch/medsl.ts';
import { fetchPushbuild } from './fetch/pushbuild.ts';
import { fetchTlc } from './fetch/tlc.ts';
import { buildAll, verifyBuild, writeAll, writeReference } from './build.ts';

const root = fileURLToPath(new URL('..', import.meta.url));
const rawRoot = join(root, 'data/raw');

const cmd = process.argv[2];
const date = process.argv[3] ?? new Date().toISOString().slice(0, 10);
if (cmd === 'fetch-census') {
  console.log('Wrote snapshot', await fetchCensus(rawRoot, date));
} else if (cmd === 'fetch-pushbuild') {
  console.log('Wrote snapshot', await fetchPushbuild(rawRoot, date, process.argv[4]));
} else if (cmd === 'fetch-tlc') {
  console.log('Wrote snapshot', await fetchTlc(rawRoot, date));
} else if (cmd === 'fetch-medsl') {
  console.log('Wrote snapshot', await fetchMedsl(rawRoot, date, process.argv[4]));
} else if (cmd === 'fill-reference') {
  console.log('Wrote', writeReference(root));
} else if (cmd === 'build') {
  const files = await buildAll(root);
  writeAll(root, files);
  console.log(`Built ${files.size} files`);
} else if (cmd === 'verify') {
  const problems = await verifyBuild(root);
  if (problems.length > 0) {
    console.error(`verify FAILED:\n${problems.join('\n')}`);
    process.exit(1);
  }
  console.log('verify OK: rebuilt output is byte-identical to the committed output');
} else {
  console.error(
    'usage: node pipeline/cli.ts <fetch-census|fetch-pushbuild|fetch-tlc|fetch-medsl [YYYY-MM-DD] [sha] | fill-reference | build | verify>',
  );
  process.exit(1);
}
