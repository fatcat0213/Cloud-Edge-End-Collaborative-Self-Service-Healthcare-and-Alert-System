#!/bin/bash
# Unset the problematic REDIS_PORT env var and set correct values
kubectl set env deployment/cloud-gateway REDIS_PORT=6379 REDIS_HOST=redis -n yunbianduan-cloud
kubectl set env deployment/edge-service REDIS_PORT=6379 REDIS_HOST=redis -n yunbianduan-cloud
kubectl set env deployment/payment-service REDIS_PORT=6379 REDIS_HOST=redis -n yunbianduan-cloud

# Restart
kubectl rollout restart deployment cloud-gateway edge-service payment-service -n yunbianduan-cloud

echo "Done!"
