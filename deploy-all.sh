#!/bin/bash
# Recreate all deployment files with correct config

cat > /tmp/gateway.yaml << 'EOF'
apiVersion: apps/v1
kind: Deployment
metadata:
  name: cloud-gateway
  namespace: yunbianduan-cloud
spec:
  replicas: 1
  selector:
    matchLabels:
      app: cloud-gateway
  template:
    metadata:
      labels:
        app: cloud-gateway
    spec:
      containers:
      - name: cloud-gateway
        image: yunbianduan-cloud-gateway:latest
        imagePullPolicy: Never
        ports:
        - containerPort: 8080
        env:
        - name: REDIS_HOST
          value: "redis"
---
apiVersion: v1
kind: Service
metadata:
  name: cloud-gateway
  namespace: yunbianduan-cloud
spec:
  type: NodePort
  selector:
    app: cloud-gateway
  ports:
  - port: 8080
    targetPort: 8080
    nodePort: 30080
EOF

# Apply
kubectl apply -f /tmp/gateway.yaml

# Do the same for other services
for svc in payment registration report queue insurance; do
  cat > /tmp/${svc}.yaml << EOF
apiVersion: apps/v1
kind: Deployment
metadata:
  name: ${svc}-service
  namespace: yunbianduan-cloud
spec:
  replicas: 1
  selector:
    matchLabels:
      app: ${svc}-service
  template:
    metadata:
      labels:
        app: ${svc}-service
    spec:
      containers:
      - name: ${svc}-service
        image: yunbianduan-${svc}-service:latest
        imagePullPolicy: Never
        ports:
        - containerPort: 808$(echo $svc | sed 's/payment/1/;s/registration/2/;s/report/3/;s/queue/4/;s/insurance/5/')
---
apiVersion: v1
kind: Service
metadata:
  name: ${svc}-service
  namespace: yunbianduan-cloud
spec:
  type: ClusterIP
  selector:
    app: ${svc}-service
  ports:
  - port: 808$(echo $svc | sed 's/payment/1/;s/registration/2/;s/report/3/;s/queue/4/;s/insurance/5/')
    targetPort: 808$(echo $svc | sed 's/payment/1/;s/registration/2/;s/report/3/;s/queue/4/;s/insurance/5/')
EOF
  kubectl apply -f /tmp/${svc}.yaml
done

# Edge service
cat > /tmp/edge.yaml << 'EOF'
apiVersion: apps/v1
kind: Deployment
metadata:
  name: edge-service
  namespace: yunbianduan-cloud
spec:
  replicas: 1
  selector:
    matchLabels:
      app: edge-service
  template:
    metadata:
      labels:
        app: edge-service
    spec:
      containers:
      - name: edge-service
        image: yunbianduan-edge-service:latest
        imagePullPolicy: Never
        ports:
        - containerPort: 8090
        env:
        - name: REDIS_HOST
          value: "redis"
        - name: MQTT_BROKER_HOST
          value: "mosquitto.edge-system"
        - name: MQTT_BROKER_PORT
          value: "1883"
---
apiVersion: v1
kind: Service
metadata:
  name: edge-service
  namespace: yunbianduan-cloud
spec:
  type: ClusterIP
  selector:
    app: edge-service
  ports:
  - port: 8090
    targetPort: 8090
EOF
kubectl apply -f /tmp/edge.yaml

echo "Done!"
