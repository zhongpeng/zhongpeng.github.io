import { makeChart, MODES, TIMING, type Mode, type Note } from './Constants.ts';
export type Grade = 'PERFECT'|'GOOD'|'OK'|'MISS'|'EARLY';
export type Phase = 'ready'|'countdown'|'playing'|'paused'|'finished';
export class RunState {
 mode:Mode='easy'; phase:Phase='ready'; notes:Note[]=[]; score=0; combo=0; maxCombo=0; perfect=0; good=0; ok=0; misses=0; extras=0; lastTap=-Infinity;
 reset(mode:Mode=this.mode){this.mode=mode;this.notes=makeChart(mode);this.phase='ready';this.score=0;this.combo=0;this.maxCombo=0;this.perfect=0;this.good=0;this.ok=0;this.misses=0;this.extras=0;this.lastTap=-Infinity;}
 get bpm(){return MODES[this.mode].bpm;}
 get duration(){return 48*60/this.bpm;}
 get multiplier(){return Math.min(4,1+Math.floor(this.combo/8));}
 get judged(){return this.perfect+this.good+this.ok+this.misses;}
 get accuracy(){const n=this.judged+this.extras;return n?Math.round((this.perfect+this.good*.75+this.ok*.4)/n*100):0;}
 advance(time:number){let count=0;for(const note of this.notes){if(!note.judged && time-note.time>TIMING.MAX){note.judged=true;this.misses++;this.combo=0;count++;}}return count;}
 tap(time:number):{grade:Grade;delta:number}|null {
  if(this.phase!=='playing'||time<-.1||time-this.lastTap<TIMING.DEBOUNCE)return null;
  this.lastTap=time;this.advance(time);
  const target=this.notes.filter(n=>!n.judged).sort((a,b)=>Math.abs(a.time-time)-Math.abs(b.time-time))[0];
  const delta=target?time-target.time:Infinity;
  if(!target||Math.abs(delta)>TIMING.MAX){this.combo=0;this.extras++;return {grade:'EARLY',delta};}
  target.judged=true;this.combo++;this.maxCombo=Math.max(this.combo,this.maxCombo);
  let grade:Grade;let points:number;
  if(Math.abs(delta)<=TIMING.PERFECT){grade='PERFECT';points=100;this.perfect++;}
  else if(Math.abs(delta)<=TIMING.GOOD){grade='GOOD';points=70;this.good++;}
  else{grade='OK';points=40;this.ok++;}
  this.score+=points*this.multiplier;return {grade,delta};
 }
}
export const gameState = new RunState(); gameState.reset();
