import { useState, useMemo } from "react";
import toast from "react-hot-toast";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend,
  ResponsiveContainer
} from "recharts";
import { ChevronDown } from "lucide-react";

const fmtNumber = (num) => {
  if (num === null || num === undefined || isNaN(num)) return "0";
  return Number(num).toLocaleString("en-IN");
};

const ChartCard = ({ title, subtitle, children }) => (
  <div className="bg-ca-surface rounded-xl p-4 sm:p-5 shadow-2xs border border-ca-border h-full flex flex-col transition-all duration-200">
    <div className="mb-4 flex items-center justify-between border-b border-ca-border/60 pb-3">
      <div>
        <h4 className="text-sm font-black text-ca-text m-0">{title}</h4>
        {subtitle && <p className="text-xs font-semibold text-ca-text-secondary m-0 mt-0.5">{subtitle}</p>}
      </div>
    </div>
    <div className="flex-1 min-h-[250px]">{children}</div>
  </div>
);

const CustomTooltip = ({ active, payload, label }) => {
  if (active && payload && payload.length) {
    return (
      <div className="bg-ca-surface p-3 rounded-xl border border-ca-border shadow-md text-xs font-sans space-y-1">
        <p className="font-black text-ca-text border-b border-ca-border/60 pb-1 mb-1 m-0">{label}</p>
        {payload.map((entry, idx) => (
          <div key={idx} className="flex items-center justify-between gap-4 font-bold">
            <span className="flex items-center gap-1.5" style={{ color: entry.color }}>
              <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: entry.color }} />
              {entry.name}:
            </span>
            <span className="font-black text-ca-text">{entry.value}%</span>
          </div>
        ))}
      </div>
    );
  }
  return null;
};

const EmployeeRankingReport = ({ fallbackEmployees = [], fallbackTasks = [], departments = [], showCharts = false }) => {
  const [activeCategory, setActiveCategory] = useState("top10");
  const [fromDate, setFromDate] = useState("2026-07-01");
  const [toDate, setToDate] = useState("2026-07-31");
  const [departmentFilter, setDepartmentFilter] = useState("ALL");
  const [isDeptDropdownOpen, setIsDeptDropdownOpen] = useState(false);

  // Exact Requested Metrics & Employee Lists
  const top10Employees = useMemo(() => [
    { rank: 1, name: "Prashant Sharma", role: "Senior Software Engineer", dept: "Development", manager: "Rahul Sharma", score: "98/100", performance: 98, productivity: 99, taskCompletion: "99.2%", tasksCompleted: 215, efficiency: 97, scoreBadge: "Outstanding", status: "Outstanding" },
    { rank: 2, name: "Sneha Joshi", role: "Lead Backend Engineer", dept: "Development", manager: "Rahul Sharma", score: "96/100", performance: 96, productivity: 95, taskCompletion: "97.5%", tasksCompleted: 198, efficiency: 96, scoreBadge: "Outstanding", status: "Outstanding" },
    { rank: 3, name: "Rahul Patil", role: "UI/UX Lead Specialist", dept: "Design", manager: "Amit Deshmukh", score: "94/100", performance: 94, productivity: 93, taskCompletion: "96.0%", tasksCompleted: 185, efficiency: 95, scoreBadge: "Excellent", status: "Excellent" },
    { rank: 4, name: "Ananya Iyer", role: "Frontend Developer", dept: "Development", manager: "Rahul Sharma", score: "93/100", performance: 93, productivity: 94, taskCompletion: "95.2%", tasksCompleted: 172, efficiency: 92, scoreBadge: "Excellent", status: "Excellent" },
    { rank: 5, name: "Pooja Desai", role: "HR Operations Lead", dept: "HR", manager: "Neha Kulkarni", score: "92/100", performance: 92, productivity: 91, taskCompletion: "96.8%", tasksCompleted: 168, efficiency: 93, scoreBadge: "Excellent", status: "Excellent" },
    { rank: 6, name: "Aditya Verma", role: "DevOps Engineer", dept: "Development", manager: "Rahul Sharma", score: "91/100", performance: 91, productivity: 90, taskCompletion: "94.5%", tasksCompleted: 160, efficiency: 92, scoreBadge: "Excellent", status: "Excellent" },
    { rank: 7, name: "Meera Nair", role: "Product Designer", dept: "Design", manager: "Amit Deshmukh", score: "89/100", performance: 89, productivity: 88, taskCompletion: "93.0%", tasksCompleted: 155, efficiency: 90, scoreBadge: "Excellent", status: "Excellent" },
    { rank: 8, name: "Suresh Kumar", role: "QA Lead Engineer", dept: "Development", manager: "Rahul Sharma", score: "88/100", performance: 88, productivity: 89, taskCompletion: "95.0%", tasksCompleted: 150, efficiency: 87, scoreBadge: "Good", status: "Good" },
    { rank: 9, name: "Rohan Gupta", role: "Enterprise Sales Manager", dept: "Sales", manager: "Rohit Verma", score: "87/100", performance: 87, productivity: 85, taskCompletion: "91.2%", tasksCompleted: 146, efficiency: 89, scoreBadge: "Good", status: "Good" },
    { rank: 10, name: "Neha Singh", role: "Recruitment Specialist", dept: "HR", manager: "Neha Kulkarni", score: "86/100", performance: 86, productivity: 87, taskCompletion: "92.4%", tasksCompleted: 142, efficiency: 85, scoreBadge: "Good", status: "Good" },
  ], []);

  const bottom10Employees = useMemo(() => [
    { rank: 1, name: "Siddharth Rao", role: "Junior QA Tester", dept: "Development", manager: "Rahul Sharma", score: "62/100", performance: 62, productivity: 60, taskCompletion: "74.2%", efficiency: 64, status: "Needs Improvement", reason: "High Pending Tasks & QA Reopens", action: "Immediate 1-on-1 Workload Check & Mentorship" },
    { rank: 2, name: "Amit Patil", role: "Graphic Designer", dept: "Design", manager: "Amit Deshmukh", score: "65/100", performance: 65, productivity: 63, taskCompletion: "76.5%", efficiency: 67, status: "Needs Improvement", reason: "Frequent SLA Banner Delays", action: "SLA Deadline Refresher & Priority Balance" },
    { rank: 3, name: "Kiran More", role: "Sales Executive", dept: "Sales", manager: "Rohit Verma", score: "68/100", performance: 68, productivity: 67, taskCompletion: "80.1%", efficiency: 69, status: "Below Expectation", reason: "Delayed Client Quote Submissions", action: "Pipeline Management Refresher Training" },
    { rank: 4, name: "Ramesh Shinde", role: "IT Support Specialist", dept: "IT Support", manager: "Sanjay Gupta", score: "69/100", performance: 69, productivity: 68, taskCompletion: "81.0%", efficiency: 70, status: "Below Expectation", reason: "Incomplete Ticket Closures", action: "Support Protocol Audit & Guidance" },
    { rank: 5, name: "Divya Sawant", role: "Marketing Associate", dept: "Marketing", manager: "Meera Menon", score: "71/100", performance: 71, productivity: 70, taskCompletion: "82.5%", efficiency: 71, status: "Below Expectation", reason: "Low Campaign Output Velocity", action: "Task Priority Realignment Check" },
  ], []);

  const improvementAwardsList = useMemo(() => [
    { rank: 1, name: "Siddharth Rao", dept: "QA Testing", manager: "Rahul Sharma", prevScore: 52, currScore: 68, improvement: "+16%", badgeClass: "bg-ca-bg text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300 font-black" },
    { rank: 2, name: "Ananya Iyer", dept: "Development", manager: "Rahul Sharma", prevScore: 81, currScore: 93, improvement: "+12%", badgeClass: "bg-ca-bg text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300 font-black" },
    { rank: 3, name: "Pooja Desai", dept: "HR Operations", manager: "Neha Kulkarni", prevScore: 83, currScore: 93, improvement: "+10%", badgeClass: "bg-ca-bg text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300 font-black" },
  ], []);

  const mostLateCompletionsList = useMemo(() => [
    { rank: 1, name: "Amit Patil", dept: "Design", manager: "Amit Deshmukh", lateTasks: 18, avgDelay: "2.5 Days", impact: "High risk to design delivery schedule" },
    { rank: 2, name: "Rahul Patil", dept: "Design", manager: "Amit Deshmukh", lateTasks: 15, avgDelay: "1.8 Days", impact: "Moderate banner review delay" },
    { rank: 3, name: "Kiran More", dept: "Sales", manager: "Rohit Verma", lateTasks: 12, avgDelay: "3.1 Days", impact: "Delayed client quote submissions" },
  ], []);

  const fastestWorkersList = useMemo(() => [
    { rank: 1, name: "Prashant Sharma", dept: "Development", manager: "Rahul Sharma", avgCompletionTime: "2.8 Hours", tasksCompleted: 215, rating: "Ultra-Fast Throughput" },
    { rank: 2, name: "Sneha Joshi", dept: "Development", manager: "Rahul Sharma", avgCompletionTime: "3.1 Hours", tasksCompleted: 198, rating: "High Velocity Engineer" },
    { rank: 3, name: "Vikram Mehta", dept: "IT Support", manager: "Sanjay Gupta", avgCompletionTime: "3.4 Hours", tasksCompleted: 168, rating: "Quick Ticket Resolution" },
  ], []);

  const chartData = useMemo(() => {
    return top10Employees.slice(0, 7).map((e) => ({
      name: e.name.split(" ")[0],
      Performance: e.performance,
      Efficiency: e.efficiency,
    }));
  }, [top10Employees]);


  return (
    <div className="space-y-4 font-sans">
      {/* ── Top Header Bar, Category Tabs & Inline Multi-Selectors Strip ── */}
      <div className="bg-ca-surface rounded-xl p-3 sm:p-3.5 border border-ca-border shadow-2xs space-y-2.5">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
          <div>
            <h3 className="text-sm sm:text-base font-black text-ca-text m-0 tracking-tight">
              Employee Ranking Report
            </h3>
          </div>
        </div>

        {/* ── High-Density 5-Column Category Tabs Grid ── */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-1.5 sm:gap-2 pt-2 border-t border-ca-border/60">
          {[
            { id: "top10", label: "Top 10 Performers", desc: "Highest performance & efficiency" },
            { id: "bottom10", label: "Bottom 10 Performers", desc: "Requires improvement check" },
            { id: "improvement", label: "Best Improvement Award", desc: "Highest period-over-period jump" },
            { id: "late", label: "Most Late Completions", desc: "Highest delayed task count" },
            { id: "fastest", label: "Fastest Workers", desc: "Shortest average completion time" },
          ].map((cat) => {
            const active = activeCategory === cat.id;
            return (
              <button
                key={cat.id}
                onClick={() => setActiveCategory(cat.id)}
                className={`p-2.5 rounded-xl text-left font-black transition-all cursor-pointer flex flex-col justify-between ${
                  active
                    ? "bg-ca-primary text-white shadow-sm ring-1 ring-ca-primary"
                    : "bg-ca-bg text-ca-text-secondary hover:text-ca-text hover:bg-ca-surface border border-ca-border shadow-2xs"
                }`}
              >
                <span className="text-xs font-black block truncate">{cat.label}</span>
                <span className={`text-[10px] font-semibold block mt-0.5 truncate ${active ? "text-white/85" : "text-ca-text-secondary"}`}>
                  {cat.desc}
                </span>
              </button>
            );
          })}
        </div>

        {/* ── Sleek Inline Period Comparison & Department Scope Strip ── */}
        <div className="flex flex-wrap items-center justify-between gap-2.5 pt-2 border-t border-ca-border/60 text-xs font-bold">
          {/* Date Range Pickers for Period Comparison */}
          <div className="flex items-center gap-2 flex-wrap">
            <div className="flex items-center gap-2 bg-ca-bg px-3 py-1.5 rounded-xl border border-ca-border">
              <span className="text-[11px] font-black text-ca-text-secondary uppercase whitespace-nowrap">From:</span>
              <input
                type="date"
                value={fromDate}
                onChange={(e) => setFromDate(e.target.value)}
                className="bg-transparent font-black text-xs text-ca-primary focus:outline-none cursor-pointer"
              />
            </div>
            <div className="flex items-center gap-2 bg-ca-bg px-3 py-1.5 rounded-xl border border-ca-border">
              <span className="text-[11px] font-black text-ca-text-secondary uppercase whitespace-nowrap">To:</span>
              <input
                type="date"
                value={toDate}
                onChange={(e) => setToDate(e.target.value)}
                className="bg-transparent font-black text-xs text-ca-primary focus:outline-none cursor-pointer"
              />
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <div 
              className="relative flex items-center gap-1.5 bg-ca-bg px-3 py-1.5 rounded-xl border border-ca-border outline-none hover:border-ca-primary/50 transition-colors"
              tabIndex={0}
              onBlur={(e) => {
                if (!e.currentTarget.contains(e.relatedTarget)) {
                  setIsDeptDropdownOpen(false);
                }
              }}
            >
              <span className="text-[11px] font-black text-ca-text-secondary uppercase">Department Scope:</span>
              <div
                onClick={() => setIsDeptDropdownOpen(!isDeptDropdownOpen)}
                className="flex items-center justify-between bg-transparent cursor-pointer min-w-[200px] sm:min-w-[260px]"
              >
                <span className="truncate font-bold text-xs text-ca-text">
                  {departmentFilter === "ALL" ? "All Departments" : departmentFilter}
                </span>
                <ChevronDown size={14} className={`text-ca-text-secondary transition-transform ml-1 shrink-0 ${isDeptDropdownOpen ? "rotate-180" : ""}`} />
              </div>
              <div className={`absolute z-50 right-0 top-full mt-1 w-[260px] bg-ca-bg border border-ca-border rounded-lg shadow-lg overflow-hidden transition-all duration-200 origin-top ${isDeptDropdownOpen ? "opacity-100 scale-100 visible" : "opacity-0 scale-95 invisible"}`}>
                <ul className="py-1 m-0 list-none max-h-60 overflow-y-auto custom-scrollbar">
                  {["ALL", "Development", "Design", "Sales"].map((d, i) => (
                    <li key={i}>
                      <button
                        className={`w-full text-left px-3 py-2 text-xs font-bold transition-colors cursor-pointer ${
                          departmentFilter === d ? "bg-ca-primary/10 text-ca-primary" : "text-ca-text hover:bg-ca-primary/10 hover:text-ca-primary"
                        }`}
                        onClick={() => {
                          setDepartmentFilter(d);
                          setIsDeptDropdownOpen(false);
                        }}
                      >
                        {d === "ALL" ? "All Departments" : d}
                      </button>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ── Visual Performance Chart (If Enabled) ── */}
      {showCharts && activeCategory === "top10" && (
        <ChartCard
          title="Top 7 Leaderboard Performance vs Efficiency Scores"
          subtitle="Direct score comparison across organizational benchmark leaders"
        >
          <ResponsiveContainer width="100%" height={260} minWidth={100} minHeight={100}>
            <BarChart data={chartData} margin={{ top: 15, right: 30, left: 0, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#8EB69B" opacity={0.25} />
              <XAxis dataKey="name" stroke="#8EB69B" fontStyle="bold" fontSize={12} />
              <YAxis domain={[70, 100]} stroke="#8EB69B" fontStyle="bold" fontSize={12} />
              <Tooltip content={<CustomTooltip />} />
              <Legend />
              <Bar dataKey="Performance" name="Performance Score (%)" fill="#235347" radius={[6, 6, 0, 0]} />
              <Bar dataKey="Efficiency" name="Efficiency Score (%)" fill="#558D7C" radius={[6, 6, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>
      )}

      {/* ── CATEGORY 1: 🥇 Top 10 Performers ── */}
      {activeCategory === "top10" && (
        <div className="bg-ca-surface rounded-2xl border border-ca-border shadow-2xs overflow-hidden">
          <div className="p-4 sm:p-5 border-b border-ca-border/60 flex items-center justify-between">
            <div>
              <h4 className="text-sm font-black text-ca-text m-0">
                Top 10 Employees Performance & Efficiency Leaderboard
              </h4>
              <p className="text-xs font-bold text-ca-text-secondary m-0 mt-0.5">
                Employees with the highest performance scores across the organization
              </p>
            </div>
            <span className="text-xs font-black px-3 py-1 rounded-xl bg-emerald-500/10 text-emerald-700 dark:text-emerald-400">
              Verified Benchmark Standings
            </span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-ca-bg border-b border-ca-border text-ca-text-secondary font-black uppercase tracking-wider text-[11px]">
                  <th className="py-3.5 px-4 text-center">Rank</th>
                  <th className="py-3.5 px-4">Employee</th>
                  <th className="py-3.5 px-4">Department</th>
                  <th className="py-3.5 px-4">Reporting Manager</th>
                  <th className="py-3.5 px-4 text-center">Performance (%)</th>
                  <th className="py-3.5 px-4 text-center">Efficiency (%)</th>
                  <th className="py-3.5 px-4 text-center">Completed Tasks</th>
                  <th className="py-3.5 px-4 text-center">Leaderboard Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-ca-border/40 font-bold text-ca-text">
                {top10Employees.map((emp) => (
                  <tr key={emp.rank} className={`hover:bg-ca-bg/60 transition-colors ${emp.rank === 1 ? "bg-amber-500/5 dark:bg-amber-950/15" : ""}`}>
                    <td className="py-3.5 px-4 text-center font-black text-base">#{emp.rank}</td>
                    <td className="py-3.5 px-4 font-black text-ca-text">
                      {emp.name}
                      {emp.rank === 1 && <span className="text-[9px] font-black block text-amber-600 dark:text-amber-400 uppercase">Org Champion</span>}
                    </td>
                    <td className="py-3.5 px-4 text-ca-text-secondary">{emp.dept}</td>
                    <td className="py-3.5 px-4 text-ca-text-secondary">{emp.manager}</td>
                    <td className="py-3.5 px-4 text-center font-black text-sm text-ca-primary">{emp.performance}%</td>
                    <td className="py-3.5 px-4 text-center font-black text-sm text-emerald-700 dark:text-emerald-400">{emp.efficiency}%</td>
                    <td className="py-3.5 px-4 text-center font-black">{emp.tasksCompleted}</td>
                    <td className="py-3.5 px-4 text-center">
                      <span className="px-2.5 py-1 rounded-xl bg-ca-bg text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300 font-black text-[10px]">
                        {emp.scoreBadge}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ── CATEGORY 2: 📉 Bottom 10 Performers ── */}
      {activeCategory === "bottom10" && (
        <div className="bg-ca-surface rounded-2xl border border-ca-border shadow-2xs overflow-hidden">
          <div className="p-4 sm:p-5 border-b border-ca-border/60 flex items-center justify-between">
            <div>
              <h4 className="text-sm font-black text-ca-text m-0">
                Bottom 10 Employees Performance Audit & Improvement Queue
              </h4>
              <p className="text-xs font-bold text-ca-text-secondary m-0 mt-0.5">
                Employees requiring workload support, training, or immediate management check
              </p>
            </div>
            <span className="text-xs font-black px-3 py-1 rounded-xl bg-rose-500/10 text-rose-700 dark:text-rose-400">
              Coaching Required
            </span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-ca-bg border-b border-ca-border text-ca-text-secondary font-black uppercase tracking-wider text-[11px]">
                  <th className="py-3.5 px-4 text-center">Rank</th>
                  <th className="py-3.5 px-4">Employee</th>
                  <th className="py-3.5 px-4">Department</th>
                  <th className="py-3.5 px-4 text-center">Performance (%)</th>
                  <th className="py-3.5 px-4">Primary Reason</th>
                  <th className="py-3.5 px-4">Recommended Executive Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-ca-border/40 font-bold text-ca-text">
                {bottom10Employees.map((emp) => (
                  <tr key={emp.rank} className="hover:bg-ca-bg/60 transition-colors">
                    <td className="py-3.5 px-4 text-center font-black text-rose-600 dark:text-rose-400">#{emp.rank}</td>
                    <td className="py-3.5 px-4 font-black text-ca-text">{emp.name}</td>
                    <td className="py-3.5 px-4 text-ca-text-secondary">{emp.dept}</td>
                    <td className="py-3.5 px-4 text-center font-black text-sm text-rose-600 dark:text-rose-400">{emp.performance}%</td>
                    <td className="py-3.5 px-4 font-extrabold text-amber-800 dark:text-amber-300 bg-amber-500/5">{emp.reason}</td>
                    <td className="py-3.5 px-4 text-ca-text">{emp.action}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ── CATEGORY 3: 🚀 Best Improvement Award ── */}
      {activeCategory === "improvement" && (
        <div className="bg-ca-surface rounded-2xl border border-ca-border shadow-2xs overflow-hidden">
          <div className="p-4 sm:p-5 border-b border-ca-border/60 flex items-center justify-between">
            <div>
              <h4 className="text-sm font-black text-ca-text m-0">
                Best Improvement Award Leaders (Period-over-Period Growth)
              </h4>
              <p className="text-xs font-bold text-ca-text-secondary m-0 mt-0.5">
                Employees showing the highest performance jump compared to the previous period
              </p>
            </div>
            <span className="text-xs font-black px-3 py-1 rounded-xl bg-purple-500/10 text-purple-700 dark:text-purple-400">
              Period Growth Award
            </span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-ca-bg border-b border-ca-border text-ca-text-secondary font-black uppercase tracking-wider text-[11px]">
                  <th className="py-3.5 px-4">Employee</th>
                  <th className="py-3.5 px-4">Department</th>
                  <th className="py-3.5 px-4 text-center">Previous Score</th>
                  <th className="py-3.5 px-4 text-center">Current Score</th>
                  <th className="py-3.5 px-4 text-center">Improvement Jump</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-ca-border/40 font-bold text-ca-text">
                {improvementAwardsList.map((emp) => (
                  <tr key={emp.rank} className={`hover:bg-ca-bg/60 transition-colors ${emp.rank === 1 ? "bg-emerald-500/5 dark:bg-emerald-950/15" : ""}`}>
                    <td className="py-3.5 px-4 font-black text-ca-text flex items-center gap-2">
                      <span className="w-6 h-6 rounded-md flex items-center justify-center font-black text-xs shrink-0 bg-ca-primary text-white">{emp.rank === 1 ? "#1" : emp.rank === 2 ? "#2" : "#3"}</span>
                      <span>{emp.name}</span>
                    </td>
                    <td className="py-3.5 px-4 text-ca-text-secondary">{emp.dept}</td>
                    <td className="py-3.5 px-4 text-center text-ca-text-secondary font-extrabold">{emp.prevScore}%</td>
                    <td className="py-3.5 px-4 text-center text-ca-primary font-black text-sm">{emp.currScore}%</td>
                    <td className="py-3.5 px-4 text-center">
                      <span className={`px-3 py-1 rounded-xl text-xs ${emp.badgeClass}`}>
                        {emp.improvement} Growth
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ── CATEGORY 4: ⏰ Most Late Completions ── */}
      {activeCategory === "late" && (
        <div className="bg-ca-surface rounded-2xl border border-ca-border shadow-2xs overflow-hidden">
          <div className="p-4 sm:p-5 border-b border-ca-border/60 flex items-center justify-between">
            <div>
              <h4 className="text-sm font-black text-ca-text m-0">
                Most Late Completions Analysis Log
              </h4>
              <p className="text-xs font-bold text-ca-text-secondary m-0 mt-0.5">
                Employees with the highest number of delayed task completions and average delay duration
              </p>
            </div>
            <span className="text-xs font-black px-3 py-1 rounded-xl bg-amber-500/10 text-amber-800 dark:text-amber-300">
              SLA Breaches Audit
            </span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-ca-bg border-b border-ca-border text-ca-text-secondary font-black uppercase tracking-wider text-[11px]">
                  <th className="py-3.5 px-4">Employee</th>
                  <th className="py-3.5 px-4">Department</th>
                  <th className="py-3.5 px-4 text-center">Late Tasks Count</th>
                  <th className="py-3.5 px-4 text-center">Average Delay Duration</th>
                  <th className="py-3.5 px-4">Business Operational Impact</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-ca-border/40 font-bold text-ca-text">
                {mostLateCompletionsList.map((emp) => (
                  <tr key={emp.rank} className="hover:bg-ca-bg/60 transition-colors">
                    <td className="py-3.5 px-4 font-black text-ca-text">{emp.name}</td>
                    <td className="py-3.5 px-4 text-ca-text-secondary">{emp.dept}</td>
                    <td className="py-3.5 px-4 text-center font-black text-rose-600 dark:text-rose-400 text-sm">{emp.lateTasks} Tasks</td>
                    <td className="py-3.5 px-4 text-center font-black text-amber-700 dark:text-amber-400">{emp.avgDelay}</td>
                    <td className="py-3.5 px-4 text-ca-text">{emp.impact}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ── CATEGORY 5: ⚡ Fastest Workers ── */}
      {activeCategory === "fastest" && (
        <div className="bg-ca-surface rounded-2xl border border-ca-border shadow-2xs overflow-hidden">
          <div className="p-4 sm:p-5 border-b border-ca-border/60 flex items-center justify-between">
            <div>
              <h4 className="text-sm font-black text-ca-text m-0">
                Fastest Workers Recognition Leaderboard
              </h4>
              <p className="text-xs font-bold text-ca-text-secondary m-0 mt-0.5">
                Employees with the shortest average task completion time across the organization
              </p>
            </div>
            <span className="text-xs font-black px-3 py-1 rounded-xl bg-teal-500/10 text-teal-800 dark:text-teal-300">
              High Velocity Staff
            </span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-ca-bg border-b border-ca-border text-ca-text-secondary font-black uppercase tracking-wider text-[11px]">
                  <th className="py-3.5 px-4">Employee</th>
                  <th className="py-3.5 px-4">Department</th>
                  <th className="py-3.5 px-4 text-center">Avg. Completion Time</th>
                  <th className="py-3.5 px-4 text-center">Tasks Completed</th>
                  <th className="py-3.5 px-4 text-center">Recognition Rating</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-ca-border/40 font-bold text-ca-text">
                {fastestWorkersList.map((emp) => (
                  <tr key={emp.rank} className={`hover:bg-ca-bg/60 transition-colors ${emp.rank === 1 ? "bg-teal-500/5 dark:bg-teal-950/15" : ""}`}>
                    <td className="py-3.5 px-4 font-black text-ca-text flex items-center gap-2">
                      <span className="w-6 h-6 rounded-md flex items-center justify-center font-black text-xs shrink-0 bg-teal-500 text-white">{emp.rank === 1 ? "#1" : emp.rank === 2 ? "#2" : "#3"}</span>
                      <span>{emp.name}</span>
                    </td>
                    <td className="py-3.5 px-4 text-ca-text-secondary">{emp.dept}</td>
                    <td className="py-3.5 px-4 text-center font-black text-teal-700 dark:text-teal-300 text-sm">{emp.avgCompletionTime}</td>
                    <td className="py-3.5 px-4 text-center font-black text-ca-primary">{emp.tasksCompleted}</td>
                    <td className="py-3.5 px-4 text-center">
                      <span className="px-3 py-1 rounded-xl bg-teal-100 text-teal-800 dark:bg-teal-950/60 dark:text-teal-300 font-black text-[10px]">
                        {emp.rating}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};

export default EmployeeRankingReport;
