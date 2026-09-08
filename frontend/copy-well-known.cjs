const fs = require('fs');
const path = require('path');

const src = path.join(__dirname, 'src', '.well-known', 'ic-domains');
const destDir = path.join(__dirname, 'dist', '.well-known');
const dest = path.join(destDir, 'ic-domains');

fs.mkdirSync(destDir, { recursive: true });
fs.copyFileSync(src, dest);
console.log('Copied .well-known/ic-domains to dist');
