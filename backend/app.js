require('dotenv').config();
const express = require('express');
const cors = require('cors');
const path = require('path');
const alertRoutes = require('./routes/alertRoutes');

const app = express();

app.use(cors({
  origin: [
    'https://crisis-admin.netlify.app',
    'http://localhost:3000',
    'https://crisis-shield-hackthon.onrender.com'
  ],
  methods: ['GET', 'POST', 'PATCH', 'DELETE'],
  credentials: true
}));

app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

app.use(express.static(path.join(__dirname, '../web-admin/public')));

app.get('/health', (req, res) => {
  res.json({ status: 'OK', message: '🚨 Crisis Shield API is live' });
});

app.use('/api/alerts', alertRoutes);

app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ error: 'Internal server error' });
});

module.exports = app;