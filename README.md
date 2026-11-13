# Salman 的个人作品小站

GitHub Pages：<https://zhongpeng.github.io/>

首页是轻量互动作品橱窗。桌面移到项目上或键盘聚焦时切换预览，点击项目直接进入；手机也可使用预览切换按钮。链接不依赖 JavaScript，无需先进入其他场景。首页不预先加载游戏引擎。

| 项目 | 发布入口 | 开发源码 |
|---|---|---|
| 潮汐之间 / Moment & Forever | `moment-forever/` | `_game-source/moment-forever/` |
| 木心美术馆 | `museum/` | 当前独立版本保留于 `museum/index.html` |
| 第八巷 | `street/` | `_app-source/midnight-street/` |
| 拍点 / Beat Pocket | `beat-pocket/` | `_app-source/beat-pocket/` |
| 禾页账本（网页体验） | `heye/` | `_app-source/heye-web/` |
| 有数 | `money-compass/` | `_app-source/money-compass/` |
| 鹈鹕骑行 | `pelican-cycle/` | `_app-source/pelican-cycle/` |

## 本地预览

在仓库根目录运行：

```sh
python3 -m http.server 5190 --bind 127.0.0.1
```

然后访问 <http://127.0.0.1:5190/>。请通过 HTTP 预览，直接双击 HTML 无法正确加载部分项目的模块、样式或根路径资源。

## 修改与构建

- 首页：`index.html` 与 `portal-assets/home.css`、`portal-assets/home.js`，无需构建。
- 第八巷：进入 `_app-source/midnight-street/`，运行 `npm ci && npm test && npm run build`。构建仅生成 `street/index.html` 与 `street-assets/`，不会覆盖作品首页。
- 拍点：进入 `_app-source/beat-pocket/`，运行 `npm ci && npm test && npm run build`。构建生成 `beat-pocket/`，资源路径相对于该目录，适用于 GitHub Pages。
- 禾页：进入 `_app-source/heye-web/`，运行 `npm test && npm run build`。基于独立网页原型，不含个人账目、不与小程序同步，静态版未接入行情服务。
- 入口回归检查：在根目录运行 `node --test scripts/routes.test.mjs`。

第八巷从旧的根入口迁移到 `/street/`。木心美术馆和拍点的首页链接返回作品目录；原项目路径继续保留。`portal-assets/*.png` 是各项目在本地浏览器中的实景封面。
