# Codebase Structure

**Analysis Date:** 2026-04-21

## Directory Layout

```
yunbianduan/                      # Project root (Maven multi-module parent)
├── pom.xml                       # Parent POM, defines all modules
├── docker-compose.yml            # Full stack local deployment
├── common/                       # Shared DTOs and utilities
├── cloud-gateway/                 # Spring Cloud Gateway service
├── edge-service/                 # Edge computing service
├── payment-service/              # Payment processing service
├── registration-service/         # Registration service
├── report-service/               # Report service
├── queue-service/                # Queue management service
├── insurance-service/            # Insurance verification service
├── simulator-service/            # Terminal/event simulator
├── simulator/                    # Python simulator scripts
├── flink-jobs/                   # Apache Flink streaming jobs
├── frontend/                     # Vue 3 dashboard SPA
├── infra/                        # Infrastructure as Code
│   ├── mosquitto/               # MQTT broker config
│   ├── redis/                   # Redis deployments
│   ├── kafka/                   # Kafka config
│   ├── k8s/                     # Kubernetes manifests
│   ├── kubeedge/                # KubeEdge configs
│   ├── mysql/                   # MySQL config
│   └── cloud-services/          # Cloud service deployments
├── simulation/                   # Python simulation scripts
├── scripts/                     # Shell utility scripts
└── docs/                        # Documentation and plans
```

## Module Purposes

### Backend Modules (Java/Spring Boot)

**[common](D:\yunbianduan\common)**
- Purpose: Shared DTOs, utilities, and configurations
- Contains: `AlertDto`, `TerminalStatusDto`, `PaymentRequestDto`, `HmacUtil`
- Consumed by: All services

**[cloud-gateway](D:\yunbianduan\cloud-gateway)**
- Purpose: API gateway, routing, rate limiting
- Key files: `GatewayApplication.java`, `application.yml`
- Routes: All external traffic to backend services

**[edge-service](D:\yunbianduan\edge-service)**
- Purpose: Edge computing, alert rule processing, MQTT handling
- Key packages:
  - `mqtt/` - MQTT subscriber/publisher
  - `rules/` - Drools rule engine
  - `kubeedge/` - KubeEdge node client
  - `command/` - Terminal command handling
  - `AlertController.java` - Alert REST API

**[payment-service](D:\yunbianduan\payment-service)**
- Purpose: Payment processing, risk assessment, idempotency
- Key files: `PaymentController.java`, `PaymentApplication.java`
- Services: `InsuranceClient`, `RiskCheckService`, `IdempotencyService`

**[registration-service](D:\yunbianduan\registration-service)**
- Purpose: Patient registration workflow
- Key files: `RegistrationController.java`
- Database: MySQL (jdbc)

**[queue-service](D:\yunbianduan\queue-service)**
- Purpose: Queue number management
- Key files: `QueueController.java`

**[insurance-service](D:\yunbianduan\insurance-service)**
- Purpose: Insurance verification
- Key files: `InsuranceController.java`

**[report-service](D:\yunbianduan\report-service)**
- Purpose: Report generation
- Key files: `ReportController.java`

**[simulator-service](D:\yunbianduan\simulator-service)**
- Purpose: Terminal and event simulation for testing
- Key files: `SimulatorApplication.java`, `SimulatorController.java`

### Frontend Module (Vue 3)

**[frontend](D:\yunbianduan\frontend)**
```
frontend/
├── src/
│   ├── main.js                  # Vue app entry point
│   ├── App.vue                 # Root component
│   ├── api/
│   │   ├── index.js            # Axios HTTP client, API endpoints
│   │   └── edgeCommand.js      # Edge command API
│   ├── router/
│   │   └── index.js            # Vue Router configuration
│   ├── stores/                 # Pinia stores
│   │   ├── alerts.js           # Alert state management
│   │   ├── terminals.js        # Terminal state
│   │   ├── simulator.js        # Simulator control
│   │   ├── stats.js            # Statistics
│   │   ├── cloudSide.js        # Cloud-side view state
│   │   ├── edgeSide.js         # Edge-side view state
│   │   ├── terminalSide.js     # Terminal-side view state
│   │   └── auth.js             # Authentication
│   ├── views/                  # Page components
│   │   ├── Dashboard.vue       # Main dashboard
│   │   ├── TerminalsView.vue   # Terminal list
│   │   ├── AlertsView.vue       # Alert management
│   │   ├── CloudSideView.vue   # Cloud monitoring view
│   │   ├── EdgeSideView.vue    # Edge monitoring view
│   │   ├── TerminalSideView.vue # Terminal view
│   │   ├── PaymentView.vue     # Payment page
│   │   ├── QueueView.vue        # Queue page
│   │   ├── RegistrationView.vue # Registration page
│   │   ├── InsuranceView.vue   # Insurance page
│   │   └── LoginView.vue        # Login page
│   ├── components/
│   │   ├── MainLayout.vue      # Main layout with nav
│   │   ├── FlowDiagram.vue     # System flow diagram
│   │   └── TerminalDetailDrawer.vue # Terminal detail panel
│   ├── styles/
│   │   ├── variables.css       # CSS variables
│   │   └── element-override.css # Element Plus overrides
│   └── __tests__/              # Vitest tests
│       ├── views/              # View tests
│       ├── stores/             # Store tests
│       └── components/         # Component tests
├── package.json                # Vue dependencies
├── vite.config.js              # Vite build config
└── Dockerfile                 # Container build
```

## Key File Locations

### Entry Points
- Backend: Each service has `*Application.java` (e.g., `EdgeApplication.java`)
- Frontend: `D:\yunbianduan\frontend\src\main.js`

### Configuration Files
- Parent POM: `D:\yunbianduan\pom.xml`
- Gateway routes: `D:\yunbianduan\cloud-gateway\src\main\resources\application.yml`
- Edge service: `D:\yunbianduan\edge-service\src\main\resources\application.yml`
- Frontend API: `D:\yunbianduan\frontend\src\api\index.js`
- Docker Compose: `D:\yunbianduan\docker-compose.yml`

### Core Logic
- Drools rules: `D:\yunbianduan\edge-service\src\main\resources\rules\TerminalRules.drl`
- MQTT subscriber: `D:\yunbianduan\edge-service\src\main\java\com\yunbd\edge\mqtt\MqttSubscriber.java`
- Alert store: `D:\yunbianduan\edge-service\src\main\java\com\yunbd\edge\AlertStore.java`
- Payment controller: `D:\yunbianduan\payment-service\src\main\java\com\yunbd\payment\api\PaymentController.java`

## Naming Conventions

### Java
- Classes: PascalCase (e.g., `AlertController`, `DroolsEngine`)
- Methods: camelCase (e.g., `getAlerts`, `evaluate`)
- Packages: lowercase dot-separated (e.g., `com.yunbd.edge.mqtt`)
- DTOs: Suffix `Dto` (e.g., `AlertDto`, `TerminalStatusDto`)

### Frontend (Vue/JS)
- Files: PascalCase for components (e.g., `Dashboard.vue`), camelCase for JS (e.g., `alerts.js`)
- Views: PascalCase with `View` suffix (e.g., `AlertsView.vue`)
- Stores: camelCase (e.g., `edgeSide.js`)
- API functions: camelCase (e.g., `getEdgeAlerts`)

### Maven Modules
- Artifact IDs: kebab-case (e.g., `cloud-gateway`, `edge-service`)

## Where to Add New Code

### New Backend Service
1. Create module directory under `D:\yunbianduan\{service-name}/`
2. Add module to parent `pom.xml` `<modules>` section
3. Add dependency on `common` module
4. Create `src/main/java/com/yunbd/{service}/` package
5. Add `*Application.java` entry point
6. Add route to `cloud-gateway/src/main/resources/application.yml`
7. Add service to `docker-compose.yml`

### New Frontend View
1. Create view file in `D:\yunbianduan\frontend\src\views/{Name}View.vue`
2. Add route in `D:\yunbianduan\frontend\src\router\index.js`
3. Add Pinia store if needed in `stores/`
4. Add API functions in `api/index.js`

### New Alert Type / Drools Rule
1. Edit `D:\yunbianduan\edge-service\src\main\resources\rules\TerminalRules.drl`
2. Rule fires based on `TerminalStatusDto` fields
3. Generates `AlertDto` objects

## Special Directories

**[frontend/node_modules](D:\yunbianduan\frontend\node_modules)**
- Purpose: npm dependencies
- Generated: Yes
- Committed: No (in .gitignore)

**[infra](D:\yunbianduan\infra)**
- Purpose: Infrastructure as Code (Docker, Kubernetes, configs)
- Generated: No
- Committed: Yes

**[simulation](D:\yunbianduan\simulation)**
- Purpose: Python-based simulation scripts
- Generated: No
- Committed: Yes

**[.claude](D:\yunbianduan\.claude)**
- Purpose: Claude Code settings and skills
- Generated: Yes
- Committed: No

---

*Structure analysis: 2026-04-21*
