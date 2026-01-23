echo "=========================================="
echo "Gateway Health Check"
echo "=========================================="

# Check if containers are running
echo ""
echo "1. Container Status:"
docker-compose ps | grep -E "gateway|redis|service"

# Check gateway logs for errors
echo ""
echo "2. Checking for errors in gateway logs..."
ERRORS=$(docker-compose logs gateway 2>&1 | grep -i "error" | tail -5)
if [ -z "$ERRORS" ]; then
  echo "No errors found in gateway logs"
else
  echo "Errors found:"
  echo "$ERRORS"
fi

# Check for plugin errors specifically
echo ""
echo "3. Checking plugin status..."
PLUGIN_ERRORS=$(docker-compose logs gateway 2>&1 | grep "Failed to load plugin")
if [ -z "$PLUGIN_ERRORS" ]; then
  echo "All plugins loaded successfully"
else
  echo "Plugin errors found:"
  echo "$PLUGIN_ERRORS"
fi

# Check Redis connection
echo ""
echo "4. Redis Connection:"
docker exec redis-cache redis-cli ping 2>&1
if [ $? -eq 0 ]; then
  echo "Redis is responding"
else
  echo "Redis connection failed"
fi

# Check if Redis is accessible from gateway
echo ""
echo "5. Gateway to Redis connectivity:"
docker exec api-gateway sh -c "redis-cli -h redis ping" 2>&1
if [ $? -eq 0 ]; then
  echo "Gateway can reach Redis"
else
  echo "Could not test (redis-cli might not be in gateway container)"
fi

# Test health endpoint
echo ""
echo "6. Testing /health endpoint..."
HEALTH_RESPONSE=$(curl -s -o /dev/null -w "%{http_code}" http://localhost:8080/health)
if [ "$HEALTH_RESPONSE" == "200" ]; then
  echo "Health endpoint responding (HTTP $HEALTH_RESPONSE)"
  curl -s http://localhost:8080/health | jq . 2>/dev/null || curl -s http://localhost:8080/health
else
  echo "Health endpoint failed (HTTP $HEALTH_RESPONSE)"
fi

# Test admin API
echo ""
echo "7. Testing Admin API..."
ADMIN_RESPONSE=$(curl -s -o /dev/null -w "%{http_code}" http://localhost:9876/users)
if [ "$ADMIN_RESPONSE" == "200" ]; then
  echo "Admin API responding (HTTP $ADMIN_RESPONSE)"
else
  echo "Admin API failed (HTTP $ADMIN_RESPONSE)"
fi

# Check session store
echo ""
echo "8. Checking for MemoryStore warning..."
MEMSTORE_WARNING=$(docker-compose logs gateway 2>&1 | grep "MemoryStore")
if [ -z "$MEMSTORE_WARNING" ]; then
  echo "No MemoryStore warning (using Redis)"
else
  echo "MemoryStore warning still present:"
  echo "$MEMSTORE_WARNING"
fi

echo ""
echo "=========================================="
echo "Health Check Complete"
echo "=========================================="

# Summary
echo ""
echo "Summary:"
if [ -z "$PLUGIN_ERRORS" ] && [ "$HEALTH_RESPONSE" == "200" ]; then
  echo "Gateway is healthy and ready to use!"
else
  echo "Gateway has some issues. Check the details above."
fi