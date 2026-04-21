# Phase 3: Persistence - Context

**Gathered:** 2026-04-22
**Status:** Ready for planning

<domain>
## Phase Boundary

**范围：** 运维日志和命令历史的后端持久化存储，确保页面刷新后数据不丢失

**当前问题：**
- opsLog：纯内存（cloudSide.js ref），刷新页面即丢失
- 命令历史：CommandService.java 使用内存 ConcurrentHashMap，edge-service 重启即丢失
- 告警确认/解决：AlertStore.java 已用 Redis 持久化，无需改动

</domain>

<decisions>
## Implementation Decisions

### A. opsLog 存储
- **A-01:** 存储介质：Redis（key = `edge:opslog`）
- **A-02:** 数据结构：List<OpsLogEntry>，每条记录包含 `{ id, timestamp, operator, type, terminalId, status, detail }`
- **A-03:** 最大条目：100 条（与现有内存限制一致）

### B. 命令历史存储
- **B-01:** 存储介质：Redis（key = `edge:commands`）
- **B-02:** 扩展现有 CommandService.commandStore（从 ConcurrentHashMap 改为同时写 Redis）
- **B-03:** 保留内存缓存用于快速读取，异步持久化到 Redis

### C. 后端 API 位置
- **C-01:** 在 edge-service 新增 `OpsLogController`（`/api/opslog`）
- **C-02:** 扩展 `CommandService` 增加 Redis 持久化（无需新 Controller）
- **C-03:** OpsLogController API：
  - `GET /opslog` — 查询 ops log（支持分页和过滤）
  - `POST /opslog` — 写入 ops log（内部调用，命令下发时自动触发）
- **C-04:** CommandService 持久化：在 dispatchCommand 成功后将命令写入 Redis

### D. 时间范围查询
- **D-01:** `GET /opslog` 支持参数：`startTime`, `endTime`, `type`, `terminalId`（URL query params）
- **D-02:** `GET /commands` 支持参数：`startTime`, `endTime`, `terminalId`, `type`（URL query params）
- **D-03:** 前端 store 调用 API 时传入时间参数，后端 Redis scan 或 MySQL WHERE 过滤

### E. 前端改造
- **E-01:** cloudSide.js 的 `recordOperation` 改为调用 `POST /api/opslog` 持久化，同时保留内存追加（用于当前会话实时显示）
- **E-02:** edgeNodeStore.js 的 `fetchRecentCommands` 改为调用 `GET /api/commands`（持久化后的命令列表）
- **E-03:** 页面刷新后：opsLog 从 `GET /opslog` 加载，命令历史从 `GET /commands` 加载

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Backend
- `edge-service/src/main/java/com/yunbd/edge/AlertStore.java` — AlertStore 已实现 Redis 持久化模式，可参考
- `edge-service/src/main/java/com/yunbd/edge/command/CommandService.java` — CommandService 当前使用 ConcurrentHashMap，需扩展
- `edge-service/src/main/java/com/yunbd/edge/command/CommandController.java` — 现有 command API

### Frontend
- `frontend/src/stores/cloudSide.js` — opsLog 数据，recordOperation 需改造
- `frontend/src/stores/edgeNodeStore.js` — commands 数据，dispatchCommand 需改造
- `frontend/src/api/index.js` — API 定义处

### Phase 2 Context
- `.planning/phases/02-cloudside-enhancement/02-CONTEXT.md` — Phase 2 决策（opsLog 结构等）

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `AlertStore.java` — Redis 持久化模式参考（`StringRedisTemplate`，`leftPush`/`range` pattern）
- `CommandService.commandStore` — 现有命令内存存储，可扩展

### Established Patterns
- Redis key pattern: `edge:alerts` → 应遵循 `edge:opslog`、`edge:commands`
- `@PostConstruct init()` 模式：从 Redis 加载已有数据到内存
- `persistToRedis()` 私有方法模式：写入前检查 null，写入后 trim

### Integration Points
- `OpsLogController` → `/opslog` API，需在 Gateway 路由配置
- 前端 `cloudSide.js` recordOperation → `POST /api/opslog`
- 前端 `cloudSide.js` refresh() → `GET /api/opslog`
- 前端 `edgeNodeStore.js` fetchRecentCommands → `GET /api/commands`

</code_context>

<deferred>
## Deferred Ideas

### From Phase 3 Discussion
- 是否需要 MySQL（用户选了 Redis，MySQL 方案暂缓）

</deferred>

---

*Phase: 03-persistence*
*Context gathered: 2026-04-22*
