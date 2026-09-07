'use client';
import { useCallback, useEffect, useRef, useState } from 'react';
import {
  ArrowRight,
  ArrowUpRight,
  Volume2,
  VolumeX,
  BookOpen,
  Map,
  Pause,
  Play,
  Eye,
  Sparkles,
  Sun,
  X,
  Flame,
  Star,
  Flower2,
  Heart,
  Mountain,
  RotateCcw,
  Check,
  Info,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogTitle,
  DialogDescription,
  DialogClose,
} from '@/components/ui/dialog';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Switch } from '@/components/ui/switch';
import { WorldCanvas } from '@/components/game/world-canvas';
import { Joystick } from '@/components/game/joystick';
import { START, LIGHTHOUSE, REGION_NAMES, type Point } from '@/lib/island';
import {
  memories,
  chooseAnswer,
  composeEnding,
  resolveAnswer,
  type Answer,
} from '@/lib/journey';
import { ShoreSound } from '@/lib/sound';
import type { IslandWorld, WorldStatus } from '@/lib/world';
const chapters = [
  '童年 · 世界还很大',
  '年少 · 后来有了我们',
  '成年 · 走自己的路',
];
const chapterEnglish = [
  'THE CHILD I WAS',
  'THE PEOPLE WE MET',
  'THE PERSON I BECOME',
];
const emptyStatus: WorldStatus = {
  position: START,
  nearest: null,
  region: 0,
  age: 0,
  moving: false,
  destination: false,
};
type Panel = 'map' | 'book' | 'rest' | 'ending' | 'about' | null;
export default function Home() {
  const world = useRef<IslandWorld | null>(null),
    sound = useRef<ShoreSound | null>(null),
    canvasFocus = useRef<HTMLDivElement>(null);
  const [ready, setReady] = useState(false),
    [failed, setFailed] = useState(false),
    [started, setStarted] = useState(false);
  const [status, setStatus] = useState(emptyStatus),
    [moment, setMoment] = useState(false),
    [reduced, setReduced] = useState(false),
    [soundOn, setSoundOn] = useState(false);
  const [answers, setAnswers] = useState<Answer[]>([]),
    [panel, setPanel] = useState<Panel>(null),
    [activeId, setActiveId] = useState<string | null>(null),
    [revealed, setRevealed] = useState(false),
    [selected, setSelected] = useState<number | null>(null),
    [reflection, setReflection] = useState<Answer | null>(null),
    [notice, setNotice] = useState('');
  const nearest = memories.find((m) => m.id === status.nearest),
    active = memories.find((m) => m.id === activeId),
    ending = composeEnding(answers);
  const blocked = !!panel || !!activeId || !!reflection;
  const onReady = useCallback((instance: IslandWorld | null) => {
    world.current = instance;
    setReady(!!instance);
  }, []);
  const onError = useCallback(() => setFailed(true), []);
  const onInteract = useCallback(
    (id: string) => {
      if (id === 'lighthouse') {
        setPanel('ending');
        return;
      }
      setActiveId(id);
      setRevealed(false);
      setSelected(null);
      setMoment(true);
    },
    [setPanel, setActiveId, setRevealed, setSelected, setMoment],
  );
  const onMove = useCallback((p: Point) => world.current?.move(p), []);
  useEffect(() => {
    world.current?.configure({
      paused: blocked,
      moment,
      reduced,
      overview: !started,
      answers,
    });
  }, [ready, blocked, moment, reduced, started, answers]);
  useEffect(() => {
    const query = matchMedia('(prefers-reduced-motion: reduce)');
    const apply = () => setReduced(query.matches);
    const timer = setTimeout(apply, 0);
    query.addEventListener('change', apply);
    return () => {
      clearTimeout(timer);
      query.removeEventListener('change', apply);
    };
  }, []);
  useEffect(() => {
    sound.current?.remembering(moment || !!activeId);
  }, [moment, activeId]);
  useEffect(() => () => sound.current?.dispose(), []);
  useEffect(() => {
    const visibility = () => {
      if (document.hidden) {
        world.current?.move({ x: 0, z: 0 });
        void sound.current?.enabled(false);
      } else if (soundOn)
        void sound.current?.enabled(true).catch(() => setSoundOn(false));
    };
    document.addEventListener('visibilitychange', visibility);
    return () => document.removeEventListener('visibilitychange', visibility);
  }, [soundOn]);
  useEffect(() => {
    const down = (e: KeyboardEvent) => {
      if (
        e.key === ' ' &&
        !blocked &&
        started &&
        !(e.target as HTMLElement).closest('button,input,textarea')
      ) {
        e.preventDefault();
        setMoment(true);
      }
      if (e.key === 'Escape' && !blocked && started) {
        setMoment(false);
        setPanel('rest');
      }
    };
    const up = (e: KeyboardEvent) => {
      if (e.key === ' ' && !blocked) setMoment(false);
    };
    const blur = () => setMoment(false);
    window.addEventListener('keydown', down);
    window.addEventListener('keyup', up);
    window.addEventListener('blur', blur);
    return () => {
      window.removeEventListener('keydown', down);
      window.removeEventListener('keyup', up);
      window.removeEventListener('blur', blur);
    };
  }, [blocked, started]);
  function focusWorld() {
    requestAnimationFrame(() =>
      canvasFocus.current
        ?.querySelector('canvas')
        ?.focus({ preventScroll: true }),
    );
  }
  function start() {
    setStarted(true);
    setMoment(false);
    focusWorld();
  }
  function closeMemory() {
    setActiveId(null);
    setReflection(null);
    setMoment(false);
    focusWorld();
  }
  function readMemory() {
    setRevealed(true);
    sound.current?.chime(active?.region ?? 0);
  }
  function decide(form: 'lantern' | 'star') {
    if (!active || selected === null) return;
    const answer: Answer = { id: active.id, choice: selected, form };
    setAnswers((previous) => chooseAnswer(previous, answer));
    setReflection(answer);
    setActiveId(null);
    setMoment(false);
    sound.current?.chime(active.region);
  }
  async function toggleSound() {
    try {
      if (!sound.current) sound.current = new ShoreSound();
      await sound.current.enabled(!soundOn);
      setSoundOn(!soundOn);
    } catch {
      setNotice('声音暂时无法开启。你仍然可以安静地走完这段旅程。');
    }
  }
  function travel(p: Point) {
    setPanel(null);
    setStarted(true);
    setMoment(false);
    setTimeout(() => {
      world.current?.configure({
        paused: false,
        moment: false,
        reduced,
        overview: false,
        answers,
      });
      world.current?.travelTo(p);
      focusWorld();
    }, 40);
  }
  function restart() {
    setAnswers([]);
    setPanel(null);
    setMoment(false);
    setActiveId(null);
    setReflection(null);
    setStatus(emptyStatus);
    world.current?.reset();
    focusWorld();
  }
  const resolvedReflection = reflection ? resolveAnswer(reflection) : null;
  return (
    <main
      className={`island-game ${started ? 'is-playing' : 'is-arriving'} ${moment ? 'is-moment' : ''} ${reduced ? 'reduced' : ''}`}
    >
      <div className="world-container" ref={canvasFocus}>
        <WorldCanvas
          onReady={onReady}
          onError={onError}
          onStatus={setStatus}
          onInteract={onInteract}
        />
      </div>
      <div className="world-vignette" aria-hidden="true" />
      <header className="game-header">
        <button
          className="brand"
          onClick={() => setPanel('about')}
          aria-label="关于 Moment and Forever"
        >
          <span>
            M<span className="brand-amp">&</span>F
          </span>
          <small>潮汐之间</small>
        </button>
        {started && (
          <div className="chapter-indicator">
            <span className="chapter-line" />
            {chapters[status.age]}
          </div>
        )}
        <div className="header-actions">
          <Button
            className="icon-button"
            variant="ghost"
            onClick={toggleSound}
            aria-label={soundOn ? '关闭海浪和音乐' : '开启海浪和音乐'}
            title={soundOn ? '关闭声音' : '开启声音'}
            aria-pressed={soundOn}
          >
            {soundOn ? <Volume2 /> : <VolumeX />}
          </Button>
          {started && (
            <>
              <Button
                className="icon-button"
                variant="ghost"
                onClick={() => setPanel('map')}
                aria-label="打开小岛地图"
                title="小岛地图"
              >
                <Map />
              </Button>
              <Button
                className="icon-button"
                variant="ghost"
                onClick={() => setPanel('rest')}
                aria-label="暂停，歇一会儿"
                title="歇一会儿"
              >
                <Pause />
              </Button>
            </>
          )}
        </div>
      </header>
      {notice && (
        <output className="notice">
          {notice}
          <button aria-label="关闭提示" onClick={() => setNotice('')}>
            <X size={16} />
          </button>
        </output>
      )}
      {!started && (
        <section className="arrival-screen">
          <p className="overline">A SMALL LIFE · 一段小小的人生</p>
          <h1>
            Moment
            <span>
              <em>&</em> Forever
            </span>
          </h1>
          <div className="arrival-poem">
            <i />
            <p>
              人生有许多岔路。
              <br />
              走哪一条，始终是你的选择。
            </p>
          </div>
          <Button
            className="begin-button"
            onClick={start}
            disabled={!ready && !failed}
          >
            {ready || failed ? '从小时候出发' : '海风正在赶来'}
            <ArrowRight />
          </Button>
          <p className="arrival-note">约 8–12 分钟 · 可以回头，也可以停留</p>
          <div className="arrival-chapters">
            <span>01 童年</span>
            <i />
            <span>02 相遇</span>
            <i />
            <span>03 后来</span>
          </div>
        </section>
      )}
      {failed && started && (
        <aside className="fallback-message">
          <p>这台设备暂时无法显示立体小岛。你仍可以从地图走进每段回忆。</p>
          <Button className="soft-button" onClick={() => setPanel('map')}>
            打开回忆地图
            <Map size={16} />
          </Button>
        </aside>
      )}
      {started && !blocked && (
        <>
          <div className="place-caption">
            <span className="overline">{chapterEnglish[status.region]}</span>
            <h2>{REGION_NAMES[status.region]}</h2>
            <p>
              {moment
                ? '此刻，让过去靠近一点。'
                : status.age === 0
                  ? '你还是那个，会为一颗玻璃珠停下的孩子。'
                  : status.age === 1
                    ? '有些路，从两个人走成了一个人。'
                    : '后来，你开始听见自己的声音。'}
            </p>
          </div>
          <div className="journey-side">
            <span className="vertical-words">
              {moment ? 'M O M E N T' : 'F O R E V E R'}
            </span>
            <span className="ambient-status">
              {moment ? '往事浮现' : status.moving ? '正在行走' : '风也在这里'}
            </span>
          </div>
          {status.nearest && (
            <div className="nearby-card" key={status.nearest}>
              <div>
                <span className="overline">
                  {status.nearest === 'lighthouse'
                    ? 'AT YOUR OWN PACE'
                    : 'A MOMENT IS HERE'}
                </span>
                <h3>{nearest?.title ?? '灯塔下，写给此刻的你'}</h3>
              </div>
              <Button
                className="interact-button"
                onClick={() => onInteract(status.nearest!)}
              >
                {status.nearest === 'lighthouse'
                  ? '坐下，看看来时的路'
                  : '靠近这一刻'}
                <span className="desktop-key">E</span>
                <ArrowRight size={16} />
              </Button>
              {nearest && answers.some((a) => a.id === nearest.id) && (
                <small>可以重读，也可以重新选择。</small>
              )}
            </div>
          )}
          {!status.nearest && (
            <div className="travel-hint">
              <span className="hint-dot" />
              {status.destination
                ? '正沿着小路走去，方向键或摇杆可随时改变路线。'
                : moment
                  ? '靠近微光，遇见藏在物件里的回忆。'
                  : '点击地面走过去，或用方向键 / W A S D 自由行走。'}
            </div>
          )}
          <div className="game-controls">
            <Joystick onMove={onMove} />
            <div className="keyboard-hint">
              <span>W A S D</span>
              <small>自由行走 · 点击地面也可以</small>
            </div>
            <div className="memory-controls">
              <Button
                className={`moment-control ${moment ? 'active' : ''}`}
                onClick={() => {
                  setMoment(!moment);
                  focusWorld();
                }}
                aria-pressed={moment}
              >
                <Eye size={18} />
                <span>
                  Moment<small>{moment ? '回到此刻' : '看见回忆'}</small>
                </span>
              </Button>
              <span className="control-separator" />
              <Button
                className="forever-control"
                onClick={() => setPanel('book')}
              >
                <BookOpen size={18} />
                <span>
                  Forever
                  <small>{answers.length ? '你留下的片刻' : '记忆册'}</small>
                </span>
              </Button>
            </div>
          </div>
          <footer className="play-footer">
            <span>
              {answers.length
                ? `你为 ${answers.length} 个片刻留下了位置。`
                : '不必收集全部回忆，也能走向灯塔。'}
            </span>
            <button onClick={() => setPanel('map')}>
              看看岔路
              <ArrowUpRight size={13} />
            </button>
          </footer>
        </>
      )}
      <Dialog
        open={!!active}
        onOpenChange={(open) => {
          if (!open) closeMemory();
        }}
      >
        <DialogContent className="story-dialog" showCloseButton={false}>
          <DialogClose className="dialog-x" aria-label="暂时离开这段回忆">
            <X size={20} />
          </DialogClose>
          {active && (
            <>
              <span className="overline">
                {REGION_NAMES[active.region]} · 一个片刻
              </span>
              <DialogTitle className="story-title">{active.title}</DialogTitle>
              <DialogDescription className="story-description">
                这些是旅人的故事。与你有关的部分，可以由你自己留下。
              </DialogDescription>
              {!revealed ? (
                <div className="unopened-memory">
                  <span className="large-moment">Moment</span>
                  <p>有些瞬间，值得慢一点靠近。</p>
                  <Button className="gold-button" onClick={readMemory}>
                    让这一刻浮现
                    <Sparkles size={17} />
                  </Button>
                  <Button
                    className="quiet-button"
                    variant="ghost"
                    onClick={closeMemory}
                  >
                    今天先不走进去
                  </Button>
                </div>
              ) : (
                <>
                  <div className="remembered-story">
                    <span>Moment</span>
                    <p>{active.story}</p>
                  </div>
                  <p className="memory-question" id="memory-question">
                    {active.question}
                  </p>
                  <RadioGroup
                    value={selected === null ? '' : String(selected)}
                    onValueChange={(value) => setSelected(Number(value))}
                    aria-labelledby="memory-question"
                    className="response-choices"
                  >
                    {active.choices.map((choice, index) => (
                      <label
                        className={`response-option ${selected === index ? 'selected' : ''}`}
                        key={choice.text}
                      >
                        <RadioGroupItem value={String(index)} />
                        <span>{choice.text}</span>
                      </label>
                    ))}
                  </RadioGroup>
                  {selected !== null ? (
                    <div className="forever-decision">
                      <span className="forever-word">Forever</span>
                      <p>把这个选择，安放成什么模样？</p>
                      <div className="form-choices">
                        <Button
                          className="soft-button"
                          onClick={() => decide('lantern')}
                        >
                          <Flame size={18} />
                          <span>
                            一盏路边的灯<small>让这个片刻留在这里</small>
                          </span>
                        </Button>
                        <Button
                          className="soft-button"
                          onClick={() => decide('star')}
                        >
                          <Star size={18} />
                          <span>
                            一颗随身的星<small>带着它继续向前</small>
                          </span>
                        </Button>
                      </div>
                    </div>
                  ) : (
                    <p className="choice-note">
                      没有标准答案。也可以记不清、没有特别的感觉。
                    </p>
                  )}
                  <Button
                    className="quiet-button"
                    variant="ghost"
                    onClick={closeMemory}
                  >
                    现在还不知道，先走走
                  </Button>
                </>
              )}
            </>
          )}
        </DialogContent>
      </Dialog>
      <Dialog
        open={!!reflection}
        onOpenChange={(open) => {
          if (!open) closeMemory();
        }}
      >
        <DialogContent className="reflection-dialog" showCloseButton={false}>
          {resolvedReflection && (
            <>
              <span className="overline">THIS MOMENT, YOUR CHOICE</span>
              <div className="reflection-symbol">
                {reflection?.form === 'star' ? (
                  <Star size={38} strokeWidth={1} />
                ) : (
                  <Flame size={38} strokeWidth={1} />
                )}
              </div>
              <DialogTitle className="reflection-title">
                {resolvedReflection.choice.text}
              </DialogTitle>
              <DialogDescription className="reflection-copy">
                {resolvedReflection.choice.reply}
              </DialogDescription>
              <p className="reflection-placement">
                {reflection?.form === 'star'
                  ? '这颗星会跟着你，走过接下来的路。'
                  : '这里会亮起一盏灯。你可以随时回来看看。'}
              </p>
              <Button className="gold-button" onClick={closeMemory}>
                带着这一刻，继续走
                <ArrowRight size={17} />
              </Button>
            </>
          )}
        </DialogContent>
      </Dialog>
      <Dialog
        open={panel === 'map'}
        onOpenChange={(open) => {
          if (!open) setPanel(null);
        }}
      >
        <DialogContent className="map-dialog" showCloseButton={false}>
          <DialogClose className="dialog-x" aria-label="收起地图">
            <X size={20} />
          </DialogClose>
          <span className="overline">MANY PATHS, YOUR LIFE</span>
          <DialogTitle className="panel-title">小岛上的岔路</DialogTitle>
          <DialogDescription>
            选择一个地方，小人会沿路走过去。每段人生都可以回头看看。
          </DialogDescription>
          <div className="island-map">
            <svg
              viewBox="0 0 600 400"

              aria-label="小岛路线图，包含童年花园、关系海岸和成长山丘"
            >
              <ellipse cx="300" cy="200" rx="275" ry="177" fill="#d8d6b9" />
              <path
                d="M130 290 Q90 140 180 130 T330 210 T490 80 M130 230 Q280 340 350 290 T435 185 M330 210 Q350 100 430 90"
                fill="none"
                stroke="#f7efe0"
                strokeWidth="15"
                strokeLinecap="round"
              />
              {memories.map((m) => (
                <g key={m.id}>
                  <circle
                    cx={300 + m.position.x * 8.6}
                    cy={200 + m.position.z * 7.5}
                    r="8"
                    fill={
                      answers.some((a) => a.id === m.id) ? '#bc8862' : '#78958d'
                    }
                  />
                </g>
              ))}
              <circle
                cx={300 + status.position.x * 8.6}
                cy={200 + status.position.z * 7.5}
                r="7"
                fill="#304e50"
                stroke="#fff"
                strokeWidth="3"
              />
              <text x="90" y="90">
                童年
              </text>
              <text x="270" y="360">
                相遇
              </text>
              <text x="453" y="60">
                后来
              </text>
            </svg>
            <span className="map-you">深色圆点是你</span>
          </div>
          <div className="map-regions">
            {REGION_NAMES.map((name, r) => (
              <section key={name}>
                <h3>
                  {r === 0 ? (
                    <Flower2 size={16} />
                  ) : r === 1 ? (
                    <Heart size={16} />
                  ) : (
                    <Mountain size={16} />
                  )}{' '}
                  {name}
                </h3>
                {memories
                  .filter((m) => m.region === r)
                  .map((m) => (
                    <button
                      key={m.id}
                      onClick={() =>
                        failed
                          ? (setPanel(null), onInteract(m.id))
                          : travel(m.position)
                      }
                    >
                      <span>{m.title}</span>
                      {answers.some((a) => a.id === m.id) ? (
                        <Check size={14} />
                      ) : (
                        <ArrowUpRight size={14} />
                      )}
                    </button>
                  ))}
              </section>
            ))}
          </div>
          <Button
            className="soft-button lighthouse-link"
            onClick={() =>
              failed
                ? setPanel('ending')
                : travel({ x: LIGHTHOUSE.x - 1.5, z: LIGHTHOUSE.z + 1.8 })
            }
          >
            <Sun size={18} />
            向灯塔走去<span>随时都可以</span>
            <ArrowRight size={16} />
          </Button>
        </DialogContent>
      </Dialog>
      <Dialog
        open={panel === 'book'}
        onOpenChange={(open) => {
          if (!open) setPanel(null);
        }}
      >
        <DialogContent className="book-dialog" showCloseButton={false}>
          <DialogClose className="dialog-x" aria-label="收起记忆册">
            <X size={20} />
          </DialogClose>
          <span className="overline">THE MOMENTS WE CARRY</span>
          <DialogTitle className="book-title">Forever</DialogTitle>
          <DialogDescription>
            永远，也可以是你为一个瞬间留下的位置。
          </DialogDescription>
          {answers.length ? (
            <div className="book-pages">
              {answers.map((answer) => {
                const r = resolveAnswer(answer)!;
                return (
                  <button
                    className="book-memory"
                    key={answer.id}
                    onClick={() => {
                      setPanel(null);
                      onInteract(answer.id);
                    }}
                  >
                    <span className="book-symbol">
                      {answer.form === 'star' ? (
                        <Star size={19} />
                      ) : (
                        <Flame size={19} />
                      )}
                    </span>
                    <span>
                      <strong>{r.memory.title}</strong>
                      <span>{r.choice.text}</span>
                      <small>
                        {answer.form === 'star' ? '在身边闪光' : '在来路亮着'} ·
                        可以重新选择
                      </small>
                    </span>
                    <ArrowUpRight size={16} />
                  </button>
                );
              })}
            </div>
          ) : (
            <div className="book-empty">
              <BookOpen size={32} strokeWidth={1} />
              <p>
                这里还空着。
                <br />
                空着也很好，先去走走。
              </p>
            </div>
          )}
          <p className="choice-note">
            本次选择留在这次旅程里，不上传、不生成心理评分。
          </p>
          <Button className="quiet-button" onClick={() => setPanel(null)}>
            回到小岛
            <ArrowRight size={16} />
          </Button>
        </DialogContent>
      </Dialog>
      <Dialog
        open={panel === 'rest'}
        onOpenChange={(open) => {
          if (!open) setPanel(null);
        }}
      >
        <DialogContent className="rest-dialog" showCloseButton={false}>
          <DialogClose className="dialog-x" aria-label="继续游戏">
            <X size={20} />
          </DialogClose>
          <span className="overline">A MOMENT, JUST FOR YOU</span>
          <DialogTitle className="panel-title">在这里，歇一会儿。</DialogTitle>
          <DialogDescription>
            手可以松开。看看眼前的颜色，听听周围的声音。什么时候继续，由你决定。
          </DialogDescription>
          <div className="rest-orbit" aria-hidden="true">
            <i />
          </div>
          <label className="setting-line" htmlFor="gentle-motion">
            <span>
              更轻的动效<small>减少海浪、树梢和镜头的移动</small>
            </span>
            <Switch
              id="gentle-motion"
              checked={reduced}
              onCheckedChange={setReduced}
              aria-label="更轻的动效"
            />
          </label>
          <Button
            className="gold-button"
            onClick={() => {
              setPanel(null);
              focusWorld();
            }}
          >
            <Play size={16} />
            继续我的路
          </Button>
          <Button className="quiet-button" onClick={() => setPanel('ending')}>
            今天走到这里，看看来时的路
          </Button>
          <Button className="quiet-button" onClick={() => setPanel('about')}>
            <Info size={15} />
            关于这段旅程
          </Button>
        </DialogContent>
      </Dialog>
      <Dialog
        open={panel === 'ending'}
        onOpenChange={(open) => {
          if (!open) setPanel(null);
        }}
      >
        <DialogContent className="ending-dialog" showCloseButton={false}>
          <DialogClose className="dialog-x" aria-label="回到小岛">
            <X size={20} />
          </DialogClose>
          <span className="overline">YOUR MOMENTS. YOUR FOREVER.</span>
          <DialogTitle className="ending-heading">
            一路走来，
            <br />
            都是你的人生。
          </DialogTitle>
          <DialogDescription className="ending-opening">
            Moment，是你曾经真实活过。
            <br />
            Forever，是你选择怎样与它继续生活。
          </DialogDescription>
          <div className="ending-constellation" aria-hidden="true">
            {answers.length ? (
              answers.map((a) =>
                a.form === 'star' ? (
                  <Star key={a.id} size={22} strokeWidth={1} />
                ) : (
                  <Flame key={a.id} size={22} strokeWidth={1} />
                ),
              )
            ) : (
              <Sun size={30} strokeWidth={1} />
            )}
          </div>
          <p className="ending-landscape">{ending.landscape}</p>
          <div className="ending-chapters">
            {ending.chapters.map((chapter) => (
              <section key={chapter.id}>
                <span>{chapter.title}</span>
                <h3>{chapter.line}</h3>
                <p>{chapter.reply}</p>
                <small>{chapter.placement}</small>
              </section>
            ))}
          </div>
          {ending.hints.length > 0 && (
            <div className="gentle-invitations">
              <h3>如果愿意，给今天留一点温柔</h3>
              <p>
                这些邀请只回应你这次选过的话。你可以挑一件，也可以一件都不做。
              </p>
              {ending.hints.map((hint) => (
                <details key={hint.label}>
                  <summary>
                    {hint.title}
                    <span>＋</span>
                  </summary>
                  <p>{hint.hint}</p>
                </details>
              ))}
            </div>
          )}
          <p className="ending-last">
            有些遗憾，今天还在。
            <br />
            而你，也已经走到了这里。
            <br />
            <strong>接下来，想往哪里去？</strong>
          </p>
          <div className="ending-actions">
            <Button
              className="gold-button"
              onClick={() => {
                setPanel(null);
                focusWorld();
              }}
            >
              继续在岛上走走
              <ArrowRight size={17} />
            </Button>
            <Button className="quiet-button" onClick={restart}>
              <RotateCcw size={15} />
              开启另一段人生
            </Button>
          </div>
          <p className="ending-footnote">
            没有结局分数，也没有“正确的人生”。改变选择，回应和沿途的光都会随之改变。
          </p>
        </DialogContent>
      </Dialog>
      <Dialog
        open={panel === 'about'}
        onOpenChange={(open) => {
          if (!open) setPanel(null);
        }}
      >
        <DialogContent className="about-dialog" showCloseButton={false}>
          <DialogClose className="dialog-x" aria-label="关闭说明">
            <X size={20} />
          </DialogClose>
          <span className="overline">MOMENT & FOREVER</span>
          <DialogTitle className="panel-title">
            不必急着和过去和解。
          </DialogTitle>
          <DialogDescription>
            这是一段虚构旅人的人生，你可以只留下与你有关的片刻。没有倒计时，没有必须原谅或放下的人，也不需要证明自己已经好起来。
          </DialogDescription>
          <dl className="how-to">
            <div>
              <dt>行走</dt>
              <dd>方向键 / W A S D，点击地面，或使用手机左下角摇杆。</dd>
            </div>
            <div>
              <dt>Moment</dt>
              <dd>
                按住空格，或点按 Moment。靠近微光后按 E 或点按“靠近这一刻”。
              </dd>
            </div>
            <div>
              <dt>Forever</dt>
              <dd>
                让片刻成为留在原处的灯，或陪伴你的星。记忆册里可以重新选择。
              </dd>
            </div>
            <div>
              <dt>抵达</dt>
              <dd>随时前往灯塔，或从暂停菜单结束散步。不需要收集全部回忆。</dd>
            </div>
          </dl>
          <p className="choice-note">
            这是自我反思游戏，不是心理测评或治疗。题目参考接纳、回到当下和自我关怀的思路；不会推断你的性格或经历。
          </p>
          <div className="source-links">
            <a
              href="https://www.who.int/publications/i/item/9789240003927"
              target="_blank"
              rel="noreferrer"
            >
              WHO · 应对压力指南
              <ArrowUpRight size={13} />
            </a>
            <a
              href="https://self-compassion.org/what-is-self-compassion/"
              target="_blank"
              rel="noreferrer"
            >
              Kristin Neff · 自我关怀
              <ArrowUpRight size={13} />
            </a>
          </div>
          <Button className="gold-button" onClick={() => setPanel(null)}>
            回到此刻
            <ArrowRight size={17} />
          </Button>
        </DialogContent>
      </Dialog>
    </main>
  );
}
