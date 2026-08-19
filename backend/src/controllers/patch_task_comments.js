const fs = require('fs');
const file = 'd:/icoded softwares/HRMS/icoded-hrms/backend/src/controllers/taskController.js';
let content = fs.readFileSync(file, 'utf8');

const injection = `
    const remarkToUse = typeof finalRemarks !== 'undefined' ? finalRemarks : (typeof remarks !== 'undefined' ? remarks : '');
    if (remarkToUse || (attachments && attachments.length > 0)) {
      task.comments.push({
        comment: remarkToUse ? 'Status updated: ' + remarkToUse : 'Status updated with attachment',
        senderName: req.user.name,
        senderRole: req.user.role,
        addedBy: req.user._id,
        attachments: attachments || [],
        createdAt: new Date()
      });
    }
`;

const fnsToPatch = ['inProcessTask', 'completeTask', 'lateCompleteTask', 'reopenTask', 'reInProcessTask', 'reCompleteTask', 'reLateCompleteTask'];

for (let fnName of fnsToPatch) {
  const regex = new RegExp('exports\\.' + fnName + '\\s*=\\s*async\\s*\\(req,\\s*res\\)\\s*=>\\s*\\{[\\s\\S]*?catch\\s*\\(error\\)\\s*\\{', 'g');
  content = content.replace(regex, (match) => {
    return match.replace(/await task\.save\(\);/g, injection + '\n    await task.save();');
  });
}

fs.writeFileSync(file, content);
console.log('Patched taskController.js successfully');
