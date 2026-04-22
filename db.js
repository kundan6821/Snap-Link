/**
 * db.js — MongoDB adapter with Vercel serverless support
 * Uses cached connection pattern to avoid reconnecting on every request.
 */

const mongoose = require('mongoose');

// Fix for Node.js v24 + MongoDB Atlas TLS compatibility
process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';

const MONGO_URI = process.env.MONGO_URI;

// Cache the connection for serverless reuse
let cached = global.mongoose;
if (!cached) {
  cached = global.mongoose = { conn: null, promise: null };
}

async function connect() {
  if (!MONGO_URI) {
    throw new Error('❌ MONGO_URI is not set in environment variables!');
  }

  // Return cached connection if already connected
  if (cached.conn && mongoose.connection.readyState === 1) {
    return cached.conn;
  }

  // If a connection is in progress, wait for it
  if (!cached.promise) {
    cached.promise = mongoose.connect(MONGO_URI, {
      serverSelectionTimeoutMS: 10000,
      connectTimeoutMS: 10000,
      socketTimeoutMS: 10000,
      family: 4,
    }).then((conn) => {
      console.log('✅ MongoDB connected successfully.');
      return conn;
    });
  }

  cached.conn = await cached.promise;
  return cached.conn;
}

// ─── Model ────────────────────────────────
const Url = require('./models/Url');

// ─── Database API ─────────────────────────
const db = {
  async findByUrl(originalUrl) {
    await connect();
    return Url.findOne({ originalUrl });
  },

  async findByCode(shortCode) {
    await connect();
    return Url.findOne({ shortCode });
  },

  async create({ originalUrl, shortCode }) {
    await connect();
    const doc = new Url({ originalUrl, shortCode });
    await doc.save();
    return doc;
  },

  async incrementClick(shortCode) {
    await connect();
    return Url.findOneAndUpdate(
      { shortCode },
      { $inc: { clicks: 1 }, $set: { lastAccessed: new Date() } },
      { new: true }
    );
  },

  async recent(limit = 10) {
    await connect();
    return Url.find().sort({ createdAt: -1 }).limit(limit);
  },

  async deleteByCode(shortCode) {
    await connect();
    return Url.findOneAndDelete({ shortCode });
  },
};

module.exports = { connect, db };
