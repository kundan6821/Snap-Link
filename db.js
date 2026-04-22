/**
 * db.js — MongoDB-only database adapter
 * Connects to MongoDB Atlas and exposes a clean API for URL operations.
 */

const mongoose = require('mongoose');

// Fix for Node.js v24 + MongoDB Atlas TLS compatibility
process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';

// ─── Connect ──────────────────────────────
async function connect() {
  if (!process.env.MONGO_URI) {
    throw new Error('❌ MONGO_URI is not set in .env file!');
  }

  await mongoose.connect(process.env.MONGO_URI, {
    serverSelectionTimeoutMS: 10000,
    connectTimeoutMS: 10000,
    socketTimeoutMS: 10000,
    family: 4,
  });

  console.log('✅ MongoDB connected successfully.');
}

// ─── Model ────────────────────────────────
const Url = require('./models/Url');

// ─── Database API ─────────────────────────
const db = {
  async findByUrl(originalUrl) {
    return Url.findOne({ originalUrl });
  },

  async findByCode(shortCode) {
    return Url.findOne({ shortCode });
  },

  async create({ originalUrl, shortCode }) {
    const doc = new Url({ originalUrl, shortCode });
    await doc.save();
    return doc;
  },

  async incrementClick(shortCode) {
    return Url.findOneAndUpdate(
      { shortCode },
      { $inc: { clicks: 1 }, $set: { lastAccessed: new Date() } },
      { new: true }
    );
  },

  async recent(limit = 10) {
    return Url.find().sort({ createdAt: -1 }).limit(limit);
  },

  async deleteByCode(shortCode) {
    return Url.findOneAndDelete({ shortCode });
  },
};

module.exports = { connect, db };
