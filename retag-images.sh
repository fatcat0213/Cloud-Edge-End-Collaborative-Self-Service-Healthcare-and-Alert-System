#!/bin/bash
# Retag imported images for easier reference

IMAGES=(
  "yunbianduan-cloud-gateway"
  "yunbianduan-edge-service"
  "yunbianduan-payment-service"
  "yunbianduan-registration-service"
  "yunbianduan-report-service"
  "yunbianduan-queue-service"
  "yunbianduan-insurance-service"
)

for img in "${IMAGES[@]}"; do
  echo "Retagging $img..."
  sudo ctr -n k8s.io images tag docker.io/library/$img:latest $img:latest
done

echo "=== Verifying ==="
sudo ctr -n k8s.io images ls | grep -E "^yunbd"
