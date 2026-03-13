-- Database schema for yunbianduan system
-- Apply with: kubectl exec -it <mysql-pod> -n yunbianduan-cloud -- mysql -u root -p yunbianduan < schema.sql

CREATE TABLE IF NOT EXISTS terminal_status (
    terminal_id VARCHAR(20) PRIMARY KEY,
    edge_id VARCHAR(20),
    status VARCHAR(20),
    last_heartbeat BIGINT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS payment_record (
    pay_id VARCHAR(64) PRIMARY KEY,
    terminal_id VARCHAR(20),
    patient_id VARCHAR(32),
    amount DECIMAL(10,2),
    method VARCHAR(20),
    status VARCHAR(20),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS alert_record (
    alert_id VARCHAR(64) PRIMARY KEY,
    terminal_id VARCHAR(20),
    level VARCHAR(5),
    type VARCHAR(20),
    message TEXT,
    resolved_at TIMESTAMP NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_terminal (terminal_id),
    INDEX idx_created (created_at)
);

CREATE TABLE IF NOT EXISTS audit_log (
    log_id BIGINT AUTO_INCREMENT PRIMARY KEY,
    terminal_id VARCHAR(20),
    operator VARCHAR(50),
    action VARCHAR(50),
    detail_json JSON,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB ROW_FORMAT=COMPRESSED;

CREATE TABLE IF NOT EXISTS satisfaction_log (
    log_id BIGINT AUTO_INCREMENT PRIMARY KEY,
    terminal_id VARCHAR(20),
    business_type VARCHAR(30),
    score TINYINT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS anomaly_eval_result (
    sample_id VARCHAR(32) PRIMARY KEY,
    terminal_id VARCHAR(20),
    label VARCHAR(10),
    predicted VARCHAR(10),
    actual_level VARCHAR(5),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
