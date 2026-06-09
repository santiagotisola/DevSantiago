#!/bin/bash
# Deploy script for CondoSync on Railway
# Configures both API and Web services

set -e

echo "🚀 Deploying CondoSync to Railway..."

# Check if Railway CLI is installed
if ! command -v railway &> /dev/null; then
  echo "❌ Railway CLI not found. Install with: npm install -g @railway/cli"
  exit 1
fi

# Authenticate with Railway (assumes token is set)
echo "🔑 Authenticating with Railway..."
railway login

# Create or link project
echo "📦 Linking to Railway project..."
railway link

# Add API service
echo "🔨 Deploying API service..."
railway service add --service api --dockerfile Dockerfile.api

# Add Web service  
echo "🌐 Deploying Web service..."
railway service add --service web --dockerfile Dockerfile.web

# Apply environment variables
echo "⚙️ Configuring services..."
railway env add NODE_ENV production
railway env add PORT 3333
railway env add API_URL http://api:3333

# Deploy
echo "🚀 Triggering deployment..."
railway up

echo "✅ Deployment complete!"
echo "Visit your app at: railway.app"
