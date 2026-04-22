const express = require('express');
const router = express.Router();
const { nanoid } = require('nanoid');
const { db } = require('../db');

// Helper: validate URL format
function isValidUrl(string) {
  try {
    const url = new URL(string);
    return url.protocol === 'http:' || url.protocol === 'https:';
  } catch (_) {
    return false;
  }
}

// POST /api/shorten — Create a short URL
router.post('/shorten', async (req, res) => {
  let { originalUrl, customCode } = req.body;

  if (!originalUrl) {
    return res.status(400).json({ error: 'URL is required.' });
  }

  // Auto-prepend https if missing
  if (!/^https?:\/\//i.test(originalUrl)) {
    originalUrl = 'https://' + originalUrl;
  }

  if (!isValidUrl(originalUrl)) {
    return res.status(400).json({ error: 'Invalid URL. Please enter a valid URL.' });
  }

  try {
    // Check if URL already shortened (only when no custom code)
    if (!customCode) {
      const existing = await db.findByUrl(originalUrl);
      if (existing) {
        const shortUrl = `${process.env.BASE_URL}/${existing.shortCode}`;
        return res.json({
          shortUrl,
          shortCode: existing.shortCode,
          originalUrl: existing.originalUrl,
          clicks: existing.clicks,
          createdAt: existing.createdAt,
        });
      }
    }

    // Validate custom code if provided
    if (customCode) {
      customCode = customCode.trim().replace(/\s+/g, '-');
      const taken = await db.findByCode(customCode);
      if (taken) {
        return res.status(409).json({ error: `Custom alias "${customCode}" is already taken.` });
      }
    }

    const shortCode = customCode || nanoid(7);
    const newUrl = await db.create({ originalUrl, shortCode });

    const shortUrl = `${process.env.BASE_URL}/${shortCode}`;
    return res.status(201).json({
      shortUrl,
      shortCode,
      originalUrl,
      clicks: 0,
      createdAt: newUrl.createdAt,
    });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: 'Server error. Please try again.' });
  }
});

// GET /api/stats/:code — Get stats for a short URL
router.get('/stats/:code', async (req, res) => {
  try {
    const url = await db.findByCode(req.params.code);
    if (!url) {
      return res.status(404).json({ error: 'Short URL not found.' });
    }
    return res.json({
      shortUrl: `${process.env.BASE_URL}/${url.shortCode}`,
      shortCode: url.shortCode,
      originalUrl: url.originalUrl,
      clicks: url.clicks,
      lastAccessed: url.lastAccessed,
      createdAt: url.createdAt,
    });
  } catch (err) {
    return res.status(500).json({ error: 'Server error.' });
  }
});

// GET /api/recent — Get last 10 shortened URLs
router.get('/recent', async (req, res) => {
  try {
    const urls = await db.recent(10);
    const result = urls.map((u) => ({
      shortUrl: `${process.env.BASE_URL}/${u.shortCode}`,
      shortCode: u.shortCode,
      originalUrl: u.originalUrl,
      clicks: u.clicks,
      createdAt: u.createdAt,
    }));
    return res.json(result);
  } catch (err) {
    return res.status(500).json({ error: 'Server error.' });
  }
});

// DELETE /api/delete/:code — Delete a shortened URL
router.delete('/delete/:code', async (req, res) => {
  try {
    const deleted = await db.deleteByCode(req.params.code);
    if (!deleted) {
      return res.status(404).json({ error: 'Short URL not found.' });
    }
    return res.json({ message: 'Deleted successfully.' });
  } catch (err) {
    return res.status(500).json({ error: 'Server error.' });
  }
});

module.exports = router;
