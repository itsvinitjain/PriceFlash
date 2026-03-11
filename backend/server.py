from fastapi import FastAPI, APIRouter, Query
from fastapi.responses import StreamingResponse
from dotenv import load_dotenv
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
import os
import logging
from pathlib import Path
from pydantic import BaseModel
from typing import List, Optional, Dict, Any
import asyncio
import json
import time
import random
import re
import httpx
from urllib.parse import quote
from apify_client import ApifyClientAsync
from thefuzz import fuzz

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

mongo_url = os.environ['MONGO_URL']
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ['DB_NAME']]

app = FastAPI()
api_router = APIRouter(prefix="/api")

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# ========== APIFY CONFIG ==========
APIFY_API_KEY = os.environ.get('APIFY_API_KEY', '')
ZEPTO_ACTOR = "krazee_kaushik/zepto-scraper"
BLINKIT_ACTOR = "krazee_kaushik/blinkit-search-results-scraper"

# ========== IN-MEMORY CACHE ==========
_cache: dict = {}
CACHE_TTL = 600  # 10 minutes (scraping is expensive)


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
PLATFORMS = [
    {
        "id": "blinkit",
        "name": "Blinkit",
        "color": "#F9E20B",
        "base_delivery_mins": 10,
        "delivery_fee": 0,
        "deep_link_template": "https://blinkit.com/s/?q={query}",
        "active": True,
    },
    {
        "id": "zepto",
        "name": "Zepto",
        "color": "#7B2FF2",
        "base_delivery_mins": 10,
        "delivery_fee": 0,
        "deep_link_template": "https://www.zeptonow.com/search?query={query}",
        "active": True,
    },
    {
        "id": "swiggy",
        "name": "Swiggy Instamart",
        "color": "#FC8019",
        "base_delivery_mins": 15,
        "delivery_fee": 5,
        "deep_link_template": "https://www.swiggy.com/instamart/search?query={query}",
        "active": False,
    },
    {
        "id": "bigbasket",
        "name": "BigBasket Now",
        "color": "#84C225",
        "base_delivery_mins": 20,
        "delivery_fee": 0,
        "deep_link_template": "https://www.bigbasket.com/ps/?q={query}",
        "active": False,
    },
    {
        "id": "dmart",
        "name": "DMart Ready",
        "color": "#009933",
        "base_delivery_mins": 120,
        "delivery_fee": 0,
        "deep_link_template": "https://www.dmart.in/search/{query}",
        "active": False,
    },
    {
        "id": "jiomart",
        "name": "JioMart",
        "color": "#0078D7",
        "base_delivery_mins": 30,
        "delivery_fee": 0,
        "deep_link_template": "https://www.jiomart.com/search/{query}",
        "active": False,
    },
    {
        "id": "amazon",
        "name": "Amazon Fresh",
        "color": "#FF9900",
        "base_delivery_mins": 120,
        "delivery_fee": 0,
        "deep_link_template": "https://www.amazon.in/s?k={query}&i=amazonfresh",
        "active": False,
    },
    {
        "id": "flipkart",
        "name": "Flipkart Minutes",
        "color": "#2874F0",
        "base_delivery_mins": 15,
        "delivery_fee": 0,
        "deep_link_template": "https://www.flipkart.com/search?q={query}&marketplace=MINUTES",
        "active": False,
    },
]

ACTIVE_PLATFORMS = [p for p in PLATFORMS if p["active"]]
INACTIVE_PLATFORMS = [p for p in PLATFORMS if not p["active"]]

# ========== PINCODE TO CITY MAPPING ==========
PINCODE_CITY_MAP = {
    "110": "New Delhi",
    "400": "Mumbai",
    "560": "Bangalore",
    "600": "Chennai",
    "500": "Hyderabad",
    "700": "Kolkata",
    "411": "Pune",
    "380": "Ahmedabad",
    "302": "Jaipur",
    "226": "Lucknow",
    "440": "Nagpur",
    "462": "Bhopal",
    "201": "Noida",
    "122": "Gurugram",
    "208": "Kanpur",
    "360": "Rajkot",
    "395": "Surat",
    "641": "Coimbatore",
    "682": "Kochi",
    "751": "Bhubaneswar",
    "800": "Patna",
    "180": "Jammu",
    "160": "Chandigarh",
    "452": "Indore",
    "403": "Goa",
}

POPULAR_CITIES = [
    {"name": "Mumbai", "state": "Maharashtra", "pincode": "400001"},
    {"name": "New Delhi", "state": "Delhi", "pincode": "110001"},
    {"name": "Bangalore", "state": "Karnataka", "pincode": "560001"},
    {"name": "Hyderabad", "state": "Telangana", "pincode": "500001"},
    {"name": "Chennai", "state": "Tamil Nadu", "pincode": "600001"},
    {"name": "Kolkata", "state": "West Bengal", "pincode": "700001"},
    {"name": "Pune", "state": "Maharashtra", "pincode": "411001"},
    {"name": "Ahmedabad", "state": "Gujarat", "pincode": "380001"},
    {"name": "Gurugram", "state": "Haryana", "pincode": "122001"},
    {"name": "Noida", "state": "Uttar Pradesh", "pincode": "201301"},
    {"name": "Jaipur", "state": "Rajasthan", "pincode": "302001"},
    {"name": "Lucknow", "state": "Uttar Pradesh", "pincode": "226001"},
    {"name": "Chandigarh", "state": "Punjab", "pincode": "160001"},
    {"name": "Indore", "state": "Madhya Pradesh", "pincode": "452001"},
    {"name": "Kochi", "state": "Kerala", "pincode": "682001"},
    {"name": "Surat", "state": "Gujarat", "pincode": "395001"},
    {"name": "Coimbatore", "state": "Tamil Nadu", "pincode": "641001"},
    {"name": "Nagpur", "state": "Maharashtra", "pincode": "440001"},
    {"name": "Patna", "state": "Bihar", "pincode": "800001"},
    {"name": "Bhopal", "state": "Madhya Pradesh", "pincode": "462001"},
]


def resolve_city_from_pincode(pincode: str) -> str:
    """Resolve city name from pincode prefix."""
    for prefix_len in [3]:
        prefix = pincode[:prefix_len]
        if prefix in PINCODE_CITY_MAP:
            return PINCODE_CITY_MAP[prefix]
    return "Mumbai"  # Default fallback


def normalize_query(query: str) -> str:
    return re.sub(r'[^a-z0-9\s]', '', query.lower().strip())


# ========== APIFY SCRAPER FUNCTIONS ==========
async def scrape_zepto(query: str, location: str) -> List[Dict[str, Any]]:
    """Scrape Zepto for products using Apify."""
    try:
        apify_client = ApifyClientAsync(APIFY_API_KEY)
        run_input = {
            "searchQueries": [query],
            "locations": [location],
        }
        logger.info(f"Starting Zepto scrape: query={query}, location={location}")
        run = await apify_client.actor(ZEPTO_ACTOR).call(run_input=run_input, timeout_secs=120)

        if not run:
            logger.error("Zepto scraper returned no run")
            return []

        dataset_id = run.get("defaultDatasetId")
        if not dataset_id:
            logger.error("Zepto scraper returned no dataset ID")
            return []

        items = []
        dataset_client = apify_client.dataset(dataset_id)
        list_result = await dataset_client.list_items()
        if list_result and list_result.items:
            items = list_result.items

        logger.info(f"Zepto scrape returned {len(items)} items")
        if items:
            logger.info(f"Zepto sample item keys: {list(items[0].keys()) if items else 'none'}")

        return items
    except Exception as e:
        logger.error(f"Zepto scrape error: {e}")
        return []


async def scrape_blinkit(query: str, location: str) -> List[Dict[str, Any]]:
    """Scrape Blinkit for products using Apify."""
    try:
        apify_client = ApifyClientAsync(APIFY_API_KEY)
        run_input = {
            "searchQueries": [query],
            "locations": [location],
            "productsLimit": 20,
        }
        logger.info(f"Starting Blinkit scrape: query={query}, location={location}")
        run = await apify_client.actor(BLINKIT_ACTOR).call(run_input=run_input, timeout_secs=120)

        if not run:
            logger.error("Blinkit scraper returned no run")
            return []

        dataset_id = run.get("defaultDatasetId")
        if not dataset_id:
            logger.error("Blinkit scraper returned no dataset ID")
            return []

        items = []
        dataset_client = apify_client.dataset(dataset_id)
        list_result = await dataset_client.list_items()
        if list_result and list_result.items:
            items = list_result.items

        logger.info(f"Blinkit scrape returned {len(items)} items")
        if items:
            logger.info(f"Blinkit sample item keys: {list(items[0].keys()) if items else 'none'}")

        return items
    except Exception as e:
        logger.error(f"Blinkit scrape error: {e}")
        return []


def parse_price(val) -> int:
    """Parse price from various formats (string/int/float)."""
    if val is None:
        return 0
    if isinstance(val, (int, float)):
        return int(val)
    if isinstance(val, str):
        cleaned = re.sub(r'[^\d.]', '', val)
        if cleaned:
            return int(float(cleaned))
    return 0


def normalize_product_name(name: str) -> str:
    """Normalize product name for comparison."""
    if not name:
        return ""
    name = name.lower().strip()
    name = re.sub(r'[^a-z0-9\s]', '', name)
    name = re.sub(r'\s+', ' ', name)
    return name


def extract_product_data(item: Dict[str, Any], platform_id: str) -> Optional[Dict[str, Any]]:
    """Extract standardized product data from raw scraper item."""
    # Try multiple field name patterns
    name_fields = ['product_name', 'name', 'title', 'productName', 'product_title', 'Name', 'Title']
    price_fields = ['price', 'selling_price', 'sellingPrice', 'offer_price', 'offerPrice', 'Price', 'salePrice', 'sale_price']
    mrp_fields = ['mrp', 'MRP', 'original_price', 'originalPrice', 'actual_price', 'actualPrice', 'Mrp', 'marked_price']
    delivery_fields = ['delivery_time', 'deliveryTime', 'eta', 'delivery_eta', 'deliveryETA', 'delivery_minutes', 'ETA']
    stock_fields = ['in_stock', 'inStock', 'available', 'availability', 'stock', 'is_available']
    image_fields = ['image', 'imageUrl', 'image_url', 'thumbnail', 'productImage', 'product_image', 'Image']
    brand_fields = ['brand', 'Brand', 'brand_name', 'brandName']
    quantity_fields = ['quantity', 'weight', 'size', 'pack_size', 'packSize', 'unit']

    product_name = None
    for f in name_fields:
        if f in item and item[f]:
            product_name = str(item[f]).strip()
            break

    if not product_name:
        return None

    price = 0
    for f in price_fields:
        if f in item and item[f]:
            price = parse_price(item[f])
            if price > 0:
                break

    mrp = 0
    for f in mrp_fields:
        if f in item and item[f]:
            mrp = parse_price(item[f])
            if mrp > 0:
                break

    if mrp == 0:
        mrp = price

    delivery_mins = 10
    for f in delivery_fields:
        if f in item and item[f]:
            val = item[f]
            if isinstance(val, (int, float)):
                delivery_mins = int(val)
            elif isinstance(val, str):
                nums = re.findall(r'\d+', val)
                if nums:
                    delivery_mins = int(nums[0])
            break

    in_stock = True
    for f in stock_fields:
        if f in item:
            val = item[f]
            if isinstance(val, bool):
                in_stock = val
            elif isinstance(val, str):
                in_stock = val.lower() not in ['false', 'no', 'out of stock', '0', 'unavailable']
            elif isinstance(val, (int, float)):
                in_stock = val > 0
            break

    image_url = ""
    for f in image_fields:
        if f in item and item[f]:
            image_url = str(item[f])
            break

    brand = ""
    for f in brand_fields:
        if f in item and item[f]:
            brand = str(item[f]).strip()
            break

    quantity = ""
    for f in quantity_fields:
        if f in item and item[f]:
            quantity = str(item[f]).strip()
            break

    discount_amount = max(0, mrp - price)
    discount_pct = round((discount_amount / mrp * 100)) if mrp > 0 else 0

    return {
        "product_name": product_name,
        "brand": brand,
        "quantity": quantity,
        "price": price if price > 0 else mrp,
        "mrp": mrp,
        "discount_amount": discount_amount,
        "discount_pct": discount_pct,
        "delivery_minutes": delivery_mins,
        "in_stock": in_stock,
        "image_url": image_url,
        "platform_id": platform_id,
    }


def match_products(zepto_products: List[Dict], blinkit_products: List[Dict]) -> List[Dict]:
    """Match products across platforms using fuzzy name matching."""
    matched = []
    used_blinkit = set()

    for zp in zepto_products:
        z_name = normalize_product_name(zp["product_name"])
        if not z_name:
            continue

        best_match = None
        best_score = 0

        for idx, bp in enumerate(blinkit_products):
            if idx in used_blinkit:
                continue
            b_name = normalize_product_name(bp["product_name"])
            if not b_name:
                continue

            # Use fuzzy matching
            score = fuzz.token_sort_ratio(z_name, b_name)
            if score > best_score:
                best_score = score
                best_match = (idx, bp)

        if best_match and best_score >= 55:
            idx, bp = best_match
            used_blinkit.add(idx)

            # Determine best platform
            z_price = zp["price"]
            b_price = bp["price"]
            if z_price <= b_price:
                best_platform = "zepto"
                savings = b_price - z_price
            else:
                best_platform = "blinkit"
                savings = z_price - b_price

            matched.append({
                "product_name": zp["product_name"],
                "brand": zp.get("brand", "") or bp.get("brand", ""),
                "quantity": zp.get("quantity", "") or bp.get("quantity", ""),
                "image_url": zp.get("image_url", "") or bp.get("image_url", ""),
                "match_score": best_score,
                "zepto": {
                    "product_name": zp["product_name"],
                    "price": zp["price"],
                    "mrp": zp["mrp"],
                    "discount_amount": zp["discount_amount"],
                    "discount_pct": zp["discount_pct"],
                    "delivery_minutes": zp["delivery_minutes"],
                    "in_stock": zp["in_stock"],
                },
                "blinkit": {
                    "product_name": bp["product_name"],
                    "price": bp["price"],
                    "mrp": bp["mrp"],
                    "discount_amount": bp["discount_amount"],
                    "discount_pct": bp["discount_pct"],
                    "delivery_minutes": bp["delivery_minutes"],
                    "in_stock": bp["in_stock"],
                },
                "best_platform": best_platform,
                "price_diff": savings,
            })
        else:
            # Zepto-only product
            matched.append({
                "product_name": zp["product_name"],
                "brand": zp.get("brand", ""),
                "quantity": zp.get("quantity", ""),
                "image_url": zp.get("image_url", ""),
                "match_score": 0,
                "zepto": {
                    "product_name": zp["product_name"],
                    "price": zp["price"],
                    "mrp": zp["mrp"],
                    "discount_amount": zp["discount_amount"],
                    "discount_pct": zp["discount_pct"],
                    "delivery_minutes": zp["delivery_minutes"],
                    "in_stock": zp["in_stock"],
                },
                "blinkit": None,
                "best_platform": "zepto",
                "price_diff": 0,
            })

    # Add unmatched Blinkit products
    for idx, bp in enumerate(blinkit_products):
        if idx not in used_blinkit:
            matched.append({
                "product_name": bp["product_name"],
                "brand": bp.get("brand", ""),
                "quantity": bp.get("quantity", ""),
                "image_url": bp.get("image_url", ""),
                "match_score": 0,
                "zepto": None,
                "blinkit": {
                    "product_name": bp["product_name"],
                    "price": bp["price"],
                    "mrp": bp["mrp"],
                    "discount_amount": bp["discount_amount"],
                    "discount_pct": bp["discount_pct"],
                    "delivery_minutes": bp["delivery_minutes"],
                    "in_stock": bp["in_stock"],
                },
                "best_platform": "blinkit",
                "price_diff": 0,
            })

    # Sort: matched products first (by match_score desc), then by lowest price
    matched.sort(key=lambda x: (
        -x["match_score"],
        min(
            x["zepto"]["price"] if x["zepto"] else 99999,
            x["blinkit"]["price"] if x["blinkit"] else 99999
        )
    ))

    return matched


# ========== PYDANTIC MODELS ==========
class SearchRequest(BaseModel):
    query: str
    pincode: str = "400001"
    location: str = ""


class CompareResponse(BaseModel):
    query: str
    location: str
    products: List[Dict[str, Any]]
    active_platforms: List[str]
    inactive_platforms: List[Dict[str, Any]]
    scrape_time_seconds: float
    cached: bool = False
    zepto_count: int = 0
    blinkit_count: int = 0
    matched_count: int = 0


# ========== API ENDPOINTS ==========
@api_router.get("/")
async def root():
    return {"message": "PriceFlash API", "version": "2.0"}


@api_router.get("/health")
async def health():
    return {"status": "ok", "apify_configured": bool(APIFY_API_KEY)}


@api_router.get("/platforms")
async def get_platforms():
    """Get all platforms with their active status."""
    return {
        "platforms": [
            {
                "id": p["id"],
                "name": p["name"],
                "color": p["color"],
                "active": p["active"],
            }
            for p in PLATFORMS
        ],
        "active_count": len(ACTIVE_PLATFORMS),
        "total_count": len(PLATFORMS),
    }


@api_router.get("/cities")
async def get_cities(q: str = Query("", description="Search query")):
    """Get list of popular cities, optionally filtered."""
    if q:
        q_lower = q.lower()
        filtered = [c for c in POPULAR_CITIES if q_lower in c["name"].lower() or q_lower in c["state"].lower()]
        return {"cities": filtered}
    return {"cities": POPULAR_CITIES}


@api_router.get("/resolve-pincode")
async def resolve_pincode(pincode: str = Query(...)):
    """Resolve pincode to city name."""
    city = resolve_city_from_pincode(pincode)
    return {"city": city, "pincode": pincode}


@api_router.post("/search", response_model=CompareResponse)
async def search_products(request: SearchRequest):
    """
    Search and compare products across Zepto and Blinkit using real-time Apify scraping.
    Returns product-to-product price comparison.
    """
    location = request.location or resolve_city_from_pincode(request.pincode)
    query = request.query.strip()

    cache_key = f"compare:{normalize_query(query)}:{location.lower()}"
    cached = get_cache(cache_key)
    if cached:
        return {**cached, "cached": True}

    start_time = time.time()

    # Scrape both platforms concurrently
    zepto_raw, blinkit_raw = await asyncio.gather(
        scrape_zepto(query, location),
        scrape_blinkit(query, location),
        return_exceptions=True
    )

    # Handle exceptions
    if isinstance(zepto_raw, Exception):
        logger.error(f"Zepto scrape exception: {zepto_raw}")
        zepto_raw = []
    if isinstance(blinkit_raw, Exception):
        logger.error(f"Blinkit scrape exception: {blinkit_raw}")
        blinkit_raw = []

    # Parse products
    zepto_products = []
    for item in (zepto_raw or []):
        parsed = extract_product_data(item, "zepto")
        if parsed:
            zepto_products.append(parsed)

    blinkit_products = []
    for item in (blinkit_raw or []):
        parsed = extract_product_data(item, "blinkit")
        if parsed:
            blinkit_products.append(parsed)

    # Match products across platforms
    comparison = match_products(zepto_products, blinkit_products)
    matched_count = sum(1 for p in comparison if p["zepto"] and p["blinkit"])

    elapsed = round(time.time() - start_time, 1)

    inactive_info = [
        {"id": p["id"], "name": p["name"], "color": p["color"]}
        for p in INACTIVE_PLATFORMS
    ]

    response_data = {
        "query": query,
        "location": location,
        "products": comparison[:30],  # Limit to 30 products
        "active_platforms": ["zepto", "blinkit"],
        "inactive_platforms": inactive_info,
        "scrape_time_seconds": elapsed,
        "cached": False,
        "zepto_count": len(zepto_products),
        "blinkit_count": len(blinkit_products),
        "matched_count": matched_count,
    }

    set_cache(cache_key, response_data)

    # Save to MongoDB for analytics
    try:
        await db.searches.insert_one({
            "query": query,
            "location": location,
            "pincode": request.pincode,
            "zepto_count": len(zepto_products),
            "blinkit_count": len(blinkit_products),
            "matched_count": matched_count,
            "scrape_time": elapsed,
            "timestamp": time.time(),
        })
    except Exception as e:
        logger.error(f"MongoDB save error: {e}")

    return response_data


@api_router.get("/search/stream")
async def search_stream(
    query: str = Query(...),
    pincode: str = Query("400001"),
    location: str = Query("")
):
    """
    SSE endpoint — streams progress updates and results as scrapers complete.
    """
    resolved_location = location or resolve_city_from_pincode(pincode)

    async def event_generator():
        start_time = time.time()

        # Check cache first
        cache_key = f"compare:{normalize_query(query)}:{resolved_location.lower()}"
        cached = get_cache(cache_key)
        if cached:
            yield f"data: {json.dumps({'type': 'progress', 'percent': 100, 'message': 'Loaded from cache!'})}\n\n"
            yield f"data: {json.dumps({'type': 'result', 'data': {**cached, 'cached': True}})}\n\n"
            yield f"data: {json.dumps({'type': 'done'})}\n\n"
            return

        # Progress: Starting
        yield f"data: {json.dumps({'type': 'progress', 'percent': 5, 'message': 'Starting price comparison...'})}\n\n"
        await asyncio.sleep(0.3)

        yield f"data: {json.dumps({'type': 'progress', 'percent': 10, 'message': 'Connecting to Zepto & Blinkit...'})}\n\n"
        await asyncio.sleep(0.3)

        # Scrape Zepto
        yield f"data: {json.dumps({'type': 'progress', 'percent': 15, 'message': 'Scraping Zepto prices...'})}\n\n"

        zepto_task = asyncio.create_task(scrape_zepto(query, resolved_location))
        blinkit_task = asyncio.create_task(scrape_blinkit(query, resolved_location))

        # Poll for progress while waiting
        percent = 15
        while not zepto_task.done() or not blinkit_task.done():
            await asyncio.sleep(2)
            percent = min(percent + 5, 85)

            if zepto_task.done() and not blinkit_task.done():
                msg = "Zepto done! Waiting for Blinkit..."
                percent = max(percent, 55)
            elif blinkit_task.done() and not zepto_task.done():
                msg = "Blinkit done! Waiting for Zepto..."
                percent = max(percent, 55)
            else:
                msg = "Fetching live prices from both platforms..."

            yield f"data: {json.dumps({'type': 'progress', 'percent': percent, 'message': msg})}\n\n"

        yield f"data: {json.dumps({'type': 'progress', 'percent': 88, 'message': 'Processing results...'})}\n\n"

        # Get results
        zepto_raw = []
        blinkit_raw = []
        try:
            zepto_raw = zepto_task.result()
        except Exception as e:
            logger.error(f"Zepto stream error: {e}")
        try:
            blinkit_raw = blinkit_task.result()
        except Exception as e:
            logger.error(f"Blinkit stream error: {e}")

        yield f"data: {json.dumps({'type': 'progress', 'percent': 92, 'message': 'Matching products across platforms...'})}\n\n"

        # Parse
        zepto_products = [p for item in (zepto_raw or []) if (p := extract_product_data(item, "zepto"))]
        blinkit_products = [p for item in (blinkit_raw or []) if (p := extract_product_data(item, "blinkit"))]

        # Match
        comparison = match_products(zepto_products, blinkit_products)
        matched_count = sum(1 for p in comparison if p["zepto"] and p["blinkit"])

        elapsed = round(time.time() - start_time, 1)

        inactive_info = [
            {"id": p["id"], "name": p["name"], "color": p["color"]}
            for p in INACTIVE_PLATFORMS
        ]

        response_data = {
            "query": query,
            "location": resolved_location,
            "products": comparison[:30],
            "active_platforms": ["zepto", "blinkit"],
            "inactive_platforms": inactive_info,
            "scrape_time_seconds": elapsed,
            "cached": False,
            "zepto_count": len(zepto_products),
            "blinkit_count": len(blinkit_products),
            "matched_count": matched_count,
        }

        set_cache(cache_key, response_data)

        yield f"data: {json.dumps({'type': 'progress', 'percent': 100, 'message': f'Found {len(comparison)} products in {elapsed}s!'})}\n\n"
        await asyncio.sleep(0.2)

        yield f"data: {json.dumps({'type': 'result', 'data': response_data})}\n\n"
        yield f"data: {json.dumps({'type': 'done'})}\n\n"

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
                headers={"User-Agent": "PriceFlash/2.0"},
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
            pincode = address.get("postcode", "400001")
            return {
                "city": city,
                "pincode": pincode,
                "display": f"{city} · {pincode}",
            }
    except Exception as e:
        logger.error(f"Geocode error: {e}")
        return {"city": "Mumbai", "pincode": "400001", "display": "Mumbai · 400001"}


@api_router.get("/location-search")
async def location_search(q: str = Query(..., min_length=2)):
    """Search for locations using Nominatim (free alternative to Google Places)."""
    try:
        async with httpx.AsyncClient() as http_client:
            resp = await http_client.get(
                "https://nominatim.openstreetmap.org/search",
                params={
                    "format": "json",
                    "q": f"{q}, India",
                    "limit": 5,
                    "addressdetails": 1,
                    "countrycodes": "in",
                },
                headers={"User-Agent": "PriceFlash/2.0"},
                timeout=5.0,
            )
            data = resp.json()
            results = []
            for item in data:
                address = item.get("address", {})
                city = (
                    address.get("city")
                    or address.get("town")
                    or address.get("village")
                    or address.get("state_district")
                    or ""
                )
                state = address.get("state", "")
                pincode = address.get("postcode", "")
                display_name = item.get("display_name", "")

                if city:
                    results.append({
                        "city": city,
                        "state": state,
                        "pincode": pincode,
                        "display": f"{city}, {state}" if state else city,
                        "lat": float(item.get("lat", 0)),
                        "lng": float(item.get("lon", 0)),
                    })

            # Deduplicate by city
            seen = set()
            unique = []
            for r in results:
                if r["city"] not in seen:
                    seen.add(r["city"])
                    unique.append(r)

            return {"results": unique}
    except Exception as e:
        logger.error(f"Location search error: {e}")
        return {"results": []}


# ========== RECENT SEARCHES (MongoDB) ==========
@api_router.post("/recent-search")
async def save_recent_search(data: dict):
    """Save a recent search to MongoDB for analytics."""
    await db.recent_searches.insert_one({
        "query": data.get("query", ""),
        "pincode": data.get("pincode", ""),
        "location": data.get("location", ""),
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
