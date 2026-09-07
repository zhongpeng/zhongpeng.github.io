# Moment & Forever · 潮汐之间

一款约 8–12 分钟的浏览器探索小游戏。旅人从童年花园走向关系海岸和成年后的山丘；可以回头、跳过回忆、改变选择，随时在灯塔结束这次散步。

游戏本身不使用 ChatGPT、Codex 或其他 AI 接口，没有账号和付费依赖。所有运行资源随发布包提供；网页加载完成后，游戏过程不需要网络请求。音乐与环境声由本地 Web Audio 合成。

## 直接玩（无需安装 Node.js）

在 Mac 上，双击 **双击启动游戏.command**。它用电脑已有的 Python 3 在本机启动一个静态网页服务，并打开浏览器。终端窗口运行期间可持续游玩，按 Control+C 关闭服务。

`build/` 是已经打包好的游戏。不要直接双击其中的 HTML 文件；浏览器对 `file://` 的脚本加载有限制，需要上述本机网页服务或普通静态网站托管。

## 操作

- 电脑：W A S D / 方向键行走，或点击地面自动沿路前往；E 与附近回忆互动。
- 手机：左下角摇杆行走，或点地面移动。右下角有 Moment 和 Forever。
- Moment：按住空格或点按按钮，让微光与过往的身影浮现。
- Forever：在每段回忆中选一句此刻愿意留下的话，再把它安放为路灯或随身星光。
- 地图可引导旅人前往指定物件；记忆册可重读、改选。
- 暂停菜单可以降低动效、休息、或提前结束。灯塔从开始就开放，没有必须完成的收集数。
- 每个选项有单独的回应。结尾逐一引用这次实际选择，再按选择过的需要提供可选提示。没有心理评分、人格标签或标准结局。
- 当前游戏进度仅存在这次网页会话中，刷新会重新开始；不会把选择上传到服务器。

## 修改源码

要求 Node.js 22.13 或更高版本；使用项目的 npm 锁文件。

```sh
npm ci
npm run dev
```

默认开发页面地址以终端打印的信息为准。独立版本的开发与发布不需要任何 OpenAI 凭证。

关键文件：

- `app/page.tsx`：游戏界面、手机操作、回忆对话、结束内容。
- `app/globals.css`：字体、配色、响应式布局。
- `lib/world.ts`：三维世界、小人动作、成长、树木、海浪、微光。
- `lib/island.ts`：位置、地形、碰撞和寻路。
- `lib/journey.ts`：9 段回忆、27 个具体选项及回应、结尾组合。
- `lib/sound.ts`：原创程序化海浪和环境琴音。

## 生成独立发布包

```sh
npm run build:portable
```

产物在 `build/`。它是纯静态 HTML/CSS/JavaScript，使用相对资源路径，可发布到 GitHub Pages 子目录、普通 Nginx、对象存储或其他静态托管。无需 Node.js 服务器、ChatGPT 登录、数据库或 API key。代码里提供的参考资料链接只会在主动点击后访问外部网站，不影响游戏运行。

目标入口：

- Sites：<https://moment-forever-shore.zhongpeng1390.chatgpt.site/>
- GitHub Pages：<https://zhongpeng.github.io/moment-forever/>

GitHub Pages 的发布内容仅放入既有 `zhongpeng.github.io` 仓库的 `moment-forever/` 子目录，不替换个人首页。大陆网络的访问体验取决于托管域名及用户网络，不承诺所有运营商都可稳定访问；同一个 `build/` 可迁移到用户可达的国内静态托管。

## 内容依据与边界

本游戏借鉴接纳、自我关怀、价值选择和回到当下的思路，用来支持自我反思；不是心理测评，也没有经过临床验证，不用于诊断或治疗。每段记忆明确为虚构旅人的故事，玩家可以不认同、不回答、记不清、没有特别感受。

参考资料：

- WHO《Doing What Matters in Times of Stress》：https://www.who.int/publications/i/item/9789240003927
- Kristin Neff，自我关怀：https://self-compassion.org/what-is-self-compassion/
- NHS，悲伤与失去：https://www.nhs.uk/mental-health/feelings-symptoms-behaviours/feelings-and-symptoms/grief-bereavement-loss/
- SAMHSA，自主选择与创伤知情原则：https://www.samhsa.gov/mental-health/trauma-violence/trauma-informed-approaches-programs

## 可继续开发的方向

当前版本已经包含完整的行走、回忆与分支结尾。后续可以替换角色模型、加入更多人生片段、设计更多真实路径分支。优先保持短篇节奏与玩家的自主权，不把“放下、原谅、积极”做成通关要求。
