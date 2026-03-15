#!/usr/bin/env python3
import paho.mqtt.client as mqtt
import json
import time
import random
import hashlib
import hmac
import base64

HMAC_SECRET = "yunbd-terminal-secret-2026"

def sign_payload(payload):
    import base64
    signature = hmac.new(
        HMAC_SECRET.encode(),
        payload.encode(),
        hashlib.sha256
    ).digest()
    return "sha256:" + base64.b64encode(signature).decode()

def build_status(terminal_id):
    # Use alphabetical key order to match Jackson @Data serialization
    import collections
    payload = collections.OrderedDict()
    payload["hardware"] = {
        "cardReader": "ok",
        "printer": "ok",
        "screen": "ok"
    }
    payload["queue"] = {
        "avgWaitMs": random.randint(5000, 120000),
        "depth": random.randint(0, 10)
    }
    payload["status"] = "online"
    payload["terminalId"] = terminal_id
    payload["timestamp"] = int(time.time() * 1000)
    payload["hmac"] = None  # placeholder for signing

    # Create payload without hmac for signing
    payload_for_sign = {k: v for k, v in payload.items() if k != 'hmac'}
    json_str = json.dumps(payload_for_sign, separators=(',', ':'))
    payload['hmac'] = sign_payload(json_str)
    return json.dumps(payload, separators=(',', ':'))

def on_connect(client, userdata, flags, rc, properties=None):
    if rc == 0:
        print(f"Connected to MQTT broker")
    else:
        print(f"Connection failed with code {rc}")

def main():
    broker = "172.24.161.35"
    port = 31883

    client = mqtt.Client(mqtt.CallbackAPIVersion.VERSION2)
    client.on_connect = on_connect

    try:
        client.connect(broker, port, 60)
        client.loop_start()

        # Wait for connection
        time.sleep(2)

        # Simulate 20 terminals
        terminal_count = 20
        for i in range(1, terminal_count + 1):
            terminal_id = f"T{i:03d}"
            topic = f"terminal/{terminal_id}/status"
            payload = build_status(terminal_id)
            result = client.publish(topic, payload, qos=1)
            print(f"Published to {topic}: {result.rc}")
            time.sleep(0.2)

        print(f"Published {terminal_count} messages")

        # Keep publishing periodically
        interval = 5  # seconds
        while True:
            time.sleep(interval)
            for i in range(1, terminal_count + 1):
                terminal_id = f"T{i:03d}"
                topic = f"terminal/{terminal_id}/status"
                payload = build_status(terminal_id)
                client.publish(topic, payload, qos=1)
            print(f"Refreshed {terminal_count} terminal statuses")

    except Exception as e:
        print(f"Error: {e}")
    finally:
        client.loop_stop()
        client.disconnect()

if __name__ == "__main__":
    main()
