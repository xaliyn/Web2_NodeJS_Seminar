const express = require('express');
const path = require('path');
const fs = require('fs');
const crypto = require('crypto');
const bodyParser = require('body-parser');
const session = require('express-session');

const app = express();
const PORT = 4000; // Later, use 4211 for Linux

// --- MIDDLEWARE SETUP ---
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));
app.use(express.static(path.join(__dirname, 'public')));
app.use(bodyParser.urlencoded({ extended: true }));

app.use(session({
  secret: 'secretkey123',
  resave: false,
  saveUninitialized: false
}));

// --- HELPER FUNCTIONS ---
const hash = (pw) => crypto.createHash('sha256').update(pw).digest('hex');

function readUsers() {
  const filePath = path.join(__dirname, 'db', 'users.json'); // ✅ uses /db folder
  if (!fs.existsSync(filePath)) return [];
  return JSON.parse(fs.readFileSync(filePath));
}

function writeUsers(users) {
  const filePath = path.join(__dirname, 'db', 'users.json'); // ✅ uses /db folder
  fs.writeFileSync(filePath, JSON.stringify(users, null, 2));
}

// --- DEFAULT ADMIN ACCOUNT CREATION ---
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
    console.log('✅ Default admin user created: username=admin, password=admin');
  }
})();

// --- ROUTES ---

// Home Page
app.get('/', (req, res) => {
  res.render('mainpage', { user: req.session.user });
});

// Register Page
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

// Login Page
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

// --- START SERVER ---
app.listen(PORT, () => {
  console.log(`✅ Server running at http://localhost:${PORT}`);
});
