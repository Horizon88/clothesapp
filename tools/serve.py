#!/usr/bin/env python3
"""Preview the app locally.

    python3 tools/serve.py          # then open http://localhost:8000
    python3 tools/serve.py 9000     # another port

index.html is written for Claude Artifacts, which wrap the page in its own
<!doctype html><head><body> skeleton when published. This server adds the same
skeleton on the fly so the page renders the same way in a normal browser.

Outside Claude the app saves to the browser only, and the Stylist tab shows a
copy-paste brief instead of the live chat.
"""

import http.server
import os
import sys

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))

SKELETON_HEAD = (
    '<!doctype html><html><head><meta charset="utf-8">'
    '<meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover">'
    "<style>:root{color-scheme:light;padding-top:env(safe-area-inset-top);"
    "padding-bottom:env(safe-area-inset-bottom)}body{margin:0;font:14px system-ui}"
    "img{max-width:100%}[hidden]{display:none!important}</style></head><body>"
)
SKELETON_TAIL = "</body></html>"


class Handler(http.server.SimpleHTTPRequestHandler):
    def __init__(self, *args, **kwargs):
        super().__init__(*args, directory=ROOT, **kwargs)

    def do_GET(self):
        path = self.path.split("?", 1)[0].split("#", 1)[0]
        if path in ("/", "/index.html"):
            with open(os.path.join(ROOT, "index.html"), encoding="utf-8") as f:
                body = (SKELETON_HEAD + f.read() + SKELETON_TAIL).encode("utf-8")
            self.send_response(200)
            self.send_header("Content-Type", "text/html; charset=utf-8")
            self.send_header("Content-Length", str(len(body)))
            self.send_header("Cache-Control", "no-cache")
            self.end_headers()
            self.wfile.write(body)
            return
        super().do_GET()


def main():
    port = int(sys.argv[1]) if len(sys.argv) > 1 else 8000
    with http.server.ThreadingHTTPServer(("127.0.0.1", port), Handler) as httpd:
        print(f"Serving on http://localhost:{port}  (Ctrl+C to stop)")
        try:
            httpd.serve_forever()
        except KeyboardInterrupt:
            pass


if __name__ == "__main__":
    main()
