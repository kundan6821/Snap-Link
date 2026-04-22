const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');
const path = require('path');
const { connect, db } = require('./db');

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// Routes
const urlRoutes = require('./routes/url');
app.use('/api', urlRoutes);

// Redirect short URL — AFTER /api routes
app.get('/:code', async (req, res) => {
  try {
    const url = await db.findByCode(req.params.code);
    if (!url) {
      return res.status(404).sendFile(path.join(__dirname, 'public', 'index.html'));
    }
    await db.incrementClick(req.params.code);
    return res.redirect(url.originalUrl);
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: 'Server error' });
  }
});

// For Vercel — export app directly (serverless)
// For local dev — start the server normally
if (process.env.VERCEL) {
  // Vercel handles the server, just connect to DB and export
  connect().catch((err) => console.error('MongoDB connection error:', err.message));
  module.exports = app;
} else {
  // Local development — start server after DB connects
  connect()
    .then(() => {
      const server = app.listen(PORT, () => {
        console.log(`🚀 URL Shortener running at http://localhost:${PORT}`);
      });

      server.on('error', (err) => {
        if (err.code === 'EADDRINUSE') {
          console.error(`\n❌ Port ${PORT} is already in use!`);
          console.error(`   Run this to fix it: npx kill-port ${PORT}\n`);
        } else {
          console.error('Server error:', err);
        }
        process.exit(1);
      });
    })
    .catch((err) => {
      console.error('\n❌ Failed to connect to MongoDB:', err.message);
      console.error('   Make sure your IP is whitelisted in MongoDB Atlas:');
      console.error('   https://cloud.mongodb.com → Network Access → Add IP Address\n');
      process.exit(1);
    });
}
