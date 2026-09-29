#!/usr/bin/env bash
# Renders /kit's exploded phone (packages/web/src/kit/architecture.tsx): the real
# shell, laid flat, one still per layer from one camera. Each is shot on black
# and on white so matte-layers.py can recover its alpha. Needs the root dev
# server (`bun run dev`) on :3000, agent-browser, and python3 with numpy + Pillow.
set -euo pipefail
cd "$(dirname "$0")/.."
OUT=$(mktemp -d)
AB() { agent-browser --session layers "$@"; }
AB set viewport 1400 1100 3 >/dev/null
AB open "http://localhost:3000/?debug&hud=0&app=Clock" >/dev/null
sleep 15 # SwiftShader boot and the Clock release
AB eval "$(cat scripts/capture-layers.js)" >/dev/null
shot() {
  AB eval "__cap.layer('$1')" >/dev/null
  sleep 1.2
  for bg in k:000 w:fff; do
    AB eval "__cap.bg('#${bg#*:}')" >/dev/null
    sleep 0.4
    AB screenshot "$OUT/$1-${bg%%:*}.png" >/dev/null
  done
}
shot app
AB eval "postMessage({app:''}, '*')" >/dev/null
sleep 3
for l in os shell window runtime sdk; do shot "$l"; done
AB close >/dev/null
python3 scripts/matte-layers.py "$OUT" packages/web/public/platform
