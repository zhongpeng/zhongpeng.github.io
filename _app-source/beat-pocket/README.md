# 拍点 / Beat Pocket

电脑与手机均可操作的节奏小游戏。通过点击、触屏或空格跟随鼓点，连续命中增加得分倍率。包含两种节奏、暂停、最佳纪录、音量与校准。

```sh
npm ci
npm test
npm run build
```

发布文件生成于仓库根目录 `beat-pocket/`。不要直接用 file:// 打开源码；在根目录启动静态服务后访问 `/beat-pocket/`，或用 `npm run dev` 开发。

鼓点通过本地 Web Audio 合成，开始游戏或测试声音需要主动点击。Phaser 固定为 3.90.0。外部通话期间的实际可听性未独立确认。
