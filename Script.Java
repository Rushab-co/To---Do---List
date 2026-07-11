const STORAGE_KEY = 'questlog.tasksByDate';
const STATS_KEY = 'questlog.stats';

const BADGES = [
  { id: 'first_quest', icon: '🌱', name: 'First quest', check: s => s.totalCompleted >= 1 },
  { id: 'ten_done', icon: '📜', name: '10 completed', check: s => s.totalCompleted >= 10 },
  { id: 'fifty_done', icon: '🏛️', name: '50 completed', check: s => s.totalCompleted >= 50 },
  { id: 'hundred_done', icon: '👑', name: '100 completed', check: s => s.totalCompleted >= 100 },
  { id: 'streak_3', icon: '🔥', name: '3 day streak', check: s => s.bestStreak >= 3 },
  { id: 'streak_7', icon: '⚡', name: '7 day streak', check: s => s.bestStreak >= 7 },
  { id: 'streak_30', icon: '🏆', name: '30 day streak', check: s => s.bestStreak >= 30 },
  { id: 'perfect_day', icon: '✨', name: 'Perfect day', check: s => s.perfectDays >= 1 },
  { id: 'perfect_5', icon: '💎', name: '5 perfect days', check: s => s.perfectDays >= 5 },
];

function loadTasks() {
  try { return JSON.parse(localStorage.getItem(STORAGE_KEY)) || {}; }
  catch { return {}; }
}

function saveTasks(data) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
}

function loadStats() {
  try {
    return JSON.parse(localStorage.getItem(STATS_KEY)) || {
      currentStreak: 0, bestStreak: 0, totalCompleted: 0,
      perfectDays: 0, lastPerfectDate: null, earnedBadges: []
    };
  } catch {
    return { currentStreak: 0, bestStreak: 0, totalCompleted: 0, perfectDays: 0, lastPerfectDate: null, earnedBadges: [] };
  }
}

function saveStats(stats) {
  localStorage.setItem(STATS_KEY, JSON.stringify(stats));
}

let tasksByDate = loadTasks();
let stats = loadStats();
let currentDate = formatDate(new Date());

const el = {
  datePicker: document.getElementById('datePicker'),
  dateReadable: document.getElementById('dateReadable'),
  prevDay: document.getElementById('prevDay'),
  nextDay: document.getElementById('nextDay'),
  todayBtn: document.getElementById('todayBtn'),
  taskForm: document.getElementById('taskForm'),
  taskInput: document.getElementById('taskInput'),
  taskPriority: document.getElementById('taskPriority'),
  taskList: document.getElementById('taskList'),
  emptyState: document.getElementById('emptyState'),
  progressFill: document.getElementById('progressFill'),
  progressLabel: document.getElementById('progressLabel'),
  streakCount: document.getElementById('streakCount'),
  flameIcon: document.getElementById('flameIcon'),
  currentStreakVal: document.getElementById('currentStreakVal'),
  bestStreakVal: document.getElementById('bestStreakVal'),
  totalDoneVal: document.getElementById('totalDoneVal'),
  badgeGrid: document.getElementById('badgeGrid'),
  toast: document.getElementById('toast'),
};

function formatDate(d) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

function readableDate(dateStr) {
  const d = new Date(dateStr + 'T00:00:00');
  const today = formatDate(new Date());
  const yestDate = new Date();
  yestDate.setDate(yestDate.getDate() - 1);
  const yesterday = formatDate(yestDate);
  const tmrDate = new Date();
  tmrDate.setDate(tmrDate.getDate() + 1);
  const tomorrow = formatDate(tmrDate);

  if (dateStr === today) return 'Today';
  if (dateStr === yesterday) return 'Yesterday';
  if (dateStr === tomorrow) return 'Tomorrow';

  return d.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' });
}

function getTasksFor(dateStr) {
  return tasksByDate[dateStr] || [];
}

function renderDate() {
  el.datePicker.value = currentDate;
  el.dateReadable.textContent = readableDate(currentDate);
}

function renderTasks() {
  const tasks = getTasksFor(currentDate);
  el.taskList.innerHTML = '';
  el.emptyState.hidden = tasks.length > 0;

  tasks.forEach(task => {
    const li = document.createElement('li');
    li.className = 'task-item' + (task.done ? ' done' : '');

    const check = document.createElement('button');
    check.className = 'task-check';
    check.setAttribute('aria-label', task.done ? 'Mark as not done' : 'Mark as done');
    check.textContent = task.done ? '✓' : '';
    check.addEventListener('click', () => toggleTask(task.id));

    const text = document.createElement('span');
    text.className = 'task-text';
    text.textContent = task.text;

    const priority = document.createElement('span');
    priority.className = 'task-priority priority-' + task.priority;
    priority.textContent = task.priority;

    const del = document.createElement('button');
    del.className = 'task-delete';
    del.setAttribute('aria-label', 'Delete quest');
    del.textContent = '✕';
    del.addEventListener('click', () => deleteTask(task.id));

    li.append(check, text, priority, del);
    el.taskList.appendChild(li);
  });

  const done = tasks.filter(t => t.done).length;
  const total = tasks.length;
  const pct = total === 0 ? 0 : Math.round((done / total) * 100);
  el.progressFill.style.width = pct + '%';
  el.progressLabel.textContent = `${done} / ${total} done`;
}

function toggleTask(id) {
  const tasks = getTasksFor(currentDate);
  const task = tasks.find(t => t.id === id);
  if (!task) return;
  task.done = !task.done;
  tasksByDate[currentDate] = tasks;
  saveTasks(tasksByDate);

  if (task.done) {
    stats.totalCompleted += 1;
    showToast('Quest complete');
  } else {
    stats.totalCompleted = Math.max(0, stats.totalCompleted - 1);
  }

  recomputeStreak();
  saveStats(stats);
  renderTasks();
  renderStats();
  renderBadges();
}

function deleteTask(id) {
  const tasks = getTasksFor(currentDate).filter(t => t.id !== id);
  tasksByDate[currentDate] = tasks;
  saveTasks(tasksByDate);
  recomputeStreak();
  saveStats(stats);
  renderTasks();
  renderStats();
  renderBadges();
}

function addTask(text, priority) {
  const tasks = getTasksFor(currentDate);
  tasks.push({ id: Date.now() + '-' + Math.random().toString(36).slice(2, 7), text, priority, done: false });
  tasksByDate[currentDate] = tasks;
  saveTasks(tasksByDate);
  renderTasks();
}

// Streak = consecutive days (ending today or yesterday) where every day
// has at least one task and all tasks on that day are completed.
function recomputeStreak() {
  const todayStr = formatDate(new Date());
  const isPerfectDay = (dateStr) => {
    const tasks = getTasksFor(dateStr);
    return tasks.length > 0 && tasks.every(t => t.done);
  };

  // count perfect days total (for badge)
  let perfectDays = 0;
  Object.keys(tasksByDate).forEach(dateStr => {
    if (isPerfectDay(dateStr)) perfectDays += 1;
  });
  stats.perfectDays = perfectDays;

  // walk backwards from today
  let streak = 0;
  let cursor = new Date(todayStr + 'T00:00:00');

  if (!isPerfectDay(formatDate(cursor))) {
    cursor.setDate(cursor.getDate() - 1);
  }

  while (isPerfectDay(formatDate(cursor))) {
    streak += 1;
    cursor.setDate(cursor.getDate() - 1);
  }

  stats.currentStreak = streak;
  stats.bestStreak = Math.max(stats.bestStreak, streak);
}

function renderStats() {
  el.streakCount.textContent = stats.currentStreak;
  el.currentStreakVal.textContent = stats.currentStreak;
  el.bestStreakVal.textContent = stats.bestStreak;
  el.totalDoneVal.textContent = stats.totalCompleted;
  el.flameIcon.classList.toggle('active', stats.currentStreak > 0);
}

function renderBadges() {
  el.badgeGrid.innerHTML = '';
  BADGES.forEach(badge => {
    const earned = badge.check(stats);
    if (earned && !stats.earnedBadges.includes(badge.id)) {
      stats.earnedBadges.push(badge.id);
      showToast('Badge unlocked: ' + badge.name);
    }
    const div = document.createElement('div');
    div.className = 'badge' + (earned ? ' earned' : '');
    div.innerHTML = `<span class="badge-icon">${badge.icon}</span><span class="badge-name">${badge.name}</span>`;
    el.badgeGrid.appendChild(div);
  });
  saveStats(stats);
}

let toastTimer = null;
function showToast(msg) {
  el.toast.textContent = msg;
  el.toast.hidden = false;
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => { el.toast.hidden = true; }, 2200);
}

// Event listeners
el.taskForm.addEventListener('submit', e => {
  e.preventDefault();
  const text = el.taskInput.value.trim();
  if (!text) return;
  addTask(text, el.taskPriority.value);
  el.taskInput.value = '';
  el.taskInput.focus();
});

el.datePicker.addEventListener('change', () => {
  currentDate = el.datePicker.value;
  renderDate();
  renderTasks();
});

el.prevDay.addEventListener('click', () => {
  const d = new Date(currentDate + 'T00:00:00');
  d.setDate(d.getDate() - 1);
  currentDate = formatDate(d);
  renderDate();
  renderTasks();
});

el.nextDay.addEventListener('click', () => {
  const d = new Date(currentDate + 'T00:00:00');
  d.setDate(d.getDate() + 1);
  currentDate = formatDate(d);
  renderDate();
  renderTasks();
});

el.todayBtn.addEventListener('click', () => {
  currentDate = formatDate(new Date());
  renderDate();
  renderTasks();
});

// Init
recomputeStreak();
saveStats(stats);
renderDate();
renderTasks();
renderStats();
renderBadges();