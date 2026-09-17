#!/usr/bin/env python3
"""Send Python to the running Blender via the MCP add-on's bridge socket.

    python3 blender/bridge.py blender/iphone_duo.py
    python3 blender/bridge.py -c 'result = {"objs": len(bpy.data.objects)}'

The add-on speaks NUL-terminated JSON on 127.0.0.1:9876. Files are sent as a
`exec(open(path).read())` shim so tracebacks keep real line numbers.
"""
import json
import os
import socket
import sys

HOST, PORT = "127.0.0.1", 9876


def send(code: str, timeout: float = 600.0) -> dict:
    with socket.create_connection((HOST, PORT), timeout=timeout) as s:
        s.sendall((json.dumps({"type": "execute", "code": code, "strict_json": False}) + "\0").encode())
        buf = bytearray()
        while not buf.endswith(b"\0"):
            chunk = s.recv(65536)
            if not chunk:
                raise ConnectionError("bridge closed before responding")
            buf += chunk
    return json.loads(buf[:-1].decode())


if __name__ == "__main__":
    a = sys.argv[1:]
    if a[:1] == ["-c"]:
        code = "import bpy\n" + a[1]
    else:
        # compile() with the real filename so tracebacks point at the source.
        code = (
            "import bpy\n"
            f"_p = __file__ = {os.path.abspath(a[0])!r}\n"
            "exec(compile(open(_p).read(), _p, 'exec'), globals())\n"
        )
    r = send(code)
    for k in ("stdout", "stderr"):
        if r.get(k):
            print(r[k], end="", file=sys.stderr if k == "stderr" else sys.stdout)
    if r.get("status") == "error":
        print(r["message"], file=sys.stderr)
        sys.exit(1)
    print(json.dumps(r.get("result", {}), indent=2)[:4000])
