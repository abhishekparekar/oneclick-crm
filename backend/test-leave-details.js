async function test() {
  try {
    const loginRes = await fetch('http://localhost:5000/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: 'manager@gmail.com', // Let's try manager@gmail.com
        password: 'password123'
      })
    });
    const loginData = await loginRes.json();
    if (!loginData.success) {
      console.log("Login failed", loginData);
      
      const loginRes2 = await fetch('http://localhost:5000/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: 'admin@gmail.com', // Try admin maybe
          password: 'password123'
        })
      });
      const loginData2 = await loginRes2.json();
      console.log("Admin login:", loginData2);
      return;
    }
    const token = loginData.token;
    console.log("Logged in:", loginData.user?.email || "success");
    
    // Get all team leaves to find a valid ID
    const leavesRes = await fetch('http://localhost:5000/api/manager/team-leaves', {
      headers: { Authorization: `Bearer ${token}` }
    });
    const leavesData = await leavesRes.json();
    
    if (!leavesData.data) {
       console.log("No leaves data:", leavesData);
       return;
    }
    
    const leaves = leavesData.data.leaves || [];
    console.log(`Found ${leaves.length} team leaves`);
    
    if (leaves.length > 0) {
      const leaveId = leaves[0]._id;
      console.log(`Testing getTeamLeaveById for ${leaveId} (employee ${leaves[0].employeeId?.fullName})...`);
      
      try {
         const detailRes = await fetch(`http://localhost:5000/api/manager/team-leaves/${leaveId}`, {
           headers: { Authorization: `Bearer ${token}` }
         });
         const detailData = await detailRes.json();
         if (!detailRes.ok) {
           console.error("ERROR fetching leave details:", detailRes.status, detailData);
         } else {
           console.log("SUCCESS:", detailData.data.leave._id);
         }
      } catch (err) {
         console.error("ERROR fetching leave details:", err);
      }
    }
  } catch (error) {
    console.error("Failed:", error);
  }
}
test();
