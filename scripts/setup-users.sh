GATEWAY_ADMIN="http://localhost:9876"

echo "=========================================="
echo "Setting up Users and API Keys"
echo "=========================================="

# Function to create user and API key
create_user_with_apikey() {
  local username=$1
  local firstname=$2
  local lastname=$3
  local email=$4
  
  echo ""
  echo "Creating user: $username"
  
  # Create user
  USER_RESPONSE=$(curl -s -X POST "${GATEWAY_ADMIN}/users" \
    -H "Content-Type: application/json" \
    -d "{
      \"username\": \"${username}\",
      \"firstname\": \"${firstname}\",
      \"lastname\": \"${lastname}\",
      \"email\": \"${email}\"
    }")
  
  echo "User created: $USER_RESPONSE"
  
  # Create credential (API Key)
  echo "Creating API Key for $username..."
  APIKEY_RESPONSE=$(curl -s -X PUT "${GATEWAY_ADMIN}/users/${username}/credentials" \
    -H "Content-Type: application/json" \
    -d '{
      "type": "key-auth"
    }')
  
  echo "API Key Response: $APIKEY_RESPONSE"
  
  # Extract API Key ID
  KEY_ID=$(echo $APIKEY_RESPONSE | grep -o '"keyId":"[^"]*"' | cut -d'"' -f4)
  KEY_SECRET=$(echo $APIKEY_RESPONSE | grep -o '"keySecret":"[^"]*"' | cut -d'"' -f4)
  
  echo "User: $username"
  echo "Key ID: $KEY_ID"
  echo "Key Secret: $KEY_SECRET"
  echo "Use in header: X-API-Key: $KEY_ID:$KEY_SECRET"
}

# Create Standard Users
echo ""
echo "Creating Standard Users..."
create_user_with_apikey "alice" "Alice" "Johnson" "alice@example.com"
create_user_with_apikey "bob" "Bob" "Smith" "bob@example.com"

# Create Premium User
echo ""
echo "Creating Premium Users..."
create_user_with_apikey "premium_user" "Premium" "User" "premium@example.com"

echo ""
echo "=========================================="
echo "Setup Complete!"
echo "=========================================="
echo ""
echo "Test with:"
echo "curl http://localhost:8080/api/service-a/users -H 'X-API-Key: YOUR_KEY_ID:YOUR_KEY_SECRET'"
echo ""