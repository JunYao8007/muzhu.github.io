#!/bin/bash
cd ./exampleSite

set -e  # 에러 발생 시 중단
echo "🧹 Cleaning Hugo module cache..."
rm -f go.sum
hugo mod clean

echo "🔄 Updating Hugo modules..."
hugo mod tidy

echo "📦 Downloading module dependencies..."
hugo mod get -u

echo "🗑 Removing go module cache (optional)..."
go clean -modcache

echo "✅ Hugo module update complete."

cd ..