const fs = require('node:fs');
const path = require('node:path');

const candidates = [
  path.join(__dirname, 'dist', 'main.js'),
  path.join(__dirname, 'dist', 'src', 'main.js'),
  path.join(__dirname, 'dist', 'apps', 'api', 'main.js'),
  path.join(__dirname, 'dist', 'apps', 'api', 'src', 'main.js'),
  path.join(__dirname, 'dist', 'api', 'main.js'),
  path.join(__dirname, 'dist', 'api', 'src', 'main.js'),
  path.join(__dirname, '..', '..', 'dist', 'apps', 'api', 'main.js'),
  path.join(__dirname, '..', '..', 'dist', 'apps', 'api', 'src', 'main.js'),
  path.join(__dirname, '..', '..', 'dist', 'api', 'main.js'),
  path.join(__dirname, '..', '..', 'dist', 'api', 'src', 'main.js'),
  path.join(__dirname, '..', '..', 'dist', 'main.js')
];

const target = candidates.find((candidate) => fs.existsSync(candidate));

if (!target) {
  console.error('Could not find compiled NestJS entrypoint. Checked:');
  for (const candidate of candidates) {
    console.error(`- ${candidate}`);
  }
  process.exit(1);
}

require(target);
