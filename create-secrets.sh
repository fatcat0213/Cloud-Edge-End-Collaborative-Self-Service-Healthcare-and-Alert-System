#!/bin/bash
# Create necessary secrets

echo "Creating redis-secret..."
kubectl create secret generic redis-secret \
  --from-literal=redis-password='redis123' \
  -n yunbianduan-cloud

echo "Creating terminal-secret..."
kubectl create secret generic terminal-secret \
  --from-literal=hmac-secret='yunbd-terminal-secret-2026' \
  -n yunbianduan-cloud

echo "Done!"
kubectl get secrets -n yunbianduan-cloud
