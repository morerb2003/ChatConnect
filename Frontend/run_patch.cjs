const fs = require('fs');
const { execFileSync } = require('child_process');
const patch = fs.readFileSync('patch.diff', 'utf8');
execFileSync('apply_patch', [patch], { stdio: 'inherit' });
