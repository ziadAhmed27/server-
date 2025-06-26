const express = require('express');
const bodyParser = require('body-parser');
const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const app = express();
app.use(bodyParser.json());

// SQLite connection
const dbPath = path.resolve(__dirname, 'customerdb.sqlite');
const db = new sqlite3.Database(dbPath, (err) => {
  if (err) {
    console.error('Database connection failed:', err.message);
    return;
  }
  console.log('Connected to SQLite database.');
});

// Create table if not exists
const createTableQuery = `CREATE TABLE IF NOT EXISTS customers (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    email TEXT NOT NULL UNIQUE,
    password TEXT NOT NULL,
    name TEXT NOT NULL,
    nationality TEXT NOT NULL,
    currently_in_egypt BOOLEAN NOT NULL,
    date_of_arrival TEXT,
    date_of_leaving TEXT,
    currently_in_risk BOOLEAN NOT NULL
)`;
db.run(createTableQuery, (err) => {
  if (err) {
    console.error('Failed to create table:', err.message);
  }
});

app.get('/', (req, res) => {
  res.send('Customer API is running!');
});

// Signup endpoint
app.post('/signup', (req, res) => {
  const { email, password, name, nationality, currently_in_egypt, date_of_arrival, date_of_leaving, currently_in_risk } = req.body;
  if (!email || !password || !name || !nationality || currently_in_egypt === undefined || currently_in_risk === undefined) {
    return res.status(400).json({ message: 'Missing required fields.' });
  }
  const query = `INSERT INTO customers (email, password, name, nationality, currently_in_egypt, date_of_arrival, date_of_leaving, currently_in_risk) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`;
  db.run(query, [email, password, name, nationality, currently_in_egypt ? 1 : 0, date_of_arrival || null, date_of_leaving || null, currently_in_risk ? 1 : 0], function(err) {
    if (err) {
      if (err.message.includes('UNIQUE constraint failed')) {
        return res.status(409).json({ message: 'Email already exists.' });
      }
      console.error(err);
      return res.status(500).json({ message: 'Database error', error: err.message });
    }
    res.status(201).json({ message: 'Customer created successfully.' });
  });
});

// Signin endpoint
app.post('/signin', (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) {
    return res.status(400).json({ message: 'Email and password are required.' });
  }
  const query = `SELECT password FROM customers WHERE email = ?`;
  db.get(query, [email], (err, row) => {
    if (err) {
      console.error(err);
      return res.status(500).json({ message: 'Database error', error: err.message });
    }
    if (!row) {
      return res.status(404).json({ message: 'Customer not found.' });
    }
    if (row.password === password) {
      return res.status(200).json({ message: 'Sign in successful.' });
    } else {
      return res.status(401).json({ message: 'Incorrect password.' });
    }
  });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
}); 