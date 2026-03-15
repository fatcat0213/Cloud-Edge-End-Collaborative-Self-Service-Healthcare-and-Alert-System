#!/bin/bash
kubectl apply -f /mnt/d/yunbianduan/infra/kubeedge/mosquitto-deployment.yaml
kubectl rollout restart deployment/mosquitto -n yunbianduan-edge
kubectl get pods -n yunbianduan-edge -w
