const mongoose = require("mongoose");
const path = require("path");
const logPath = path.join(__dirname, "../../upload-debug.log");
const logDebug = (msg) => {
    try {
        const fs = require('fs');
        fs.appendFileSync(logPath, msg);
    } catch (err) {
        console.warn("Debug log write failed (read-only filesystem?):", err.message);
    }
};
const Task = require("../models/Task");
const TaskTemplate = require("../models/TaskTemplate");
const TaskActivity = require("../models/TaskActivity");
const CompanyTaskCounter = require("../models/CompanyTaskCounter");
const Employee = require("../models/Employee");
const Department = require("../models/Department");
const User = require("../models/User");
const Project = require("../models/Project");
const { notifyRole, notifyTaskAll } = require("../utils/notificationHelper");
const { processSingleTemplate } = require("../cron/taskCron");
const { validateTaskSchedule } = require("../utils/taskScheduleUtils");

const { checkUserPermission } = require("../utils/permissionCheck");

// Helper: Generate next Task ID
const generateNextTaskId = async (companyId) => {
    const counter = await CompanyTaskCounter.findOneAndUpdate(
        { companyId },
        { $inc: { currentSequence: 1 } },
        { new: true, upsert: true }
    );
    const seqNumber = counter.currentSequence;
    const taskId = `T-${seqNumber}`;
    return { taskId, seqNumber };
};

exports.createTask = async (req, res) => {
    try {
        const {
            assignmentType,
            departmentId,
            assignedTo,
            title,
            description,
            priority,
            repeatEnabled,
            repeatType,
            weeklyDays,
            monthlyDates,
            startDate,
            endDate,
            nextFollowUpDate,
            finishDate,
            deadlineTime,
            attachments,
            projectId,
            checklist
        } = req.body;

        const companyId = req.user.companyId;

        const isAllowed = await checkUserPermission(req.user._id, companyId, req.user.role, "tasks", "create");
        if (!isAllowed) {
            return res.status(403).json({
                success: false,
                message: "You are not allowed to create tasks.",
            });
        }

        if (!title || !String(title).trim()) {
            return res.status(400).json({
                success: false,
                message: "Task title is required."
            });
        }

        // Clean ObjectIds to prevent Mongoose CastErrors
        const cleanDeptId = (departmentId && mongoose.Types.ObjectId.isValid(departmentId)) ? departmentId : undefined;
        if (!cleanDeptId) {
            return res.status(400).json({
                success: false,
                message: "Please select a valid department for the task."
            });
        }

        let rawAssignees = Array.isArray(assignedTo) ? assignedTo : (assignedTo ? [assignedTo] : []);
        let assigneeIds = rawAssignees.filter(id => id && mongoose.Types.ObjectId.isValid(id));
        
        if (assigneeIds.length === 0) {
            if (assignmentType === "self" || req.user.role === "Employee") {
                const selfEmployee = await Employee.findOne({ userId: req.user._id, companyId }).lean();
                if (selfEmployee) assigneeIds = [selfEmployee._id];
            } else if (cleanDeptId) {
                const deptEmployees = await Employee.find({ companyId, departmentId: cleanDeptId, status: "active" }).select("_id").lean();
                if (deptEmployees.length > 0) {
                    assigneeIds = deptEmployees.map(e => e._id);
                }
            }
        }

        const isRepeatOn = repeatEnabled === true || repeatEnabled === "true";

        // Sanitize enums
        const validPriorities = ["low", "medium", "high", "urgent"];
        const safePriority = (priority && validPriorities.includes(String(priority).toLowerCase())) 
            ? String(priority).toLowerCase() 
            : "medium";

        const validAssignmentTypes = ["self", "employee", "multiple_employees", "department", "company_wide", "multiple", "company", "both"];
        const safeAssignmentType = (assignmentType && validAssignmentTypes.includes(String(assignmentType).toLowerCase())) 
            ? String(assignmentType).toLowerCase() 
            : (assigneeIds.length > 1 ? "multiple_employees" : "employee");

        const validRepeatTypes = ["none", "daily", "weekly", "monthly"];
        const safeRepeatType = (repeatType && validRepeatTypes.includes(String(repeatType).toLowerCase())) 
            ? String(repeatType).toLowerCase() 
            : "daily";

        // Sanitize arrays
        const safeChecklist = Array.isArray(checklist) 
            ? checklist.filter(c => c && c.title && String(c.title).trim()).map(c => ({
                title: String(c.title).trim(),
                isCompleted: Boolean(c.isCompleted)
              })) 
            : [];

        const safeAttachments = Array.isArray(attachments) 
            ? attachments.filter(a => a && a.fileUrl && a.fileName).map(a => ({
                fileUrl: String(a.fileUrl),
                fileName: String(a.fileName),
                fileType: a.fileType ? String(a.fileType) : "application/octet-stream"
              })) 
            : [];

        // Parse dates safely to prevent Invalid Date Mongoose errors
        const safeStartDate = startDate && !isNaN(new Date(startDate).getTime()) 
            ? startDate 
            : new Date().toISOString().slice(0, 10);
        const safeEndDate = endDate && !isNaN(new Date(endDate).getTime()) 
            ? endDate 
            : safeStartDate;

        const scheduleCheck = await validateTaskSchedule(companyId, {
            startDate: safeStartDate,
            endDate: isRepeatOn ? safeStartDate : safeEndDate,
            assignedTo: assigneeIds,
        });
        if (!scheduleCheck.valid) {
            return res.status(400).json({
                success: false,
                message: scheduleCheck.errors.join(" "),
                errors: scheduleCheck.errors,
            });
        }

        const startDt = new Date(safeStartDate);
        const today = new Date();

        const startStr = safeStartDate;
        const todayStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;

        // Rule: If repeat OFF -> ALWAYS Create LIVE Task (so it can be viewed, tracked, and displayed immediately)
        if (!isRepeatOn) {
            const { taskId, seqNumber } = await generateNextTaskId(companyId);

            const rawEnd = req.body.endDateTime || endDate;
            let endDt = rawEnd && !isNaN(new Date(rawEnd).getTime()) ? new Date(rawEnd) : new Date(safeEndDate);
            if (rawEnd && typeof rawEnd === "string" && !rawEnd.includes("T") && deadlineTime && typeof deadlineTime === "string" && deadlineTime.includes(":")) {
                const [hours, mins] = deadlineTime.split(":");
                if (!isNaN(parseInt(hours, 10)) && !isNaN(parseInt(mins, 10))) {
                    endDt.setHours(parseInt(hours, 10), parseInt(mins, 10), 0, 0);
                }
            }

            const finalEndDateTime = isNaN(endDt.getTime()) ? new Date(startDt.getTime() + 86400000) : endDt;
            // Overdue check strictly based on complete date + time:
            const isOverdueNow = Date.now() >= finalEndDateTime.getTime();

            const newTask = new Task({
                companyId,
                taskId,
                taskSequenceNumber: seqNumber,
                assignedBy: req.user._id,
                assignedTo: assigneeIds,
                assignmentType: safeAssignmentType,
                departmentId: cleanDeptId,
                title: String(title).trim(),
                description: description ? String(description).trim() : "",
                priority: safePriority,
                startDateTime: startDt,
                endDateTime: finalEndDateTime,
                nextFollowUpDate: nextFollowUpDate && !isNaN(new Date(nextFollowUpDate).getTime()) ? new Date(nextFollowUpDate) : startDt,
                status: isOverdueNow ? "overdue" : "pending",
                reminderStage: isOverdueNow ? 3 : 0,
                isLive: true,
                liveAt: new Date(),
                attachments: safeAttachments,
                projectId: (projectId && mongoose.Types.ObjectId.isValid(projectId)) ? projectId : null,
                checklist: safeChecklist
            });

            await newTask.save();
            try {
                await TaskActivity.create({
                    companyId,
                    taskId: newTask._id,
                    action: "created",
                    remarks: "Task created directly",
                    performedBy: req.user._id
                });
            } catch (actErr) {
                console.error("TaskActivity creation error:", actErr);
            }

            // Notify assigned employees + CompanyAdmin + managers (strictly 1 notification per recipient)
            notifyTaskAll(
                companyId,
                assigneeIds,
                newTask.departmentId || null,
                "New Task Assigned",
                `You have been assigned a new task: ${title}`,
                "task",
                { taskId: newTask._id.toString() },
                {
                    excludeUserId: req.user._id,
                    assigneeTitle: "New Task Assigned",
                    assigneeBody: `You have been assigned a new task: ${title}`,
                    supervisorTitle: "Task Created",
                    supervisorBody: `New task "${title}" was created by ${req.user.name || "Admin"}.`
                }
            ).catch(err => console.error("Error sending task notification:", err));

            return res.status(201).json({ success: true, task: newTask, data: { task: newTask } });
        }

        // Rule: If repeat ON -> Create TaskTemplate
        let finalWeeklyDays = weeklyDays || [];
        let finalMonthlyDates = monthlyDates || [];

        if (safeRepeatType === "weekly" && finalWeeklyDays.length === 0) {
            finalWeeklyDays = [startDt.toLocaleDateString("en-US", { weekday: "long", timeZone: "Asia/Kolkata" })];
        }
        if (safeRepeatType === "monthly" && finalMonthlyDates.length === 0) {
            finalMonthlyDates = [startDt.getDate()];
        }

        const { taskId: generatedTaskId } = await generateNextTaskId(companyId);
        const safeTemplateEndDate = endDate && !isNaN(new Date(endDate).getTime()) ? new Date(endDate) : startDt;

        const newTemplate = new TaskTemplate({
            companyId,
            taskId: generatedTaskId,
            createdBy: req.user._id,
            assignedBy: req.user._id,
            assignmentType: safeAssignmentType,
            departmentId: cleanDeptId,
            assignedTo: assigneeIds,
            title: String(title).trim(),
            description: description ? String(description).trim() : "",
            priority: safePriority,
            repeatEnabled: isRepeatOn,
            repeatType: safeRepeatType,
            weeklyDays: finalWeeklyDays,
            monthlyDates: finalMonthlyDates,
            startDate: startDt,
            endDate: safeTemplateEndDate,
            nextFollowUpDate: nextFollowUpDate && !isNaN(new Date(nextFollowUpDate).getTime()) ? new Date(nextFollowUpDate) : startDt,
            finishDate: finishDate && !isNaN(new Date(finishDate).getTime()) ? new Date(finishDate) : null,
            deadlineTime: deadlineTime || "18:00",
            attachments: safeAttachments,
            projectId: (projectId && mongoose.Types.ObjectId.isValid(projectId)) ? projectId : null,
            checklist: safeChecklist,
            isActive: true
        });

        await newTemplate.save();

        // Notify assigned employees + CompanyAdmin + managers for recurring task (strictly 1 notification per recipient)
        notifyTaskAll(
            companyId,
            assigneeIds,
            newTemplate.departmentId || null,
            "Recurring Task Set Up",
            `A new recurring task schedule (${safeRepeatType}) has been set up: ${title}`,
            "task_template",
            { templateId: newTemplate._id.toString() },
            {
                excludeUserId: req.user._id,
                assigneeTitle: "Recurring Task Assigned",
                assigneeBody: `A recurring task schedule (${safeRepeatType}) has been assigned to you: ${title}`,
                supervisorTitle: "Recurring Task Created",
                supervisorBody: `A new recurring task schedule (${safeRepeatType}) "${title}" was created by ${req.user.name || "Admin"}.`
            }
        ).catch(err => console.error("Error sending recurring task notification:", err));

        // If template start date is today/past, attempt immediate generation for today
        let generatedTask = null;
        try {
            generatedTask = await processSingleTemplate(newTemplate, new Date());
        } catch (cronErr) {
            console.error("Error executing immediate task generation for template:", cronErr);
        }

        return res.status(201).json({
            success: true,
            template: newTemplate,
            task: generatedTask || newTemplate,
            data: { task: generatedTask || newTemplate },
            message: generatedTask
                ? "Recurring task template created and first instance generated immediately."
                : "Task Template scheduled for future generation."
        });
    } catch (error) {
        console.error("Create task error:", error);
        res.status(500).json({ success: false, message: `Failed to create task: ${error.message}` });
    }
};

exports.getTasks = async (req, res) => {
    try {
        const { departmentId, assignedTo, startDate, endDate, status, projectId } = req.query;
        const isTemplate = req.query.isTemplate === 'true' || req.query.isTemplate === true;
        const companyId = req.companyId || req.user?.companyId || (req.user?.company && (req.user.company._id || req.user.company));
        const query = { companyId };
        if (!isTemplate) {
            query.isLive = { $ne: false };
        } else {
            query.isActive = true;
        }

        // Resolve corresponding Employee record
        let employee = null;
        if (req.user?.employeeId) {
            employee = await Employee.findOne({ _id: req.user.employeeId, companyId }).lean();
        }
        if (!employee && req.user?._id) {
            employee = await Employee.findOne({ userId: req.user._id, companyId }).lean();
        }
        if (!employee && req.user?.email) {
            employee = await Employee.findOne({ email: new RegExp(`^${req.user.email.trim()}$`, "i"), companyId }).lean();
        }
        if (!employee && req.user?._id) {
            employee = await Employee.findOne({ userId: req.user._id }).lean();
        }
        const employeeId = employee ? employee._id : (req.user?.employeeId || null);

        let allowedDeptIds = [];
        if (employee) {
            if (employee.departmentId) allowedDeptIds.push(employee.departmentId);
            if (employee.accessibleDepartments && employee.accessibleDepartments.length > 0) {
                employee.accessibleDepartments.forEach((deptId) => {
                    if (!allowedDeptIds.map(d => d.toString()).includes(deptId.toString())) {
                        allowedDeptIds.push(deptId);
                    }
                });
            }
        }

        // Apply RBAC
        let rbacOr = null;
        if (req.user.role === "Employee") {
            const userIdentifiers = [employeeId, req.user._id, req.user?.employeeId].filter(Boolean);
            rbacOr = [
                { assignedTo: { $in: userIdentifiers } },
                { assignedBy: req.user._id },
                allowedDeptIds.length > 0 ? { departmentId: { $in: allowedDeptIds }, assignmentType: { $in: ["department", "company", "company_wide"] } } : null,
                { assignmentType: { $in: ["company", "company_wide"] } }
            ].filter(Boolean);
        } else if (req.user.role === "Manager" || req.user.role === "TeamLeader") {
            const userIdentifiers = [employeeId, req.user._id, req.user?.employeeId].filter(Boolean);
            rbacOr = [
                { assignedBy: req.user._id },
                { assignedTo: { $in: userIdentifiers } },
                allowedDeptIds.length > 0 ? { departmentId: { $in: allowedDeptIds } } : null
            ].filter(Boolean);
        } // Admins see all

        if (rbacOr && rbacOr.length > 0) {
            query.$or = rbacOr;
        }

        // Apply Filters
        if (departmentId) query.departmentId = departmentId;
        if (assignedTo) query.assignedTo = assignedTo;
        if (projectId) query.projectId = projectId;
        if (status && !isTemplate) {
            query.status = { $in: status.split(",") };
        } else if (!isTemplate) {
            query.status = { $ne: "cancelled" };
        }
        if (startDate && endDate && !isTemplate) {
            const startD = new Date(startDate);
            const endD = new Date(endDate);
            endD.setHours(23, 59, 59, 999);

            const dateQuery = [
                { startDateTime: { $gte: startD, $lte: endD } },
                { nextFollowUpDate: { $gte: startD, $lte: endD } },
                { endDateTime: { $gte: startD, $lte: endD } }
            ];

            if (query.$or && query.$or.length > 0) {
                query.$and = [{ $or: query.$or }, { $or: dateQuery }];
                delete query.$or;
            } else {
                query.$or = dateQuery;
            }
        }

        if (query.$or && query.$or.length === 0) {
            delete query.$or;
        }

        const page = parseInt(req.query.page, 10);
        const limit = parseInt(req.query.limit, 10);
        const isPaginated = !isNaN(page) && page > 0 && !isNaN(limit) && limit > 0;
        const skip = isPaginated ? (page - 1) * limit : 0;

        let tasks;
        let totalCount = 0;
        if (isTemplate) {
            totalCount = await TaskTemplate.countDocuments(query);
            let templateQuery = TaskTemplate.find(query).sort({ createdAt: -1 })
                .populate("assignedTo", "firstName lastName email")
                .populate("assignedBy", "name email")
                .populate("departmentId", "name")
                .populate({ path: "projectId", select: "name", strictPopulate: false });

            if (isPaginated) {
                templateQuery = templateQuery.skip(skip).limit(limit);
            }

            const docs = await templateQuery.lean();
            tasks = docs.map(d => {
                const obj = { ...d };
                obj.isTemplate = true;
                obj.assignees = obj.assignedTo || [];
                return obj;
            });
        } else {
            const nowDate = new Date();
            // Automatically mark any active overdue tasks asynchronously so getTasks is never blocked
            Task.updateMany(
                {
                    companyId,
                    status: { $in: ["pending", "re_pending", "in_process", "re_in_process"] },
                    $or: [
                        { endDateTime: { $ne: null, $lt: nowDate } },
                        { endDate: { $ne: null, $lt: nowDate } }
                    ]
                },
                {
                    $set: { status: "overdue", reminderStage: 3 }
                }
            ).catch(() => {});

            totalCount = await Task.countDocuments(query);
            let taskQuery = Task.find(query).sort({ createdAt: -1 })
                .populate("assignedTo", "firstName lastName fullName name employeeCode email")
                .populate("assignedBy", "name email")
                .populate("departmentId", "name")
                .populate({ path: "projectId", select: "name", strictPopulate: false });

            if (isPaginated) {
                taskQuery = taskQuery.skip(skip).limit(limit);
            }

            const rawDocs = await taskQuery.lean();

            const now = Date.now();
            tasks = rawDocs.map(task => {
                task.assignees = task.assignedTo || [];
                const s = (task.status || "pending").toLowerCase();
                const isDone = ["complete", "completed", "done", "late_complete", "re_complete", "re_late_complete", "cancelled"].includes(s);
                const rawDue = task.endDateTime || task.endDate;
                if (!isDone && rawDue) {
                    const dueTime = new Date(rawDue).getTime();
                    if (!isNaN(dueTime)) {
                        // Strict check on complete date + time:
                        if (now >= dueTime) {
                            task.status = "overdue";
                        } else if (s === "overdue") {
                            task.status = task.isReopened ? "re_pending" : "pending";
                        }
                    }
                }
                return task;
            });
        }

        res.json({
            success: true,
            tasks,
            total: totalCount,
            page: isPaginated ? page : 1,
            limit: isPaginated ? limit : tasks.length,
            totalPages: isPaginated ? Math.ceil(totalCount / limit) : 1,
            hasMore: isPaginated ? (page * limit < totalCount) : false
        });
    } catch (error) {
        console.error("getTasks error:", error);
        res.status(500).json({ success: false, message: `Server error: ${error.message}` });
    }
};

exports.getTaskDetails = async (req, res) => {
    try {
        let task = await Task.findOne({ _id: req.params.id, companyId: req.user.companyId })
            .populate({
                path: "assignedTo",
                select: "firstName lastName fullName name photo employeeCode departmentName departmentId departmentIds",
                populate: [
                    { path: "departmentId", select: "name" },
                    { path: "departmentIds", select: "name" }
                ]
            })
            .populate("assignedBy", "name")
            .populate("departmentId", "name")
            .populate({ path: "projectId", select: "name", strictPopulate: false });

        if (!task) {
            // Fallback: Check if it's a recurring template
            const template = await TaskTemplate.findOne({ _id: req.params.id, companyId: req.user.companyId })
                .populate({
                    path: "assignedTo",
                    select: "firstName lastName fullName name photo employeeCode departmentName departmentId departmentIds",
                    populate: [
                        { path: "departmentId", select: "name" },
                        { path: "departmentIds", select: "name" }
                    ]
                })
                .populate("assignedBy", "name")
                .populate("departmentId", "name")
                .populate({ path: "projectId", select: "name", strictPopulate: false });

            if (!template) return res.status(404).json({ success: false, message: "Task not found" });

            task = template.toObject();
            task.isTemplate = true;
            task.status = template.status || "pending";
            task.assignees = task.assignedTo || [];
        } else {
            const taskObj = task.toObject ? task.toObject() : { ...task };

            // If any item in assignedTo is an unpopulated ObjectId or string, populate it
            const hasRawIds = Array.isArray(taskObj.assignedTo) && taskObj.assignedTo.some(a => typeof a === "string" || a instanceof mongoose.Types.ObjectId || (a && !a.firstName && !a.name));
            if (hasRawIds) {
                const unpopulatedIds = taskObj.assignedTo.map(a => (typeof a === "object" && a?._id) ? a._id : a).filter(Boolean);
                const populatedEmps = await Employee.find({ _id: { $in: unpopulatedIds } })
                    .select("firstName lastName fullName name photo employeeCode departmentName departmentId departmentIds")
                    .populate("departmentId", "name")
                    .populate("departmentIds", "name")
                    .lean();
                if (populatedEmps && populatedEmps.length > 0) {
                    taskObj.assignedTo = populatedEmps;
                }
            }

            // Fallback: If assignedTo is empty in DB, resolve from department active employees or creator
            if ((!taskObj.assignedTo || taskObj.assignedTo.length === 0) && taskObj.departmentId) {
                const deptId = taskObj.departmentId._id || taskObj.departmentId;
                const deptEmployees = await Employee.find({ companyId: req.user.companyId, departmentId: deptId, status: "active" })
                    .select("firstName lastName fullName name photo employeeCode departmentName departmentId departmentIds")
                    .populate("departmentId", "name")
                    .populate("departmentIds", "name")
                    .lean();
                if (deptEmployees && deptEmployees.length > 0) {
                    taskObj.assignedTo = deptEmployees;
                    Task.updateOne({ _id: taskObj._id }, { $set: { assignedTo: deptEmployees.map(e => e._id) } }).catch(() => {});
                }
            }
            if ((!taskObj.assignedTo || taskObj.assignedTo.length === 0) && taskObj.assignedBy) {
                const creatorEmployee = await Employee.findOne({ companyId: req.user.companyId, userId: taskObj.assignedBy._id || taskObj.assignedBy })
                    .select("firstName lastName fullName name photo employeeCode departmentName departmentId departmentIds")
                    .populate("departmentId", "name")
                    .populate("departmentIds", "name")
                    .lean();
                if (creatorEmployee) {
                    taskObj.assignedTo = [creatorEmployee];
                    Task.updateOne({ _id: taskObj._id }, { $set: { assignedTo: [creatorEmployee._id] } }).catch(() => {});
                }
            }
            task = taskObj;

            // Strict complete date + time overdue check for active live tasks
            const s = (task.status || "pending").toLowerCase();
            const isDone = ["complete", "completed", "done", "late_complete", "re_complete", "re_late_complete", "cancelled"].includes(s);
            const rawDue = task.endDateTime || task.endDate;
            if (!isDone && rawDue) {
                const dueTime = new Date(rawDue).getTime();
                if (!isNaN(dueTime)) {
                    if (Date.now() >= dueTime) {
                        if (task.status !== "overdue") {
                            task.status = "overdue";
                            task.reminderStage = 3;
                            await Task.updateOne({ _id: task._id }, { $set: { status: "overdue", reminderStage: 3 } }).catch(() => {});
                        }
                    } else if (s === "overdue") {
                        task.status = task.isReopened ? "re_pending" : "pending";
                        task.reminderStage = 0;
                        await Task.updateOne({ _id: task._id }, { $set: { status: task.status, reminderStage: 0 } }).catch(() => {});
                    }
                }
            }
        }

        const taskObj = task.toObject ? task.toObject() : task;
        taskObj.assignees = task.assignedTo || [];
        taskObj.assignedTo = task.assignedTo || [];

        const timeline = await TaskActivity.find({ taskId: task._id }).sort({ createdAt: 1 })
            .populate("performedBy", "name");

        res.json({ success: true, data: { task: taskObj, timeline }, task: taskObj, timeline });
    } catch (error) {
        console.error("getTaskDetails error:", error);
        res.status(500).json({ success: false, message: "Server error: " + error.message });
    }
};

exports.updateTask = async (req, res) => {
    try {
        const { title, description, departmentId, assignedTo, priority, startDate, startDateTime, endDate, endDateTime, deadlineTime, nextFollowUpDate } = req.body;

        if (!departmentId) {
            return res.status(400).json({ success: false, message: "Department is required." });
        }
        let task = await Task.findOne({ _id: req.params.id, companyId: req.user.companyId });
        let isTemplate = false;
        if (!task) {
            task = await TaskTemplate.findOne({ _id: req.params.id, companyId: req.user.companyId });
            if (task) isTemplate = true;
        }
        if (!task) return res.status(404).json({ success: false, message: "Task not found" });

        const isAllowed = await checkUserPermission(req.user._id, req.user.companyId, req.user.role, "tasks", "edit");
        if (!isAllowed) {
            return res.status(403).json({
                success: false,
                message: "You are not allowed to edit tasks.",
            });
        }

        if (!isTemplate && task.status !== "pending" && task.status !== "re_pending") {
            return res.status(400).json({
                success: false,
                message: "Task can only be edited when it is in pending or re_pending status.",
            });
        }
        if (title) task.title = title;
        if (description !== undefined) task.description = description;
        task.departmentId = departmentId || undefined;
        if (assignedTo) task.assignedTo = assignedTo;
        if (priority) task.priority = priority;
        if (req.body.checklist !== undefined) task.checklist = req.body.checklist;
        if (req.body.attachments !== undefined) task.attachments = req.body.attachments;

        const rawStart = startDate || startDateTime;
        if (rawStart) {
            const startDt = new Date(rawStart);
            if (!isNaN(startDt.getTime())) {
                if (isTemplate) {
                    task.startDate = startDt;
                } else {
                    task.startDateTime = startDt;
                }
            }
        }

        // Only update nextFollowUpDate if a real valid date was provided
        // Never overwrite existing date with null (prevents auto-null bug)
        if (nextFollowUpDate && !isNaN(new Date(nextFollowUpDate).getTime())) {
            task.nextFollowUpDate = new Date(nextFollowUpDate);
        } else if (nextFollowUpDate === "") {
            // Only clear if explicitly sent as empty string
            task.nextFollowUpDate = null;
        }

        if (isTemplate) {
            // Update recurring properties
            const { repeatEnabled, repeatType, weeklyDays, monthlyDates, finishDate } = req.body;
            if (repeatEnabled !== undefined) task.repeatEnabled = repeatEnabled;
            if (repeatType) task.repeatType = repeatType;
            if (weeklyDays) task.weeklyDays = weeklyDays;
            if (monthlyDates) task.monthlyDates = monthlyDates;
            if (finishDate !== undefined) task.finishDate = finishDate ? new Date(finishDate) : null;
        }

        const rawEnd = endDate || endDateTime;
        if (rawEnd) {
            const endDt = new Date(rawEnd);
            if (typeof rawEnd === "string" && !rawEnd.includes("T") && deadlineTime && typeof deadlineTime === "string" && deadlineTime.includes(":")) {
                const [hours, mins] = deadlineTime.split(":");
                if (!isNaN(parseInt(hours, 10)) && !isNaN(parseInt(mins, 10))) {
                    endDt.setHours(parseInt(hours, 10), parseInt(mins, 10), 0, 0);
                }
            }

            const scheduleCheck = await validateTaskSchedule(task.companyId, {
                startDate: isTemplate ? task.startDate : task.startDateTime,
                endDate: endDt,
                assignedTo: task.assignedTo || [],
            });
            if (!scheduleCheck.valid) {
                return res.status(400).json({
                    success: false,
                    message: scheduleCheck.errors.join(" "),
                    errors: scheduleCheck.errors,
                });
            }

            if (isTemplate) {
                task.endDate = endDt;
            } else {
                task.endDateTime = endDt;
                // Strict Overdue logic based on complete date + time:
                if (task.status === "overdue" && endDt.getTime() > Date.now()) {
                    task.status = task.isReopened ? "re_pending" : "pending";
                    task.reminderStage = 0;
                } else if (["pending", "in_process", "re_pending", "re_in_process"].includes(task.status) && endDt.getTime() <= Date.now()) {
                    task.status = "overdue";
                    task.reminderStage = 3;
                }
            }
        }

        await task.save();

        await TaskActivity.create({
            companyId: task.companyId,
            taskId: task._id,
            action: "edited",
            remarks: isTemplate ? "Recurring task template was updated" : "Task details were updated",
            performedBy: req.user._id
        });

        // Notify assigned employees + supervisors about task update
        notifyTaskAll(
            task.companyId,
            task.assignedTo || [],
            task.departmentId || null,
            "Task Updated",
            `Task "${task.title}" has been updated.`,
            "task_update",
            { taskId: task._id.toString(), action: "updated" },
            {
                excludeUserId: req.user._id,
                assigneeTitle: "Task Updated: " + task.title,
                assigneeBody: `Task "${task.title}" was updated by ${req.user.name || "Admin"}.`,
                supervisorTitle: "Task Updated: " + task.title,
                supervisorBody: `Task "${task.title}" was updated by ${req.user.name || "Admin"}.`
            }
        ).catch(err => console.error("[notifyTaskAll updateTask error]:", err));

        res.json({ success: true, data: task, message: "Task updated successfully" });
    } catch (error) {
        res.status(500).json({ success: false, message: "Server error" });
    }
};

exports.inProcessTask = async (req, res) => {
    logDebug(`[${new Date().toISOString()}] inProcessTask request received. Body: ${JSON.stringify(req.body)}\n`);
    try {
        const { nextFollowUpDate, remarks, remark, comment, attachments } = req.body;
        const noteText = (remarks || remark || comment || "").trim();
        let task = await Task.findOne({ _id: req.params.id, companyId: req.user.companyId });
        let isTemplate = false;
        if (!task) {
            task = await TaskTemplate.findOne({ _id: req.params.id, companyId: req.user.companyId });
            if (task) isTemplate = true;
        }
        if (!task) return res.status(404).json({ success: false, message: "Task not found" });

        const currentStatus = task.status || "pending";

        const targetStatus = (currentStatus === "re_pending" || currentStatus === "re_open" || currentStatus === "re_overdue") ? "re_in_process" : "in_process";

        task.status = targetStatus;
        if (noteText) {
            task.finalRemarks = noteText;
        }
        if (!isTemplate) {
            task.timerActive = true;
            // Only update nextFollowUpDate if a valid date was explicitly provided
            // Do NOT clear existing date if null/undefined is received (prevents auto-null bug)
            if (nextFollowUpDate && !isNaN(new Date(nextFollowUpDate).getTime())) {
                task.nextFollowUpDate = new Date(nextFollowUpDate);
            } else if (nextFollowUpDate === "") {
                // Only clear if user explicitly sent empty string
                task.nextFollowUpDate = null;
            }
            // If nextFollowUpDate is null/undefined => keep existing value intact
        }

        const formattedAttachments = (attachments || []).map(att => ({
            fileUrl: att.fileUrl || att.url || "",
            fileName: att.fileName || att.name || "Attachment",
            fileType: att.fileType || att.type || ""
        }));

        if (formattedAttachments.length > 0) {
            if (!task.attachments) task.attachments = [];
            formattedAttachments.forEach(att => {
                task.attachments.push({
                    fileUrl: att.fileUrl,
                    fileName: att.fileName,
                    fileType: att.fileType,
                    uploadedAt: new Date(),
                    uploadedBy: req.user._id
                });
            });
        }

        const remarkToUse = noteText || (formattedAttachments.length > 0 ? "Status updated with attachment" : "Status updated to in-process");
        if (!task.comments) task.comments = [];
        task.comments.push({
            comment: remarkToUse,
            senderName: req.user.name,
            senderRole: req.user.role,
            addedBy: req.user._id,
            attachments: formattedAttachments,
            createdAt: new Date()
        });

        await task.save();

        await TaskActivity.create({
            companyId: task.companyId, taskId: task._id, action: targetStatus, remarks: remarkToUse, nextFollowUpDate: task.nextFollowUpDate, attachments: formattedAttachments, performedBy: req.user._id
        });

        notifyTaskAll(
            task.companyId,
            task.assignedTo || [],
            task.departmentId || null,
            "Task Started",
            `Task "${task.title}" has been started (In Process).`,
            "task_update",
            { taskId: task._id.toString(), action: "in_process", status: "in_process" },
            {
                excludeUserId: req.user._id,
                assigneeTitle: "Task In Progress",
                assigneeBody: `Task "${task.title}" is now In Process.`,
                supervisorTitle: "Task Started: " + task.title,
                supervisorBody: `${req.user.name || "Assignee"} started working on "${task.title}".`
            }
        ).catch(err => console.error("notifyTaskAll error:", err));

        res.json({ success: true, data: task });
    } catch (error) {
        console.error("inProcessTask error:", error);
        res.status(500).json({ success: false, message: error.message || "Server error" });
    }
};

exports.completeTask = async (req, res) => {
    logDebug(`[${new Date().toISOString()}] completeTask request received. Body: ${JSON.stringify(req.body)}\n`);
    try {
        const { finalRemarks, remarks, remark, comment, nextFollowUpDate, attachments } = req.body;
        const noteText = (finalRemarks || remarks || remark || comment || "Task completed").trim();
        let task = await Task.findOne({ _id: req.params.id, companyId: req.user.companyId });
        let isTemplate = false;
        if (!task) {
            task = await TaskTemplate.findOne({ _id: req.params.id, companyId: req.user.companyId });
            if (task) isTemplate = true;
        }
        if (!task) {
            return res.status(404).json({ success: false, message: "Task not found" });
        }

        const formattedAttachments = (attachments || []).map(att => ({
            fileUrl: att.fileUrl || att.url || "",
            fileName: att.fileName || att.name || "Attachment",
            fileType: att.fileType || att.type || ""
        }));

        if (formattedAttachments.length > 0) {
            if (!task.attachments) task.attachments = [];
            formattedAttachments.forEach(att => {
                task.attachments.push({
                    fileUrl: att.fileUrl,
                    fileName: att.fileName,
                    fileType: att.fileType,
                    uploadedAt: new Date(),
                    uploadedBy: req.user._id
                });
            });
        }

        if (isTemplate) {
            task.status = "complete";
            task.finalRemarks = noteText;
            await task.save();
            await TaskActivity.create({
                companyId: task.companyId, taskId: task._id, action: "completed", remarks: noteText, attachments: formattedAttachments, performedBy: req.user._id
            });
            notifyTaskAll(
                task.companyId,
                task.assignedTo || [],
                task.departmentId || null,
                "Recurring Task Completed",
                `Recurring task "${task.title}" has been completed.`,
                "task_update",
                { taskId: task._id.toString(), action: "completed", status: "complete" },
                {
                    excludeUserId: req.user._id,
                    assigneeTitle: "Recurring Task Completed",
                    assigneeBody: `Recurring task "${task.title}" was completed.`,
                    supervisorTitle: "Task Completed: " + task.title,
                    supervisorBody: `${req.user.name || "Assignee"} marked recurring task "${task.title}" as completed.`
                }
            ).catch(err => console.error("notifyTaskAll error:", err));
            return res.json({ success: true, data: task });
        }

        const now = new Date();
        const isPastDue = task.endDateTime && now > new Date(task.endDateTime);

        // Follow up date persistence
        // Only update if a valid date was explicitly sent — do NOT clear if null received
        if (nextFollowUpDate && !isNaN(new Date(nextFollowUpDate).getTime())) {
            task.nextFollowUpDate = new Date(nextFollowUpDate);
        } else if (nextFollowUpDate === "") {
            // Only clear if user explicitly sent empty string
            task.nextFollowUpDate = null;
        }
        // If null/undefined => keep existing nextFollowUpDate intact

        if (task.status === "overdue" || isPastDue) {
            const end = new Date(task.endDateTime);
            const diffMs = Math.abs(now - end);
            const days = Math.floor(diffMs / (1000 * 60 * 60 * 24));
            const hours = Math.floor((diffMs / (1000 * 60 * 60)) % 24);
            const minutes = Math.floor((diffMs / 1000 / 60) % 60);

            task.status = "late_complete";
            task.timerActive = false;
            task.lateCompletedAt = now;
            task.finalRemarks = noteText;
            task.delayedDuration = { days, hours, minutes };

            const remarkToUse = noteText || (formattedAttachments.length > 0 ? "Status updated with attachment" : "Status updated: Completed late");
            if (!task.comments) task.comments = [];
            task.comments.push({
                comment: remarkToUse.startsWith("Status updated") ? remarkToUse : 'Status updated: ' + remarkToUse,
                senderName: req.user.name,
                senderRole: req.user.role,
                addedBy: req.user._id,
                attachments: formattedAttachments,
                createdAt: new Date()
            });

            await task.save();

            await TaskActivity.create({
                companyId: task.companyId, taskId: task._id, action: "late_completed", remarks: noteText, nextFollowUpDate: task.nextFollowUpDate, attachments: formattedAttachments, performedBy: req.user._id
            });

            notifyTaskAll(
                task.companyId,
                task.assignedTo || [],
                task.departmentId || null,
                "Task Completed Late",
                `Task "${task.title}" has been completed late.`,
                "task_update",
                { taskId: task._id.toString(), action: "late_completed", status: "late_complete" },
                {
                    excludeUserId: req.user._id,
                    assigneeTitle: "Task Completed Late",
                    assigneeBody: `Task "${task.title}" was completed after deadline.`,
                    supervisorTitle: "Task Completed Late: " + task.title,
                    supervisorBody: `${req.user.name || "Assignee"} completed overdue task "${task.title}".`
                }
            ).catch(err => console.error("notifyTaskAll error:", err));

            return res.json({ success: true, data: task });
        }

        task.status = "complete";
        task.timerActive = false;
        task.completedAt = now;
        task.finalRemarks = noteText;

        const remarkToUse = noteText || (formattedAttachments.length > 0 ? "Status updated with attachment" : "Status updated: Completed");
        if (!task.comments) task.comments = [];
        task.comments.push({
            comment: remarkToUse.startsWith("Status updated") ? remarkToUse : 'Status updated: ' + remarkToUse,
            senderName: req.user.name,
            senderRole: req.user.role,
            addedBy: req.user._id,
            attachments: formattedAttachments,
            createdAt: new Date()
        });

        await task.save();

        await TaskActivity.create({
            companyId: task.companyId, taskId: task._id, action: "completed", remarks: noteText, nextFollowUpDate: task.nextFollowUpDate, attachments: formattedAttachments, performedBy: req.user._id
        });

        notifyTaskAll(
            task.companyId,
            task.assignedTo || [],
            task.departmentId || null,
            "Task Completed",
            `Task "${task.title}" has been completed.`,
            "task_update",
            { taskId: task._id.toString(), action: "completed", status: "complete" },
            {
                excludeUserId: req.user._id,
                assigneeTitle: "Task Completed",
                assigneeBody: `Task "${task.title}" has been marked completed.`,
                supervisorTitle: "Task Completed: " + task.title,
                supervisorBody: `${req.user.name || "Assignee"} marked task "${task.title}" as completed.`
            }
        ).catch(err => console.error("notifyTaskAll error:", err));

        res.json({ success: true, data: task });
    } catch (error) {
        console.error("completeTask error:", error);
        res.status(500).json({ success: false, message: error.message || "Server error" });
    }
};

exports.lateCompleteTask = async (req, res) => {
    logDebug(`[${new Date().toISOString()}] lateCompleteTask request received. Body: ${JSON.stringify(req.body)}\n`);
    try {
        const { finalRemarks, remarks, remark, comment, nextFollowUpDate, attachments } = req.body;
        const noteText = (finalRemarks || remarks || remark || comment || "Task completed late").trim();
        let task = await Task.findOne({ _id: req.params.id, companyId: req.user.companyId });
        let isTemplate = false;
        if (!task) {
            task = await TaskTemplate.findOne({ _id: req.params.id, companyId: req.user.companyId });
            if (task) isTemplate = true;
        }
        if (!task) {
            return res.status(404).json({ success: false, message: "Task not found" });
        }

        const formattedAttachments = (attachments || []).map(att => ({
            fileUrl: att.fileUrl || att.url || "",
            fileName: att.fileName || att.name || "Attachment",
            fileType: att.fileType || att.type || ""
        }));

        if (formattedAttachments.length > 0) {
            if (!task.attachments) task.attachments = [];
            formattedAttachments.forEach(att => {
                task.attachments.push({
                    fileUrl: att.fileUrl,
                    fileName: att.fileName,
                    fileType: att.fileType,
                    uploadedAt: new Date(),
                    uploadedBy: req.user._id
                });
            });
        }

        if (isTemplate) {
            task.status = "late_complete";
            task.finalRemarks = noteText;
            await task.save();
            await TaskActivity.create({
                companyId: task.companyId, taskId: task._id, action: "late_completed", remarks: noteText, attachments: formattedAttachments, performedBy: req.user._id
            });
            notifyTaskAll(
                task.companyId,
                task.assignedTo || [],
                task.departmentId || null,
                "Recurring Task Completed Late",
                `Recurring task "${task.title}" has been completed late.`,
                "task_update",
                { taskId: task._id.toString(), action: "late_completed", status: "late_complete" },
                {
                    excludeUserId: req.user._id,
                    assigneeTitle: "Recurring Task Completed Late",
                    assigneeBody: `Recurring task "${task.title}" was completed after deadline.`,
                    supervisorTitle: "Task Completed Late: " + task.title,
                    supervisorBody: `${req.user.name || "Assignee"} completed overdue recurring task "${task.title}".`
                }
            ).catch(err => console.error("notifyTaskAll error:", err));
            return res.json({ success: true, data: task });
        }

        const now = new Date();
        const end = new Date(task.endDateTime || task.endDate || now);
        const diffMs = Math.abs(now - end);
        const days = Math.floor(diffMs / (1000 * 60 * 60 * 24));
        const hours = Math.floor((diffMs / (1000 * 60 * 60)) % 24);
        const minutes = Math.floor((diffMs / 1000 / 60) % 60);

        task.status = "late_complete";
        task.timerActive = false;
        task.lateCompletedAt = now;
        task.finalRemarks = noteText;
        if (nextFollowUpDate && !isNaN(new Date(nextFollowUpDate).getTime())) {
            task.nextFollowUpDate = new Date(nextFollowUpDate);
        } else if (nextFollowUpDate === null || nextFollowUpDate === "") {
            task.nextFollowUpDate = null;
        }
        task.delayedDuration = { days, hours, minutes };

        const remarkToUse = noteText || (formattedAttachments.length > 0 ? "Status updated with attachment" : "Status updated: Completed late");
        if (!task.comments) task.comments = [];
        task.comments.push({
            comment: remarkToUse.startsWith("Status updated") ? remarkToUse : 'Status updated: ' + remarkToUse,
            senderName: req.user.name,
            senderRole: req.user.role,
            addedBy: req.user._id,
            attachments: formattedAttachments,
            createdAt: new Date()
        });

        await task.save();

        await TaskActivity.create({
            companyId: task.companyId, taskId: task._id, action: "late_completed", remarks: noteText, nextFollowUpDate: task.nextFollowUpDate, attachments: formattedAttachments, performedBy: req.user._id
        });

        notifyTaskAll(
            task.companyId,
            task.assignedTo || [],
            task.departmentId || null,
            "Task Completed Late",
            `Task "${task.title}" has been completed late.`,
            "task_update",
            { taskId: task._id.toString(), action: "late_completed", status: "late_complete" },
            {
                excludeUserId: req.user._id,
                assigneeTitle: "Task Completed Late",
                assigneeBody: `Task "${task.title}" has been completed late.`,
                supervisorTitle: "Task Completed Late: " + task.title,
                supervisorBody: `${req.user.name || "Assignee"} completed overdue task "${task.title}".`
            }
        ).catch(err => console.error("notifyTaskAll error:", err));

        res.json({ success: true, data: task });
    } catch (error) {
        console.error("lateCompleteTask error:", error);
        res.status(500).json({ success: false, message: error.message || "Server error" });
    }
};

exports.reopenTask = async (req, res) => {
    logDebug(`[${new Date().toISOString()}] reopenTask request received. Body: ${JSON.stringify(req.body)}\n`);
    try {
        const isAllowed = await checkUserPermission(req.user._id, req.user.companyId, req.user.role, "tasks", "reopen");
        if (!isAllowed) {
            return res.status(403).json({ success: false, message: "You are not allowed to reopen tasks" });
        }

        const { newEndDate, nextFollowUpDate, remarks, attachments } = req.body;
        const task = await Task.findOne({ _id: req.params.id, companyId: req.user.companyId });
        if (!task) return res.status(404).json({ success: false, message: "Task not found" });

        const formattedAttachments = (attachments || []).map(att => ({
            fileUrl: att.fileUrl || att.url || "",
            fileName: att.fileName || att.name || "Attachment",
            fileType: att.fileType || att.type || ""
        }));

        task.status = "re_pending";
        task.endDateTime = newEndDate;
        if (nextFollowUpDate && !isNaN(new Date(nextFollowUpDate).getTime())) {
            task.nextFollowUpDate = new Date(nextFollowUpDate);
        } else if (nextFollowUpDate === null || nextFollowUpDate === "") {
            task.nextFollowUpDate = null;
        }
        task.reopenCount += 1;
        task.reopenedBy = req.user._id;
        task.reopenedAt = new Date();

        const remarkToUse = (typeof remarks === 'string' && remarks.trim()) ? remarks : '';
        if (remarkToUse || formattedAttachments.length > 0) {
            if (!task.comments) task.comments = [];
            task.comments.push({
                comment: remarkToUse ? 'Status updated: ' + remarkToUse : 'Status updated with attachment',
                senderName: req.user.name,
                senderRole: req.user.role,
                addedBy: req.user._id,
                attachments: formattedAttachments,
                createdAt: new Date()
            });
        }

        await task.save();

        await TaskActivity.create({
            companyId: task.companyId, taskId: task._id, action: "reopened", remarks, nextFollowUpDate: task.nextFollowUpDate, attachments: formattedAttachments, performedBy: req.user._id
        });

        notifyTaskAll(
            task.companyId,
            task.assignedTo || [],
            task.departmentId || null,
            "Task Re-opened",
            `Task "${task.title}" has been re-opened.`,
            "task_update",
            { taskId: task._id.toString(), action: "reopened", status: task.status },
            {
                excludeUserId: req.user._id,
                assigneeTitle: "Task Re-opened",
                assigneeBody: `Task "${task.title}" was re-opened by ${req.user.name || "Manager"}.`,
                supervisorTitle: "Task Re-opened: " + task.title,
                supervisorBody: `${req.user.name || "Manager"} re-opened task "${task.title}".`
            }
        ).catch(err => console.error("notifyTaskAll error:", err));

        res.json({ success: true, data: task });
    } catch (error) {
        console.error("reopenTask error:", error);
        res.status(500).json({ success: false, message: error.message || "Server error" });
    }
};

exports.reInProcessTask = async (req, res) => {
    logDebug(`[${new Date().toISOString()}] reInProcessTask request received. Body: ${JSON.stringify(req.body)}\n`);
    try {
        const { nextFollowUpDate, remarks, remark, comment, attachments } = req.body;
        const noteText = (remarks || remark || comment || "Task re-started in-process").trim();
        const task = await Task.findOne({ _id: req.params.id, companyId: req.user.companyId });
        if (!task) return res.status(404).json({ success: false, message: "Task not found" });

        const formattedAttachments = (attachments || []).map(att => ({
            fileUrl: att.fileUrl || att.url || "",
            fileName: att.fileName || att.name || "Attachment",
            fileType: att.fileType || att.type || ""
        }));

        if (formattedAttachments.length > 0) {
            if (!task.attachments) task.attachments = [];
            formattedAttachments.forEach(att => {
                task.attachments.push({
                    fileUrl: att.fileUrl,
                    fileName: att.fileName,
                    fileType: att.fileType,
                    uploadedAt: new Date(),
                    uploadedBy: req.user._id
                });
            });
        }

        task.status = "re_in_process";
        task.timerActive = true;
        if (noteText) task.finalRemarks = noteText;
        if (nextFollowUpDate && !isNaN(new Date(nextFollowUpDate).getTime())) {
            task.nextFollowUpDate = new Date(nextFollowUpDate);
        } else if (nextFollowUpDate === null || nextFollowUpDate === "") {
            task.nextFollowUpDate = null;
        }

        const remarkToUse = noteText || (formattedAttachments.length > 0 ? "Status updated with attachment" : "Status updated: Re-started in process");
        if (!task.comments) task.comments = [];
        task.comments.push({
            comment: remarkToUse.startsWith("Status updated") ? remarkToUse : 'Status updated: ' + remarkToUse,
            senderName: req.user.name,
            senderRole: req.user.role,
            addedBy: req.user._id,
            attachments: formattedAttachments,
            createdAt: new Date()
        });

        await task.save();

        await TaskActivity.create({
            companyId: task.companyId, taskId: task._id, action: "re_in_process", remarks: noteText, nextFollowUpDate: task.nextFollowUpDate, attachments: formattedAttachments, performedBy: req.user._id
        });

        notifyTaskAll(
            task.companyId,
            task.assignedTo || [],
            task.departmentId || null,
            "Task Restarted",
            `Task "${task.title}" has been restarted (In Process).`,
            "task_update",
            { taskId: task._id.toString() }
        ).catch(err => console.error("notifyTaskAll error:", err));

        res.json({ success: true, data: task });
    } catch (error) {
        console.error("reInProcessTask error:", error);
        res.status(500).json({ success: false, message: error.message || "Server error" });
    }
};

exports.reCompleteTask = async (req, res) => {
    logDebug(`[${new Date().toISOString()}] reCompleteTask request received. Body: ${JSON.stringify(req.body)}\n`);
    try {
        const { finalRemarks, remarks, remark, comment, nextFollowUpDate, attachments } = req.body;
        const noteText = (finalRemarks || remarks || remark || comment || "Task re-completed").trim();
        const task = await Task.findOne({ _id: req.params.id, companyId: req.user.companyId });
        if (!task) return res.status(404).json({ success: false, message: "Task not found" });

        const formattedAttachments = (attachments || []).map(att => ({
            fileUrl: att.fileUrl || att.url || "",
            fileName: att.fileName || att.name || "Attachment",
            fileType: att.fileType || att.type || ""
        }));

        if (formattedAttachments.length > 0) {
            if (!task.attachments) task.attachments = [];
            formattedAttachments.forEach(att => {
                task.attachments.push({
                    fileUrl: att.fileUrl,
                    fileName: att.fileName,
                    fileType: att.fileType,
                    uploadedAt: new Date(),
                    uploadedBy: req.user._id
                });
            });
        }

        const now = new Date();
        const isPastDue = task.endDateTime && now > new Date(task.endDateTime);

        if (nextFollowUpDate && !isNaN(new Date(nextFollowUpDate).getTime())) {
            task.nextFollowUpDate = new Date(nextFollowUpDate);
        } else if (nextFollowUpDate === null || nextFollowUpDate === "") {
            task.nextFollowUpDate = null;
        }

        if (task.status === "overdue" || task.status === "re_overdue" || isPastDue) {
            const end = new Date(task.endDateTime || task.endDate || now);
            const diffMs = Math.abs(now - end);
            const days = Math.floor(diffMs / (1000 * 60 * 60 * 24));
            const hours = Math.floor((diffMs / (1000 * 60 * 60)) % 24);
            const minutes = Math.floor((diffMs / 1000 / 60) % 60);

            task.status = "re_late_complete";
            task.timerActive = false;
            task.lateCompletedAt = now;
            task.finalRemarks = noteText;
            task.delayedDuration = { days, hours, minutes };

            const remarkToUse = noteText || (formattedAttachments.length > 0 ? "Status updated with attachment" : "Status updated: Re-completed late");
            if (!task.comments) task.comments = [];
            task.comments.push({
                comment: remarkToUse.startsWith("Status updated") ? remarkToUse : 'Status updated: ' + remarkToUse,
                senderName: req.user.name,
                senderRole: req.user.role,
                addedBy: req.user._id,
                attachments: formattedAttachments,
                createdAt: new Date()
            });

            await task.save();

            await TaskActivity.create({
                companyId: task.companyId, taskId: task._id, action: "re_late_complete", remarks: noteText, nextFollowUpDate: task.nextFollowUpDate, attachments: formattedAttachments, performedBy: req.user._id
            });

            notifyTaskAll(
                task.companyId,
                task.assignedTo || [],
                task.departmentId || null,
                "Task Completed Late",
                `Task "${task.title}" has been completed late.`,
                "task_update",
                { taskId: task._id.toString() }
            ).catch(err => console.error("notifyTaskAll error:", err));

            return res.json({ success: true, data: task });
        }

        task.status = "re_complete";
        task.timerActive = false;
        task.completedAt = now;
        task.finalRemarks = noteText;

        const remarkToUse = noteText || (formattedAttachments.length > 0 ? "Status updated with attachment" : "Status updated: Re-completed");
        if (!task.comments) task.comments = [];
        task.comments.push({
            comment: remarkToUse.startsWith("Status updated") ? remarkToUse : 'Status updated: ' + remarkToUse,
            senderName: req.user.name,
            senderRole: req.user.role,
            addedBy: req.user._id,
            attachments: formattedAttachments,
            createdAt: new Date()
        });

        await task.save();

        await TaskActivity.create({
            companyId: task.companyId, taskId: task._id, action: "re_complete", remarks: noteText, nextFollowUpDate: task.nextFollowUpDate, attachments: formattedAttachments, performedBy: req.user._id
        });

        notifyTaskAll(
            task.companyId,
            task.assignedTo || [],
            task.departmentId || null,
            "Task Completed",
            `Task "${task.title}" has been completed again.`,
            "task_update",
            { taskId: task._id.toString() }
        ).catch(err => console.error("notifyTaskAll error:", err));

        res.json({ success: true, data: task });
    } catch (error) {
        console.error("reCompleteTask error:", error);
        res.status(500).json({ success: false, message: error.message || "Server error" });
    }
};

exports.reLateCompleteTask = async (req, res) => {
    logDebug(`[${new Date().toISOString()}] reLateCompleteTask request received. Body: ${JSON.stringify(req.body)}\n`);
    try {
        const { finalRemarks, remarks, remark, comment, nextFollowUpDate, attachments } = req.body;
        const noteText = (finalRemarks || remarks || remark || comment || "Task re-completed late").trim();
        const task = await Task.findOne({ _id: req.params.id, companyId: req.user.companyId });
        if (!task) return res.status(404).json({ success: false, message: "Task not found" });

        const formattedAttachments = (attachments || []).map(att => ({
            fileUrl: att.fileUrl || att.url || "",
            fileName: att.fileName || att.name || "Attachment",
            fileType: att.fileType || att.type || ""
        }));

        if (formattedAttachments.length > 0) {
            if (!task.attachments) task.attachments = [];
            formattedAttachments.forEach(att => {
                task.attachments.push({
                    fileUrl: att.fileUrl,
                    fileName: att.fileName,
                    fileType: att.fileType,
                    uploadedAt: new Date(),
                    uploadedBy: req.user._id
                });
            });
        }

        const now = new Date();
        const end = new Date(task.endDateTime || task.endDate || now);
        const diffMs = Math.abs(now - end);
        const days = Math.floor(diffMs / (1000 * 60 * 60 * 24));
        const hours = Math.floor((diffMs / (1000 * 60 * 60)) % 24);
        const minutes = Math.floor((diffMs / 1000 / 60) % 60);

        task.status = "re_late_complete";
        task.timerActive = false;
        task.lateCompletedAt = now;
        task.finalRemarks = noteText;
        if (nextFollowUpDate && !isNaN(new Date(nextFollowUpDate).getTime())) {
            task.nextFollowUpDate = new Date(nextFollowUpDate);
        } else if (nextFollowUpDate === null || nextFollowUpDate === "") {
            task.nextFollowUpDate = null;
        }
        task.delayedDuration = { days, hours, minutes };

        const remarkToUse = noteText || (formattedAttachments.length > 0 ? "Status updated with attachment" : "Status updated: Re-late completed");
        if (!task.comments) task.comments = [];
        task.comments.push({
            comment: remarkToUse.startsWith("Status updated") ? remarkToUse : 'Status updated: ' + remarkToUse,
            senderName: req.user.name,
            senderRole: req.user.role,
            addedBy: req.user._id,
            attachments: formattedAttachments,
            createdAt: new Date()
        });

        await task.save();

        await TaskActivity.create({
            companyId: task.companyId, taskId: task._id, action: "re_late_complete", remarks: noteText, nextFollowUpDate: task.nextFollowUpDate, attachments: formattedAttachments, performedBy: req.user._id
        });

        notifyTaskAll(
            task.companyId,
            task.assignedTo || [],
            task.departmentId || null,
            "Task Completed Late",
            `Task "${task.title}" has been completed late.`,
            "task_update",
            { taskId: task._id.toString() }
        ).catch(err => console.error("notifyTaskAll error:", err));

        res.json({ success: true, data: task });
    } catch (error) {
        console.error("reLateCompleteTask error:", error);
        res.status(500).json({ success: false, message: error.message || "Server error" });
    }
};

exports.shiftTask = async (req, res) => {
    try {
        const isAllowed = await checkUserPermission(req.user._id, req.user.companyId, req.user.role, "tasks", "shift");
        if (!isAllowed) {
            return res.status(403).json({ success: false, message: "You are not allowed to shift tasks" });
        }

        const { newAssigneeId, shiftReason } = req.body;
        const task = await Task.findOne({ _id: req.params.id, companyId: req.user.companyId });
        if (!task) return res.status(404).json({ success: false, message: "Task not found" });

        const shiftedFrom = task.assignedTo.length > 0 ? task.assignedTo[0] : null;
        task.assignedTo = [newAssigneeId];
        task.assignmentType = "employee";
        task.shiftReason = shiftReason;

        // Add automated comment for history
        if (!task.comments) task.comments = [];
        task.comments.push({
            comment: `Task was shifted to a new user. Reason: ${shiftReason}`,
            senderName: req.user.name,
            senderRole: req.user.role,
            addedBy: req.user._id,
            createdAt: new Date()
        });

        await task.save();

        await TaskActivity.create({
            companyId: task.companyId, taskId: task._id, action: "shifted", remarks: shiftReason, shiftedFrom, shiftedTo: newAssigneeId, performedBy: req.user._id
        });

        // Notify new assignee + CompanyAdmin + managers
        notifyTaskAll(
            task.companyId,
            [newAssigneeId],
            task.departmentId || null,
            "Task Assigned to You",
            `A task was shifted and assigned to you by ${req.user.name}: ${task.title}. Reason: ${shiftReason}`,
            "task",
            { taskId: task._id.toString() }
        ).catch(err => console.error("Error sending shift task notification:", err));

        res.json({ success: true, data: task });
    } catch (error) {
        res.status(500).json({ success: false, message: "Server error" });
    }
};

exports.bulkShiftTasks = async (req, res) => {
    try {
        const isAllowed = await checkUserPermission(req.user._id, req.user.companyId, req.user.role, "tasks", "shift");
        if (!isAllowed) {
            return res.status(403).json({ success: false, message: "You are not allowed to shift tasks" });
        }

        const { taskIds, newAssigneeId, shiftReason } = req.body;
        if (!Array.isArray(taskIds) || taskIds.length === 0) {
            return res.status(400).json({ success: false, message: "No task IDs provided" });
        }

        const tasks = await Task.find({ _id: { $in: taskIds }, companyId: req.user.companyId });
        if (tasks.length === 0) {
            return res.status(404).json({ success: false, message: "No tasks found" });
        }

        for (let task of tasks) {
            const shiftedFrom = task.assignedTo.length > 0 ? task.assignedTo[0] : null;
            task.assignedTo = [newAssigneeId];
            task.assignmentType = "employee";
            task.shiftReason = shiftReason;

            if (!task.comments) task.comments = [];
            task.comments.push({
                comment: `Task was shifted to a new user. Reason: ${shiftReason}`,
                senderName: req.user.name,
                senderRole: req.user.role,
                addedBy: req.user._id,
                createdAt: new Date()
            });

            await task.save();

            await TaskActivity.create({
                companyId: task.companyId,
                taskId: task._id,
                action: "shifted",
                remarks: shiftReason,
                shiftedFrom,
                shiftedTo: newAssigneeId,
                performedBy: req.user._id
            });

            // Notify new assignee + CompanyAdmin + managers
            notifyTaskAll(
                task.companyId,
                [newAssigneeId],
                task.departmentId || null,
                "Task Assigned to You (Bulk Shift)",
                `A task was shifted and assigned to you by ${req.user.name}: ${task.title}. Reason: ${shiftReason}`,
                "task",
                { taskId: task._id.toString() }
            ).catch(err => console.error("Error sending bulk shift task notification:", err));
        }

        res.json({ success: true, message: `Successfully shifted ${tasks.length} tasks` });
    } catch (error) {
        res.status(500).json({ success: false, message: "Server error" });
    }
};


exports.cancelTask = async (req, res) => {
    try {
        const isAllowed = await checkUserPermission(req.user._id, req.user.companyId, req.user.role, "tasks", "cancel");
        if (!isAllowed) {
            return res.status(403).json({ success: false, message: "You are not allowed to cancel tasks" });
        }

        const { cancelReason } = req.body;
        const task = await Task.findOne({ _id: req.params.id, companyId: req.user.companyId });
        if (!task) return res.status(404).json({ success: false, message: "Task not found" });

        task.status = "cancelled";
        task.timerActive = false;
        task.cancelReason = cancelReason;
        await task.save();

        await TaskActivity.create({
            companyId: task.companyId, taskId: task._id, action: "cancelled", remarks: cancelReason, performedBy: req.user._id
        });

        res.json({ success: true, data: task });
    } catch (error) {
        res.status(500).json({ success: false, message: "Server error" });
    }
};

exports.getTodayPendingUpdates = async (req, res) => {
    try {
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const tomorrow = new Date(today);
        tomorrow.setDate(tomorrow.getDate() + 1);

        const employee = await Employee.findOne({ userId: req.user._id, companyId: req.user.companyId }).lean();
        const employeeId = employee ? employee._id : null;

        // Find active tasks for this user (assignedTo) where followUpDate or StartDate is today
        const activeTasks = await Task.find({
            companyId: req.user.companyId,
            assignedTo: employeeId,
            status: { $in: ["in_process", "re_in_process", "overdue"] },
            $or: [
                { nextFollowUpDate: { $gte: today, $lt: tomorrow } },
                { startDateTime: { $gte: today, $lt: tomorrow } } // Edge case for newly assigned tasks today
            ]
        });

        const pendingUpdateTasks = [];

        // Check if there is an activity log for today for each active task
        for (const task of activeTasks) {
            const todayActivity = await TaskActivity.findOne({
                taskId: task._id,
                performedBy: req.user._id,
                createdAt: { $gte: today, $lt: tomorrow }
            });
            if (!todayActivity) {
                pendingUpdateTasks.push(task);
            }
        }

        res.json({ success: true, data: pendingUpdateTasks });
    } catch (error) {
        res.status(500).json({ success: false, message: "Server error" });
    }
};

exports.submitDailyReport = async (req, res) => {
    try {
        const { remarks, attachments } = req.body;
        const task = await Task.findOne({ _id: req.params.id, companyId: req.user.companyId });
        if (!task) return res.status(404).json({ success: false, message: "Task not found" });

        await TaskActivity.create({
            companyId: task.companyId,
            taskId: task._id,
            action: "daily_report",
            remarks,
            attachments,
            performedBy: req.user._id
        });

        res.json({ success: true, message: "Daily report submitted successfully" });
    } catch (error) {
        res.status(500).json({ success: false, message: "Server error" });
    }
};

exports.getDashboardSummary = async (req, res) => {
    try {
        const { departmentId, assignedTo, startDate, endDate, status } = req.query;
        const match = { companyId: new mongoose.Types.ObjectId(req.user.companyId), isLive: true };

        const employee = await Employee.findOne({ userId: req.user._id, companyId: req.user.companyId }).lean();
        const employeeId = employee ? employee._id : null;

        let allowedDeptIds = [];
        if (employee) {
            if (employee.departmentId) allowedDeptIds.push(employee.departmentId);
            if (employee.accessibleDepartments && employee.accessibleDepartments.length > 0) {
                employee.accessibleDepartments.forEach((deptId) => {
                    if (!allowedDeptIds.map(d => d.toString()).includes(deptId.toString())) {
                        allowedDeptIds.push(deptId);
                    }
                });
            }
        }

        if (req.user.role === "Employee") {
            match.assignedTo = employeeId ? new mongoose.Types.ObjectId(employeeId) : null;
        } else if (req.user.role === "Manager" || req.user.role === "TeamLeader") {
            match.$or = [
                { assignedBy: new mongoose.Types.ObjectId(req.user._id) },
                employeeId ? { assignedTo: new mongoose.Types.ObjectId(employeeId) } : null,
                allowedDeptIds.length > 0 ? { departmentId: { $in: allowedDeptIds.map(d => new mongoose.Types.ObjectId(d)) } } : null
            ].filter(Boolean);
        }

        if (departmentId) match.departmentId = new mongoose.Types.ObjectId(departmentId);
        if (assignedTo) match.assignedTo = new mongoose.Types.ObjectId(assignedTo);
        if (status) match.status = { $in: status.split(",") };

        if (startDate && endDate) {
            const startD = new Date(startDate);
            const endD = new Date(endDate);
            endD.setHours(23, 59, 59, 999);
            match.startDateTime = { $gte: startD, $lte: endD };
        }

        // 1. Status count for Donut chart
        const statusCounts = await Task.aggregate([
            { $match: match },
            { $group: { _id: "$status", count: { $sum: 1 } } }
        ]);

        // 2. Employee wise status stacked bar chart
        const employeeStats = await Task.aggregate([
            { $match: match },
            { $unwind: "$assignedTo" },
            {
                $group: {
                    _id: { employee: "$assignedTo", status: "$status" },
                    count: { $sum: 1 }
                }
            },
            {
                $lookup: {
                    from: "employees",
                    localField: "_id.employee",
                    foreignField: "_id",
                    as: "empInfo"
                }
            },
            { $unwind: "$empInfo" },
            {
                $project: {
                    employeeName: { $concat: ["$empInfo.firstName", " ", "$empInfo.lastName"] },
                    status: "$_id.status",
                    count: 1
                }
            }
        ]);

        // Format employee stats for Recharts stacked bar
        const barChartData = [];
        const empMap = {};
        employeeStats.forEach(stat => {
            if (!empMap[stat.employeeName]) {
                empMap[stat.employeeName] = { name: stat.employeeName, pending: 0, in_process: 0, overdue: 0, complete: 0, late_complete: 0, re_pending: 0, re_in_process: 0 };
            }
            empMap[stat.employeeName][stat.status] = stat.count;
        });

        for (let key in empMap) {
            barChartData.push(empMap[key]);
        }

        const donutData = statusCounts.map(item => ({ name: item._id, value: item.count }));


        // 3. Department wise status stacked bar chart
        const deptStats = await Task.aggregate([
            { $match: match },
            {
                $group: {
                    _id: { department: "$departmentId", status: "$status" },
                    count: { $sum: 1 }
                }
            },
            {
                $lookup: {
                    from: "departments",
                    localField: "_id.department",
                    foreignField: "_id",
                    as: "deptInfo"
                }
            },
            { $unwind: { path: "$deptInfo", preserveNullAndEmptyArrays: true } },
            {
                $project: {
                    departmentName: { $ifNull: ["$deptInfo.name", "Unassigned"] },
                    status: "$_id.status",
                    count: 1
                }
            }
        ]);

        const deptChartData = [];
        const deptMap = {};
        deptStats.forEach(stat => {
            if (!deptMap[stat.departmentName]) {
                deptMap[stat.departmentName] = { name: stat.departmentName, pending: 0, in_process: 0, overdue: 0, complete: 0, late_complete: 0, re_pending: 0, re_in_process: 0 };
            }
            deptMap[stat.departmentName][stat.status] = stat.count;
        });

        for (let key in deptMap) {
            deptChartData.push(deptMap[key]);
        }

        res.json({ success: true, donutData, barChartData, deptChartData });

    } catch (error) {
        console.error("Dashboard error:", error);
        res.status(500).json({ success: false, message: "Server error" });
    }
};

exports.getTodayFollowUps = async (req, res) => {
    try {
        const companyId = req.user.companyId;

        // Find today's date range
        const todayStart = new Date();
        todayStart.setHours(0, 0, 0, 0);
        const todayEnd = new Date();
        todayEnd.setHours(23, 59, 59, 999);

        let query = {
            companyId,
            nextFollowUpDate: { $gte: todayStart, $lte: todayEnd },
            status: { $nin: ["complete", "late_complete", "re_complete", "re_late_complete", "cancelled"] },
            assignedTo: req.user._id
        };

        const tasks = await Task.find(query)
            .populate("assignedTo", "firstName lastName")
            .populate("assignedBy", "name")
            .sort({ nextFollowUpDate: 1 });

        const Company = require("../models/Company");
        const company = await Company.findById(companyId).select("settings.shiftEndTime");
        const shiftEndTime = company?.settings?.shiftEndTime || "18:30";

        res.json({ success: true, tasks, shiftEndTime });
    } catch (error) {
        console.error("Get today follow-ups error:", error);
        res.status(500).json({ success: false, message: "Server error" });
    }
};

exports.submitFollowUp = async (req, res) => {
    try {
        logDebug(`[${new Date().toISOString()}] submitFollowUp request received. Body: ${JSON.stringify(req.body)}\n`);

        const { id } = req.params;
        const { nextFollowUpDate, remark, remarks, comment, attachments } = req.body;
        const noteText = (remark || remarks || comment || "").trim();

        const task = await Task.findById(id);
        if (!task) return res.status(404).json({ success: false, message: "Task not found" });

        // Only update nextFollowUpDate if a valid date was explicitly provided
        // Do NOT overwrite existing date with null (prevents auto-null bug)
        if (nextFollowUpDate && !isNaN(new Date(nextFollowUpDate).getTime())) {
            task.nextFollowUpDate = new Date(nextFollowUpDate);
        } else if (nextFollowUpDate === "") {
            // Only clear if explicitly sent as empty string
            task.nextFollowUpDate = null;
        }
        // If null/undefined received => keep existing nextFollowUpDate intact

        if (noteText) {
            task.finalRemarks = noteText;
        }

        const formattedAttachments = (attachments || []).map(att => ({
            fileUrl: att.fileUrl || att.url || "",
            fileName: att.fileName || att.name || "Attachment",
            fileType: att.fileType || att.type || ""
        }));

        if (formattedAttachments.length > 0) {
            if (!task.attachments) task.attachments = [];
            formattedAttachments.forEach(att => {
                task.attachments.push({
                    fileUrl: att.fileUrl,
                    fileName: att.fileName,
                    fileType: att.fileType,
                    uploadedAt: new Date(),
                    uploadedBy: req.user._id
                });
            });
        }

        if (noteText || formattedAttachments.length > 0) {
            if (!task.comments) task.comments = [];
            task.comments.push({
                comment: noteText ? `Follow-up completed: ${noteText}` : `Follow-up completed with attachment`,
                senderName: req.user.name,
                senderRole: req.user.role,
                addedBy: req.user._id,
                attachments: formattedAttachments,
                createdAt: new Date()
            });
        }

        await task.save();

        await TaskActivity.create({
            companyId: task.companyId,
            taskId: task._id,
            action: "follow_up",
            remarks: noteText || (task.nextFollowUpDate ? "Next follow-up date scheduled" : "Follow-up update submitted"),
            nextFollowUpDate: task.nextFollowUpDate,
            attachments: formattedAttachments,
            performedBy: req.user._id
        });

        // Notify everyone: assigned employees + CompanyAdmin + managers
        notifyTaskAll(
            task.companyId,
            task.assignedTo || [],
            task.departmentId || null,
            "Task Follow-up Updated",
            `A follow-up was submitted by ${req.user.name} for task: ${task.title}. ${noteText ? 'Remark: ' + noteText : ''}`,
            "task_update",
            { taskId: task._id.toString() }
        ).catch(err => console.error("Error sending follow-up notification:", err));

        res.json({ success: true, task, message: "Follow-up submitted successfully" });
    } catch (error) {
        console.error("Submit follow-up error:", error);
        res.status(500).json({ success: false, message: "Server error" });
    }
};

exports.addTaskComment = async (req, res) => {
    try {
        let task = await Task.findOne({ _id: req.params.id, companyId: req.user.companyId });
        if (!task) {
            task = await TaskTemplate.findOne({ _id: req.params.id, companyId: req.user.companyId });
        }
        if (!task) return res.status(404).json({ success: false, message: "Task not found" });

        const { comment, attachments } = req.body;
        if ((!comment || !String(comment).trim()) && (!attachments || attachments.length === 0)) {
            return res.status(400).json({ success: false, message: "Comment content or media attachment is required" });
        }

        const userName = req.user.name || "User";
        const userRole = req.user.role || "Employee";

        const formattedAttachments = (attachments || []).map(att => ({
            fileUrl: att.fileUrl || att.url || "",
            fileName: att.fileName || att.name || "Attachment",
            fileType: att.fileType || att.type || ""
        }));

        if (formattedAttachments.length > 0) {
            if (!task.attachments) task.attachments = [];
            formattedAttachments.forEach(att => {
                task.attachments.push({
                    fileUrl: att.fileUrl,
                    fileName: att.fileName,
                    fileType: att.fileType,
                    uploadedAt: new Date(),
                    uploadedBy: req.user._id
                });
            });
        }

        if (!task.comments) task.comments = [];
        task.comments.push({
            comment: comment ? comment.trim() : "",
            senderName: userName,
            senderRole: userRole,
            addedBy: req.user._id,
            attachments: formattedAttachments,
            createdAt: new Date()
        });

        await task.save();

        await TaskActivity.create({
            companyId: task.companyId,
            taskId: task._id,
            action: "comment_added",
            remarks: comment,
            attachments: formattedAttachments,
            performedBy: req.user._id
        });

        // Notify task assignees & supervisors about the new comment
        notifyTaskAll(
            task.companyId,
            task.assignedTo || [],
            task.departmentId || null,
            `New Comment on Task: ${task.title}`,
            `${req.user.name || "A team member"} added a comment on task "${task.title}": ${comment ? (comment.length > 80 ? comment.slice(0, 80) + '...' : comment) : 'Media attachment added'}.`,
            "task_update",
            { taskId: task._id.toString(), action: "comment_added" },
            {
                excludeUserId: req.user._id,
                assigneeTitle: `New Comment: ${task.title}`,
                assigneeBody: `${req.user.name || "Team member"} commented on your task "${task.title}".`,
                supervisorTitle: `Comment on Task: ${task.title}`,
                supervisorBody: `${req.user.name || "Team member"} added a comment on task "${task.title}".`
            }
        ).catch(err => console.error("notifyTaskAll (comment) error:", err));

        res.json({ success: true, data: task });
    } catch (error) {
        res.status(500).json({ success: false, message: "Server error" });
    }
};

exports.uploadTaskAttachment = async (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({ success: false, message: "No file uploaded" });
        }
        
        let task = await Task.findOne({ _id: req.params.id, companyId: req.user.companyId });
        let isTemplate = false;
        if (!task) {
            task = await TaskTemplate.findOne({ _id: req.params.id, companyId: req.user.companyId });
            if (task) isTemplate = true;
        }
        if (!task) return res.status(404).json({ success: false, message: "Task not found" });

        const { uploadFileToFirebase } = require("../services/firebaseService");
        const fileUrl = await uploadFileToFirebase(req.file.buffer, req.file.originalname, "task-attachments");

        if (!task.attachments) task.attachments = [];
        task.attachments.push({
            fileUrl,
            fileName: req.file.originalname,
            fileType: req.file.mimetype,
            uploadedAt: new Date()
        });

        await task.save();

        res.json({ success: true, url: fileUrl, filename: req.file.originalname, task });
    } catch (error) {
        console.error("Upload task attachment error:", error);
        res.status(500).json({ success: false, message: "Server error" });
    }
};

exports.toggleChecklistItem = async (req, res) => {
    try {
        const { id } = req.params;
        const { subtaskId, completed, isCompleted, itemIndex, checklist } = req.body;

        const companyId = req.companyId || req.user?.companyId;
        let task = companyId ? await Task.findOne({ _id: id, companyId }) : await Task.findById(id);
        if (!task) {
            task = await Task.findById(id);
        }
        if (!task && companyId) {
            task = await TaskTemplate.findOne({ _id: id, companyId });
        }
        if (!task) {
            task = await TaskTemplate.findById(id);
        }
        if (!task) {
            return res.status(404).json({ success: false, message: "Task not found" });
        }

        if (!Array.isArray(task.checklist)) {
            task.checklist = [];
        }

        // If entire checklist array is provided, update all
        if (Array.isArray(checklist)) {
            task.checklist = checklist;
        } else {
            let item = null;

            // 1. Try finding by mongoose id() method if valid ObjectId
            if (subtaskId && mongoose.Types.ObjectId.isValid(subtaskId)) {
                try {
                    if (typeof task.checklist.id === "function") {
                        item = task.checklist.id(subtaskId);
                    }
                } catch (err) {
                    console.error("Mongoose checklist.id() failed:", err);
                }
            }

            // 2. Fallback to searching array by string comparison of _id
            if (!item && subtaskId) {
                item = task.checklist.find((x) => x._id && x._id.toString() === subtaskId.toString());
            }

            // 3. Fallback to itemIndex if provided
            if (!item && itemIndex !== undefined && itemIndex >= 0 && itemIndex < task.checklist.length) {
                item = task.checklist[itemIndex];
            }

            if (!item) {
                return res.status(404).json({ success: false, message: "Checklist item not found" });
            }

            const nextCompleted = completed !== undefined ? completed : (isCompleted !== undefined ? isCompleted : !item.isCompleted);
            item.isCompleted = Boolean(nextCompleted);

            // Log activity safely
            try {
                if (typeof TaskActivity !== "undefined" && TaskActivity) {
                    await TaskActivity.create({
                        companyId: task.companyId,
                        taskId: task._id,
                        action: "edited",
                        remarks: `Checklist item "${item.title}" marked as ${item.isCompleted ? "completed" : "incomplete"}`,
                        performedBy: req.user?._id
                    });
                }
            } catch (actErr) {
                console.error("TaskActivity create log ignored:", actErr.message);
            }
        }

        await task.save();

        res.json({ success: true, message: "Checklist item updated successfully", task });
    } catch (error) {
        console.error("Checklist toggle error:", error);
        res.status(500).json({ success: false, message: `Server error: ${error.message}` });
    }
};

exports.uploadMediaFile = async (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({ success: false, message: "No file provided" });
        }

        let fileUrl = "";
        try {
            const { uploadFileToFirebase } = require("../services/firebaseService");
            fileUrl = await uploadFileToFirebase(req.file.buffer, req.file.originalname, "task-media");
        } catch (fbErr) {
            console.warn("Firebase upload failed, falling back to base64 data URI:", fbErr.message);
            const mimeType = req.file.mimetype || "application/octet-stream";
            fileUrl = `data:${mimeType};base64,${req.file.buffer.toString("base64")}`;
        }

        res.json({
            success: true,
            url: fileUrl,
            fileUrl: fileUrl,
            filename: req.file.originalname,
            fileType: req.file.mimetype,
            message: "Media uploaded successfully"
        });
    } catch (error) {
        console.error("Upload media file error:", error);
        res.status(500).json({ success: false, message: `Upload failed: ${error.message}` });
    }
};

exports.unifiedUpdateTaskStatus = async (req, res) => {
    try {
        const { status, remarks, remark, finalRemarks, comment, nextFollowUpDate, attachments, newEndDate } = req.body;
        const targetStatus = status || "in_process";
        const noteText = (finalRemarks || remarks || remark || comment || "").trim();
        
        let task = await Task.findOne({ _id: req.params.id, companyId: req.user.companyId });
        let isTemplate = false;
        if (!task) {
            task = await TaskTemplate.findOne({ _id: req.params.id, companyId: req.user.companyId });
            if (task) isTemplate = true;
        }
        if (!task) return res.status(404).json({ success: false, message: "Task not found" });

        const formattedAttachments = (attachments || []).map(att => ({
            fileUrl: att.fileUrl || att.url || "",
            fileName: att.fileName || att.name || "Attachment",
            fileType: att.fileType || att.type || ""
        }));

        if (formattedAttachments.length > 0) {
            if (!task.attachments) task.attachments = [];
            formattedAttachments.forEach(att => {
                task.attachments.push({
                    fileUrl: att.fileUrl,
                    fileName: att.fileName,
                    fileType: att.fileType,
                    uploadedAt: new Date(),
                    uploadedBy: req.user._id
                });
            });
        }

        if (newEndDate && !isNaN(new Date(newEndDate).getTime())) {
            task.endDateTime = new Date(newEndDate);
        }
        if (nextFollowUpDate && !isNaN(new Date(nextFollowUpDate).getTime())) {
            task.nextFollowUpDate = new Date(nextFollowUpDate);
        } else if (nextFollowUpDate === "" || nextFollowUpDate === null) {
            task.nextFollowUpDate = null;
        }

        if (noteText) {
            task.finalRemarks = noteText;
        }

        const now = new Date();
        const isPastDue = task.endDateTime && now > new Date(task.endDateTime);
        const isLate = ["late_complete", "re_late_complete", "late_completed"].includes(targetStatus) ||
            ((task.status === "overdue" || task.status === "re_overdue" || isPastDue) &&
             ["complete", "completed", "done", "re_complete", "re_completed"].includes(targetStatus));

        if (isLate) {
            const effectiveStatus = (targetStatus.startsWith("re_") || task.status === "re_overdue") ? "re_late_complete" : "late_complete";
            task.status = effectiveStatus;
            task.lateCompletedAt = now;
            task.timerActive = false;
            const end = new Date(task.endDateTime || task.endDate || now);
            const diffMs = Math.abs(now - end);
            const days = Math.floor(diffMs / (1000 * 60 * 60 * 24));
            const hours = Math.floor((diffMs / (1000 * 60 * 60)) % 24);
            const minutes = Math.floor((diffMs / 1000 / 60) % 60);
            task.delayedDuration = { days, hours, minutes };
        } else if (["complete", "completed", "done"].includes(targetStatus)) {
            task.status = "complete";
            task.completedAt = now;
            task.timerActive = false;
        } else if (["re_complete", "re_completed"].includes(targetStatus)) {
            task.status = "re_complete";
            task.completedAt = now;
            task.timerActive = false;
        } else if (["in_process", "in-process", "in_progress"].includes(targetStatus)) {
            task.status = (task.status === "re_pending" || task.status === "re_open" || task.status === "re_overdue") ? "re_in_process" : "in_process";
            task.timerActive = true;
        } else if (["re_in_process"].includes(targetStatus)) {
            task.status = "re_in_process";
            task.timerActive = true;
        } else if (["pending", "re_pending"].includes(targetStatus)) {
            task.status = targetStatus;
            task.timerActive = false;
        } else {
            task.status = targetStatus;
        }

        const remarkToUse = noteText || (formattedAttachments.length > 0 ? "Status updated with attachment" : `Status updated to ${task.status.replace(/_/g, " ")}`);
        if (!task.comments) task.comments = [];
        task.comments.push({
            comment: remarkToUse.startsWith("Status updated") ? remarkToUse : 'Status updated: ' + remarkToUse,
            senderName: req.user.name,
            senderRole: req.user.role,
            addedBy: req.user._id,
            attachments: formattedAttachments,
            createdAt: new Date()
        });

        await task.save();

        await TaskActivity.create({
            companyId: task.companyId,
            taskId: task._id,
            action: task.status,
            remarks: noteText || remarkToUse,
            nextFollowUpDate: task.nextFollowUpDate,
            attachments: formattedAttachments,
            performedBy: req.user._id
        });

        notifyTaskAll(
            task.companyId,
            task.assignedTo || [],
            task.departmentId || null,
            `Task Status Updated: ${task.title}`,
            `Task status changed to "${task.status.replace(/_/g, " ")}" by ${req.user.name}`,
            "task_update",
            { taskId: task._id.toString() }
        ).catch(err => console.error("notifyTaskAll error:", err));

        res.json({ success: true, data: task, task });
    } catch (error) {
        console.error("unifiedUpdateTaskStatus error:", error);
        res.status(500).json({ success: false, message: error.message || "Server error" });
    }
};


