#!/bin/bash
# Fix cloud-gateway deployment - add REDIS_HOST env
kubectl set env deployment/cloud-gateway REDIS_HOST=redis -n yunbianduan-cloud
kubectl set env deployment/edge-service REDIS_HOST=redis -n yunbianduan-cloud
kubectl set env deployment/payment-service REDIS_HOST=redis -n yunbianduan-cloud

# Restart
kubectl rollout restart deployment -n yunbianduan-cloud

echo "Done!"
kubectl get pods -n yunbianduan-cloud
