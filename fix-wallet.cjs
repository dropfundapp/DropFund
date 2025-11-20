const fs = require('fs');

let content = fs.readFileSync('src/App.jsx', 'utf8');

// Find and replace the wallet wrapper onClick
const pattern = /(<div ref=\{walletDropdownRef\}\s+onClick=\{)\(e\) => \{[^}]+console\.log\([^)]+\);[^}]+e\.stopPropagation\(\);[^}]+\}\}/;

const replacement = `$1(e) => {
                  const now = Date.now();
                  const timeSince = now - walletClickTimeRef.current;
                  console.log('🔵 Click capture', e.target, 'ms since last:', timeSince);
                  if (timeSince < 300) {
                    console.log('❌ BLOCKED duplicate');
                    e.preventDefault();
                    e.stopPropagation();
                    return;
                  }
                  walletClickTimeRef.current = now;
                }}
                onClick={(e) => {
                  console.log('🔵 Click bubble');
                  e.stopPropagation();
                }}`.replace('onClick', 'onClickCapture');

content = content.replace(pattern, replacement);

fs.writeFileSync('src/App.jsx', content);
console.log('Updated!');
