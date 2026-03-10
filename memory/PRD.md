# PriceFlash - Product Requirements Document

## Overview
PriceFlash is a quick commerce price comparison mobile app for India. Users search for a product and instantly see prices across 8 major platforms — ranked by cheapest final price. One tap opens the vendor app/website.

## Tech Stack
- **Frontend**: React Native (Expo SDK 54) with expo-router
- **Backend**: Python FastAPI + MongoDB
- **Caching**: In-memory with 5-minute TTL
- **Location**: expo-location + Nominatim reverse geocoding

## Screens
1. **Home** (`/`) — Search bar, location pill (GPS or manual PIN), recent searches, suggestion chips
2. **Results** (`/results`) — 8 platform price cards sorted by price/speed/offer, progressive reveal animation, skeleton loading
3. **Redirect** (`/redirect`) — 1.5s interstitial showing platform, price, savings, then auto deep-link

## API Endpoints
| Method | Route | Description |
|--------|-------|-------------|
| POST | `/api/search` | Search product across 8 platforms (MOCK data) |
| GET | `/api/search/stream` | SSE streaming endpoint (MOCK data) |
| GET | `/api/geocode` | Reverse geocode lat/lng → city + PIN |
| POST | `/api/recent-search` | Save search to MongoDB analytics |
| GET | `/api/popular-searches` | Get top 5 searches from MongoDB |
| GET | `/api/health` | Health check |

## Platforms Supported
Blinkit, Zepto, Swiggy Instamart, BigBasket Now, DMart Ready, JioMart, Amazon Fresh, Flipkart Minutes

## Mock Data Architecture
- 25-product catalog with realistic Indian grocery items and MRPs
- Per-platform discount ranges (e.g., DMart 10-25%, Blinkit 3-15%)
- Deterministic random per cache window for consistent results
- ~92% in-stock rate per platform

### TODO: Real Scraper Integration
Replace mock data in `server.py` with real scraper API calls. Expected contract per platform:
```
POST your-scraper-api.com/scrape
Body: { "platform": "blinkit", "query": "amul butter", "pincode": "110001" }
Response: { product_name, price, mrp, discount_text, delivery_minutes, delivery_fee, in_stock }
```

## Key Features
- Progressive card reveal animation (120ms stagger)
- 3 sort modes: Best Price, Fastest, Best Offer
- Location: GPS auto-detect or manual 6-digit PIN code
- Deep linking to all 8 platform search pages
- Recent searches stored via AsyncStorage + MongoDB
- In-memory cache with 5-minute TTL
- Skeleton loading cards during fetch
- "BEST PRICE" badge on cheapest option
- Out-of-stock cards greyed out
- Dark cyberpunk UI theme (#0A0A0F background, #CCFF00 neon accents)
