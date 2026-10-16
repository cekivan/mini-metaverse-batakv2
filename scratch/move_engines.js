const fs = require('fs');
const path = require('path');

const engines = ['batak.js', 'batak4.js', 'billiard.js', 'tavla.js', 'okey101.js'];
const targetDir = 'src/engines';
if (!fs.existsSync(targetDir)) {
    fs.mkdirSync(targetDir, { recursive: true });
}

engines.forEach(file => {
    const srcPath = file;
    const destPath = path.join(targetDir, file);
    fs.copyFileSync(srcPath, destPath);
    console.log(`Copied ${file} -> ${destPath}`);

    // Overwrite root file with proxy export
    const proxyCode = `// ${file} - Root Proxy to src/engines/${file}\nmodule.exports = require('./src/engines/${file}');\n`;
    fs.writeFileSync(file, proxyCode, 'utf8');
    console.log(`Created proxy for root ${file}`);
});
