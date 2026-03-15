#!/bin/bash
# Update edge-service to use K8s mosquitto
kubectl set env deployment/edge-service MQTT_BROKER_HOST=mosquitto MQTT_BROKER_PORT=1883 -n yunbianduan-cloud
kubectl rollout restart deployment/edge-service -n yunbianduan-cloud
echo "Done!"
kubectl get pods -n yunbianduan-cloud
