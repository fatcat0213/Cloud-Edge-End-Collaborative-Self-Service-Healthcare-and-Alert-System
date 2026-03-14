#!/usr/bin/env bash
# Remove all tc netem rules from the specified interface.
# Usage: remove-delay.sh [INTERFACE]
# Default: eth0

set -euo pipefail

IFACE="${1:-eth0}"

if tc qdisc show dev "$IFACE" | grep -q netem; then
    tc qdisc del dev "$IFACE" root
    echo "Removed netem qdisc from $IFACE"
else
    echo "No netem qdisc found on $IFACE (nothing to remove)"
fi
