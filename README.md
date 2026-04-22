# ⚡ SnapLink — URL Shortener

A fast, beautiful, full-stack URL shortener built with **Node.js**, **Express**, and **MongoDB**.

## Features

- 🔗 Shorten any URL in one click
- 🎨 Custom aliases (e.g. `localhost:3000/my-link`)
- 📊 Click analytics per link
- 📱 QR code generation for every short link
- 🕐 Recent links history with delete support
- 🌙 Stunning dark UI with glassmorphism & gradient animations

## Tech Stack

| Layer     | Technology           |
|-----------|----------------------|
| Backend   | Node.js + Express    |
| Database  | MongoDB + Mongoose   |
| Short IDs | nanoid (7 chars)     |
| Frontend  | Vanilla HTML/CSS/JS  |
| QR Codes  | qrcode.js (CDN)      |

## Getting Started

### Prerequisites

- [Node.js](https://nodejs.org/) v18+
- [MongoDB](https://www.mongodb.com/try/download/community) (local) OR a free [MongoDB Atlas](https://cloud.mongodb.com/) cluster

### Installation

```bash
# 1. Clone / navigate to the project
cd "URL Shortner"

# 2. Install dependencies
npm install

# 3. Configure environment (edit .env as needed)
#    Default .env connects to local MongoDB on port 27017

# 4. Start the server
npm start
```

The app will be available at **http://localhost:3000**

### Development (auto-reload)

```bash
npm run dev
```

### Environment Variables (`.env`)

| Variable   | Default                                     | Description                    |
|------------|---------------------------------------------|--------------------------------|
| `PORT`     | `3000`                                      | Server port                    |
| `MONGO_URI`| `mongodb://localhost:27017/urlshortener`    | MongoDB connection string       |
| `BASE_URL` | `http://localhost:3000`                     | Public base URL for short links |

## API Reference

| Method   | Endpoint              | Description                   |
|----------|-----------------------|-------------------------------|
| `POST`   | `/api/shorten`        | Create a short URL            |
| `GET`    | `/api/recent`         | Get 10 most recent links      |
| `GET`    | `/api/stats/:code`    | Get stats for a short code    |
| `DELETE` | `/api/delete/:code`   | Delete a short link           |
| `GET`    | `/:code`              | Redirect to original URL      |

### POST `/api/shorten` — Request Body

```json
{
  "originalUrl": "https://example.com/very/long/url",
  "customCode": "my-link"   // optional
}
```

## Project Structure

```
URL Shortner/
├── models/
│   └── Url.js          # Mongoose schema
├── routes/
│   └── url.js          # API routes
├── public/
│   ├── index.html      # Frontend UI
│   ├── style.css       # Styles
│   └── app.js          # Frontend logic
├── server.js           # Express entry point
├── .env                # Environment config (not committed)
└── package.json
```
