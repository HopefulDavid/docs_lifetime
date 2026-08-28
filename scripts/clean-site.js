const fs = require('fs');
const path = require('path');

const root = path.resolve(__dirname, '..');
const output = path.join(root, '_site');

if (path.dirname(output) !== root || path.basename(output) !== '_site') {
  throw new Error(`Odmítnut neočekávaný výstupní adresář: ${output}`);
}

fs.rmSync(output, { recursive: true, force: true });
console.log('Výstupní adresář _site je připravený pro čisté sestavení.');
