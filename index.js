// ---------------------------
// Web Programming II - NodeJS Project
// Tasks 1–5 (Theme, Auth, Database, Contact)
// ---------------------------

const express = require('express');
const path = require('path');
const fs = require('fs');
const crypto = require('crypto');
const bodyParser = require('body-parser');
const session = require('express-session');

const app = express();
const PORT = 4000; // use 4211 for Linux later

// ---------------------------
//  MIDDLEWARE
// ---------------------------
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));
app.use(express.static(path.join(__dirname, 'public')));
app.use(bodyParser.urlencoded({ extended: true }));

app.use(session({
  secret: 'secretkey123',
  resave: false,
  saveUninitialized: false
}));

// ---------------------------
//  HELPER FUNCTIONS
// ---------------------------
const hash = (pw) => crypto.createHash('sha256').update(pw).digest('hex');

function readUsers() {
  const filePath = path.join(__dirname, 'db', 'users.json');
  if (!fs.existsSync(filePath)) return [];
  return JSON.parse(fs.readFileSync(filePath));
}

function writeUsers(users) {
  const filePath = path.join(__dirname, 'db', 'users.json');
  fs.writeFileSync(filePath, JSON.stringify(users, null, 2));
}

// Create default admin if not existing
(function ensureAdminExists() {
  const users = readUsers();
  const adminExists = users.some(u => u.username === 'admin');
  if (!adminExists) {
    users.push({
      username: 'admin',
      password: hash('admin'),
      role: 'admin'
    });
    writeUsers(users);
    console.log('✅ Default admin created (username: admin, password: admin)');
  }
})();

// ---------------------------
//  ROUTES
// ---------------------------

// --- Task 1 & 3: Main Page / Main Menu
app.get('/', (req, res) => {
  res.render('mainpage', { user: req.session.user });
});

// --- Task 2: Authentication (Register / Login / Logout)

// Register
app.get('/register', (req, res) => {
  res.render('register', { message: '', user: req.session.user });
});

app.post('/register', (req, res) => {
  const { username, password } = req.body;
  const users = readUsers();
  if (users.find(u => u.username === username)) {
    return res.render('register', { message: 'Username already exists!', user: req.session.user });
  }
  users.push({ username, password: hash(password), role: 'registered' });
  writeUsers(users);
  res.redirect('/login');
});

// Login
app.get('/login', (req, res) => {
  res.render('login', { message: '', user: req.session.user });
});

app.post('/login', (req, res) => {
  const { username, password } = req.body;
  const users = readUsers();
  const user = users.find(u => u.username === username && u.password === hash(password));

  if (!user) {
    return res.render('login', { message: 'Invalid username or password!', user: req.session.user });
  }

  req.session.user = user;
  res.redirect('/dashboard');
});

// Dashboard
app.get('/dashboard', (req, res) => {
  if (!req.session.user) return res.redirect('/login');
  res.render('dashboard', { user: req.session.user });
});

// Admin Page
app.get('/admin', (req, res) => {
  if (!req.session.user || req.session.user.role !== 'admin') {
    return res.status(403).send('<h2>Access denied. Admins only.</h2>');
  }
  res.render('admin', { user: req.session.user });
});

// Logout
app.get('/logout', (req, res) => {
  req.session.destroy(() => res.redirect('/'));
});

// ---------------------------
//  Task 4: Database Menu
// ---------------------------
app.get('/database', (req, res) => {
  const readTxt = (filename) => {
    const filePath = path.join(__dirname, 'db', filename);
    if (!fs.existsSync(filePath)) return { headers: [], rows: [] };

    const raw = fs.readFileSync(filePath, 'utf8').trim();
    if (!raw) return { headers: [], rows: [] };

    const lines = raw.split(/\r?\n/).filter(line => line.trim() !== '');
    const detectSep = (line) => (line.includes('\t') ? '\t' : /\s{2,}/.test(line) ? /\s{2,}/ : /\s+/);
    const sep = detectSep(lines[0]);

    const headers = lines[0].split(sep).map(h => h.trim());
    const rows = lines.slice(1).map(line => {
      const cols = line.split(sep).map(c => c.trim());
      const row = {};
      headers.forEach((h, i) => (row[h] = cols[i] || ''));
      return row;
    });

    return { headers, rows };
  };

  const students = readTxt('students.txt');
  const subjects = readTxt('subjects.txt');
  const marks = readTxt('marks.txt');

  res.render('database', { user: req.session.user, students, subjects, marks });
});

// ---------------------------
//  Task 5: Contact Menu
// ---------------------------
function readContacts() {
  const filePath = path.join(__dirname, 'db', 'contacts.json');
  if (!fs.existsSync(filePath)) return [];
  const data = fs.readFileSync(filePath, 'utf8');
  return data ? JSON.parse(data) : [];
}

function writeContacts(list) {
  const filePath = path.join(__dirname, 'db', 'contacts.json');
  fs.writeFileSync(filePath, JSON.stringify(list, null, 2));
}

// Contact Form (GET)
app.get('/contact', (req, res) => {
  res.render('contact', { user: req.session.user, message: '' });
});

// Contact Form (POST)
app.post('/contact', (req, res) => {
  const { name, email, subject, message } = req.body;
  if (!name || !email || !message) {
    return res.render('contact', {
      user: req.session.user,
      message: 'All fields are required.'
    });
  }

  const contacts = readContacts();
  contacts.push({
    name,
    email,
    subject,
    message,
    date: new Date().toLocaleString()
  });
  writeContacts(contacts);

  res.render('contact', {
    user: req.session.user,
    message: 'Message sent successfully!'
  });
});

// ---------------------------
//  START SERVER
// ---------------------------
app.listen(PORT, () => {
  console.log(`✅ Server running at http://localhost:${PORT}`);
});
