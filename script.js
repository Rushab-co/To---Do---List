const STORAGE_KEY = 'questlog.tasksByDate';
const STATS_KEY = 'questlog.stats';

const BADGES = [
  { id: 'first_quest', icon: '🌱', name: 'First task', check: s => s.totalCompleted >= 1 },
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
let currentTab = 'incomplete'; // 'incomplete' or 'history'

const el = {
  datePicker: document.getElementById('datePicker'),
  dateReadable: document.getElementById('dateReadable'),
  prevDay: document.getElementById('prevDay'),
  nextDay: document.getElementById('nextDay'),
  todayBtn: document.getElementById('todayBtn'),
  taskForm: document.getElementById('taskForm'),
  taskInput: document.getElementById('taskInput'),
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
  
  // Tabs
  tabIncomplete: document.getElementById('tabIncomplete'),
  tabHistory: document.getElementById('tabHistory'),
  tabIndicator: document.getElementById('tabIndicator'),
  incompleteBadge: document.getElementById('incompleteBadge'),
  historyBadge: document.getElementById('historyBadge'),
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

function updateTabsUI() {
  if (currentTab === 'incomplete') {
    el.tabIncomplete.classList.add('active');
    el.tabHistory.classList.remove('active');
    el.tabIndicator.style.transform = 'translateY(0)';
    el.tabIndicator.style.height = el.tabIncomplete.offsetHeight + 'px';
  } else {
    el.tabIncomplete.classList.remove('active');
    el.tabHistory.classList.add('active');
    
    // Calculate offset for indicator
    const offset = el.tabHistory.offsetTop - el.tabIncomplete.offsetTop;
    el.tabIndicator.style.transform = `translateY(${offset}px)`;
    el.tabIndicator.style.height = el.tabHistory.offsetHeight + 'px';
  }
}

function renderTasks() {
  const allTasks = getTasksFor(currentDate);
  const incompleteTasks = allTasks.filter(t => !t.done);
  const historyTasks = allTasks.filter(t => t.done);
  
  // Update badges
  el.incompleteBadge.textContent = incompleteTasks.length;
  el.historyBadge.textContent = historyTasks.length;
  
  // Determine which list to show
  const displayTasks = currentTab === 'incomplete' ? incompleteTasks : historyTasks;
  
  el.taskList.innerHTML = '';
  el.emptyState.hidden = displayTasks.length > 0;
  
  // Update empty state text based on tab
  if (displayTasks.length === 0) {
    const emptyTitle = el.emptyState.querySelector('.empty-text');
    const emptySub = el.emptyState.querySelector('.empty-sub');
    if (currentTab === 'incomplete') {
      emptyTitle.textContent = allTasks.length > 0 ? 'All caught up!' : 'Nothing here yet.';
      emptySub.textContent = allTasks.length > 0 ? 'You finished all your tasks for this day.' : 'Your tasks will appear here.';
      el.emptyState.querySelector('.empty-icon').textContent = allTasks.length > 0 ? '🎉' : '✨';
    } else {
      emptyTitle.textContent = 'No history yet.';
      emptySub.textContent = 'Completed tasks will appear here.';
      el.emptyState.querySelector('.empty-icon').textContent = '🕰️';
    }
  }

  displayTasks.forEach(task => {
    const li = document.createElement('li');
    li.className = 'task-item' + (task.done ? ' done' : '');

    const check = document.createElement('button');
    check.className = 'task-check';
    check.setAttribute('aria-label', task.done ? 'Mark as not done' : 'Mark as done');
    check.innerHTML = task.done ? '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"></polyline></svg>' : '';
    check.addEventListener('click', () => toggleTask(task.id));

    const text = document.createElement('span');
    text.className = 'task-text';
    text.textContent = task.text;

    const del = document.createElement('button');
    del.className = 'task-delete';
    del.setAttribute('aria-label', 'Delete task');
    del.innerHTML = '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>';
    del.addEventListener('click', () => deleteTask(task.id));

    li.append(check, text, del);
    el.taskList.appendChild(li);
  });

  const done = historyTasks.length;
  const total = allTasks.length;
  const pct = total === 0 ? 0 : Math.round((done / total) * 100);
  el.progressFill.style.width = pct + '%';
  el.progressLabel.textContent = `${done} / ${total} done`;
  
  // Ensure indicator is properly sized after fonts might have loaded
  setTimeout(updateTabsUI, 50);
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
    showToast('Task complete! 🚀');
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

function addTask(text) {
  const tasks = getTasksFor(currentDate);
  tasks.push({ id: Date.now() + '-' + Math.random().toString(36).slice(2, 7), text, done: false });
  tasksByDate[currentDate] = tasks;
  saveTasks(tasksByDate);
  
  // Auto switch to incomplete tab when adding a new task
  if (currentTab !== 'incomplete') {
    currentTab = 'incomplete';
    updateTabsUI();
  }
  
  renderTasks();
  showToast('Task added ⚔️');
}

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
      showToast('Badge unlocked: ' + badge.name + ' ' + badge.icon);
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
  toastTimer = setTimeout(() => { el.toast.hidden = true; }, 3000);
}

// Event listeners
el.taskForm.addEventListener('submit', e => {
  e.preventDefault();
  const text = el.taskInput.value.trim();
  if (!text) return;
  addTask(text);
  el.taskInput.value = '';
  el.taskInput.focus();
});

el.datePicker.addEventListener('change', () => {
  currentDate = el.datePicker.value;
  renderDate();
  renderTasks();
});

const calendarBtn = document.getElementById('calendarBtn');
if (calendarBtn) {
  calendarBtn.addEventListener('click', () => {
    if (el.datePicker.showPicker) {
      el.datePicker.showPicker();
    }
  });
}

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

// Tab listeners
el.tabIncomplete.addEventListener('click', () => {
  currentTab = 'incomplete';
  updateTabsUI();
  renderTasks();
});

el.tabHistory.addEventListener('click', () => {
  currentTab = 'history';
  updateTabsUI();
  renderTasks();
});

window.addEventListener('resize', () => {
  updateTabsUI();
});

// Init
recomputeStreak();
saveStats(stats);
renderDate();
updateTabsUI();
renderTasks();
renderStats();
renderBadges();
