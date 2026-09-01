const fs = require('fs');
const path = require('path');
const babel = require('@babel/parser');
const traverse = require('@babel/traverse').default;

const baseDir = 'd:/icoded softwares/HRMS/one_click/mobile/src';
const globals = new Set([
  'require', 'console', 'Promise', 'Date', 'Math', 'Number', 'String', 'Array',
  'Object', 'Boolean', 'Set', 'Map', 'RegExp', 'isNaN', 'parseInt', 'parseFloat',
  'setTimeout', 'clearTimeout', 'setInterval', 'clearInterval', 'encodeURIComponent',
  'decodeURIComponent', 'global', 'window', 'document', 'navigator', 'FormData', 'Blob', 'File',
  'URL', 'URLSearchParams', 'fetch', 'Headers', 'Request', 'Response', 'Error', 'TypeError',
  'RangeError', 'SyntaxError', 'JSON', 'Symbol', 'Infinity', 'NaN', 'undefined', 'null'
]);

function getAllFiles(dir, allFiles = []) {
  const files = fs.readdirSync(dir);
  for (const file of files) {
    const fullPath = path.join(dir, file);
    if (fs.statSync(fullPath).isDirectory()) {
      getAllFiles(fullPath, allFiles);
    } else if (file.endsWith('.js') || file.endsWith('.jsx')) {
      allFiles.push(fullPath);
    }
  }
  return allFiles;
}

const allFiles = getAllFiles(baseDir);
console.log(`Scanning ${allFiles.length} files in mobile/src...`);

let issuesFound = 0;

for (const file of allFiles) {
  const code = fs.readFileSync(file, 'utf8');
  try {
    const ast = babel.parse(code, {
      sourceType: 'module',
      plugins: ['jsx']
    });

    let unboundInFile = [];
    traverse(ast, {
      ReferencedIdentifier(p) {
        const name = p.node.name;
        if (!p.scope.hasBinding(name) && !globals.has(name)) {
          // Exclude JSX pragma or common standard React elements
          if (name !== 'React' && name !== 'process') {
            unboundInFile.push({ name, line: p.node.loc?.start?.line });
          }
        }
      }
    });

    if (unboundInFile.length > 0) {
      console.log(`[ISSUE in ${path.relative(baseDir, file)}]:`, unboundInFile);
      issuesFound++;
    }
  } catch (err) {
    console.error(`[PARSE ERROR in ${path.relative(baseDir, file)}]:`, err.message);
    issuesFound++;
  }
}

console.log(`Scan completed. Total issues: ${issuesFound}`);
