const dbKey = 'attendancePortalDB_v1';
const tokenKey = 'attendancePortalToken';

const defaultSubjects = [
  'Discrete Mathematics',
  'Programming Fundamentals',
  'Digital Logic Design',
  'ICT',
  'Linear Algebra',
  'Islamic Studies'
];

const defaultStudents = Array.from({ length: 57 }, (_, i) => ({
  id: `${2540104 + i}`,
  name: i === 0 ? 'Umer Ilyas' : i === 1 ? 'Muhammad Aazmeer' : `Student ${i + 1}`,
  rollNumber: `BSCS-${String(i + 1).padStart(3, '0')}`,
  department: 'BS Computer Science',
  semester: '5th'
}));

const state = {
  db: null,
  currentView: 'dashboard',
  currentSubject: '',
  attendanceDate: new Date().toISOString().slice(0, 10),
  reports: [],
  charts: {}
};

function saveDB() { localStorage.setItem(dbKey, JSON.stringify(state.db)); }
function getDB() { return JSON.parse(localStorage.getItem(dbKey)); }

async function hashPassword(password, salt = crypto.randomUUID()) {
  const data = new TextEncoder().encode(`${salt}:${password}`);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  const hashHex = hashArray.map((b) => b.toString(16).padStart(2, '0')).join('');
  return { salt, hash: hashHex };
}

function createToken(user) {
  const payload = { email: user.email, role: user.role, ts: Date.now() };
  return btoa(JSON.stringify(payload));
}

function parseToken(token) {
  try { return JSON.parse(atob(token)); } catch { return null; }
}

async function initDB() {
  let db = getDB();
  if (!db) {
    const adminPass = await hashPassword('Admin@123');
    db = {
      users: [{ email: 'teacher@bscs.edu', name: 'Admin Teacher', role: 'admin', ...adminPass }],
      subjects: defaultSubjects.map((name, idx) => ({ id: idx + 1, name })),
      students: defaultStudents,
      attendanceRecords: []
    };
    localStorage.setItem(dbKey, JSON.stringify(db));
  }
  state.db = db;
}

function authGuard() {
  const token = localStorage.getItem(tokenKey);
  const payload = parseToken(token || '');
  if (!payload || !['admin', 'teacher'].includes(payload.role)) {
    showLogin();
    return null;
  }
  return payload;
}

function showLogin() {
  document.getElementById('loginView').classList.remove('hidden');
  document.getElementById('portalView').classList.add('hidden');
}

function showPortal() {
  document.getElementById('loginView').classList.add('hidden');
  document.getElementById('portalView').classList.remove('hidden');
}

function renderSubjects() {
  const q = document.getElementById('subjectSearch').value.toLowerCase();
  const list = state.db.subjects.filter((s) => s.name.toLowerCase().includes(q));
  const container = document.getElementById('subjectsList');
  container.innerHTML = list.map((s) => `
    <div class="flex justify-between items-center border-b py-2">
      <span>${s.name}</span>
      <div class="space-x-2">
        <button onclick="editSubject(${s.id})" class="text-blue-600">Edit</button>
        <button onclick="deleteSubject(${s.id})" class="text-red-600">Delete</button>
      </div>
    </div>`).join('');

  const subjectSelect = document.getElementById('attendanceSubject');
  subjectSelect.innerHTML = '<option value="">Select Subject</option>' + state.db.subjects.map((s) => `<option value="${s.name}">${s.name}</option>`).join('');
}

function renderStudents() {
  const q = document.getElementById('studentSearch').value.toLowerCase();
  const rows = state.db.students.filter((s) => s.name.toLowerCase().includes(q) || s.id.includes(q));
  document.getElementById('studentsTable').innerHTML = rows.map((s, i) => `
    <tr class="border-b hover:bg-emerald-50"><td class="p-2">${i + 1}</td><td>${s.name}</td><td>${s.id}</td><td>${s.rollNumber}</td><td>${s.department}</td><td>${s.semester}</td></tr>
  `).join('');
}

function getAttendanceRecord(studentId, subject, date) {
  return state.db.attendanceRecords.find((r) => r.studentId === studentId && r.subject === subject && r.date === date);
}

function calculatePercentage(classes = []) {
  const total = classes.length;
  const present = classes.filter((v) => v === 'P').length;
  return total ? Math.round((present / total) * 100) : 0;
}

function renderAttendanceTable() {
  const subject = document.getElementById('attendanceSubject').value;
  const date = document.getElementById('attendanceDate').value;
  state.currentSubject = subject;
  state.attendanceDate = date;
  document.getElementById('sampleHeader').textContent = `Subject: ${subject || 'Digital Logic Design'} | Date: ${new Date(date || Date.now()).toLocaleDateString('en-GB', { day: '2-digit', month: 'long', year: 'numeric' })}`;

  document.getElementById('attendanceBody').innerHTML = state.db.students.map((student, idx) => {
    const record = getAttendanceRecord(student.id, subject, date) || { classes: Array(10).fill('A') };
    const percent = calculatePercentage(record.classes);
    const low = percent < 75 ? 'bg-red-100' : '';
    const cells = record.classes.map((v, classIdx) => {
      const color = v === 'P' ? 'bg-green-200' : 'bg-red-200';
      return `<td class="border text-center cursor-pointer ${color}" onclick="toggleAttendance('${student.id}', ${classIdx})">${v}</td>`;
    }).join('');
    return `<tr class="border-b hover:bg-emerald-50 ${low}"><td class="p-2 border">${idx + 1}</td><td class="border">${student.name}</td><td class="border">${student.id}</td>${cells}<td class="border text-center font-semibold">${percent}%</td></tr>`;
  }).join('');

  refreshReports();
}

function upsertAttendance(studentId, updater) {
  if (!state.currentSubject || !state.attendanceDate) return;
  let record = getAttendanceRecord(studentId, state.currentSubject, state.attendanceDate);
  if (!record) {
    record = { studentId, subject: state.currentSubject, date: state.attendanceDate, classes: Array(10).fill('A') };
    state.db.attendanceRecords.push(record);
  }
  updater(record);
  saveDB();
}

window.toggleAttendance = function toggleAttendance(studentId, idx) {
  upsertAttendance(studentId, (record) => {
    record.classes[idx] = record.classes[idx] === 'P' ? 'A' : 'P';
  });
  renderAttendanceTable();
};

window.editSubject = function editSubject(id) {
  const item = state.db.subjects.find((s) => s.id === id);
  const name = prompt('Edit subject name', item.name);
  if (!name) return;
  item.name = name;
  saveDB();
  renderSubjects();
};

window.deleteSubject = function deleteSubject(id) {
  state.db.subjects = state.db.subjects.filter((s) => s.id !== id);
  saveDB();
  renderSubjects();
};

function refreshReports(order = 'desc') {
  const reports = state.db.students.map((student) => {
    const rows = state.db.attendanceRecords.filter((r) => r.studentId === student.id);
    const classes = rows.flatMap((r) => r.classes);
    const total = classes.length;
    const present = classes.filter((v) => v === 'P').length;
    const absent = total - present;
    const percentage = total ? Math.round((present / total) * 100) : 0;
    return { student, total, present, absent, percentage };
  });

  reports.sort((a, b) => order === 'desc' ? b.percentage - a.percentage : a.percentage - b.percentage);
  state.reports = reports;
  document.getElementById('reportsTable').innerHTML = reports.map((r) => `
    <tr class="border-b ${r.percentage < 75 ? 'bg-red-50' : ''}"><td>${r.student.name}</td><td>${r.student.id}</td><td>${r.total}</td><td>${r.present}</td><td>${r.absent}</td><td>${r.percentage}%</td></tr>
  `).join('');

  renderStatsAndCharts();
  renderTimeline();
}

function renderStatsAndCharts() {
  const totalStudents = state.db.students.length;
  const totalSubjects = state.db.subjects.length;
  const today = state.attendanceDate;
  const todayRecords = state.db.attendanceRecords.filter((r) => r.date === today);
  const todayPresent = todayRecords.flatMap((r) => r.classes).filter((v) => v === 'P').length;
  const avgAttendance = state.reports.length ? Math.round(state.reports.reduce((a, b) => a + b.percentage, 0) / state.reports.length) : 0;

  const cards = [
    ['Teacher', parseToken(localStorage.getItem(tokenKey))?.email || 'N/A'],
    ['Subjects', totalSubjects],
    ['Total students', totalStudents],
    ["Today's attendance summary", `${todayPresent} present marks`],
    ['Average attendance', `${avgAttendance}%`]
  ];

  document.getElementById('statsCards').innerHTML = cards.map(([k, v]) => `<div class="bg-white rounded-xl p-4 shadow"><p class="text-slate-500 text-sm">${k}</p><p class="text-xl font-bold">${v}</p></div>`).join('');

  document.getElementById('quickButtons').innerHTML = ['Take Attendance', 'View Attendance', 'Attendance Reports', 'Students List', 'Export Data']
    .map((x) => `<button class="bg-emerald-600 text-white rounded-lg px-2 py-2">${x}</button>`).join('');

  const bucket = [
    state.reports.filter((r) => r.percentage >= 90).length,
    state.reports.filter((r) => r.percentage >= 75 && r.percentage < 90).length,
    state.reports.filter((r) => r.percentage < 75).length
  ];
  const trendMap = {};
  state.db.attendanceRecords.forEach((r) => {
    const perc = calculatePercentage(r.classes);
    trendMap[r.date] = trendMap[r.date] || [];
    trendMap[r.date].push(perc);
  });
  const trendDates = Object.keys(trendMap).sort();
  const trendValues = trendDates.map((d) => Math.round(trendMap[d].reduce((a, b) => a + b, 0) / trendMap[d].length));

  if (state.charts.attendance) state.charts.attendance.destroy();
  if (state.charts.trend) state.charts.trend.destroy();

  state.charts.attendance = new Chart(document.getElementById('attendanceChart'), {
    type: 'bar',
    data: { labels: ['>=90%', '75-89%', '<75%'], datasets: [{ label: 'Students', data: bucket, backgroundColor: ['#059669', '#84cc16', '#dc2626'] }] }
  });

  state.charts.trend = new Chart(document.getElementById('trendChart'), {
    type: 'line',
    data: { labels: trendDates.length ? trendDates : ['No data'], datasets: [{ label: 'Class attendance trend', data: trendValues.length ? trendValues : [0], borderColor: '#0891b2' }] }
  });
}

function renderTimeline() {
  const items = [...state.db.attendanceRecords]
    .sort((a, b) => new Date(b.date) - new Date(a.date))
    .slice(0, 20)
    .map((r) => `<li>${r.date} - ${r.subject} - ${r.studentId}</li>`)
    .join('');
  document.getElementById('timeline').innerHTML = items || '<li>No attendance history yet.</li>';
}

function switchView(view) {
  state.currentView = view;
  document.getElementById('pageTitle').textContent = view[0].toUpperCase() + view.slice(1);
  ['dashboard', 'subjects', 'students', 'attendance', 'reports', 'export', 'settings'].forEach((v) => {
    document.getElementById(`${v}View`).classList.toggle('hidden', v !== view);
  });
}

function downloadFile(filename, content, type = 'text/plain') {
  const blob = new Blob([content], { type });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = filename;
  a.click();
}

function exportCSV() {
  const rows = ['Student Name,Student ID,Total Classes,Present,Absent,Attendance %'];
  state.reports.forEach((r) => rows.push(`${r.student.name},${r.student.id},${r.total},${r.present},${r.absent},${r.percentage}%`));
  downloadFile('attendance-report.csv', rows.join('\n'), 'text/csv');
}

function exportExcel() {
  const html = `<table><tr><th>Student Name</th><th>Student ID</th><th>Total Classes</th><th>Present</th><th>Absent</th><th>Attendance %</th></tr>${state.reports.map((r) => `<tr><td>${r.student.name}</td><td>${r.student.id}</td><td>${r.total}</td><td>${r.present}</td><td>${r.absent}</td><td>${r.percentage}%</td></tr>`).join('')}</table>`;
  downloadFile('attendance-report.xls', html, 'application/vnd.ms-excel');
}

function exportPDF() {
  const text = state.reports.map((r) => `${r.student.name} (${r.student.id}) - ${r.percentage}%`).join('\n');
  downloadFile('attendance-report.pdf', text, 'application/pdf');
}

function setDarkMode(enabled) {
  const body = document.getElementById('appBody');
  if (enabled) {
    body.classList.add('bg-slate-900', 'text-slate-100');
    body.classList.remove('bg-slate-50', 'text-slate-800');
  } else {
    body.classList.add('bg-slate-50', 'text-slate-800');
    body.classList.remove('bg-slate-900', 'text-slate-100');
  }
  localStorage.setItem('darkMode', enabled ? '1' : '0');
}

async function bootstrap() {
  await initDB();

  document.getElementById('loginForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    const email = document.getElementById('email').value.trim();
    const password = document.getElementById('password').value;
    const user = state.db.users.find((u) => u.email === email && ['admin', 'teacher'].includes(u.role));
    if (!user) return (document.getElementById('loginError').textContent = 'Unauthorized account');

    const hashed = await hashPassword(password, user.salt);
    if (hashed.hash !== user.hash) return (document.getElementById('loginError').textContent = 'Invalid credentials');

    localStorage.setItem(tokenKey, createToken(user));
    document.getElementById('loginError').textContent = '';
    initPortal();
  });

  document.getElementById('forgotPasswordBtn').addEventListener('click', () => alert('Contact admin to reset password.'));
  document.getElementById('subjectSearch').addEventListener('input', renderSubjects);
  document.getElementById('studentSearch').addEventListener('input', renderStudents);
  document.getElementById('attendanceSubject').addEventListener('change', renderAttendanceTable);
  document.getElementById('attendanceDate').addEventListener('change', renderAttendanceTable);

  document.getElementById('addSubjectBtn').addEventListener('click', () => {
    const name = document.getElementById('subjectInput').value.trim();
    if (!name) return;
    state.db.subjects.push({ id: Date.now(), name });
    document.getElementById('subjectInput').value = '';
    saveDB();
    renderSubjects();
  });

  document.getElementById('markAllPresent').addEventListener('click', () => {
    state.db.students.forEach((s) => upsertAttendance(s.id, (r) => (r.classes = Array(10).fill('P'))));
    renderAttendanceTable();
  });

  document.getElementById('markAllAbsent').addEventListener('click', () => {
    state.db.students.forEach((s) => upsertAttendance(s.id, (r) => (r.classes = Array(10).fill('A'))));
    renderAttendanceTable();
  });

  document.getElementById('saveAttendance').addEventListener('click', () => {
    saveDB();
    alert('Attendance autosaved.');
  });

  document.getElementById('sortHigh').addEventListener('click', () => refreshReports('desc'));
  document.getElementById('sortLow').addEventListener('click', () => refreshReports('asc'));
  document.getElementById('exportCSV').addEventListener('click', exportCSV);
  document.getElementById('exportExcel').addEventListener('click', exportExcel);
  document.getElementById('exportPDF').addEventListener('click', exportPDF);
  document.getElementById('printSheet').addEventListener('click', () => window.print());
  document.getElementById('darkModeToggle').addEventListener('click', () => setDarkMode(localStorage.getItem('darkMode') !== '1'));

  document.getElementById('logoutBtn').addEventListener('click', () => {
    localStorage.removeItem(tokenKey);
    showLogin();
  });

  document.querySelectorAll('#sidebarNav button[data-view]').forEach((btn) => btn.addEventListener('click', () => switchView(btn.dataset.view)));

  if (authGuard()) initPortal(); else showLogin();
}

function initPortal() {
  const session = authGuard();
  if (!session) return;
  showPortal();
  document.getElementById('welcomeText').textContent = `Welcome ${session.email}`;
  document.getElementById('attendanceDate').value = new Date().toISOString().slice(0, 10);
  renderSubjects();
  renderStudents();
  renderAttendanceTable();
  refreshReports();
  switchView(state.currentView);
  setDarkMode(localStorage.getItem('darkMode') === '1');
}

bootstrap();
