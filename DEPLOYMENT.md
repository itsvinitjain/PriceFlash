# PriceFlash - Local Deployment Guide

## Prerequisites
- **Python 3.10+** installed
- **Node.js 18+** and npm installed
- **MongoDB** running locally or a MongoDB Atlas connection string
- **Android Emulator** or **iOS Simulator** (for running the app)

## Step 1: Set Up MongoDB

### Option A: Docker (Recommended)
```bash
docker run -d --name mongodb -p 27017:27017 mongo:latest
```

### Option B: Local MongoDB
- Download MongoDB: https://www.mongodb.com/try/download/community
- Install and run MongoDB
- Verify: `mongosh` should connect to `mongodb://localhost:27017`

### Option C: MongoDB Atlas (Cloud)
1. Go to https://www.mongodb.com/cloud/atlas
2. Create a free cluster
3. Add your IP address to the network access list
4. Copy the connection string and update `.env` in the backend folder

## Step 2: Install & Run Backend

### Navigate to backend
```bash
cd backend
```

### Install dependencies
```bash
pip install -r requirements.txt
```

### Start the FastAPI server
```bash
python server.py
```

Or with auto-reload during development:
```bash
pip install uvicorn
uvicorn server:app --reload --host 0.0.0.0 --port 8000
```

**Backend URL:** `http://localhost:8000`
- Health check: `http://localhost:8000/api/health`
- API docs: `http://localhost:8000/docs`

---

## Step 3: Configure Frontend

### Update the backend URL
Edit [frontend/.env.local](frontend/.env.local) with your machine's local IP:

```bash
# Get your IP address:
# On Windows: ipconfig
# On Mac/Linux: ifconfig

# Example (replace XXX with your actual IP):
EXPO_PUBLIC_BACKEND_URL=http://192.168.1.100:8000
```

**Important:** Use your machine's IP address, NOT `localhost` or `127.0.0.1` when testing on a physical device or emulator.

---

## Step 4: Install & Run Frontend

### Navigate to frontend
```bash
cd frontend
```

### Install dependencies
```bash
npm install
```

### Start Expo development server
```bash
npm start
```

This will show options to:
- `a` - Open on **Android Emulator**
- `i` - Open on **iOS Simulator** (Mac only)
- `w` - Open in **web browser**
- `j` - Open in **Expo Go** app (install from App Store/Play Store)

---

## Testing the App

1. **Search for a product** (e.g., "amul butter")
2. **Verify price comparison** across 8 platforms (Blinkit, Zepto, Swiggy Instamart, BigBasket, DMart, JioMart, Amazon Fresh, Flipkart)
3. **Check location** - GPS auto-detect or manual PIN entry (default: 110001)
4. **View recent searches** - Saved in MongoDB

---

## Troubleshooting

### Backend won't start
```bash
# Check if port 8000 is in use
# Windows: netstat -ano | findstr :8000
# Mac/Linux: lsof -i :8000

# Kill the process or use a different port:
uvicorn server:app --port 8001
```

### MongoDB connection fails
```
Error: cannot connect to MongoDB at localhost:27017
```
- Ensure MongoDB is running: `mongosh` should connect
- If using Docker: `docker ps` to verify container is running
- Check `.env` file has correct `MONGO_URL`

### Frontend can't reach backend
```
Network error: Failed to fetch from EXPO_PUBLIC_BACKEND_URL
```
- Verify the IP address in `.env.local` matches your machine's actual IP
- Test: `curl http://192.168.1.100:8000/api/health`
- Ensure both devices are on the same WiFi network
- Check firewall settings

### Emulator can't reach localhost:8000
- Use your machine's IP instead: `http://192.168.1.100:8000`
- Or use Android emulator special alias: `http://10.0.2.2:8000` (Android only)

---

## Architecture

```
Frontend (Expo/React Native)
    ↓
    └─→ API Calls to Backend
            ↓
Backend (FastAPI)
    ↓
    └─→ Mock Data Generation (8 platforms)
    └─→ MongoDB (for recent searches & analytics)
```

## API Endpoints

| Endpoint | Method | Purpose |
|----------|--------|---------|
| `/api/search` | POST | Search products |
| `/api/search/stream` | GET | Stream results (SSE) |
| `/api/geocode` | GET | Reverse geocode GPS → city/PIN |
| `/api/recent-search` | POST | Save search for analytics |
| `/api/popular-searches` | GET | Get top 5 searches |
| `/api/health` | GET | Health check |

---

## Next Steps

1. **Replace mock data** with real scraper APIs (see [backend/server.py](backend/server.py) for TODO comments)
2. **Deploy to staging** (Firebase Hosting for frontend, Heroku/Railway for backend)
3. **Set up CI/CD** with GitHub Actions
4. **Add more platforms** beyond the initial 8
