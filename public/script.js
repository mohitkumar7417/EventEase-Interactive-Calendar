// ==========================================
// LOAD TASKS
// ==========================================

async function loadTasks() {
    await applyFilters();
}


// ==========================================
// ADD MAIN TASK
// ==========================================

async function addTask() {

    const titleInput = document.getElementById("taskInput");
    const descriptionInput = document.getElementById("descriptionInput");
    const dueDateInput = document.getElementById("dueDateInput");
    const priorityInput = document.getElementById("priorityInput");

    const title = titleInput.value.trim();
    const description = descriptionInput.value.trim();
    const dueDate = dueDateInput.value;
    const priority = priorityInput.value;

    if (title === "") {
        alert("Please enter a task.");
        return;
    }

    try {
        const response = await fetch("/api/tasks", {
            method: "POST",
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify({
                title,
                description,
                dueDate,
                priority
            })
        });

        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.error || "Task could not be added");
        }

        titleInput.value = "";
        descriptionInput.value = "";
        dueDateInput.value = "";
        priorityInput.value = "Medium";

        await loadTasks();

    } catch (error) {
        console.log("Error adding task:", error);
        alert("Unable to add task: " + error.message);
    }
}


// ==========================================
// ESCAPE HTML
// ==========================================

function escapeHtml(value) {
    return String(value ?? "").replace(/[&<>"']/g, character => ({
        "&": "&amp;",
        "<": "&lt;",
        ">": "&gt;",
        '"': "&quot;",
        "'": "&#39;"
    })[character]);
}


// ==========================================
// DISPLAY TASKS AND SUBTASKS
// ==========================================

function displayTasks(tasks) {

    const taskList = document.getElementById("taskList");

    taskList.innerHTML = "";

    if (tasks.length === 0) {

        let message = "No tasks available. Add your first task!";

        if (currentStatus === "pending") {
            message = "No pending tasks available.";
        }
        else if (currentStatus === "completed") {
            message = "No completed tasks available.";
        }
        else if (currentPriority !== "all") {
            message = "No " + currentPriority.toLowerCase() +
                      "-priority tasks available.";
        }

        taskList.innerHTML = `<p>${message}</p>`;
        return;
    }

    tasks.forEach(task => {

        const taskId = String(task.id ?? task._id);
        const subtasks = Array.isArray(task.subtasks) ? task.subtasks : [];

        const div = document.createElement("div");
        div.className = "task";

        const subtaskHTML = subtasks.map(subtask => `
            <div class="subtask-item">

                <label>
                    <input
                        type="checkbox"
                        ${subtask.completed ? "checked" : ""}
                        onchange='toggleSubtask(
                            ${JSON.stringify(taskId)},
                            ${JSON.stringify(String(subtask.id))},
                            this.checked
                        )'
                    >

                    <span class="${subtask.completed ? "completed" : ""}">
                        ${escapeHtml(subtask.title)}
                    </span>
                </label>

                <button onclick='editSubtask(
                    ${JSON.stringify(taskId)},
                    ${JSON.stringify(String(subtask.id))},
                    ${JSON.stringify(subtask.title)}
                )'>
                    Edit
                </button>

                <button onclick='deleteSubtask(
                    ${JSON.stringify(taskId)},
                    ${JSON.stringify(String(subtask.id))}
                )'>
                    Delete
                </button>

            </div>
        `).join("");

        div.innerHTML = `
            <div class="task-content">

                <h3 class="${task.completed ? "completed" : ""}">
                    ${escapeHtml(task.title)}
                </h3>

                <p>${escapeHtml(task.description || "No description")}</p>

                <p>
                    <strong>Due Date:</strong>
                    ${task.dueDate
                        ? escapeHtml(task.dueDate.split("-").reverse().join("-"))
                        : "Not set"}
                </p>

                <p>
                    <strong>Priority:</strong>
                    ${escapeHtml(task.priority || "Medium")}
                </p>

                <p>
                    <strong>Status:</strong>
                    ${task.completed ? "Completed" : "Pending"}
                </p>

                <div class="task-buttons">

                    <button onclick='completeTask(
                        ${JSON.stringify(taskId)},
                        ${!task.completed}
                    )'>
                        ${task.completed ? "Undo" : "Complete"}
                    </button>

                    <button onclick='editTask(${JSON.stringify(taskId)})'>
                        Edit
                    </button>

                    <button onclick='deleteTask(${JSON.stringify(taskId)})'>
                        Delete
                    </button>

                </div>

                <hr>

                <div class="subtasks-section">

                    <h4>Subtasks</h4>

                    <div class="subtask-input">
                        <input
                            type="text"
                            id="subtaskInput-${escapeHtml(taskId)}"
                            placeholder="Enter a subtask"
                        >

                        <button onclick='addSubtask(${JSON.stringify(taskId)})'>
                            + Add Subtask
                        </button>
                    </div>

                    <div class="subtask-list">
                        ${subtaskHTML || "<p>No subtasks added yet.</p>"}
                    </div>

                </div>

            </div>
        `;

        taskList.appendChild(div);
    });
}


// ==========================================
// ADD SUBTASK
// ==========================================

async function addSubtask(taskId) {

    const input = document.getElementById(`subtaskInput-${taskId}`);
    const title = input.value.trim();

    if (title === "") {
        alert("Please enter a subtask.");
        return;
    }

    try {
        const response = await fetch(
            `/api/tasks/${encodeURIComponent(taskId)}/subtasks`,
            {
                method: "POST",
                headers: {
                    "Content-Type": "application/json"
                },
                body: JSON.stringify({ title })
            }
        );

        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.error || "Unable to add subtask");
        }

        await applyFilters();

    } catch (error) {
        console.log("Error adding subtask:", error);
        alert("Unable to add subtask: " + error.message);
    }
}


// ==========================================
// COMPLETE / UNDO SUBTASK
// ==========================================

async function toggleSubtask(taskId, subtaskId, completed) {

    try {
        const response = await fetch(
            `/api/tasks/${encodeURIComponent(taskId)}/subtasks/${encodeURIComponent(subtaskId)}`,
            {
                method: "PUT",
                headers: {
                    "Content-Type": "application/json"
                },
                body: JSON.stringify({ completed })
            }
        );

        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.error || "Unable to update subtask");
        }

        await applyFilters();

    } catch (error) {
        console.log("Error updating subtask:", error);
        alert("Unable to update subtask: " + error.message);
    }
}


// ==========================================
// EDIT SUBTASK
// ==========================================

async function editSubtask(taskId, subtaskId, oldTitle) {

    const newTitle = prompt("Enter subtask name:", oldTitle);

    if (newTitle === null || newTitle.trim() === "") {
        return;
    }

    try {
        const response = await fetch(
            `/api/tasks/${encodeURIComponent(taskId)}/subtasks/${encodeURIComponent(subtaskId)}`,
            {
                method: "PUT",
                headers: {
                    "Content-Type": "application/json"
                },
                body: JSON.stringify({
                    title: newTitle.trim()
                })
            }
        );

        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.error || "Unable to edit subtask");
        }

        await applyFilters();

    } catch (error) {
        console.log("Error editing subtask:", error);
        alert("Unable to edit subtask: " + error.message);
    }
}


// ==========================================
// DELETE SUBTASK
// ==========================================

async function deleteSubtask(taskId, subtaskId) {

    if (!confirm("Are you sure you want to delete this subtask?")) {
        return;
    }

    try {
        const response = await fetch(
            `/api/tasks/${encodeURIComponent(taskId)}/subtasks/${encodeURIComponent(subtaskId)}`,
            {
                method: "DELETE"
            }
        );

        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.error || "Unable to delete subtask");
        }

        await applyFilters();

    } catch (error) {
        console.log("Error deleting subtask:", error);
        alert("Unable to delete subtask: " + error.message);
    }
}


// ==========================================
// COMPLETE / UNDO MAIN TASK
// ==========================================

async function completeTask(id, completed) {

    try {
        const response = await fetch(
            `/api/tasks/${encodeURIComponent(String(id))}`,
            {
                method: "PUT",
                headers: {
                    "Content-Type": "application/json"
                },
                body: JSON.stringify({ completed })
            }
        );

        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.error || "Unable to update task");
        }

        await applyFilters();

    } catch (error) {
        console.log("Error updating task:", error);
        alert("Unable to update task: " + error.message);
    }
}


// ==========================================
// EDIT MAIN TASK
// ==========================================

async function editTask(id) {

    try {

        const getResponse = await fetch("/api/tasks");

        if (!getResponse.ok) {
            throw new Error("Unable to get tasks");
        }

        const tasks = await getResponse.json();

        const task = tasks.find(
            t => String(t.id ?? t._id) === String(id)
        );

        if (!task) {
            alert("Task not found.");
            return;
        }

        const newTitle = prompt("Enter task title:", task.title);

        if (newTitle === null || newTitle.trim() === "") {
            return;
        }

        const newDescription = prompt(
            "Enter task description:",
            task.description || ""
        );

        if (newDescription === null) {
            return;
        }

        const newDueDate = prompt(
            "Enter due date (DD-MM-YYYY):",
            task.dueDate
                ? task.dueDate.split("-").reverse().join("-")
                : ""
        );

        if (newDueDate === null) {
            return;
        }

        const newPriority = prompt(
            "Enter priority (High, Medium, Low):",
            task.priority || "Medium"
        );

        if (newPriority === null) {
            return;
        }

        const newStatus = prompt(
            "Enter status (Pending or Completed):",
            task.completed ? "Completed" : "Pending"
        );

        if (newStatus === null) {
            return;
        }

        if (!["high", "medium", "low"].includes(
            newPriority.trim().toLowerCase()
        )) {
            alert("Please enter High, Medium, or Low.");
            return;
        }

        if (!["pending", "completed"].includes(
            newStatus.trim().toLowerCase()
        )) {
            alert("Please enter Pending or Completed.");
            return;
        }

        const response = await fetch(
            `/api/tasks/${encodeURIComponent(String(id))}`,
            {
                method: "PUT",
                headers: {
                    "Content-Type": "application/json"
                },
                body: JSON.stringify({
                    title: newTitle.trim(),
                    description: newDescription.trim(),
                    dueDate: newDueDate.trim().split("-").reverse().join("-"),
                    priority: newPriority.trim(),
                    completed:
                        newStatus.trim().toLowerCase() === "completed"
                })
            }
        );

        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.error || "Unable to edit task");
        }

        await applyFilters();

        alert("Task updated successfully!");

    } catch (error) {
        console.log("Error editing task:", error);
        alert("Unable to edit task: " + error.message);
    }
}


// ==========================================
// DELETE MAIN TASK
// ==========================================

async function deleteTask(id) {

    const confirmation =
        confirm("Are you sure you want to delete this task?");

    if (!confirmation) {
        return;
    }

    try {

        const response = await fetch(
            `/api/tasks/${encodeURIComponent(String(id))}`,
            {
                method: "DELETE"
            }
        );

        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.error || "Unable to delete task");
        }

        await applyFilters();

        alert("Task deleted successfully!");

    } catch (error) {
        console.log("Error deleting task:", error);
        alert("Unable to delete task: " + error.message);
    }
}


// ==========================================
// STATUS AND PRIORITY FILTERS
// ==========================================

let currentStatus = "all";
let currentPriority = "all";

function filterByStatus(status) {
    currentStatus = status;
    applyFilters();
}

function filterByPriority(priority) {
    currentPriority = priority;
    applyFilters();
}


// ==========================================
// APPLY FILTERS
// ==========================================

async function applyFilters() {

    try {

        const response = await fetch("/api/tasks");

        if (!response.ok) {
            throw new Error("Unable to get tasks");
        }

        const tasks = await response.json();

        let filteredTasks = tasks;

        if (currentStatus === "pending") {
            filteredTasks = filteredTasks.filter(
                task => !task.completed
            );
        }

        if (currentStatus === "completed") {
            filteredTasks = filteredTasks.filter(
                task => task.completed
            );
        }

        if (currentPriority !== "all") {

            filteredTasks = filteredTasks.filter(task => {

                const taskPriority =
                    String(task.priority || "Medium").trim().toLowerCase();

                return taskPriority ===
                    String(currentPriority).trim().toLowerCase();
            });
        }

        displayTasks(filteredTasks);

    } catch (error) {
        console.log("Error applying filters:", error);
    }
}


// ==========================================
// LOAD TASKS WHEN PAGE OPENS
// ==========================================

loadTasks();