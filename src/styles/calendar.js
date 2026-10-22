const STORAGE_KEY = "taskflow.dashboard.tasks.v1";
const THEME_STORAGE_KEY = "taskflow.dashboard.theme.v1";
const THEME_QUERY = window.matchMedia("(prefers-color-scheme: dark)");
const STATUS_LABELS = {
  todo: "To Do",
  "in-progress": "In Progress",
  completed: "Completed",
};
const PRIORITY_LABELS = {
  high: "High",
  medium: "Medium",
  low: "Low",
};

const elements = {
  monthTitle: document.querySelector("#calendar-month-title"),
  monthSummary: document.querySelector("#calendar-month-summary"),
  weekdays: document.querySelector("#calendar-weekdays"),
  grid: document.querySelector("#calendar-grid"),
  previous: document.querySelector("#calendar-previous"),
  next: document.querySelector("#calendar-next"),
  today: document.querySelector("#calendar-today"),
  detailsDialog: document.querySelector("#calendar-task-details"),
  detailsTitle: document.querySelector("#calendar-details-title"),
  detailsDescription: document.querySelector("#calendar-details-description"),
  detailsStatus: document.querySelector("#calendar-details-status"),
  detailsPriority: document.querySelector("#calendar-details-priority"),
  detailsAssignee: document.querySelector("#calendar-details-assignee"),
  detailsStartDate: document.querySelector("#calendar-details-start-date"),
  detailsDueDate: document.querySelector("#calendar-details-due-date"),
  detailsCreatedDate: document.querySelector("#calendar-details-created-date"),
  toast: document.querySelector("#calendar-toast"),
};

let tasks = [];
let displayedMonth = new Date(new Date().getFullYear(), new Date().getMonth(), 1);
let toastTimer;
const sidebarFrame = document.querySelector(".sidebar-frame");
const headerFrame = document.querySelector(".header-frame");

function showToast(message) {
  elements.toast.textContent = message;
  elements.toast.classList.add("visible");
  window.clearTimeout(toastTimer);
  toastTimer = window.setTimeout(() => elements.toast.classList.remove("visible"), 3200);
}

function localDateKey(date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function parseLocalDate(value) {
  const [year, month, day] = value.split("-").map(Number);
  return new Date(year, month - 1, day);
}

function formatDate(value, options = { month: "short", day: "numeric", year: "numeric" }) {
  if (!value) return "No date";
  return parseLocalDate(value).toLocaleDateString(undefined, options);
}

function formatTimestamp(value) {
  return new Date(value).toLocaleString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

function loadTasks() {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved === null) return [];
    const parsed = JSON.parse(saved);
    if (!Array.isArray(parsed) || parsed.some((task) =>
      !task || typeof task.id !== "string" || typeof task.title !== "string" ||
      !["todo", "in-progress", "completed"].includes(task.status) ||
      (task.priority != null && !["high", "medium", "low"].includes(task.priority)) ||
      typeof task.createdAt !== "string" ||
      (task.dueDate != null && typeof task.dueDate !== "string") ||
      (task.description != null && typeof task.description !== "string") ||
      (task.assignee != null && typeof task.assignee !== "string") ||
      (task.startDate != null && typeof task.startDate !== "string")
    )) {
      throw new Error("Saved task data has an invalid format.");
    }
    return parsed.map((task) => ({
      ...task,
      description: task.description || "",
      priority: task.priority || "medium",
      assignee: task.assignee || "",
      startDate: task.startDate || null,
      dueDate: task.dueDate || null,
    }));
  } catch (error) {
    console.error("Unable to load saved tasks for the calendar.", error);
    showToast("Couldn't load saved tasks. Check your browser storage.");
    return [];
  }
}

function renderWeekdays() {
  const formatter = new Intl.DateTimeFormat(undefined, { weekday: "short" });
  elements.weekdays.replaceChildren();
  for (let day = 0; day < 7; day += 1) {
    const label = document.createElement("span");
    label.textContent = formatter.format(new Date(2024, 0, 7 + day));
    elements.weekdays.append(label);
  }
}

function createTaskChip(task, todayKey) {
  const chip = document.createElement("button");
  const overdue = task.status !== "completed" && task.dueDate < todayKey;
  chip.type = "button";
  chip.className = `calendar-task-chip priority-${task.priority}${overdue ? " is-overdue" : ""}${task.status === "completed" ? " is-completed" : ""}`;
  chip.textContent = task.title;
  chip.title = `${task.title} · ${STATUS_LABELS[task.status]} · ${PRIORITY_LABELS[task.priority]}${overdue ? " · Overdue" : ""}`;
  chip.setAttribute("aria-label", `${task.title}, ${STATUS_LABELS[task.status]}, ${PRIORITY_LABELS[task.priority]} priority${overdue ? ", overdue" : ""}. View task details.`);
  chip.addEventListener("click", () => viewTask(task));
  return chip;
}

function renderCalendar() {
  const year = displayedMonth.getFullYear();
  const month = displayedMonth.getMonth();
  const monthStart = new Date(year, month, 1);
  const gridStart = new Date(year, month, 1 - monthStart.getDay());
  const todayKey = localDateKey(new Date());
  const dueTasks = tasks.filter((task) => task.dueDate);
  const monthTasks = dueTasks.filter((task) => {
    const dueDate = parseLocalDate(task.dueDate);
    return dueDate.getFullYear() === year && dueDate.getMonth() === month;
  });
  const overdueCount = monthTasks.filter((task) => task.status !== "completed" && task.dueDate < todayKey).length;
  elements.monthTitle.textContent = displayedMonth.toLocaleDateString(undefined, { month: "long", year: "numeric" });
  elements.monthSummary.textContent = `${monthTasks.length} ${monthTasks.length === 1 ? "task" : "tasks"} due${overdueCount ? ` · ${overdueCount} overdue` : ""}`;
  elements.previous.setAttribute("aria-label", `Previous month before ${elements.monthTitle.textContent}`);
  elements.next.setAttribute("aria-label", `Next month after ${elements.monthTitle.textContent}`);
  elements.grid.replaceChildren();

  const tasksByDate = new Map();
  for (const task of dueTasks) {
    if (!tasksByDate.has(task.dueDate)) tasksByDate.set(task.dueDate, []);
    tasksByDate.get(task.dueDate).push(task);
  }

  for (let week = 0; week < 6; week += 1) {
    for (let weekday = 0; weekday < 7; weekday += 1) {
      const day = new Date(gridStart.getFullYear(), gridStart.getMonth(), gridStart.getDate() + week * 7 + weekday);
      const dateKey = localDateKey(day);
      const cell = document.createElement("section");
      cell.className = "calendar-day";
      if (day.getMonth() !== month) cell.classList.add("is-outside-month");
      if (dateKey === todayKey) {
        cell.classList.add("is-today");
        cell.setAttribute("aria-current", "date");
      }

      const header = document.createElement("div");
      header.className = "calendar-day-header";
      const dayNumber = document.createElement("span");
      dayNumber.className = "calendar-day-number";
      dayNumber.textContent = String(day.getDate());
      const dayTasks = tasksByDate.get(dateKey) || [];
      const overdueForDay = dayTasks.filter((task) => task.status !== "completed" && task.dueDate < todayKey).length;
      if (overdueForDay) {
        const indicator = document.createElement("span");
        indicator.className = "calendar-overdue-count";
        indicator.textContent = `${overdueForDay} overdue`;
        header.append(dayNumber, indicator);
      } else {
        header.append(dayNumber);
      }

      const taskList = document.createElement("div");
      taskList.className = "calendar-day-tasks";
      taskList.setAttribute("aria-label", `${formatDate(dateKey, { weekday: "long", month: "long", day: "numeric", year: "numeric" })}${dayTasks.length ? `, ${dayTasks.length} tasks due` : ", no tasks due"}`);
      for (const task of dayTasks) taskList.append(createTaskChip(task, todayKey));
      cell.append(header, taskList);
      elements.grid.append(cell);
    }
  }
}

function viewTask(task) {
  elements.detailsTitle.textContent = task.title;
  elements.detailsDescription.textContent = task.description || "No description provided.";
  elements.detailsStatus.textContent = STATUS_LABELS[task.status];
  elements.detailsStatus.className = `task-status-badge status-${task.status}`;
  elements.detailsPriority.textContent = PRIORITY_LABELS[task.priority];
  elements.detailsPriority.className = `priority-badge priority-${task.priority}`;
  elements.detailsAssignee.textContent = task.assignee || "Unassigned";
  elements.detailsStartDate.textContent = formatDate(task.startDate);
  elements.detailsDueDate.textContent = formatDate(task.dueDate);
  elements.detailsCreatedDate.textContent = formatTimestamp(task.createdAt);
  elements.detailsDialog.showModal();
}

function applyTheme(theme) {
  document.documentElement.dataset.theme = theme;
  for (const frame of [headerFrame, sidebarFrame]) {
    const frameRoot = frame.contentDocument?.documentElement;
    if (frameRoot) frameRoot.dataset.theme = theme;
  }
}

function loadTheme() {
  try {
    const preference = localStorage.getItem(THEME_STORAGE_KEY);
    if (preference === "system") return THEME_QUERY.matches ? "dark" : "light";
    return preference === "dark" ? "dark" : "light";
  } catch (error) {
    console.error("Unable to load saved theme.", error);
    showToast("Couldn't load your saved theme preference.");
    return "light";
  }
}

function updateSidebarLayout() {
  if (sidebarFrame.contentDocument?.body) {
    sidebarFrame.contentDocument.body.classList.toggle("compact-sidebar", window.innerWidth <= 760);
  }
}

elements.previous.addEventListener("click", () => {
  displayedMonth = new Date(displayedMonth.getFullYear(), displayedMonth.getMonth() - 1, 1);
  renderCalendar();
});
elements.next.addEventListener("click", () => {
  displayedMonth = new Date(displayedMonth.getFullYear(), displayedMonth.getMonth() + 1, 1);
  renderCalendar();
});
elements.today.addEventListener("click", () => {
  const now = new Date();
  displayedMonth = new Date(now.getFullYear(), now.getMonth(), 1);
  renderCalendar();
});
document.querySelector("#calendar-details-close").addEventListener("click", () => elements.detailsDialog.close());
document.querySelector("#calendar-details-done").addEventListener("click", () => elements.detailsDialog.close());
elements.detailsDialog.addEventListener("click", (event) => {
  if (event.target === elements.detailsDialog) elements.detailsDialog.close();
});
window.addEventListener("storage", (event) => {
  if (event.key === STORAGE_KEY) {
    tasks = loadTasks();
    renderCalendar();
  } else if (event.key === THEME_STORAGE_KEY) {
    applyTheme(event.newValue === "system"
      ? (THEME_QUERY.matches ? "dark" : "light")
      : event.newValue === "dark" ? "dark" : "light");
  }
});
THEME_QUERY.addEventListener("change", () => {
  if (localStorage.getItem(THEME_STORAGE_KEY) === "system") applyTheme(THEME_QUERY.matches ? "dark" : "light");
});
sidebarFrame.addEventListener("load", () => {
  updateSidebarLayout();
  applyTheme(document.documentElement.dataset.theme || "light");
});
headerFrame.addEventListener("load", () => applyTheme(document.documentElement.dataset.theme || "light"));
window.addEventListener("resize", updateSidebarLayout);
new ResizeObserver(updateSidebarLayout).observe(sidebarFrame);

tasks = loadTasks();
renderWeekdays();
renderCalendar();
applyTheme(loadTheme());
