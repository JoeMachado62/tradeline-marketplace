#!/bin/bash

# Health check script

echo "🏥 Running health checks..."

# Check API
API_STATUS=$(curl -s -o /dev/null -w "%{http_code}" http://localhost:3000/health)
if [ $API_STATUS -eq 200 ]; then
    echo "✅ API: Healthy"
else
    echo "❌ API: Unhealthy (Status: $API_STATUS)"
fi

# Check database
docker-compose exec -T postgres pg_isready > /dev/null 2>&1
if [ $? -eq 0 ]; then
    echo "✅ Database: Healthy"
else
    echo "❌ Database: Unhealthy"
fi

# Check Redis
docker-compose exec -T redis redis-cli ping > /dev/null 2>&1
if [ $? -eq 0 ]; then
    echo "✅ Redis: Healthy"
else
    echo "❌ Redis: Unhealthy"
fi

# Check disk space
DISK_USAGE=$(df -h / | awk 'NR==2 {print $5}' | sed 's/%//')
if [ $DISK_USAGE -lt 80 ]; then
    echo "✅ Disk Space: ${DISK_USAGE}% used"
else
    echo "⚠️  Disk Space: ${DISK_USAGE}% used"
fi
