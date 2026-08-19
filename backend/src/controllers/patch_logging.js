const fs = require('fs');
const file = 'd:/icoded softwares/HRMS/icoded-hrms/backend/src/controllers/taskController.js';
let content = fs.readFileSync(file, 'utf8');

const functions = [
  'inProcessTask',
  'completeTask',
  'lateCompleteTask',
  'reopenTask',
  'reInProcessTask',
  'reCompleteTask',
  'reLateCompleteTask'
];

for (let fn of functions) {
  const regex = new RegExp(`exports\\.${fn}\\s*=\\s*async\\s*\\(req,\\s*res\\)\\s*=>\\s*\\{`);
  const logLine = `exports.${fn} = async (req, res) => {\n    const fs = require('fs');\n    fs.appendFileSync('d:/icoded softwares/HRMS/icoded-hrms/backend/upload-debug.log', \`[\${new Date().toISOString()}] ${fn} request received. Body: \${JSON.stringify(req.body)}\\n\`);`;
  content = content.replace(regex, logLine);
}

fs.writeFileSync(file, content);
console.log("Patched logging successfully");
