#!/bin/bash
# Export Docker images to tar

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
  echo "Exporting $img..."
  docker save -o /tmp/$img.tar $img:latest
done

echo "Done! Files in /tmp:"
ls -lh /tmp/*.tar
