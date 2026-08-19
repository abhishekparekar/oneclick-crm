const fs = require('fs');

const iconMap = {
  'c:/ongoing/icoded/src/pages/manager/ManagerTeamTasks.jsx': 'CheckSquare',
  'c:/ongoing/icoded/src/pages/manager/ManagerTeamLeaves.jsx': 'CalendarOff',
  'c:/ongoing/icoded/src/pages/manager/ManagerSettings.jsx': 'SettingsIcon',
  'c:/ongoing/icoded/src/pages/manager/ManagerReports.jsx': 'BarChart2',
  'c:/ongoing/icoded/src/pages/manager/ManagerProjects.jsx': 'Folder',
  'c:/ongoing/icoded/src/pages/manager/ManagerMyTasks.jsx': 'CheckSquare',
  'c:/ongoing/icoded/src/pages/manager/ManagerMyLeave.jsx': 'CalendarOff',
  'c:/ongoing/icoded/src/pages/manager/ManagerAnnouncements.jsx': 'Megaphone',
  'c:/ongoing/icoded/src/pages/companyadmin/Announcements.jsx': 'Megaphone',
};

for (const [file, icon] of Object.entries(iconMap)) {
  if (fs.existsSync(file)) {
    let content = fs.readFileSync(file, 'utf8');
    let importRegex = /import\s+\{([^}]+)\}\s+from\s+["']lucide-react["']/;
    let match = content.match(importRegex);
    if (match) {
      let imports = match[1];
      // Check for whole word match
      let hasIcon = new RegExp('\\b' + icon + '\\b').test(imports);
      if (!hasIcon && icon !== 'SettingsIcon') {
        let newImports = imports + ', ' + icon;
        content = content.replace(importRegex, 'import { ' + newImports + ' } from "lucide-react"');
        fs.writeFileSync(file, content, 'utf8');
        console.log('Added ' + icon + ' to ' + file);
      }
    }
  }
}
