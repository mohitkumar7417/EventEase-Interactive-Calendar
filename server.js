require("dotenv").config();

const express = require("express");
const path = require("path");
const nano = require("nano");
const nodemailer = require("nodemailer");
const cron = require("node-cron");

const emailTransporter = nodemailer.createTransport({
    service: "gmail",
    auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS
    }
});
emailTransporter.verify()
    .then(() => {
        console.log("Gmail email service is ready.");
    })
    .catch((error) => {
        console.error("Gmail email service error:", error.message);
    });

const app = express();
const PORT = 3000;

// CouchDB connection
const couchdbUrl = `http://${encodeURIComponent(process.env.COUCHDB_USER)}:${encodeURIComponent(process.env.COUCHDB_PASSWORD)}@localhost:5984`;
const couchdb = nano(couchdbUrl);

const db = couchdb.db.use("eventease");

// Middleware
app.use(express.json());

app.use(
    express.static(
        path.join(__dirname, "public")
    )
);

// TEST EMAIL ROUTE
app.get("/api/test-email", async (req, res) => {
    try {
        await emailTransporter.sendMail({
            from: process.env.EMAIL_USER,
            to: process.env.EMAIL_USER,
            subject: "EventEase Test Email",
            text: "Congratulations! Your EventEase email notification system is working successfully."
        });

        res.json({
            message: "Test email sent successfully!"
        });

    } catch (error) {
        console.error("Email sending error:", error.message);

        res.status(500).json({
            error: "Failed to send test email"
        });
    }
});

// REMINDER SCHEDULE
function getReminderSchedule(dueDate) {

    const due = new Date(`${dueDate}T00:00:00`);

    const reminders = [
        {
            id: "two_days_before",
            offset: -2,
            hour: 9
        },
        {
            id: "before_due",
            offset: -1,
            hour: 9
        },
        {
            id: "due_today",
            offset: 0,
            hour: 8
        },
        {
            id: "one_day_overdue",
            offset: 1,
            hour: 9
        },
        {
            id: "two_days_overdue",
            offset: 2,
            hour: 9
        }
    ];

    return reminders.map(reminder => {
        const reminderDate = new Date(due);

        reminderDate.setDate(
            reminderDate.getDate() + reminder.offset
        );

        reminderDate.setHours(
            reminder.hour,
            0,
            0,
            0
        );

        return {
            id: reminder.id,
            time: reminderDate
        };
    });
}

// SEND TASK REMINDER EMAIL
async function sendTaskReminder(task, reminder) {

    const remindersSent = Array.isArray(task.remindersSent)
        ? task.remindersSent
        : [];

    if (remindersSent.includes(reminder.id)) {
        return false;
    }

    if (task.completed) {
        return false;
    }

    await emailTransporter.sendMail({
        from: process.env.EMAIL_USER,
        to: process.env.EMAIL_USER,
        subject: `EventEase Reminder: ${task.title}`,
        text: `
Hello!

This is your EventEase task reminder.

Task: ${task.title}
Description: ${task.description || "No description"}
Due Date: ${task.dueDate}
Priority: ${task.priority}

Please check your task in EventEase.

Thank you,
EventEase
        `
    });

    const latestTask = await db.get(task._id);

    if (!Array.isArray(latestTask.remindersSent)) {
        latestTask.remindersSent = [];
    }

    if (!latestTask.remindersSent.includes(reminder.id)) {
        latestTask.remindersSent.push(reminder.id);
        await db.insert(latestTask);
    }

    console.log(`Reminder sent: ${task.title} (${reminder.id})`);

    return true;
}

// AUTOMATIC REMINDER CHECKER
let reminderCheckRunning = false;

async function checkTaskReminders() {

    if (reminderCheckRunning) {
        return;
    }

    reminderCheckRunning = true;

    try {
        const result = await db.list({
            include_docs: true
        });

        const now = new Date();
        const priorityOrder = {
            High: 1,
            Medium: 2,
            Low: 3
        };

        const pendingReminders = [];

        for (const row of result.rows) {

            const task = row.doc;

            if (task.completed || !task.dueDate) {
                continue;
            }

            const remindersSent = Array.isArray(task.remindersSent)
                ? task.remindersSent
                : [];

            const schedule = getReminderSchedule(task.dueDate);

            for (const reminder of schedule) {

                if (
                    !remindersSent.includes(reminder.id) &&
                    reminder.time <= now
                ) {
                    pendingReminders.push({
                        task,
                        reminder
                    });
                }
            }
        }

        // Sort by scheduled time, then priority
        pendingReminders.sort((a, b) => {

            const timeDifference =
                a.reminder.time - b.reminder.time;

            if (timeDifference !== 0) {
                return timeDifference;
            }

            return (
                (priorityOrder[a.task.priority] || 2) -
                (priorityOrder[b.task.priority] || 2)
            );
        });

        // Send reminders one by one
        for (const item of pendingReminders) {

            await sendTaskReminder(
                item.task,
                item.reminder
            );
        }

        if (pendingReminders.length > 0) {
            console.log(
                `${pendingReminders.length} reminder(s) checked.`
            );
        }

    } catch (error) {

        console.error(
            "Reminder checker error:",
            error.message
        );

    } finally {
        reminderCheckRunning = false;
    }
}

// Home page
app.get("/", (req, res) => {
    res.sendFile(
        path.join(__dirname, "public", "index.html")
    );
});

// GET ALL TASKS
app.get("/api/tasks", async (req, res) => {
    try {
        const result = await db.list({
            include_docs: true
        });

        const tasks = result.rows.map(row => ({
            ...row.doc,
            id: row.doc._id
        }));

        res.json(tasks);

    } catch (error) {
        console.error("Error fetching tasks:", error);

        res.status(500).json({
            error: "Failed to fetch tasks"
        });
    }
});

// ADD TASK
app.post("/api/tasks", async (req, res) => {

    const {
        title,
        description,
        dueDate,
        priority
    } = req.body;

    if (!title || title.trim() === "") {
        return res.status(400).json({
            error: "Task title is required"
        });
    }

    const task = {
        _id: String(Date.now()),
        title: title.trim(),
        description: description || "",
        dueDate: dueDate || "",
        priority: priority || "Medium",
        completed: false,
        subtasks: [],
        remindersSent: []
    };

    try {
        await db.insert(task);

        res.status(201).json(task);

    } catch (error) {
        console.error("Error adding task:", error);

        res.status(500).json({
            error: "Failed to add task"
        });
    }
});

// UPDATE TASK
app.put("/api/tasks/:id", async (req, res) => {

    const id = String(req.params.id);

    try {
        const task = await db.get(id);

        if (req.body.title !== undefined) {
            task.title = req.body.title.trim();
        }

        if (req.body.description !== undefined) {
            task.description = req.body.description;
        }

        if (req.body.dueDate !== undefined) {
            if (task.dueDate !== req.body.dueDate) {
                task.remindersSent = [];
            }

            task.dueDate = req.body.dueDate;
        }

        if (req.body.priority !== undefined) {
            task.priority = req.body.priority;
        }

        if (req.body.completed !== undefined) {
            task.completed = req.body.completed;
        }

        await db.insert(task);

        res.json(task);

    } catch (error) {

        if (error.statusCode === 404) {
            return res.status(404).json({
                error: "Task not found"
            });
        }

        console.error("Error updating task:", error);

        res.status(500).json({
            error: "Failed to update task"
        });
    }
});

// DELETE TASK
app.delete("/api/tasks/:id", async (req, res) => {

    const id = String(req.params.id);

    try {
        const task = await db.get(id);

        await db.destroy(task._id, task._rev);

        res.json({
            message: "Task deleted successfully"
        });

    } catch (error) {

        if (error.statusCode === 404) {
            return res.status(404).json({
                error: "Task not found"
            });
        }

        console.error("Error deleting task:", error);

        res.status(500).json({
            error: "Failed to delete task"
        });
    }
});

// ADD SUBTASK
app.post("/api/tasks/:id/subtasks", async (req, res) => {

    const taskId = String(req.params.id);

    try {
        const task = await db.get(taskId);

        const title = req.body.title;

        if (!title || title.trim() === "") {
            return res.status(400).json({
                error: "Subtask title is required"
            });
        }

        const subtask = {
            id: Date.now(),
            title: title.trim(),
            completed: false
        };

        if (!Array.isArray(task.subtasks)) {
            task.subtasks = [];
        }

        task.subtasks.push(subtask);

        await db.insert(task);

        res.status(201).json(subtask);

    } catch (error) {

        if (error.statusCode === 404) {
            return res.status(404).json({
                error: "Main task not found"
            });
        }

        console.error("Error adding subtask:", error);

        res.status(500).json({
            error: "Failed to add subtask"
        });
    }
});

// UPDATE SUBTASK
app.put("/api/tasks/:taskId/subtasks/:subtaskId", async (req, res) => {

    const taskId = String(req.params.taskId);
    const subtaskId = Number(req.params.subtaskId);

    try {
        const task = await db.get(taskId);

        const subtask = task.subtasks.find(
            s => s.id === subtaskId
        );

        if (!subtask) {
            return res.status(404).json({
                error: "Subtask not found"
            });
        }

        if (req.body.completed !== undefined) {
            subtask.completed = req.body.completed;
        }

        if (req.body.title !== undefined) {
            subtask.title = req.body.title.trim();
        }

        await db.insert(task);

        res.json(subtask);

    } catch (error) {

        if (error.statusCode === 404) {
            return res.status(404).json({
                error: "Main task not found"
            });
        }

        console.error("Error updating subtask:", error);

        res.status(500).json({
            error: "Failed to update subtask"
        });
    }
});

// DELETE SUBTASK
app.delete("/api/tasks/:taskId/subtasks/:subtaskId", async (req, res) => {

    const taskId = String(req.params.taskId);
    const subtaskId = Number(req.params.subtaskId);

    try {
        const task = await db.get(taskId);

        const oldLength = task.subtasks.length;

        task.subtasks = task.subtasks.filter(
            s => s.id !== subtaskId
        );

        if (task.subtasks.length === oldLength) {
            return res.status(404).json({
                error: "Subtask not found"
            });
        }

        await db.insert(task);

        res.json({
            message: "Subtask deleted successfully"
        });

    } catch (error) {

        if (error.statusCode === 404) {
            return res.status(404).json({
                error: "Main task not found"
            });
        }

        console.error("Error deleting subtask:", error);

        res.status(500).json({
            error: "Failed to delete subtask"
        });
    }
});

// CHECK MISSED REMINDERS WHEN SERVER STARTS
checkTaskReminders();

// CHECK REMINDERS EVERY MINUTE
cron.schedule("* * * * *", () => {
    checkTaskReminders();
});

// START SERVER
app.listen(PORT, () => {

    console.log("=================================");
    console.log("       CLOUD TASK MANAGER");
    console.log("=================================");

    console.log(
        `Server running at http://localhost:${PORT}`
    );

    console.log("=================================");

});