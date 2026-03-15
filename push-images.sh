#!/bin/bash
# Tag and push images to local registry

IMAGES=(
  "yunbianduan-cloud-gateway"
  "yunbianduan-edge-service"
  "yunbianduan-payment-service"
  "yunbianduan-registration-service"
  "yunbianduan-report-service"
  "yunbianduan-queue-service"
  "yunbianduan-insurance-service"
)

REGISTRY="localhost:5000"

for img in "${IMAGES[@]}"; do
  echo "Tagging $img..."
  docker tag $img:latest $REGISTRY/$img:latest
  echo "Pushing $img..."
  docker push $REGISTRY/$img:latest
done

echo "Done!"
