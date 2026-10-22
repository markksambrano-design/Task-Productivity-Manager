const STORAGE_KEY = "taskflow.dashboard.tasks.v1";
const THEME_STORAGE_KEY = "taskflow.dashboard.theme.v1";
const THEME_QUERY = window.matchMedia("(prefers-color-scheme: dark)");
const STATUS_LABELS = {
  todo: "To Do",
  "in-progress": "In Progress",
  completed: "Completed",
};
const STATUS_DESCRIPTIONS = {
  todo: "Hindi pa nasisimulan ang task.",
  "in-progress": "Kasalukuyang ginagawa ang task.",
  completed: "Tapos na ang task.",
};
const PRIORITY_LABELS = {
  high: "High",
  medium: "Medium",
  low: "Low",
};
const DAY_MS = 24 * 60 * 60 * 1000;

const elements = {
  total: document.querySelector("#total-count"),
  pending: document.querySelector("#pending-count"),
  inProgress: document.querySelector("#in-progress-count"),
  completed: document.querySelector("#completed-count"),
  completionRate: document.querySelector("#completion-rate"),
  dailyDue: document.querySelector("#daily-due-count"),
  dailyCompleted: document.querySelector("#daily-completed-count"),
  weeklyDue: document.querySelector("#weekly-due-count"),
  weeklyCompleted: document.querySelector("#weekly-completed-count"),
  completionChart: document.querySelector("#completion-chart"),
  chartWeeklyTotal: document.querySelector("#chart-weekly-total"),
  priorityChart: document.querySelector("#priority-chart"),
  statusDonut: document.querySelector("#status-donut"),
  donutRate: document.querySelector("#donut-completion-rate"),
  donutTodo: document.querySelector("#donut-todo-count"),
  donutProgress: document.querySelector("#donut-progress-count"),
  donutCompleted: document.querySelector("#donut-completed-count"),
  activityCount: document.querySelector("#activity-count"),
  recentActivity: document.querySelector("#recent-activity"),
  recentCount: document.querySelector("#recent-count"),
  recentTasks: document.querySelector("#recent-tasks"),
  recentTaskPagination: document.querySelector("#recent-task-pagination"),
  recentTaskPrevious: document.querySelector("#recent-task-previous"),
  recentTaskPage: document.querySelector("#recent-task-page"),
  recentTaskNext: document.querySelector("#recent-task-next"),
  upcomingTasks: document.querySelector("#upcoming-tasks"),
  overdue: document.querySelector("#overdue-count"),
  greeting: document.querySelector("#greeting"),
  dialog: document.querySelector("#task-dialog"),
  form: document.querySelector("#task-form"),
  title: document.querySelector("#task-title"),
  description: document.querySelector("#task-description"),
  status: document.querySelector("#task-status"),
  priority: document.querySelector("#task-priority"),
  dueDate: document.querySelector("#task-due-date"),
  category: document.querySelector("#task-category"),
  tags: document.querySelector("#task-tags"),
  saveTaskButton: document.querySelector("#save-task-button"),
  detailsDialog: document.querySelector("#task-details-dialog"),
  detailsTitle: document.querySelector("#details-title"),
  detailsDescription: document.querySelector("#details-description"),
  detailsCategory: document.querySelector("#details-category"),
  detailsTags: document.querySelector("#details-tags"),
  detailsStatusDescription: document.querySelector("#details-status-description"),
  detailsStatus: document.querySelector("#details-status"),
  detailsPriority: document.querySelector("#details-priority"),
  detailsDueDate: document.querySelector("#details-due-date"),
  detailsCreatedDate: document.querySelector("#details-created-date"),
  detailsUpdatedDate: document.querySelector("#details-updated-date"),
  deleteDialog: document.querySelector("#delete-confirm-dialog"),
  deleteTaskName: document.querySelector("#delete-confirm-task-name"),
  toast: document.querySelector("#toast"),
};

let toastTimer;
let editingTaskId = null;
let activeDetailsTaskId = null;
let recentTasksPage = 0;
const RECENT_TASKS_PAGE_SIZE = 5;

function loadTasks() {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved === null) return [];
    const tasks = JSON.parse(saved);
    if (!Array.isArray(tasks) || tasks.some((task) =>
      !task || typeof task.id !== "string" || typeof task.title !== "string" ||
      !["todo", "in-progress", "completed"].includes(task.status) ||
      (task.priority != null && !["high", "medium", "low"].includes(task.priority)) ||
      typeof task.createdAt !== "string" ||
      (task.dueDate != null && typeof task.dueDate !== "string") ||
      (task.startDate != null && typeof task.startDate !== "string") ||
      (task.assignee != null && typeof task.assignee !== "string") ||
      (task.description != null && typeof task.description !== "string") ||
      (task.updatedAt != null && typeof task.updatedAt !== "string") ||
      (task.completedAt != null && typeof task.completedAt !== "string") ||
      (task.category != null && (typeof task.category !== "string" || task.category.length > 40)) ||
      (task.tags != null && (!Array.isArray(task.tags) || task.tags.length > 20 ||
        task.tags.some((tag) => typeof tag !== "string" || !tag.trim() || tag.length > 30)))
    )) {
      throw new Error("Saved task data has an invalid format.");
    }
    return tasks.map((task) => {
      return {
        ...task,
        description: task.description || "",
        priority: task.priority || "medium",
        category: task.category || "",
        tags: task.tags || [],
        dueDate: task.dueDate || null,
        updatedAt: task.updatedAt || task.createdAt,
        completedAt: task.completedAt || null,
      };
    });
  } catch (error) {
    console.error("Unable to load saved tasks.", error);
    showToast("Couldn't load saved tasks. Check your browser storage.");
    return [];
  }
}

let tasks = loadTasks();

function saveTasks() {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(tasks));
    return true;
  } catch (error) {
    console.error("Unable to save tasks.", error);
    showToast("Couldn't save changes. Check your browser storage.");
    return false;
  }
}

function localDateKey(date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function getCompletedDateKey(task) {
  if (task.status !== "completed" || !task.completedAt) return null;
  const date = new Date(task.completedAt);
  return Number.isNaN(date.getTime()) ? null : localDateKey(date);
}

function parseLocalDate(value) {
  const [year, month, day] = value.split("-").map(Number);
  return new Date(year, month - 1, day);
}

function formatDate(value, options = { month: "short", day: "numeric" }) {
  if (!value) return "";
  return parseLocalDate(value).toLocaleDateString(undefined, options);
}

function getDeadlineState(task, today = new Date()) {
  if (!task.dueDate || task.status === "completed") return null;
  const todayKey = localDateKey(today);
  if (task.dueDate < todayKey) return { kind: "overdue", label: "Overdue" };
  if (task.dueDate === todayKey) return { kind: "due-today", label: "Due today" };

  const daysUntilDue = (Date.parse(`${task.dueDate}T00:00:00Z`) - Date.parse(`${todayKey}T00:00:00Z`)) / DAY_MS;
  if (Number.isInteger(daysUntilDue) && daysUntilDue <= 7) {
    return {
      kind: "upcoming",
      label: `Due in ${daysUntilDue} ${daysUntilDue === 1 ? "day" : "days"}`,
    };
  }
  return null;
}

function createPriorityBadge(priority) {
  const badge = document.createElement("span");
  badge.className = `priority-badge priority-${priority}`;
  badge.textContent = PRIORITY_LABELS[priority];
  return badge;
}

function createTagBadge(tag) {
  const hash = [...tag].reduce((value, character) => (value * 31 + character.charCodeAt(0)) >>> 0, 0);
  const badge = document.createElement("span");
  badge.className = `task-tag-badge task-tag-color-${hash % 6}`;
  badge.textContent = tag;
  return badge;
}

function getTaskCategoryIcon(category) {
  const icons = {
    Work: '<svg viewBox="0 0 24 24" fill="none" aria-hidden="true"><rect x="3" y="7" width="18" height="13" rx="2" stroke="currentColor" stroke-width="1.8"/><path d="M8 7V5a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2M3 12h18m-11 0v2h4v-2" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/></svg>',
    Study: '<svg viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="M12 7c-2.2-2-5.2-2.4-9-1.3v13c3.8-1.1 6.8-.7 9 1.3m0-13c2.2-2 5.2-2.4 9-1.3v13c-3.8-1.1-6.8-.7-9 1.3m0-13v13" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/></svg>',
    Personal: '<svg viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="M3 4h2l2.2 11.2a2 2 0 0 0 2 1.6h8.5a2 2 0 0 0 1.9-1.5L21 9H6" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/><circle cx="10" cy="20" r="1" fill="currentColor"/><circle cx="18" cy="20" r="1" fill="currentColor"/></svg>',
    Projects: '<svg viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="M3 7a2 2 0 0 1 2-2h5l2 2h7a2 2 0 0 1 2 2v9a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V7Z" stroke="currentColor" stroke-width="1.8" stroke-linejoin="round"/><path d="M3.5 10h17" stroke="currentColor" stroke-width="1.8"/></svg>',
  };
  return icons[category] || icons.Projects;
}

function createDeadlineIndicator(state) {
  if (!state) return null;
  const indicator = document.createElement("span");
  indicator.className = `deadline-indicator deadline-${state.kind}`;
  indicator.textContent = state.label;
  return indicator;
}

function showToast(message) {
  elements.toast.textContent = message;
  elements.toast.classList.add("visible");
  window.clearTimeout(toastTimer);
  toastTimer = window.setTimeout(() => elements.toast.classList.remove("visible"), 3200);
}

function makeEmptyState(title, subtitle) {
  const container = document.createElement("div");
  container.className = "empty-state";
  const icon = document.createElement("span");
  icon.className = "empty-icon";
  icon.innerHTML = '<svg viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="M7 4.5h10a2 2 0 0 1 2 2v13l-2.5-1.7-2.5 1.7-2.5-1.7-2.5 1.7L7 17.8V4.5Z" stroke="currentColor" stroke-width="1.7" stroke-linejoin="round"/><path d="M10 9h6M10 13h6" stroke="currentColor" stroke-width="1.7" stroke-linecap="round"/></svg>';
  const heading = document.createElement("strong");
  heading.textContent = title;
  const detail = document.createElement("span");
  detail.textContent = subtitle;
  container.append(icon, heading, detail);
  return container;
}

function renderRecentTasks() {
  const recentTasks = [...tasks].sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  elements.recentCount.textContent = String(recentTasks.length);
  elements.recentTasks.replaceChildren();
  const pageCount = Math.ceil(recentTasks.length / RECENT_TASKS_PAGE_SIZE);
  recentTasksPage = Math.min(recentTasksPage, Math.max(pageCount - 1, 0));
  elements.recentTaskPagination.hidden = pageCount <= 1;
  elements.recentTaskPrevious.disabled = recentTasksPage === 0;
  elements.recentTaskNext.disabled = recentTasksPage >= pageCount - 1;
  elements.recentTaskPage.textContent = pageCount > 0
    ? `Page ${recentTasksPage + 1} of ${pageCount}`
    : "";

  if (recentTasks.length === 0) {
    elements.recentTasks.append(makeEmptyState("No tasks yet", "Add your first task from the Tasks page."));
    return;
  }

  const pageTasks = recentTasks.slice(
    recentTasksPage * RECENT_TASKS_PAGE_SIZE,
    (recentTasksPage + 1) * RECENT_TASKS_PAGE_SIZE,
  );
  for (const task of pageTasks) {
    const row = document.createElement("div");
    row.className = "dashboard-task-row";
    const icon = document.createElement("span");
    icon.className = `dashboard-task-icon task-icon-${(task.category || "Projects").toLowerCase()}`;
    icon.setAttribute("aria-hidden", "true");
    icon.innerHTML = getTaskCategoryIcon(task.category);
    const copy = document.createElement("div");
    copy.className = "dashboard-task-copy";
    const name = document.createElement("span");
    name.className = "dashboard-task-title";
    name.textContent = task.title;
    name.title = task.title;
    copy.append(name);
    if (task.category || task.tags.length) {
      const labels = document.createElement("div");
      labels.className = "task-tag-list dashboard-task-labels";
      if (task.category) {
        const category = document.createElement("span");
        category.className = "task-category-badge";
        category.textContent = task.category;
        labels.append(category);
      }
      for (const tag of task.tags) {
        labels.append(createTagBadge(tag));
      }
      copy.append(labels);
    }
    if (task.description) {
      const description = document.createElement("p");
      description.className = "dashboard-task-description";
      description.textContent = task.description;
      copy.append(description);
    }
    if (task.dueDate) {
      const dueDate = document.createElement("span");
      dueDate.className = "dashboard-task-due-date";
      const calendarIcon = document.createElementNS("http://www.w3.org/2000/svg", "svg");
      calendarIcon.setAttribute("viewBox", "0 0 24 24");
      calendarIcon.setAttribute("fill", "none");
      calendarIcon.setAttribute("aria-hidden", "true");
      calendarIcon.innerHTML = '<rect x="4" y="5" width="16" height="16" rx="2" stroke="currentColor" stroke-width="1.8"/><path d="M8 3v4m8-4v4M4 10h16" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/>';
      const dueDateLabel = document.createElement("span");
      dueDateLabel.textContent = `Due ${formatDate(task.dueDate)}`;
      dueDate.append(calendarIcon, dueDateLabel);
      copy.append(dueDate);
    }
    const detailsButton = document.createElement("button");
    detailsButton.className = "dashboard-task-open";
    detailsButton.type = "button";
    detailsButton.setAttribute("aria-label", `View task: ${task.title}`);
    detailsButton.innerHTML = '<svg viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="m9 18 6-6-6-6" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>';
    detailsButton.addEventListener("click", () => showTaskDetails(task.id));
    row.append(icon, copy, detailsButton);
    elements.recentTasks.append(row);
  }
}

elements.recentTaskPrevious.addEventListener("click", () => {
  if (recentTasksPage === 0) return;
  recentTasksPage -= 1;
  renderRecentTasks();
});
elements.recentTaskNext.addEventListener("click", () => {
  const pageCount = Math.ceil(tasks.length / RECENT_TASKS_PAGE_SIZE);
  if (recentTasksPage >= pageCount - 1) return;
  recentTasksPage += 1;
  renderRecentTasks();
});

function formatTimestamp(value) {
  return new Date(value).toLocaleString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

function showTaskDetails(taskId) {
  const task = tasks.find((item) => item.id === taskId);
  if (!task) {
    showToast("This task is no longer available.");
    return;
  }

  activeDetailsTaskId = task.id;
  elements.detailsTitle.textContent = task.title;
  elements.detailsDescription.textContent = task.description || "No description provided.";
  elements.detailsCategory.replaceChildren();
  if (task.category) {
    const category = document.createElement("span");
    category.className = "task-category-badge";
    category.textContent = task.category;
    elements.detailsCategory.append(category);
  } else {
    elements.detailsCategory.textContent = "Uncategorized";
  }
  elements.detailsTags.replaceChildren();
  if (task.tags.length) {
    const tags = document.createElement("div");
    tags.className = "task-tag-list";
    for (const tag of task.tags) {
      tags.append(createTagBadge(tag));
    }
    elements.detailsTags.append(tags);
  } else {
    elements.detailsTags.textContent = "—";
  }
  elements.detailsStatus.textContent = STATUS_LABELS[task.status];
  elements.detailsStatus.className = `task-status-badge status-${task.status}`;
  elements.detailsStatusDescription.textContent = STATUS_DESCRIPTIONS[task.status];
  elements.detailsPriority.className = `priority-badge priority-${task.priority}`;
  elements.detailsPriority.textContent = PRIORITY_LABELS[task.priority];
  elements.detailsDueDate.replaceChildren(
    document.createTextNode(task.dueDate ? formatDate(task.dueDate, { month: "long", day: "numeric", year: "numeric" }) : "No due date"),
  );
  const deadlineIndicator = createDeadlineIndicator(getDeadlineState(task));
  if (deadlineIndicator) elements.detailsDueDate.append(deadlineIndicator);
  elements.detailsCreatedDate.textContent = formatTimestamp(task.createdAt);
  elements.detailsUpdatedDate.textContent = formatTimestamp(task.updatedAt || task.createdAt);
  elements.detailsDialog.showModal();
}

function openTaskEditor(taskId = null) {
  const task = taskId ? tasks.find((item) => item.id === taskId) : null;
  if (taskId && !task) {
    showToast("This task is no longer available.");
    return;
  }

  editingTaskId = task?.id || null;
  elements.form.reset();
  elements.title.value = task?.title || "";
  elements.description.value = task?.description || "";
  elements.status.value = task?.status || "todo";
  elements.priority.value = task?.priority || "medium";
  elements.dueDate.value = task?.dueDate || "";
  elements.category.value = task?.category || "";
  elements.tags.value = (task?.tags || []).join(", ");
  document.querySelector("#dialog-title").textContent = task ? "Edit task" : "Create a task";
  elements.saveTaskButton.textContent = task ? "Save changes" : "Add task";
  if (elements.detailsDialog.open) elements.detailsDialog.close();
  elements.dialog.showModal();
  elements.title.focus();
}

async function confirmDeleteTask(task) {
  elements.deleteTaskName.textContent = task.title;
  elements.deleteDialog.showModal();
  return new Promise((resolve) => {
    elements.deleteDialog.addEventListener("close", () => {
      resolve(elements.deleteDialog.returnValue === "delete");
    }, { once: true });
  });
}

async function deleteTask(taskId) {
  const task = tasks.find((item) => item.id === taskId);
  const taskIndex = tasks.findIndex((item) => item.id === taskId);
  if (taskIndex < 0) {
    showToast("This task is no longer available.");
    return;
  }
  if (!await confirmDeleteTask(task)) return;

  const confirmedTaskIndex = tasks.findIndex((item) => item.id === taskId);
  if (confirmedTaskIndex < 0) {
    showToast("This task is no longer available.");
    return;
  }
  const [removedTask] = tasks.splice(confirmedTaskIndex, 1);
  if (!saveTasks()) {
    tasks.splice(confirmedTaskIndex, 0, removedTask);
    return;
  }

  if (elements.detailsDialog.open) elements.detailsDialog.close();
  activeDetailsTaskId = null;
  renderDashboard();
  showToast("Task deleted.");
}

function renderUpcomingTasks(today) {
  const todayKey = localDateKey(today);
  const lastUpcomingDay = localDateKey(new Date(today.getFullYear(), today.getMonth(), today.getDate() + 7));
  const upcoming = tasks
    .filter((task) => {
      const deadlineState = getDeadlineState(task, today);
      return deadlineState && deadlineState.kind !== "overdue" && task.dueDate <= lastUpcomingDay;
    })
    .sort((a, b) => a.dueDate.localeCompare(b.dueDate))
    .slice(0, 4);
  elements.upcomingTasks.replaceChildren();

  if (upcoming.length === 0) {
    const empty = document.createElement("div");
    empty.className = "deadline-empty";
    empty.textContent = "No upcoming deadlines. You're all caught up!";
    elements.upcomingTasks.append(empty);
    return;
  }

  for (const task of upcoming) {
    const row = document.createElement("div");
    row.className = "deadline-row";
    const title = document.createElement("span");
    title.className = "deadline-task";
    title.textContent = task.title;
    title.title = task.title;
    const meta = document.createElement("div");
    meta.className = "deadline-meta";
    meta.append(createPriorityBadge(task.priority));
    const deadlineIndicator = createDeadlineIndicator(getDeadlineState(task, today));
    if (deadlineIndicator) meta.append(deadlineIndicator);
    const date = document.createElement("span");
    date.className = "deadline-date";
    date.textContent = formatDate(task.dueDate, { month: "short", day: "numeric" });
    meta.append(date);
    row.append(title, meta);
    elements.upcomingTasks.append(row);
  }
}

function renderDashboard() {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const todayKey = localDateKey(today);
  const weekStart = new Date(today);
  weekStart.setDate(today.getDate() - 6);
  const weekStartKey = localDateKey(weekStart);
  const nextWeekEndKey = localDateKey(new Date(today.getFullYear(), today.getMonth(), today.getDate() + 6));
  const count = tasks.length;
  const completed = tasks.filter((task) => task.status === "completed").length;
  const todo = tasks.filter((task) => task.status === "todo").length;
  const inProgress = tasks.filter((task) => task.status === "in-progress").length;
  const overdue = tasks.filter((task) => getDeadlineState(task, today)?.kind === "overdue").length;
  const rate = count === 0 ? 0 : Math.round((completed / count) * 100);
  const completedBetween = (start, end) => tasks.filter((task) => {
    const completedDate = getCompletedDateKey(task);
    return completedDate && completedDate >= start && completedDate <= end;
  }).length;
  const dueToday = tasks.filter((task) => task.status !== "completed" && task.dueDate === todayKey).length;
  const dueThisWeek = tasks.filter((task) =>
    task.status !== "completed" && task.dueDate && task.dueDate >= todayKey && task.dueDate <= nextWeekEndKey
  ).length;

  elements.total.textContent = `${count} total ${count === 1 ? "task" : "tasks"}`;
  elements.pending.textContent = String(count - completed);
  elements.inProgress.textContent = String(inProgress);
  elements.completed.textContent = String(completed);
  elements.completionRate.textContent = `${rate}%`;
  elements.overdue.textContent = String(overdue);
  elements.dailyDue.textContent = String(dueToday);
  elements.dailyCompleted.textContent = String(completedBetween(todayKey, todayKey));
  elements.weeklyDue.textContent = String(dueThisWeek);
  elements.weeklyCompleted.textContent = String(completedBetween(weekStartKey, todayKey));
  renderProductivityAnalytics({ weekStart, rate, todo, inProgress, completed });
  renderRecentTasks();
  renderUpcomingTasks(today);
}

function createSvgElement(tagName, attributes = {}) {
  const element = document.createElementNS("http://www.w3.org/2000/svg", tagName);
  for (const [name, value] of Object.entries(attributes)) {
    element.setAttribute(name, String(value));
  }
  return element;
}

function renderCompletionChart(weekStart) {
  const chartDays = Array.from({ length: 7 }, (_, index) => {
    const day = new Date(weekStart);
    day.setDate(weekStart.getDate() + index);
    return day;
  });
  const chartCounts = chartDays.map((day) => {
    const dateKey = localDateKey(day);
    return tasks.filter((task) => getCompletedDateKey(task) === dateKey).length;
  });
  const maxCount = Math.max(...chartCounts);
  const chartScale = Math.max(4, Math.ceil(maxCount / 4) * 4);
  const chartTotal = chartCounts.reduce((sum, count) => sum + count, 0);
  elements.chartWeeklyTotal.textContent = `${chartTotal} ${chartTotal === 1 ? "completion" : "completions"}`;
  elements.completionChart.setAttribute(
    "aria-label",
    `Daily completed task chart for the last 7 days: ${chartCounts.join(", ")} completions, oldest to newest.`,
  );
  elements.completionChart.replaceChildren();
  const chartLeft = 48;
  const chartRight = 588;
  const chartTop = 15;
  const chartBottom = 196;
  const xFor = (index) => chartLeft + (chartRight - chartLeft) * index / 6;
  const yFor = (value) => chartBottom - (value / chartScale) * (chartBottom - chartTop);

  for (let tick = 0; tick <= 4; tick += 1) {
    const value = Math.round((chartScale / 4) * tick);
    const y = yFor(value);
    elements.completionChart.append(
      createSvgElement("line", { x1: chartLeft, y1: y, x2: chartRight, y2: y, class: "chart-grid-line" }),
    );
    const tickLabel = createSvgElement("text", { x: chartLeft - 10, y: y + 3, class: "chart-axis-label", "text-anchor": "end" });
    tickLabel.textContent = String(value);
    elements.completionChart.append(tickLabel);
  }

  const points = chartCounts.map((count, index) => [xFor(index), yFor(count)]);
  const pathSegments = points.map(([x, y], index) => {
    if (index === 0) return `M ${x} ${y}`;
    const [previousX, previousY] = points[index - 1];
    const middleX = (previousX + x) / 2;
    return `Q ${middleX} ${previousY} ${x} ${y}`;
  });
  const linePath = pathSegments.join(" ");
  const areaPath = `${linePath} L ${chartRight} ${chartBottom} L ${chartLeft} ${chartBottom} Z`;
  elements.completionChart.append(createSvgElement("path", { d: areaPath, class: "chart-area" }));
  elements.completionChart.append(createSvgElement("path", { d: linePath, class: "chart-line" }));

  points.forEach(([x, y], index) => {
    elements.completionChart.append(
      createSvgElement("circle", { cx: x, cy: y, r: 4, class: "chart-point" }),
    );
    const dayLabel = createSvgElement("text", {
      x,
      y: 220,
      class: "chart-axis-label chart-day-label",
      "text-anchor": "middle",
    });
    dayLabel.textContent = chartDays[index].toLocaleDateString(undefined, { weekday: "short" });
    elements.completionChart.append(dayLabel);
  });
}

function renderPriorityChart() {
  const priorities = [
    { key: "high", label: "High", color: "high" },
    { key: "medium", label: "Medium", color: "medium" },
    { key: "low", label: "Low", color: "low" },
  ];
  const counts = priorities.map((priority) =>
    tasks.filter((task) => (task.priority || "medium") === priority.key).length
  );
  const maxCount = Math.max(...counts, 1);
  elements.priorityChart.replaceChildren();
  elements.priorityChart.setAttribute(
    "aria-label",
    `Tasks by priority: ${priorities.map((priority, index) => `${priority.label} ${counts[index]}`).join(", ")}.`,
  );
  priorities.forEach((priority, index) => {
    const column = document.createElement("div");
    column.className = "priority-chart-column";
    const value = document.createElement("span");
    value.className = "priority-chart-value";
    value.textContent = String(counts[index]);
    const track = document.createElement("div");
    track.className = "priority-chart-track";
    const bar = document.createElement("div");
    bar.className = `priority-chart-bar priority-bar-${priority.color}`;
    bar.style.height = `${counts[index] === 0 ? 0 : Math.max((counts[index] / maxCount) * 100, 7)}%`;
    bar.setAttribute("aria-hidden", "true");
    track.append(bar);
    const label = document.createElement("span");
    label.className = "priority-chart-label";
    label.textContent = priority.label;
    column.append(value, track, label);
    elements.priorityChart.append(column);
  });
}

function renderStatusDonut({ todo, inProgress, completed, rate }) {
  const total = todo + inProgress + completed;
  const todoEnd = total ? (todo / total) * 360 : 0;
  const progressEnd = total ? ((todo + inProgress) / total) * 360 : 0;
  elements.statusDonut.style.background = total
    ? `conic-gradient(#4d96ed 0deg ${todoEnd}deg, #6550bd ${todoEnd}deg ${progressEnd}deg, #35aa80 ${progressEnd}deg 360deg)`
    : "conic-gradient(#e9e8ef 0deg 360deg)";
  elements.statusDonut.setAttribute(
    "aria-label",
    `Task distribution: ${todo} to do, ${inProgress} in progress, ${completed} completed.`,
  );
  elements.donutRate.textContent = `${rate}%`;
  elements.donutTodo.textContent = String(todo);
  elements.donutProgress.textContent = String(inProgress);
  elements.donutCompleted.textContent = String(completed);
}

function formatRelativeTime(value, now = new Date()) {
  const timestamp = new Date(value);
  if (Number.isNaN(timestamp.getTime())) return "Date unavailable";
  const elapsedMinutes = Math.max(0, Math.floor((now - timestamp) / 60000));
  if (elapsedMinutes < 1) return "Just now";
  if (elapsedMinutes < 60) return `${elapsedMinutes} ${elapsedMinutes === 1 ? "minute" : "minutes"} ago`;
  const elapsedHours = Math.floor(elapsedMinutes / 60);
  if (elapsedHours < 24) return `${elapsedHours} ${elapsedHours === 1 ? "hour" : "hours"} ago`;
  const elapsedDays = Math.floor(elapsedHours / 24);
  if (elapsedDays < 7) return `${elapsedDays} ${elapsedDays === 1 ? "day" : "days"} ago`;
  return timestamp.toLocaleDateString(undefined, { month: "short", day: "numeric" });
}

function getLatestTaskActivity(task) {
  const created = new Date(task.createdAt);
  if (Number.isNaN(created.getTime())) return null;
  const updated = new Date(task.updatedAt || task.createdAt);
  const completedAt = task.completedAt ? new Date(task.completedAt) : null;
  const validCompleted = completedAt && !Number.isNaN(completedAt.getTime()) ? completedAt : null;
  const validUpdated = !Number.isNaN(updated.getTime()) ? updated : created;
  const latest = validCompleted && validCompleted >= validUpdated ? validCompleted : validUpdated;
  if (latest <= created) return { date: created, label: "Added", title: task.title };
  if (task.status === "completed" && validCompleted && latest.getTime() === validCompleted.getTime()) {
    return { date: latest, label: "Completed", title: task.title };
  }
  if (task.status === "in-progress") return { date: latest, label: "Started", title: task.title };
  return { date: latest, label: "Updated", title: task.title };
}

function renderRecentActivity() {
  const activity = tasks
    .map(getLatestTaskActivity)
    .filter(Boolean)
    .sort((first, second) => second.date - first.date)
    .slice(0, 5);
  elements.activityCount.textContent = String(activity.length);
  elements.recentActivity.replaceChildren();
  if (activity.length === 0) {
    const empty = document.createElement("div");
    empty.className = "activity-empty";
    empty.textContent = "Your task updates will appear here.";
    elements.recentActivity.append(empty);
    return;
  }
  activity.forEach((entry) => {
    const row = document.createElement("div");
    row.className = `activity-row activity-${entry.label.toLowerCase()}`;
    const marker = document.createElement("span");
    marker.className = "activity-marker";
    marker.setAttribute("aria-hidden", "true");
    const copy = document.createElement("div");
    copy.className = "activity-copy";
    const title = document.createElement("p");
    title.textContent = `${entry.label} "${entry.title}"`;
    title.title = title.textContent;
    const time = document.createElement("span");
    time.textContent = formatRelativeTime(entry.date);
    copy.append(title, time);
    row.append(marker, copy);
    elements.recentActivity.append(row);
  });
}

function renderProductivityAnalytics({ weekStart, rate, todo, inProgress, completed }) {
  renderCompletionChart(weekStart);
  renderPriorityChart();
  renderStatusDonut({ todo, inProgress, completed, rate });
  renderRecentActivity();
}

function applyTheme(theme) {
  document.documentElement.dataset.theme = theme;
  for (const frame of [document.querySelector(".header-frame"), sidebarFrame]) {
    const frameRoot = frame.contentDocument?.documentElement;
    if (frameRoot) frameRoot.dataset.theme = theme;
  }
}

function loadTheme() {
  try {
    const savedTheme = localStorage.getItem(THEME_STORAGE_KEY);
    if (savedTheme === "system") return THEME_QUERY.matches ? "dark" : "light";
    return savedTheme === "dark" ? "dark" : "light";
  } catch (error) {
    console.error("Unable to load saved theme.", error);
    showToast("Couldn't load your saved theme preference.");
    return "light";
  }
}

const sidebarFrame = document.querySelector(".sidebar-frame");
const updateSidebarLayout = () => {
  const sidebarDocument = sidebarFrame.contentDocument;
  if (sidebarDocument?.body) {
    sidebarDocument.body.classList.toggle("compact-sidebar", window.innerWidth <= 760);
  }
};
sidebarFrame.addEventListener("load", updateSidebarLayout);
sidebarFrame.addEventListener("load", () => applyTheme(document.documentElement.dataset.theme || "light"));
document.querySelector(".header-frame").addEventListener("load", () => applyTheme(document.documentElement.dataset.theme || "light"));
window.addEventListener("resize", updateSidebarLayout);
new ResizeObserver(updateSidebarLayout).observe(sidebarFrame);
updateSidebarLayout();

document.querySelector("#close-task-dialog").addEventListener("click", () => elements.dialog.close());
document.querySelector("#cancel-task").addEventListener("click", () => elements.dialog.close());
document.querySelector("#close-details-dialog").addEventListener("click", () => elements.detailsDialog.close());
document.querySelector("#edit-detail-task").addEventListener("click", () => {
  if (activeDetailsTaskId) openTaskEditor(activeDetailsTaskId);
});
document.querySelector("#delete-detail-task").addEventListener("click", () => {
  if (activeDetailsTaskId) deleteTask(activeDetailsTaskId);
});
elements.dialog.addEventListener("click", (event) => {
  if (event.target === elements.dialog) elements.dialog.close();
});
elements.dialog.addEventListener("close", () => {
  editingTaskId = null;
});
elements.detailsDialog.addEventListener("close", () => {
  activeDetailsTaskId = null;
});
window.addEventListener("storage", (event) => {
  if (event.key === STORAGE_KEY) {
    tasks = loadTasks();
    renderDashboard();
  } else if (event.key === THEME_STORAGE_KEY) {
    applyTheme(event.newValue === "system"
      ? (THEME_QUERY.matches ? "dark" : "light")
      : event.newValue === "dark" ? "dark" : "light");
  }
});
THEME_QUERY.addEventListener("change", () => {
  if (localStorage.getItem(THEME_STORAGE_KEY) === "system") applyTheme(THEME_QUERY.matches ? "dark" : "light");
});

elements.form.addEventListener("submit", (event) => {
  event.preventDefault();
  const title = elements.title.value.trim();
  if (!title) {
    elements.title.focus();
    return;
  }
  const tags = [...new Set(elements.tags.value.split(",").map((tag) => tag.trim()).filter(Boolean))];
  if (tags.length > 20 || tags.some((tag) => tag.length > 30)) {
    showToast("Use up to 20 tags, with a maximum of 30 characters each.");
    elements.tags.focus();
    return;
  }
  const previousTask = editingTaskId ? tasks.find((item) => item.id === editingTaskId) : null;
  if (editingTaskId && !previousTask) {
    elements.dialog.close();
    showToast("This task is no longer available.");
    return;
  }
  const previousValues = previousTask ? { ...previousTask } : null;
  const now = new Date().toISOString();
  const task = previousTask || {
    id: crypto.randomUUID(),
    status: "todo",
    createdAt: now,
  };
  task.title = title;
  task.description = elements.description.value.trim();
  task.status = elements.status.value;
  task.priority = elements.priority.value;
  task.dueDate = elements.dueDate.value || null;
  task.category = elements.category.value;
  task.tags = tags;
  task.updatedAt = now;
  task.completedAt = task.status === "completed"
    ? (previousValues?.status === "completed" ? previousValues.completedAt : now)
    : null;
  if (!previousTask) tasks.unshift(task);
  if (saveTasks()) {
    elements.dialog.close();
    renderDashboard();
    showToast(previousTask ? "Task changes saved." : "Task added to your list.");
  } else {
    if (previousTask && previousValues) Object.assign(previousTask, previousValues);
    else tasks = tasks.filter((item) => item.id !== task.id);
  }
});

elements.greeting.textContent = `${new Date().getHours() < 12 ? "GOOD MORNING" : new Date().getHours() < 18 ? "GOOD AFTERNOON" : "GOOD EVENING"} — YOUR OVERVIEW`;
applyTheme(loadTheme());
renderDashboard();
