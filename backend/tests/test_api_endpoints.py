"""PriceFlash Backend API Tests

Tests cover:
- Health check endpoint
- Search endpoint with mock data validation
- Geocode endpoint
- Recent search and popular searches endpoints
"""

import pytest
import requests
import time


class TestHealthEndpoint:
    """Health check tests"""

    def test_health_check(self, api_client, base_url):
        """Test /api/health endpoint returns ok status"""
        response = api_client.get(f"{base_url}/api/health")
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        
        data = response.json()
        assert "status" in data, "Response missing 'status' field"
        assert data["status"] == "ok", f"Expected status 'ok', got {data['status']}"
        print("✓ Health check passed")


class TestSearchEndpoint:
    """Search endpoint tests with mock data validation"""

    def test_search_basic(self, api_client, base_url):
        """Test basic search returns 8 platform results"""
        payload = {
            "query": "Amul Butter",
            "pincode": "110001"
        }
        response = api_client.post(f"{base_url}/api/search", json=payload)
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        
        data = response.json()
        # Validate response structure
        assert "results" in data, "Response missing 'results' field"
        assert "query" in data, "Response missing 'query' field"
        assert "pincode" in data, "Response missing 'pincode' field"
        assert "result_count" in data, "Response missing 'result_count' field"
        assert "sorted_by" in data, "Response missing 'sorted_by' field"
        
        # Validate we get exactly 8 platforms
        assert len(data["results"]) == 8, f"Expected 8 results, got {len(data['results'])}"
        assert data["result_count"] == 8, f"Expected result_count=8, got {data['result_count']}"
        
        # Validate query echo
        assert data["query"] == payload["query"], "Query not echoed correctly"
        assert data["pincode"] == payload["pincode"], "Pincode not echoed correctly"
        
        # Validate default sorting
        assert data["sorted_by"] == "final_price", "Default sort should be final_price"
        print(f"✓ Basic search passed: {len(data['results'])} platforms returned")

    def test_search_result_structure(self, api_client, base_url):
        """Test each platform result has required fields"""
        payload = {
            "query": "Maggi Noodles",
            "pincode": "110001"
        }
        response = api_client.post(f"{base_url}/api/search", json=payload)
        assert response.status_code == 200
        
        data = response.json()
        results = data["results"]
        
        required_fields = [
            "platform", "platform_id", "platform_color", "product_name",
            "price", "mrp", "discount_text", "delivery_minutes", 
            "delivery_fee", "final_price", "in_stock", "deep_link", "match_type"
        ]
        
        for idx, result in enumerate(results):
            for field in required_fields:
                assert field in result, f"Result {idx} missing field '{field}'"
            
            # Validate data types
            assert isinstance(result["price"], int), "price should be int"
            assert isinstance(result["mrp"], int), "mrp should be int"
            assert isinstance(result["delivery_minutes"], int), "delivery_minutes should be int"
            assert isinstance(result["delivery_fee"], int), "delivery_fee should be int"
            assert isinstance(result["final_price"], int), "final_price should be int"
            assert isinstance(result["in_stock"], bool), "in_stock should be bool"
            
            # Validate price logic
            expected_final = result["price"] + result["delivery_fee"]
            assert result["final_price"] == expected_final, f"final_price calculation wrong for {result['platform']}"
            
            # Validate MRP >= price
            assert result["mrp"] >= result["price"], f"MRP should be >= price for {result['platform']}"
            
            # Validate deep link contains query
            assert result["platform_id"] in result["deep_link"].lower() or "amazon" in result["deep_link"].lower() or "flipkart" in result["deep_link"].lower(), f"Deep link doesn't match platform: {result['deep_link']}"
        
        print(f"✓ Result structure validation passed for {len(results)} platforms")

    def test_search_all_8_platforms_present(self, api_client, base_url):
        """Test all 8 configured platforms are in results"""
        payload = {
            "query": "Tata Salt",
            "pincode": "110001"
        }
        response = api_client.post(f"{base_url}/api/search", json=payload)
        assert response.status_code == 200
        
        data = response.json()
        platform_ids = [r["platform_id"] for r in data["results"]]
        
        expected_platforms = [
            "blinkit", "zepto", "swiggy", "bigbasket", 
            "dmart", "jiomart", "amazon", "flipkart"
        ]
        
        for platform in expected_platforms:
            assert platform in platform_ids, f"Missing platform: {platform}"
        
        print(f"✓ All 8 platforms present: {', '.join(platform_ids)}")

    def test_search_sorted_by_price(self, api_client, base_url):
        """Test results are sorted by final_price with in_stock first"""
        payload = {
            "query": "Coca-Cola",
            "pincode": "110001"
        }
        response = api_client.post(f"{base_url}/api/search", json=payload)
        assert response.status_code == 200
        
        data = response.json()
        results = data["results"]
        
        # Check in-stock items come first
        in_stock_results = [r for r in results if r["in_stock"]]
        out_of_stock_results = [r for r in results if not r["in_stock"]]
        
        # Verify in-stock items are price-sorted ascending
        if len(in_stock_results) > 1:
            for i in range(len(in_stock_results) - 1):
                assert in_stock_results[i]["final_price"] <= in_stock_results[i+1]["final_price"], "In-stock items not sorted by price"
        
        print(f"✓ Sort validation passed: {len(in_stock_results)} in stock, {len(out_of_stock_results)} out of stock")

    def test_search_with_default_pincode(self, api_client, base_url):
        """Test search with only query (default pincode should be used)"""
        payload = {
            "query": "Surf Excel"
        }
        response = api_client.post(f"{base_url}/api/search", json=payload)
        assert response.status_code == 200
        
        data = response.json()
        assert data["pincode"] == "110001", "Default pincode should be 110001"
        assert len(data["results"]) == 8
        print("✓ Default pincode handling passed")

    def test_search_different_queries(self, api_client, base_url):
        """Test search with multiple different product queries"""
        queries = ["Amul Butter", "Maggi", "salt", "chocolate", "random product xyz"]
        
        for query in queries:
            payload = {"query": query, "pincode": "110001"}
            response = api_client.post(f"{base_url}/api/search", json=payload)
            assert response.status_code == 200, f"Search failed for query: {query}"
            
            data = response.json()
            assert len(data["results"]) == 8, f"Expected 8 results for '{query}', got {len(data['results'])}"
            assert data["query"] == query, f"Query echo mismatch for '{query}'"
        
        print(f"✓ Multiple query test passed: {len(queries)} queries tested")


class TestGeocodeEndpoint:
    """Geocode endpoint tests"""

    def test_geocode_valid_coordinates(self, api_client, base_url):
        """Test geocode endpoint with valid coordinates"""
        # Delhi coordinates
        params = {"lat": 28.6139, "lng": 77.2090}
        response = api_client.get(f"{base_url}/api/geocode", params=params)
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        
        data = response.json()
        assert "city" in data, "Response missing 'city' field"
        assert "pincode" in data, "Response missing 'pincode' field"
        assert "display" in data, "Response missing 'display' field"
        
        # Validate non-empty values
        assert data["city"], "City should not be empty"
        assert data["pincode"], "Pincode should not be empty"
        assert data["display"], "Display should not be empty"
        
        # Display should contain city and pincode
        assert data["city"] in data["display"], "Display should contain city"
        assert data["pincode"] in data["display"], "Display should contain pincode"
        
        print(f"✓ Geocode passed: {data['display']}")

    def test_geocode_fallback_on_error(self, api_client, base_url):
        """Test geocode returns fallback data on invalid coordinates"""
        # Invalid coordinates (should trigger fallback)
        params = {"lat": 0, "lng": 0}
        response = api_client.get(f"{base_url}/api/geocode", params=params)
        assert response.status_code == 200, "Should return 200 even with invalid coords"
        
        data = response.json()
        # Should return fallback data
        assert "city" in data
        assert "pincode" in data
        print(f"✓ Geocode fallback passed: {data.get('display', 'fallback data')}")


class TestRecentSearches:
    """Recent and popular searches tests"""

    def test_save_recent_search(self, api_client, base_url):
        """Test saving a recent search to MongoDB"""
        payload = {
            "query": f"TEST_Product_{int(time.time())}",
            "pincode": "110001"
        }
        response = api_client.post(f"{base_url}/api/recent-search", json=payload)
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        
        data = response.json()
        assert "status" in data, "Response missing 'status' field"
        assert data["status"] == "saved", f"Expected status 'saved', got {data['status']}"
        print(f"✓ Recent search saved: {payload['query']}")

    def test_get_popular_searches(self, api_client, base_url):
        """Test retrieving popular searches"""
        # First, save a few searches
        for i in range(3):
            payload = {"query": f"PopularItem_{i}", "pincode": "110001"}
            api_client.post(f"{base_url}/api/recent-search", json=payload)
        
        # Now get popular searches
        response = api_client.get(f"{base_url}/api/popular-searches")
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        
        data = response.json()
        assert "popular" in data, "Response missing 'popular' field"
        assert isinstance(data["popular"], list), "popular should be a list"
        
        # Each item should have query and count
        for item in data["popular"]:
            assert "query" in item, "Popular item missing 'query' field"
            assert "count" in item, "Popular item missing 'count' field"
            assert isinstance(item["count"], int), "count should be int"
        
        print(f"✓ Popular searches retrieved: {len(data['popular'])} items")


class TestEdgeCases:
    """Edge case and validation tests"""

    def test_search_empty_query(self, api_client, base_url):
        """Test search with empty query"""
        payload = {"query": "", "pincode": "110001"}
        response = api_client.post(f"{base_url}/api/search", json=payload)
        # Should still return results (might be generic)
        assert response.status_code == 200
        data = response.json()
        assert len(data["results"]) == 8
        print("✓ Empty query handled")

    def test_search_special_characters(self, api_client, base_url):
        """Test search with special characters in query"""
        payload = {"query": "Amul & Co. 500g!", "pincode": "110001"}
        response = api_client.post(f"{base_url}/api/search", json=payload)
        assert response.status_code == 200
        data = response.json()
        assert len(data["results"]) == 8
        print("✓ Special characters handled")

    def test_search_different_pincode(self, api_client, base_url):
        """Test search with different pincode"""
        payload = {"query": "Amul Butter", "pincode": "400001"}
        response = api_client.post(f"{base_url}/api/search", json=payload)
        assert response.status_code == 200
        data = response.json()
        assert data["pincode"] == "400001"
        assert len(data["results"]) == 8
        print("✓ Different pincode handled")
