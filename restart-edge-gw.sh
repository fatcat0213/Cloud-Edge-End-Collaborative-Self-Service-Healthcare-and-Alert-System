#!/bin/bash
cd /mnt/d/yunbianduan
docker compose up --build -d edge-service cloud-gateway 2>&1
