# Infrastructure Deployment

## Prerequisites
- Kubernetes cluster running (kubectl configured)
- Namespaces not yet created

## Deployment Order

### 1. Create namespaces
```bash
kubectl apply -f namespaces.yaml
```

### 2. Create secrets (run once, never commit secrets to git)
```bash
kubectl create secret generic mysql-secret \
  --from-literal=root-password=<YOUR_MYSQL_ROOT_PASSWORD> \
  -n yunbianduan-cloud

kubectl create secret generic redis-secret \
  --from-literal=password=<YOUR_REDIS_PASSWORD> \
  -n yunbianduan-cloud
```

### 3. Deploy infrastructure
```bash
kubectl apply -f kafka/kafka-deployment.yaml
kubectl apply -f mysql/mysql-deployment.yaml
kubectl apply -f redis/redis-cloud-deployment.yaml
```

### 4. Initialize MySQL schema
```bash
# Wait for MySQL pod to be Ready, then:
MYSQL_POD=$(kubectl get pod -n yunbianduan-cloud -l app=mysql -o jsonpath='{.items[0].metadata.name}')
kubectl cp mysql/schema.sql yunbianduan-cloud/$MYSQL_POD:/tmp/schema.sql
MYSQL_PASS=$(kubectl get secret mysql-secret -n yunbianduan-cloud -o jsonpath='{.data.root-password}' | base64 -d)
kubectl exec -n yunbianduan-cloud $MYSQL_POD -- mysql -u root -p"$MYSQL_PASS" yunbianduan < /tmp/schema.sql
```
