#!/bin/bash
# edgecore-install.sh
# EdgeCore installation script for KubeEdge Linux terminals

set -e

if [ $# -ne 3 ]; then
    echo "Usage: bash edgecore-install.sh <CLOUDCORE_IP> <JOIN_TOKEN> <TERMINAL_ID>"
    echo "Example: bash edgecore-install.sh 192.168.1.100 <token> terminal-001"
    exit 1
fi

CLOUDCORE_IP=$1
JOIN_TOKEN=$2
TERMINAL_ID=$3
CLOUDCORE_IPPORT="${CLOUDCORE_IP}:10000"

KUBEEDGE_VERSION="1.17.0"
ARCH=$(uname -m)

case "${ARCH}" in
    x86_64)
        ARCH_NAME="amd64"
        ;;
    aarch64|arm64)
        ARCH_NAME="arm64"
        ;;
    *)
        echo "Unsupported architecture: ${ARCH}"
        exit 1
        ;;
esac

echo "=============================================="
echo "  KubeEdge EdgeCore Installer"
echo "=============================================="
echo "Version: ${KUBEEDGE_VERSION}"
echo "Architecture: ${ARCH} -> ${ARCH_NAME}"
echo "CloudCore: ${CLOUDCORE_IPPORT}"
echo "Terminal ID: ${TERMINAL_ID}"
echo "=============================================="
echo ""

# Download KubeEdge
DOWNLOAD_URL="https://github.com/kubeedge/kubeedge/releases/download/v${KUBEEDGE_VERSION}/keadm-v${KUBEEDGE_VERSION}-linux-${ARCH_NAME}.tar.gz"
echo "[1/4] Downloading KubeEdge ${KUBEEDGE_VERSION} from GitHub..."
curl -L --progress-bar -o /tmp/keadm.tar.gz "${DOWNLOAD_URL}"

echo "[2/4] Extracting installer..."
tar -xzf /tmp/keadm.tar.gz -C /tmp

echo "[3/4] Installing EdgeCore with keadm join..."
keadm join \
    --cloudcore-ipport="${CLOUDCORE_IPPORT}" \
    --token="${JOIN_TOKEN}" \
    --label="node-role.kubernetes.io/edge=true" \
    --label="terminal/id=${TERMINAL_ID}"

echo "[4/4] Setting up firewall rules for testing..."
# Allow KubeEdge services (for testing only - remove in production)
if command -v ufw &> /dev/null; then
    ufw allow 10000/tcp   # CloudCore
    ufw allow 10350/tcp   # EdgeCore
    echo "Firewall rules added (ufw)"
elif command -v firewall-cmd &> /dev/null; then
    firewall-cmd --permanent --add-port=10000/tcp
    firewall-cmd --permanent --add-port=10350/tcp
    firewall-cmd --reload
    echo "Firewall rules added (firewalld)"
else
    echo "No firewall tool detected - skipping firewall configuration"
fi

echo ""
echo "=============================================="
echo "  Installation Complete!"
echo "=============================================="
echo "EdgeCore has been installed and configured."
echo "Node labels applied:"
echo "  - node-role.kubernetes.io/edge=true"
echo "  - terminal/id=${TERMINAL_ID}"
echo ""
echo "Next steps:"
echo "  1. Verify edgecore service: systemctl status edgecore"
echo "  2. Check logs: journalctl -u edgecore -f"
echo "  3. Verify node registration on cloud side"
echo "=============================================="

rm -f /tmp/keadm.tar.gz
