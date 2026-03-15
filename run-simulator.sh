#!/bin/bash
export MQTT_HOST=172.24.161.35
export MQTT_PORT=31883
cd /mnt/d/yunbianduan/simulator
java -jar target/simulator-1.0.0-SNAPSHOT.jar
