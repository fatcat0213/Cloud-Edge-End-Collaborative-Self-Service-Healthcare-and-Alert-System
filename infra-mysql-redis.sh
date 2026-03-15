#!/bin/bash
echo "Pulling MySQL and Redis..."
docker pull mysql:8
docker pull redis:7-alpine

echo "Exporting..."
docker save -o /tmp/mysql.tar mysql:8
docker save -o /tmp/redis.tar redis:7-alpine

echo "Importing to containerd..."
sudo ctr -n k8s.io images import /tmp/mysql.tar
sudo ctr -n k8s.io images import /tmp/redis.tar

echo "Retagging..."
sudo ctr -n k8s.io images tag docker.io/library/mysql:8 mysql:8
sudo ctr -n k8s.io images tag docker.io/library/redis:7-alpine redis:7-alpine

echo "Done!"
sudo ctr -n k8s.io images ls | grep -E "mysql|redis"
