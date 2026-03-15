#!/bin/bash
kubectl delete deployment mosquitto -n yunbianduan-edge
kubectl apply -f /mnt/d/yunbianduan/infra/kubeedge/mosquitto-deployment.yaml
kubectl get pods -n yunbianduan-edge
