#!/bin/bash
export JAVA_HOME="/mnt/d/Program Files/Java/jdk-24"
export MVN=/mnt/d/L/apache-maven-3.9.11/bin/mvn
export PATH=$JAVA_HOME/bin:/usr/local/sbin:/usr/local/bin:/usr/sbin:/usr/bin:/sbin:/bin
cd /mnt/d/yunbianduan
$MVN package -DskipTests -pl simulator -am -q 2>&1 | tail -20
echo "EXIT: $?"
