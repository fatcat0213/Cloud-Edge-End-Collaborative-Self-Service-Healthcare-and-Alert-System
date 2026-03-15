#!/bin/bash
# Fix all deployment files - use correct image names and imagePullPolicy: Never

MANIFEST_DIR="/mnt/d/yunbianduan/infra/cloud-services"

# Fix each deployment
for f in $MANIFEST_DIR/*-deployment.yaml; do
  echo "Fixing $(basename $f)..."

  # Replace yunbd/ with yunbianduan- and add imagePullPolicy: Never
  sed -i 's|image: yunbd/|image: yunbianduan-|g' "$f"
  sed -i '/image: yunbianduan-/a\        imagePullPolicy: Never' "$f"

  # Remove readinessProbe that checks /actuator/health (stub services don't have it)
  sed -i '/path: \/actuator\/health/d' "$f"
  sed -i '/readinessProbe:/d' "$f"
  sed -i '/httpGet:/d' "$f"
  sed -i '/initialDelaySeconds/d' "$f"
  sed -i '/periodSeconds/d' "$f"
  sed -i '/failureThreshold/d' "$f"

  echo "  Fixed: $(basename $f)"
done

echo "Done!"
