#!/usr/bin/env bash
# Inject network delay on the edge node's primary interface toward the cloud.
# Usage: inject-delay.sh [INTERFACE] [DELAY_MS] [JITTER_MS] [LOSS_PERCENT]
# Defaults: eth0, 200ms delay, 50ms jitter, 5% loss
#
# Uses tc qdisc with netem discipline.
# Idempotent: deletes existing netem qdisc before adding new one.

set -euo pipefail

IFACE="${1:-eth0}"
DELAY="${2:-200}"
JITTER="${3:-50}"
LOSS="${4:-5}"

# Remove any existing root qdisc (ignore error if none exists)
tc qdisc del dev "$IFACE" root 2>/dev/null || true

# Add netem qdisc with specified parameters
tc qdisc add dev "$IFACE" root netem \
    delay "${DELAY}ms" "${JITTER}ms" \
    loss "${LOSS}%"

echo "Injected delay=${DELAY}ms jitter=${JITTER}ms loss=${LOSS}% on $IFACE"
