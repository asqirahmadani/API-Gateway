API_KEY=$1
GATEWAY_URL="http://localhost:8080"

if [ -z "$API_KEY" ]; then
  echo "Usage: bash test-rate-limit.sh YOUR_API_KEY"
  echo "Example: bash test-rate-limit.sh abc123:secret456"
  exit 1
fi

echo "=========================================="
echo "Testing Rate Limiting"
echo "=========================================="
echo "API Key: $API_KEY"
echo "Endpoint: ${GATEWAY_URL}/api/service-a/users"
echo "Rate Limit: 100 requests per minute"
echo ""

# Send 105 requests rapidly
for i in {1..105}
do
  RESPONSE=$(curl -s -w "\nHTTP_CODE:%{http_code}" \
    "${GATEWAY_URL}/api/service-a/users" \
    -H "X-API-Key: ${API_KEY}")
  
  HTTP_CODE=$(echo "$RESPONSE" | grep "HTTP_CODE" | cut -d: -f2)
  
  # Get rate limit headers
  HEADERS=$(curl -s -I "${GATEWAY_URL}/api/service-a/users" \
    -H "X-API-Key: ${API_KEY}")
  
  LIMIT=$(echo "$HEADERS" | grep -i "X-RateLimit-Limit" | cut -d: -f2 | tr -d '[:space:]')
  REMAINING=$(echo "$HEADERS" | grep -i "X-RateLimit-Remaining" | cut -d: -f2 | tr -d '[:space:]')
  
  if [ "$HTTP_CODE" == "429" ]; then
    echo "Request $i: Rate limit exceeded! (HTTP $HTTP_CODE)"
    echo "   Limit: $LIMIT, Remaining: $REMAINING"
    break
  else
    echo "Request $i: Success (HTTP $HTTP_CODE) - Remaining: $REMAINING/$LIMIT"
  fi
  
  # Small delay to see progress
  sleep 0.1
done

echo ""
echo "=========================================="
echo "Rate Limit Test Complete"
echo "=========================================="