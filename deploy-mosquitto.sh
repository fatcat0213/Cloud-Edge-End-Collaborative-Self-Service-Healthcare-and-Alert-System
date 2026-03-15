#!/bin/bash
kubectl delete deployment mosquitto -n yunbianduan-edge 2>/dev/null
kubectl delete configmap mosquitto-config -n yunbianduan-edge 2>/dev/null
kubectl apply -f /mnt/d/yunbianduan/infra/kubeedge/mosquitto-deployment.yaml
kubectl get pods -n yunbianduan-edge
