#!/bin/sh
# Pen has no save over MCP: bring it forward and press Cmd+S, then print the file size as proof.
osascript -e 'tell application "Pen" to activate' -e 'delay 0.3' -e 'tell application "System Events" to keystroke "s" using command down' >/dev/null
sleep 1.5
stat -f "saved %Sm %z bytes" "$(dirname "$0")/../design.pen"
