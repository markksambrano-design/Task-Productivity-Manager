const TASKS_KEY = "taskflow.dashboard.tasks.v1";
const THEME_KEY = "taskflow.dashboard.theme.v1";
const SORTING_KEY = "taskflow.dashboard.sorting.v1";
const APP_STORAGE_KEYS = [TASKS_KEY, THEME_KEY, SORTING_KEY];
const THEME_QUERY = window.matchMedia("(prefers-color-scheme: dark)");
const elements = {
  themeOptions: [...document.querySelectorAll('input[name="theme"]')],
  sorting: document.querySelector("#default-sorting"),
  clearCompleted: document.querySelector("#clear-completed"),
  resetData: document.querySelector("#reset-data"),
  dialog: document.querySelector("#settings-confirm-dialog"),
  dialogTitle: document.querySelector("#settings-confirm-title"),
  dialogDescription: document.querySelector("#settings-confirm-description"),
  cancelAction: document.querySelector("#cancel-settings-action"),
  confirmAction: document.querySelector("#confirm-settings-action"),
  toast: document.querySelector("#settings-toast"),
};

const sidebarFrame = document.querySelector(".sidebar-frame");
const headerFrame = document.querySelector(".header-frame");
let pendingAction = null;
let toastTimer;
let selectedThemePreference = "light";

function showToast(message) {
  elements.toast.textContent = message;
  elements.toast.classList.add("visible");
  window.clearTimeout(toastTimer);
  toastTimer = window.setTimeout(() => elements.toast.classList.remove("visible"), 3200);
}

function resolveTheme(preference) {
  if (preference === "system") return THEME_QUERY.matches ? "dark" : "light";
  return preference === "dark" ? "dark" : "light";
}

function applyThemePreference(preference) {
  const theme = resolveTheme(preference);
  document.documentElement.dataset.theme = theme;
  for (const frame of [sidebarFrame, headerFrame]) {
    if (frame.contentDocument?.documentElement) {
      frame.contentDocument.documentElement.dataset.theme = theme;
    }
  }
}

function setThemePreference(preference) {
  try {
    localStorage.setItem(THEME_KEY, preference);
    selectedThemePreference = preference;
    applyThemePreference(preference);
    return true;
  } catch (error) {
    console.error("Unable to save theme preference.", error);
    showToast("Couldn't save your theme preference.");
    return false;
  }
}

function readTasks() {
  const saved = localStorage.getItem(TASKS_KEY);
  if (saved === null) return [];
  const tasks = JSON.parse(saved);
  if (!Array.isArray(tasks) || tasks.some((task) =>
    !task || typeof task.id !== "string" ||
    !["todo", "in-progress", "completed"].includes(task.status)
  )) {
    throw new Error("Saved task data has an invalid format.");
  }
  return tasks;
}

function openConfirmation(action, title, description, confirmLabel) {
  pendingAction = action;
  elements.dialogTitle.textContent = title;
  elements.dialogDescription.textContent = description;
  elements.confirmAction.textContent = confirmLabel;
  elements.dialog.showModal();
}

elements.themeOptions.forEach((option) => {
  option.addEventListener("change", () => {
      if (!option.checked || !setThemePreference(option.value)) {
        document.querySelector(`input[name="theme"][value="${selectedThemePreference}"]`).checked = true;
      }
    });
});

try {
  const savedTheme = localStorage.getItem(THEME_KEY);
  const themePreference = ["light", "dark", "system"].includes(savedTheme) ? savedTheme : "light";
  selectedThemePreference = themePreference;
  document.querySelector(`input[name="theme"][value="${themePreference}"]`).checked = true;
  applyThemePreference(themePreference);
  const savedSorting = localStorage.getItem(SORTING_KEY);
  elements.sorting.value = ["newest", "due-date", "priority", "title"].includes(savedSorting)
    ? savedSorting
    : "newest";
} catch (error) {
  console.error("Unable to load saved settings.", error);
  showToast("Couldn't load your saved preferences.");
}

elements.sorting.addEventListener("change", () => {
  try {
    localStorage.setItem(SORTING_KEY, elements.sorting.value);
    showToast("Default task sorting saved.");
  } catch (error) {
    console.error("Unable to save task sorting preference.", error);
    showToast("Couldn't save your sorting preference.");
  }
});

elements.clearCompleted.addEventListener("click", () => {
  try {
    const completedCount = readTasks().filter((task) => task.status === "completed").length;
    if (completedCount === 0) {
      showToast("There are no completed tasks to clear.");
      return;
    }
    openConfirmation(
      "clear-completed",
      "Clear completed tasks?",
      `This will permanently remove ${completedCount} completed ${completedCount === 1 ? "task" : "tasks"}. Active tasks will stay.`,
      "Clear completed",
    );
  } catch (error) {
    console.error("Unable to prepare completed task cleanup.", error);
    showToast("Couldn't read your saved tasks. No data was changed.");
  }
});

elements.resetData.addEventListener("click", () => {
  openConfirmation(
    "reset",
    "Reset all application data?",
    "This permanently removes every saved task and restores the default theme and sorting preferences.",
    "Reset all data",
  );
});

elements.confirmAction.addEventListener("click", () => {
  try {
    if (pendingAction === "clear-completed") {
      const tasks = readTasks();
      const remainingTasks = tasks.filter((task) => task.status !== "completed");
      localStorage.setItem(TASKS_KEY, JSON.stringify(remainingTasks));
      showToast("Completed tasks cleared.");
    } else if (pendingAction === "reset") {
      APP_STORAGE_KEYS.forEach((key) => localStorage.removeItem(key));
      selectedThemePreference = "light";
      document.querySelector('input[name="theme"][value="light"]').checked = true;
      elements.sorting.value = "newest";
      applyThemePreference("light");
      showToast("All application data has been reset.");
    }
    pendingAction = null;
    elements.dialog.close();
  } catch (error) {
    console.error("Unable to complete settings action.", error);
    showToast("Couldn't complete this action. Check your browser storage.");
  }
});

elements.cancelAction.addEventListener("click", () => {
  pendingAction = null;
  elements.dialog.close();
});
elements.dialog.addEventListener("click", (event) => {
  if (event.target === elements.dialog) {
    pendingAction = null;
    elements.dialog.close();
  }
});
elements.dialog.addEventListener("close", () => {
  pendingAction = null;
});

window.addEventListener("storage", (event) => {
  if (event.key === THEME_KEY) {
    const preference = ["light", "dark", "system"].includes(event.newValue) ? event.newValue : "light";
    selectedThemePreference = preference;
    document.querySelector(`input[name="theme"][value="${preference}"]`).checked = true;
    applyThemePreference(preference);
  } else if (event.key === SORTING_KEY) {
    elements.sorting.value = ["newest", "due-date", "priority", "title"].includes(event.newValue)
      ? event.newValue
      : "newest";
  }
});
THEME_QUERY.addEventListener("change", () => {
  if (localStorage.getItem(THEME_KEY) === "system") applyThemePreference("system");
});

const updateSidebarLayout = () => {
  if (sidebarFrame.contentDocument?.body) {
    sidebarFrame.contentDocument.body.classList.toggle("compact-sidebar", window.innerWidth <= 760);
  }
};
sidebarFrame.addEventListener("load", () => {
  updateSidebarLayout();
  applyThemePreference(localStorage.getItem(THEME_KEY) || "light");
});
headerFrame.addEventListener("load", () => applyThemePreference(localStorage.getItem(THEME_KEY) || "light"));
window.addEventListener("resize", updateSidebarLayout);
updateSidebarLayout();
