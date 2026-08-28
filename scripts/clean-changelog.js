const fs = require('fs');
const path = require('path');

const root = path.resolve(__dirname, '..');
const output = path.join(root, 'changelog.md');

if (path.dirname(output) !== root || path.basename(output) !== 'changelog.md') {
  throw new Error(`Odmítnut neočekávaný výstup changelogu: ${output}`);
}

fs.rmSync(output, { force: true });
console.log('Changelog je připravený pro čisté generování.');
