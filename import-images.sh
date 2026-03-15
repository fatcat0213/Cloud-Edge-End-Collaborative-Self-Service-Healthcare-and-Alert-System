#!/bin/bash
# Import Docker tar images to containerd

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
  echo "Importing $img..."
  sudo ctr -n k8s.io images import /tmp/$img.tar
done

echo "=== Verifying import ==="
sudo ctr -n k8s.io images ls | grep yunbd
