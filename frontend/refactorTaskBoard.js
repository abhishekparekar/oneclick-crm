const fs = require('fs');
const path = require('path');

const targetFile = path.join(__dirname, 'src/pages/companyadmin/TaskBoard.jsx');
let content = fs.readFileSync(targetFile, 'utf8');

// 1. Add getActiveTaskStatusesApi import
content = content.replace(
  /export const updateTaskStatusApi.*?$/m, // Wait, it's importing from API. Let's just find the import block.
  ""
); // I'll just regex replace the specific import block
content = content.replace(
  /addTaskCommentApi,\n  uploadTaskAttachmentApi,/g,
  "addTaskCommentApi,\n  uploadTaskAttachmentApi,\n  getActiveTaskStatusesApi,"
);

// 2. Remove global STATUS_COLUMNS
const statusColRegex = /const STATUS_COLUMNS = \{[\s\S]*?\};\n\n/;
content = content.replace(statusColRegex, "");

// 3. Inject useQuery and useMemo inside TaskBoard component
const taskBoardDef = `const TaskBoard = () => {
  const queryClient = useQueryClient();`;
  
const injectedHooks = `
  const { data: activeStatusesRes } = useQuery({
    queryKey: ["activeTaskStatuses"],
    queryFn: getActiveTaskStatusesApi,
  });

  const STATUS_COLUMNS = useMemo(() => {
    const active = activeStatusesRes?.data?.statuses || [];
    if (active.length === 0) {
      return {
        todo: { label: "To Do", bg: "bg-slate-100 border-slate-300", text: "text-slate-800", dot: "bg-slate-500", rawBg: "#f1f5f9", rawText: "#1e293b", rawBorder: "#cbd5e1" },
        "in-progress": { label: "In Process", bg: "bg-blue-100 border-blue-300", text: "text-blue-800", dot: "bg-blue-500", rawBg: "#dbeafe", rawText: "#1e40af", rawBorder: "#bfdbfe" },
        completed: { label: "Complete", bg: "bg-emerald-100 border-emerald-300", text: "text-emerald-800", dot: "bg-emerald-600", rawBg: "#d1fae5", rawText: "#065f46", rawBorder: "#a7f3d0" },
      };
    }
    const cols = {};
    active.forEach(s => {
      cols[s.statusKey] = {
        label: s.label,
        bg: "", 
        text: "", 
        dot: "", 
        rawBg: s.backgroundColor || "#f1f5f9",
        rawText: s.color || "#1e293b",
        rawBorder: \`\${s.color}40\`,
      };
    });
    return cols;
  }, [activeStatusesRes]);
`;

content = content.replace(taskBoardDef, taskBoardDef + injectedHooks);

// 4. Replace className usages of STATUS_COLUMNS
// For line 959 (Board item) and 1149 (Detail drawer)
// Original: className={`px-2 py-0.5 border rounded text-[9px] font-bold capitalize ${STATUS_COLUMNS[t.status]?.bg || STATUS_COLUMNS.todo.bg} ${STATUS_COLUMNS[t.status]?.text || STATUS_COLUMNS.todo.text}`}
// Original: className={`px-2 py-0.5 rounded-full text-[9px] font-bold border capitalize ${STATUS_COLUMNS[selectedTask.status]?.bg || STATUS_COLUMNS.todo.bg} ${STATUS_COLUMNS[selectedTask.status]?.text || STATUS_COLUMNS.todo.text}`}

content = content.replace(
  /className=\{`([^`]*?)\$\{STATUS_COLUMNS\[(.*?)\]\?\.bg \|\| STATUS_COLUMNS\.todo\.bg\} \$\{STATUS_COLUMNS\[\2\]\?\.text \|\| STATUS_COLUMNS\.todo\.text\}`\}/g,
  (match, p1, p2) => {
    return \`className="\${p1.trim()}" style={{ backgroundColor: STATUS_COLUMNS[\${p2}]?.rawBg || '#f1f5f9', color: STATUS_COLUMNS[\${p2}]?.rawText || '#1e293b', borderColor: STATUS_COLUMNS[\${p2}]?.rawBorder || '#cbd5e1' }}\`;
  }
);

// Detail drawer quick shift buttons:
// className={\`px-3 py-1.5 rounded-xl border text-[10px] font-black capitalize transition-all cursor-pointer \${
//   selectedTask.status === statusKey
//     ? \`\${col.bg} \${col.text} border-primary/20 scale-102 ring-2 ring-primary/10\`
//     : "bg-white text-slate-500 border-slate-205 hover:bg-slate-50 hover:text-slate-700"
// }\`}
// Replace with something cleaner that uses rawBg, rawText
const quickShiftRegex = /className=\{`([^`]*?)\$\{\s*selectedTask\.status === statusKey[\s\S]*?: "([^"]*?)"\s*\}`\}/m;

content = content.replace(quickShiftRegex, \`className="\${p1.trim()}" 
                      style={{ 
                        backgroundColor: selectedTask.status === statusKey ? col.rawBg : '#ffffff', 
                        color: selectedTask.status === statusKey ? col.rawText : '#64748b',
                        borderColor: selectedTask.status === statusKey ? col.rawBorder : '#e2e8f0',
                        transform: selectedTask.status === statusKey ? 'scale(1.02)' : 'none',
                        boxShadow: selectedTask.status === statusKey ? \`0 0 0 2px \${col.rawBorder}\` : 'none'
                      }}\`);

fs.writeFileSync(targetFile, content);
console.log("Refactored TaskBoard.jsx");
