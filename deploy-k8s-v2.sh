#!/bin/bash
# Deploy to K8s with imagePullPolicy: Never

MANIFEST_DIR="/mnt/d/yunbianduan/infra"

echo "=== Updating deployments with imagePullPolicy: Never ==="

# Update each deployment file to add imagePullPolicy: Never
for f in $MANIFEST_DIR/cloud-services/*.yaml; do
  # Replace image line to add imagePullPolicy
  sed -i 's|image: .*/\(yunbianduan-[a-z-]*\):latest|image: \1:latest\n        imagePullPolicy: Never|g' "$f"
  echo "Updated: $(basename $f)"
done

echo "=== Deleting old deployments ==="
kubectl delete deployment --all -n yunbianduan-cloud
kubectl delete service --all -n yunbianduan-cloud

echo "=== Redeploying ==="
kubectl apply -f $MANIFEST_DIR/cloud-services/

echo "=== Checking status ==="
kubectl get pods -n yunbianduan-cloud
