#!/usr/bin/env python3
"""
PriceFlash Backend API Test Suite
Tests all backend API endpoints with real data.
"""
import requests
import json
import time
import sys
from typing import Dict, Any, List

# Backend URL from frontend .env
BACKEND_URL = "https://product-price-pulse.preview.emergentagent.com/api"

class PriceFlashTester:
    def __init__(self):
        self.passed_tests = []
        self.failed_tests = []
        self.warnings = []
        
    def log_result(self, test_name: str, success: bool, details: str = "", is_warning: bool = False):
        """Log test result"""
        if is_warning:
            self.warnings.append(f"⚠️  {test_name}: {details}")
        elif success:
            self.passed_tests.append(f"✅ {test_name}: {details}")
        else:
            self.failed_tests.append(f"❌ {test_name}: {details}")
    
    def test_health_endpoint(self):
        """Test GET /api/health"""
        print("\n🔍 Testing Health Endpoint...")
        try:
            response = requests.get(f"{BACKEND_URL}/health", timeout=10)
            
            if response.status_code == 200:
                data = response.json()
                if data.get("status") == "ok":
                    if data.get("apify_configured") is True:
                        self.log_result("Health Check", True, "Status OK, Apify configured")
                    else:
                        self.log_result("Health Check", False, f"Apify not configured: {data}")
                else:
                    self.log_result("Health Check", False, f"Status not OK: {data}")
            else:
                self.log_result("Health Check", False, f"HTTP {response.status_code}: {response.text}")
                
        except Exception as e:
            self.log_result("Health Check", False, f"Request failed: {str(e)}")
    
    def test_platforms_endpoint(self):
        """Test GET /api/platforms"""
        print("\n🔍 Testing Platforms Endpoint...")
        try:
            response = requests.get(f"{BACKEND_URL}/platforms", timeout=10)
            
            if response.status_code == 200:
                data = response.json()
                platforms = data.get("platforms", [])
                
                if len(platforms) == 8:
                    active_platforms = [p for p in platforms if p.get("active")]
                    inactive_platforms = [p for p in platforms if not p.get("active")]
                    
                    if len(active_platforms) == 2:
                        active_names = {p["id"] for p in active_platforms}
                        if "zepto" in active_names and "blinkit" in active_names:
                            self.log_result("Platforms Endpoint", True, 
                                          f"8 platforms total, 2 active (zepto, blinkit), 6 inactive")
                        else:
                            self.log_result("Platforms Endpoint", False, 
                                          f"Wrong active platforms: {active_names}")
                    else:
                        self.log_result("Platforms Endpoint", False, 
                                      f"Expected 2 active platforms, got {len(active_platforms)}")
                else:
                    self.log_result("Platforms Endpoint", False, 
                                  f"Expected 8 platforms, got {len(platforms)}")
            else:
                self.log_result("Platforms Endpoint", False, f"HTTP {response.status_code}: {response.text}")
                
        except Exception as e:
            self.log_result("Platforms Endpoint", False, f"Request failed: {str(e)}")
    
    def test_cities_endpoint(self):
        """Test GET /api/cities"""
        print("\n🔍 Testing Cities Endpoint...")
        try:
            response = requests.get(f"{BACKEND_URL}/cities", timeout=10)
            
            if response.status_code == 200:
                data = response.json()
                cities = data.get("cities", [])
                
                if len(cities) > 0:
                    # Check if Mumbai is in the list
                    mumbai_found = any(city.get("name") == "Mumbai" for city in cities)
                    if mumbai_found:
                        self.log_result("Cities Endpoint", True, f"Returned {len(cities)} cities including Mumbai")
                    else:
                        self.log_result("Cities Endpoint", False, "Mumbai not found in cities list")
                else:
                    self.log_result("Cities Endpoint", False, "No cities returned")
            else:
                self.log_result("Cities Endpoint", False, f"HTTP {response.status_code}: {response.text}")
                
        except Exception as e:
            self.log_result("Cities Endpoint", False, f"Request failed: {str(e)}")
    
    def test_resolve_pincode_endpoint(self):
        """Test GET /api/resolve-pincode?pincode=400001"""
        print("\n🔍 Testing Resolve Pincode Endpoint...")
        try:
            response = requests.get(f"{BACKEND_URL}/resolve-pincode?pincode=400001", timeout=10)
            
            if response.status_code == 200:
                data = response.json()
                city = data.get("city")
                pincode = data.get("pincode")
                
                if city == "Mumbai" and pincode == "400001":
                    self.log_result("Resolve Pincode", True, f"400001 resolved to Mumbai")
                else:
                    self.log_result("Resolve Pincode", False, f"Expected Mumbai/400001, got {city}/{pincode}")
            else:
                self.log_result("Resolve Pincode", False, f"HTTP {response.status_code}: {response.text}")
                
        except Exception as e:
            self.log_result("Resolve Pincode", False, f"Request failed: {str(e)}")
    
    def test_location_search_endpoint(self):
        """Test GET /api/location-search?q=Mumbai"""
        print("\n🔍 Testing Location Search Endpoint...")
        try:
            response = requests.get(f"{BACKEND_URL}/location-search?q=Mumbai", timeout=15)
            
            if response.status_code == 200:
                data = response.json()
                results = data.get("results", [])
                
                if len(results) > 0:
                    # Check if Mumbai is in the results
                    mumbai_found = any("mumbai" in result.get("city", "").lower() for result in results)
                    if mumbai_found:
                        self.log_result("Location Search", True, f"Found {len(results)} location results including Mumbai")
                    else:
                        self.log_result("Location Search", False, f"Mumbai not found in {len(results)} results")
                else:
                    self.log_result("Location Search", False, "No location results returned")
            else:
                self.log_result("Location Search", False, f"HTTP {response.status_code}: {response.text}")
                
        except Exception as e:
            self.log_result("Location Search", False, f"Request failed: {str(e)}")
    
    def test_search_endpoint(self):
        """Test POST /api/search - Main product search with Apify scraping"""
        print("\n🔍 Testing Main Search Endpoint (may take 60+ seconds)...")
        print("   This endpoint calls real Apify scrapers which take 20-60 seconds...")
        
        try:
            payload = {
                "query": "milk", 
                "location": "Mumbai"
            }
            
            start_time = time.time()
            response = requests.post(
                f"{BACKEND_URL}/search", 
                json=payload, 
                timeout=120  # 2 minutes timeout
            )
            elapsed = time.time() - start_time
            
            if response.status_code == 200:
                data = response.json()
                
                # Check required fields
                query = data.get("query")
                location = data.get("location") 
                products = data.get("products", [])
                active_platforms = data.get("active_platforms", [])
                zepto_count = data.get("zepto_count", 0)
                blinkit_count = data.get("blinkit_count", 0)
                scrape_time = data.get("scrape_time_seconds", 0)
                
                if query == "milk" and location == "Mumbai":
                    if len(active_platforms) == 2 and "zepto" in active_platforms and "blinkit" in active_platforms:
                        if len(products) > 0:
                            self.log_result("Search Endpoint", True, 
                                          f"Found {len(products)} products ({zepto_count} from Zepto, {blinkit_count} from Blinkit) in {elapsed:.1f}s")
                        else:
                            self.log_result("Search Endpoint", False, 
                                          f"No products returned despite {zepto_count + blinkit_count} scraped items")
                    else:
                        self.log_result("Search Endpoint", False, 
                                      f"Wrong active platforms: {active_platforms}")
                else:
                    self.log_result("Search Endpoint", False, 
                                  f"Query/location mismatch: {query}/{location}")
            else:
                self.log_result("Search Endpoint", False, f"HTTP {response.status_code}: {response.text[:200]}")
                
        except requests.exceptions.Timeout:
            self.log_result("Search Endpoint", False, "Request timed out after 120 seconds")
        except Exception as e:
            self.log_result("Search Endpoint", False, f"Request failed: {str(e)}")
    
    def test_search_stream_endpoint(self):
        """Test GET /api/search/stream - SSE streaming endpoint"""
        print("\n🔍 Testing SSE Stream Endpoint (may take 60+ seconds)...")
        print("   This streams progress events during Apify scraping...")
        
        try:
            url = f"{BACKEND_URL}/search/stream?query=milk&location=Mumbai"
            
            start_time = time.time()
            response = requests.get(url, stream=True, timeout=120)
            
            if response.status_code == 200:
                events_received = 0
                progress_events = 0
                result_received = False
                
                for line in response.iter_lines(decode_unicode=True):
                    if line.startswith("data: "):
                        try:
                            data = json.loads(line[6:])  # Remove "data: " prefix
                            events_received += 1
                            
                            event_type = data.get("type")
                            if event_type == "progress":
                                progress_events += 1
                                percent = data.get("percent", 0)
                                message = data.get("message", "")
                                print(f"      Progress: {percent}% - {message}")
                            elif event_type == "result":
                                result_received = True
                                result_data = data.get("data", {})
                                products = result_data.get("products", [])
                                print(f"      Result: {len(products)} products received")
                            elif event_type == "done":
                                elapsed = time.time() - start_time
                                break
                        except json.JSONDecodeError:
                            pass
                
                if events_received > 0 and progress_events > 0 and result_received:
                    self.log_result("SSE Stream Endpoint", True, 
                                  f"Received {events_received} events, {progress_events} progress updates, final result in {elapsed:.1f}s")
                else:
                    self.log_result("SSE Stream Endpoint", False, 
                                  f"Incomplete stream: {events_received} events, {progress_events} progress, result={result_received}")
            else:
                self.log_result("SSE Stream Endpoint", False, f"HTTP {response.status_code}: {response.text[:200]}")
                
        except requests.exceptions.Timeout:
            self.log_result("SSE Stream Endpoint", False, "SSE stream timed out after 120 seconds")
        except Exception as e:
            self.log_result("SSE Stream Endpoint", False, f"Request failed: {str(e)}")
    
    def run_all_tests(self):
        """Run all API tests"""
        print(f"🚀 Starting PriceFlash Backend API Tests")
        print(f"🔗 Backend URL: {BACKEND_URL}")
        print("=" * 60)
        
        # Test basic endpoints first
        self.test_health_endpoint()
        self.test_platforms_endpoint()
        self.test_cities_endpoint()
        self.test_resolve_pincode_endpoint()
        self.test_location_search_endpoint()
        
        # Test scraping endpoints (these take much longer)
        self.test_search_endpoint()
        self.test_search_stream_endpoint()
        
        # Print summary
        print("\n" + "=" * 60)
        print("📊 TEST SUMMARY")
        print("=" * 60)
        
        for test in self.passed_tests:
            print(test)
        
        for warning in self.warnings:
            print(warning)
            
        for test in self.failed_tests:
            print(test)
        
        print(f"\n📈 Results: {len(self.passed_tests)} passed, {len(self.failed_tests)} failed, {len(self.warnings)} warnings")
        
        if self.failed_tests:
            print("\n🔥 CRITICAL ISSUES FOUND:")
            for failure in self.failed_tests:
                print(f"   {failure}")
        
        return len(self.failed_tests) == 0

if __name__ == "__main__":
    tester = PriceFlashTester()
    success = tester.run_all_tests()
    sys.exit(0 if success else 1)