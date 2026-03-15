#!/bin/bash
# Create all needed secrets
echo "Creating secrets..."

# Redis secret
kubectl create secret generic redis-secret \
  --from-literal=password='redis123' \
  -n yunbianduan-cloud

# MySQL secret
kubectl create secret generic mysql-secret \
  --from-literal=root-password='mysql123' \
  -n yunbianduan-cloud

# Terminal secret
kubectl create secret generic terminal-secret \
  --from-literal=hmac-secret='yunbd-terminal-secret-2026' \
  -n yunbianduan-cloud

echo "Done!"
kubectl get secrets -n yunbianduan-cloud
