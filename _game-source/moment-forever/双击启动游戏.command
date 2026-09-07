#!/bin/zsh
set -e
GAME_DIR="$(cd -- "$(dirname -- "$0")" && pwd)"
python3 - "$GAME_DIR/build" <<'PY'
import functools,http.server,pathlib,sys,threading,webbrowser
root=pathlib.Path(sys.argv[1])
if not (root/'index.html').exists():
    raise SystemExit('找不到可玩版本。请先运行 npm run build:portable。')
handler=functools.partial(http.server.SimpleHTTPRequestHandler,directory=str(root))
with http.server.ThreadingHTTPServer(('127.0.0.1',0),handler) as server:
    url=f'http://127.0.0.1:{server.server_port}/'
    print('\nMoment & Forever · 潮汐之间\n'+url+'\n保持此窗口开启，按 Control+C 结束。\n',flush=True)
    threading.Timer(.4,lambda:webbrowser.open(url)).start()
    try: server.serve_forever()
    except KeyboardInterrupt: pass
PY
