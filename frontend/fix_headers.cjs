const fs = require('fs');
const path = require('path');
function getFiles(dir, files_) {
  files_ = files_ || [];
  let files = fs.readdirSync(dir);
  for (let i in files) {
    let name = dir + '/' + files[i];
    if (fs.statSync(name).isDirectory()) {
      getFiles(name, files_);
    } else {
      files_.push(name);
    }
  }
  return files_;
}
const files = getFiles('c:/ongoing/icoded/src/pages');
const pages = files.filter(f => f.endsWith('.jsx'));

const iconMap = {
  'ManagerTeamTasks': 'CheckSquare',
  'ManagerTeamMembers': 'Users',
  'ManagerTeamLeaves': 'CalendarOff',
  'ManagerSettings': 'Settings', 
  'ManagerReports': 'BarChart2',
  'ManagerProjects': 'Folder',
  'ManagerProfile': 'UserCircle',
  'ManagerMyTasks': 'CheckSquare',
  'ManagerMyLeave': 'CalendarOff',
  'ManagerAttendance': 'Calendar',
  'ManagerAnnouncements': 'Megaphone',
  'Announcements': 'Megaphone',
  'CompanyProfile': 'UserCircle',
};

for (let file of pages) {
  let content = fs.readFileSync(file, 'utf8');
  if (content.includes('<PageHeader')) {
    let base = path.basename(file, '.jsx');
    if (base === 'ManagerDashboard') continue; // already done
    let icon = iconMap[base] || 'LayoutDashboard';
    
    if (base === 'ManagerSettings' && content.includes('Settings as SettingsIcon')) {
       icon = 'SettingsIcon';
    }

    let replaced = false;
    // Replace single-line <PageHeader breadcrumbs={[...]} title="xyz">
    content = content.replace(/<PageHeader\s+breadcrumbs=\{[^}]+\}\s+title=([^>]+)>/g, (match, title) => {
      replaced = true;
      let cleanTitle = title.trim();
      return '<PageHeader title=' + cleanTitle + ' icon={' + icon + '}>';
    });
    
    // Replace multiline <PageHeader
    content = content.replace(/<PageHeader[\s\S]*?breadcrumbs=\{[^}]+\}[\s\S]*?title=([^>]+)>/g, (match, title) => {
      replaced = true;
      let cleanTitle = title.trim();
      return '<PageHeader title=' + cleanTitle + ' icon={' + icon + '}>';
    });

    if (replaced) {
      let importRegex = /import\s+\{([^}]+)\}\s+from\s+["']lucide-react["']/;
      let match = content.match(importRegex);
      if (match) {
        let imports = match[1];
        if (!imports.includes(icon) && icon !== 'SettingsIcon') {
          let newImports = imports + ', ' + icon;
          content = content.replace(importRegex, 'import { ' + newImports + ' } from "lucide-react"');
        }
      } else {
        // If no lucide-react import exists, create one
        content = 'import { ' + icon + ' } from "lucide-react";\n' + content;
      }
      fs.writeFileSync(file, content, 'utf8');
      console.log('Updated ' + file);
    }
  }
}
