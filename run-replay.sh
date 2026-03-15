#!/bin/bash
export JAVA_HOME="/mnt/d/Program Files/Java/jdk-24"
export PATH="$JAVA_HOME/bin:/usr/local/sbin:/usr/local/bin:/usr/sbin:/usr/bin:/sbin:/bin"
JAR="/mnt/d/yunbianduan/simulator/target/simulator-1.0.0-SNAPSHOT.jar"
SAMPLES="/mnt/d/yunbianduan/simulation/anomaly-samples.json"
java -cp "$JAR" com.yunbd.sim.AnomalyReplayRunner localhost 1883 "$SAMPLES" 2>&1
