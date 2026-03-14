# T0 Baseline Measurement Criteria

## Objective
Establish baseline performance metrics for the 云边端就医自助终端监测及预警系统 before
any load or anomaly injection.

## Measurement Points

### M1: Terminal → Edge Alert Latency
- **What**: Time from MQTT publish (terminal status) to alert log entry in edge-service
- **How**: Compare MQTT message timestamp with edge-service log timestamp
- **Target**: < 500ms (P95)
- **Tool**: edge-service logs + MQTT broker timestamps

### M2: Payment Verification Latency
- **What**: End-to-end time for POST /api/v1/payment/verify through the gateway
- **How**: Measure with `curl -w "%{time_total}"` or Gatling/k6 load test
- **Target**: < 1000ms (P95), < 200ms (P50)
- **Tool**: cloud-gateway access logs, Prometheus `http_server_requests_seconds`

### M3: Insurance Fallback Rate Under Delay
- **What**: Percentage of payment verifications that fall back to self-pay when insurance
  service is delayed by tc netem (inject-delay.sh)
- **How**: Run inject-delay.sh 200ms, send 100 payment requests, count fallback responses
- **Target**: < 10% fallback rate at 200ms delay (insurance timeout is 400ms)
- **Tool**: simulation/inject-delay.sh + payment-service logs

### M4: Flink Anomaly Detection Lag
- **What**: Time from Kafka event to Flink alert emission
- **How**: Compare Kafka message timestamp with Flink print-sink timestamp
- **Target**: < 65s (one 60s window + 5s processing headroom)
- **Tool**: Flink job stdout, Kafka consumer timestamps

### M5: Alert-to-Prometheus Scrape Lag
- **What**: Time from alert generated to metric visible in Prometheus
- **How**: Compare alert log time with `scrape_interval` (15s)
- **Target**: < 30s (2× scrape interval)
- **Tool**: Prometheus metrics endpoint

## Acceptance Criteria
All 5 measurements must be within target before the system is considered production-ready.
A measurement run consists of:
1. Deploy all components (kubectl apply -f infra/)
2. Run `simulation/inject-delay.sh eth0 0 0 0` (no artificial delay)
3. Run `java -cp ... AnomalyReplayRunner` against the MQTT broker
4. Wait 90 seconds for Flink window to fire
5. Collect metrics from Prometheus, gateway logs, edge-service logs, Flink stdout
