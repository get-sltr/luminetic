#!/bin/bash
# lambda/sweeper/deploy-sweeper.sh
# Deploys the stuck-scan sweeper Lambda + CloudWatch 5-min schedule
set -euo pipefail

FUNCTION_NAME="luminetic-sweeper"
REGION="${AWS_REGION:-us-east-1}"
RULE_NAME="luminetic-sweeper-schedule"

echo "=== Building sweeper Lambda ==="
mkdir -p dist
npx esbuild index.mjs --bundle --platform=node --target=node20 --format=esm --outfile=dist/index.mjs --banner:js="import { createRequire } from 'module';const require = createRequire(import.meta.url);"

cd dist
zip -r ../sweeper-deploy.zip index.mjs
cd ..

echo "=== Deploying Lambda ==="
if aws lambda get-function --function-name "$FUNCTION_NAME" --region "$REGION" 2>/dev/null; then
  aws lambda update-function-code \
    --function-name "$FUNCTION_NAME" \
    --zip-file fileb://sweeper-deploy.zip \
    --region "$REGION" \
    --no-cli-pager
  echo "Updated existing function"
else
  echo "Function doesn't exist yet. Create it in AWS Console or via CLI:"
  echo "  aws lambda create-function \\"
  echo "    --function-name $FUNCTION_NAME \\"
  echo "    --runtime nodejs20.x \\"
  echo "    --handler index.handler \\"
  echo "    --role <YOUR_LAMBDA_ROLE_ARN> \\"
  echo "    --timeout 60 \\"
  echo "    --memory-size 256 \\"
  echo "    --environment Variables={DYNAMODB_TABLE=appready} \\"
  echo "    --zip-file fileb://sweeper-deploy.zip \\"
  echo "    --region $REGION"
  exit 1
fi

echo "=== Setting up CloudWatch schedule (every 5 min) ==="
# Create or update the rule
aws events put-rule \
  --name "$RULE_NAME" \
  --schedule-expression "rate(5 minutes)" \
  --state ENABLED \
  --region "$REGION" \
  --no-cli-pager

# Get Lambda ARN
LAMBDA_ARN=$(aws lambda get-function --function-name "$FUNCTION_NAME" --region "$REGION" --query 'Configuration.FunctionArn' --output text)

# Add permission for CloudWatch to invoke Lambda (idempotent)
aws lambda add-permission \
  --function-name "$FUNCTION_NAME" \
  --statement-id "sweeper-schedule-invoke" \
  --action "lambda:InvokeFunction" \
  --principal "events.amazonaws.com" \
  --source-arn "$(aws events describe-rule --name "$RULE_NAME" --region "$REGION" --query 'Arn' --output text)" \
  --region "$REGION" \
  --no-cli-pager 2>/dev/null || echo "(Permission already exists)"

# Set Lambda as target
aws events put-targets \
  --rule "$RULE_NAME" \
  --targets "Id=sweeper-target,Arn=$LAMBDA_ARN" \
  --region "$REGION" \
  --no-cli-pager

echo "=== Done! Sweeper will run every 5 minutes ==="
