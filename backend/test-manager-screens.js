const fs = require('fs');
const path = require('path');
const babel = require('@babel/parser');
const traverse = require('@babel/traverse').default;

const managerNavFile = 'd:/icoded softwares/HRMS/one_click/mobile/src/navigation/ManagerNavigator.js';
const code = fs.readFileSync(managerNavFile, 'utf8');

const ast = babel.parse(code, {
  sourceType: 'module',
  plugins: ['jsx']
});

const importedFiles = [];

traverse(ast, {
  ImportDeclaration(p) {
    const source = p.node.source.value;
    if (source.startsWith('.')) {
      const resolved = path.resolve('d:/icoded softwares/HRMS/one_click/mobile/src/navigation', source);
      importedFiles.push({ source, resolved });
    }
  }
});

console.log(`Checking ${importedFiles.length} imported files in ManagerNavigator...`);

for (const imp of importedFiles) {
  let target = imp.resolved;
  if (!fs.existsSync(target)) {
    if (fs.existsSync(target + '.js')) target += '.js';
    else if (fs.existsSync(target + '.jsx')) target += '.jsx';
    else if (fs.existsSync(path.join(target, 'index.js'))) target = path.join(target, 'index.js');
    else {
      console.error(`[MISSING FILE]: ${imp.source} -> ${target}`);
      continue;
    }
  }

  const screenCode = fs.readFileSync(target, 'utf8');
  try {
    babel.parse(screenCode, {
      sourceType: 'module',
      plugins: ['jsx']
    });
    console.log(`✓ OK: ${path.basename(target)}`);
  } catch (err) {
    console.error(`[SYNTAX ERROR in ${path.basename(target)}]:`, err.message);
  }
}
