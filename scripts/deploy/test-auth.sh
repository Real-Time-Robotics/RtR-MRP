#!/bin/bash
# Test auth flow end-to-end
echo '=== Step 1: Login to auth gateway ==='
curl -s -X POST https://auth.rtrobotics.com/api/auth/login \
  -H 'Content-Type: application/json' \
  -d '{"email":"lam.nguyen@rtrobotics.me","password":"Tranthiquynh1987@"}' \
  -D /tmp/auth-headers.txt -o /tmp/auth-body.txt

echo 'Login response:'
cat /tmp/auth-body.txt
echo ''

echo '=== Step 2: Extract token ==='
TOKEN=$(grep rtr_access_token /tmp/auth-headers.txt | sed 's/.*rtr_access_token=//;s/;.*//')
echo "Token length: ${#TOKEN}"
echo "Token start: ${TOKEN:0:30}..."

echo '=== Step 3: Test /api/v2/auth/me with token ==='
curl -s https://mrp.rtrobotics.com/api/v2/auth/me -b "rtr_access_token=$TOKEN"
echo ''

echo '=== Step 4: Test /home with token (should 200) ==='
curl -sI https://mrp.rtrobotics.com/home -b "rtr_access_token=$TOKEN" | head -3

echo '=== Step 5: Test /home without token (should redirect) ==='
curl -sI https://mrp.rtrobotics.com/home | head -3

echo '=== Step 6: Check what algorithm JWT uses ==='
echo "$TOKEN" | cut -d. -f1 | base64 -d 2>/dev/null
echo ''

echo '=== DONE ==='
