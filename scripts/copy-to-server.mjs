// Copies the production build into the static resources of the Spring server, which then serves the client itself
// (one origin, one port). The old build is removed first: the file names of the bundles contain hashes.
import { cpSync, existsSync, mkdirSync, readdirSync, rmSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const build = join(root, 'dist', 'musicStreamClient');
const target = resolve(root, '..', 'musicStreamServer', 'src', 'main', 'resources', 'static');

if (!existsSync(join(build, 'index.html'))) {
  console.error(`No build found in ${build}`);
  process.exit(1);
}
if (!existsSync(resolve(root, '..', 'musicStreamServer', 'pom.xml'))) {
  console.error(`The server project was not found next to the client: ${target}`);
  process.exit(1);
}

mkdirSync(target, { recursive: true });
readdirSync(target).forEach((entry) => rmSync(join(target, entry), { recursive: true, force: true }));
cpSync(build, target, { recursive: true });
console.log(`Copied ${build} to ${target}`);
