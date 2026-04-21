# 云边端就医自助终端监测及预警系统

## 一、项目概述

本系统是面向医疗机构自助终端设备的云边端一体化监测预警平台，实现了对遍布医院各科室的 20 台自助终端的实时监控、故障告警与远程指令下发。系统采用"端-边-云"三层架构，终端层通过 MQTT 协议上报心跳与状态，边缘层完成实时规则判断与告警生成，云端层提供统一的数据聚合与前端展示。

---

## 二、系统架构

### 2.1 三层架构设计

```
┌──────────────────────────────────────────┐
│              端层（自助终端 ×20）          │
│    MQTT 心跳上报 / 告警触发 / 命令接收    │
└────────────────────┬─────────────────────┘
                     │ MQTT (port 1883)
                     ▼
┌──────────────────────────────────────────┐
│          边缘层（Edge Service）           │
│   Mosquitto MQTT Broker · Drools 规则引擎 │
│   实时告警判断 · Redis 缓存 · 指令下发    │
└────────────────────┬─────────────────────┘
                     │
                     ▼
┌──────────────────────────────────────────┐
│          云端层（K8s 微服务集群）          │
│  Cloud Gateway · Registration · Payment  │
│  Insurance · Queue · Report · Simulator  │
└──────────────────────────────────────────┘
```

### 2.2 技术栈

| 层级 | 技术选型 | 说明 |
|------|---------|------|
| 前端 | Vue 3 + Element Plus + Pinia + ECharts | Vite 构建开发服务器 |
| 网关 | Spring Cloud Gateway | 统一路由，NodePort 30080 |
| 边缘层 | Spring Boot + Drools + Redis | 监听 MQTT，规则引擎告警 |
| 云端服务 | Spring Boot 多服务 | Registration/Payment/Insurance 等 |
| 仿真器 | Spring Boot | 模拟终端行为与场景注入 |
| 消息队列 | Mosquitto (MQTT Broker) | 端边通信，port 1883 |
| 缓存/存储 | Redis 7 + MySQL 8 | 业务数据与告警持久化 |
| 容器编排 | Kubernetes (WSL2 单节点) | containerd 运行时 |

---

## 三、核心功能模块

### 3.1 终端监控（TerminalsView）

- **心跳监测**：20 台终端每 5 秒上报一次心跳，系统实时计算在线率
- **状态展示**：卡片布局显示每台终端的设备编号、状态、故障类型
- **终端详情抽屉**：点击终端可展开详细信息与操作面板

### 3.2 告警中心（AlertsView）

- **实时告警流**：Edge Service 监听 `terminal/+` MQTT 主题，经 Drools 规则判断后生成告警
- **告警分级**：P0（紧急）、P1（重要）、P2（一般）三级分类
- **告警处置**：支持确认（Acknowledge）和解决（Resolve）操作
- **过滤与搜索**：按级别、类型、终端、时间范围多维过滤

### 3.3 云边协同大屏（CloudSideView）

四标签页设计：

1. **概览**：云边端消息流转图 + 实时业务流 + 队列监控
2. **实时业务流**：挂号/支付/医保业务记录滚动展示
3. **运维处置**：命令下发 + 实时业务流 + 边端事件上报
4. **命令管理**：历史命令表格与状态追踪

### 3.4 仿真器（Simulator Service）

- **场景注入**：支持 printer_error / card_reader_error / offline / network_delay 等场景
- **终端模拟**：内存中维护 20 台虚拟终端，每 5 秒推送心跳
- **MQTT 告警发布**：场景触发后发布到 `terminal/alerts` 主题
- **恢复机制**：可将故障终端恢复至正常状态

### 3.5 业务服务

| 服务 | 端口 | 功能 |
|------|------|------|
| registration-service | 8082 | 科室挂号、医生排班、号源管理 |
| payment-service | 8081 | 支付结算、自费/医保混合支付 |
| insurance-service | 8085 | 医保身份核验、覆盖率查询 |
| queue-service | 8084 | 科室队列深度、平均等待时间 |
| report-service | 8083 | 就诊报告查询 |

---

## 四、数据流设计

### 4.1 终端心跳上报

```
终端(T001) --[MQTT heartbeat]--> Mosquitto --[订阅]--> Edge Service
                                                   │
                                                   ▼
                                              Redis (终端状态缓存)
```

### 4.2 告警生成（Drools 规则引擎）

```
终端异常状态 --> Drools 规则评估 --> 高温/离线/卡纸 --> AlertDto 生成
                                                          │
                                                          ▼
                                                    AlertStore.add()
                                                          │
                                                          ▼
                                                    Redis (edge:alerts)
```

### 4.3 场景注入（测试用）

```
前端 POST /api/v1/simulator/inject --> Simulator Service
                                            │
                                            ├──[写入内存alerts列表]
                                            │
                                            └──[MQTT publish]--> Mosquitto --> Edge Service
                                                                              │
                                                                              ▼
                                                                        AlertStore.add()
```

---

## 五、部署环境

### 5.1 Kubernetes 集群

- **节点**：单节点 WSL2（Ubuntu 22.04），控制平面 + 工作节点合一
- **容器运行时**：containerd，通过 `/etc/crictl.yaml` 配置 CRI
- **CNI**：Flannel，覆盖网络存储在 `/run/flannel/subnet.env`
- **镜像仓库**：本地 Registry（localhost:5500），避免拉取超时

### 5.2 Pod 状态（部分）

| Pod | Image | 端口 | 说明 |
|-----|-------|------|------|
| cloud-gateway | localhost:5500/cloud-gateway | 30080 (NodePort) | API 网关 |
| edge-service | localhost:5500/edge-service | 8090 | 边缘计算 |
| simulator-service | localhost:5500/simulator-service | 8095, 30095 | 仿真器 |
| mosquitto | localhost:5500/mosquitto:2.0.15 | 1883 | MQTT Broker |
| redis | localhost:5500/redis:7-alpine | 6379 | 缓存 |
| mysql | localhost:5500/mysql:8 | 3306 | 数据库 |
| registration-service | localhost:5500/registration-service | 8082 | 挂号服务 |
| payment-service | localhost:5500/payment-service | 8081 | 支付服务 |

---

## 六、最近开发进展

### 已完成功能

- 云边端监测大屏（四标签页：概览/业务流/运维/命令）
- 终端详情抽屉组件（连接命令-tab）
- 队列监控独立 Tab（Tab5）
- 告警中心多维过滤与新告警横幅
- 命令下发 Dialog（轻量化改造）
- 实时业务流信息丰富化（显示科室、医生姓名、患者ID+金额）
- 告警 MQTT 通道修复（mqtt service selector 修正）

### 技术债务 / 遗留问题

- `ctr images import` 存在 280MB 镜像导入卡顿问题（容器内进程挂起）
- WSL2 中 `npm run build` 因 WSL1 不支持报错（JAVA_HOME / Node.js 路径问题）
- 部分 ReplicaSet 历史遗留 `DESIRED=0` 问题（重启后未自动恢复）

---

## 七、项目结构

```
D:\yunbianduan/
├── ARCHITECTURE.md              # 架构文档
├── cloud-gateway/               # API 网关（Spring Cloud Gateway）
├── common/                      # 公共 DTO / 工具类
├── edge-service/                # 边缘服务（MQTT + Drools + AlertStore）
├── frontend/                    # Vue 3 前端（Vite）
├── infra/                       # K8s YAML / Helm 配置
├── insurance-service/           # 医保服务
├── payment-service/             # 支付服务
├── queue-service/               # 队列服务
├── registration-service/         # 挂号服务（含 10科室×10医生静态数据）
├── report-service/              # 报告服务
├── simulator-service/           # 终端仿真器
└── scripts/                     # 启动脚本
```

---

*本文档生成时间：2026-04-20*