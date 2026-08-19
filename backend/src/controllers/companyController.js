const mongoose = require("mongoose");
const { validationResult } = require("express-validator");
const Company = require("../models/Company");
const Department = require("../models/Department");
const Designation = require("../models/Designation");
const Branch = require("../models/Branch");
const Employee = require("../models/Employee");
const Attendance = require("../models/Attendance");
const Leave = require("../models/Leave");
const LeaveBalance = require("../models/LeaveBalance");
const Holiday = require("../models/Holiday");
const Project = require("../models/Project");
const Task = require("../models/Task");
const TaskTemplate = require("../models/TaskTemplate");
const Payroll = require("../models/Payroll");
const SalaryStructure = require("../models/SalaryStructure");
const Notification = require("../models/Notification");
const AuditLog = require("../models/AuditLog");
const Announcement = require("../models/Announcement");
const { checkUserPermission } = require("../utils/permissionCheck");
const {
    findCompanyResource,
    validateDepartmentBelongsToCompany,
} = require("../utils/companyScope");
const {
    sendNotificationToEmployees,
    sendNotificationToAllEmployees,
    notifyRole,
    notifyDepartment,
    notifyCompany,
} = require("../utils/notificationHelper");

const handleValidation = (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        res.status(400).json({ message: errors.array()[0].msg, errors: errors.array() });
        return true;
    }
    return false;
};

// Dashboard
const getDashboardStats = async (req, res, next) => {
    try {
        const { companyId } = req;
        const { timeRange = "this_month" } = req.query;

        const now = new Date();
        let startDate = new Date();
        let endDate = new Date();

        switch (timeRange) {
            case "today":
                startDate.setHours(0, 0, 0, 0);
                endDate.setHours(23, 59, 59, 999);
                break;
            case "yesterday":
                startDate.setDate(startDate.getDate() - 1);
                startDate.setHours(0, 0, 0, 0);
                endDate = new Date(startDate);
                endDate.setHours(23, 59, 59, 999);
                break;
            case "last_7_days":
                startDate.setDate(startDate.getDate() - 7);
                break;
            case "last_15_days":
                startDate.setDate(startDate.getDate() - 15);
                break;
            case "this_month":
                startDate = new Date(now.getFullYear(), now.getMonth(), 1);
                break;
            case "last_month":
                startDate = new Date(now.getFullYear(), now.getMonth() - 1, 1);
                endDate = new Date(now.getFullYear(), now.getMonth(), 0);
                endDate.setHours(23, 59, 59, 999);
                break;
            case "all":
                startDate = new Date(2000, 0, 1);
                break;
            default:
                startDate = new Date(now.getFullYear(), now.getMonth(), 1);
                break;
        }

        const startStr = startDate.toISOString().slice(0, 10);
        const endStr = endDate.toISOString().slice(0, 10);

        // Attendance should always reflect "Today's" live status on the dashboard
        const todayStr = new Date().toISOString().slice(0, 10);
        const attendanceDateFilter = todayStr;

        const [
            totalDepartments,
            totalDesignations,
            totalBranches,
            totalEmployees,
            activeEmployees,
            inactiveEmployees,
            newJoinersThisMonth,
            presentToday,
            lateToday,
            halfDayToday,
            absentDbCount,
            onLeave,
            // Real Task counts
            totalTasksCount,
            completedTasksCount,
            pendingTasksCount,
            inProcessTasksCount,
            lateCompletedTasksCount,
            overdueTasksCount,
            // Real Leave counts
            totalLeavesCount,
            pendingLeavesCount,
            approvedLeavesCount,
            rejectedLeavesCount,
            // Real Project counts
            totalProjectsCount,
            activeProjectsCount,
            completedProjectsCount
        ] = await Promise.all([
            Department.countDocuments({ companyId }),
            Designation.countDocuments({ companyId }),
            Branch.countDocuments({ companyId }),
            Employee.countDocuments({ companyId }),
            Employee.countDocuments({ companyId, status: "active" }),
            Employee.countDocuments({
                companyId,
                status: { $in: ["inactive", "terminated"] },
            }),
            Employee.countDocuments({
                companyId,
                $or: [
                    { joiningDate: { $gte: startDate, $lte: endDate } },
                    {
                        $and: [
                            { $or: [{ joiningDate: null }, { joiningDate: { $exists: false } }] },
                            { createdAt: { $gte: startDate, $lte: endDate } },
                        ],
                    },
                ],
            }),
            Attendance.countDocuments({ companyId, date: attendanceDateFilter, status: "present" }),
            Attendance.countDocuments({ companyId, date: attendanceDateFilter, status: "late" }),
            Attendance.countDocuments({ companyId, date: attendanceDateFilter, status: "half_day" }),
            Attendance.countDocuments({ companyId, date: attendanceDateFilter, status: "absent" }),
            Leave.countDocuments({
                companyId,
                status: "approved",
                $or: [
                    { startDate: { $lte: endDate.toISOString() }, endDate: { $gte: startDate.toISOString() } },
                    { startDate: { $lte: endStr }, endDate: { $gte: startStr } }
                ]
            }),
            // Task count definitions
            Task.countDocuments({ companyId, isLive: true, status: { $ne: "cancelled" } }),
            Task.countDocuments({ companyId, isLive: true, status: { $in: ["complete", "re_complete"] } }),
            Task.countDocuments({ companyId, isLive: true, status: { $in: ["pending", "todo", "re_pending"] } }),
            Task.countDocuments({ companyId, isLive: true, status: { $in: ["in_process", "in-progress", "working", "re_in_process"] } }),
            Task.countDocuments({ companyId, isLive: true, status: { $in: ["late_complete", "re_late_complete"] } }),
            Task.countDocuments({
                companyId,
                isLive: true,
                status: { $nin: ["complete", "completed", "done", "re_complete", "late_complete", "re_late_complete", "cancelled"] },
                endDateTime: { $lt: now }
            }),
            // Leave count definitions
            Leave.countDocuments({ companyId }),
            Leave.countDocuments({ companyId, status: "pending" }),
            Leave.countDocuments({ companyId, status: "approved" }),
            Leave.countDocuments({ companyId, status: "rejected" }),
            // Project count definitions
            Project.countDocuments({ companyId }),
            Project.countDocuments({ companyId, status: "active" }),
            Project.countDocuments({ companyId, status: "completed" })
        ]);

        const daysInPeriod = Math.max(1, Math.round((endDate - startDate) / (1000 * 60 * 60 * 24)));

        // Fallback logic for absent records if the cron didn't generate them
        let absentToday = absentDbCount;
        if (absentDbCount === 0) {
            absentToday = Math.max(0, activeEmployees - (presentToday + lateToday + halfDayToday + onLeave));
        }

        res.json({
            totalDepartments,
            totalDesignations,
            totalBranches,
            totalEmployees,
            activeEmployees,
            inactiveEmployees,
            newJoinersThisMonth,
            presentToday,
            absentToday,
            onLeave,
            attendance: {
                presentToday,
                absentToday,
                lateToday,
                halfDayToday,
            },
            leaves: {
                totalLeaves: totalLeavesCount,
                pending: pendingLeavesCount,
                approved: approvedLeavesCount,
                rejected: rejectedLeavesCount,
            },
            payroll: {
                totalPayroll: 0,
                paid: 0,
                due: 0,
            },
            projects: {
                totalProjects: totalProjectsCount,
                activeProjects: activeProjectsCount,
                completedProjects: completedProjectsCount,
            },
            tasks: {
                totalTasks: totalTasksCount,
                completedTasks: completedTasksCount,
                pendingTasks: pendingTasksCount,
                inProcessTasks: inProcessTasksCount,
                lateCompletedTasks: lateCompletedTasksCount,
                overdueTasks: overdueTasksCount,
            },
        });
    } catch (error) {
        next(error);
    }
};

// Profile
const getProfile = async (req, res, next) => {
    try {
        const companyDoc = await Company.findById(req.companyId);
        if (!companyDoc) {
            return res.status(404).json({ message: "Company not found" });
        }

        const company = companyDoc.toObject();

        // Retrieve the latest subscription for this company
        const Subscription = require("../models/Subscription");
        const activeSub = await Subscription.findOne({ companyId: req.companyId }).sort({ createdAt: -1 });

        if (activeSub) {
            const isExpired = activeSub.endDate && activeSub.endDate < new Date();
            company.planName = activeSub.planName;
            company.status = isExpired ? "expired" : activeSub.status; // "active", "expired", "trial", "cancelled"
            company.paymentStatus = activeSub.paymentStatus; // "paid", "pending", "failed"
            company.subscriptionEndDate = activeSub.endDate;
        } else {
            company.planName = company.planName || "Basic";
            company.status = company.status || "active";
            company.paymentStatus = "pending";
        }

        res.json({ company });
    } catch (error) {
        next(error);
    }
};

const updateProfile = async (req, res, next) => {
    try {
        if (handleValidation(req, res)) return;

        const company = await Company.findById(req.companyId);
        if (!company) {
            return res.status(404).json({ message: "Company not found" });
        }

        const fields = [
            "companyName", "ownerName", "email", "phone", "website",
            "taxId", "registrationNumber", "address", "city", "state",
            "pincode", "industryType"
        ];
        let hasChanges = false;
        fields.forEach((field) => {
            if (req.body[field] !== undefined) {
                const newVal = field === "email" ? req.body[field].toLowerCase() : req.body[field];
                if (newVal !== company[field]) {
                    company[field] = newVal;
                    hasChanges = true;
                }
            }
        });

        if (!hasChanges) {
            console.log("NO CHANGES DETECTED: updateProfile");
            return res.json({ success: true, message: "No changes detected", company });
        }

        await company.save();
        res.json({ company });
    } catch (error) {
        next(error);
    }
};

// Departments
const createDepartment = async (req, res, next) => {
    try {
        if (handleValidation(req, res)) return;

        const department = await Department.create({
            ...req.body,
            companyId: req.companyId,
        });

        res.status(201).json({ department });
    } catch (error) {
        if (error.code === 11000) {
            return res.status(400).json({ message: "Department name already exists" });
        }
        next(error);
    }
};

const getDepartments = async (req, res, next) => {
    try {
        const departments = await Department.find({ companyId: req.companyId }).sort({
            name: 1,
        });
        res.json({ departments, count: departments.length });
    } catch (error) {
        next(error);
    }
};

const updateDepartment = async (req, res, next) => {
    try {
        if (handleValidation(req, res)) return;

        const department = await findCompanyResource(
            Department,
            req.params.id,
            req.companyId
        );
        if (!department) {
            return res.status(404).json({ message: "Department not found" });
        }

        if (req.body.name !== undefined) department.name = req.body.name;
        if (req.body.description !== undefined) department.description = req.body.description;
        if (req.body.status !== undefined) department.status = req.body.status;

        await department.save();
        res.json({ department });
    } catch (error) {
        if (error.code === 11000) {
            return res.status(400).json({ message: "Department name already exists" });
        }
        next(error);
    }
};

const deleteDepartment = async (req, res, next) => {
    try {
        const department = await findCompanyResource(
            Department,
            req.params.id,
            req.companyId
        );
        if (!department) {
            return res.status(404).json({ message: "Department not found" });
        }

        const designationCount = await Designation.countDocuments({
            companyId: req.companyId,
            departmentId: department._id,
        });
        if (designationCount > 0) {
            return res.status(400).json({
                message: "Cannot delete department with existing designations",
            });
        }

        await department.deleteOne();
        res.json({ message: "Department deleted successfully" });
    } catch (error) {
        next(error);
    }
};

// Designations
const createDesignation = async (req, res, next) => {
    try {
        if (handleValidation(req, res)) return;

        const department = await validateDepartmentBelongsToCompany(
            req.body.departmentId,
            req.companyId
        );
        if (!department) {
            return res.status(400).json({ message: "Invalid department for this company" });
        }

        const designation = await Designation.create({
            name: req.body.name,
            description: req.body.description,
            status: req.body.status,
            departmentId: req.body.departmentId,
            companyId: req.companyId,
        });

        const populated = await Designation.findById(designation._id).populate(
            "departmentId",
            "name"
        );

        res.status(201).json({ designation: populated });
    } catch (error) {
        if (error.code === 11000) {
            return res.status(400).json({ message: "Designation name already exists in this department" });
        }
        next(error);
    }
};

const getDesignations = async (req, res, next) => {
    try {
        const designations = await Designation.find({ companyId: req.companyId })
            .populate("departmentId", "name")
            .sort({ name: 1 });
        res.json({ designations, count: designations.length });
    } catch (error) {
        next(error);
    }
};

const updateDesignation = async (req, res, next) => {
    try {
        if (handleValidation(req, res)) return;

        const designation = await findCompanyResource(
            Designation,
            req.params.id,
            req.companyId
        );
        if (!designation) {
            return res.status(404).json({ message: "Designation not found" });
        }

        if (req.body.departmentId) {
            const department = await validateDepartmentBelongsToCompany(
                req.body.departmentId,
                req.companyId
            );
            if (!department) {
                return res.status(400).json({ message: "Invalid department for this company" });
            }
            designation.departmentId = req.body.departmentId;
        }

        if (req.body.name !== undefined) designation.name = req.body.name;
        if (req.body.description !== undefined) designation.description = req.body.description;
        if (req.body.status !== undefined) designation.status = req.body.status;

        await designation.save();
        const populated = await Designation.findById(designation._id).populate(
            "departmentId",
            "name"
        );

        res.json({ designation: populated });
    } catch (error) {
        if (error.code === 11000) {
            return res.status(400).json({ message: "Designation name already exists in this department" });
        }
        next(error);
    }
};

const deleteDesignation = async (req, res, next) => {
    try {
        const designation = await findCompanyResource(
            Designation,
            req.params.id,
            req.companyId
        );
        if (!designation) {
            return res.status(404).json({ message: "Designation not found" });
        }

        await designation.deleteOne();
        res.json({ message: "Designation deleted successfully" });
    } catch (error) {
        next(error);
    }
};

// Branches
const createBranch = async (req, res, next) => {
    try {
        if (req.body.name && !req.body.branchName) req.body.branchName = req.body.name;
        if (req.body.location && !req.body.city) req.body.city = req.body.location;
        if (handleValidation(req, res)) return;

        const branch = await Branch.create({
            ...req.body,
            branchName: req.body.branchName || req.body.name,
            city: req.body.city || req.body.location,
            companyId: req.companyId,
        });

        res.status(201).json({ branch });
    } catch (error) {
        if (error.code === 11000) {
            return res.status(400).json({ message: "Branch name already exists" });
        }
        next(error);
    }
};

const getBranches = async (req, res, next) => {
    try {
        const branches = await Branch.find({ companyId: req.companyId }).sort({
            branchName: 1,
        });
        res.json({ branches, count: branches.length });
    } catch (error) {
        next(error);
    }
};

const updateBranch = async (req, res, next) => {
    try {
        if (req.body.name && !req.body.branchName) req.body.branchName = req.body.name;
        if (req.body.location && !req.body.city) req.body.city = req.body.location;
        if (handleValidation(req, res)) return;

        const branch = await findCompanyResource(Branch, req.params.id, req.companyId);
        if (!branch) {
            return res.status(404).json({ message: "Branch not found" });
        }

        const fields = ["branchName", "address", "city", "state", "pincode", "status"];
        fields.forEach((field) => {
            if (req.body[field] !== undefined) {
                branch[field] = req.body[field];
            }
        });
        if (req.body.name && !req.body.branchName) branch.branchName = req.body.name;
        if (req.body.location && !req.body.city) branch.city = req.body.location;

        await branch.save();
        res.json({ branch });
    } catch (error) {
        if (error.code === 11000) {
            return res.status(400).json({ message: "Branch name already exists" });
        }
        next(error);
    }
};

const deleteBranch = async (req, res, next) => {
    try {
        const branch = await findCompanyResource(Branch, req.params.id, req.companyId);
        if (!branch) {
            return res.status(404).json({ message: "Branch not found" });
        }

        await branch.deleteOne();
        res.json({ message: "Branch deleted successfully" });
    } catch (error) {
        next(error);
    }
};

// GET /api/company/dashboard
const getCompanyDashboard = async (req, res, next) => {
    try {
        console.log("DB QUERY: getCompanyDashboard");
        const { companyId } = req;
        const today = new Date().toISOString().slice(0, 10);

        const company = await Company.findById(companyId).lean();
        if (!company) {
            return res.status(404).json({ success: false, message: "Company not found" });
        }

        const currentMonth = new Date().toLocaleString("en-US", { month: "long" });
        const currentYear = new Date().getFullYear();

        const compObjId = new mongoose.Types.ObjectId(companyId);

        const [
            totalEmployees,
            activeEmployees,
            presentToday,
            lateToday,
            halfDayToday,
            pendingLeaves,
            openTasks,
            overdueTasks,
            activeProjects,
            activeTemplates,
            salaryAgg,
            attendanceSummary,
            recentEmployees,
            pendingLeavesList,
            overdueTasksList,
            activeProjectsList,
            upcomingHolidays,
            latestNotifications,
            departments,
            deptAgg,
            taskAgg,
            payrollAgg,
            onLeave,
            leaveSummaryAgg,
            upcomingBirthdaysRaw,
        ] = await Promise.all([
            Employee.countDocuments({ companyId }),
            Employee.countDocuments({ companyId, status: "active" }),
            Attendance.countDocuments({ companyId, date: today, status: "present" }),
            Attendance.countDocuments({ companyId, date: today, status: "late" }),
            Attendance.countDocuments({ companyId, date: today, status: "half-day" }),
            Leave.countDocuments({ companyId, status: "pending" }),
            Task.countDocuments({ companyId, isLive: true, status: { $nin: ["complete", "completed", "done", "re_complete", "late_complete", "re_late_complete", "cancelled"] } }),
            Task.countDocuments({ companyId, isLive: true, status: { $nin: ["complete", "completed", "done", "re_complete", "late_complete", "re_late_complete", "cancelled"] }, endDateTime: { $lt: new Date() } }),
            Project.countDocuments({ companyId, status: "active" }),
            TaskTemplate.countDocuments({ companyId, isActive: true }),
            // Monthly payroll cost via aggregation (no full-collection load)
            SalaryStructure.aggregate([
                { $match: { companyId: compObjId } },
                {
                    $group: {
                        _id: null,
                        total: { $sum: { $subtract: [{ $add: ["$basicSalary", "$hra", "$allowances"] }, "$deductions"] } }
                    }
                }
            ]),
            // Lists
            Attendance.find({ companyId, date: today })
                .populate("employeeId", "firstName lastName employeeCode")
                .limit(10)
                .lean(),
            Employee.find({ companyId })
                .sort({ createdAt: -1 })
                .limit(5)
                .lean(),
            Leave.find({ companyId, status: "pending" })
                .populate("employeeId", "firstName lastName employeeCode departmentId")
                .sort({ createdAt: -1 })
                .limit(5)
                .lean(),
            Task.find({ companyId, isLive: true, status: { $nin: ["complete", "completed", "done", "re_complete", "late_complete", "re_late_complete", "cancelled"] }, endDateTime: { $lt: new Date() } })
                .populate("assignedTo", "firstName lastName employeeCode")
                .sort({ endDateTime: 1 })
                .limit(5)
                .lean(),
            Project.find({ companyId, status: "active" })
                .sort({ createdAt: -1 })
                .limit(5)
                .lean(),
            Holiday.find({ companyId, date: { $gte: new Date() } })
                .sort({ date: 1 })
                .limit(5)
                .lean(),
            Notification.find({ companyId })
                .sort({ createdAt: -1 })
                .limit(5)
                .lean(),
            // Aggregations
            Department.find({ companyId }).lean(),
            Employee.aggregate([
                { $match: { companyId: compObjId, status: "active" } },
                { $group: { _id: "$departmentId", count: { $sum: 1 } } }
            ]),
            Task.aggregate([
                { $match: { companyId: compObjId, isLive: true } },
                {
                    $group: {
                        _id: null,
                        all: { $sum: { $cond: [{ $ne: ["$status", "cancelled"] }, 1, 0] } },
                        pending: { $sum: { $cond: [{ $in: ["$status", ["pending", "todo", "re_pending"]] }, 1, 0] } },
                        inProcess: { $sum: { $cond: [{ $in: ["$status", ["in_process", "in-progress", "working", "re_in_process"]] }, 1, 0] } },
                        completed: { $sum: { $cond: [{ $in: ["$status", ["complete", "completed", "done", "re_complete"]] }, 1, 0] } },
                        lateCompleted: { $sum: { $cond: [{ $in: ["$status", ["late_complete", "re_late_complete"]] }, 1, 0] } },
                        overdue: {
                            $sum: {
                                $cond: [
                                    {
                                        $and: [
                                            { $not: { $in: ["$status", ["complete", "completed", "done", "re_complete", "late_complete", "re_late_complete", "cancelled"]] } },
                                            { $lt: ["$endDateTime", new Date()] }
                                        ]
                                    },
                                    1,
                                    0
                                ]
                            }
                        }
                    }
                }
            ]),
            Payroll.aggregate([
                { $match: { companyId: compObjId, month: currentMonth, year: currentYear } },
                { $group: { _id: "$status", totalAmount: { $sum: "$netSalary" } } }
            ]),
            Leave.countDocuments({
                companyId,
                status: "approved",
                startDate: { $lte: today },
                endDate: { $gte: today }
            }),
            Leave.aggregate([
                { $match: { companyId: compObjId, status: "approved" } },
                { $group: { _id: { $toLower: "$leaveType" }, count: { $sum: 1 } } }
            ]),
            Employee.find({
                companyId,
                $or: [
                    { dob: { $ne: null } },
                    { dateOfBirth: { $ne: null } }
                ]
            })
            .select("firstName lastName dob dateOfBirth")
            .limit(10)
            .lean(),
        ]);

        const absentToday = Math.max(0, activeEmployees - (presentToday + lateToday + halfDayToday + onLeave));

        // Monthly payroll cost from aggregation result
        const monthlyPayrollCost = salaryAgg.length > 0 ? (salaryAgg[0].total || 0) : 0;

        // Department Stats
        const deptCountMap = {};
        deptAgg.forEach(d => { if (d._id) deptCountMap[d._id.toString()] = d.count; });
        const departmentStats = departments.map(dept => ({
            departmentName: dept.name,
            count: deptCountMap[dept._id.toString()] || 0
        }));

        // Task Stats
        const taskCounts = (taskAgg && taskAgg.length > 0) ? taskAgg[0] : { all: 0, pending: 0, inProcess: 0, completed: 0, lateCompleted: 0, overdue: 0 };
        const taskStats = [
            { status: "todo", count: taskCounts.pending || 0 },
            { status: "in-progress", count: taskCounts.inProcess || 0 },
            { status: "review", count: 0 },
            { status: "done", count: taskCounts.completed || 0 },
            { status: "late-complete", count: taskCounts.lateCompleted || 0 },
            { status: "all", count: (taskCounts.all || 0) + activeTemplates },
            { status: "overdue", count: taskCounts.overdue || 0 }
        ];

        // Leave Summary aggregation mapping
        const leaveSummaryMap = {};
        leaveSummaryAgg.forEach(item => { if (item._id) leaveSummaryMap[item._id] = item.count; });
        const leaveSummary = ["casual", "sick", "earned", "maternity"].map((type, idx) => ({
            label: type.charAt(0).toUpperCase() + type.slice(1) + " Leave",
            used: leaveSummaryMap[type] || 0,
            total: [20, 15, 25, 5][idx],
            color: ["#0f766e", "#14b8a6", "#2dd4bf", "#99f6e4"][idx % 4],
        }));

        // Upcoming birthdays mapping
        const upcomingBirthdays = upcomingBirthdaysRaw.map(e => {
            const dobRaw = e.dob || e.dateOfBirth;
            const dobObj = dobRaw ? new Date(dobRaw) : null;
            const dobStr = (dobObj && !isNaN(dobObj.getTime()))
                ? dobObj.toLocaleDateString("en-US", { day: "numeric", month: "short" })
                : "—";
            return {
                name: `${e.firstName || ""} ${e.lastName || ""}`.trim() || "Team Member",
                date: dobStr,
            };
        });

        // Payroll Summary
        let totalPaid = 0;
        let totalPending = 0;
        payrollAgg.forEach(p => {
            if (p._id === "paid") totalPaid = p.totalAmount;
            if (p._id === "pending") totalPending = p.totalAmount;
        });
        const payrollSummary = {
            month: currentMonth,
            year: currentYear,
            paidAmount: totalPaid,
            pendingAmount: totalPending,
            totalAmount: totalPaid + totalPending,
        };

        res.json({
            success: true,
            data: {
                company,
                kpis: {
                    totalEmployees,
                    activeEmployees,
                    presentToday,
                    absentToday,
                    lateToday,
                    halfDayToday,
                    onLeave,
                    pendingLeaves,
                    openTasks,
                    overdueTasks,
                    activeProjects,
                    monthlyPayrollCost,
                },
                attendanceSummary,
                recentEmployees,
                pendingLeaves: pendingLeavesList,
                overdueTasks: overdueTasksList,
                activeProjects: activeProjectsList,
                upcomingHolidays,
                latestNotifications,
                departmentStats,
                taskStats,
                payrollSummary,
                leaveSummary,
                upcomingBirthdays,
            },
        });
    } catch (error) {
        next(error);
    }
};

// GET /api/company/settings
const getCompanySettings = async (req, res, next) => {
    try {
        const company = await Company.findById(req.companyId).select("settings companyName");
        if (!company) {
            return res.status(404).json({ success: false, message: "Company not found" });
        }
        res.json({ success: true, settings: company.settings });
    } catch (error) {
        next(error);
    }
};

// PUT /api/company/settings
const updateCompanySettings = async (req, res, next) => {
    try {
        const company = await Company.findById(req.companyId);
        if (!company) {
            return res.status(404).json({ success: false, message: "Company not found" });
        }
        company.settings = { ...company.settings, ...req.body };
        await company.save();
        res.json({ success: true, settings: company.settings, message: "Settings updated successfully" });
    } catch (error) {
        next(error);
    }
};

// GET /api/company/announcements
const getCompanyAnnouncements = async (req, res, next) => {
    try {
        const announcements = await Announcement.find({
            $or: [
                { companyId: req.companyId },
                { targetCompanies: req.companyId },
                { targetType: "allCompanies" },
            ],
        })
            .populate("createdBy", "name email")
            .sort({ createdAt: -1 });

        res.json({ success: true, announcements });
    } catch (error) {
        next(error);
    }
};

// POST /api/company/announcements
const createCompanyAnnouncement = async (req, res, next) => {
    try {
        const { title, message, targetType = "selectedCompany", targetRoles = [], targetDepartments = [], publishStatus = "published", type = "info" } = req.body;
        if (!title || !message) {
            return res.status(400).json({ success: false, message: "Title and message are required" });
        }

        if (req.user.role === "Manager") {
            const employee = await Employee.findOne({ userId: req.user._id });
            if (!employee || !employee.permissions?.announcementsHolidays) {
                return res.status(403).json({ success: false, message: "Forbidden: insufficient permissions to create announcements" });
            }
        }

        console.log("[createCompanyAnnouncement] Request body:", req.body);
        console.log("[createCompanyAnnouncement] Extracted publishStatus:", publishStatus);

        const payload = {
            title,
            message,
            targetType,
            targetCompanies: [req.companyId],
            targetRoles,
            targetDepartments,
            status: publishStatus,
            type,
            createdBy: req.user._id,
            companyId: req.companyId, // Track company scope
        };

        console.log("[createCompanyAnnouncement] Mongoose Payload:", payload);

        const announcement = await Announcement.create(payload);

        console.log("[createCompanyAnnouncement] Saved Document:", announcement);
        // Notify ALL company employees for every published announcement
        await notifyCompany(req.companyId, "New Announcement", title, "announcement", { announcementId: announcement._id.toString() });

        res.status(201).json({ success: true, announcement, message: "Announcement created successfully" });
    } catch (error) {
        next(error);
    }
};

const deleteAnnouncement = async (req, res, next) => {
    try {
        const announcement = await Announcement.findOneAndDelete({ _id: req.params.id, companyId: req.companyId });
        if (!announcement) {
            return res.status(404).json({ success: false, message: "Announcement not found" });
        }
        res.json({ success: true, message: "Announcement deleted successfully" });
    } catch (error) {
        next(error);
    }
};

// GET /api/company/audit-logs
const getCompanyAuditLogs = async (req, res, next) => {
    try {
        const { entityId, module } = req.query;
        const filter = { companyId: req.companyId };
        if (entityId) filter.entityId = entityId;
        if (module) filter.module = module;

        const logs = await AuditLog.find(filter)
            .select("-oldData -newData")
            .populate("performedBy", "name email")
            .sort({ createdAt: -1 })
            .limit(100);
        res.json({ success: true, logs });
    } catch (error) {
        next(error);
    }
};

// GET /api/leaves/company
const getCompanyLeaves = async (req, res, next) => {
    try {
        const { employeeId, status, leaveType } = req.query;
        const filter = { companyId: req.companyId };
        if (employeeId) filter.employeeId = employeeId;
        if (status) filter.status = status;
        if (leaveType) filter.leaveType = leaveType;

        const leaves = await Leave.find(filter)
            .populate("employeeId", "firstName lastName employeeCode departmentId designationId")
            .sort({ createdAt: -1 })
            .lean();

        res.json({ success: true, leaves, count: leaves.length });
    } catch (error) {
        next(error);
    }
};

// PATCH /api/leaves/:id/approve
const approveLeave = async (req, res, next) => {
    try {
        const leave = await Leave.findOne({ _id: req.params.id, companyId: req.companyId });
        if (!leave) {
            return res.status(404).json({ success: false, message: "Leave request not found" });
        }
        if (leave.status !== "pending") {
            return res.status(400).json({ success: false, message: "Leave request is already processed" });
        }

        leave.status = "approved";
        leave.approvedBy = req.user._id;
        await leave.save();

        // Decrement leave balance
        let balance = await LeaveBalance.findOne({ employeeId: leave.employeeId, companyId: req.companyId });
        if (!balance) {
            balance = await LeaveBalance.createWithDefaults(leave.employeeId, req.companyId);
        }
        const type = leave.leaveType.toLowerCase();
        if (balance[type] !== undefined) {
            balance[type] = Math.max(0, balance[type] - leave.numberOfDays);
            await balance.save();
        }

        // Log audit trail
        await AuditLog.create({
            action: "approve_leave",
            module: "leaves",
            performedBy: req.user._id,
            companyId: req.companyId,
            newData: { leaveId: leave._id, status: "approved" },
        });

        // Notify Employee
        try {
            const emp = await Employee.findById(leave.employeeId).populate("userId");
            if (emp && emp.userId) {
                await Notification.create({
                    companyId: req.companyId,
                    userId: emp.userId._id || emp.userId,
                    title: "Leave Approved",
                    body: `Your leave request for ${leave.numberOfDays} days has been approved.`,
                    type: "leave",
                    data: { leaveId: leave._id.toString() },
                });
            }
        } catch (notifErr) {
            console.error("Error sending leave approval notification:", notifErr);
        }

        res.json({ success: true, leave, message: "Leave request approved successfully" });
    } catch (error) {
        next(error);
    }
};

// PATCH /api/leaves/:id/reject
const rejectLeave = async (req, res, next) => {
    try {
        const { rejectionReason } = req.body;
        if (!rejectionReason) {
            return res.status(400).json({ success: false, message: "Rejection reason is required" });
        }

        const leave = await Leave.findOne({ _id: req.params.id, companyId: req.companyId });
        if (!leave) {
            return res.status(404).json({ success: false, message: "Leave request not found" });
        }
        if (leave.status !== "pending") {
            return res.status(400).json({ success: false, message: "Leave request is already processed" });
        }

        leave.status = "rejected";
        leave.rejectionReason = rejectionReason;
        leave.approvedBy = req.user._id;
        await leave.save();

        // Log audit trail
        await AuditLog.create({
            action: "reject_leave",
            module: "leaves",
            performedBy: req.user._id,
            companyId: req.companyId,
            newData: { leaveId: leave._id, status: "rejected", reason: rejectionReason },
        });

        // Notify Employee
        try {
            const emp = await Employee.findById(leave.employeeId).populate("userId");
            if (emp && emp.userId) {
                await Notification.create({
                    companyId: req.companyId,
                    userId: emp.userId._id || emp.userId,
                    title: "Leave Rejected",
                    body: `Your leave request has been rejected. Reason: ${rejectionReason}`,
                    type: "leave",
                    data: { leaveId: leave._id.toString() },
                });
            }
        } catch (notifErr) {
            console.error("Error sending leave rejection notification:", notifErr);
        }

        res.json({ success: true, leave, message: "Leave request rejected successfully" });
    } catch (error) {
        next(error);
    }
};

const getLeaveBalance = async (req, res, next) => {
    try {
        const { employeeId } = req.query;

        // Manager Department access control
        let managerDeptIds = null;
        if (req.user && req.user.role === "Manager") {
            const managerEmp = await Employee.findOne({ userId: req.user._id, companyId: req.companyId }).lean();
            if (managerEmp) {
                const primaryDeptId = managerEmp.departmentId;
                const allowedDeptIds = (managerEmp.accessibleDepartments || []).map(id => id.toString());

                managerDeptIds = [];
                if (primaryDeptId) managerDeptIds.push(primaryDeptId.toString());
                allowedDeptIds.forEach(id => {
                    if (id) managerDeptIds.push(id);
                });
            }
        }

        if (employeeId) {
            if (managerDeptIds) {
                const targetEmp = await Employee.findById(employeeId).lean();
                const targetEmpDeptId = targetEmp?.departmentId ? targetEmp.departmentId.toString() : null;
                if (!targetEmpDeptId || !managerDeptIds.includes(targetEmpDeptId)) {
                    return res.status(403).json({ message: "Forbidden: You can only view leave balance for employees in your department(s)" });
                }
            }

            let balance = await LeaveBalance.findOne({ employeeId, companyId: req.companyId });
            if (!balance) {
                // Create initial default balance
                balance = await LeaveBalance.createWithDefaults(employeeId, req.companyId);
            }
            return res.json({ success: true, balance });
        }

        // Return balances
        let balancesQuery = { companyId: req.companyId };
        if (managerDeptIds) {
            const employeesInDepts = await Employee.find({ companyId: req.companyId, departmentId: { $in: managerDeptIds } }).select("_id").lean();
            const empIds = employeesInDepts.map(e => e._id);
            balancesQuery.employeeId = { $in: empIds };
        }

        const balances = await LeaveBalance.find(balancesQuery).populate("employeeId", "firstName lastName employeeCode");
        res.json({ success: true, balances });
    } catch (error) {
        next(error);
    }
};

// PUT /api/leaves/balance/:employeeId
const updateLeaveBalance = async (req, res, next) => {
    try {
        const { casual, sick, annual, lop, unpaid } = req.body;

        // Manager Department check
        if (req.user && req.user.role === "Manager") {
            const managerEmp = await Employee.findOne({ userId: req.user._id, companyId: req.companyId }).lean();
            if (managerEmp) {
                const primaryDeptId = managerEmp.departmentId;
                const allowedDeptIds = (managerEmp.accessibleDepartments || []).map(id => id.toString());

                const managerDeptIds = [];
                if (primaryDeptId) managerDeptIds.push(primaryDeptId.toString());
                allowedDeptIds.forEach(id => {
                    if (id) managerDeptIds.push(id);
                });

                const targetEmp = await Employee.findById(req.params.employeeId).lean();
                const targetEmpDeptId = targetEmp?.departmentId ? targetEmp.departmentId.toString() : null;
                if (!targetEmpDeptId || !managerDeptIds.includes(targetEmpDeptId)) {
                    return res.status(403).json({ message: "Forbidden: You can only edit leave balance for employees in your department(s)" });
                }
            }
        }

        let balance = await LeaveBalance.findOne({ employeeId: req.params.employeeId, companyId: req.companyId });
        if (!balance) {
            balance = new LeaveBalance({
                employeeId: req.params.employeeId,
                companyId: req.companyId,
            });
        }

        if (casual !== undefined) balance.casual = casual;
        if (sick !== undefined) balance.sick = sick;
        if (annual !== undefined) balance.annual = annual;
        // accept both `lop` (old) and `unpaid` (new mobile/web alias)
        if (lop !== undefined) balance.lop = lop;
        if (unpaid !== undefined) balance.lop = unpaid;

        await balance.save();
        res.json({ success: true, balance, message: "Leave balance updated successfully" });
    } catch (error) {
        next(error);
    }
};

// GET /api/company/leave-settings
const getLeaveSettings = async (req, res, next) => {
    try {
        const CompanyLeaveSettings = require("../models/CompanyLeaveSettings");
        let settings = await CompanyLeaveSettings.findOne({ companyId: req.companyId });
        if (!settings) {
            settings = await CompanyLeaveSettings.create({ companyId: req.companyId });
        }
        res.json({ success: true, settings });
    } catch (error) {
        next(error);
    }
};

// PUT /api/company/leave-settings
const updateLeaveSettings = async (req, res, next) => {
    try {
        const CompanyLeaveSettings = require("../models/CompanyLeaveSettings");
        let settings = await CompanyLeaveSettings.findOne({ companyId: req.companyId });
        if (!settings) {
            settings = new CompanyLeaveSettings({ companyId: req.companyId });
        }

        const fields = [
            "allowManagerLeaveApproval",
            "allowPaidLeaveOverflowAsLWP",
            "defaultCasualLeaves",
            "defaultSickLeaves",
            "defaultAnnualLeaves",
            "defaultUnpaidLeaves"
        ];

        fields.forEach((field) => {
            if (req.body[field] !== undefined) {
                settings[field] = req.body[field];
            }
        });

        await settings.save();
        res.json({ success: true, settings, message: "Leave settings updated successfully" });
    } catch (error) {
        next(error);
    }
};

// POST /api/company/leaves
const createLeaveAdmin = async (req, res, next) => {
    try {
        const { employeeId, leaveType, startDate, endDate, reason } = req.body;
        if (!employeeId || !leaveType || !startDate || !endDate || !reason) {
            return res.status(400).json({ success: false, message: "All fields are required" });
        }

        const start = new Date(startDate);
        const end = new Date(endDate);
        if (start > end) {
            return res.status(400).json({ success: false, message: "Start date must be before end date" });
        }

        const diffTime = Math.abs(end - start);
        const numberOfDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1;

        // Validate Employee belongs to company
        const employee = await Employee.findOne({ _id: employeeId, companyId: req.companyId });
        if (!employee) {
            return res.status(404).json({ success: false, message: "Employee not found" });
        }

        // Capitalize leaveType to match Mongoose schema enum: ["Casual", "Sick", "Annual", "LOP"]
        let formattedLeaveType = leaveType.charAt(0).toUpperCase() + leaveType.slice(1).toLowerCase();
        if (formattedLeaveType === "Lop") formattedLeaveType = "LOP";
        if (formattedLeaveType === "Earned") formattedLeaveType = "Annual"; // Map Earned to Annual

        if (!["Casual", "Sick", "Annual", "LOP"].includes(formattedLeaveType)) {
            return res.status(400).json({ success: false, message: "Invalid leave type. Allowed: Casual, Sick, Annual, LOP" });
        }

        // Check balance
        let balance = await LeaveBalance.findOne({ employeeId, companyId: req.companyId });
        if (!balance) {
            balance = await LeaveBalance.createWithDefaults(employeeId, req.companyId);
        }

        if (formattedLeaveType !== "LOP") {
            const typeKey = formattedLeaveType.toLowerCase();
            const available = balance[typeKey] || 0;
            if (numberOfDays > available) {
                return res.status(400).json({
                    success: false,
                    message: `Insufficient leave balance. Requested ${numberOfDays} days but only ${available} days available for ${formattedLeaveType}.`,
                });
            }
        }

        // Create approved leave
        const newLeave = await Leave.create({
            companyId: req.companyId,
            employeeId,
            leaveType: formattedLeaveType,
            startDate: start,
            endDate: end,
            numberOfDays,
            reason: reason.trim(),
            status: "approved",
            approvedBy: req.user._id,
        });

        // Deduct balance
        if (formattedLeaveType !== "LOP") {
            const typeKey = formattedLeaveType.toLowerCase();
            balance[typeKey] = Math.max(0, balance[typeKey] - numberOfDays);
            await balance.save();
        } else {
            balance.lop = (balance.lop || 0) + numberOfDays;
            await balance.save();
        }

        // Audit Log
        await AuditLog.create({
            action: "create_leave_admin",
            module: "leaves",
            performedBy: req.user._id,
            companyId: req.companyId,
            newData: { leaveId: newLeave._id, status: "approved" },
        });

        // Notify Employee
        try {
            const emp = await Employee.findById(employeeId).populate("userId");
            if (emp && emp.userId) {
                await Notification.create({
                    companyId: req.companyId,
                    userId: emp.userId._id || emp.userId,
                    title: "Leave Recorded by Admin",
                    body: `An approved leave of ${numberOfDays} days (${formattedLeaveType}) has been recorded on your behalf.`,
                    type: "leave",
                    data: { leaveId: newLeave._id.toString() },
                });
            }
        } catch (notifErr) {
            console.error("Error sending admin leave notification:", notifErr);
        }

        res.status(201).json({
            success: true,
            message: "Leave recorded and approved successfully",
            leave: newLeave,
        });
    } catch (error) {
        next(error);
    }
};

// Holidays CRUD
const createHoliday = async (req, res, next) => {
    try {
        const { name, date, description, type = "public" } = req.body;
        if (!name || !date) {
            return res.status(400).json({ success: false, message: "Name and date are required" });
        }

        if (req.user.role === "Manager") {
            const employee = await Employee.findOne({ userId: req.user._id });
            if (!employee || !employee.permissions?.announcementsHolidays) {
                return res.status(403).json({ success: false, message: "Forbidden: insufficient permissions for holidays" });
            }
        }

        const holiday = await Holiday.create({
            name,
            date,
            description,
            type,
            companyId: req.companyId,
        });
        res.status(201).json({ success: true, holiday, message: "Holiday created successfully" });
    } catch (error) {
        next(error);
    }
};

const getHolidays = async (req, res, next) => {
    try {
        const holidays = await Holiday.find({ companyId: req.companyId }).sort({ date: 1 });
        res.json({ success: true, holidays });
    } catch (error) {
        next(error);
    }
};

const updateHoliday = async (req, res, next) => {
    try {
        const holiday = await Holiday.findOne({ _id: req.params.id, companyId: req.companyId });
        if (!holiday) {
            return res.status(404).json({ success: false, message: "Holiday not found" });
        }

        if (req.user.role === "Manager") {
            const employee = await Employee.findOne({ userId: req.user._id });
            if (!employee || !employee.permissions?.announcementsHolidays) {
                return res.status(403).json({ success: false, message: "Forbidden: insufficient permissions for holidays" });
            }
        }

        const { name, date, description, type } = req.body;

        if (name !== undefined) holiday.name = name;
        if (date !== undefined) holiday.date = date;
        if (description !== undefined) holiday.description = description;
        if (type !== undefined) holiday.type = type;

        await holiday.save();
        res.json({ success: true, holiday, message: "Holiday updated successfully" });
    } catch (error) {
        next(error);
    }
};

const deleteHoliday = async (req, res, next) => {
    try {
        const holiday = await Holiday.findOneAndDelete({ _id: req.params.id, companyId: req.companyId });
        if (!holiday) {
            return res.status(404).json({ success: false, message: "Holiday not found" });
        }

        if (req.user.role === "Manager") {
            const employee = await Employee.findOne({ userId: req.user._id });
            if (!employee || !employee.permissions?.announcementsHolidays) {
                return res.status(403).json({ success: false, message: "Forbidden: insufficient permissions for holidays" });
            }
        }

        res.json({ success: true, message: "Holiday deleted successfully" });
    } catch (error) {
        next(error);
    }
};

// Projects CRUD
const createProject = async (req, res, next) => {
    try {
        const { name, description, status, members, projectManager, startDate, endDate, priority, estimatedWorkingDays, clientName, departmentId, attachments, nextFollowUpDate } = req.body;
        if (!name) {
            return res.status(400).json({ success: false, message: "Project name is required" });
        }
        const sanitizedAttachments = Array.isArray(attachments)
            ? attachments.map(att => ({
                fileName: att.fileName || att.name || "Attachment",
                fileUrl: att.fileUrl || att.url || "",
                fileType: att.fileType || att.type || "",
            }))
            : [];

        const project = await Project.create({
            name,
            description,
            status,
            members,
            projectManager: projectManager || null,
            startDate,
            endDate,
            priority: priority || "medium",
            estimatedWorkingDays: estimatedWorkingDays || 0,
            clientName: clientName || "",
            departmentId: departmentId || null,
            companyId: req.companyId,
            attachments: sanitizedAttachments,
            nextFollowUpDate,
        });

        // Notify members (fire and forget)
        if (members && members.length > 0) {
            sendNotificationToEmployees(
                req.companyId,
                members,
                "New Project Assigned",
                `You have been assigned to the project: ${name}`,
                "project",
                { projectId: project._id.toString() }
            );
        }

        res.status(201).json({ success: true, project, message: "Project created successfully" });
    } catch (error) {
        next(error);
    }
};

const getProjects = async (req, res, next) => {
    try {
        const projects = await Project.find({ companyId: req.companyId })
            .populate("members", "firstName lastName employeeCode departmentId")
            .populate("projectManager", "firstName lastName employeeCode")
            .sort({ createdAt: -1 })
            .lean();
        res.json({ success: true, projects });
    } catch (error) {
        next(error);
    }
};

const getProjectById = async (req, res, next) => {
    try {
        const project = await Project.findOne({ _id: req.params.id, companyId: req.companyId })
            .populate("members", "firstName lastName employeeCode departmentId")
            .populate("projectManager", "firstName lastName employeeCode");
        if (!project) {
            return res.status(404).json({ success: false, message: "Project not found" });
        }
        res.json({ success: true, project });
    } catch (error) {
        next(error);
    }
};

const updateProject = async (req, res, next) => {
    try {
        const project = await Project.findOne({ _id: req.params.id, companyId: req.companyId });
        if (!project) {
            return res.status(404).json({ success: false, message: "Project not found" });
        }
        const oldStatus = project.status;
        const oldMembers = project.members.map(m => m.toString());

        const fields = ["name", "description", "status", "members", "projectManager", "startDate", "endDate", "priority", "estimatedWorkingDays", "clientName", "milestones", "activityLog", "departmentId", "nextFollowUpDate"];
        fields.forEach((f) => {
            if (req.body[f] !== undefined) project[f] = req.body[f];
        });

        if (req.body.attachments !== undefined && Array.isArray(req.body.attachments)) {
            project.attachments = req.body.attachments.map(att => ({
                fileName: att.fileName || att.name || "Attachment",
                fileUrl: att.fileUrl || att.url || "",
                fileType: att.fileType || att.type || "",
            }));
        }

        await project.save();

        // Notify status change
        if (req.body.status && req.body.status !== oldStatus) {
            if (project.members && project.members.length > 0) {
                await sendNotificationToEmployees(
                    req.companyId,
                    project.members,
                    "Project Status Updated",
                    `The status of project "${project.name}" has been updated to ${project.status}`,
                    "project",
                    { projectId: project._id.toString() }
                );
            }
        }

        // Notify new members
        if (req.body.members) {
            const newMembers = req.body.members.filter(m => !oldMembers.includes(m.toString()));
            if (newMembers.length > 0) {
                sendNotificationToEmployees(
                    req.companyId,
                    newMembers,
                    "Added to Project",
                    `You have been added to the project "${project.name}"`,
                    "project",
                    { projectId: project._id.toString() }
                );
            }
        }

        res.json({ success: true, project, message: "Project updated successfully" });
    } catch (error) {
        next(error);
    }
};

const deleteProject = async (req, res, next) => {
    try {
        const project = await Project.findOneAndDelete({ _id: req.params.id, companyId: req.companyId });
        if (!project) {
            return res.status(404).json({ success: false, message: "Project not found" });
        }
        res.json({ success: true, message: "Project deleted successfully" });
    } catch (error) {
        next(error);
    }
};

// Tasks CRUD
const createTask = async (req, res, next) => {
    try {
        const isAllowed = await checkUserPermission(req.user._id, req.companyId || req.user?.companyId, req.user.role, "tasks", "create");
        if (!isAllowed) {
            return res.status(403).json({ success: false, message: "You are not allowed to create tasks" });
        }

        const {
            title, description, projectId, status, priority,
            assignmentType, assignees, dueDate, subtasks,
            isRecurringTemplate, recurrenceType, estimatedHours,
            actualHours, dependsOn, attachments, activityLog
        } = req.body;
        if (!title) {
            return res.status(400).json({ success: false, message: "Task title is required" });
        }

        // Resolve dynamic task status
        const TaskStatus = require("../models/TaskStatus");
        let targetStatusKey = status || "pending";
        let statusDoc = await TaskStatus.findOne({ companyId: req.companyId, statusKey: targetStatusKey });

        // Fallback to default if somehow not found
        if (!statusDoc) {
            statusDoc = await TaskStatus.findOne({ companyId: req.companyId, statusKey: "pending" });
        }

        const task = await Task.create({
            title,
            description,
            projectId: projectId || null,
            status: statusDoc ? statusDoc.statusKey : targetStatusKey,
            statusId: statusDoc ? statusDoc._id : null,
            statusKey: statusDoc ? statusDoc.statusKey : targetStatusKey,
            statusLabelSnapshot: statusDoc ? statusDoc.label : "Pending",
            statusColorSnapshot: statusDoc ? statusDoc.color : "#f59e0b",
            statusOrderSnapshot: statusDoc ? statusDoc.order : 1,
            priority,
            assignmentType: assignmentType || "single",
            assignees: Array.isArray(assignees) ? assignees : (assignees ? [assignees] : []),
            dueDate,
            subtasks: subtasks || [],
            companyId: req.companyId,
            isRecurringTemplate: isRecurringTemplate || false,
            recurrenceType: recurrenceType || "none",
            nextRunAt: isRecurringTemplate ? new Date() : null,
            estimatedHours: estimatedHours || 0,
            actualHours: actualHours || 0,
            dependsOn: dependsOn || [],
            attachments: attachments || [],
            activityLog: activityLog || [{ action: "Task created", performedBy: req.user.name || "Company Admin" }]
        });

        // Notify assignees
        if (assignees && assignees.length > 0) {
            sendNotificationToEmployees(
                req.companyId,
                assignees,
                "New Task Assigned",
                `You have been assigned a new task: ${title}`,
                "task",
                { taskId: task._id.toString(), projectId: projectId ? projectId.toString() : null }
            );
        }

        res.status(201).json({ success: true, task, message: "Task created successfully" });
    } catch (error) {
        next(error);
    }
};

const getDashboardAttendanceDetails = async (req, res, next) => {
    try {
        const { companyId } = req;
        const { status, date } = req.query; // date in YYYY-MM-DD

        if (!date || !status) {
            return res.status(400).json({ success: false, message: "Date and Status are required" });
        }

        let filterStatus = status;
        let attendanceFilter = { companyId, date };

        // Status can be present, absent, half_day, late, paid_leave, unpaid_leave
        if (status === "present") {
            attendanceFilter.status = { $in: ["present", "late"] };
        } else if (status === "leave") {
            attendanceFilter.status = { $in: ["paid_leave", "unpaid_leave"] };
        } else if (status === "half_day" || status === "half-day") {
            attendanceFilter.status = { $in: ["half_day", "half-day"] };
        } else {
            attendanceFilter.status = status;
        }

        let attendanceRecords = await Attendance.find(attendanceFilter)
            .populate({
                path: "employeeId",
                select: "firstName lastName userId",
                populate: {
                    path: "userId",
                    select: "name photo avatar"
                }
            })
            .select("punchInTime punchOutTime status totalHours employeeId date");

        // If "absent" and records are empty for today (cron hasn't run), we might need to find all active employees NOT in attendance
        if (status === "absent" && attendanceRecords.length === 0) {
            const todayString = new Date().toISOString().slice(0, 10);
            if (date === todayString) {
                const allAttendances = await Attendance.find({ companyId, date }).select("employeeId");
                const attendedEmployeeIds = allAttendances.map(a => a.employeeId.toString());

                const activeEmployees = await Employee.find({
                    companyId,
                    status: "active"
                }).populate({
                    path: "userId",
                    select: "name photo avatar"
                }).select("firstName lastName userId");

                attendanceRecords = activeEmployees
                    .filter(emp => !attendedEmployeeIds.includes(emp._id.toString()))
                    .map(emp => ({
                        _id: emp._id, // mock id
                        employeeId: {
                            _id: emp._id,
                            firstName: emp.firstName,
                            lastName: emp.lastName,
                            userId: emp.userId
                        },
                        status: "absent",
                        punchInTime: null,
                        punchOutTime: null,
                        totalHours: 0,
                        date: date
                    }));
            }
        }

        const formattedList = attendanceRecords.map(record => {
            const emp = record.employeeId || {};
            const user = emp.userId || emp.user || {};
            return {
                _id: record._id,
                employeeId: emp._id,
                name: user.name || `${emp.firstName || ""} ${emp.lastName || ""}`.trim() || "Unknown",
                photo: user.photo || user.avatar || null,
                punchInTime: record.punchInTime,
                punchOutTime: record.punchOutTime,
                status: record.status,
                totalHours: record.totalHours
            };
        });

        res.json({
            success: true,
            data: formattedList
        });

    } catch (error) {
        next(error);
    }
};

const getRecentTasks = async (req, res, next) => {
    try {
        const { projectId, status, isRecurring } = req.query;
        const filter = { companyId: req.companyId };

        // By default, exclude recurring templates unless explicitly requested
        if (isRecurring === 'true' || isRecurring === true) {
            filter.isRecurringTemplate = true;
        } else {
            filter.isRecurringTemplate = { $ne: true };
        }

        if (projectId) filter.projectId = projectId;
        if (status) filter.status = status;

        const tasks = await Task.find(filter)
            .populate({
                path: "assignedTo",
                select: "firstName lastName fullName photo employeeCode designationId departmentName departmentId departmentIds",
                populate: [
                    { path: "departmentId", select: "name", strictPopulate: false },
                    { path: "departmentIds", select: "name", strictPopulate: false }
                ]
            })
            .populate("projectId", "name")
            .populate("departmentId", "name")
            .sort({ dueDate: 1 })
            .lean();

        res.json({ success: true, tasks });
    } catch (error) {
        next(error);
    }
};

const getTaskById = async (req, res, next) => {
    try {
        let task = await Task.findOne({ _id: req.params.id, companyId: req.companyId })
            .populate({
                path: "assignedTo",
                select: "firstName lastName fullName photo employeeCode designationId departmentName departmentId departmentIds",
                populate: [
                    { path: "departmentId", select: "name", strictPopulate: false },
                    { path: "departmentIds", select: "name", strictPopulate: false }
                ]
            })
            .populate("assignedBy", "name")
            .populate("projectId", "name")
            .populate({ path: "departmentId", select: "name", strictPopulate: false });

        let isTemplate = false;
        if (!task) {
            const TaskTemplate = require("../models/TaskTemplate");
            task = await TaskTemplate.findOne({ _id: req.params.id, companyId: req.companyId })
                .populate({
                    path: "assignedTo",
                    select: "firstName lastName fullName photo employeeCode designationId departmentName departmentId departmentIds",
                    populate: [
                        { path: "departmentId", select: "name", strictPopulate: false },
                        { path: "departmentIds", select: "name", strictPopulate: false }
                    ]
                })
                .populate("assignedBy", "name")
                .populate("projectId", "name")
                .populate({ path: "departmentId", select: "name", strictPopulate: false });
            if (task) isTemplate = true;
        }

        if (!task) {
            return res.status(404).json({ success: false, message: "Task not found" });
        }

        if (isTemplate) {
            const taskObj = task.toObject ? task.toObject() : task;
            taskObj.isTemplate = true;
            taskObj.status = taskObj.status || "pending";
            return res.json({ success: true, task: taskObj });
        }
        res.json({ success: true, task });
    } catch (error) {
        next(error);
    }
};

const updateTask = async (req, res, next) => {
    try {
        const isAllowed = await checkUserPermission(req.user._id, req.companyId || req.user?.companyId, req.user.role, "tasks", "edit");
        if (!isAllowed) {
            return res.status(403).json({ success: false, message: "You are not allowed to edit tasks" });
        }

        const task = await Task.findOne({ _id: req.params.id, companyId: req.companyId });
        if (!task) {
            return res.status(404).json({ success: false, message: "Task not found" });
        }

        // Track new assignees for notification
        const oldAssignees = task.assignees ? task.assignees.map(a => a.toString()) : [];

        const fields = [
            "title", "description", "projectId", "status", "priority",
            "assignmentType", "assignees", "dueDate", "subtasks", "comments",
            "estimatedHours", "actualHours", "dependsOn", "attachments", "activityLog"
        ];
        fields.forEach((f) => {
            if (req.body[f] !== undefined) {
                if (f === 'projectId' && req.body[f] === '') {
                    task[f] = null;
                } else {
                    task[f] = req.body[f];
                }
            }
        });
        await task.save();

        // Send notifications to newly added assignees
        if (req.body.assignees && Array.isArray(req.body.assignees)) {
            const newAssignees = req.body.assignees.filter(a => !oldAssignees.includes(a.toString()));
            if (newAssignees.length > 0) {
                sendNotificationToEmployees(
                    req.companyId,
                    newAssignees,
                    "New Task Assigned",
                    `You have been assigned a task: ${task.title}`,
                    "task",
                    { taskId: task._id.toString(), projectId: task.projectId ? task.projectId.toString() : null }
                );
            }
        }

        res.json({ success: true, task, message: "Task updated successfully" });
    } catch (error) {
        next(error);
    }
};

const updateTaskStatus = async (req, res, next) => {
    try {
        const { status } = req.body;
        if (!status) {
            return res.status(400).json({ success: false, message: "Status is required" });
        }
        let task = await Task.findOne({ _id: req.params.id, companyId: req.companyId });
        let isTemplate = false;
        if (!task) {
            const TaskTemplate = require("../models/TaskTemplate");
            task = await TaskTemplate.findOne({ _id: req.params.id, companyId: req.companyId });
            if (task) isTemplate = true;
        }
        if (!task) {
            return res.status(404).json({ success: false, message: "Task not found" });
        }

        // Resolve dynamic task status
        const TaskStatus = require("../models/TaskStatus");
        let statusDoc = await TaskStatus.findOne({ companyId: req.companyId, statusKey: status });
        if (!statusDoc) {
            // Fallback for old endpoints if status is ID instead of key
            statusDoc = await TaskStatus.findOne({ companyId: req.companyId, _id: status }).catch(() => null);
        }
        if (!statusDoc) {
            return res.status(400).json({ success: false, message: "Invalid task status provided" });
        }

        const oldStatusLabel = task.statusLabelSnapshot || task.status;

        task.status = statusDoc.statusKey;
        task.statusId = statusDoc._id;
        task.statusKey = statusDoc.statusKey;
        task.statusLabelSnapshot = statusDoc.label;
        task.statusColorSnapshot = statusDoc.color;
        task.statusOrderSnapshot = statusDoc.order;

        task.activityLog.push({
            action: "Status updated",
            performedBy: req.user.name || "Company Admin",
            oldStatus: oldStatusLabel,
            newStatus: statusDoc.label,
        });

        await task.save();

        // Notify assignees
        if (task.assignees && task.assignees.length > 0) {
            await sendNotificationToEmployees(
                req.companyId,
                task.assignees,
                "Task Status Updated",
                `Company Admin changed the status of "${task.title}" to ${status}`,
                "task",
                { taskId: task._id.toString() }
            );
        }

        res.json({ success: true, task, message: "Task status updated successfully" });
    } catch (error) {
        next(error);
    }
};

const deleteTask = async (req, res, next) => {
    try {
        const isAllowed = await checkUserPermission(req.user._id, req.companyId || req.user?.companyId, req.user.role, "tasks", "cancel");
        if (!isAllowed) {
            return res.status(403).json({ success: false, message: "You are not allowed to cancel/delete tasks" });
        }

        const task = await Task.findOne({ _id: req.params.id, companyId: req.companyId });
        if (!task) {
            return res.status(404).json({ success: false, message: "Task not found" });
        }

        task.status = "cancelled";
        task.timerActive = false;
        await task.save();

        res.json({ success: true, message: "Task cancelled successfully" });
    } catch (error) {
        next(error);
    }
};

const addTaskComment = async (req, res, next) => {
    try {
        const task = await Task.findOne({ _id: req.params.id, companyId: req.companyId });
        if (!task) {
            return res.status(404).json({ success: false, message: "Task not found" });
        }

        const { comment, attachments } = req.body;
        if ((!comment || !String(comment).trim()) && (!attachments || attachments.length === 0)) {
            return res.status(400).json({ success: false, message: "Comment content or media attachment is required" });
        }

        const userName = req.user.name || "Company Admin";
        const userRole = req.user.role || "CompanyAdmin";

        if (!task.comments) task.comments = [];
        task.comments.push({
            comment: comment ? comment.trim() : "",
            senderName: userName,
            senderRole: userRole,
            attachments: attachments || [],
        });

        task.activityLog.push({
            action: "Added a comment",
            performedBy: userName,
        });

        await task.save();

        // Notify assignees
        if (task.assignees && task.assignees.length > 0) {
            await sendNotificationToEmployees(
                req.companyId,
                task.assignees,
                "New Comment on Task",
                `${userName} commented on task: ${task.title}`,
                "task",
                { taskId: task._id.toString() }
            );
        }

        res.json({ success: true, message: "Note added successfully", task });
    } catch (error) {
        next(error);
    }
};

const uploadTaskAttachmentAdmin = async (req, res, next) => {
    try {
        const task = await Task.findOne({ _id: req.params.id, companyId: req.companyId });
        if (!task) {
            return res.status(404).json({ success: false, message: "Task not found" });
        }

        if (!req.file) {
            return res.status(400).json({ success: false, message: "No file uploaded" });
        }

        const { uploadFileToFirebase } = require("../services/firebaseService");
        const fileUrl = await uploadFileToFirebase(req.file.buffer, req.file.originalname, "task-attachments");
        const newAttachment = {
            fileUrl,
            fileName: req.file.originalname,
            fileType: req.file.mimetype,
        };

        task.attachments.push(newAttachment);

        const userName = req.user.name || "Company Admin";
        task.activityLog.push({
            action: `Uploaded attachment: ${req.file.originalname}`,
            performedBy: userName,
        });

        await task.save();

        res.json({ success: true, message: "Attachment uploaded successfully", task, attachment: newAttachment });
    } catch (error) {
        next(error);
    }
};

// Payroll & Salary Structure Controllers
const getSalaryStructure = async (req, res, next) => {
    try {
        let structure = await SalaryStructure.findOne({ employeeId: req.params.employeeId, companyId: req.companyId });
        if (!structure) {
            structure = await SalaryStructure.create({
                employeeId: req.params.employeeId,
                companyId: req.companyId,
                basicSalary: 25000,
                hra: 10000,
                allowances: 5000,
                deductions: 2000,
            });
        }
        res.json({ success: true, salaryStructure: structure });
    } catch (error) {
        next(error);
    }
};

const createOrUpdateSalaryStructure = async (req, res, next) => {
    try {
        const { basicSalary, hra, allowances, deductions } = req.body;
        let structure = await SalaryStructure.findOne({ employeeId: req.params.employeeId, companyId: req.companyId });
        if (!structure) {
            structure = new SalaryStructure({
                employeeId: req.params.employeeId,
                companyId: req.companyId,
            });
        }

        if (basicSalary !== undefined) structure.basicSalary = basicSalary;
        if (hra !== undefined) structure.hra = hra;
        if (allowances !== undefined) structure.allowances = allowances;
        if (deductions !== undefined) structure.deductions = deductions;

        await structure.save();
        res.json({ success: true, salaryStructure: structure, message: "Salary structure updated successfully" });
    } catch (error) {
        next(error);
    }
};

const generatePayroll = async (req, res, next) => {
    try {
        const { month, year } = req.body;
        if (!month || !year) {
            return res.status(400).json({ success: false, message: "Month and year are required" });
        }

        const targetMonth = parseInt(month, 10);
        const targetYear = parseInt(year, 10);
        const startDate = new Date(targetYear, targetMonth - 1, 1);
        const endDate = new Date(targetYear, targetMonth, 0, 23, 59, 59, 999);

        const companySettings = await Company.findById(req.companyId).select("settings").lean();
        const workingDays = companySettings?.settings?.workingDays || ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday"];

        // Calculate total standard working days
        let totalWorkingDays = 0;
        const daysInMonth = endDate.getDate();
        for (let d = 1; d <= daysInMonth; d++) {
            const dayDate = new Date(targetYear, targetMonth - 1, d);
            const dayName = dayDate.toLocaleDateString("en-US", { weekday: "long", timeZone: "Asia/Kolkata" });
            if (workingDays.includes(dayName)) {
                totalWorkingDays++;
            }
        }
        const totalDays = totalWorkingDays; // Keep name as totalDays for frontend rendering compatibility

        const employees = await Employee.find({ companyId: req.companyId, status: "active" }).lean();
        const generated = [];
        const skipped = [];

        const empIds = employees.map(e => e._id);

        // Pre-fetch all data for all employees in parallel (eliminates N+1 queries)
        const [allAttendance, allLeaves, allSalaryStructures, allTasks] = await Promise.all([
            Attendance.find({ companyId: req.companyId, month: targetMonth, year: targetYear })
                .select("employeeId date status")
                .lean(),
            Leave.find({
                companyId: req.companyId,
                employeeId: { $in: empIds },
                status: "approved",
                $or: [
                    { startDate: { $gte: startDate, $lte: endDate } },
                    { endDate: { $gte: startDate, $lte: endDate } },
                    { startDate: { $lte: startDate }, endDate: { $gte: endDate } }
                ]
            }).select("employeeId startDate endDate leaveType").lean(),
            SalaryStructure.find({ companyId: req.companyId, employeeId: { $in: empIds } })
                .select("employeeId basicSalary hra allowances deductions")
                .lean(),
            Task.find({ companyId: req.companyId, assignedTo: { $in: empIds }, createdAt: { $lte: endDate }, isRecurringTemplate: { $ne: true } })
                .select("assignedTo status")
                .lean(),
        ]);

        // Build lookup maps by employeeId
        const attendanceByEmp = {};
        allAttendance.forEach(r => {
            const key = r.employeeId.toString();
            if (!attendanceByEmp[key]) attendanceByEmp[key] = [];
            attendanceByEmp[key].push(r);
        });

        const leavesByEmp = {};
        allLeaves.forEach(l => {
            const key = l.employeeId.toString();
            if (!leavesByEmp[key]) leavesByEmp[key] = [];
            leavesByEmp[key].push(l);
        });

        const salaryByEmp = {};
        allSalaryStructures.forEach(ss => { salaryByEmp[ss.employeeId.toString()] = ss; });

        const tasksByEmp = {};
        allTasks.forEach(t => {
            (t.assignedTo || []).forEach(aId => {
                const key = aId.toString();
                if (!tasksByEmp[key]) tasksByEmp[key] = [];
                tasksByEmp[key].push(t);
            });
        });

        for (const emp of employees) {
            try {
                let ss = emp.salaryDetails;
                if (!ss || Object.keys(ss).length === 0 || (!ss.basic && !ss.basicSalary)) {
                    ss = salaryByEmp[emp._id.toString()] || {
                        basicSalary: 20000,
                        hra: 8000,
                        allowances: 4000,
                        deductions: 1500,
                    };
                }

                const ssBasic = ss.basic || ss.basicSalary || 20000;
                const ssHra = ss.hra || 8000;
                const ssAllowances = ss.allowances || 4000;
                const ssDeductions = ss.deductions || 1500;

                // 1. Use pre-fetched attendance records
                const attendanceRecords = attendanceByEmp[emp._id.toString()] || [];

                let presentCount = 0;
                let lateCount = 0;
                let halfDayCount = 0;
                let absentCount = 0;

                attendanceRecords.forEach((record) => {
                    if (record.date) {
                        const recDate = new Date(record.date);
                        const dayOfWeek = recDate.getDay();
                        // Only consider attendance records on weekdays (Monday to Friday)
                        if (dayOfWeek !== 0 && dayOfWeek !== 6) {
                            const status = record.status ? record.status.toLowerCase() : "";
                            if (status === "present") {
                                presentCount++;
                            } else if (status === "late") {
                                lateCount++;
                            } else if (status === "half_day" || status === "half-day") {
                                halfDayCount++;
                            } else if (status === "absent") {
                                absentCount++;
                            }
                        }
                    }
                });

                // 2. Use pre-fetched approved leaves
                const leaves = leavesByEmp[emp._id.toString()] || [];

                let approvedUnpaidLeaveCount = 0;
                leaves.forEach((l) => {
                    const current = new Date(l.startDate);
                    const end = new Date(l.endDate);
                    while (current <= end) {
                        if (
                            current.getMonth() + 1 === targetMonth &&
                            current.getFullYear() === targetYear
                        ) {
                            const dayOfWeek = current.getDay();
                            if (dayOfWeek !== 0 && dayOfWeek !== 6) { // Monday to Friday
                                if (l.leaveType === "LOP") {
                                    approvedUnpaidLeaveCount++;
                                }
                            }
                        }
                        current.setDate(current.getDate() + 1);
                    }
                });

                // Calculate deductions and paid days
                const totalDeductedDays = absentCount + (halfDayCount * 0.5) + approvedUnpaidLeaveCount;
                let paidDays = totalDays - totalDeductedDays;
                if (paidDays < 0) paidDays = 0;

                const attendanceRate = totalDays > 0 ? (paidDays / totalDays) * 100 : 100;

                // 3. Use pre-fetched tasks
                const tasks = tasksByEmp[emp._id.toString()] || [];

                const totalTasks = tasks.length;
                const completedTasks = tasks.filter(t => t.status === "completed" || t.status === "done").length;
                const taskCompletionRate = totalTasks > 0 ? (completedTasks / totalTasks) * 100 : 100;

                const performanceScore = (taskCompletionRate * 0.6) + (attendanceRate * 0.4);

                // 4. Calculate Salary Breakdown based on Attendance and Performance
                const baseSalary = ssBasic + ssHra;
                const attendanceDeduction = Math.round(baseSalary * (totalDeductedDays / totalDays));
                const proRatedBase = baseSalary - attendanceDeduction;

                let performanceBonus = 0;
                if (performanceScore >= 90) {
                    performanceBonus = Math.round(ssBasic * 0.10); // 10% bonus
                } else if (performanceScore >= 80) {
                    performanceBonus = Math.round(ssBasic * 0.05); // 5% bonus
                }

                // If performance is very low (< 60%), pro-rate allowances
                const finalAllowances = performanceScore < 60
                    ? Math.round(ssAllowances * (performanceScore / 100))
                    : ssAllowances;

                const netSalary = Math.max(0, Math.round(proRatedBase + finalAllowances + performanceBonus - ssDeductions));

                // Create Payroll record with extra fields
                const payroll = await Payroll.create({
                    companyId: req.companyId,
                    employeeId: emp._id,
                    month: String(month),
                    year: targetYear,
                    basicSalary: ssBasic + ssHra,
                    allowances: finalAllowances,
                    deductions: ssDeductions,
                    netSalary,
                    attendanceRate,
                    performanceScore,
                    paidDays,
                    totalDays,
                    performanceBonus,
                    attendanceDeduction,
                    status: "pending",
                });

                // Notify employee
                await sendNotificationToEmployees(
                    req.companyId,
                    [emp._id],
                    "Payroll Generated",
                    `Your payslip for ${month}/${targetYear} has been generated.`,
                    "payroll",
                    { payrollId: payroll._id.toString() }
                );

                generated.push(payroll);
            } catch (err) {
                skipped.push({ employeeId: emp._id, reason: err.message });
            }
        }

        res.json({
            success: true,
            message: `Payroll generation completed. Generated: ${generated.length}, Skipped: ${skipped.length}`,
            generatedCount: generated.length,
            skippedCount: skipped.length,
            processedCount: generated.length // added for front-end alert compatibility
        });
    } catch (error) {
        next(error);
    }
};

const getCompanyPayroll = async (req, res, next) => {
    try {
        const { month, year, status } = req.query;
        const filter = { companyId: req.companyId };
        if (month) filter.month = month;
        if (year) filter.year = year;
        if (status) filter.status = status;

        const payrolls = await Payroll.find(filter)
            .populate("employeeId", "firstName lastName employeeCode departmentId designationId")
            .sort({ createdAt: -1 })
            .lean();

        res.json({ success: true, payrolls });
    } catch (error) {
        next(error);
    }
};

const getEmployeePayroll = async (req, res, next) => {
    try {
        const payrolls = await Payroll.find({ employeeId: req.params.employeeId, companyId: req.companyId })
            .sort({ year: -1, month: -1 });
        res.json({ success: true, payrolls });
    } catch (error) {
        next(error);
    }
};

const markPayrollPaid = async (req, res, next) => {
    try {
        const payroll = await Payroll.findOne({ _id: req.params.id, companyId: req.companyId });
        if (!payroll) {
            return res.status(404).json({ success: false, message: "Payroll record not found" });
        }
        payroll.status = "paid";
        payroll.paidAt = new Date();
        await payroll.save();

        res.json({ success: true, payroll, message: "Payroll status updated to Paid" });
    } catch (error) {
        next(error);
    }
};

const getPayslip = async (req, res, next) => {
    try {
        const payroll = await Payroll.findOne({ _id: req.params.id, companyId: req.companyId })
            .populate("employeeId", "firstName lastName employeeCode departmentId designationId joiningDate");
        if (!payroll) {
            return res.status(404).json({ success: false, message: "Payroll record not found" });
        }
        res.json({ success: true, payslip: payroll });
    } catch (error) {
        next(error);
    }
};

// Reports & Analytics Summary
const getReportsDashboardSummary = async (req, res, next) => {
    try {
        const { companyId } = req;
        const [totalEmployees, presentToday, pendingLeaves, openTasks] = await Promise.all([
            Employee.countDocuments({ companyId, status: "active" }),
            Attendance.countDocuments({ companyId, date: new Date().toISOString().slice(0, 10), status: "present" }),
            Leave.countDocuments({ companyId, status: "pending" }),
            Task.countDocuments({ companyId, status: { $ne: "done" } }),
        ]);
        res.json({
            success: true,
            summary: { totalEmployees, presentToday, pendingLeaves, openTasks },
        });
    } catch (error) {
        next(error);
    }
};

const getReportsAttendanceSummary = async (req, res, next) => {
    try {
        const { companyId } = req;
        // Use aggregation instead of loading all records into memory
        const agg = await Attendance.aggregate([
            { $match: { companyId } },
            {
                $group: {
                    _id: "$status",
                    count: { $sum: 1 }
                }
            }
        ]);

        const countMap = {};
        agg.forEach(a => { countMap[a._id] = a.count; });
        const total = agg.reduce((s, a) => s + a.count, 0);
        const present = (countMap["present"] || 0) + (countMap["late"] || 0);
        const late = countMap["late"] || 0;
        const absent = countMap["absent"] || 0;

        res.json({
            success: true,
            attendance: {
                totalRecords: total,
                presentCount: present,
                lateCount: late,
                absentCount: absent,
                complianceRate: total ? Math.round((present / total) * 100) : 100,
            },
        });
    } catch (error) {
        next(error);
    }
};

const getReportsLeaveSummary = async (req, res, next) => {
    try {
        const { companyId } = req;
        const [approved, pending, rejected] = await Promise.all([
            Leave.countDocuments({ companyId, status: "approved" }),
            Leave.countDocuments({ companyId, status: "pending" }),
            Leave.countDocuments({ companyId, status: "rejected" }),
        ]);
        res.json({
            success: true,
            leaves: { approved, pending, rejected, total: approved + pending + rejected },
        });
    } catch (error) {
        next(error);
    }
};

const getReportsPayrollSummary = async (req, res, next) => {
    try {
        const { companyId } = req;
        // Use aggregation instead of loading all payroll records into memory
        const agg = await Payroll.aggregate([
            { $match: { companyId } },
            {
                $group: {
                    _id: "$status",
                    total: { $sum: "$netSalary" }
                }
            }
        ]);

        const sumMap = {};
        agg.forEach(a => { sumMap[a._id] = a.total; });
        const paid = sumMap["paid"] || 0;
        const pending = sumMap["pending"] || 0;

        res.json({
            success: true,
            payroll: {
                totalPaid: paid,
                totalPending: pending,
                totalPayrollCost: paid + pending,
            },
        });
    } catch (error) {
        next(error);
    }
};

const getReportsTaskSummary = async (req, res, next) => {
    try {
        const { companyId } = req;
        const { month, year } = req.query;
        const filter = { companyId, isLive: true };

        if (month && year) {
            const monthIndex = parseInt(month, 10) - 1;
            const yearNum = parseInt(year, 10);
            if (!Number.isNaN(monthIndex) && !Number.isNaN(yearNum)) {
                filter.startDateTime = {
                    $gte: new Date(yearNum, monthIndex, 1),
                    $lt: new Date(yearNum, monthIndex + 1, 1),
                };
            }
        }

        const { buildTaskReportSummary } = require("../utils/taskReportUtils");
        const tasks = await Task.find(filter)
            .populate("assignedTo", "firstName lastName fullName")
            .sort({ startDateTime: -1 })
            .lean();

        const summary = buildTaskReportSummary(tasks);
        res.json({ success: true, tasks: summary, list: tasks });
    } catch (error) {
        next(error);
    }
};

const getReportsEmployeeSummary = async (req, res, next) => {
    try {
        const { companyId } = req;
        const [active, inactive, total] = await Promise.all([
            Employee.countDocuments({ companyId, status: "active" }),
            Employee.countDocuments({ companyId, status: "inactive" }),
            Employee.countDocuments({ companyId }),
        ]);
        res.json({
            success: true,
            employees: { active, inactive, total },
        });
    } catch (error) {
        next(error);
    }
};

// --- Add Project Notice ---
const addProjectNotice = async (req, res) => {
    try {
        const { id } = req.params;
        const { message } = req.body;

        if (!message) {
            return res.status(400).json({ success: false, message: "Notice message is required" });
        }

        const project = await Project.findOne({
            _id: id,
            companyId: req.company._id,
        });

        if (!project) {
            return res.status(404).json({ success: false, message: "Project not found" });
        }

        let senderName = "Company Admin";
        if (req.user && req.user.firstName) {
            senderName = `${req.user.firstName} ${req.user.lastName || ""}`.trim();
        }

        project.notices.push({
            message,
            postedBy: req.user ? req.user._id : null,
            senderName,
            createdAt: new Date()
        });

        await project.save();

        res.json({
            success: true,
            message: "Notice added successfully",
            project
        });
    } catch (error) {
        console.error("Error adding project notice:", error);
        res.status(500).json({ success: false, message: "Server error" });
    }
};

// --- Upload Employee Document ---
const uploadEmployeeDocumentAdmin = async (req, res, next) => {
    try {
        const { id } = req.params;
        let title = req.body.title || req.body.documentType || (req.file ? req.file.originalname : "Document");

        const employee = await Employee.findOne({
            _id: id,
            companyId: req.companyId,
        });

        if (!employee) {
            return res.status(404).json({ success: false, message: "Employee not found" });
        }

        if (!req.file) {
            return res.status(400).json({ success: false, message: "No file uploaded" });
        }

        let fileUrl = "";
        try {
            const { uploadFileToFirebase } = require("../services/firebaseService");
            fileUrl = await uploadFileToFirebase(req.file.buffer, req.file.originalname, "employee-documents");
        } catch (firebaseErr) {
            console.warn("Firebase Storage unconfigured or error, saving file locally:", firebaseErr.message);
            const fs = require("fs");
            const path = require("path");
            const uploadsDir = path.join(__dirname, "../../uploads/documents");
            if (!fs.existsSync(uploadsDir)) {
                fs.mkdirSync(uploadsDir, { recursive: true });
            }
            const ext = path.extname(req.file.originalname) || ".pdf";
            const filename = `doc-${Date.now()}-${Math.floor(Math.random() * 10000)}${ext}`;
            const filePath = path.join(uploadsDir, filename);
            fs.writeFileSync(filePath, req.file.buffer || req.file);
            fileUrl = `/uploads/documents/${filename}`;
        }

        let uploaderName = "Admin";
        if (req.user && req.user.firstName) {
            uploaderName = `${req.user.firstName} ${req.user.lastName || ""}`.trim();
        }

        const standardFields = [
            "aadhaarFront", "aadhaarBack", "panCard", "resume", "photo",
            "offerLetter", "joiningLetter", "salarySlipPrevious"
        ];

        let fieldKey = title.toLowerCase().replace(/ /g, "");

        // Map common titles to schema keys
        if (fieldKey === "offerletter") fieldKey = "offerLetter";
        if (fieldKey === "joiningletter") fieldKey = "joiningLetter";
        if (fieldKey === "aadhaarcard") fieldKey = "aadhaarFront";
        if (fieldKey === "pancard") fieldKey = "panCard";
        if (fieldKey === "resume") fieldKey = "resume";

        if (standardFields.includes(fieldKey)) {
            if (!employee.documents) employee.documents = {};
            employee.documents[fieldKey] = fileUrl;
        } else {
            if (!employee.documents.customDocuments) employee.documents.customDocuments = [];
            employee.documents.customDocuments.push({
                title,
                url: fileUrl,
                uploadedBy: uploaderName,
                uploadedAt: new Date()
            });
        }

        await employee.save();

        res.json({
            success: true,
            message: "Document uploaded successfully",
            employee
        });
    } catch (error) {
        console.error("Error uploading employee document:", error);
        res.status(500).json({ success: false, message: "Server error during file upload" });
    }
};

const toggleTaskTemplateStatus = async (req, res) => {
    try {
        const TaskTemplate = require("../models/TaskTemplate");
        const template = await TaskTemplate.findOne({ _id: req.params.id, companyId: req.companyId });
        if (!template) {
            return res.status(404).json({ success: false, message: "Task template not found" });
        }
        template.isActive = !template.isActive;
        await template.save();
        res.json({ success: true, message: `Recurring task ${template.isActive ? 'resumed' : 'stopped'} successfully`, isActive: template.isActive });
    } catch (error) {
        console.error("Error toggling task template status:", error);
        res.status(500).json({ success: false, message: "Server error" });
    }
};

const getActiveSubscription = async (req, res, next) => {
    try {
        const Subscription = require("../models/Subscription");
        const Plan = require("../models/Plan");
        const companyId = req.user.companyId || req.user.company_id;
        console.log("[DEBUG] getActiveSubscription for user:", req.user.email, "companyId:", companyId);
        if (!companyId) {
            return res.status(400).json({ message: "No company associated with this account" });
        }

        const subscription = await Subscription.findOne({ companyId })
            .sort({ createdAt: -1 })
            .populate("planId");

        console.log("[DEBUG] getActiveSubscription result for", companyId, ":", subscription ? subscription._id : "NOT FOUND");

        res.json({ subscription });
    } catch (error) {
        console.error("Error fetching active subscription:", error);
        res.status(500).json({ message: "Server error while fetching active subscription" });
    }
};

module.exports = {
    getActiveSubscription,
    getDashboardStats,
    getDashboardAttendanceDetails,
    getProfile,
    updateProfile,
    createDepartment,
    getDepartments,
    updateDepartment,
    deleteDepartment,
    createDesignation,
    getDesignations,
    updateDesignation,
    deleteDesignation,
    createBranch,
    getBranches,
    updateBranch,
    deleteBranch,
    getCompanyDashboard,
    getCompanySettings,
    updateCompanySettings,
    getCompanyAnnouncements,
    createCompanyAnnouncement,
    deleteAnnouncement,
    getCompanyAuditLogs,
    getCompanyLeaves,
    createLeaveAdmin,
    approveLeave,
    rejectLeave,
    getLeaveBalance,
    updateLeaveBalance,
    getLeaveSettings,
    updateLeaveSettings,
    createHoliday,
    getHolidays,
    updateHoliday,
    deleteHoliday,
    createProject,
    getProjects,
    getProjectById,
    updateProject,
    deleteProject,
    createTask,
    getTaskById,
    updateTask,
    updateTaskStatus,
    deleteTask,
    addTaskComment,
    uploadTaskAttachmentAdmin,
    addProjectNotice,
    getSalaryStructure,
    createOrUpdateSalaryStructure,
    generatePayroll,
    getCompanyPayroll,
    getEmployeePayroll,
    markPayrollPaid,
    getPayslip,
    getReportsDashboardSummary,
    getReportsAttendanceSummary,
    getReportsLeaveSummary,
    getReportsPayrollSummary,
    getReportsTaskSummary,
    getReportsEmployeeSummary,
    uploadEmployeeDocumentAdmin,
    toggleTaskTemplateStatus,
};
