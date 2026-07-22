#!/usr/bin/env python3
"""
Mock HTTP server to simulate Fapshi payment provider for local testing.

Usage:
  python scripts/mock_fapshi.py

Endpoints:
  POST /checkout  -> returns JSON with checkout_url and transaction.reference
  GET  /verify/{ref} -> returns JSON with transaction.status

This uses only the Python standard library.
"""
import json
from http.server import BaseHTTPRequestHandler, HTTPServer
from urllib.parse import urlparse


class Handler(BaseHTTPRequestHandler):
    def _send(self, code: int, data: dict):
        raw = json.dumps(data).encode("utf-8")
        self.send_response(code)
        self.send_header("Content-Type", "application/json")
        self.send_header("Content-Length", str(len(raw)))
        self.end_headers()
        self.wfile.write(raw)

    def do_POST(self):
        parsed = urlparse(self.path)
        if parsed.path.rstrip("/") not in ("/checkout", "/"):
            return self._send(404, {"error": "not found"})

        length = int(self.headers.get("Content-Length", 0))
        body = self.rfile.read(length).decode("utf-8") if length else ""
        try:
            payload = json.loads(body) if body else {}
        except Exception:
            payload = {}

        # Build a fake checkout URL and transaction
        reference = payload.get("reference") or f"mock-{int(__import__('time').time())}"
        checkout_url = f"http://localhost:9001/redirect/{reference}"

        resp = {
            "checkout_url": checkout_url,
            "transaction": {"reference": reference, "status": "pending"},
            "meta": {"received_payload": payload},
        }
        return self._send(200, resp)

    def do_GET(self):
        parsed = urlparse(self.path)
        parts = parsed.path.rstrip("/").split("/")
        # GET /verify/{ref}
        if len(parts) >= 3 and parts[-2] == "verify":
            ref = parts[-1]
            # Return completed for refs containing 'done', else pending
            status = "complete" if "done" in ref else "pending"
            resp = {"transaction": {"reference": ref, "status": status, "metadata": {}}}
            return self._send(200, resp)

        # redirect URL (simulate user payment page)
        if len(parts) >= 3 and parts[-2] == "redirect":
            ref = parts[-1]
            html = f"<html><body><h1>Fapshi Mock Checkout</h1><p>Reference: {ref}</p><p>Status: pending</p></body></html>"
            raw = html.encode("utf-8")
            self.send_response(200)
            self.send_header("Content-Type", "text/html; charset=utf-8")
            self.send_header("Content-Length", str(len(raw)))
            self.end_headers()
            self.wfile.write(raw)
            return

        return self._send(404, {"error": "not found"})


def run(port=9001):
    server = HTTPServer(("127.0.0.1", port), Handler)
    print(f"Mock Fapshi server running on http://127.0.0.1:{port}")
    try:
        server.serve_forever()
    except KeyboardInterrupt:
        print("Stopping mock server")
        server.server_close()


if __name__ == "__main__":
    run()
