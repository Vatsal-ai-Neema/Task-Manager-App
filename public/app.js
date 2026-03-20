const taskForm = document.getElementById("task-form");
const taskIdInput = document.getElementById("task-id");
const titleInput = document.getElementById("title");
const descriptionInput = document.getElementById("description");
const submitButton = document.getElementById("submit-button");
const cancelButton = document.getElementById("cancel-button");
const taskList = document.getElementById("task-list");
const taskSummary = document.getElementById("task-summary");
const formMessage = document.getElementById("form-message");
const errorBanner = document.getElementById("error-banner");
const filters = document.getElementById("filters");

let tasks = [];
let activeFilter = "all";
let isLoading = false;

function setFormMessage(message, isError = false) {
  formMessage.textContent = message;
  formMessage.style.color = isError ? "#b91c1c" : "#6b6258";
  formMessage.style.background = isError ? "#fee2e2" : "#f6efe5";
}

function setFormDisabled(disabled) {
  submitButton.disabled = disabled;
  cancelButton.disabled = disabled;
  titleInput.disabled = disabled;
  descriptionInput.disabled = disabled;
}

function clearFormMessage() {
  setFormMessage("Fill the form to create a new task.");
}

function showError(message) {
  errorBanner.textContent = message;
  errorBanner.classList.remove("hidden");
}

function hideError() {
  errorBanner.textContent = "";
  errorBanner.classList.add("hidden");
}

function formatDate(isoDate) {
  return new Date(isoDate).toLocaleString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function getFilteredTasks() {
  if (activeFilter === "all") {
    return tasks;
  }

  return tasks.filter((task) => task.status === activeFilter);
}

function resetForm() {
  taskForm.reset();
  taskIdInput.value = "";
  submitButton.textContent = "Add Task";
  cancelButton.classList.add("hidden");
  setFormDisabled(false);
  clearFormMessage();
}

function populateForm(task) {
  taskIdInput.value = task.id;
  titleInput.value = task.title;
  descriptionInput.value = task.description;
  submitButton.textContent = "Update Task";
  cancelButton.classList.remove("hidden");
  setFormMessage("Editing mode is active. Update the fields and save.");
  window.scrollTo({ top: 0, behavior: "smooth" });
}

function renderTasks() {
  if (isLoading) {
    taskList.innerHTML = `
      <div class="loading-state">
        Loading tasks...
      </div>
    `;
    return;
  }

  const filteredTasks = getFilteredTasks();
  const completedCount = tasks.filter((task) => task.status === "completed").length;
  taskSummary.textContent = `${tasks.length} total tasks, ${completedCount} completed`;

  if (!filteredTasks.length) {
    taskList.innerHTML = `
      <div class="empty-state">
        No tasks found for the current filter. Add one to get started.
      </div>
    `;
    return;
  }

  taskList.innerHTML = filteredTasks
    .map(
      (task) => `
        <article class="task-card ${task.status === "completed" ? "completed" : ""}">
          <div class="task-topline">
            <div>
              <h3 class="task-title">${escapeHtml(task.title)}</h3>
              <p class="task-meta">Created: ${formatDate(task.created_at)}</p>
            </div>
            <span class="status-badge ${
              task.status === "completed" ? "status-completed" : "status-pending"
            }">
              ${task.status}
            </span>
          </div>
          <p class="task-description">${escapeHtml(
            task.description || "No description provided."
          )}</p>
          <div class="task-card-actions">
            <button type="button" data-action="toggle" data-id="${task.id}">
              ${task.status === "completed" ? "Mark Pending" : "Mark Complete"}
            </button>
            <button type="button" class="secondary" data-action="edit" data-id="${task.id}">
              Edit
            </button>
            <button type="button" class="secondary" data-action="delete" data-id="${task.id}">
              Delete
            </button>
          </div>
        </article>
      `
    )
    .join("");
}

function escapeHtml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

async function request(url, options = {}) {
  const response = await fetch(url, {
    headers: { "Content-Type": "application/json" },
    ...options,
  });

  const contentType = response.headers.get("content-type") || "";
  const data = contentType.includes("application/json")
    ? await response.json()
    : await response.text();

  if (!response.ok) {
    const message =
      data?.errors?.join(", ") || data?.error || "Something went wrong.";
    throw new Error(message);
  }

  return data;
}

async function loadTasks() {
  try {
    isLoading = true;
    renderTasks();
    hideError();
    tasks = await request("/api/tasks");
    isLoading = false;
    renderTasks();
  } catch (error) {
    isLoading = false;
    showError(error.message);
    taskSummary.textContent = "Unable to load tasks";
  }
}

taskForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  const title = titleInput.value.trim();
  const description = descriptionInput.value.trim();

  if (!title) {
    setFormMessage("Title cannot be empty.", true);
    return;
  }

  if (!description) {
    setFormMessage("Description cannot be empty.", true);
    return;
  }

  const editingId = taskIdInput.value;
  const payload = { title, description };

  try {
    setFormDisabled(true);
    hideError();

    if (editingId) {
      const existingTask = tasks.find((task) => task.id === editingId);
      payload.status = existingTask?.status || "pending";
      await request(`/api/tasks/${editingId}`, {
        method: "PUT",
        body: JSON.stringify(payload),
      });
      setFormMessage("Task updated successfully.");
    } else {
      await request("/api/tasks", {
        method: "POST",
        body: JSON.stringify(payload),
      });
      setFormMessage("Task added successfully.");
    }

    resetForm();
    await loadTasks();
  } catch (error) {
    setFormMessage(error.message, true);
  } finally {
    setFormDisabled(false);
  }
});

cancelButton.addEventListener("click", resetForm);

filters.addEventListener("click", (event) => {
  const button = event.target.closest("[data-filter]");
  if (!button) {
    return;
  }

  activeFilter = button.dataset.filter;
  Array.from(filters.querySelectorAll(".filter-button")).forEach((item) => {
    item.classList.toggle("active", item === button);
  });
  clearFormMessage();
  renderTasks();
});

titleInput.addEventListener("input", clearFormMessage);
descriptionInput.addEventListener("input", clearFormMessage);

taskList.addEventListener("click", async (event) => {
  const button = event.target.closest("[data-action]");
  if (!button) {
    return;
  }

  const action = button.dataset.action;
  const task = tasks.find((item) => item.id === button.dataset.id);
  if (!task) {
    return;
  }

  try {
    hideError();

    if (action === "toggle") {
      await request(`/api/tasks/${task.id}`, {
        method: "PATCH",
        body: JSON.stringify({
          status: task.status === "completed" ? "pending" : "completed",
        }),
      });
      clearFormMessage();
      await loadTasks();
      return;
    }

    if (action === "edit") {
      populateForm(task);
      return;
    }

    if (action === "delete") {
      const confirmed = window.confirm(
        `Delete the task "${task.title}"? This action cannot be undone.`
      );
      if (!confirmed) {
        return;
      }

      await request(`/api/tasks/${task.id}`, { method: "DELETE" });
      clearFormMessage();
      await loadTasks();
    }
  } catch (error) {
    showError(error.message);
  }
});

resetForm();
loadTasks();
