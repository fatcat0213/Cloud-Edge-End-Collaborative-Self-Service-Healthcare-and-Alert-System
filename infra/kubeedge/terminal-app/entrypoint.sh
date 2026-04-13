#!/bin/bash

set -e

# Default values
TERMINAL_ID="${TERMINAL_ID:-T001}"
MQTT_BROKER="${MQTT_BROKER:-localhost}"
MQTT_PORT="${MQTT_PORT:-1883}"
COMMAND_PORT="${COMMAND_PORT:-9000}"
CLOUDCORE_URL="${CLOUDCORE_URL:-http://cloudcore.kubeedge:10000}"

REPORT_TOPIC="terminal/${TERMINAL_ID}/status"
EVENT_TOPIC="terminal/${TERMINAL_ID}/events"

report_heartbeat() {
    while true; do
        local timestamp
        timestamp=$(date -u +%Y-%m-%dT%H:%M:%SZ)

        # Gather basic system info
        local cpu_load
        local mem_info
        local cpu
        local memory

        cpu_load=$(uptime | awk -F'load average:' '{print $2}' | awk '{print $1}' | sed 's/,//')
        mem_info=$(cat /proc/meminfo 2>/dev/null | grep -E "MemTotal|MemAvailable" || echo "MemTotal: 0 kB\nMemAvailable: 0 kB")
        cpu=$(echo "$cpu_load" | awk '{printf "%.1f", $1 * 10}')
        memory=$(echo "$mem_info" | awk '/MemAvailable/ {printf "%.0f", ($2/1024)}')

        # Simulated device statuses (in production, read from actual hardware)
        local screen_status="on"
        local printer_status="ready"
        local card_reader_status="ready"

        local payload
        payload=$(jq -n \
            --arg tid "$TERMINAL_ID" \
            --arg ts "$timestamp" \
            --argjson online true \
            --arg cpu "$cpu" \
            --arg mem "$memory" \
            --arg screen "$screen_status" \
            --arg printer "$printer_status" \
            --arg card "$card_reader_status" \
            '{
                terminalId: $tid,
                timestamp: $ts,
                online: $online,
                cpu: (($cpu | tonumber) | floor),
                memory: (($mem | tonumber) | floor),
                screenStatus: $screen,
                printerStatus: $printer,
                cardReaderStatus: $card
            }')

        mosquitto_pub -h "$MQTT_BROKER" -p "$MQTT_PORT" -t "$REPORT_TOPIC" -m "$payload"
        echo "[heartbeat] Published: $payload"

        sleep 5
    done
}

poll_commands() {
    while true; do
        local response
        response=$(curl -s --connect-timeout 5 \
            "${CLOUDCORE_URL}/api/v1/edge/terminal/${TERMINAL_ID}/commands" 2>/dev/null || echo "")

        if [ -n "$response" ]; then
            local cmd
            cmd=$(echo "$response" | jq -r '.command // empty')

            if [ -n "$cmd" ]; then
                echo "[command] Received command: $cmd"
                execute_command "$cmd"
            fi
        fi

        sleep 3
    done
}

execute_command() {
    local cmd="$1"
    local timestamp
    timestamp=$(date -u +%Y-%m-%dT%H:%M:%SZ)
    local result="success"
    local output=""

    case "$cmd" in
        restart)
            output="Restarting terminal..."
            # In production: perform actual restart
            ;;
        maintenance)
            output="Entering maintenance mode..."
            # In production: enter maintenance mode
            ;;
        health_check)
            # Run built-in health check
            if curl -sf http://localhost:${COMMAND_PORT}/health > /dev/null 2>&1; then
                output="Health check passed"
                result="success"
            else
                output="Health check failed"
                result="failure"
            fi
            ;;
        *)
            output="Unknown command: $cmd"
            result="failure"
            ;;
    esac

    local event_payload
    event_payload=$(jq -n \
        --arg tid "$TERMINAL_ID" \
        --arg ts "$timestamp" \
        --arg command "$cmd" \
        --arg res "$result" \
        --arg out "$output" \
        '{
            terminalId: $tid,
            timestamp: $ts,
            command: $command,
            result: $res,
            output: $out
        }')

    mosquitto_pub -h "$MQTT_BROKER" -p "$MQTT_PORT" -t "$EVENT_TOPIC" -m "$event_payload"
    echo "[event] Published: $event_payload"
}

# Start background processes
echo "[entrypoint] Starting terminal app..."
echo "[entrypoint] TERMINAL_ID=$TERMINAL_ID"
echo "[entrypoint] MQTT_BROKER=$MQTT_BROKER"
echo "[entrypoint] MQTT_PORT=$MQTT_PORT"

report_heartbeat &
HEARTBEAT_PID=$!

poll_commands &
POLL_PID=$!

# Wait for both background processes
wait $HEARTBEAT_PID $POLL_PID
