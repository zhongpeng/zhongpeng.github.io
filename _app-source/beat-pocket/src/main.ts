import Phaser from 'phaser';
import './style.css';
import { AudioEngine } from './audio/AudioEngine.ts';
import { gameState as state, type Grade } from './core/GameState.ts';
import { EventBus,Events } from './core/EventBus.ts';
import { TIMING, MODES, type Mode } from './core/Constants.ts';
import { RhythmScene } from './scenes/RhythmScene.ts';

const $=<T extends HTMLElement>(id:string)=>document.getElementById(id) as T;
const audio=new AudioEngine();let origin=0,frozen=0,scheduledUntil=0,offset=0,busy=false,lastFeedback=0,finishedStored=false;
let bests:Record<string,number>={};try{bests=JSON.parse(localStorage.getItem('beat-pocket-best')||'{}');}catch{}
const difficulty=$<HTMLSelectElement>('difficulty');const tap=$<HTMLButtonElement>('tap');const pause=$<HTMLButtonElement>('pause');const overlay=$('overlay');
const songTime=()=>state.phase==='paused'?frozen:audio.context?audio.clock()-origin:-2;
const scene=new RhythmScene(songTime);
const game=new Phaser.Game({type:Phaser.AUTO,parent:'canvas',width:480,height:440,backgroundColor:'#151a17',scale:{mode:Phaser.Scale.FIT,autoCenter:Phaser.Scale.CENTER_BOTH},scene:[scene],audio:{noAudio:true},render:{antialias:true},banner:false});

function updateScores(){
 $('score').textContent=state.score.toString().padStart(5,'0');$('combo').innerHTML=`${state.combo}<small>×</small>`;$('accuracy').textContent=state.judged||state.extras?`${state.accuracy}%`:'—';
 $('best').textContent=bests[state.mode]?bests[state.mode].toLocaleString():'—';
}
function feedback(grade:Grade,delta=0){
 lastFeedback=performance.now();const el=$('feedback');el.dataset.grade=grade;
 const title={PERFECT:'正中节拍',GOOD:'跟得很好',OK:'接近了',MISS:'下一拍，继续',EARLY:'先听听鼓点'}[grade];
 const sub=grade==='MISS'?'连击归零，节奏还在':grade==='EARLY'?'等圆点到达亮线再拍':`${grade} · ${Math.round(Math.abs(delta)*1000)} ms${state.combo>=8?` · ${state.multiplier} 倍加分`:''}`;
 el.innerHTML=`${title}<small>${sub}</small>`;el.classList.remove('pop');void el.offsetWidth;el.classList.add('pop');
 EventBus.emit(Events.FEEDBACK,{grade});if(state.combo&&state.combo%8===0)EventBus.emit(Events.COMBO,{combo:state.combo});updateScores();
}
function setActive(active:boolean){difficulty.disabled=active;tap.disabled=!active;pause.disabled=!active;}
async function start(){
 if(busy)return;busy=true;const btn=overlay.querySelector('button');if(btn)btn.setAttribute('disabled','');
 try{
  await audio.unlock();audio.stop();state.reset(difficulty.value as Mode);finishedStored=false;
  origin=audio.context.currentTime+.12+TIMING.COUNT_IN*60/state.bpm;scheduledUntil=audio.context.currentTime;state.phase='countdown';
  overlay.hidden=true;setActive(true);pause.textContent='Ⅱ';pause.setAttribute('aria-label','暂停游戏');$('feedback').innerHTML='听四拍，准备出发<small>圆点落到亮线时点击</small>';updateScores();
 }catch(e){overlay.hidden=false;const p=overlay.querySelector('p');if(p)p.textContent=e instanceof Error?e.message:'声音开启失败，请重试。';}
 finally{busy=false;btn?.removeAttribute('disabled');}
}
function togglePause(){
 if(state.phase==='playing'||state.phase==='countdown'){
  frozen=songTime();state.phase='paused';audio.stop();tap.disabled=true;pause.textContent='▶';pause.setAttribute('aria-label','继续游戏');
  overlay.hidden=false;overlay.innerHTML='<div class="overlay-inner"><span class="mini-tag">TAKE A BREATH</span><h2>节奏等你，<br>慢慢来。</h2><p>声音和进度已经暂停。<br>准备好后，从这里继续。</p><button id="continue" class="primary">继续入拍 <span>↗</span></button><button id="restart" class="secondary">重新开始</button></div>';
 }else if(state.phase==='paused')void resume();
}
async function resume(){
 if(busy)return;busy=true;
 try{await audio.unlock();origin=audio.clock()-frozen;scheduledUntil=audio.context.currentTime;state.phase=frozen<-.19?'countdown':'playing';overlay.hidden=true;tap.disabled=false;pause.textContent='Ⅱ';pause.setAttribute('aria-label','暂停游戏');}
 catch{const p=overlay.querySelector('p');if(p)p.textContent='声音尚未恢复，请再次点击继续。';}finally{busy=false;}
}
function finish(){
 state.phase='finished';audio.stop();setActive(false);
 if(!finishedStored){bests[state.mode]=Math.max(bests[state.mode]||0,state.score);try{localStorage.setItem('beat-pocket-best',JSON.stringify(bests));}catch{}finishedStored=true;}
 updateScores();const rank=state.accuracy>=95?'S':state.accuracy>=80?'A':state.accuracy>=60?'B':'C';
 overlay.hidden=false;overlay.innerHTML=`<div class="overlay-inner results"><span class="mini-tag">GROOVE COMPLETE</span><div class="rank">${rank}</div><h2>${state.accuracy>=80?'这节奏，拿捏了。':'每一拍，都在进步。'}</h2><div class="result-stats"><div><b>${state.score.toLocaleString()}</b><span>本次得分</span></div><div><b>${state.maxCombo}</b><span>最高连击</span></div><div><b>${state.accuracy}%</b><span>准确率</span></div></div><p class="judgments">PERFECT ${state.perfect} · GOOD ${state.good} · OK ${state.ok} · MISS ${state.misses}</p><button id="restart" class="primary">再来一局 <span>↗</span></button></div>`;
 $('phase').textContent='GROOVE COMPLETE';$('time-left').textContent='00:00';$('progress').style.width='100%';EventBus.emit(Events.OVER);
}
function hit(stamp=performance.now()){
 if(!audio.context)return;const t=songTime()-(performance.now()-stamp)/1000-offset;
 const answer=state.tap(t);if(!answer)return;feedback(answer.grade,answer.delta);if(answer.grade!=='EARLY')audio.hit();tap.classList.remove('pressed');void tap.offsetWidth;tap.classList.add('pressed');
}
EventBus.on(Events.ACTION,()=>hit());
tap.addEventListener('pointerdown',e=>{e.preventDefault();hit(e.timeStamp);});
document.addEventListener('keydown',e=>{
 if(e.code==='Space'&&!(e.target instanceof HTMLInputElement)&&!(e.target instanceof HTMLSelectElement)){
  e.preventDefault();if(e.repeat)return;
  if(state.phase==='ready'||state.phase==='finished')void start();else if(state.phase==='paused')void resume();else hit(e.timeStamp);
 }
 if(e.code==='Escape'&&!e.repeat)togglePause();
});
overlay.addEventListener('click',e=>{const id=(e.target as HTMLElement).closest('button')?.id;if(id==='start'||id==='restart')void start();if(id==='continue')void resume();});
pause.addEventListener('click',togglePause);
document.addEventListener('visibilitychange',()=>{if(document.hidden&&(state.phase==='playing'||state.phase==='countdown'))togglePause();});
difficulty.addEventListener('change',()=>{state.reset(difficulty.value as Mode);$('bpm-label').textContent=`${state.bpm} BPM`;$('duration-label').textContent=`约 ${Math.ceil(state.duration+4*60/state.bpm)} 秒`;$('time-left').textContent=`00:${Math.ceil(state.duration).toString().padStart(2,'0')}`;updateScores();if(!overlay.querySelector('#start')){overlay.hidden=false;overlay.innerHTML='<div class="overlay-inner"><span class="mini-tag">A FRESH GROOVE</span><h2>换个节奏，<br>再玩一回。</h2><p>跟着四拍倒数，轻轻入拍。</p><button id="start" class="primary">开始入拍 <span>↗</span></button></div>';}});
$('mute').addEventListener('click',()=>{const muted=audio.toggleMute();$('mute').textContent=muted?'♩̸':'♪';$('mute').setAttribute('aria-label',muted?'取消静音':'静音');$('mute').setAttribute('aria-pressed',String(muted));});
$('settings-toggle').addEventListener('click',()=>{const open=$('settings').hidden;$('settings').hidden=!open;$('settings-toggle').setAttribute('aria-expanded',String(open));});
$('volume').addEventListener('input',e=>{const value=+(e.target as HTMLInputElement).value;audio.setVolume(value/100);$('volume-value').textContent=`${value}%`;});
$('sound-test').addEventListener('click',async()=>{try{await audio.unlock();if(audio.muted){audio.toggleMute();$('mute').textContent='♪';$('mute').setAttribute('aria-label','静音');}if(audio.volume===0){audio.setVolume(.65);$<HTMLInputElement>('volume').value='65';$('volume-value').textContent='65%';}audio.test();$('sound-status').textContent='正在播放三声；若无声，请检查标签页静音和输出设备';}catch(e){$('sound-status').textContent=e instanceof Error?e.message:'声音未能开启';}});
$('offset').addEventListener('input',e=>{offset=+(e.target as HTMLInputElement).value/1000;$('offset-value').textContent=`${Math.round(offset*1000)} ms`;});
const motion=$<HTMLInputElement>('motion');motion.checked=matchMedia('(prefers-reduced-motion: reduce)').matches;
function applyMotion(){scene.reduced=motion.checked;document.body.classList.toggle('reduce-motion',motion.checked);}motion.addEventListener('change',applyMotion);applyMotion();
function frame(){
 $('stage').dataset.phase=state.phase;$('stage').dataset.songTime=String(songTime());$('stage').dataset.nextNote=String(state.notes.find(n=>!n.judged)?.time??-1);
 $('stage').dataset.audio=JSON.stringify({state:audio.context?.state,volume:audio.volume,muted:audio.muted,signal:audio.signal(),drums:audio.scheduledDrums,clock:audio.context?.currentTime});
 if(state.phase==='playing'||state.phase==='countdown'){
  const now=audio.context.currentTime,to=now+TIMING.LOOK_AHEAD;audio.schedule(state.notes,origin,state.bpm,scheduledUntil,to);scheduledUntil=to;
  const t=songTime();if(t>=-.19)state.phase='playing';
  if(t<0){$('phase').textContent='COUNT IN / 四拍准备';$('feedback').innerHTML=`${Math.min(4,Math.max(1,Math.ceil(-t/(60/state.bpm))))}<small>听鼓点，准备入拍</small>`;}
  else{
   $('phase').textContent=`${MODES[state.mode].label.toUpperCase()} / ${state.bpm} BPM`;
   if(state.advance(t-offset))feedback('MISS');else if(performance.now()-lastFeedback>1600)$('feedback').innerHTML='跟上这一拍<small>圆点到亮线，按下就对了</small>';
   $('progress').style.width=`${Math.min(100,t/state.duration*100)}%`;
   const seconds=Math.max(0,Math.ceil(state.duration-t));$('time-left').textContent=`00:${seconds.toString().padStart(2,'0')}`;
   if(t>state.duration+TIMING.END_TAIL)finish();
  }
 }
 requestAnimationFrame(frame);
}
updateScores();frame();
// Read-only inspection hook for development and browser verification.
Object.assign(window,{game,render_game_to_text:()=>JSON.stringify({phase:state.phase,mode:state.mode,score:state.score,combo:state.combo,maxCombo:state.maxCombo,accuracy:state.accuracy,judged:state.judged,total:state.notes.length,songTime:songTime(),next:state.notes.find(n=>!n.judged)?.time,audio:audio.context?.state??'locked'})});
