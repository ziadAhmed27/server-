require('dotenv').config();
const express = require('express');
const bodyParser = require('body-parser');
const mysql = require('mysql2');

const app = express();
app.use(bodyParser.json());

// MySQL connection
const db = mysql.createConnection({
  host: process.env.DB_HOST,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME
});

db.connect((err) => {
  if (err) {
    console.error('Database connection failed:', err.stack);
    return;
  }
  console.log('Connected to MySQL database.');
});

// Placeholder for routes

// Signup endpoint
app.post('/signup', (req, res) => {
  const { email, password, name, nationality, currently_in_egypt, date_of_arrival, date_of_leaving, currently_in_risk } = req.body;
  if (!email || !password || !name || !nationality || currently_in_egypt === undefined || currently_in_risk === undefined) {
    return res.status(400).json({ message: 'Missing required fields.' });
  }
  const query = `INSERT INTO customers (email, password, name, nationality, currently_in_egypt, date_of_arrival, date_of_leaving, currently_in_risk) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`;
  db.query(query, [email, password, name, nationality, currently_in_egypt, date_of_arrival || null, date_of_leaving || null, currently_in_risk], (err, result) => {
    if (err) {
      if (err.code === 'ER_DUP_ENTRY') {
        return res.status(409).json({ message: 'Email already exists.' });
      }
      return res.status(500).json({ message: 'Database error', error: err });
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
  db.query(query, [email], (err, results) => {
    if (err) {
      return res.status(500).json({ message: 'Database error', error: err });
    }
    if (results.length === 0) {
      return res.status(404).json({ message: 'Customer not found.' });
    }
    if (results[0].password === password) {
      return res.status(200).json({ message: 'Sign in successful.' });
    } else {
      return res.status(401).json({ message: 'Incorrect password.' });
    }
  });
});

app.get('/', (req, res) => {
  res.send('Customer API is running!');
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
}); 