const fs = require('fs');
const pages = [
  'SuperAdminCompanies', 'SuperAdminRequests', 'SuperAdminCompanyAdmins',
  'SuperAdminSubscriptions', 'SuperAdminPlans', 'SuperAdminPayments',
  'SuperAdminUsers', 'SuperAdminAnnouncements', 'SuperAdminSupportTickets',
  'SuperAdminReports', 'SuperAdminActivityLogs', 'SuperAdminSettings', 'SuperAdminProfile'
];
pages.forEach(p => {
  fs.writeFileSync('./src/pages/superadmin/' + p + '.jsx', 
  `import React from 'react';\n\nconst ${p} = () => {\n  return (\n    <div className="p-6">\n      <h1 className="text-2xl font-bold text-slate-800">${p}</h1>\n    </div>\n  );\n};\n\nexport default ${p};\n`
  );
});
console.log('Pages generated.');
