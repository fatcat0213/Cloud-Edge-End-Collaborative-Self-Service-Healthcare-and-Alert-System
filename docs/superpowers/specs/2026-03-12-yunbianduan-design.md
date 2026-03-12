# 云边端就医自助终端监测及预警系统 — 设计规格文档

**日期：** 2026-03-12
**版本：** v1.1
**技术路线：** KubeEdge + Spring Cloud（方案二）

---

## 1. 项目概述

基于云边端协同架构，面向单医院部署的就医自助终端监测及预警系统。覆盖挂号预约、缴费支付、报告打印查询、叫号导诊、医保结算五类业务场景，具备硬件异常、业务异常、安全异常全类型检测能力。

### 核心指标约束

| 指标 | 目标值 | 度量方法 |
|------|--------|----------|
| 云边端全链路传输延迟 | P95 < 50ms（仿真验证） | Jaeger 全链路追踪 P95 |
| 支付验证算法响应时间 | P99 < 1000ms | JMeter 100并发压测 P99 |
| 异常检测 F1 Score | ≥ 0.98（精确率×召回率调和均值） | 1000条标注样本回放 |
| 异常检测误报率 | < 2% | 同上 |
| 异常响应时间 | < 5 秒 | AlertManager 事件计时 |
| 流程效率提升 | ≥ 10%（平均操作步骤 ≤ 4 步） | 仿真终端操作耗时对比 |
| 患者满意度提升 | ≥ 15%（平均等待时长 ≤ 90s） | 云端统计报表基线对比 |

---

## 2. 整体架构分层

```
┌─────────────────────────────────────────────────────┐
│                    云端层 (Cloud Layer)               │
│  K8s 主集群                                          │
│  ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌────────┐  │
│  │API Gateway│ │业务微服务 │ │异常检测服务│ │监控中台│  │
│  │(Spring CG)│ │(挂号/支付)│ │(Flink流处理)│ │Grafana│  │
│  └──────────┘ └──────────┘ └──────────┘ └────────┘  │
│         Kafka 事件总线 / MySQL / Redis / Flink        │
└─────────────────┬───────────────────────────────────┘
                  │ CloudCore (KubeEdge)
                  │ gRPC (mTLS) / MQTT over TLS
┌─────────────────┴───────────────────────────────────┐
│                   边缘层 (Edge Layer)                 │
│  EdgeCore (KubeEdge 模拟节点, yunbianduan-edge ns)    │
│  ┌──────────────┐  ┌───────────────┐                 │
│  │ 边缘网关服务  │  │ 本地规则引擎   │                 │
│  │(Spring Boot) │  │ (Drools)      │                 │
│  └──────────────┘  └───────────────┘                 │
│  本地 Redis 缓存 / MQTT Broker (Mosquitto)            │
└─────────────────┬───────────────────────────────────┘
                  │ MQTT / WebSocket（eth1 模拟局域网）
┌─────────────────┴───────────────────────────────────┐
│                   端层 (Terminal Layer)               │
│  自助终端模拟器 (Java 仿真客户端，20台并发)            │
│  挂号 / 支付 / 报告打印 / 叫号 / 医保结算              │
└─────────────────────────────────────────────────────┘
```

### 三层职责

| 层级 | 职责 | 关键技术 |
|------|------|----------|
| 端层 | 采集终端状态、触发业务操作 | Java 仿真客户端、MQTT 上报 |
| 边缘层 | 本地实时处理、断网续传、首级异常过滤 | KubeEdge EdgeCore、Drools、Mosquitto |
| 云端层 | 全局管控、复杂分析、持久化、可视化 | Spring Cloud、Kafka、Flink、K8s |

---

## 3. 通信协议与 50ms 延迟仿真

### 通信协议栈与延迟预算

| 链路 | 协议 | 加密 | 延迟预算 | 网络接口 |
|------|------|------|----------|----------|
| 终端 → 边缘 | MQTT 3.1.1 | TLS 1.3 | ≤ 5ms | eth1（局域网仿真） |
| 边缘处理 | Drools 规则执行 | — | ≤ 10ms | — |
| 边缘 → 云端（实时数据） | gRPC (HTTP/2) | mTLS 双向证书 | ≤ 20ms | eth0（WAN 仿真） |
| 云端处理 | Spring Boot 业务逻辑 | — | ≤ 5ms | — |
| 告警下发（云→边→端） | MQTT | TLS 1.3 | ≤ 10ms | eth0 + eth1 |

### 端到端延迟预算（修订版）

```
终端上报  边缘处理  边缘→云gRPC  云端处理  告警回传
  5ms   +  10ms  +    20ms    +   5ms   +  10ms  = 50ms ✅

说明：gRPC 传输预算 20ms（含 TLS 握手复用），低于协议栈理论上限；
      云端处理时间 5ms 为 Redis 路由 + 规则查询，不含 Flink 窗口（异步路径）。
```

### 50ms 延迟仿真方案

使用 Linux `tc netem` 在各自独立网络接口注入延迟（两个接口互不干扰）：

```bash
# eth0：模拟边缘→云端 WAN 链路，注入 20ms 延迟 + 2ms 抖动
tc qdisc add dev eth0 root netem delay 20ms 2ms distribution normal

# eth1：模拟终端→边缘局域网，注入 5ms 延迟 + 1ms 抖动
tc qdisc add dev eth1 root netem delay 5ms 1ms distribution normal
```

**仿真验证流程：**
1. 启动仿真终端客户端（20 台并发 Pod，yunbianduan-sim namespace）
2. 分别在 eth0/eth1 注入 tc netem 延迟参数
3. 通过 Jaeger 采集各链路 P50/P95/P99 延迟
4. 调整 MQTT QoS=1、gRPC keepalive=30s、连接池预热
5. 验收目标：P95 < 50ms，P99 < 80ms

### 安全传输机制

- **证书体系：** 自签 CA 签发边缘节点证书，KubeEdge 内置证书轮换（90天）
- **MQTT 认证：** 用户名/密码 + TLS 客户端证书双重认证
- **数据完整性：** 消息体 HMAC-SHA256 签名，防篡改
- **应用层授权：** JWT（RS256）由 API Gateway 签发，Claim 包含 `terminalId`/`role`（`terminal`/`admin`/`ops`）；运维大屏 Grafana 使用 LDAP/OAuth2 RBAC，分 viewer/editor/admin 角色
- **审计日志：** 所有支付和医保结算操作写入独立审计表（`audit_log`），不可变，保留 5 年

---

## 4. 核心业务微服务与支付验证

### 微服务拆分

```
API Gateway (Spring Cloud Gateway)
路由 / 限流(Resilience4j) / JWT鉴权
  ├── 挂号服务        (registration-service)
  ├── 支付服务        (payment-service)
  ├── 报告服务        (report-service)
  ├── 叫号服务        (queue-service)
  └── 医保结算服务    (insurance-service)
       └── Kafka 事件总线（topic 命名规范见第 9 节）
           MySQL（业务库）Redis（缓存/会话）
```

### 支付验证 <1s 设计

```
终端发起支付请求
      ↓
边缘层预验证（本地 Redis 缓存患者信息，~50ms）
      ↓
payment-service 接收（Spring Boot）
      ↓
┌─────────────────────────────────┐
│ 并行执行（CompletableFuture）    │
│ ① 医保资格验证  ~200ms          │
│ ② 支付渠道预授权 ~300ms         │
│ ③ 风控规则检查  ~100ms（Redis） │
└─────────────────────────────────┘
      ↓ 合并结果 ~50ms
支付结果返回终端（总计 ~600ms）✅
Kafka 异步发布 payment.completed 事件
```

**关键优化点：**

| 优化手段 | 效果 |
|----------|------|
| 边缘本地 Redis 缓存患者基础信息 | 减少云端查询 ~200ms |
| 三路并行验证（CompletableFuture） | 节省 ~300ms |
| 医保接口 HTTP 连接池预热（启动时） | 减少首次建连开销 |
| 支付结果 Redis 幂等缓存（TTL=60s） | 防重复支付，重试毫秒级响应 |
| 医保 API 超时熔断（Resilience4j，timeout=400ms） | 降级为自费流程，保障可用性 |

---

## 5. 异常检测系统

### 双引擎架构

```
终端上报数据流（MQTT，topic: terminal/{terminalId}/status）
        ↓
边缘层：Drools 规则引擎（实时，<500ms）
├── 硬件异常规则：心跳超时 / 打印机状态码异常 / 读卡器故障
├── 业务异常规则：支付超时>30s / 队列积压>50人
└── 触发 P0/P1 本地告警 → MQTT 推送终端 + Kafka 上报云端
        ↓（原始数据流 → Kafka topic: terminal.events）
云端层：Flink 流处理（滑动窗口，<5s 告警）
├── 1min 窗口：事务成功率跌破阈值检测
├── 5min 窗口：队列深度趋势 + 安全异常（高频刷卡/金额突变）
└── 告警聚合 → AlertManager → 运维大屏 + 钉钉/短信通知
```

### 98% F1 Score 实现策略

**准确率定义：** F1 = 2 × Precision × Recall / (Precision + Recall) ≥ 0.98，误报率 FP Rate < 2%

**测试集构成（共 1000 条）：**

| 异常类型 | 样本数 | 正常样本数 |
|----------|--------|------------|
| 硬件异常 | 150 | 150 |
| 业务异常 | 150 | 150 |
| 安全异常 | 100 | 100 |
| 混合/边界 | 100 | 100 |

**双重防误报机制：**

| 机制 | 说明 |
|------|------|
| 规则分级 | P0（立即告警）/ P1（确认后告警）/ P2（记录观察） |
| 时间窗口确认 | 异常持续 >3次心跳（15s）才升级，过滤瞬时抖动 |
| 历史基线对比 | 每台终端正常指标基线，偏差 >3σ 才触发 |
| 告警去重 | Redis 去重窗口，同类异常 5 分钟内只告警一次 |

### 响应时间保障

**<5s SLA 适用范围：仅覆盖边缘 Drools P0/P1 规则触发路径（硬件异常、明确业务阈值超限）。**
Flink 长窗口分析（1min/5min 趋势型告警）为异步路径，不受 <5s 约束，属于辅助分析层。

```
P0/P1 告警路径（<5s SLA）：
  ↓ 0-500ms   边缘 Drools 规则命中 → P0 本地告警
  ↓ 500ms-2s  Kafka 推送云端（topic: terminal.alerts）
  ↓ 2s-4s     AlertManager 路由 + 通知
  ↓ <5s       告警推送运维大屏 + 钉钉/短信通知 ✅

趋势分析路径（异步，SLA 不限）：
  ↓ 0-5min    Flink 1min/5min 滑动窗口计算
  ↓ 完成后    P2 趋势告警推送运维大屏（供预防性维护参考）
```

---

## 6. 流程优化与患者满意度提升

### 流程优化（≥10%）

**量化基准（T0 采集协议）：**
- 在系统上线前，使用仿真终端运行标准化场景脚本（挂号/支付/报告各 200 次），采集平均操作步骤数和平均业务完成时长作为 T0
- 每次测试独立运行，取 3 次均值，记录到 `docs/baseline/T0-measurement.md`
- **绝对代理指标（不依赖 T0）：** 平均操作步骤 ≤ 4 步；平均业务完成时长 ≤ 120s

| 优化点 | 解决方案 | 预期提升 |
|--------|----------|----------|
| 智能分诊导流 | 边缘层实时队列感知，终端屏显示最短等待路径 | 等待时长 -15% |
| 支付流程简化 | 统一支付入口，自动识别医保资格，一键结算 | 操作步骤 -30% |
| 故障预测性维护 | 异常检测提前发现设备劣化趋势，主动派工 | 故障中断 -20% |
| 报告自动推送 | 检验完成事件触发，主动推送至终端/手机 | 查询次数 -50% |

### 患者满意度提升（≥15%）

**绝对代理指标：** 平均满意度评分 ≥ 4.0/5.0；平均等待时长 ≤ 90s

四个干预维度：
1. **等待体验：** 实时叫号进度展示 + 预计等待时间
2. **操作体验：** 大字体/语音引导/流程步骤 ≤ 4 步
3. **异常恢复：** 终端故障 30 秒内自动引导至备用终端
4. **反馈闭环：** 业务结束后 1 题 1-5 星满意度采集

---

## 7. 故障与恢复场景

### 边缘—云端链路中断

| 场景 | 处理策略 |
|------|----------|
| 短暂断网（<30s） | 边缘 Mosquitto 本地缓冲，重连后自动同步（MQTT QoS=1，持久会话） |
| 长时断网（>30s） | 边缘切入离线模式：挂号/报告本地缓存服务继续；支付降级为现金提示；告警本地存储，重连后批量上传 |
| 缓冲区满（默认 10000 条消息） | LRU 淘汰最旧心跳数据，保留业务事务数据；触发本地 P0 告警 |

### 边缘节点宕机

| 场景 | 处理策略 |
|------|----------|
| EdgeCore 进程崩溃 | KubeEdge 自动重启（K8s RestartPolicy=Always），目标恢复 <30s |
| 终端无法连接边缘 | 终端客户端降级直连云端 API Gateway（gRPC fallback），延迟增加但功能保持 |

### 医保 API 不可用

| 场景 | 处理策略 |
|------|----------|
| 超时（>400ms） | Resilience4j 熔断，自动切换为纯自费流程，界面提示"医保暂不可用，请选择自费" |
| 熔断恢复 | 半开状态每 60s 探测一次，成功率 >80% 后自动恢复 |

### Kafka 消费积压

| 场景 | 处理策略 |
|------|----------|
| Flink 消费延迟 >10s | AlertManager 触发 P1 告警，自动扩容 TaskManager Pod（HPA） |
| Kafka Broker 宕机 | 3 副本 Topic，客户端自动切换到存活 Broker，不丢消息（acks=all） |

---

## 8. 数据模型与接口约定

### MQTT Topic 规范

```
terminal/{terminalId}/status     # 终端心跳与状态上报（1次/5s）
terminal/{terminalId}/event      # 业务事件（支付/挂号/报告操作）
terminal/{terminalId}/alert      # 告警下发（云→边→端）
edge/{edgeId}/sync               # 边缘向云端同步离线缓冲数据
```

### 终端心跳 MQTT Payload（JSON）

```json
{
  "terminalId": "T001",
  "timestamp": 1741744800000,
  "status": "online",
  "hardware": {
    "printer": "ok",
    "cardReader": "ok",
    "screen": "ok"
  },
  "queue": {
    "depth": 3,
    "avgWaitMs": 45000
  },
  "hmac": "sha256:abcd1234..."
}
```

### 核心 gRPC 服务接口（边缘→云端）

```protobuf
service EdgeCloudService {
  rpc ReportEvent(TerminalEvent) returns (Ack);
  rpc SyncOfflineBuffer(stream BufferedMessage) returns (SyncResult);
  rpc ReceiveAlert(stream Alert) returns (Ack);
}
```

### 关键 REST API（云端，Spring Cloud Gateway 路由）

| Method | Path | 说明 |
|--------|------|------|
| POST | /api/v1/payment/verify | 支付验证（<1s） |
| POST | /api/v1/registration | 挂号预约 |
| GET | /api/v1/report/{patientId} | 报告查询 |
| GET | /api/v1/queue/{deptId} | 科室队列状态 |
| POST | /api/v1/insurance/settle | 医保结算 |

### 核心 MySQL 表结构（概要）

```sql
terminal_status   (terminal_id, edge_id, status, last_heartbeat, created_at)
payment_record    (pay_id, terminal_id, patient_id, amount, method, status, created_at)
alert_record      (alert_id, terminal_id, level, type, message, resolved_at, created_at)
audit_log         (log_id, terminal_id, operator, action, detail_json, created_at)  -- 不可变
satisfaction_log  (log_id, terminal_id, business_type, score, created_at)
```

---

## 9. 测试与验证策略

### 各指标验证方法

| 指标 | 验证方法 | 工具 | 通过标准 |
|------|----------|------|----------|
| 云边延迟 <50ms | tc netem 注入延迟 + 全链路埋点 | Jaeger + Prometheus | P95 < 50ms |
| 支付验证 <1s | JMeter 100并发压测，持续5分钟 | JMeter + Grafana | P99 < 1000ms |
| 异常检测 F1 ≥ 0.98 | 1000条标注样本回放 | 自制仿真数据集 | F1 ≥ 0.98，FP < 2% |
| 异常响应 <5s | 注入故障事件 → 告警到达计时 | AlertManager + 自动化脚本 | 100次注入，95次 <5s |
| 流程效率 +10% | 仿真终端操作耗时对比（优化前后） | 压测脚本 | 平均步骤 ≤ 4，时长 ≤ 120s |
| 满意度 +15% | 仿真满意度评分统计 | 云端统计报表 | 均分 ≥ 4.0/5.0，等待 ≤ 90s |

### 测试分层

```
单元测试（JUnit 5）
  → 集成测试（Testcontainers：MySQL/Redis/Kafka/Mosquitto）
    → 仿真压测（20台终端并发，tc netem 注入延迟）
      → 混沌测试（边缘节点断网、终端随机离线、医保API超时）
        → 指标验收（对照上表逐项核查）
```

---

## 10. K8s 部署结构

```
Namespace: yunbianduan-cloud
  └── spring-gateway, registration, payment, report, queue, insurance
  └── kafka (3 broker), mysql (主从), redis (sentinel), flink (1 JM + 2 TM)

Namespace: yunbianduan-edge
  └── kubeedge-edgecore, mosquitto-broker, drools-engine, edge-gateway
  └── redis-edge (单实例, 本地缓存)

Namespace: yunbianduan-sim
  └── terminal-simulator (20 Pod, 每Pod模拟1台终端)

Namespace: monitoring
  └── prometheus, grafana, jaeger-collector, jaeger-query, alertmanager
```

### Flink 部署规格

```yaml
# Flink on Kubernetes (Application Mode)
JobManager:  1 Pod, 2CPU/4Gi
TaskManager: 2 Pod, 2CPU/4Gi each
State Backend: RocksDB（本地持久化）
Checkpoint Interval: 30s
Savepoint Path: /flink-savepoints (PersistentVolume)
```

### 技术栈汇总

| 层级 | 组件 | 技术 |
|------|------|------|
| 云端微服务 | API 网关、业务服务 | Spring Cloud Gateway、Spring Boot 3.x |
| 云边通信 | 消息总线 | KubeEdge CloudCore/EdgeCore、Mosquitto MQTT |
| 事件流 | 异步解耦 | Apache Kafka 3.x（3副本） |
| 异常检测 | 规则引擎 + 流处理 | Drools 8.x（边缘）、Apache Flink 1.18（云端） |
| 数据存储 | 持久化 | MySQL 8.x（主从）、Redis 7.x（Sentinel） |
| 容器编排 | 部署管理 | Kubernetes + KubeEdge 1.16 |
| 可观测性 | 监控告警 | Prometheus、Grafana、Jaeger、AlertManager |
| 测试 | 压测/仿真 | JMeter、Testcontainers、JUnit 5 |
