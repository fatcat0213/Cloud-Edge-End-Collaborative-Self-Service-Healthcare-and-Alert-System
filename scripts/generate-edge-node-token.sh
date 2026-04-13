#!/bin/bash
# generate-edge-node-token.sh
# Generates edge node join token for KubeEdge cluster

set -e

NAMESPACE="kubeedge"
SERVICE_ACCOUNT="edge-node-sa"
SECRET_NAME=$(kubectl get sa "${SERVICE_ACCOUNT}" -n "${NAMESPACE}" -o jsonpath='{.secrets[0].name}')
TOKEN_SECRET=$(kubectl get secret "${SECRET_NAME}" -n "${NAMESPACE}" -o jsonpath='{.data.token}')
CA_CERT=$(kubectl get secret "${SECRET_NAME}" -n "${NAMESPACE}" -o jsonpath='{.data.ca\.crt}')

echo "=============================================="
echo "  KubeEdge Edge Node Join Token Generator"
echo "=============================================="
echo ""
echo "TOKEN=${TOKEN_SECRET}"
echo ""
echo "CA_CERT=${CA_CERT}"
echo ""
echo "=============================================="
echo "  CloudCore IP Configuration"
echo "=============================================="
echo "Hint: Set CLOUDCORE_IPPORT to your CloudCore"
echo "      service IP:10000 (default KubeEdge port)"
echo ""
echo "Usage in edgecore-install.sh:"
echo "  CLOUDCORE_IPPORT=<CLOUDCORE_IP>:10000"
echo "=============================================="
