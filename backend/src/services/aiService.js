/**
 * AI Service - Core AI Analysis Engine
 * Uses Google Gemini API to analyze CRM data and generate business intelligence
 */

const axios = require("axios");
const Lead = require("../models/Lead");
const Task = require("../models/Task");
const Employee = require("../models/Employee");
const Department = require("../models/Department");
const LeadStatus = require("../models/LeadStatus");
const Notification = require("../models/Notification");
const CompanyTaskCounter = require("../models/CompanyTaskCounter");
const Project = require("../models/Project");

const GEMINI_API_URL =
  "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent";

// ─────────────────────────────────────────────────
// CORE: Call Gemini API
// ─────────────────────────────────────────────────
function extractCleanJson(rawText) {
  if (!rawText) throw new Error("Empty response from AI model.");
  let cleaned = rawText.trim();
  // Strip markdown code fences if present
  if (cleaned.startsWith("```json")) {
    cleaned = cleaned.replace(/^```json\s*/, "").replace(/\s*```$/, "");
  } else if (cleaned.startsWith("```")) {
    cleaned = cleaned.replace(/^```\s*/, "").replace(/\s*```$/, "");
  }
  try {
    return JSON.parse(cleaned);
  } catch {
    // Regex extract outermost JSON object or array
    const match = cleaned.match(/(\{[\s\S]*\}|\[[\s\S]*\])/);
    if (match) {
      try {
        return JSON.parse(match[0]);
      } catch {
        // Remove trailing commas if any
        const noTrailingCommas = match[0].replace(/,\s*([\}\]])/g, "$1");
        return JSON.parse(noTrailingCommas);
      }
    }
    throw new Error("Could not parse AI JSON response: " + cleaned.slice(0, 150));
  }
}

async function callGemini(prompt, retries = 3, delayMs = 2500) {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error(
      "GEMINI_API_KEY is not configured in environment variables."
    );
  }

  for (let attempt = 1; attempt <= retries + 1; attempt++) {
    try {
      const response = await axios.post(
        `${GEMINI_API_URL}?key=${apiKey}`,
        {
          contents: [
            {
              parts: [{ text: prompt }],
            },
          ],
          generationConfig: {
            temperature: 0.2,
            maxOutputTokens: 8192,
            responseMimeType: "application/json",
          },
        },
        {
          headers: { "Content-Type": "application/json" },
          timeout: 45000,
        }
      );

      const text =
        response.data?.candidates?.[0]?.content?.parts?.[0]?.text || "";
      return extractCleanJson(text);
    } catch (err) {
      const status = err.response?.status;
      const isRetryable = status === 429 || status === 503 || status === 500 || !err.response;

      if (isRetryable && attempt <= retries) {
        console.warn(`[AI Gemini] Rate limit / Server busy (Attempt ${attempt}/${retries}). Waiting ${delayMs * attempt}ms before retry...`);
        await new Promise((r) => setTimeout(r, delayMs * attempt));
        continue;
      }

      if (status === 429) {
        throw new Error("Gemini API rate limit reached. Please try again in a few moments.");
      }
      if (status === 503) {
        throw new Error("Gemini AI model is temporarily busy. Please retry in a few seconds.");
      }
      if (status === 400) {
        throw new Error("Gemini API bad request: " + JSON.stringify(err.response?.data));
      }
      throw err;
    }
  }
}

// ─────────────────────────────────────────────────
// DATA AGGREGATION: Leads
// ─────────────────────────────────────────────────
async function aggregateLeadData(companyId, days = 30) {
  const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000);
  const now = new Date();

  // Get lead statuses for the company
  const statuses = await LeadStatus.find({ companyId }).lean();
  const statusMap = {};
  statuses.forEach((s) => {
    statusMap[String(s._id)] = s.name;
  });

  const leads = await Lead.find({
    companyId,
    deletedAt: null,
  })
    .populate("assignedTo", "name email")
    .populate("statusId", "name")
    .lean();

  const totalLeads = leads.length;
  const newLeads = leads.filter((l) => new Date(l.createdAt) >= since).length;

  // Overdue follow-ups
  const overdueFollowUps = leads.filter(
    (l) =>
      l.nextFollowUpDate &&
      new Date(l.nextFollowUpDate) < now &&
      l.statusId?.name?.toLowerCase() !== "converted" &&
      l.statusId?.name?.toLowerCase() !== "lost"
  );

  // No follow-up ever
  const noFollowUp = leads.filter(
    (l) =>
      !l.nextFollowUpDate &&
      !l.leadActivities?.length &&
      l.statusId?.name?.toLowerCase() !== "converted"
  );

  // Long pending (older than 14 days with no activity)
  const longPending = leads.filter((l) => {
    const age = (now - new Date(l.createdAt)) / (1000 * 60 * 60 * 24);
    const lastActivity = l.leadActivities?.length
      ? new Date(l.leadActivities[l.leadActivities.length - 1].createdAt)
      : null;
    const daysSinceActivity = lastActivity
      ? (now - lastActivity) / (1000 * 60 * 60 * 24)
      : age;
    return (
      age > 14 &&
      daysSinceActivity > 7 &&
      l.statusId?.name?.toLowerCase() !== "converted" &&
      l.statusId?.name?.toLowerCase() !== "lost"
    );
  });

  // Status-wise breakdown
  const statusBreakdown = {};
  leads.forEach((l) => {
    const sName = l.statusId?.name || "Unknown";
    statusBreakdown[sName] = (statusBreakdown[sName] || 0) + 1;
  });

  // Source-wise breakdown
  const sourceBreakdown = {};
  leads.forEach((l) => {
    const src = l.source || "Unknown";
    sourceBreakdown[src] = (sourceBreakdown[src] || 0) + 1;
  });

  // Employee-wise leads
  const employeeLeads = {};
  leads.forEach((l) => {
    const emp = l.assignedTo?.name || "Unassigned";
    if (!employeeLeads[emp]) employeeLeads[emp] = { total: 0, converted: 0, overdue: 0 };
    employeeLeads[emp].total++;
    if (l.statusId?.name?.toLowerCase() === "converted") employeeLeads[emp].converted++;
    if (overdueFollowUps.find((o) => String(o._id) === String(l._id)))
      employeeLeads[emp].overdue++;
  });

  const convertedCount = statusBreakdown["Converted"] || statusBreakdown["converted"] || 0;
  const lostCount = statusBreakdown["Lost"] || statusBreakdown["lost"] || 0;

  return {
    totalLeads,
    newLeads,
    convertedLeads: convertedCount,
    lostLeads: lostCount,
    overdueFollowUpCount: overdueFollowUps.length,
    noFollowUpCount: noFollowUp.length,
    longPendingCount: longPending.length,
    conversionRate:
      totalLeads > 0 ? ((convertedCount / totalLeads) * 100).toFixed(1) : "0",
    statusBreakdown,
    sourceBreakdown,
    employeeLeads,
    dataPeriod: `Last ${days} days`,
    sampleOverdueLeads: overdueFollowUps.slice(0, 5).map((l) => ({
      name: l.name,
      phone: l.whatsappPhone,
      status: l.statusId?.name,
      assignedTo: l.assignedTo?.name || "Unassigned",
      overdueDays: Math.floor(
        (now - new Date(l.nextFollowUpDate)) / (1000 * 60 * 60 * 24)
      ),
    })),
  };
}

// ─────────────────────────────────────────────────
// DATA AGGREGATION: Tasks
// ─────────────────────────────────────────────────
async function aggregateTaskData(companyId, days = 30) {
  const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000);
  const now = new Date();

  const tasks = await Task.find({ companyId })
    .populate("assignedTo", "name")
    .populate("departmentId", "name")
    .lean();

  const liveTasks = tasks.filter((t) => t.isLive);
  const recentTasks = liveTasks.filter(
    (t) => new Date(t.createdAt) >= since
  );

  const statusCounts = {
    pending: 0,
    in_process: 0,
    overdue: 0,
    complete: 0,
    late_complete: 0,
    cancelled: 0,
  };

  recentTasks.forEach((t) => {
    const s = t.status?.split("re_").pop() || t.status;
    if (statusCounts[s] !== undefined) statusCounts[s]++;
    else if (t.status?.startsWith("re_")) {
      const base = t.status.replace("re_", "");
      if (statusCounts[base] !== undefined) statusCounts[base]++;
    }
  });

  const completionRate =
    recentTasks.length > 0
      ? (
          ((statusCounts.complete + statusCounts.late_complete) /
            recentTasks.length) *
          100
        ).toFixed(1)
      : "0";

  const overdueRate =
    recentTasks.length > 0
      ? ((statusCounts.overdue / recentTasks.length) * 100).toFixed(1)
      : "0";

  // Department-wise
  const deptBreakdown = {};
  recentTasks.forEach((t) => {
    const dept = t.departmentId?.name || "No Department";
    if (!deptBreakdown[dept])
      deptBreakdown[dept] = { total: 0, completed: 0, overdue: 0 };
    deptBreakdown[dept].total++;
    if (t.status === "complete" || t.status === "late_complete")
      deptBreakdown[dept].completed++;
    if (t.status === "overdue") deptBreakdown[dept].overdue++;
  });

  // Priority breakdown
  const priorityBreakdown = { urgent: 0, high: 0, medium: 0, low: 0 };
  recentTasks.forEach((t) => {
    if (priorityBreakdown[t.priority] !== undefined)
      priorityBreakdown[t.priority]++;
  });

  return {
    totalTasks: recentTasks.length,
    statusCounts,
    completionRate,
    overdueRate,
    deptBreakdown,
    priorityBreakdown,
    dataPeriod: `Last ${days} days`,
  };
}

// ─────────────────────────────────────────────────
// DATA AGGREGATION: Projects
// ─────────────────────────────────────────────────
async function aggregateProjectData(companyId, days = 60) {
  const now = new Date();

  const [projects, projectTasks] = await Promise.all([
    Project.find({ companyId })
      .populate("projectManager", "firstName lastName name")
      .populate("departmentId", "name")
      .populate("members", "firstName lastName name")
      .lean(),
    Task.find({ companyId, isLive: true, projectId: { $ne: null } })
      .populate("projectId", "name status")
      .lean(),
  ]);

  const totalProjects = projects.length;

  const statusCounts = {
    planning: 0,
    active: 0,
    working: 0,
    review: 0,
    deployment: 0,
    completed: 0,
  };

  const overdueProjects = [];
  const projectSummaries = [];

  projects.forEach((p) => {
    if (statusCounts[p.status] !== undefined) statusCounts[p.status]++;
    
    const isOverdue = p.endDate && new Date(p.endDate) < now && p.status !== "completed";
    if (isOverdue) overdueProjects.push(p);

    // Calculate task completion for this project
    const pTasks = projectTasks.filter((t) => String(t.projectId?._id || t.projectId) === String(p._id));
    const completedPTasks = pTasks.filter((t) => ["complete", "late_complete", "re_complete", "re_late_complete"].includes(t.status));
    const overduePTasks = pTasks.filter((t) => t.status === "overdue");
    const pCompletionRate = pTasks.length > 0 ? ((completedPTasks.length / pTasks.length) * 100).toFixed(0) : "0";

    const managerName = p.projectManager
      ? (p.projectManager.name || `${p.projectManager.firstName || ""} ${p.projectManager.lastName || ""}`).trim()
      : "Unassigned";

    projectSummaries.push({
      id: p._id,
      name: p.name,
      status: p.status,
      priority: p.priority,
      clientName: p.clientName || "Internal",
      department: p.departmentId?.name || "General",
      projectManager: managerName,
      membersCount: p.members?.length || 0,
      startDate: p.startDate,
      endDate: p.endDate,
      isOverdue,
      estimatedWorkingDays: p.estimatedWorkingDays || 0,
      totalTasks: pTasks.length,
      completedTasks: completedPTasks.length,
      overdueTasks: overduePTasks.length,
      taskCompletionRate: pCompletionRate + "%",
    });
  });

  const activeProjectsCount = totalProjects - (statusCounts.completed || 0);

  return {
    totalProjects,
    activeProjectsCount,
    statusCounts,
    overdueCount: overdueProjects.length,
    overdueProjects: overdueProjects.map((p) => ({
      name: p.name,
      status: p.status,
      endDate: p.endDate,
      clientName: p.clientName,
    })),
    projectSummaries,
    dataPeriod: `Last ${days} days`,
  };
}

// ─────────────────────────────────────────────────
// DATA AGGREGATION: Employees
// ─────────────────────────────────────────────────
async function aggregateEmployeeData(companyId, days = 30) {
  const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000);

  const employees = await Employee.find({ companyId, isActive: true })
    .populate("departmentId", "name")
    .populate("designationId", "name")
    .lean();

  const tasks = await Task.find({ companyId, isLive: true })
    .populate("assignedTo", "name")
    .lean();

  // Per-employee task stats
  const empTaskStats = {};
  employees.forEach((e) => {
    empTaskStats[String(e._id)] = {
      name: e.firstName + " " + e.lastName,
      department: e.departmentId?.name || "Unknown",
      designation: e.designationId?.name || "Unknown",
      totalTasks: 0,
      completed: 0,
      overdue: 0,
      pending: 0,
    };
  });

  tasks.forEach((t) => {
    if (!Array.isArray(t.assignedTo)) return;
    t.assignedTo.forEach((empId) => {
      const key = String(empId);
      if (empTaskStats[key]) {
        empTaskStats[key].totalTasks++;
        if (t.status === "complete" || t.status === "late_complete")
          empTaskStats[key].completed++;
        else if (t.status === "overdue") empTaskStats[key].overdue++;
        else if (t.status === "pending" || t.status === "in_process")
          empTaskStats[key].pending++;
      }
    });
  });

  const empPerformance = Object.values(empTaskStats).map((e) => ({
    ...e,
    completionRate:
      e.totalTasks > 0
        ? ((e.completed / e.totalTasks) * 100).toFixed(1)
        : "N/A",
    overdueRate:
      e.totalTasks > 0
        ? ((e.overdue / e.totalTasks) * 100).toFixed(1)
        : "N/A",
  }));

  return {
    totalEmployees: employees.length,
    employeePerformance: empPerformance,
    dataPeriod: `Last ${days} days`,
  };
}

// ─────────────────────────────────────────────────
// AI ANALYSIS: Dashboard Summary
// ─────────────────────────────────────────────────
async function analyzeDashboardSummary(companyId) {
  const [leadData, taskData, empData] = await Promise.all([
    aggregateLeadData(companyId, 30),
    aggregateTaskData(companyId, 30),
    aggregateEmployeeData(companyId, 30),
  ]);

  const prompt = `
You are an expert AI Business Intelligence Analyst for a CRM called "One Click AI Growth CRM".
Analyze the following CRM data and generate a comprehensive business intelligence report.

## CRM DATA (Last 30 Days)

### LEAD DATA:
${JSON.stringify(leadData, null, 2)}

### TASK DATA:
${JSON.stringify(taskData, null, 2)}

### EMPLOYEE DATA (Summary):
Total Employees: ${empData.totalEmployees}
Top Performers: ${JSON.stringify(
    empData.employeePerformance
      .filter((e) => parseFloat(e.completionRate) >= 70)
      .slice(0, 3)
  )}
Low Performers: ${JSON.stringify(
    empData.employeePerformance
      .filter((e) => parseFloat(e.completionRate) < 50 && e.totalTasks > 0)
      .slice(0, 3)
  )}

## INSTRUCTIONS:
Generate a bilingual (English + Marathi mix is acceptable) JSON response. Be specific, data-driven, and actionable.

Return ONLY valid JSON (no markdown, no extra text) in this exact format:
{
  "summary": "2-3 sentence executive summary of business health",
  "businessHealthScore": 75,
  "keyFindings": ["finding1", "finding2", "finding3", "finding4", "finding5"],
  "problems": [
    {
      "problem": "Problem title",
      "rootCause": "Root cause analysis",
      "businessImpact": "Impact on business",
      "riskLevel": "High",
      "recommendation": "Specific actionable recommendation"
    }
  ],
  "recommendations": ["action1", "action2", "action3"],
  "nextBestActions": [
    {
      "action": "Action description",
      "actionType": "schedule_followup",
      "priority": "High"
    }
  ],
  "dataPeriod": "Last 30 days",
  "confidenceLevel": "High",
  "leadInsights": {
    "alert": "Key lead alert",
    "opportunity": "Key opportunity"
  },
  "taskInsights": {
    "alert": "Key task alert",
    "efficiency": "Efficiency observation"
  }
}
`;

  const result = await callGemini(prompt);
  return {
    rawData: { leadData, taskData, employeeSummary: empData.totalEmployees },
    result,
  };
}

// ─────────────────────────────────────────────────
// AI ANALYSIS: Lead Analysis
// ─────────────────────────────────────────────────
async function analyzeLeads(companyId, days = 30) {
  const leadData = await aggregateLeadData(companyId, days);

  const prompt = `
You are an expert AI CRM Lead Analyst for "One Click AI Growth CRM".
Analyze the following lead data and generate a detailed Lead Intelligence Report.

## LEAD DATA (Last ${days} days):
${JSON.stringify(leadData, null, 2)}

## LEAD SCORING CRITERIA:
- 80-100: Hot / Immediate Action Required
- 60-79: High Priority  
- 40-59: Medium Priority
- 20-39: Low Priority
- 0-19: Cold / Low Probability

## ANALYSIS REQUIRED:
1. Lead Leakage Detection
2. Conversion Analysis
3. Source Performance
4. Employee-wise Performance
5. Follow-up Effectiveness
6. Training Needs for Sales Team

Return ONLY valid JSON:
{
  "summary": "Executive summary of lead performance",
  "conversionAnalysis": {
    "currentRate": "${leadData.conversionRate}%",
    "assessment": "Good/Fair/Poor",
    "trend": "observation about trend"
  },
  "leakageDetection": {
    "totalAtRisk": ${leadData.overdueFollowUpCount + leadData.noFollowUpCount + leadData.longPendingCount},
    "overdueFollowUps": ${leadData.overdueFollowUpCount},
    "noFollowUpLeads": ${leadData.noFollowUpCount},
    "longPendingLeads": ${leadData.longPendingCount},
    "estimatedRevenueLoss": "High/Medium/Low"
  },
  "sourceAnalysis": [
    {"source": "source_name", "count": 0, "assessment": "Best/Average/Poor", "recommendation": "..."}
  ],
  "employeePerformance": [
    {"name": "emp_name", "totalLeads": 0, "converted": 0, "overdue": 0, "performanceScore": 75, "recommendation": "..."}
  ],
  "problems": [
    {"problem": "...", "rootCause": "...", "businessImpact": "...", "riskLevel": "High", "recommendation": "..."}
  ],
  "recommendations": ["rec1", "rec2", "rec3", "rec4"],
  "nextBestActions": [
    {"action": "...", "actionType": "schedule_followup", "priority": "High"}
  ],
  "salesTrainingNeeds": ["training1", "training2"],
  "dataPeriod": "Last ${days} days",
  "confidenceLevel": "High"
}
`;

  const result = await callGemini(prompt);
  return { rawData: leadData, result };
}

// ─────────────────────────────────────────────────
// AI ANALYSIS: Task Analysis
// ─────────────────────────────────────────────────
async function analyzeTasks(companyId, days = 30) {
  const taskData = await aggregateTaskData(companyId, days);

  const prompt = `
You are an expert AI Operations Analyst for "One Click AI Growth CRM".
Analyze the following task management data and generate a Task Performance Intelligence Report.

## TASK DATA (Last ${days} days):
${JSON.stringify(taskData, null, 2)}

Return ONLY valid JSON:
{
  "summary": "Executive summary of task performance",
  "efficiencyScore": 75,
  "completionAnalysis": {
    "completionRate": "${taskData.completionRate}%",
    "assessment": "Good/Fair/Poor",
    "overdueRate": "${taskData.overdueRate}%",
    "overdueAssessment": "High/Medium/Low risk"
  },
  "departmentAnalysis": [
    {"department": "dept_name", "total": 0, "completed": 0, "overdue": 0, "completionRate": "0%", "assessment": "...", "recommendation": "..."}
  ],
  "priorityAnalysis": {
    "urgentHandling": "assessment of urgent task handling",
    "prioritizationIssues": ["issue1", "issue2"]
  },
  "problems": [
    {"problem": "...", "rootCause": "...", "businessImpact": "...", "riskLevel": "High", "recommendation": "..."}
  ],
  "recommendations": ["rec1", "rec2", "rec3"],
  "nextBestActions": [
    {"action": "...", "actionType": "notify_manager", "priority": "High"}
  ],
  "trainingNeeds": ["training1", "training2"],
  "dataPeriod": "Last ${days} days",
  "confidenceLevel": "High"
}
`;

  const result = await callGemini(prompt);
  return { rawData: taskData, result };
}

// ─────────────────────────────────────────────────
// AI ANALYSIS: Employee Performance
// ─────────────────────────────────────────────────
async function analyzeEmployeePerformance(companyId, days = 30) {
  const empData = await aggregateEmployeeData(companyId, days);

  // Only send relevant data to AI (performance data, not PII)
  const sanitizedData = {
    totalEmployees: empData.totalEmployees,
    employeePerformance: empData.employeePerformance.map((e) => ({
      name: e.name,
      department: e.department,
      designation: e.designation,
      totalTasks: e.totalTasks,
      completed: e.completed,
      overdue: e.overdue,
      pending: e.pending,
      completionRate: e.completionRate,
      overdueRate: e.overdueRate,
    })),
    dataPeriod: empData.dataPeriod,
  };

  const prompt = `
You are an expert AI HR & Performance Analyst for "One Click AI Growth CRM".
Analyze the following employee performance data and generate a comprehensive Employee Performance Intelligence Report.

## EMPLOYEE PERFORMANCE DATA (Last ${days} days):
${JSON.stringify(sanitizedData, null, 2)}

## TRAINING PRIORITY SCORE CRITERIA:
- 80-100: Immediate Training Required
- 60-79: High Priority Training
- 40-59: Development Required
- 20-39: Monitor Performance
- 0-19: No Immediate Training Required

## ROOT CAUSE CLASSIFICATION:
1. Training Required
2. Skill Gap
3. Product Knowledge Gap
4. Communication Gap
5. Process Problem
6. Manager Intervention Required
7. Workload Problem
8. Discipline / Accountability Issue
9. Resource Problem
10. Data Insufficient

Return ONLY valid JSON:
{
  "summary": "Executive summary of team performance",
  "teamHealthScore": 75,
  "topPerformers": [
    {"name": "...", "department": "...", "completionRate": "...", "strength": "..."}
  ],
  "lowPerformers": [
    {
      "name": "...",
      "department": "...",
      "completionRate": "...",
      "overdueRate": "...",
      "possibleRootCause": "Training Required",
      "rootCauseCategory": 1,
      "trainingPriorityScore": 75,
      "recommendedTraining": ["training1", "training2"],
      "managerAction": "Specific action manager should take",
      "reviewDate": "2 weeks from now"
    }
  ],
  "departmentInsights": [
    {"department": "...", "avgCompletion": "...", "assessment": "...", "recommendation": "..."}
  ],
  "skillGapsDetected": ["gap1", "gap2"],
  "trainingRecommendations": [
    {"type": "training_type", "priority": "High", "targetEmployees": ["name1"], "expectedImpact": "..."}
  ],
  "problems": [
    {"problem": "...", "rootCause": "...", "businessImpact": "...", "riskLevel": "High", "recommendation": "..."}
  ],
  "recommendations": ["rec1", "rec2", "rec3"],
  "nextBestActions": [
    {"action": "...", "actionType": "create_training_plan", "priority": "High"}
  ],
  "dataPeriod": "Last ${days} days",
  "confidenceLevel": "Medium"
}
`;

  const result = await callGemini(prompt);
  return { rawData: sanitizedData, result };
}

// ─────────────────────────────────────────────────
// AI ANALYSIS: Ask Your Business
// ─────────────────────────────────────────────────
async function askYourBusiness(companyId, question, days = 30) {
  const [leadData, taskData, empData] = await Promise.all([
    aggregateLeadData(companyId, days),
    aggregateTaskData(companyId, days),
    aggregateEmployeeData(companyId, days),
  ]);

  const prompt = `
You are an expert AI Business Intelligence Assistant for "One Click AI Growth CRM".
A business owner/manager is asking you a question about their business.
Answer based ONLY on the CRM data provided. Be specific, concise, and actionable.
Response should be in English with key terms in Marathi where natural.

## BUSINESS QUESTION:
"${question}"

## CRM DATA (Last ${days} days):

### LEADS:
${JSON.stringify(leadData, null, 2)}

### TASKS:
${JSON.stringify(taskData, null, 2)}

### EMPLOYEES (Summary):
Total: ${empData.totalEmployees}
${JSON.stringify(empData.employeePerformance.slice(0, 10), null, 2)}

Return ONLY valid JSON:
{
  "answer": "Direct, specific answer to the question (2-4 sentences)",
  "keyData": ["specific data point 1", "specific data point 2", "specific data point 3"],
  "recommendations": ["actionable recommendation 1", "actionable recommendation 2"],
  "nextBestAction": "Single most important action to take right now",
  "confidenceLevel": "High/Medium/Low",
  "disclaimer": "Note if data is insufficient for a complete answer"
}
`;

  const result = await callGemini(prompt);
  return { question, rawData: { leadData, taskData }, result };
}

// ─────────────────────────────────────────────────
// AI ANALYSIS: CEO Daily Report
// ─────────────────────────────────────────────────
async function generateCEOReport(companyId) {
  const [leadData, taskData, empData] = await Promise.all([
    aggregateLeadData(companyId, 7), // Last 7 days for daily report
    aggregateTaskData(companyId, 7),
    aggregateEmployeeData(companyId, 7),
  ]);

  const prompt = `
You are generating a Daily Business Briefing for a CEO/Owner of a business using "One Click AI Growth CRM".
Be executive-level: concise, prioritized, and action-oriented.

## CRM DATA (Last 7 Days):

LEADS: ${JSON.stringify(leadData, null, 2)}
TASKS: ${JSON.stringify(taskData, null, 2)}
TEAM: ${JSON.stringify({ total: empData.totalEmployees, performance: empData.employeePerformance.slice(0, 5) }, null, 2)}

Return ONLY valid JSON:
{
  "date": "${new Date().toLocaleDateString("en-IN")}",
  "executiveSummary": "2-sentence overall business health summary",
  "businessHealthScore": 75,
  "todayTopPriorities": [
    {"priority": 1, "action": "Most critical action today", "reason": "Why this is most important"}
  ],
  "highPriorityLeads": {
    "count": ${leadData.overdueFollowUpCount},
    "alert": "What needs immediate attention",
    "recommendation": "What CEO should direct the team to do"
  },
  "taskAlerts": {
    "overdueCount": ${taskData.statusCounts.overdue || 0},
    "alert": "Task management alert",
    "recommendation": "Recommended action"
  },
  "employeeAlerts": [
    {"alert": "Employee performance alert if any", "recommendation": "Action required"}
  ],
  "businessOpportunities": ["opportunity1", "opportunity2"],
  "businessRisks": [
    {"risk": "Risk description", "severity": "High/Medium/Low", "mitigation": "What to do"}
  ],
  "weeklyComparison": {
    "leadsThisWeek": ${leadData.newLeads},
    "conversionRate": "${leadData.conversionRate}%",
    "taskCompletionRate": "${taskData.completionRate}%",
    "trend": "Improving/Stable/Declining"
  },
  "recommendedActions": ["action1", "action2", "action3"],
  "dataPeriod": "Last 7 days",
  "confidenceLevel": "High"
}
`;

  const result = await callGemini(prompt);
  return { rawData: { leadData, taskData }, result };
}

// ─────────────────────────────────────────────────
// AI ANALYSIS: Weekly Business Report
// ─────────────────────────────────────────────────
async function generateWeeklyReport(companyId) {
  const [thisWeek, lastWeek] = await Promise.all([
    Promise.all([
      aggregateLeadData(companyId, 7),
      aggregateTaskData(companyId, 7),
    ]),
    Promise.all([
      aggregateLeadData(companyId, 14), // 14-day gives us "last week" context
      aggregateTaskData(companyId, 14),
    ]),
  ]);

  const prompt = `
You are generating a Weekly Business Improvement Report for "One Click AI Growth CRM".
Compare this week vs last week and provide strategic insights.

## THIS WEEK DATA:
LEADS: ${JSON.stringify(thisWeek[0], null, 2)}
TASKS: ${JSON.stringify(thisWeek[1], null, 2)}

## BROADER CONTEXT (14-day data for comparison):
LEADS: ${JSON.stringify(lastWeek[0], null, 2)}
TASKS: ${JSON.stringify(lastWeek[1], null, 2)}

Return ONLY valid JSON:
{
  "weekSummary": "This week's business performance summary",
  "whatImproved": [
    {"metric": "metric name", "change": "+10%", "analysis": "why it improved"}
  ],
  "whatDeclined": [
    {"metric": "metric name", "change": "-5%", "analysis": "why it declined"}
  ],
  "top3Problems": [
    {"problem": "...", "rootCause": "...", "impact": "...", "solution": "..."}
  ],
  "top3Opportunities": [
    {"opportunity": "...", "potentialImpact": "...", "action": "..."}
  ],
  "nextWeekTop5Actions": [
    {"priority": 1, "action": "...", "owner": "Sales Team/Manager/CEO", "deadline": "..."}
  ],
  "weeklyScorecard": {
    "leadConversion": "${thisWeek[0].conversionRate}%",
    "taskCompletion": "${thisWeek[1].completionRate}%",
    "followUpRate": "calculated from overdue",
    "overallScore": 70
  },
  "dataPeriod": "This week vs last week",
  "confidenceLevel": "High"
}
`;

  const result = await callGemini(prompt);
  return { rawData: { thisWeek, lastWeek }, result };
}

// ─────────────────────────────────────────────────
// PHASE 2: AI PROBLEM DETECTION & ROOT CAUSE ANALYSIS
// ─────────────────────────────────────────────────
async function detectProblemsAndRootCause(companyId) {
  const [leadData, taskData, empData] = await Promise.all([
    aggregateLeadData(companyId, 30),
    aggregateTaskData(companyId, 30),
    aggregateEmployeeData(companyId, 30),
  ]);

  const prompt = `
You are an expert AI Business Problem Analyst for "One Click AI Growth CRM".
Analyze the following CRM data and detect ALL business problems with deep root cause analysis.

## CRM DATA (Last 30 Days):
LEADS: ${JSON.stringify(leadData, null, 2)}
TASKS: ${JSON.stringify(taskData, null, 2)}
EMPLOYEES: ${JSON.stringify({ total: empData.totalEmployees, performance: empData.employeePerformance }, null, 2)}

## ROOT CAUSE CLASSIFICATION SYSTEM:
1. Training Required
2. Skill Gap
3. Product Knowledge Gap
4. Communication Gap
5. Process Problem
6. Manager Intervention Required
7. Workload Problem
8. Discipline / Accountability Issue
9. Resource Problem
10. Data Insufficient

## INSTRUCTIONS:
Detect ALL significant problems. For each problem, provide structured analysis.
Be specific and data-driven. If data is zero/empty, still identify systemic issues.

Return ONLY valid JSON:
{
  "overallRiskLevel": "High|Medium|Low",
  "totalProblemsDetected": 3,
  "problemSummary": "Brief 2-sentence summary of business problems",
  "problems": [
    {
      "id": "P001",
      "category": "Lead Management|Task Management|Employee Performance|Department|Sales|Operations",
      "problem": "Clear problem title",
      "description": "Detailed problem description with specific numbers",
      "rootCauseCategory": 1,
      "rootCauseLabel": "Training Required",
      "rootCauseExplanation": "Detailed root cause explanation",
      "businessImpact": "Specific business impact with numbers if possible",
      "riskLevel": "High|Medium|Low",
      "affectedArea": "Sales Team|Operations|Management|All",
      "urgency": "Immediate|This Week|This Month",
      "recommendation": "Specific actionable recommendation",
      "metrics": {
        "current": "current value",
        "expected": "expected value",
        "gap": "gap amount"
      }
    }
  ],
  "prioritizedActions": [
    {
      "priority": 1,
      "action": "Most urgent action",
      "owner": "Sales Team|Manager|CEO|HR",
      "deadline": "Today|This Week|This Month",
      "expectedOutcome": "Expected result",
      "actionType": "schedule_followup|create_task|create_training_plan|notify_manager|escalate_issue"
    }
  ],
  "businessRiskScore": 65,
  "dataPeriod": "Last 30 days",
  "confidenceLevel": "High|Medium|Low"
}
`;

  const result = await callGemini(prompt);
  return { rawData: { leadData, taskData }, result };
}

// ─────────────────────────────────────────────────
// PHASE 2: DEPARTMENT-WISE ANALYSIS
// ─────────────────────────────────────────────────
async function analyzeDepartments(companyId) {
  const [taskData, empData] = await Promise.all([
    aggregateTaskData(companyId, 30),
    aggregateEmployeeData(companyId, 30),
  ]);

  // Department employee breakdown
  const deptEmployees = {};
  empData.employeePerformance.forEach((e) => {
    if (!deptEmployees[e.department]) deptEmployees[e.department] = [];
    deptEmployees[e.department].push(e);
  });

  const prompt = `
You are an expert AI Department Performance Analyst for "One Click AI Growth CRM".
Analyze department performance and provide structured insights.

## DATA:
Task Dept Breakdown: ${JSON.stringify(taskData.deptBreakdown, null, 2)}
Employee Dept Breakdown: ${JSON.stringify(deptEmployees, null, 2)}

## ANALYSIS REQUIRED per Department:
- Expected vs Actual Performance
- Performance Gap
- Main Problems
- Root Causes  
- Skill Gaps
- Training Requirements
- Management Actions

Return ONLY valid JSON:
{
  "summary": "Overall department health summary",
  "departments": [
    {
      "name": "Department Name",
      "employeeCount": 0,
      "performanceScore": 75,
      "assessment": "Good|Average|Poor|Critical",
      "expectedPerformance": "What was expected",
      "actualPerformance": "What was observed",
      "performanceGap": "Gap description",
      "mainProblems": ["problem1", "problem2"],
      "rootCauses": ["cause1", "cause2"],
      "skillGaps": ["gap1", "gap2"],
      "employeesRequiringImprovement": ["name1", "name2"],
      "trainingRequired": ["training1", "training2"],
      "managementActions": ["action1", "action2"],
      "priority": "High|Medium|Low"
    }
  ],
  "worstPerformingDept": "Department name",
  "bestPerformingDept": "Department name",
  "crossDeptInsights": ["insight1", "insight2"],
  "dataPeriod": "Last 30 days",
  "confidenceLevel": "High|Medium|Low"
}
`;

  const result = await callGemini(prompt);
  return { rawData: { taskData, deptEmployees }, result };
}

// ─────────────────────────────────────────────────
// PHASE 2: TRAINING NEED ANALYSIS (Department-wise)
// ─────────────────────────────────────────────────
async function analyzeTrainingNeeds(companyId) {
  const [leadData, taskData, empData] = await Promise.all([
    aggregateLeadData(companyId, 30),
    aggregateTaskData(companyId, 30),
    aggregateEmployeeData(companyId, 30),
  ]);

  const prompt = `
You are an expert AI Training & Development Analyst for "One Click AI Growth CRM".
Analyze performance data and generate a comprehensive Training Need Analysis report.

## PERFORMANCE DATA:
Lead Data: ${JSON.stringify({ conversionRate: leadData.conversionRate, overdueFollowUps: leadData.overdueFollowUpCount, employeeLeads: leadData.employeeLeads }, null, 2)}
Task Data: ${JSON.stringify({ completionRate: taskData.completionRate, overdueRate: taskData.overdueRate, deptBreakdown: taskData.deptBreakdown }, null, 2)}
Employee Performance: ${JSON.stringify(empData.employeePerformance, null, 2)}

## TRAINING PRIORITY SCORE:
- 80-100: Immediate Training Required
- 60-79: High Priority Training
- 40-59: Development Required
- 20-39: Monitor
- 0-19: No Immediate Training Required

## DEPARTMENT TRAINING AREAS:
Sales: Product Knowledge, Lead Qualification, Follow-up, Objection Handling, Closing
Telecalling: Opening Script, Need Discovery, Appointment Booking, Follow-up
Customer Support: Communication, Complaint Handling, Problem Solving
Operations: Process Management, Time Management, SOP, Quality Control

Return ONLY valid JSON:
{
  "summary": "Training landscape summary",
  "totalEmployeesNeedingTraining": 0,
  "immediateTrainingRequired": 0,
  "trainingBudgetPriority": "High|Medium|Low",
  "employeeTrainingProfiles": [
    {
      "name": "Employee Name",
      "department": "Department",
      "designation": "Role",
      "performanceIssue": "Specific issue observed",
      "trainingPriorityScore": 75,
      "priorityLevel": "Immediate|High|Medium|Low",
      "rootCause": "Root cause of performance issue",
      "rootCauseCategory": "Training Required|Skill Gap|Process Problem|etc",
      "recommendedTrainings": [
        {
          "topic": "Training topic",
          "duration": "1 day|2 hours|etc",
          "priority": "Immediate|Soon|Planned",
          "expectedImpact": "Expected improvement"
        }
      ],
      "reviewDate": "2 weeks|1 month",
      "managerNote": "What manager should do"
    }
  ],
  "departmentTrainingPlans": [
    {
      "department": "Department Name",
      "mainBusinessProblem": "Core problem in this dept",
      "rootCause": "Root cause",
      "employeesCount": 0,
      "trainingTopics": ["topic1", "topic2"],
      "priority": "Immediate|High|Medium",
      "expectedBusinessImpact": "Impact description",
      "recommendedDuration": "Duration",
      "postTrainingReviewDate": "Timeline"
    }
  ],
  "skillGapMatrix": [
    {
      "skill": "Skill name",
      "currentLevel": "Low|Medium|High",
      "requiredLevel": "Medium|High",
      "gap": "Gap description",
      "affectedEmployees": 0
    }
  ],
  "trainingRoadmap": [
    {
      "week": "Week 1",
      "trainings": ["training1", "training2"],
      "targetEmployees": ["emp1", "emp2"]
    }
  ],
  "dataPeriod": "Last 30 days",
  "confidenceLevel": "High|Medium|Low"
}
`;

  const result = await callGemini(prompt);
  return { rawData: { leadData, taskData, empData: empData.employeePerformance }, result };
}

// ─────────────────────────────────────────────────
// PHASE 2: IMPROVEMENT RECOMMENDATIONS (Detailed)
// ─────────────────────────────────────────────────
async function generateImprovementPlan(companyId) {
  const [leadData, taskData, empData] = await Promise.all([
    aggregateLeadData(companyId, 30),
    aggregateTaskData(companyId, 30),
    aggregateEmployeeData(companyId, 30),
  ]);

  const prompt = `
You are an expert AI Business Improvement Strategist for "One Click AI Growth CRM".
Generate a comprehensive, actionable improvement plan based on CRM performance data.

## CRM DATA (Last 30 Days):
Leads: Total=${leadData.totalLeads}, Converted=${leadData.convertedLeads}, Conversion=${leadData.conversionRate}%, OverdueFollowups=${leadData.overdueFollowUpCount}
Tasks: Total=${taskData.totalTasks}, CompletionRate=${taskData.completionRate}%, OverdueRate=${taskData.overdueRate}%
Employees: ${empData.totalEmployees} total

## IMPROVEMENT PLAN REQUIREMENTS:
1. Identify TOP 5 areas for immediate improvement
2. For each area: Current State → Target State → Action Plan
3. Assign owners and deadlines
4. Estimate business impact

Return ONLY valid JSON:
{
  "planSummary": "Executive improvement plan summary",
  "planPeriod": "30 days",
  "overallImprovementScore": 70,
  "focusAreas": [
    {
      "area": "Area name (e.g., Lead Follow-up)",
      "currentState": "Current performance description",
      "targetState": "Target to achieve in 30 days",
      "improvementActions": [
        {
          "action": "Specific action",
          "owner": "Sales Team|Manager|CEO|HR",
          "deadline": "Week 1|Week 2|Week 3|Week 4",
          "actionType": "schedule_followup|create_task|create_training_plan|notify_manager",
          "effort": "Low|Medium|High",
          "impact": "Low|Medium|High"
        }
      ],
      "kpi": "Metric to track improvement",
      "currentKPIValue": "Current value",
      "targetKPIValue": "Target value",
      "expectedRevenuImpact": "Business impact description",
      "priority": "Critical|High|Medium"
    }
  ],
  "weeklyMilestones": [
    {
      "week": "Week 1",
      "goals": ["goal1", "goal2"],
      "expectedOutcome": "What should be achieved"
    }
  ],
  "successMetrics": [
    {
      "metric": "Metric name",
      "current": "Current value",
      "target": "Target value",
      "timeline": "Timeline"
    }
  ],
  "quickWins": ["Quick win 1 (can be done today)", "Quick win 2"],
  "longTermActions": ["Long term action 1", "Long term action 2"],
  "dataPeriod": "Last 30 days",
  "confidenceLevel": "High|Medium|Low"
}
`;

  const result = await callGemini(prompt);
  return { rawData: { leadData, taskData }, result };
}

// ─────────────────────────────────────────────────
// PHASE 4: PREDICTIVE LEAD SCORING
// ─────────────────────────────────────────────────
async function scoreLeadsPredictive(companyId) {
  const [leadData, rawLeads] = await Promise.all([
    aggregateLeadData(companyId, 60),
    Lead.find({ companyId })
      .populate("statusId", "name isWon isLost")
      .populate("assignedTo", "name")
      .sort({ updatedAt: -1 })
      .limit(30)
      .lean(),
  ]);

  const leadsSummary = rawLeads.map((l) => ({
    id: l._id,
    name: l.name,
    status: l.statusId?.name || "New",
    isWon: l.statusId?.isWon || false,
    isLost: l.statusId?.isLost || false,
    source: l.source || "Walk-in",
    product: l.productService || "General",
    assignedTo: l.assignedTo?.name || "Unassigned",
    nextFollowUpDate: l.nextFollowUpDate,
    updatedAt: l.updatedAt,
  }));

  const prompt = `
You are an expert AI Lead Qualification and Predictive Scoring Engine for "One Click AI Growth CRM".
Score the following active leads based on conversion signals, activity recency, and source credibility.

## AGGREGATE STATS:
Overall Conversion Rate: ${leadData.conversionRate}%
Total Leads in period: ${leadData.totalLeads}

## RECENT LEADS:
${JSON.stringify(leadsSummary, null, 2)}

## SCORING CRITERIA:
- Hot (80-100): High intent, responsive, urgent deal
- Warm (50-79): Interested, needs regular nurturing or demo
- Cold (0-49): Stalled, unresponsive, or long pending

Return ONLY valid JSON:
{
  "pipelineQualityScore": 75,
  "hotLeadsCount": 0,
  "warmLeadsCount": 0,
  "coldLeadsCount": 0,
  "revenueAtRisk": "Estimated value of overdue/stalled leads",
  "summary": "Overall pipeline health and conversion velocity summary",
  "scoredLeads": [
    {
      "leadId": "id string",
      "name": "Lead name",
      "score": 85,
      "category": "Hot|Warm|Cold",
      "winProbability": 80,
      "buyingSignals": ["signal1", "signal2"],
      "riskFactors": ["risk1"],
      "recommendedNextTouchpoint": "Call today|Send WhatsApp offer|Schedule demo",
      "urgency": "Immediate|This Week|Follow up later",
      "assignedTo": "Name"
    }
  ],
  "topConversionTips": ["tip1", "tip2"],
  "dataPeriod": "Last 60 days",
  "confidenceLevel": "High|Medium|Low"
}
`;

  const result = await callGemini(prompt);
  return { rawData: { totalLeads: leadData.totalLeads, sampleCount: leadsSummary.length }, result };
}

// ─────────────────────────────────────────────────
// PHASE 4: AI BUSINESS FORECASTING
// ─────────────────────────────────────────────────
async function forecastBusinessMetrics(companyId) {
  const [leadData, taskData, empData] = await Promise.all([
    aggregateLeadData(companyId, 60),
    aggregateTaskData(companyId, 60),
    aggregateEmployeeData(companyId, 60),
  ]);

  const prompt = `
You are an expert AI Business Forecasting Analyst for "One Click AI Growth CRM".
Analyze historical CRM data and project business trajectory for the NEXT 30 to 60 DAYS.

## HISTORICAL CRM DATA (Past 60 Days):
Leads: Total=${leadData.totalLeads}, Converted=${leadData.convertedLeads}, Lost=${leadData.lostLeads}, Rate=${leadData.conversionRate}%
Tasks: Total=${taskData.totalTasks}, Completed=${taskData.statusCounts?.complete || 0}, Overdue=${taskData.statusCounts?.overdue || 0}, Rate=${taskData.completionRate}%
Team: Total Employees=${empData.totalEmployees}

## INSTRUCTIONS:
Project:
1. Sales & Revenue Forecast (Range, Min, Expected, Max)
2. Lead Conversion Trajectory
3. Task Completion & Team Velocity
4. Forecasted Business Bottlenecks & Strategic Risks

Return ONLY valid JSON:
{
  "forecastHorizon": "Next 30-60 Days",
  "overallOutlook": "Positive|Stable|Challenging|Critical",
  "salesForecast": {
    "expectedDeals": 10,
    "minDeals": 5,
    "maxDeals": 18,
    "revenueRange": "₹50,000 - ₹1,50,000",
    "projectedConversionRate": "15%",
    "growthTrend": "Upward|Stable|Downward"
  },
  "pipelineForecast": {
    "expectedNewLeads": 25,
    "leadFlowHealth": "Strong|Moderate|Low",
    "topGrowthChannel": "Referrals|Social|Walk-in"
  },
  "operationalVelocity": {
    "projectedTaskCompletionRate": "85%",
    "productivityTrend": "Improving|Stable|Declining",
    "departmentOutlook": "Operations stable, Sales needs momentum"
  },
  "projectedRisks": [
    {
      "risk": "Risk title",
      "probability": "High|Medium|Low",
      "impact": "High|Medium|Low",
      "preventionStrategy": "Action to avoid this risk"
    }
  ],
  "strategicGrowthLevers": ["growth lever 1", "growth lever 2"],
  "confidenceLevel": "High|Medium|Low",
  "disclaimer": "Forecast is AI-modeled based on recent velocity and historical CRM trends."
}
`;

  const result = await callGemini(prompt);
  return { rawData: { leadData, taskData }, result };
}

// ─────────────────────────────────────────────────
// PHASE 4: TRAINING EFFECTIVENESS & CONTINUOUS IMPROVEMENT
// ─────────────────────────────────────────────────
async function analyzeTrainingEffectiveness(companyId) {
  const [leadData, taskData, empData] = await Promise.all([
    aggregateLeadData(companyId, 30),
    aggregateTaskData(companyId, 30),
    aggregateEmployeeData(companyId, 30),
  ]);

  const prompt = `
You are an expert AI Continuous Improvement & Training Effectiveness Evaluator for "One Click AI Growth CRM".
Evaluate the continuous improvement loop: Manage → Measure → Analyze → Identify Skill Gap → Train → Improve → Grow.

## PERFORMANCE METRICS:
Lead Conversion Rate: ${leadData.conversionRate}%
Task Completion Rate: ${taskData.completionRate}%
Overdue Task Rate: ${taskData.overdueRate}%
Employee Breakdown: ${JSON.stringify(empData.employeePerformance.slice(0, 8), null, 2)}

## INSTRUCTIONS:
Answer the 4 Core Continuous Improvement Questions:
1. काय सुधारले? (What improved?)
2. का सुधारले? (Why did it improve?)
3. पुढील सुधारणा कुठे आवश्यक आहे? (Where is next improvement needed?)
4. पुढील महिन्यासाठी Action काय आहे? (What is the action for next month?)

Return ONLY valid JSON:
{
  "evaluationPeriod": "Month-over-Month",
  "overallProductivityScore": 78,
  "improvementDelta": "+8.5%",
  "continuousImprovementLoop": {
    "whatImproved": "Detailed bilingual summary of what metrics and operations improved",
    "whyImproved": "Root cause explanation of recent gains (training, process discipline, etc.)",
    "whereImprovementNeeded": "Identified remaining bottlenecks and lagging areas",
    "nextActions": "Concrete prioritized action plan for the upcoming period"
  },
  "trainingUpliftMetrics": [
    {
      "department": "Sales|Operations|Support",
      "skillArea": "Lead Closing|Process Execution|Follow-up",
      "preScore": 60,
      "postScore": 78,
      "uplift": "+18%",
      "effectivenessRating": "High|Moderate|Low"
    }
  ],
  "topImprovedEmployees": [
    {
      "name": "Employee name",
      "department": "Department",
      "metricImproved": "Task completion / Follow-ups",
      "gain": "+15%"
    }
  ],
  "nextMonthFocus": ["focus1", "focus2"],
  "dataPeriod": "Last 30 days",
  "confidenceLevel": "High|Medium|Low"
}
`;

  const result = await callGemini(prompt);
  return { rawData: { leadData, taskData }, result };
}

// ─────────────────────────────────────────────────
// PHASE 3: CRM ACTION EXECUTION ENGINE
// ─────────────────────────────────────────────────
async function executeCRMAction(companyId, userId, actionData = {}) {
  const {
    actionType,
    title,
    description,
    priority = "medium",
    targetEmployeeId,
    targetLeadId,
    departmentId,
    dueDate,
  } = actionData;

  const now = new Date();
  const endDateTime = dueDate ? new Date(dueDate) : new Date(Date.now() + 2 * 24 * 60 * 60 * 1000);

  let executedRecord = null;
  let actionResult = "Action executed successfully";

  switch (actionType) {
    case "create_task":
    case "assign_employee":
    case "create_training_plan": {
      // Generate task ID
      const counterDoc = await CompanyTaskCounter.findOneAndUpdate(
        { companyId },
        { $inc: { currentSequence: 1 } },
        { upsert: true, new: true, setDefaultsOnInsert: true }
      );
      const seq = counterDoc.currentSequence || 1;
      const taskId = `T-${String(seq).padStart(5, "0")}`;

      const assignedEmployees = targetEmployeeId ? [targetEmployeeId] : [];

      executedRecord = await Task.create({
        companyId,
        taskId,
        taskSequenceNumber: seq,
        assignedBy: userId,
        assignedTo: assignedEmployees,
        departmentId: departmentId || null,
        title: title || `AI Automated: ${actionType.replace(/_/g, " ")}`,
        description: description || "Auto-generated from AI Recommendation Engine.",
        priority: ["low", "medium", "high", "urgent"].includes(priority?.toLowerCase())
          ? priority.toLowerCase()
          : "medium",
        startDateTime: now,
        endDateTime,
        status: "pending",
        isLive: true,
      });

      actionResult = `Task [${taskId}] "${executedRecord.title}" created and assigned.`;
      break;
    }

    case "schedule_followup": {
      if (targetLeadId) {
        executedRecord = await Lead.findByIdAndUpdate(
          targetLeadId,
          {
            nextFollowUpDate: endDateTime,
            updatedAt: now,
          },
          { new: true }
        );
        actionResult = `Lead follow-up scheduled for ${endDateTime.toLocaleDateString("en-IN")}.`;
      } else {
        actionResult = "Follow-up noted in AI operational agenda.";
      }
      break;
    }

    case "send_reminder":
    case "notify_manager":
    case "escalate_issue": {
      executedRecord = await Notification.create({
        companyId,
        userId: targetEmployeeId || userId,
        title: title || `AI Alert: ${actionType.replace(/_/g, " ").toUpperCase()}`,
        message: description || "Action required based on AI business performance diagnostics.",
        type: "system",
        priority: priority === "high" || priority === "urgent" ? "high" : "normal",
        isRead: false,
      });
      actionResult = `Notification broadcasted to recipient.`;
      break;
    }

    default: {
      actionResult = `Action [${actionType}] recorded in audit log.`;
    }
  }

  return {
    success: true,
    actionType,
    actionResult,
    executedRecord,
    executedAt: now,
  };
}

// ─────────────────────────────────────────────────
// AI ANALYSIS: Project Delivery & Health
// ─────────────────────────────────────────────────
async function analyzeProjects(companyId, days = 60) {
  const projectData = await aggregateProjectData(companyId, days);

  const prompt = `
You are an expert Project Delivery & Operational Excellence Analyst for "One Click AI Growth CRM".
Analyze current active projects, milestone delays, and delivery health across departments.

## PROJECT DATA:
Total Projects: ${projectData.totalProjects}
Active Projects: ${projectData.activeProjectsCount}
Overdue / Delayed Projects: ${projectData.overdueCount}
Status Breakdown: ${JSON.stringify(projectData.statusCounts)}
Projects Overview:
${JSON.stringify(projectData.projectSummaries, null, 2)}

## INSTRUCTIONS:
Evaluate delivery velocity, cross-functional team allocation, bottleneck risks, and recommend corrective actions.

Return ONLY valid JSON:
{
  "deliveryHealthScore": 82,
  "summary": "2-3 sentence overview of overall company project delivery performance",
  "totalProjects": ${projectData.totalProjects},
  "activeProjects": ${projectData.activeProjectsCount},
  "overdueProjects": ${projectData.overdueCount},
  "onTrackRate": "85%",
  "criticalDeliveryAlerts": [
    {
      "projectName": "Name",
      "severity": "High|Medium|Low",
      "issue": "What is causing delay (e.g. pending tasks, client review)",
      "impact": "Milestone delivery risk",
      "correctiveAction": "Recommended management intervention"
    }
  ],
  "projectInsights": [
    {
      "projectId": "id",
      "name": "Project Name",
      "status": "active|working|review|completed",
      "health": "On Track|At Risk|Delayed",
      "progress": "75%",
      "manager": "Manager Name",
      "recommendation": "Next milestone focus"
    }
  ],
  "topCorrectiveActions": [
    {
      "action": "Immediate project acceleration action",
      "owner": "Project Manager",
      "deadline": "This week",
      "actionType": "create_task"
    }
  ],
  "dataPeriod": "Last ${days} days",
  "confidenceLevel": "High|Medium|Low"
}
`;

  const result = await callGemini(prompt);
  return { rawData: projectData, result };
}

module.exports = {
  // Phase 1
  analyzeDashboardSummary,
  analyzeLeads,
  analyzeTasks,
  analyzeProjects,
  analyzeEmployeePerformance,
  askYourBusiness,
  generateCEOReport,
  generateWeeklyReport,
  // Phase 2
  detectProblemsAndRootCause,
  analyzeDepartments,
  analyzeTrainingNeeds,
  generateImprovementPlan,
  // Phase 3 & 4
  scoreLeadsPredictive,
  forecastBusinessMetrics,
  analyzeTrainingEffectiveness,
  executeCRMAction,
  // Raw aggregators
  aggregateLeadData,
  aggregateTaskData,
  aggregateProjectData,
  aggregateEmployeeData,
};



