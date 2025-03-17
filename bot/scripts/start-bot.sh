#!/bin/bash

# Create the template as a heredoc
read -r -d '' JSON_TEMPLATE <<'EOF'
{
  "clients": [
    {
      "name": "username",
      "password": "password",
      "integration": "bedrock-bot",
      "tokens": [
        {
          "name": "CLIENT_NAME",
          "value": "username"
        },
        {
          "name": "WICKRIO_BOT_NAME",
          "value": "username"
        }
      ]
    }
  ]
}
EOF

# Get the credentials from AWS Secrets Manager
if ! CREDS=$(aws secretsmanager get-secret-value \
  --secret-id $CREDENTIALS_ARN \
  --query SecretString \
  --output text); then
  echo "Failed to retrieve credentials from Secrets Manager"
  exit 1
fi

# Extract and export the username for use by other scripts
if ! export WICKR_BOT_USERNAME=$(echo "$CREDS" | jq -r '.username'); then
  echo "Failed to extract username from credentials"
  exit 1
fi

# Update the clientConfig.json file
if ! echo "$CREDS" | jq -r --arg template "$JSON_TEMPLATE" '
  ($template | fromjson) as $base |
  . as $creds |
  $base | 
  .clients[0].name = $creds.username |
  .clients[0].password = $creds.password |
  .clients[0].tokens[0].value = $creds.username |
  .clients[0].tokens[1].value = $creds.username
' >/usr/local/wickr/WickrIO/clientConfig.json; then
  echo "Failed to update clientConfig.json"
  exit 1
fi

# Start the bot server
WickrIOSvr -notty
