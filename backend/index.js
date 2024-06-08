const express = require('express');
const cors = require('cors');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const sql = require('mssql');
require('dotenv').config();
const db = require('./db');

const app = express();
const port = 5000;

app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

const jwtSecret = process.env.JWT_SECRET;

// Register a new user
app.post('/register', async (req, res) => {
  const { username, password, role } = req.body;
  try {
    const pool = await db.poolPromise;
    const hashedPassword = await bcrypt.hash(password, 10);
    const result = await pool.request()
      .input('username', sql.NVarChar, username)
      .input('password', sql.NVarChar, hashedPassword)
      .input('role', sql.NVarChar, role)
      .query('INSERT INTO users (username, password, role) VALUES (@username, @password, @role)');
    res.status(201).send({ message: 'User registered successfully' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Login
app.post('/login', async (req, res) => {
  const { username, password } = req.body;
  try {
    const pool = await db.poolPromise;
    const result = await pool.request()
      .input('username', sql.NVarChar, username)
      .query('SELECT * FROM users WHERE username = @username');

    if (result.recordset.length === 0) {
      return res.status(400).send({ message: 'Invalid credentials' });
    }

    const user = result.recordset[0];
    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(400).send({ message: 'Invalid credentials' });
    }

    const token = jwt.sign({ id: user.id, username: user.username, role: user.role }, jwtSecret, { expiresIn: '1h' });
    res.send({ token });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Middleware to authenticate JWT
const authenticateJWT = (req, res, next) => {
  const token = req.header('Authorization')?.replace('Bearer ', '');
  if (!token) return res.status(401).send({ message: 'Access denied' });

  try {
    const decoded = jwt.verify(token, jwtSecret);
    req.user = decoded;
    next();
  } catch (err) {
    res.status(400).send({ message: 'Invalid token' });
  }
};

// Example of a protected route
app.get('/protected', authenticateJWT, (req, res) => {
  res.send({ message: 'This is a protected route', user: req.user });
});

// CRUD Operations
app.post('/items', authenticateJWT, async (req, res) => {
  // Example protected create operation
  try {
    const pool = await db.poolPromise;
    const { name } = req.body;
    const result = await pool.request()
      .input('name', sql.NVarChar, name)
      .query('INSERT INTO items (name) OUTPUT inserted.id VALUES (@name)');
    res.json(result.recordset[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/items', authenticateJWT, async (req, res) => {
  // Example protected read operation
  try {
    const pool = await db.poolPromise;
    const result = await pool.request().query('SELECT * FROM items');
    res.json(result.recordset);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.put('/items/:id', authenticateJWT, async (req, res) => {
  // Example protected update operation
  try {
    const pool = await db.poolPromise;
    const { id } = req.params;
    const { name } = req.body;
    await pool.request()
      .input('id', sql.Int, id)
      .input('name', sql.NVarChar, name)
      .query('UPDATE items SET name = @name WHERE id = @id');
    res.json({ id, name });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.delete('/items/:id', authenticateJWT, async (req, res) => {
  // Example protected delete operation
  try {
    const pool = await db.poolPromise;
    const { id } = req.params;
    await pool.request()
      .input('id', sql.Int, id)
      .query('DELETE FROM items WHERE id = @id');
    res.json({ message: 'Item deleted' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.listen(port, () => {
  console.log(`Server is running on http://localhost:${port}`);
});
