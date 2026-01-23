echo "=========================================="
echo "Redis Monitoring"
echo "=========================================="

# Check Redis connection
echo ""
echo "1. Testing Redis connection..."
docker exec redis-cache redis-cli ping

# Get all keys
echo ""
echo "2. All keys in Redis:"
docker exec redis-cache redis-cli KEYS "*"

# Check rate limit keys
echo ""
echo "3. Rate limit keys (rl:*):"
docker exec redis-cache redis-cli KEYS "rl:*"

# Check user session keys
echo ""
echo "4. User session keys (EG:*):"
docker exec redis-cache redis-cli KEYS "EG:*"

# Get info about a specific rate limit key (example)
echo ""
echo "5. Sample rate limit data:"
RATE_LIMIT_KEY=$(docker exec redis-cache redis-cli KEYS "rl:*" | head -1)
if [ ! -z "$RATE_LIMIT_KEY" ]; then
  echo "Key: $RATE_LIMIT_KEY"
  docker exec redis-cache redis-cli GET "$RATE_LIMIT_KEY"
  docker exec redis-cache redis-cli TTL "$RATE_LIMIT_KEY"
fi

# Redis info
echo ""
echo "6. Redis statistics:"
docker exec redis-cache redis-cli INFO stats | grep -E "total_connections|total_commands|keyspace"

# Memory usage
echo ""
echo "7. Memory usage:"
docker exec redis-cache redis-cli INFO memory | grep -E "used_memory_human|used_memory_peak_human"

echo ""
echo "=========================================="
echo "Monitoring Complete"
echo "=========================================="