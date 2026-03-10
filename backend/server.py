from fastapi import FastAPI, APIRouter, Query
from fastapi.responses import StreamingResponse
from dotenv import load_dotenv
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
import os
import logging
from pathlib import Path
from pydantic import BaseModel
from typing import List, Optional
import asyncio
import json
import time
import random
import re
import httpx
from urllib.parse import quote

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

mongo_url = os.environ['MONGO_URL']
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ['DB_NAME']]

app = FastAPI()
api_router = APIRouter(prefix="/api")

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# ========== IN-MEMORY CACHE ==========
_cache: dict = {}
CACHE_TTL = 300  # 5 minutes


def get_cache(key: str):
    if key in _cache:
        entry = _cache[key]
        if time.time() - entry["ts"] < CACHE_TTL:
            return entry["data"]
        del _cache[key]
    return None


def set_cache(key: str, data: dict):
    _cache[key] = {"data": data, "ts": time.time()}


# ========== PLATFORM CONFIGURATION ==========
# TODO: Replace mock data with real scraper API calls.
# Each platform entry below contains all info needed to build a scraper.
# To integrate a real API, create a scraper function per platform that:
#   - Takes (query: str, pincode: str) as input
#   - Returns a dict matching the SearchResult schema below
#   - Handles errors gracefully (return None on failure)
#
# Example scraper signature:
#   async def scrape_blinkit(query: str, pincode: str) -> Optional[dict]:
#       # Call your scraping API here
#       # API should accept: query, pincode/location
#       # API should return: product_name, price, mrp, delivery_minutes, in_stock
#       pass

PLATFORMS = [
    {
        "id": "blinkit",
        "name": "Blinkit",
        "color": "#F9E20B",
        "base_delivery_mins": 10,
        "delivery_fee": 0,
        "deep_link_template": "https://blinkit.com/s/?q={query}",
    },
    {
        "id": "zepto",
        "name": "Zepto",
        "color": "#7B2FF2",
        "base_delivery_mins": 10,
        "delivery_fee": 0,
        "deep_link_template": "https://www.zeptonow.com/search?query={query}",
    },
    {
        "id": "swiggy",
        "name": "Swiggy Instamart",
        "color": "#FC8019",
        "base_delivery_mins": 15,
        "delivery_fee": 5,
        "deep_link_template": "https://www.swiggy.com/instamart/search?query={query}",
    },
    {
        "id": "bigbasket",
        "name": "BigBasket Now",
        "color": "#84C225",
        "base_delivery_mins": 20,
        "delivery_fee": 0,
        "deep_link_template": "https://www.bigbasket.com/ps/?q={query}",
    },
    {
        "id": "dmart",
        "name": "DMart Ready",
        "color": "#009933",
        "base_delivery_mins": 120,
        "delivery_fee": 0,
        "deep_link_template": "https://www.dmart.in/search/{query}",
    },
    {
        "id": "jiomart",
        "name": "JioMart",
        "color": "#0078D7",
        "base_delivery_mins": 30,
        "delivery_fee": 0,
        "deep_link_template": "https://www.jiomart.com/search/{query}",
    },
    {
        "id": "amazon",
        "name": "Amazon Fresh",
        "color": "#FF9900",
        "base_delivery_mins": 120,
        "delivery_fee": 0,
        "deep_link_template": "https://www.amazon.in/s?k={query}&i=amazonfresh",
    },
    {
        "id": "flipkart",
        "name": "Flipkart Minutes",
        "color": "#2874F0",
        "base_delivery_mins": 15,
        "delivery_fee": 0,
        "deep_link_template": "https://www.flipkart.com/search?q={query}&marketplace=MINUTES",
    },
]

# ========== PRODUCT CATALOG (MOCK DATA) ==========
# TODO: Replace with real product database or scraper results
PRODUCT_CATALOG = [
    {"name": "Amul Butter 500g", "brand": "Amul", "mrp": 285, "keywords": ["amul", "butter", "500g", "500gm", "dairy"]},
    {"name": "Tata Salt 1kg", "brand": "Tata", "mrp": 28, "keywords": ["tata", "salt", "1kg", "iodised", "namak"]},
    {"name": "Fortune Sunlite Oil 1L", "brand": "Fortune", "mrp": 155, "keywords": ["fortune", "oil", "sunlite", "1l", "cooking", "sunflower"]},
    {"name": "Maggi 2-Minute Noodles 280g", "brand": "Maggi", "mrp": 56, "keywords": ["maggi", "noodles", "instant", "280g", "2 minute"]},
    {"name": "Parle-G Biscuits 800g", "brand": "Parle", "mrp": 80, "keywords": ["parle", "biscuit", "800g", "parleg", "glucose"]},
    {"name": "Tropicana Orange Juice 1L", "brand": "Tropicana", "mrp": 120, "keywords": ["tropicana", "orange", "juice", "1l", "1 litre"]},
    {"name": "Haldiram's Aloo Bhujia 400g", "brand": "Haldiram", "mrp": 140, "keywords": ["haldiram", "aloo", "bhujia", "400g", "snack", "namkeen"]},
    {"name": "Surf Excel Matic 2kg", "brand": "Surf Excel", "mrp": 430, "keywords": ["surf", "excel", "matic", "2kg", "detergent", "washing"]},
    {"name": "Amul Milk 1L Toned", "brand": "Amul", "mrp": 60, "keywords": ["amul", "milk", "1l", "toned", "dairy"]},
    {"name": "Aashirvaad Atta 5kg", "brand": "Aashirvaad", "mrp": 300, "keywords": ["aashirvaad", "atta", "5kg", "wheat", "flour", "whole wheat"]},
    {"name": "Coca-Cola 750ml", "brand": "Coca-Cola", "mrp": 40, "keywords": ["coca", "cola", "coke", "750ml", "soft drink", "cold drink"]},
    {"name": "Lay's Classic Salted 90g", "brand": "Lay's", "mrp": 30, "keywords": ["lays", "chips", "classic", "salted", "90g", "potato"]},
    {"name": "Britannia Good Day 600g", "brand": "Britannia", "mrp": 120, "keywords": ["britannia", "good day", "butter", "biscuit", "600g", "cookies"]},
    {"name": "Nescafe Classic 100g", "brand": "Nescafe", "mrp": 295, "keywords": ["nescafe", "coffee", "classic", "100g", "instant"]},
    {"name": "Vim Liquid 500ml", "brand": "Vim", "mrp": 99, "keywords": ["vim", "liquid", "dish", "wash", "500ml", "dishwash"]},
    {"name": "Dettol Soap 125g Pack of 4", "brand": "Dettol", "mrp": 198, "keywords": ["dettol", "soap", "125g", "4 pack", "antibacterial"]},
    {"name": "Mother Dairy Dahi 400g", "brand": "Mother Dairy", "mrp": 45, "keywords": ["mother dairy", "dahi", "curd", "400g", "yogurt"]},
    {"name": "Kurkure Masala Munch 100g", "brand": "Kurkure", "mrp": 20, "keywords": ["kurkure", "masala", "munch", "100g", "snack"]},
    {"name": "Kissan Tomato Ketchup 500g", "brand": "Kissan", "mrp": 115, "keywords": ["kissan", "ketchup", "tomato", "500g", "sauce"]},
    {"name": "Cadbury Dairy Milk Silk 150g", "brand": "Cadbury", "mrp": 180, "keywords": ["cadbury", "dairy milk", "silk", "chocolate", "150g"]},
    {"name": "Colgate MaxFresh 150g", "brand": "Colgate", "mrp": 95, "keywords": ["colgate", "maxfresh", "toothpaste", "150g"]},
    {"name": "Rin Liquid 1L", "brand": "Rin", "mrp": 145, "keywords": ["rin", "liquid", "detergent", "1l", "washing"]},
    {"name": "Thums Up 750ml", "brand": "Thums Up", "mrp": 40, "keywords": ["thums up", "750ml", "soft drink", "cold drink"]},
    {"name": "Bournvita 500g", "brand": "Bournvita", "mrp": 240, "keywords": ["bournvita", "500g", "health drink", "chocolate"]},
    {"name": "Pepsodent 200g", "brand": "Pepsodent", "mrp": 79, "keywords": ["pepsodent", "toothpaste", "200g"]},
]

# Seed random with a fixed value per query for consistent mock data
# but different across platforms


def normalize_query(query: str) -> str:
    return re.sub(r'[^a-z0-9\s]', '', query.lower().strip())


def match_products(query: str) -> list:
    normalized = normalize_query(query)
    words = normalized.split()
    matches = []
    for product in PRODUCT_CATALOG:
        score = 0
        product_text = normalize_query(
            product["name"] + " " + product["brand"] + " " + " ".join(product["keywords"])
        )
        for word in words:
            if word in product_text:
                score += 1
        if score > 0:
            matches.append((product, score))
    matches.sort(key=lambda x: -x[1])
    if matches:
        return [m[0] for m in matches[:3]]
    # No catalog match — return generic result
    return [{
        "name": query.title(),
        "brand": "Generic",
        "mrp": random.randint(80, 400),
        "keywords": words,
    }]


def generate_platform_result(platform: dict, product: dict, query: str, seed: int) -> dict:
    # Use deterministic random per platform+product combo for consistency within a cache window
    rng = random.Random(seed + hash(platform["id"]))
    mrp = product["mrp"]

    # Platform-specific discount ranges
    discount_ranges = {
        "blinkit": (0.03, 0.15),
        "zepto": (0.05, 0.18),
        "swiggy": (0.02, 0.12),
        "bigbasket": (0.05, 0.20),
        "dmart": (0.10, 0.25),
        "jiomart": (0.05, 0.15),
        "amazon": (0.03, 0.12),
        "flipkart": (0.04, 0.14),
    }
    lo, hi = discount_ranges.get(platform["id"], (0.05, 0.15))
    discount_pct = rng.uniform(lo, hi)
    price = max(1, round(mrp * (1 - discount_pct)))
    discount_amount = mrp - price

    delivery_mins = platform["base_delivery_mins"] + rng.randint(-2, 8)
    delivery_mins = max(5, delivery_mins)
    delivery_fee = platform["delivery_fee"]
    in_stock = rng.random() > 0.08  # 92% chance in stock

    offer_texts = [
        f"Save ₹{discount_amount}",
        f"{round(discount_pct * 100)}% OFF",
        f"₹{discount_amount} off MRP",
    ]

    final_price = price + delivery_fee
    encoded_query = quote(query)
    deep_link = platform["deep_link_template"].replace("{query}", encoded_query)

    return {
        "platform": platform["name"],
        "platform_id": platform["id"],
        "platform_color": platform["color"],
        "product_name": product["name"],
        "price": price,
        "mrp": mrp,
        "discount_text": rng.choice(offer_texts) if discount_amount > 0 else "",
        "delivery_minutes": delivery_mins,
        "delivery_fee": delivery_fee,
        "final_price": final_price,
        "in_stock": in_stock,
        "deep_link": deep_link,
        "match_type": "exact",
    }


# ========== PYDANTIC MODELS ==========
class SearchRequest(BaseModel):
    query: str
    pincode: str = "110001"


class SearchResult(BaseModel):
    platform: str
    platform_id: str
    platform_color: str
    product_name: str
    price: int
    mrp: int
    discount_text: str
    delivery_minutes: int
    delivery_fee: int
    final_price: int
    in_stock: bool
    deep_link: str
    match_type: str


class SearchResponse(BaseModel):
    query: str
    pincode: str
    result_count: int
    results: List[SearchResult]
    sorted_by: str = "final_price"
    cached: bool = False


# ========== API ENDPOINTS ==========
@api_router.get("/")
async def root():
    return {"message": "PriceFlash API", "version": "1.0"}


@api_router.get("/health")
async def health():
    return {"status": "ok"}


@api_router.post("/search", response_model=SearchResponse)
async def search_products(request: SearchRequest):
    """
    Search for a product across all 8 platforms.

    TODO: Replace mock data generation with real scraper API calls.
    Expected scraper API contract:
        POST your-scraper-api.com/scrape
        Body: { "platform": "blinkit", "query": "amul butter", "pincode": "110001" }
        Response: {
            "product_name": str,
            "price": int,
            "mrp": int,
            "discount_text": str,
            "delivery_minutes": int,
            "delivery_fee": int,
            "in_stock": bool
        }
    """
    cache_key = f"prices:{request.pincode}:{normalize_query(request.query)}"
    cached = get_cache(cache_key)
    if cached:
        return {**cached, "cached": True}

    products = match_products(request.query)
    product = products[0]

    seed = int(time.time()) // CACHE_TTL  # Same seed within cache window

    results = []
    for platform in PLATFORMS:
        result = generate_platform_result(platform, product, request.query, seed)
        results.append(result)

    # Sort: in-stock first, then by final_price ascending
    results.sort(key=lambda x: (not x["in_stock"], x["final_price"]))

    response_data = {
        "query": request.query,
        "pincode": request.pincode,
        "result_count": len(results),
        "results": results,
        "sorted_by": "final_price",
        "cached": False,
    }

    set_cache(cache_key, response_data)
    return response_data


@api_router.get("/search/stream")
async def search_stream(query: str = Query(...), pincode: str = Query("110001")):
    """
    SSE endpoint — streams each platform result as it arrives.
    TODO: Replace mock delays with real async scraper calls.
    """
    async def event_generator():
        products = match_products(query)
        product = products[0]
        seed = int(time.time()) // CACHE_TTL

        platforms_shuffled = PLATFORMS.copy()
        random.shuffle(platforms_shuffled)

        for platform in platforms_shuffled:
            await asyncio.sleep(random.uniform(0.2, 0.7))
            result = generate_platform_result(platform, product, query, seed)
            yield f"data: {json.dumps(result)}\n\n"

        yield f"data: {json.dumps({'done': True})}\n\n"

    return StreamingResponse(
        event_generator(),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "Connection": "keep-alive",
            "X-Accel-Buffering": "no",
        },
    )


@api_router.get("/geocode")
async def geocode(lat: float = Query(...), lng: float = Query(...)):
    """Reverse geocode GPS coordinates to city + PIN code using Nominatim."""
    try:
        async with httpx.AsyncClient() as http_client:
            resp = await http_client.get(
                "https://nominatim.openstreetmap.org/reverse",
                params={
                    "format": "json",
                    "lat": lat,
                    "lon": lng,
                    "zoom": 10,
                    "addressdetails": 1,
                },
                headers={"User-Agent": "PriceFlash/1.0"},
                timeout=5.0,
            )
            data = resp.json()
            address = data.get("address", {})
            city = (
                address.get("city")
                or address.get("town")
                or address.get("village")
                or address.get("state_district")
                or "Unknown"
            )
            pincode = address.get("postcode", "110001")
            return {
                "city": city,
                "pincode": pincode,
                "display": f"{city} · {pincode}",
            }
    except Exception as e:
        logger.error(f"Geocode error: {e}")
        return {"city": "Delhi", "pincode": "110001", "display": "Delhi · 110001"}


# ========== RECENT SEARCHES (MongoDB) ==========
@api_router.post("/recent-search")
async def save_recent_search(data: dict):
    """Save a recent search to MongoDB for analytics."""
    await db.recent_searches.insert_one({
        "query": data.get("query", ""),
        "pincode": data.get("pincode", ""),
        "timestamp": time.time(),
    })
    return {"status": "saved"}


@api_router.get("/popular-searches")
async def get_popular_searches():
    """Get top 5 most searched products."""
    pipeline = [
        {"$group": {"_id": "$query", "count": {"$sum": 1}}},
        {"$sort": {"count": -1}},
        {"$limit": 5},
        {"$project": {"_id": 0, "query": "$_id", "count": 1}},
    ]
    results = await db.recent_searches.aggregate(pipeline).to_list(5)
    return {"popular": results}


# ========== APP SETUP ==========
app.include_router(api_router)

app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.on_event("shutdown")
async def shutdown_db_client():
    client.close()
