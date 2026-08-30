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
        
        if (req.user.role === "Employee" && assigneeIds.length === 0) {
            const selfEmployee = await Employee.findOne({ userId: req.user._id, companyId }).lean();
            if (selfEmployee) assigneeIds = [selfEmployee._id];
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

            const endDt = new Date(safeEndDate);
            if (deadlineTime && typeof deadlineTime === "string" && deadlineTime.includes(":")) {
                const [hours, mins] = deadlineTime.split(":");
                if (!isNaN(parseInt(hours, 10)) && !isNaN(parseInt(mins, 10))) {
                    endDt.setHours(parseInt(hours, 10), parseInt(mins, 10), 0, 0);
                }
            }

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
                endDateTime: isNaN(endDt.getTime()) ? new Date(startDt.getTime() + 86400000) : endDt,
                nextFollowUpDate: nextFollowUpDate && !isNaN(new Date(nextFollowUpDate).getTime()) ? new Date(nextFollowUpDate) : startDt,
                status: "pending",
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

            // Notify assigned employees + CompanyAdmin + managers
            notifyTaskAll(
                companyId,
                assigneeIds,
                newTask.departmentId || null,
                "New Task Assigned",
                `You have been assigned a new task: ${title}`,
                "task",
                { taskId: newTask._id.toString() }
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

        // Notify assigned employees + CompanyAdmin + managers for recurring task
        notifyTaskAll(
            companyId,
            assigneeIds,
            newTemplate.departmentId || null,
            "Recurring Task Set Up",
            `A new recurring task schedule (${safeRepeatType}) has been set up: ${title}`,
            "task_template",
            { templateId: newTemplate._id.toString() }
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
        const query = { companyId: req.user.companyId };
        if (!isTemplate) {
            query.isLive = true;
        } else {
            query.isActive = true;
        }

        // Resolve corresponding Employee record
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

        // Apply RBAC
        let rbacOr = null;
        if (req.user.role === "Employee") {
            rbacOr = [
                employeeId ? { assignedTo: employeeId } : null,
                allowedDeptIds.length > 0 ? { departmentId: { $in: allowedDeptIds }, assignmentType: { $in: ["department", "company", "company_wide"] } } : null,
                { assignmentType: { $in: ["company", "company_wide"] } }
            ].filter(Boolean);
        } else if (req.user.role === "Manager" || req.user.role === "TeamLeader") {
            rbacOr = [
                { assignedBy: req.user._id },
                employeeId ? { assignedTo: employeeId } : null,
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

        let tasks;
        if (isTemplate) {
            const docs = await TaskTemplate.find(query).sort({ createdAt: -1 })
                .populate("assignedTo", "firstName lastName email")
                .populate("assignedBy", "name email")
                .populate("departmentId", "name")
                .populate({ path: "projectId", select: "name", strictPopulate: false })
                .lean();
            tasks = docs.map(d => {
                const obj = { ...d };
                obj.isTemplate = true;
                obj.assignees = obj.assignedTo || [];
                return obj;
            });
        } else {
            tasks = await Task.find(query).sort({ createdAt: -1 })
                .populate("assignedTo", "firstName lastName email")
                .populate("assignedBy", "name email")
                .populate("departmentId", "name")
                .populate({ path: "projectId", select: "name", strictPopulate: false })
                .lean();
        }

        res.json({ success: true, tasks });
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
                select: "firstName lastName departmentName departmentId departmentIds",
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
                    select: "firstName lastName departmentName departmentId departmentIds",
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
        }

        const timeline = await TaskActivity.find({ taskId: task._id }).sort({ createdAt: 1 })
            .populate("performedBy", "name");

        res.json({ success: true, data: { task, timeline }, task, timeline });
    } catch (error) {
        console.error("getTaskDetails error:", error);
        res.status(500).json({ success: false, message: "Server error: " + error.message });
    }
};

exports.updateTask = async (req, res) => {
    try {
        const { title, description, departmentId, assignedTo, priority, endDate, deadlineTime } = req.body;

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

        if (isTemplate) {
            // Update recurring properties
            const { repeatEnabled, repeatType, weeklyDays, monthlyDates, finishDate } = req.body;
            if (repeatEnabled !== undefined) task.repeatEnabled = repeatEnabled;
            if (repeatType) task.repeatType = repeatType;
            if (weeklyDays) task.weeklyDays = weeklyDays;
            if (monthlyDates) task.monthlyDates = monthlyDates;
            if (finishDate !== undefined) task.finishDate = finishDate ? new Date(finishDate) : null;
        }

        if (endDate) {
            const endDt = new Date(endDate);
            if (deadlineTime) {
                const [hours, mins] = deadlineTime.split(":");
                endDt.setHours(parseInt(hours), parseInt(mins), 0, 0);
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
        if (!isTemplate) {
            task.timerActive = true;
            if (nextFollowUpDate && !isNaN(new Date(nextFollowUpDate).getTime())) {
                task.nextFollowUpDate = new Date(nextFollowUpDate);
            } else if (nextFollowUpDate === null || nextFollowUpDate === "") {
                task.nextFollowUpDate = null;
            }
        }

        const formattedAttachments = (attachments || []).map(att => ({
            fileUrl: att.fileUrl || att.url || "",
            fileName: att.fileName || att.name || "Attachment",
            fileType: att.fileType || att.type || ""
        }));

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
            { taskId: task._id.toString() }
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
        const { finalRemarks, remarks, remark, comment, attachments } = req.body;
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

        if (isTemplate) {
            task.status = "complete";
            await task.save();
            await TaskActivity.create({
                companyId: task.companyId, taskId: task._id, action: "completed", remarks: finalRemarks, attachments: formattedAttachments, performedBy: req.user._id
            });
            notifyTaskAll(
                task.companyId,
                task.assignedTo || [],
                task.departmentId || null,
                "Recurring Task Completed",
                `Recurring task "${task.title}" has been completed.`,
                "task_update",
                { taskId: task._id.toString() }
            ).catch(err => console.error("notifyTaskAll error:", err));
            return res.json({ success: true, data: task });
        }

        const now = new Date();
        const isPastDue = task.endDateTime && now > new Date(task.endDateTime);

        if (task.status === "overdue" || isPastDue) {
            const end = new Date(task.endDateTime);
            const diffMs = Math.abs(now - end);
            const days = Math.floor(diffMs / (1000 * 60 * 60 * 24));
            const hours = Math.floor((diffMs / (1000 * 60 * 60)) % 24);
            const minutes = Math.floor((diffMs / 1000 / 60) % 60);

            task.status = "late_complete";
            task.timerActive = false;
            task.lateCompletedAt = now;
            task.finalRemarks = finalRemarks;
            task.nextFollowUpDate = null;
            task.delayedDuration = { days, hours, minutes };

            const remarkToUse = (typeof finalRemarks === 'string' && finalRemarks.trim()) ? finalRemarks : '';
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
                companyId: task.companyId, taskId: task._id, action: "late_completed", remarks: finalRemarks, attachments: formattedAttachments, performedBy: req.user._id
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

        task.status = "complete";
        task.timerActive = false;
        task.completedAt = now;
        task.finalRemarks = finalRemarks;
        task.nextFollowUpDate = null;

        const remarkToUse = (typeof finalRemarks === 'string' && finalRemarks.trim()) ? finalRemarks : '';
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
            companyId: task.companyId, taskId: task._id, action: "completed", remarks: finalRemarks, attachments: formattedAttachments, performedBy: req.user._id
        });

        notifyTaskAll(
            task.companyId,
            task.assignedTo || [],
            task.departmentId || null,
            "Task Completed",
            `Task "${task.title}" has been completed.`,
            "task_update",
            { taskId: task._id.toString() }
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
        const { finalRemarks, remarks, remark, comment, attachments } = req.body;
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

        if (isTemplate) {
            task.status = "late_complete";
            await task.save();
            await TaskActivity.create({
                companyId: task.companyId, taskId: task._id, action: "late_completed", remarks: finalRemarks, attachments: formattedAttachments, performedBy: req.user._id
            });
            notifyTaskAll(
                task.companyId,
                task.assignedTo || [],
                task.departmentId || null,
                "Recurring Task Completed Late",
                `Recurring task "${task.title}" has been completed late.`,
                "task_update",
                { taskId: task._id.toString() }
            ).catch(err => console.error("notifyTaskAll error:", err));
            return res.json({ success: true, data: task });
        }

        const now = new Date();
        const end = new Date(task.endDateTime);
        const diffMs = Math.abs(now - end);
        const days = Math.floor(diffMs / (1000 * 60 * 60 * 24));
        const hours = Math.floor((diffMs / (1000 * 60 * 60)) % 24);
        const minutes = Math.floor((diffMs / 1000 / 60) % 60);

        task.status = "late_complete";
        task.timerActive = false;
        task.lateCompletedAt = now;
        task.finalRemarks = finalRemarks;
        task.nextFollowUpDate = null;
        task.delayedDuration = { days, hours, minutes };

        const remarkToUse = (typeof finalRemarks === 'string' && finalRemarks.trim()) ? finalRemarks : '';
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
            companyId: task.companyId, taskId: task._id, action: "late_completed", remarks: finalRemarks, attachments: formattedAttachments, performedBy: req.user._id
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
            { taskId: task._id.toString() }
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

        task.status = "re_in_process";
        task.timerActive = true;
        if (nextFollowUpDate && !isNaN(new Date(nextFollowUpDate).getTime())) {
            task.nextFollowUpDate = new Date(nextFollowUpDate);
        } else if (nextFollowUpDate === null || nextFollowUpDate === "") {
            task.nextFollowUpDate = null;
        }

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
            companyId: task.companyId, taskId: task._id, action: "re_in_process", remarks, nextFollowUpDate: task.nextFollowUpDate, attachments: formattedAttachments, performedBy: req.user._id
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
        const { finalRemarks, remarks, remark, comment, attachments } = req.body;
        const noteText = (finalRemarks || remarks || remark || comment || "Task re-completed").trim();
        const task = await Task.findOne({ _id: req.params.id, companyId: req.user.companyId });
        if (!task) return res.status(404).json({ success: false, message: "Task not found" });

        const formattedAttachments = (attachments || []).map(att => ({
            fileUrl: att.fileUrl || att.url || "",
            fileName: att.fileName || att.name || "Attachment",
            fileType: att.fileType || att.type || ""
        }));

        task.status = "re_complete";
        task.timerActive = false;
        task.completedAt = new Date();
        task.finalRemarks = noteText;
        task.nextFollowUpDate = null;

        const remarkToUse = noteText || (formattedAttachments.length > 0 ? "Status updated with attachment" : "Status updated: Re-completed");
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
            companyId: task.companyId, taskId: task._id, action: "re_complete", remarks: noteText, attachments: formattedAttachments, performedBy: req.user._id
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
        const { finalRemarks, remarks, remark, comment, attachments } = req.body;
        const noteText = (finalRemarks || remarks || remark || comment || "Task re-completed late").trim();
        const task = await Task.findOne({ _id: req.params.id, companyId: req.user.companyId });
        if (!task) return res.status(404).json({ success: false, message: "Task not found" });

        const formattedAttachments = (attachments || []).map(att => ({
            fileUrl: att.fileUrl || att.url || "",
            fileName: att.fileName || att.name || "Attachment",
            fileType: att.fileType || att.type || ""
        }));

        task.status = "re_late_complete";
        task.timerActive = false;
        task.lateCompletedAt = new Date();
        task.finalRemarks = noteText;
        task.nextFollowUpDate = null;

        const remarkToUse = noteText || (formattedAttachments.length > 0 ? "Status updated with attachment" : "Status updated: Re-late completed");
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
            companyId: task.companyId, taskId: task._id, action: "re_late_complete", remarks: finalRemarks, attachments: formattedAttachments, performedBy: req.user._id
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

exports.uploadMediaFile = async (req, res) => {
    try {
        logDebug(`[${new Date().toISOString()}] Upload request received. req.file: ${req.file ? JSON.stringify({ originalname: req.file.originalname, mimetype: req.file.mimetype, size: req.file.size }) : 'undefined'}\n`);

        if (!req.file) {
            return res.status(400).json({ success: false, message: "No file uploaded" });
        }
        const { uploadFileToFirebase } = require("../services/firebaseService");
        const fileUrl = await uploadFileToFirebase(req.file.buffer, req.file.originalname, "comment-attachments");

        logDebug(`[${new Date().toISOString()}] Upload successful. fileUrl: ${fileUrl}\n`);

        res.json({
            success: true,
            fileUrl,
            fileName: req.file.originalname,
            fileType: req.file.mimetype
        });
    } catch (error) {
        logDebug(`[${new Date().toISOString()}] Upload error: ${error.message}\n${error.stack}\n`);
        console.error("Upload media error:", error);
        res.status(500).json({ success: false, message: "Upload failed" });
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
        const { nextFollowUpDate, remark, attachments } = req.body;

        const task = await Task.findById(id);
        if (!task) return res.status(404).json({ success: false, message: "Task not found" });

        if (nextFollowUpDate && !isNaN(new Date(nextFollowUpDate).getTime())) {
            task.nextFollowUpDate = new Date(nextFollowUpDate);
        } else {
            task.nextFollowUpDate = null;
        }

        const formattedAttachments = (attachments || []).map(att => ({
            fileUrl: att.fileUrl || att.url || "",
            fileName: att.fileName || att.name || "Attachment",
            fileType: att.fileType || att.type || ""
        }));

        if (remark || formattedAttachments.length > 0) {
            if (!task.comments) task.comments = [];
            task.comments.push({
                comment: remark ? `Follow-up completed: ${remark}` : `Follow-up completed with attachment`,
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
            remarks: remark || (task.nextFollowUpDate ? "Next follow-up date scheduled" : "Follow-up update submitted"),
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
            `A follow-up was submitted by ${req.user.name} for task: ${task.title}. ${remark ? 'Remark: ' + remark : ''}`,
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

        if (!task.comments) task.comments = [];
        task.comments.push({
            comment: comment ? comment.trim() : "",
            senderName: userName,
            senderRole: userRole,
            addedBy: req.user._id,
            attachments: attachments || [],
            createdAt: new Date()
        });

        await task.save();

        await TaskActivity.create({
            companyId: task.companyId,
            taskId: task._id,
            action: "comment_added",
            remarks: comment,
            performedBy: req.user._id
        });

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

