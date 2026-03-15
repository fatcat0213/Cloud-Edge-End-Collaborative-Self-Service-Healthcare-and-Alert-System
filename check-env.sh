#!/bin/bash
echo "=== Maven version ==="
/mnt/d/L/apache-maven-3.9.11/bin/mvn --version 2>&1 || echo "mvn failed"
echo "=== Java paths ==="
ls "/mnt/d/Program Files/Java/" 2>/dev/null || echo "no java dir"
ls "/mnt/d/Program Files/Eclipse Adoptium/" 2>/dev/null || echo "no adoptium dir"
