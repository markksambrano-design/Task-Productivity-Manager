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
  date: document.querySelector("#myday-date"),
  dueTodayCount: document.querySelector("#due-today-count"),
  overdueCount: document.querySelector("#overdue-count"),
  completedTodayCount: document.querySelector("#completed-today-count"),
  progressCaption: document.querySelector("#daily-progress-caption"),
  progressRate: document.querySelector("#daily-progress-rate"),
  progressTrack: document.querySelector("#daily-progress-track"),
  progressFill: document.querySelector("#daily-progress-fill"),
  startedTodayBadge: document.querySelector("#started-today-badge"),
  dueTodayBadge: document.querySelector("#due-today-badge"),
  overdueBadge: document.querySelector("#overdue-badge"),
  startedTodayList: document.querySelector("#started-today-list"),
  dueTodayList: document.querySelector("#due-today-list"),
  overdueList: document.querySelector("#overdue-list"),
  startedTodayPagination: document.querySelector("#started-today-pagination"),
  startedTodayPrevious: document.querySelector("#started-today-previous"),
  startedTodayPage: document.querySelector("#started-today-page"),
  startedTodayNext: document.querySelector("#started-today-next"),
  dueTodayPagination: document.querySelector("#due-today-pagination"),
  dueTodayPrevious: document.querySelector("#due-today-previous"),
  dueTodayPage: document.querySelector("#due-today-page"),
  dueTodayNext: document.querySelector("#due-today-next"),
  overduePagination: document.querySelector("#overdue-pagination"),
  overduePrevious: document.querySelector("#overdue-previous"),
  overduePage: document.querySelector("#overdue-page"),
  overdueNext: document.querySelector("#overdue-next"),
  toast: document.querySelector("#myday-toast"),
};

let tasks = [];
let toastTimer;
const TASKS_PER_PAGE = 5;
const groupPages = { startedToday: 0, dueToday: 0, overdue: 0 };
const sidebarFrame = document.querySelector(".sidebar-frame");
const headerFrame = document.querySelector(".header-frame");

function showToast(message) {
  elements.toast.textContent = message;
  elements.toast.classList.add("visible");
  window.clearTimeout(toastTimer);
  toastTimer = window.setTimeout(() => elements.toast.classList.remove("visible"), 3200);
}

function localDateKey(date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}

function parseLocalDate(value) {
  if (typeof value !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return null;
  const [year, month, day] = value.split("-").map(Number);
  const date = new Date(year, month - 1, day);
  return date.getFullYear() === year && date.getMonth() === month - 1 && date.getDate() === day ? date : null;
}

function formatDate(value) {
  const date = parseLocalDate(value);
  return date
    ? date.toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" })
    : "No due date";
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
      (task.startDate != null && typeof task.startDate !== "string") ||
      (task.assignee != null && typeof task.assignee !== "string") ||
      (task.description != null && typeof task.description !== "string") ||
      (task.updatedAt != null && typeof task.updatedAt !== "string") ||
      (task.completedAt != null && typeof task.completedAt !== "string")
    )) {
      throw new Error("Saved task data has an invalid format.");
    }
    return parsed.map((task) => ({
      ...task,
      priority: task.priority || "medium",
      assignee: task.assignee || "",
      startDate: task.startDate || null,
      dueDate: task.dueDate || null,
      completedAt: task.completedAt || null,
      updatedAt: task.updatedAt || task.createdAt,
    }));
  } catch (error) {
    console.error("Unable to load saved tasks for My Day.", error);
    showToast("Couldn't load saved tasks. Check your browser storage.");
    return [];
  }
}

function saveTasks() {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(tasks));
    return true;
  } catch (error) {
    console.error("Unable to save task completion.", error);
    showToast("Couldn't save this task. Check your browser storage.");
    return false;
  }
}

function makeEmptyState(title, description) {
  const empty = document.createElement("div");
  empty.className = "myday-empty-state";
  const icon = document.createElement("span");
  icon.className = "myday-empty-icon";
  icon.textContent = "✓";
  icon.setAttribute("aria-hidden", "true");
  const heading = document.createElement("strong");
  heading.textContent = title;
  const detail = document.createElement("span");
  detail.textContent = description;
  empty.append(icon, heading, detail);
  return empty;
}

function createTaskRow(task, todayKey, group) {
  const row = document.createElement("article");
  row.className = `myday-task-row${task.status === "completed" ? " is-completed" : ""}${group === "overdue" ? " is-overdue" : ""}`;

  const details = document.createElement("div");
  details.className = "myday-task-details";
  const title = document.createElement("strong");
  title.className = "myday-task-title";
  title.textContent = task.title;
  const metadata = document.createElement("div");
  metadata.className = "myday-task-metadata";
  const priority = document.createElement("span");
  priority.className = `priority-badge priority-${task.priority}`;
  priority.textContent = PRIORITY_LABELS[task.priority];
  metadata.append(priority);
  if (task.assignee) {
    const assignee = document.createElement("span");
    assignee.textContent = task.assignee;
    metadata.append(assignee);
  }
  if (group === "overdue") {
    const deadline = document.createElement("span");
    deadline.className = "myday-deadline overdue-deadline";
    deadline.textContent = `Overdue · ${formatDate(task.dueDate)}`;
    metadata.append(deadline);
  } else if (task.dueDate) {
    const deadline = document.createElement("span");
    deadline.className = "myday-deadline";
    deadline.textContent = `Due ${task.dueDate === todayKey ? "today" : formatDate(task.dueDate)}`;
    metadata.append(deadline);
  }
  const status = document.createElement("span");
  status.className = `myday-status status-${task.status}`;
  status.textContent = STATUS_LABELS[task.status];
  metadata.append(status);
  details.append(title, metadata);

  const actions = document.createElement("div");
  actions.className = "myday-task-actions";
  if (task.status === "completed") {
    const done = document.createElement("span");
    done.className = "myday-done-label";
    done.textContent = "Done";
    actions.append(done);
  } else {
    const complete = document.createElement("button");
    complete.className = "myday-complete-button";
    complete.type = "button";
    complete.textContent = "Mark done";
    complete.setAttribute("aria-label", `Mark ${task.title} as completed`);
    complete.addEventListener("click", () => completeTask(task.id));
    actions.append(complete);
  }
  row.append(details, actions);
  return row;
}

function renderTaskGroup(container, groupTasks, todayKey, group, emptyTitle, emptyDescription, page, pagination, previous, pageLabel, next) {
  container.replaceChildren();
  const pageCount = Math.ceil(groupTasks.length / TASKS_PER_PAGE);
  pagination.hidden = pageCount <= 1;
  previous.disabled = page <= 0;
  next.disabled = page >= pageCount - 1;
  pageLabel.textContent = pageCount > 0 ? `Page ${page + 1} of ${pageCount}` : "";
  if (groupTasks.length === 0) {
    container.append(makeEmptyState(emptyTitle, emptyDescription));
    return;
  }
  const visibleTasks = groupTasks.slice(page * TASKS_PER_PAGE, (page + 1) * TASKS_PER_PAGE);
  for (const task of visibleTasks) {
    container.append(createTaskRow(task, todayKey, group));
  }
}

function renderMyDay() {
  const now = new Date();
  const todayKey = localDateKey(now);
  const todayTasks = tasks
    .filter((task) => task.dueDate === todayKey)
    .sort((first, second) => first.status === "completed" ? 1 : second.status === "completed" ? -1 : first.title.localeCompare(second.title));
  const overdueTasks = tasks
    .filter((task) => task.status !== "completed" && parseLocalDate(task.dueDate) && task.dueDate < todayKey)
    .sort((first, second) => first.dueDate.localeCompare(second.dueDate));
  const startedTodayTasks = tasks
    .filter((task) => task.startDate === todayKey && task.dueDate !== todayKey && !(task.dueDate && task.dueDate < todayKey))
    .sort((first, second) => first.status === "completed" ? 1 : second.status === "completed" ? -1 : first.title.localeCompare(second.title));
  groupPages.startedToday = Math.min(groupPages.startedToday, Math.max(Math.ceil(startedTodayTasks.length / TASKS_PER_PAGE) - 1, 0));
  groupPages.dueToday = Math.min(groupPages.dueToday, Math.max(Math.ceil(todayTasks.length / TASKS_PER_PAGE) - 1, 0));
  groupPages.overdue = Math.min(groupPages.overdue, Math.max(Math.ceil(overdueTasks.length / TASKS_PER_PAGE) - 1, 0));
  const completedToday = tasks.filter((task) => {
    if (task.status !== "completed" || !task.completedAt) return false;
    const completedAt = new Date(task.completedAt);
    return !Number.isNaN(completedAt.getTime()) && localDateKey(completedAt) === todayKey;
  }).length;
  const completedDueToday = todayTasks.filter((task) => task.status === "completed").length;
  const progress = todayTasks.length === 0 ? 0 : Math.round((completedDueToday / todayTasks.length) * 100);

  elements.date.textContent = now.toLocaleDateString(undefined, {
    weekday: "long",
    month: "long",
    day: "numeric",
    year: "numeric",
  });
  elements.dueTodayCount.textContent = String(todayTasks.filter((task) => task.status !== "completed").length);
  elements.overdueCount.textContent = String(overdueTasks.length);
  elements.completedTodayCount.textContent = String(completedToday);
  elements.progressCaption.textContent = todayTasks.length
    ? `${completedDueToday} of ${todayTasks.length} tasks due today completed`
    : "No tasks due today";
  elements.progressRate.textContent = `${progress}%`;
  elements.progressTrack.setAttribute("aria-valuenow", String(progress));
  elements.progressFill.style.width = `${progress}%`;
  elements.startedTodayBadge.textContent = String(startedTodayTasks.length);
  elements.dueTodayBadge.textContent = String(todayTasks.length);
  elements.overdueBadge.textContent = String(overdueTasks.length);

  renderTaskGroup(
    elements.startedTodayList,
    startedTodayTasks,
    todayKey,
    "today",
    "Nothing scheduled to start today",
    "Tasks with today's start date will show up here.",
    groupPages.startedToday,
    elements.startedTodayPagination,
    elements.startedTodayPrevious,
    elements.startedTodayPage,
    elements.startedTodayNext,
  );
  renderTaskGroup(
    elements.dueTodayList,
    todayTasks,
    todayKey,
    "due",
    "No tasks due today",
    "You're all clear for today's deadlines.",
    groupPages.dueToday,
    elements.dueTodayPagination,
    elements.dueTodayPrevious,
    elements.dueTodayPage,
    elements.dueTodayNext,
  );
  renderTaskGroup(
    elements.overdueList,
    overdueTasks,
    todayKey,
    "overdue",
    "You're all caught up",
    "Past-due tasks that are not finished will appear here.",
    groupPages.overdue,
    elements.overduePagination,
    elements.overduePrevious,
    elements.overduePage,
    elements.overdueNext,
  );
}

function changeGroupPage(pageKey, direction) {
  const todayKey = localDateKey(new Date());
  const groupTasks = pageKey === "startedToday"
    ? tasks.filter((task) => task.startDate === todayKey && task.dueDate !== todayKey && !(task.dueDate && task.dueDate < todayKey))
    : pageKey === "dueToday"
      ? tasks.filter((task) => task.dueDate === todayKey)
      : tasks.filter((task) => task.status !== "completed" && parseLocalDate(task.dueDate) && task.dueDate < todayKey);
  const pageCount = Math.ceil(groupTasks.length / TASKS_PER_PAGE);
  groupPages[pageKey] = Math.max(0, Math.min(groupPages[pageKey] + direction, pageCount - 1));
  renderMyDay();
}

elements.startedTodayPrevious.addEventListener("click", () => changeGroupPage("startedToday", -1));
elements.startedTodayNext.addEventListener("click", () => changeGroupPage("startedToday", 1));
elements.dueTodayPrevious.addEventListener("click", () => changeGroupPage("dueToday", -1));
elements.dueTodayNext.addEventListener("click", () => changeGroupPage("dueToday", 1));
elements.overduePrevious.addEventListener("click", () => changeGroupPage("overdue", -1));
elements.overdueNext.addEventListener("click", () => changeGroupPage("overdue", 1));

function completeTask(taskId) {
  const task = tasks.find((item) => item.id === taskId);
  if (!task || task.status === "completed") return;
  const previous = { status: task.status, completedAt: task.completedAt, updatedAt: task.updatedAt };
  const now = new Date().toISOString();
  task.status = "completed";
  task.completedAt = now;
  task.updatedAt = now;
  if (!saveTasks()) {
    Object.assign(task, previous);
    return;
  }
  renderMyDay();
  showToast("Task marked as completed.");
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

window.addEventListener("storage", (event) => {
  if (event.key === STORAGE_KEY) {
    tasks = loadTasks();
    renderMyDay();
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
renderMyDay();
applyTheme(loadTheme());
