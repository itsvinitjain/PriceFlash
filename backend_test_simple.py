#!/usr/bin/env python3
"""
PriceFlash Backend API Test Suite - Simplified
"""
import requests
import json
import time

# Backend URL from frontend .env
BACKEND_URL = "https://product-price-pulse.preview.emergentagent.com/api"

def test_all_endpoints():
    """Test all endpoints and return results"""
    results = []
    
    # 1. Health endpoint
    print("Testing /api/health...")
    try:
        response = requests.get(f"{BACKEND_URL}/health", timeout=10)
        if response.status_code == 200:
            data = response.json()
            if data.get("status") == "ok" and data.get("apify_configured") is True:
                results.append("✅ Health Check: Status OK, Apify configured")
            else:
                results.append(f"❌ Health Check: {data}")
        else:
            results.append(f"❌ Health Check: HTTP {response.status_code}")
    except Exception as e:
        results.append(f"❌ Health Check: {str(e)}")
    
    # 2. Platforms endpoint
    print("Testing /api/platforms...")
    try:
        response = requests.get(f"{BACKEND_URL}/platforms", timeout=10)
        if response.status_code == 200:
            data = response.json()
            platforms = data.get("platforms", [])
            if len(platforms) == 8:
                active = [p for p in platforms if p.get("active")]
                if len(active) == 2:
                    active_names = {p["id"] for p in active}
                    if "zepto" in active_names and "blinkit" in active_names:
                        results.append("✅ Platforms: 8 platforms, 2 active (zepto, blinkit), 6 inactive")
                    else:
                        results.append(f"❌ Platforms: Wrong active platforms: {active_names}")
                else:
                    results.append(f"❌ Platforms: Expected 2 active, got {len(active)}")
            else:
                results.append(f"❌ Platforms: Expected 8 platforms, got {len(platforms)}")
        else:
            results.append(f"❌ Platforms: HTTP {response.status_code}")
    except Exception as e:
        results.append(f"❌ Platforms: {str(e)}")
    
    # 3. Cities endpoint
    print("Testing /api/cities...")
    try:
        response = requests.get(f"{BACKEND_URL}/cities", timeout=10)
        if response.status_code == 200:
            data = response.json()
            cities = data.get("cities", [])
            mumbai_found = any(city.get("name") == "Mumbai" for city in cities)
            if mumbai_found and len(cities) > 0:
                results.append(f"✅ Cities: Returned {len(cities)} cities including Mumbai")
            else:
                results.append("❌ Cities: Mumbai not found or no cities")
        else:
            results.append(f"❌ Cities: HTTP {response.status_code}")
    except Exception as e:
        results.append(f"❌ Cities: {str(e)}")
    
    # 4. Resolve pincode endpoint
    print("Testing /api/resolve-pincode...")
    try:
        response = requests.get(f"{BACKEND_URL}/resolve-pincode?pincode=400001", timeout=10)
        if response.status_code == 200:
            data = response.json()
            if data.get("city") == "Mumbai" and data.get("pincode") == "400001":
                results.append("✅ Resolve Pincode: 400001 resolved to Mumbai")
            else:
                results.append(f"❌ Resolve Pincode: {data}")
        else:
            results.append(f"❌ Resolve Pincode: HTTP {response.status_code}")
    except Exception as e:
        results.append(f"❌ Resolve Pincode: {str(e)}")
    
    # 5. Location search endpoint
    print("Testing /api/location-search...")
    try:
        response = requests.get(f"{BACKEND_URL}/location-search?q=Mumbai", timeout=15)
        if response.status_code == 200:
            data = response.json()
            results_list = data.get("results", [])
            mumbai_found = any("mumbai" in result.get("city", "").lower() for result in results_list)
            if mumbai_found:
                results.append(f"✅ Location Search: Found Mumbai in {len(results_list)} results")
            else:
                results.append(f"❌ Location Search: Mumbai not found in {len(results_list)} results")
        else:
            results.append(f"❌ Location Search: HTTP {response.status_code}")
    except Exception as e:
        results.append(f"❌ Location Search: {str(e)}")
    
    # 6. Search endpoint (main product search)
    print("Testing /api/search (may take 30+ seconds)...")
    try:
        payload = {"query": "milk", "location": "Mumbai"}
        start_time = time.time()
        response = requests.post(f"{BACKEND_URL}/search", json=payload, timeout=90)
        elapsed = time.time() - start_time
        
        if response.status_code == 200:
            data = response.json()
            query = data.get("query")
            location = data.get("location") 
            products = data.get("products", [])
            zepto_count = data.get("zepto_count", 0)
            blinkit_count = data.get("blinkit_count", 0)
            
            if query == "milk" and location == "Mumbai" and len(products) > 0:
                results.append(f"✅ Search: Found {len(products)} products ({zepto_count} Zepto, {blinkit_count} Blinkit) in {elapsed:.1f}s")
            else:
                results.append(f"❌ Search: Query mismatch or no products: {query}/{location}, {len(products)} products")
        else:
            results.append(f"❌ Search: HTTP {response.status_code}: {response.text[:100]}")
    except Exception as e:
        results.append(f"❌ Search: {str(e)}")
    
    # 7. SSE Stream endpoint (test basic connectivity)
    print("Testing /api/search/stream (basic connectivity test)...")
    try:
        url = f"{BACKEND_URL}/search/stream?query=milk&location=Mumbai"
        response = requests.get(url, stream=True, timeout=10)
        
        if response.status_code == 200:
            # Just check if we can connect and get some data
            first_line = None
            for line in response.iter_lines(decode_unicode=True):
                if line.startswith("data: "):
                    first_line = line
                    break
            
            if first_line:
                results.append("✅ SSE Stream: Connected successfully and receiving events")
            else:
                results.append("❌ SSE Stream: Connected but no data received")
        else:
            results.append(f"❌ SSE Stream: HTTP {response.status_code}")
    except Exception as e:
        results.append(f"❌ SSE Stream: {str(e)}")
    
    return results

if __name__ == "__main__":
    print(f"🚀 PriceFlash Backend API Test")
    print(f"🔗 Backend URL: {BACKEND_URL}")
    print("=" * 50)
    
    results = test_all_endpoints()
    
    print("\n" + "=" * 50)
    print("📊 RESULTS:")
    print("=" * 50)
    
    passed = 0
    failed = 0
    
    for result in results:
        print(result)
        if result.startswith("✅"):
            passed += 1
        else:
            failed += 1
    
    print(f"\n📈 Summary: {passed} passed, {failed} failed")
    
    if failed == 0:
        print("🎉 All tests passed!")
    else:
        print(f"🔥 {failed} tests failed")