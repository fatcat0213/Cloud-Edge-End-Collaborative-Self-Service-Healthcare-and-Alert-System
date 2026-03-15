#!/bin/bash
# Deploy to Kubernetes

set -e
REGISTRY="localhost:5000"
MANIFEST_DIR="/mnt/d/yunbianduan/infra"

echo "=== Creating namespaces ==="
kubectl apply -f $MANIFEST_DIR/namespaces.yaml

echo "=== Updating image references in deployments ==="

# Update all deployment files to use local registry
for f in $MANIFEST_DIR/cloud-services/*.yaml; do
  sed -i "s|image: yunbianduan-|image: $REGISTRY/yunbianduan-|g" "$f"
  echo "Updated: $(basename $f)"
done

echo "=== Deploying cloud services ==="
kubectl apply -f $MANIFEST_DIR/cloud-services/gateway-deployment.yaml
kubectl apply -f $MANIFEST_DIR/cloud-services/payment-deployment.yaml
kubectl apply -f $MANIFEST_DIR/cloud-services/registration-deployment.yaml
kubectl apply -f $MANIFEST_DIR/cloud-services/report-deployment.yaml
kubectl apply -f $MANIFEST_DIR/cloud-services/queue-deployment.yaml
kubectl apply -f $MANIFEST_DIR/cloud-services/insurance-deployment.yaml
kubectl apply -f $MANIFEST_DIR/cloud-services/edge-deployment.yaml

echo "=== Deploying infrastructure ==="
kubectl apply -f $MANIFEST_DIR/mysql/mysql-deployment.yaml
kubectl apply -f $MANIFEST_DIR/redis/redis-cloud-deployment.yaml
kubectl apply -f $MANIFEST_DIR/kubeedge/mosquitto-deployment.yaml

echo "=== Waiting for pods ==="
kubectl get pods -n yunbianduan-cloud -w

echo "Done!"
