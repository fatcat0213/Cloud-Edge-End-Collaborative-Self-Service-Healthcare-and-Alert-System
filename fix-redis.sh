#!/bin/bash
kubectl delete deployment redis -n yunbianduan-cloud
kubectl apply -f /mnt/d/yunbianduan/infra/redis/redis-cloud-deployment.yaml
kubectl get pods -n yunbianduan-cloud
