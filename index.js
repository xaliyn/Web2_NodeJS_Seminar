// ====== IMPORTS ======
const express = require('express');
const path = require('path');
const fs = require('fs');
const crypto = require('crypto');
const bodyParser = require('body-parser');
const session = require('express-session');
const mysql = require('mysql2');

// ====== EXPRESS SETUP ======
const app = express();
const PORT = 4000; // use 4211 later for Linux

// ====== MIDDLEWARE ======
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));
app.use(express.static(path.join(__dirname, 'public')));
app.use(bodyParser.urlencoded({ extended: true }));
app.use(session({
  secret: 'secretkey123',
  resave: false,
  saveUninitialized: false
}));

// ====== MYSQL CONNECTION ======
const db = mysql.createConnection({
  host: 'localhost',
  user: 'root',       // default XAMPP MySQL user
  password: '',       // leave empty unless you set one
  database: 'web2nodejs'
});

db.connect((err) => {
  if (err) {
    console.error('❌ MySQL connection failed:', err);
  } else {
    console.log('✅ Connected to MySQL database!');
  }
});

// ====== HELPER FUNCTIONS ======
const hash = (pw) => crypto.createHash('sha256').update(pw).digest('hex');

// ====== ROUTES ======

// ---- HOME PAGE ----
app.get('/', (req, res) => {
  res.render('mainpage', { user: req.session.user });
});

// ---- AUTHENTICATION ----

// Register Page
app.get('/register', (req, res) => {
  res.render('register', { message: '', user: req.session.user });
});

app.post('/register', (req, res) => {
  const { username, password } = req.body;
  const hashedPw = hash(password);

  db.query('SELECT * FROM users WHERE username = ?', [username], (err, results) => {
    if (err) throw err;
    if (results.length > 0) {
      return res.render('register', { message: 'Username already exists!', user: req.session.user });
    }
    db.query('INSERT INTO users (username, password, role) VALUES (?, ?, ?)', [username, hashedPw, 'registered'], (err2) => {
      if (err2) throw err2;
      res.redirect('/login');
    });
  });
});

// Login Page
app.get('/login', (req, res) => {
  res.render('login', { message: '', user: req.session.user });
});

app.post('/login', (req, res) => {
  const { username, password } = req.body;
  const hashedPw = hash(password);

  db.query('SELECT * FROM users WHERE username = ? AND password = ?', [username, hashedPw], (err, results) => {
    if (err) throw err;
    if (results.length === 0) {
      return res.render('login', { message: 'Invalid username or password!', user: req.session.user });
    }
    req.session.user = results[0];
    res.redirect('/dashboard');
  });
});

// Dashboard
app.get('/dashboard', (req, res) => {
  if (!req.session.user) return res.redirect('/login');
  res.render('dashboard', { user: req.session.user });
});

// Logout
app.get('/logout', (req, res) => {
  req.session.destroy(() => res.redirect('/'));
});

// ---- ADMIN PAGE ----
app.get('/admin', (req, res) => {
  if (!req.session.user || req.session.user.role !== 'admin') {
    return res.status(403).send('<h2>Access denied. Admins only.</h2>');
  }
  res.render('admin', { user: req.session.user });
});

// ---- CONTACT FORM (TASK 5) ----
app.get('/contact', (req, res) => {
  res.render('contact', { user: req.session.user, message: '' });
});

app.post('/contact', (req, res) => {
  const { name, email, subject, message } = req.body;
  if (!name || !email || !message) {
    return res.render('contact', { user: req.session.user, message: 'All fields are required.' });
  }

  const sql = 'INSERT INTO contacts (name, email, subject, message, date) VALUES (?, ?, ?, ?, NOW())';
  db.query(sql, [name, email, subject, message], (err) => {
    if (err) throw err;
    res.render('contact', { user: req.session.user, message: '✅ Message sent successfully!' });
  });
});

// ---- MESSAGES PAGE (TASK 6) ----
app.get('/messages', (req, res) => {
  if (!req.session.user) return res.redirect('/login');

  const sql = 'SELECT * FROM contacts ORDER BY date DESC';
  db.query(sql, (err, results) => {
    if (err) throw err;
    res.render('messages', { user: req.session.user, messages: results });
  });
});

// ===== CRUD MENU =====

// SHOW ALL STUDENTS
app.get('/crud', (req, res) => {
  db.query('SELECT * FROM students ORDER BY id ASC', (err, result) => {
    if (err) throw err;
    res.render('crud', { user: req.session.user, students: result });
  });
});

// ADD NEW STUDENT
app.post('/crud/add', (req, res) => {
  const { sname, class: studentClass, boy } = req.body;
  db.query(
    'INSERT INTO students (sname, class, boy) VALUES (?, ?, ?)',
    [sname, studentClass, boy],
    (err) => {
      if (err) throw err;
      res.redirect('/crud');
    }
  );
});

// UPDATE STUDENT
app.post('/crud/update/:id', (req, res) => {
  const { sname, class: studentClass, boy } = req.body;
  const id = req.params.id;
  db.query(
    'UPDATE students SET sname=?, class=?, boy=? WHERE id=?',
    [sname, studentClass, boy, id],
    (err) => {
      if (err) throw err;
      res.redirect('/crud');
    }
  );
});

// DELETE STUDENT
app.get('/crud/delete/:id', (req, res) => {
  const id = req.params.id;
  db.query('DELETE FROM students WHERE id=?', [id], (err) => {
    if (err) throw err;
    res.redirect('/crud');
  });
});


// ---- DATABASE MENU (TASK 4 – From MySQL) ----
app.get('/database', (req, res) => {
  let allData = {};

  db.query('SELECT * FROM students', (err1, students) => {
    if (err1) throw err1;
    allData.students = students;

    db.query('SELECT * FROM contacts', (err2, contacts) => {
      if (err2) throw err2;
      allData.contacts = contacts;

      db.query('SELECT * FROM users', (err3, users) => {
        if (err3) throw err3;
        allData.users = users;

        res.render('database', { user: req.session.user, data: allData });
      });
    });
  });
});

// ====== START SERVER ======
app.listen(PORT, () => {
  console.log(`✅ Server running at http://localhost:${PORT}`);
});