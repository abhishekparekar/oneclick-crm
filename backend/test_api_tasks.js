const axios = require('axios');
const jwt = require('jsonwebtoken');
const dns = require('dns');
dns.setServers(['8.8.8.8', '8.8.4.4']);
const mongoose = require('mongoose');
require('dotenv').config({ path: 'd:/icoded softwares/HRMS/one_click/backend/.env' });

async function run() {
  const uri = "mongodb+srv://Abhiparekar58:Abhi%408485@oneclick.zy12ers.mongodb.net/icoded_hrms?retryWrites=true&w=majority";
  await mongoose.connect(uri);
  const User = mongoose.model('User', new mongoose.Schema({}, { strict: false }));
  const user = await User.findOne({ name: /abhishek/i }).lean();
  console.log('User found:', user.name, user._id, user.companyId);

  const secret = process.env.JWT_SECRET || "oneclick_secret_key_2026";
  const token = jwt.sign({ id: user._id, role: user.role, companyId: user.companyId }, secret, { expiresIn: '1h' });

  // Update activeMobileToken on user to pass session validation if needed
  const crypto = require('crypto');
  const tokenHash = crypto.createHash('sha256').update(token).digest('hex');
  await User.updateOne({ _id: user._id }, { activeMobileToken: tokenHash, activeWebToken: tokenHash });

  // 1. Call /api/manager/tasks/my
  const myRes = await axios.get('http://localhost:5000/api/manager/tasks/my', {
    headers: { Authorization: `Bearer ${token}`, 'X-Platform': 'mobile' }
  });
  console.log('GET /tasks/my data length:', myRes.data?.data?.length);

  // 2. Call /api/manager/tasks/team without params
  const teamRes = await axios.get('http://localhost:5000/api/manager/tasks/team', {
    headers: { Authorization: `Bearer ${token}`, 'X-Platform': 'mobile' }
  });
  console.log('GET /tasks/team without params - tasks length:', teamRes.data?.tasks?.length, 'data length:', teamRes.data?.data?.length);

  // 3. Call /api/manager/tasks/team with { limit: 200 }
  const teamRes200 = await axios.get('http://localhost:5000/api/manager/tasks/team?limit=200', {
    headers: { Authorization: `Bearer ${token}`, 'X-Platform': 'mobile' }
  });
  console.log('GET /tasks/team with limit=200 - tasks length:', teamRes200.data?.tasks?.length);

  if (teamRes.data?.tasks) {
    console.log('Tasks returned in GET /tasks/team:');
    teamRes.data.tasks.forEach(t => {
      const assignees = (t.assignedTo || []).map(a => a.fullName || a.firstName || a?._id || a);
      console.log(`- [${t.taskId}] "${t.title}" | assignedTo: [${assignees.join(', ')}] | status: ${t.status}`);
    });
  }

  // 4. Call templates
  const tplRes = await axios.get('http://localhost:5000/api/manager/tasks/team?isTemplate=true', {
    headers: { Authorization: `Bearer ${token}`, 'X-Platform': 'mobile' }
  });
  console.log('GET /tasks/team templates count:', tplRes.data?.data?.length);

  await mongoose.disconnect();
}

run().catch(e => {
  console.error('Error:', e?.response?.data || e.message);
  process.exit(1);
});
