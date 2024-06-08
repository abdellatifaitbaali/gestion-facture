// index.js
const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const cors = require('cors');
const pool = require('./db');
require('dotenv').config();

const app = express();
const port = 5000; // Use the specified port

app.use(express.json());
app.use(cors());

const authenticateToken = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];
  if (!token) return res.sendStatus(401);

  jwt.verify(token, process.env.JWT_SECRET, (err, user) => {
    if (err) return res.sendStatus(403);
    req.user = user;
    next();
  });
};

// Register a new user
app.post('/register', async (req, res) => {
  const { username, password, role } = req.body;

  try {
    const hashedPassword = await bcrypt.hash(password, 10);
    const [result] = await pool.query(
      'INSERT INTO users (username, password, role) VALUES (?, ?, ?)',
      [username, hashedPassword, role]
    );
    res.status(201).send({ message: 'User registered successfully' });
  } catch (error) {
    res.status(500).send({ error: error.message });
  }
});

// Login user and get token
app.post('/login', async (req, res) => {
  const { username, password } = req.body;

  try {
    const [rows] = await pool.query('SELECT * FROM users WHERE username = ?', [username]);
    if (rows.length === 0) return res.status(400).send({ error: 'Invalid credentials' });

    const user = rows[0];
    const isPasswordValid = await bcrypt.compare(password, user.password);
    if (!isPasswordValid) return res.status(400).send({ error: 'Invalid credentials' });

    const token = jwt.sign({ id: user.id, role: user.role }, process.env.JWT_SECRET, { expiresIn: '1h' });
    res.send({ token });
  } catch (error) {
    res.status(500).send({ error: error.message });
  }
});

// Get all users
app.get('/users', authenticateToken, async (req, res) => {
  try {
    const [rows] = await pool.query('SELECT id, username, role, created_at, updated_at FROM users');
    res.send(rows);
  } catch (error) {
    res.status(500).send({ error: error.message });
  }
});

// Get a single user by ID
app.get('/users/:id', authenticateToken, async (req, res) => {
  const { id } = req.params;
  try {
    const [rows] = await pool.query('SELECT id, username, role, created_at, updated_at FROM users WHERE id = ?', [id]);
    if (rows.length === 0) return res.status(404).send({ error: 'User not found' });
    res.send(rows[0]);
  } catch (error) {
    res.status(500).send({ error: error.message });
  }
});

// Update a user
app.put('/users/:id', authenticateToken, async (req, res) => {
  const { id } = req.params;
  const { username, password, role } = req.body;

  try {
    let query = 'UPDATE users SET ';
    const params = [];
    if (username) {
      query += 'username = ?, ';
      params.push(username);
    }
    if (password) {
      const hashedPassword = await bcrypt.hash(password, 10);
      query += 'password = ?, ';
      params.push(hashedPassword);
    }
    if (role) {
      query += 'role = ?, ';
      params.push(role);
    }
    query = query.slice(0, -2); // Remove trailing comma and space
    query += ' WHERE id = ?';
    params.push(id);

    const [result] = await pool.query(query, params);
    if (result.affectedRows === 0) return res.status(404).send({ error: 'User not found' });
    res.send({ message: 'User updated successfully' });
  } catch (error) {
    res.status(500).send({ error: error.message });
  }
});

// Delete a user
app.delete('/users/:id', authenticateToken, async (req, res) => {
  const { id } = req.params;

  try {
    const [result] = await pool.query('DELETE FROM users WHERE id = ?', [id]);
    if (result.affectedRows === 0) return res.status(404).send({ error: 'User not found' });
    res.send({ message: 'User deleted successfully' });
  } catch (error) {
    res.status(500).send({ error: error.message });
  }
});

app.listen(port, () => {
  console.log(`Server is running on http://localhost:${port}`);
});
