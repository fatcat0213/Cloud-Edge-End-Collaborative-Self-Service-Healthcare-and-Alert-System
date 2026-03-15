#!/bin/bash
# Fix registry and redeploy

NODE_IP="172.24.161.35"
NODE_PORT="32262"
REGISTRY="$NODE_IP:$NODE_PORT"

echo "Updating deployments to use registry: $REGISTRY"

# Fix image references in deployment files
for f in /mnt/d/yunbianduan/infra/cloud-services/*.yaml; do
  sed -i "s|image: localhost:5000/yunbianduan-|image: $REGISTRY/yunbianduan-|g" "$f"
done

echo "Deleting old deployments..."
kubectl delete deployment --all -n yunbianduan-cloud
kubectl delete service --all -n yunbianduan-cloud

echo "Redeploying..."
kubectl apply -f /mnt/d/yunbianduan/infra/cloud-services/

echo "Checking pods..."
kubectl get pods -n yunbianduan-cloud -w
