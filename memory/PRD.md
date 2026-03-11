# PriceFlash - Product Requirements Document

## Overview
PriceFlash is a quick commerce price comparison mobile app for India. Users search for a product and instantly see **real-time prices** from Zepto and Blinkit, with product-to-product comparison.

## Tech Stack
- **Frontend**: React Native (Expo SDK 54) with expo-router
- **Backend**: Python FastAPI + MongoDB
- **Scraping**: Apify Client (krazee_kaushik scrapers for Zepto & Blinkit)
- **Matching**: thefuzz library for fuzzy product name matching
- **Caching**: In-memory with 10-minute TTL
- **Location**: expo-location + Nominatim reverse geocoding + city search

## Screens
1. **Home** (`/`) — Search bar, location picker (GPS/city search/pincode), Zepto & Blinkit LIVE badges, suggestion chips, coming soon platforms
2. **Results** (`/results`) — SSE progress bar during scraping, product-to-product comparison cards (Zepto vs Blinkit), sort by price/savings/match
3. **Redirect** (`/redirect`) — Deep link to platform search page

## API Endpoints
| Method | Route | Description |
|--------|-------|-------------|
| POST | `/api/search` | Real-time Apify scraping + product comparison |
| GET | `/api/search/stream` | SSE streaming with progress bar |
| GET | `/api/platforms` | Get all 8 platforms with active status |
| GET | `/api/cities` | Popular Indian cities list |
| GET | `/api/resolve-pincode` | Resolve pincode to city name |
| GET | `/api/location-search` | Search locations via Nominatim |
| GET | `/api/geocode` | Reverse geocode lat/lng → city + PIN |
| POST | `/api/recent-search` | Save search to MongoDB analytics |
| GET | `/api/popular-searches` | Get top 5 searches |
| GET | `/api/health` | Health check |

## Platforms
- **Active**: Zepto (Apify real-time), Blinkit (Apify real-time)
- **Inactive (Coming Soon)**: Swiggy Instamart, BigBasket, DMart Ready, JioMart, Amazon Fresh, Flipkart Minutes

## Real-Time Scraping
- Uses Apify actors: `krazee_kaushik/zepto-scraper` and `krazee_kaushik/blinkit-search-results-scraper`
- Both scrapers run concurrently via `asyncio.gather`
- Product matching uses thefuzz with 55% similarity threshold
- Results cached for 10 minutes to minimize API costs
- SSE endpoint streams progress updates during scraping

## Key Features
- Real-time live price scraping from Zepto & Blinkit
- Product-to-product comparison (Zepto vs Blinkit side-by-side)
- Progress bar with percentage during scraping
- "Save ₹X" badges showing price differences
- "BEST" badge on cheaper platform
- Match quality indicators (exact match / similar match)
- Location picker with GPS, city search, and pincode
- 3 sort modes: Cheapest, Most Savings, Best Match
- Coming Soon section for inactive platforms
- Dark cyberpunk UI theme (#0A0A0F background, #CCFF00 neon accents)
