const STORAGE_KEY = "taskflow.dashboard.tasks.v1";
const SAMPLE_TASKS_INITIALIZED_KEY = "taskflow.dashboard.sample-tasks-initialized.v1";
const EXTRA_SAMPLE_TASKS_INITIALIZED_KEY = "taskflow.dashboard.extra-sample-tasks-initialized.v1";
const SEASONAL_SAMPLE_TASKS_INITIALIZED_KEY = "taskflow.dashboard.seasonal-sample-tasks-initialized.v1";
const THEME_STORAGE_KEY = "taskflow.dashboard.theme.v1";
const SORTING_STORAGE_KEY = "taskflow.dashboard.sorting.v1";
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
const BOARD_COLUMN_DESCRIPTIONS = {
  todo: "Next up",
  "in-progress": "Work in progress",
  completed: "Shipped & closed",
};

const elements = {
  dialog: document.querySelector("#task-dialog"),
  dialogTitle: document.querySelector("#task-dialog-title"),
  openDialog: document.querySelector("#open-task-dialog"),
  closeDialog: document.querySelector("#close-task-dialog"),
  cancelDialog: document.querySelector("#cancel-task-dialog"),
  form: document.querySelector("#task-form"),
  title: document.querySelector("#task-title"),
  description: document.querySelector("#task-description"),
  assignee: document.querySelector("#task-assignee"),
  category: document.querySelector("#task-category"),
  tags: document.querySelector("#task-tags"),
  status: document.querySelector("#task-status"),
  priority: document.querySelector("#task-priority"),
  dueDate: document.querySelector("#task-due-date"),
  startDate: document.querySelector("#task-start-date"),
  list: document.querySelector("#task-list"),
  count: document.querySelector("#task-count"),
  pagination: document.querySelector("#task-page-pagination"),
  previousPage: document.querySelector("#task-page-previous"),
  pageIndicator: document.querySelector("#task-page-indicator"),
  nextPage: document.querySelector("#task-page-next"),
  viewContent: document.querySelector("#task-view-content"),
  table: document.querySelector(".task-table-scroll"),
  kanban: document.querySelector("#task-kanban"),
  exportButton: document.querySelector("#export-tasks"),
  toast: document.querySelector("#toast"),
  submitLabel: document.querySelector("#task-submit-label"),
  subtaskTitle: document.querySelector("#subtask-title"),
  addSubtask: document.querySelector("#add-subtask"),
  subtaskEditorList: document.querySelector("#subtask-editor-list"),
  detailsDialog: document.querySelector("#task-details-dialog"),
  deleteDialog: document.querySelector("#delete-confirm-dialog"),
  deleteTaskName: document.querySelector("#delete-confirm-task-name"),
  detailsTitle: document.querySelector("#details-title"),
  detailsDescription: document.querySelector("#details-description"),
  detailsCategory: document.querySelector("#details-category"),
  detailsTags: document.querySelector("#details-tags"),
  detailsStatus: document.querySelector("#details-status"),
  detailsPriority: document.querySelector("#details-priority"),
  detailsAssignee: document.querySelector("#details-assignee"),
  detailsStartDate: document.querySelector("#details-start-date"),
  detailsDueDate: document.querySelector("#details-due-date"),
  detailsCreatedDate: document.querySelector("#details-created-date"),
  detailsSubtaskProgress: document.querySelector("#details-subtask-progress"),
  detailsSubtaskList: document.querySelector("#details-subtask-list"),
  closeDetails: document.querySelector("#close-details-dialog"),
  closeDetailsAction: document.querySelector("#close-details-action"),
};

let tasks = [];
let toastTimer;
let editingTaskId = null;
let activeView = "table";
let sortPreference = "newest";
let editorSubtasks = [];
let currentTaskPage = 0;
const TASKS_PER_PAGE = 10;

function showToast(message) {
  elements.toast.textContent = message;
  elements.toast.classList.add("visible");
  window.clearTimeout(toastTimer);
  toastTimer = window.setTimeout(() => elements.toast.classList.remove("visible"), 3200);
}

function getDateOffset(offset) {
  const date = new Date();
  date.setDate(date.getDate() + offset);
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function createSampleTasks() {
  const now = new Date().toISOString();
  const yesterday = new Date(Date.now() - 86400000).toISOString();
  const threeDaysAgo = new Date(Date.now() - 3 * 86400000).toISOString();

  return [
    {
      id: crypto.randomUUID(),
      title: "Plan this week's priorities",
      description: "Choose the most important things to finish and make room for focused work.",
      assignee: "You",
      category: "Personal",
      tags: ["planning", "weekly"],
      status: "in-progress",
      priority: "high",
      startDate: getDateOffset(0),
      dueDate: getDateOffset(1),
      createdAt: yesterday,
      updatedAt: now,
      completedAt: null,
      subtasks: [
        { id: createSubtaskId(), title: "Review outstanding tasks", completed: true },
        { id: createSubtaskId(), title: "Pick three priorities", completed: false },
        { id: createSubtaskId(), title: "Block focus time", completed: false },
      ],
    },
    {
      id: crypto.randomUUID(),
      title: "Finish portfolio landing page",
      description: "Polish the homepage, check it on mobile, and get it ready to share.",
      assignee: "You",
      category: "Projects",
      tags: ["portfolio", "design"],
      status: "todo",
      priority: "high",
      startDate: getDateOffset(0),
      dueDate: getDateOffset(3),
      createdAt: now,
      updatedAt: now,
      completedAt: null,
      subtasks: [
        { id: createSubtaskId(), title: "Update project descriptions", completed: false },
        { id: createSubtaskId(), title: "Check mobile layout", completed: false },
      ],
    },
    {
      id: crypto.randomUUID(),
      title: "Review JavaScript fundamentals",
      description: "Spend a little time revisiting the basics and write down anything to practice.",
      assignee: "You",
      category: "Study",
      tags: ["learning", "javascript"],
      status: "todo",
      priority: "medium",
      startDate: getDateOffset(1),
      dueDate: getDateOffset(4),
      createdAt: now,
      updatedAt: now,
      completedAt: null,
      subtasks: [
        { id: createSubtaskId(), title: "Review array methods", completed: false },
        { id: createSubtaskId(), title: "Practice async functions", completed: false },
      ],
    },
    {
      id: crypto.randomUUID(),
      title: "Prepare monthly budget",
      description: "Check recent spending and set a simple budget for the month.",
      assignee: "You",
      category: "Personal",
      tags: ["finance"],
      status: "completed",
      priority: "low",
      startDate: getDateOffset(-5),
      dueDate: getDateOffset(-2),
      createdAt: threeDaysAgo,
      updatedAt: yesterday,
      completedAt: yesterday,
      subtasks: [
        { id: createSubtaskId(), title: "Review last month's expenses", completed: true },
        { id: createSubtaskId(), title: "Set savings target", completed: true },
      ],
    },
    {
      id: crypto.randomUUID(),
      title: "Plan groceries and meal prep",
      description: "Make a short shopping list and plan a few easy meals for the week.",
      assignee: "You",
      category: "Personal",
      tags: ["home", "weekly"],
      status: "todo",
      priority: "low",
      startDate: getDateOffset(0),
      dueDate: getDateOffset(2),
      createdAt: now,
      updatedAt: now,
      completedAt: null,
      subtasks: [
        { id: createSubtaskId(), title: "Choose meals", completed: false },
        { id: createSubtaskId(), title: "Write shopping list", completed: false },
      ],
    },
    {
      id: crypto.randomUUID(),
      title: "Send project update to the team",
      description: "Share a quick progress update, blockers, and the next steps.",
      assignee: "You",
      category: "Work",
      tags: ["team", "communication"],
      status: "todo",
      priority: "medium",
      startDate: getDateOffset(0),
      dueDate: getDateOffset(1),
      createdAt: now,
      updatedAt: now,
      completedAt: null,
      subtasks: [],
    },
  ];
}

function createAdditionalSampleTasks(limit = 30) {
  const samples = [
    ["Organize project files", "Sort current project documents and archive anything finished.", "Work", ["organization", "files"], "medium", 2],
    ["Draft the next newsletter", "Write a short update with recent news and upcoming plans.", "Work", ["writing", "communication"], "medium", 4],
    ["Back up important documents", "Save a secure copy of important personal and work files.", "Personal", ["backup", "home"], "high", 1],
    ["Practice a new design concept", "Create a small concept study and note what you learned.", "Study", ["design", "practice"], "low", 6],
    ["Review monthly subscriptions", "Check recurring charges and cancel anything you no longer use.", "Personal", ["finance", "review"], "medium", 3],
    ["Update project documentation", "Bring the setup instructions and project notes up to date.", "Projects", ["documentation", "project"], "medium", 5],
    ["Clean up the workspace", "Clear the desk and put frequently used items back in place.", "Personal", ["home", "routine"], "low", 2],
    ["Prepare meeting notes", "Collect key updates and questions for the next team meeting.", "Work", ["meeting", "team"], "high", 1],
    ["Read one learning chapter", "Set aside focused time to read and summarize one chapter.", "Study", ["learning", "reading"], "low", 7],
    ["Test the contact form", "Check required fields, success feedback, and mobile behavior.", "Projects", ["testing", "web"], "high", 3],
    ["Plan a weekend activity", "Pick an activity and check the details before the weekend.", "Personal", ["weekend", "planning"], "low", 5],
    ["Review inbox and follow-ups", "Respond to important messages and note any next actions.", "Work", ["email", "follow-up"], "medium", 0],
    ["Sketch app improvement ideas", "Write down a few small improvements for the next iteration.", "Projects", ["ideas", "planning"], "medium", 8],
    ["Check upcoming appointments", "Confirm times and add any preparation reminders to the calendar.", "Personal", ["calendar", "routine"], "low", 4],
    ["Complete coding practice", "Work through one focused programming exercise and review the solution.", "Study", ["coding", "practice"], "medium", 6],
    ["Refresh presentation slides", "Simplify the slides and verify the important figures.", "Work", ["presentation", "review"], "high", 2],
    ["Sort photos from this month", "Choose the best photos and move them into organized albums.", "Personal", ["photos", "organization"], "low", 9],
    ["Check website accessibility", "Review keyboard navigation, labels, and color contrast.", "Projects", ["accessibility", "web"], "high", 5],
    ["Make a weekly meal plan", "Choose a few practical meals and list the ingredients needed.", "Personal", ["meal-prep", "weekly"], "medium", 1],
    ["Review course notes", "Summarize recent lessons and flag topics that need another look.", "Study", ["course", "review"], "medium", 3],
    ["Share sprint progress", "Post completed work, current blockers, and the immediate next step.", "Work", ["sprint", "team"], "high", 0],
    ["Refine portfolio project cards", "Make project summaries consistent and easier to scan.", "Projects", ["portfolio", "design"], "medium", 7],
    ["Set a savings reminder", "Choose a monthly savings amount and schedule a reminder.", "Personal", ["finance", "reminder"], "low", 10],
    ["Learn a spreadsheet shortcut", "Practice a useful shortcut and add it to a quick reference note.", "Study", ["learning", "productivity"], "low", 11],
    ["Check project deadlines", "Review upcoming milestones and flag anything at risk.", "Work", ["planning", "deadlines"], "high", 2],
    ["Tidy downloads folder", "File useful downloads and remove duplicates that are no longer needed.", "Personal", ["cleanup", "files"], "low", 6],
    ["Write a project retrospective", "Record what went well and one improvement for next time.", "Projects", ["reflection", "project"], "medium", 12],
    ["Review vocabulary notes", "Practice recent vocabulary and add a few example sentences.", "Study", ["language", "practice"], "low", 8],
    ["Prepare tomorrow's priority list", "Choose the top tasks for tomorrow and gather anything needed.", "Personal", ["planning", "routine"], "medium", 1],
    ["Update team task assignments", "Confirm owners and make sure each open action has a next step.", "Work", ["team", "tasks"], "high", 4],
  ];
  const now = Date.now();

  return samples.slice(0, limit).map(([title, description, category, tags, priority, dueOffset], index) => {
    const createdAt = new Date(now - (index + 1) * 86400000).toISOString();
    const status = ["todo", "in-progress", "completed"][index % 3];
    return {
      id: crypto.randomUUID(),
      title,
      description,
      assignee: "You",
      category,
      tags,
      status,
      priority,
      startDate: getDateOffset(dueOffset - 6),
      dueDate: getDateOffset(dueOffset - 4),
      createdAt,
      updatedAt: createdAt,
      completedAt: status === "completed" ? createdAt : null,
      subtasks: [],
    };
  });
}

function createSeasonalSampleTasks() {
  const now = Date.now();
  const samples = [
    {
      title: "Prepare the year-end budget",
      description: "Review this year's spending, plan upcoming expenses, and set a practical year-end budget.",
      category: "Personal",
      tags: ["finance", "planning"],
      priority: "medium",
      startDate: "2026-10-20",
      dueDate: "2026-11-05",
      subtasks: ["Review recent expenses", "Estimate upcoming costs", "Set a savings target"],
    },
    {
      title: "Run a usability test for the new dashboard",
      description: "Gather feedback from a few users and prioritize the most important usability fixes.",
      category: "Projects",
      tags: ["testing", "dashboard"],
      priority: "high",
      startDate: "2026-10-22",
      dueDate: "2026-11-12",
      subtasks: ["Prepare test scenarios", "Run user sessions", "Summarize findings"],
    },
    {
      title: "Submit the final course project",
      description: "Finish the final project, proofread the submission, and turn it in before the deadline.",
      category: "Study",
      tags: ["course", "deadline"],
      priority: "high",
      startDate: "2026-10-25",
      dueDate: "2026-11-19",
      subtasks: ["Complete the project", "Review the requirements", "Submit the final files"],
    },
    {
      title: "Organize holiday travel plans",
      description: "Compare travel options, confirm dates, and keep reservations and details in one place.",
      category: "Personal",
      tags: ["travel", "planning"],
      priority: "medium",
      startDate: "2026-10-28",
      dueDate: "2026-11-23",
      subtasks: ["Confirm travel dates", "Compare transport options", "Save booking details"],
    },
    {
      title: "Publish the portfolio refresh",
      description: "Review the updated portfolio content and publish the refreshed project gallery.",
      category: "Projects",
      tags: ["portfolio", "launch"],
      priority: "medium",
      startDate: "2026-11-02",
      dueDate: "2026-11-29",
      subtasks: ["Review project copy", "Check responsive layouts", "Publish the update"],
    },
    {
      title: "Build and launch the client portal",
      description: "Deliver a secure client portal with account access, project updates, and a tested release.",
      category: "Projects",
      tags: ["major-project", "client-portal"],
      priority: "high",
      startDate: "2026-11-01",
      dueDate: "2026-12-05",
      subtasks: ["Finalize requirements and user flows", "Design portal screens", "Build account access and project views", "Run security and usability tests", "Deploy and monitor the release"],
    },
    {
      title: "Migrate customer data to the new platform",
      description: "Plan and complete a carefully validated migration with backups and a recovery plan.",
      category: "Work",
      tags: ["major-project", "data-migration"],
      priority: "high",
      startDate: "2026-11-03",
      dueDate: "2026-12-12",
      subtasks: ["Audit and map existing data", "Prepare a verified backup", "Build migration scripts", "Run a test migration", "Validate results and document recovery steps"],
    },
    {
      title: "Deliver the annual results and roadmap report",
      description: "Compile yearly results and create a data-backed roadmap with goals for the next year.",
      category: "Work",
      tags: ["major-project", "reporting"],
      priority: "high",
      startDate: "2026-11-08",
      dueDate: "2026-12-18",
      subtasks: ["Collect team and project results", "Analyze key performance metrics", "Draft next-year goals", "Review with stakeholders", "Publish the final report"],
    },
    {
      title: "Launch the online store",
      description: "Build a complete online store, connect checkout, and prepare operations for launch.",
      category: "Projects",
      tags: ["major-project", "e-commerce"],
      priority: "high",
      startDate: "2026-11-05",
      dueDate: "2026-12-23",
      subtasks: ["Confirm product and launch requirements", "Build catalog and product pages", "Implement cart and checkout", "Test payments and order notifications", "Prepare launch support and release"],
    },
    {
      title: "Complete the advanced course capstone",
      description: "Plan, build, and present a substantial capstone project that demonstrates the course skills.",
      category: "Study",
      tags: ["major-project", "capstone"],
      priority: "high",
      startDate: "2026-11-10",
      dueDate: "2026-12-30",
      subtasks: ["Choose a capstone problem", "Write the project plan", "Build the core solution", "Test and refine the result", "Prepare the final presentation"],
    },
    {
      title: "Plan and kick off the Q1 strategy",
      description: "Set measurable quarterly goals, align project owners, and create a realistic delivery plan.",
      category: "Work",
      tags: ["major-project", "strategy"],
      priority: "high",
      startDate: "2026-12-01",
      dueDate: "2027-01-08",
      subtasks: ["Review current-year outcomes", "Gather team priorities", "Define measurable Q1 goals", "Assign project owners", "Share the quarterly roadmap"],
    },
    {
      title: "Build an automated reporting pipeline",
      description: "Create a reliable data pipeline that validates, processes, and publishes recurring reports.",
      category: "Projects",
      tags: ["major-project", "automation"],
      priority: "high",
      startDate: "2026-12-05",
      dueDate: "2027-01-15",
      subtasks: ["Document data sources", "Design the pipeline architecture", "Build data validation and processing", "Automate report generation", "Monitor and document the pipeline"],
    },
    {
      title: "Release the major product redesign",
      description: "Coordinate design, implementation, accessibility checks, and a measured product rollout.",
      category: "Projects",
      tags: ["major-project", "redesign"],
      priority: "high",
      startDate: "2026-12-01",
      dueDate: "2027-01-21",
      subtasks: ["Finalize design system and flows", "Implement the redesigned experience", "Run accessibility and regression tests", "Prepare migration and rollback plans", "Release in stages and review feedback"],
    },
    {
      title: "Complete the professional certification portfolio",
      description: "Assemble the evidence, complete the required assessments, and submit the certification portfolio.",
      category: "Study",
      tags: ["major-project", "certification"],
      priority: "high",
      startDate: "2026-12-10",
      dueDate: "2027-01-26",
      subtasks: ["Review certification requirements", "Collect project evidence", "Complete remaining assessments", "Write portfolio reflections", "Proofread and submit the application"],
    },
    {
      title: "Run the end-to-end security and performance audit",
      description: "Assess the application for security and performance risks, then prioritize and verify fixes.",
      category: "Work",
      tags: ["major-project", "audit"],
      priority: "high",
      startDate: "2027-01-02",
      dueDate: "2027-01-30",
      subtasks: ["Define audit scope and test plan", "Review dependencies and access controls", "Measure critical user journeys", "Fix and retest high-impact findings", "Deliver the audit report and follow-up plan"],
    },
  ];

  return samples.map((sample, index) => {
    const createdAt = new Date(now - (samples.length - index) * 3600000).toISOString();
    return {
      ...sample,
      id: crypto.randomUUID(),
      assignee: "You",
      status: "todo",
      createdAt,
      updatedAt: createdAt,
      completedAt: null,
      subtasks: sample.subtasks.map((title) => ({
        id: createSubtaskId(),
        title,
        completed: false,
      })),
    };
  });
}

function markSampleTasksInitialized() {
  try {
    localStorage.setItem(SAMPLE_TASKS_INITIALIZED_KEY, "true");
  } catch (error) {
    console.error("Unable to save sample task initialization state.", error);
    showToast("Couldn't save task setup. Check your browser storage.");
  }
}

function seedSampleTasks() {
  const sampleTasks = [
    ...createSampleTasks(),
    ...createAdditionalSampleTasks(),
    ...createSeasonalSampleTasks(),
  ];
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(sampleTasks));
    localStorage.setItem(EXTRA_SAMPLE_TASKS_INITIALIZED_KEY, "true");
    localStorage.setItem(SEASONAL_SAMPLE_TASKS_INITIALIZED_KEY, "true");
  } catch (error) {
    console.error("Unable to save sample tasks.", error);
    showToast("Couldn't save sample tasks. Check your browser storage.");
  }
  markSampleTasksInitialized();
  return sampleTasks;
}

function loadTasks() {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved === null) {
      return localStorage.getItem(SAMPLE_TASKS_INITIALIZED_KEY) === "true"
        ? []
        : seedSampleTasks();
    }
    const parsed = JSON.parse(saved);
    if (!Array.isArray(parsed) || parsed.some((task) =>
      !task || typeof task.id !== "string" || typeof task.title !== "string" ||
      !["todo", "in-progress", "completed"].includes(task.status) ||
      (task.priority != null && !["high", "medium", "low"].includes(task.priority)) ||
      typeof task.createdAt !== "string" ||
      (task.dueDate != null && typeof task.dueDate !== "string") ||
      (task.startDate != null && typeof task.startDate !== "string") ||
      (task.assignee != null && typeof task.assignee !== "string") ||
      (task.startDate != null && typeof task.startDate !== "string") ||
      (task.assignee != null && typeof task.assignee !== "string") ||
      (task.description != null && typeof task.description !== "string") ||
      (task.updatedAt != null && typeof task.updatedAt !== "string") ||
      (task.completedAt != null && typeof task.completedAt !== "string") ||
      (task.category != null && (typeof task.category !== "string" || task.category.length > 40)) ||
      (task.tags != null && (!Array.isArray(task.tags) || task.tags.length > 20 ||
        task.tags.some((tag) => typeof tag !== "string" || !tag.trim() || tag.length > 30))) ||
      (task.subtasks != null && (!Array.isArray(task.subtasks) || task.subtasks.length > 50 ||
        task.subtasks.some((subtask) => !subtask || typeof subtask.id !== "string" ||
          typeof subtask.title !== "string" || !subtask.title.trim() ||
          typeof subtask.completed !== "boolean")))
    )) {
      throw new Error("Saved task data has an invalid format.");
    }
    if (parsed.length === 0 &&
      localStorage.getItem(SAMPLE_TASKS_INITIALIZED_KEY) !== "true") {
      return seedSampleTasks();
    }
    if (parsed.length === 0) {
      if (localStorage.getItem(EXTRA_SAMPLE_TASKS_INITIALIZED_KEY) !== "true") {
        localStorage.setItem(EXTRA_SAMPLE_TASKS_INITIALIZED_KEY, "true");
      }
      if (localStorage.getItem(SEASONAL_SAMPLE_TASKS_INITIALIZED_KEY) !== "true") {
        localStorage.setItem(SEASONAL_SAMPLE_TASKS_INITIALIZED_KEY, "true");
      }
      return [];
    }
    if (parsed.length > 0 &&
      localStorage.getItem(SAMPLE_TASKS_INITIALIZED_KEY) !== "true") {
      markSampleTasksInitialized();
    }
    const normalizedTasks = parsed.map((task) => {
      return {
        ...task,
        description: task.description || "",
        priority: task.priority || "medium",
        dueDate: task.dueDate || null,
        startDate: task.startDate || null,
        assignee: task.assignee || "",
        category: task.category || "",
        tags: task.tags || [],
        updatedAt: task.updatedAt || task.createdAt,
        completedAt: task.completedAt || null,
        subtasks: task.subtasks || [],
      };
    });
    let tasksToLoad = normalizedTasks;
    if (localStorage.getItem(EXTRA_SAMPLE_TASKS_INITIALIZED_KEY) !== "true") {
      const additionalTasks = createAdditionalSampleTasks(Math.max(0, 36 - normalizedTasks.length));
      if (additionalTasks.length === 0) {
        localStorage.setItem(EXTRA_SAMPLE_TASKS_INITIALIZED_KEY, "true");
      } else {
        tasksToLoad = [...tasksToLoad, ...additionalTasks];
        try {
          localStorage.setItem(STORAGE_KEY, JSON.stringify(tasksToLoad));
          localStorage.setItem(EXTRA_SAMPLE_TASKS_INITIALIZED_KEY, "true");
        } catch (error) {
          console.error("Unable to save additional sample tasks.", error);
          showToast("Couldn't add sample tasks. Check your browser storage.");
        }
      }
    }
    if (localStorage.getItem(SEASONAL_SAMPLE_TASKS_INITIALIZED_KEY) !== "true") {
      const existingTitles = new Set(tasksToLoad.map((task) => task.title));
      const seasonalTasks = createSeasonalSampleTasks()
        .filter((task) => !existingTitles.has(task.title));
      if (seasonalTasks.length === 0) {
        localStorage.setItem(SEASONAL_SAMPLE_TASKS_INITIALIZED_KEY, "true");
      } else {
        tasksToLoad = [...tasksToLoad, ...seasonalTasks];
        try {
          localStorage.setItem(STORAGE_KEY, JSON.stringify(tasksToLoad));
          localStorage.setItem(SEASONAL_SAMPLE_TASKS_INITIALIZED_KEY, "true");
        } catch (error) {
          console.error("Unable to save seasonal sample tasks.", error);
          showToast("Couldn't add seasonal tasks. Check your browser storage.");
        }
      }
    }
    return tasksToLoad;
  } catch (error) {
    console.error("Unable to load saved tasks.", error);
    showToast("Couldn't load saved tasks. Check your browser storage.");
    return [];
  }
}

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

function formatDate(value) {
  if (!value) return "No due date";
  const [year, month, day] = value.split("-").map(Number);
  return new Date(year, month - 1, day).toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" });
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

function formatShortDate(value) {
  if (!value) return "—";
  const [year, month, day] = value.split("-").map(Number);
  return new Date(year, month - 1, day).toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" });
}

function createSubtaskId() {
  return crypto.randomUUID();
}

function getSubtaskCounts(task) {
  const subtasks = task.subtasks || [];
  return {
    total: subtasks.length,
    completed: subtasks.filter((subtask) => subtask.completed).length,
  };
}

function parseTaskTags(value) {
  const tags = [...new Set(value.split(",").map((tag) => tag.trim()).filter(Boolean))];
  if (tags.length > 20 || tags.some((tag) => tag.length > 30)) {
    showToast("Use up to 20 tags, with a maximum of 30 characters each.");
    elements.tags.focus();
    return null;
  }
  return tags;
}

function createCategoryBadge(category, className = "task-category-badge") {
  if (!category) return null;
  const badge = document.createElement("span");
  const categorySlug = category.trim().toLowerCase().replace(/[^a-z0-9]+/g, "-");
  badge.className = `${className} task-category-${categorySlug}`;
  badge.textContent = category;
  return badge;
}

function getTagColorClass(tag) {
  const hash = [...tag].reduce((value, character) => (value * 31 + character.charCodeAt(0)) >>> 0, 0);
  return `task-tag-color-${hash % 6}`;
}

function createTagBadges(tags, className = "task-tag-list") {
  const container = document.createElement("div");
  container.className = className;
  for (const tag of tags || []) {
    const badge = document.createElement("span");
    badge.className = `task-tag-badge ${getTagColorClass(tag)}`;
    badge.textContent = tag;
    container.append(badge);
  }
  return container;
}

function createSubtaskProgress(task, className = "task-subtask-progress") {
  const { total, completed } = getSubtaskCounts(task);
  if (total === 0) return null;
  const progress = document.createElement("span");
  progress.className = className;
  progress.textContent = `${completed}/${total} steps`;
  progress.setAttribute("aria-label", `${completed} of ${total} subtasks completed`);
  return progress;
}

function createTableSubtaskProgress(task) {
  const cell = document.createElement("td");
  cell.className = "task-subtask-cell";
  const subtasks = task.subtasks || [];
  if (subtasks.length === 0) {
    cell.classList.add("task-muted-cell");
    cell.textContent = "—";
    return cell;
  }

  const completed = subtasks.filter((subtask) => subtask.completed).length;
  const summary = document.createElement("div");
  summary.className = "task-table-subtask-summary";
  summary.textContent = `${completed}/${subtasks.length}`;
  summary.setAttribute("aria-label", `${completed} of ${subtasks.length} subtasks completed`);
  summary.title = subtasks.map((subtask) => `${subtask.completed ? "✓" : "○"} ${subtask.title}`).join("\n");

  const progress = document.createElement("span");
  progress.className = "task-table-subtask-track";
  progress.setAttribute("aria-hidden", "true");
  const fill = document.createElement("span");
  fill.className = "task-table-subtask-fill";
  fill.style.width = `${(completed / subtasks.length) * 100}%`;
  progress.append(fill);

  const indicator = document.createElement("div");
  indicator.className = "task-table-subtask-indicator";
  indicator.append(summary, progress);
  cell.append(indicator);
  return cell;
}

function renderEditorSubtasks() {
  elements.subtaskEditorList.replaceChildren();
  for (const [index, subtask] of editorSubtasks.entries()) {
    const item = document.createElement("li");
    item.className = "subtask-editor-item";
    const checkbox = document.createElement("input");
    checkbox.type = "checkbox";
    checkbox.checked = subtask.completed;
    checkbox.setAttribute("aria-label", `Mark ${subtask.title} ${subtask.completed ? "incomplete" : "complete"}`);
    checkbox.addEventListener("change", () => {
      editorSubtasks[index].completed = checkbox.checked;
      title.classList.toggle("is-completed", checkbox.checked);
    });
    const title = document.createElement("span");
    title.textContent = subtask.title;
    if (subtask.completed) title.classList.add("is-completed");
    const remove = document.createElement("button");
    remove.type = "button";
    remove.className = "subtask-remove-button";
    remove.textContent = "Remove";
    remove.setAttribute("aria-label", `Remove ${subtask.title}`);
    remove.addEventListener("click", () => {
      editorSubtasks = editorSubtasks.filter((itemToKeep) => itemToKeep.id !== subtask.id);
      renderEditorSubtasks();
      elements.subtaskTitle.focus();
    });
    item.append(checkbox, title, remove);
    elements.subtaskEditorList.append(item);
  }
  elements.addSubtask.disabled = editorSubtasks.length >= 50;
  elements.subtaskTitle.disabled = editorSubtasks.length >= 50;
}

function addEditorSubtask() {
  const title = elements.subtaskTitle.value.trim();
  if (!title) {
    elements.subtaskTitle.focus();
    return;
  }
  if (editorSubtasks.length >= 50) {
    showToast("A task can have up to 50 subtasks.");
    return;
  }
  editorSubtasks.push({ id: createSubtaskId(), title, completed: false });
  elements.subtaskTitle.value = "";
  renderEditorSubtasks();
  elements.subtaskTitle.focus();
}

function renderDetailsSubtasks(task) {
  const { total, completed } = getSubtaskCounts(task);
  elements.detailsSubtaskProgress.textContent = total ? `${completed} of ${total} complete` : "";
  elements.detailsSubtaskList.replaceChildren();
  if (total === 0) {
    const empty = document.createElement("p");
    empty.className = "details-subtask-empty";
    empty.textContent = "No steps added yet. Edit this task to add a checklist.";
    elements.detailsSubtaskList.append(empty);
    return;
  }
  for (const subtask of task.subtasks) {
    const item = document.createElement("label");
    item.className = `details-subtask-item${subtask.completed ? " is-completed" : ""}`;
    const checkbox = document.createElement("input");
    checkbox.type = "checkbox";
    checkbox.checked = subtask.completed;
    checkbox.setAttribute("aria-label", `Mark ${subtask.title} ${subtask.completed ? "incomplete" : "complete"}`);
    checkbox.addEventListener("change", () => toggleTaskSubtask(task, subtask, checkbox));
    const title = document.createElement("span");
    title.textContent = subtask.title;
    item.append(checkbox, title);
    elements.detailsSubtaskList.append(item);
  }
}

function toggleTaskSubtask(task, subtask, checkbox) {
  const previousCompleted = subtask.completed;
  const previousUpdatedAt = task.updatedAt;
  subtask.completed = checkbox.checked;
  task.updatedAt = new Date().toISOString();
  if (!saveTasks()) {
    subtask.completed = previousCompleted;
    task.updatedAt = previousUpdatedAt;
    checkbox.checked = previousCompleted;
    return;
  }
  checkbox.closest(".details-subtask-item").classList.toggle("is-completed", subtask.completed);
  const { total, completed } = getSubtaskCounts(task);
  elements.detailsSubtaskProgress.textContent = `${completed} of ${total} complete`;
  renderTasks();
}

function renderTasks() {
  elements.count.textContent = `${tasks.length} ${tasks.length === 1 ? "task" : "tasks"}`;
  elements.list.replaceChildren();
  elements.kanban.replaceChildren();
  const pageCount = Math.ceil(tasks.length / TASKS_PER_PAGE);
  currentTaskPage = Math.min(currentTaskPage, Math.max(pageCount - 1, 0));
  elements.pagination.hidden = pageCount <= 1;
  elements.previousPage.disabled = currentTaskPage === 0;
  elements.nextPage.disabled = currentTaskPage >= pageCount - 1;
  elements.pageIndicator.textContent = pageCount > 0
    ? `Page ${currentTaskPage + 1} of ${pageCount}`
    : "";

  if (tasks.length === 0) {
    if (activeView === "kanban") {
      renderKanban([]);
      return;
    }
    const empty = document.createElement("div");
    empty.className = "task-empty-state";
    const title = document.createElement("strong");
    title.textContent = "No tasks yet";
    const detail = document.createElement("span");
    detail.textContent = "Select New task to create your first one.";
    empty.append(title, detail);
    const row = document.createElement("tr");
    const cell = document.createElement("td");
    cell.colSpan = 11;
    cell.append(empty);
    row.append(cell);
    elements.list.append(row);
    return;
  }

  const sortedTasks = [...tasks].sort((a, b) => {
    if (sortPreference === "due-date") {
      return (a.dueDate || "9999-12-31").localeCompare(b.dueDate || "9999-12-31") ||
        b.createdAt.localeCompare(a.createdAt);
    }
    if (sortPreference === "priority") {
      const priorityOrder = { high: 0, medium: 1, low: 2 };
      return priorityOrder[a.priority] - priorityOrder[b.priority] || b.createdAt.localeCompare(a.createdAt);
    }
    if (sortPreference === "title") return a.title.localeCompare(b.title);
    return b.createdAt.localeCompare(a.createdAt);
  });
  const pageTasks = sortedTasks.slice(
    currentTaskPage * TASKS_PER_PAGE,
    (currentTaskPage + 1) * TASKS_PER_PAGE,
  );
  if (activeView === "kanban") renderKanban(pageTasks);
  else renderTable(pageTasks);
}

function createStatusSelect(task) {
  const select = document.createElement("select");
  select.className = `status-select status-${task.status} task-table-status`;
  select.setAttribute("aria-label", `Change status for ${task.title}`);
  for (const [value, label] of Object.entries(STATUS_LABELS)) {
    const option = document.createElement("option");
    option.value = value;
    option.textContent = label;
    option.selected = task.status === value;
    select.append(option);
  }
  select.addEventListener("change", () => updateStatus(task, select));
  return select;
}

function createTaskActions(task) {
  const actions = document.createElement("div");
  actions.className = "task-page-controls";
  const makeButton = (label, className, action) => {
    const button = document.createElement("button");
    button.className = `task-action-button${className ? ` ${className}` : ""}`;
    button.type = "button";
    button.setAttribute("aria-label", `${label} ${task.title}`);
    button.title = label;
    const icons = {
      View: '<svg viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="M2.5 12s3.3-6 9.5-6 9.5 6 9.5 6-3.3 6-9.5 6-9.5-6-9.5-6Z" stroke="currentColor" stroke-width="1.8"/><circle cx="12" cy="12" r="2.5" stroke="currentColor" stroke-width="1.8"/></svg>',
      Edit: '<svg viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="m14 6 4 4M4 20l4.2-.9L19 8.3a2.1 2.1 0 0 0-3-3L5.2 16.1 4 20Z" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/></svg>',
      Delete: '<svg viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="M4 7h16M10 11v6m4-6v6M6 7l1 13h10l1-13M9 7V4h6v3" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/></svg>',
    };
    button.innerHTML = icons[label];
    button.addEventListener("click", action);
    return button;
  };
  actions.append(
    makeButton("View", "", () => viewTask(task)),
    makeButton("Edit", "", () => editTask(task)),
    makeButton("Delete", "danger", () => deleteTask(task)),
  );
  return actions;
}

function renderTable(sortedTasks) {
  for (const task of sortedTasks) {
    const row = document.createElement("tr");
    row.className = "task-table-row";

    const checkCell = document.createElement("td");
    checkCell.className = "task-table-check";
    const complete = document.createElement("input");
    complete.type = "checkbox";
    complete.checked = task.status === "completed";
    complete.setAttribute("aria-label", `Mark ${task.title} ${complete.checked ? "incomplete" : "complete"}`);
    complete.addEventListener("change", () => {
      const select = createStatusSelect(task);
      select.value = complete.checked ? "completed" : "todo";
      updateStatus(task, select);
    });
    checkCell.append(complete);

    const nameCell = document.createElement("td");
    const title = document.createElement("span");
    title.className = "task-table-title";
    title.textContent = task.title;
    title.title = task.title;
    nameCell.append(title);
    if (task.description) {
      const description = document.createElement("span");
      description.className = "task-table-description";
      description.textContent = task.description;
      description.title = task.description;
      nameCell.append(description);
    }
    const subtaskCell = createTableSubtaskProgress(task);
    const categoryCell = document.createElement("td");
    categoryCell.className = "task-category-cell";
    const categoryBadge = createCategoryBadge(task.category);
    if (categoryBadge) categoryCell.append(categoryBadge);
    else {
      categoryCell.classList.add("task-muted-cell");
      categoryCell.textContent = "—";
    }
    const tagsCell = document.createElement("td");
    tagsCell.className = "task-tags-cell";
    const tagBadges = createTagBadges(task.tags);
    if (tagBadges.childElementCount) tagsCell.append(tagBadges);
    else {
      tagsCell.classList.add("task-muted-cell");
      tagsCell.textContent = "—";
    }
    const assigneeCell = document.createElement("td");
    if (task.assignee) {
      const avatar = document.createElement("span");
      avatar.className = "task-assignee";
      avatar.textContent = task.assignee.trim().split(/\s+/).slice(0, 2).map((part) => part[0]).join("").toUpperCase();
      avatar.title = task.assignee;
      avatar.setAttribute("aria-label", task.assignee);
      const assigneeName = document.createElement("span");
      assigneeName.className = "task-assignee-name";
      assigneeName.textContent = task.assignee;
      assigneeCell.className = "task-assignee-cell";
      assigneeCell.append(avatar, assigneeName);
    } else {
      assigneeCell.className = "task-muted-cell";
      assigneeCell.textContent = "—";
    }

    const priorityCell = document.createElement("td");
    const priority = document.createElement("span");
    priority.className = `priority-badge priority-${task.priority}`;
    priority.textContent = PRIORITY_LABELS[task.priority];
    priorityCell.append(priority);

    const startDateCell = document.createElement("td");
    startDateCell.textContent = formatShortDate(task.startDate || task.createdAt.slice(0, 10));
    if (!task.startDate) startDateCell.className = "task-muted-cell";

    const dueDateCell = document.createElement("td");
    dueDateCell.textContent = formatShortDate(task.dueDate);
    if (!task.dueDate) dueDateCell.className = "task-muted-cell";

    const statusCell = document.createElement("td");
    statusCell.append(createStatusSelect(task));

    const actionsCell = document.createElement("td");
    actionsCell.append(createTaskActions(task));
    row.append(checkCell, nameCell, subtaskCell, categoryCell, tagsCell, assigneeCell, priorityCell, startDateCell, dueDateCell, statusCell, actionsCell);
    elements.list.append(row);
  }
}

function renderKanban(sortedTasks) {
  for (const [status, label] of Object.entries(STATUS_LABELS)) {
    const column = document.createElement("section");
    column.className = "task-kanban-column";
    column.dataset.status = status;
    column.setAttribute("aria-label", `${label} tasks`);
    column.addEventListener("dragover", (event) => {
      event.preventDefault();
      column.classList.add("drag-over");
      if (event.dataTransfer) event.dataTransfer.dropEffect = "move";
    });
    column.addEventListener("dragleave", (event) => {
      if (!column.contains(event.relatedTarget)) column.classList.remove("drag-over");
    });
    column.addEventListener("drop", (event) => {
      event.preventDefault();
      column.classList.remove("drag-over");
      const taskId = event.dataTransfer?.getData("text/plain");
      const task = tasks.find((item) => item.id === taskId);
      if (task && task.status !== status) setTaskStatus(task, status);
    });
    const heading = document.createElement("h3");
    const columnTasks = sortedTasks.filter((task) => task.status === status);
    const headingCopy = document.createElement("span");
    headingCopy.className = "task-kanban-heading-copy";
    const headingTitle = document.createElement("strong");
    headingTitle.textContent = label;
    const description = document.createElement("small");
    description.textContent = BOARD_COLUMN_DESCRIPTIONS[status];
    headingCopy.append(headingTitle, description);
    const count = document.createElement("span");
    count.className = "task-kanban-count";
    count.textContent = String(columnTasks.length);
    heading.append(headingCopy, count);
    const cards = document.createElement("div");
    cards.className = "task-kanban-cards";
    cards.setAttribute("aria-label", `${label} task cards`);
    for (const task of columnTasks) {
      const card = document.createElement("article");
      card.className = "task-kanban-card";
      card.draggable = true;
      card.dataset.taskId = task.id;
      card.setAttribute("aria-label", `${task.title}. Drag to move between statuses, or use the status menu.`);
      card.addEventListener("dragstart", (event) => {
        if (!event.dataTransfer) return;
        event.dataTransfer.setData("text/plain", task.id);
        event.dataTransfer.effectAllowed = "move";
        card.classList.add("is-dragging");
      });
      card.addEventListener("dragend", () => {
        card.classList.remove("is-dragging");
        document.querySelectorAll(".task-kanban-column.drag-over").forEach((item) => item.classList.remove("drag-over"));
      });
      const cardHeading = document.createElement("div");
      cardHeading.className = "task-kanban-card-heading";
      const title = document.createElement("strong");
      title.textContent = task.title;
      const priority = document.createElement("span");
      priority.className = `priority-badge priority-${task.priority}`;
      priority.textContent = PRIORITY_LABELS[task.priority];
      cardHeading.append(title, priority);
      card.append(cardHeading);
      const labels = document.createElement("div");
      labels.className = "task-kanban-labels";
      const categoryBadge = createCategoryBadge(task.category);
      if (categoryBadge) labels.append(categoryBadge);
      const tagBadges = createTagBadges(task.tags);
      labels.append(...tagBadges.childNodes);
      if (labels.childElementCount) card.append(labels);
      const subtaskProgress = createSubtaskProgress(task, "task-kanban-subtask-progress");
      if (subtaskProgress) card.append(subtaskProgress);
      if (task.description) {
        const description = document.createElement("p");
        description.textContent = task.description;
        card.append(description);
      }
      const meta = document.createElement("div");
      meta.className = "task-kanban-meta";
      const due = document.createElement("span");
      due.className = task.dueDate ? "task-kanban-deadline" : "task-kanban-deadline is-empty";
      due.textContent = task.dueDate ? `Due ${formatShortDate(task.dueDate)}` : "No deadline";
      meta.append(due);
      if (task.assignee) {
        const assignee = document.createElement("span");
        assignee.className = "task-kanban-assignee";
        assignee.textContent = task.assignee;
        meta.append(assignee);
      }
      const moveSelect = createStatusSelect(task);
      moveSelect.classList.add("task-kanban-status");
      moveSelect.setAttribute("aria-label", `Move ${task.title} to another status`);
      card.append(meta, moveSelect, createTaskActions(task));
      cards.append(card);
    }
    if (columnTasks.length === 0) {
      const empty = document.createElement("p");
      empty.className = "task-kanban-empty";
      empty.textContent = "Drop a task here";
      cards.append(empty);
    }
    column.append(heading, cards);
    elements.kanban.append(column);
  }
}

function viewTask(task) {
  elements.detailsTitle.textContent = task.title;
  elements.detailsDescription.textContent = task.description || "No description provided.";
  elements.detailsCategory.replaceChildren();
  const categoryBadge = createCategoryBadge(task.category);
  if (categoryBadge) elements.detailsCategory.append(categoryBadge);
  else elements.detailsCategory.textContent = "Uncategorized";
  elements.detailsTags.replaceChildren();
  const tagBadges = createTagBadges(task.tags);
  if (tagBadges.childElementCount) elements.detailsTags.append(tagBadges);
  else elements.detailsTags.textContent = "—";
  elements.detailsStatus.textContent = STATUS_LABELS[task.status];
  elements.detailsStatus.className = `task-status-badge status-${task.status}`;
  elements.detailsPriority.textContent = PRIORITY_LABELS[task.priority];
  elements.detailsPriority.className = `priority-badge priority-${task.priority}`;
  elements.detailsAssignee.textContent = task.assignee || "Unassigned";
  elements.detailsStartDate.textContent = formatShortDate(task.startDate);
  elements.detailsDueDate.textContent = task.dueDate ? formatDate(task.dueDate) : "No due date";
  elements.detailsCreatedDate.textContent = formatTimestamp(task.createdAt);
  elements.detailsTitle.dataset.taskId = task.id;
  renderDetailsSubtasks(task);
  elements.detailsDialog.showModal();
}

function setTaskStatus(task, status) {
  const previousStatus = task.status;
  const previousUpdatedAt = task.updatedAt;
  const previousCompletedAt = task.completedAt;
  if (previousStatus === status) return true;
  const now = new Date().toISOString();
  task.status = status;
  task.updatedAt = now;
  task.completedAt = task.status === "completed"
    ? (previousStatus === "completed" ? previousCompletedAt : now)
    : null;
  if (saveTasks()) {
    renderTasks();
    showToast(`Task marked ${STATUS_LABELS[task.status].toLowerCase()}.`);
  } else {
    task.status = previousStatus;
    task.updatedAt = previousUpdatedAt;
    task.completedAt = previousCompletedAt;
    return false;
  }
  return true;
}

function updateStatus(task, select) {
  if (!setTaskStatus(task, select.value)) select.value = task.status;
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

async function deleteTask(task) {
  if (!await confirmDeleteTask(task)) return;
  const previousTasks = tasks;
  tasks = tasks.filter((item) => item.id !== task.id);
  if (saveTasks()) {
    renderTasks();
    showToast("Task deleted.");
  } else {
    tasks = previousTasks;
    renderTasks();
  }
}

function editTask(task) {
  editingTaskId = task.id;
  elements.dialogTitle.textContent = "Edit task";
  elements.submitLabel.textContent = "Save changes";
  elements.title.value = task.title;
  elements.description.value = task.description;
  elements.status.value = task.status;
  elements.category.value = task.category || "";
  elements.tags.value = (task.tags || []).join(", ");
  elements.priority.value = task.priority;
  elements.dueDate.value = task.dueDate || "";
  elements.assignee.value = task.assignee || "";
  elements.startDate.value = task.startDate || "";
  editorSubtasks = task.subtasks.map((subtask) => ({ ...subtask }));
  renderEditorSubtasks();
  elements.dialog.showModal();
  elements.title.focus();
}

function openNewTaskDialog() {
  editingTaskId = null;
  elements.form.reset();
  elements.status.value = "todo";
  elements.priority.value = "medium";
  elements.category.value = "";
  elements.tags.value = "";
  elements.startDate.value = new Date().toISOString().slice(0, 10);
  editorSubtasks = [];
  renderEditorSubtasks();
  elements.dialogTitle.textContent = "Create a task";
  elements.submitLabel.textContent = "Add task";
  elements.dialog.showModal();
  elements.title.focus();
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
    const preference = localStorage.getItem(THEME_STORAGE_KEY);
    if (preference === "system") return THEME_QUERY.matches ? "dark" : "light";
    return preference === "dark" ? "dark" : "light";
  } catch (error) {
    console.error("Unable to load saved theme.", error);
    showToast("Couldn't load your saved theme preference.");
    return "light";
  }
}

function loadSortingPreference() {
  try {
    const saved = localStorage.getItem(SORTING_STORAGE_KEY);
    return ["newest", "due-date", "priority", "title"].includes(saved) ? saved : "newest";
  } catch (error) {
    console.error("Unable to load task sorting preference.", error);
    showToast("Couldn't load your task sorting preference.");
    return "newest";
  }
}

elements.form.addEventListener("submit", (event) => {
  event.preventDefault();
  const title = elements.title.value.trim();
  if (!title) {
    elements.title.focus();
    return;
  }

  const task = tasks.find((item) => item.id === editingTaskId);
  if (editingTaskId && !task) {
    editingTaskId = null;
    showToast("This task is no longer available.");
    return;
  }
  const previousValues = task ? { ...task } : null;
  const tags = parseTaskTags(elements.tags.value);
  if (tags === null) return;
  const now = new Date().toISOString();
  const updatedTask = task || {
    id: crypto.randomUUID(),
    createdAt: now,
  };
  updatedTask.title = title;
  updatedTask.description = elements.description.value.trim();
  updatedTask.assignee = elements.assignee.value.trim();
  updatedTask.category = elements.category.value;
  updatedTask.tags = tags;
  updatedTask.status = elements.status.value;
  updatedTask.priority = elements.priority.value;
  updatedTask.dueDate = elements.dueDate.value || null;
  updatedTask.startDate = elements.startDate.value || null;
  updatedTask.subtasks = editorSubtasks.map((subtask) => ({ ...subtask }));
  updatedTask.updatedAt = now;
  updatedTask.completedAt = updatedTask.status === "completed"
    ? (previousValues?.status === "completed" ? previousValues.completedAt : now)
    : null;
  if (!task) {
    tasks.unshift(updatedTask);
    currentTaskPage = 0;
  }
  if (saveTasks()) {
    elements.form.reset();
    elements.status.value = "todo";
    elements.priority.value = "medium";
    editingTaskId = null;
    elements.dialog.close();
    elements.submitLabel.textContent = "Add task";
    renderTasks();
    elements.title.focus();
    showToast(task ? "Task changes saved." : "Task added to your list.");
  } else {
    if (task && previousValues) Object.assign(task, previousValues);
    else tasks = tasks.filter((item) => item.id !== updatedTask.id);
  }
});

elements.openDialog.addEventListener("click", openNewTaskDialog);
elements.previousPage.addEventListener("click", () => {
  if (currentTaskPage === 0) return;
  currentTaskPage -= 1;
  renderTasks();
});
elements.nextPage.addEventListener("click", () => {
  const pageCount = Math.ceil(tasks.length / TASKS_PER_PAGE);
  if (currentTaskPage >= pageCount - 1) return;
  currentTaskPage += 1;
  renderTasks();
});
elements.addSubtask.addEventListener("click", addEditorSubtask);
elements.subtaskTitle.addEventListener("keydown", (event) => {
  if (event.key === "Enter") {
    event.preventDefault();
    addEditorSubtask();
  }
});
document.querySelectorAll(".task-view-tab").forEach((tab) => {
  tab.addEventListener("click", () => {
    activeView = tab.dataset.view;
    document.querySelectorAll(".task-view-tab").forEach((item) => {
      const selected = item === tab;
      item.classList.toggle("active", selected);
      item.setAttribute("aria-selected", String(selected));
      item.tabIndex = selected ? 0 : -1;
    });
    elements.viewContent.setAttribute("aria-labelledby", tab.id);
    elements.viewContent.dataset.view = activeView;
    elements.table.hidden = activeView !== "table";
    elements.kanban.hidden = activeView !== "kanban";
    renderTasks();
  });
});
elements.exportButton.addEventListener("click", () => {
  if (tasks.length === 0) {
    showToast("There are no tasks to export yet.");
    return;
  }
  const columns = ["Task name", "Description", "Subtasks", "Category", "Tags", "Assignee", "Priority", "Start date", "Due date", "Status", "Created"];
  const escapeCsv = (value) => `"${String(value ?? "").replaceAll('"', '""')}"`;
  const rows = tasks.map((task) => [
    task.title,
    task.description,
    (task.subtasks || []).map((subtask) => `${subtask.completed ? "[x]" : "[ ]"} ${subtask.title}`).join("; "),
    task.category,
    (task.tags || []).join(", "),
    task.assignee,
    PRIORITY_LABELS[task.priority],
    task.startDate,
    task.dueDate,
    STATUS_LABELS[task.status],
    task.createdAt,
  ]);
  const csv = [columns, ...rows].map((row) => row.map(escapeCsv).join(",")).join("\r\n");
  const url = URL.createObjectURL(new Blob(["\uFEFF", csv], { type: "text/csv;charset=utf-8" }));
  const link = document.createElement("a");
  link.href = url;
  link.download = "plannix-tasks.csv";
  link.click();
  window.setTimeout(() => URL.revokeObjectURL(url), 1000);
  showToast("Task data exported.");
});
elements.closeDialog.addEventListener("click", () => elements.dialog.close());
elements.cancelDialog.addEventListener("click", () => elements.dialog.close());
elements.dialog.addEventListener("click", (event) => {
  if (event.target === elements.dialog) elements.dialog.close();
});
elements.dialog.addEventListener("close", () => {
  editingTaskId = null;
  elements.form.reset();
  editorSubtasks = [];
  renderEditorSubtasks();
  elements.dialogTitle.textContent = "Create a task";
  elements.submitLabel.textContent = "Add task";
});

elements.closeDetails.addEventListener("click", () => elements.detailsDialog.close());
elements.closeDetailsAction.addEventListener("click", () => elements.detailsDialog.close());
elements.detailsDialog.addEventListener("click", (event) => {
  if (event.target === elements.detailsDialog) elements.detailsDialog.close();
});

const sidebarFrame = document.querySelector(".sidebar-frame");
const updateSidebarLayout = () => {
  const sidebarDocument = sidebarFrame.contentDocument;
  if (sidebarDocument?.body) {
    sidebarDocument.body.classList.toggle("compact-sidebar", window.innerWidth <= 760);
  }
};
sidebarFrame.addEventListener("load", () => {
  updateSidebarLayout();
  applyTheme(document.documentElement.dataset.theme || "light");
});
document.querySelector(".header-frame").addEventListener("load", () => applyTheme(document.documentElement.dataset.theme || "light"));
window.addEventListener("resize", updateSidebarLayout);
window.addEventListener("storage", (event) => {
  if (event.key === STORAGE_KEY) {
    tasks = loadTasks();
    renderTasks();
    if (elements.detailsDialog.open) {
      const activeTask = tasks.find((task) => task.id === elements.detailsTitle.dataset.taskId);
      if (activeTask) renderDetailsSubtasks(activeTask);
      else elements.detailsDialog.close();
    }
  } else if (event.key === THEME_STORAGE_KEY) {
    const preference = event.newValue;
    applyTheme(preference === "system"
      ? (THEME_QUERY.matches ? "dark" : "light")
      : preference === "dark" ? "dark" : "light");
  } else if (event.key === SORTING_STORAGE_KEY) {
    sortPreference = ["newest", "due-date", "priority", "title"].includes(event.newValue)
      ? event.newValue
      : "newest";
    renderTasks();
  }
});
THEME_QUERY.addEventListener("change", () => {
  if (localStorage.getItem(THEME_STORAGE_KEY) === "system") applyTheme(THEME_QUERY.matches ? "dark" : "light");
});

tasks = loadTasks();
sortPreference = loadSortingPreference();
applyTheme(loadTheme());
renderTasks();
updateSidebarLayout();
