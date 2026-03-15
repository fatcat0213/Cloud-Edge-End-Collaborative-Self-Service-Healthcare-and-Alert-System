#!/bin/bash
kubectl delete pod mysql redis -n yunbianduan-cloud
kubectl get pods -n yunbianduan-cloud
