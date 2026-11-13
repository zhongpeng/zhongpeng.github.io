import { TIMING, type Note } from '../core/Constants.ts';
export class AudioEngine {
 context!:AudioContext; master!:GainNode; analyser!:AnalyserNode; private voices=new Set<AudioScheduledSourceNode>(); private noise!:AudioBuffer; scheduledDrums=0;
 volume=.65; muted=false;
 async unlock(){
  if(!this.context){this.context=new AudioContext({latencyHint:'interactive'});this.master=this.context.createGain();this.analyser=this.context.createAnalyser();this.analyser.fftSize=256;this.master.connect(this.analyser);this.analyser.connect(this.context.destination);this.noise=this.context.createBuffer(1,this.context.sampleRate*.2,this.context.sampleRate);const a=this.noise.getChannelData(0);for(let i=0;i<a.length;i++)a[i]=Math.random()*2-1;this.setVolume(this.volume);}
  if(this.context.state!=='running')await this.context.resume();
  if(this.context.state!=='running')throw new Error('声音未能开启，请再点一次开始。');
 }
 clock(){if(!this.context)return 0;const t=this.context.getOutputTimestamp?.();return t&&typeof t.contextTime==='number'&&t.contextTime>0&&typeof t.performanceTime==='number'?Math.min(this.context.currentTime,t.contextTime+(performance.now()-t.performanceTime)/1000):this.context.currentTime-(this.context.baseLatency||0);}
 setVolume(v:number){this.volume=v;if(this.master)this.master.gain.setTargetAtTime(this.muted?0:v*.65,this.context.currentTime,.02);}
 toggleMute(){this.muted=!this.muted;this.setVolume(this.volume);return this.muted;}
 signal(){if(!this.analyser)return 0;const a=new Float32Array(this.analyser.fftSize);this.analyser.getFloatTimeDomainData(a);return Math.sqrt(a.reduce((sum,v)=>sum+v*v,0)/a.length);}
 test(){const t=this.context.currentTime+.05;this.count(t,false);this.count(t+.3,false);this.count(t+.6,true);}
 stop(){for(const v of this.voices){try{v.stop();}catch{}}this.voices.clear();}
 private track(o:AudioScheduledSourceNode){this.voices.add(o);o.onended=()=>this.voices.delete(o);}
 private tone(time:number,freq:number,duration:number,volume:number,type:OscillatorType='sine',end?:number){
  const c=this.context;if(time<c.currentTime-.025)return;const t=Math.max(time,c.currentTime);const o=c.createOscillator(),g=c.createGain();o.type=type;o.frequency.setValueAtTime(freq,t);if(end)o.frequency.exponentialRampToValueAtTime(end,t+duration*.75);g.gain.setValueAtTime(.0001,t);g.gain.exponentialRampToValueAtTime(volume,t+.006);g.gain.exponentialRampToValueAtTime(.0001,t+duration);o.connect(g);g.connect(this.master);o.start(t);o.stop(t+duration+.02);this.track(o);
 }
 private hat(time:number,volume:number){const c=this.context;if(time<c.currentTime-.025)return;const t=Math.max(time,c.currentTime),n=c.createBufferSource(),filter=c.createBiquadFilter(),g=c.createGain();n.buffer=this.noise;filter.type='highpass';filter.frequency.value=6500;g.gain.setValueAtTime(volume,t);g.gain.exponentialRampToValueAtTime(.0001,t+.045);n.connect(filter);filter.connect(g);g.connect(this.master);n.start(t);n.stop(t+.05);this.track(n);}
 count(time:number,accent:boolean){this.tone(time,accent?880:660,.08,.14);}
 drum(time:number,accent:boolean){this.scheduledDrums++;this.tone(time,accent?148:118,.23,accent?.85:.6,'sine',43);this.tone(time,950,.018,.1,'triangle',170);}
 tick(time:number,beat:number){this.hat(time,beat%1===0?.05:.025);if(beat%4===0){this.tone(time,[110,130.81,98,146.83][Math.floor(beat/4)%4],.45,.15,'triangle');}}
 hit(){this.tone(this.context.currentTime,1320,.035,.025);}
 schedule(notes:Note[],origin:number,bpm:number,from:number,to:number){
  const spb=60/bpm;
  for(let b=-TIMING.COUNT_IN;b<0;b++){const t=origin+b*spb;if(t>=from&&t<to)this.count(t,b===-1);}
  for(const note of notes){const t=origin+note.time;if(t>=from&&t<to)this.drum(t,note.accent);}
  for(let b=0;b<48;b+=.5){const t=origin+b*spb;if(t>=from&&t<to)this.tick(t,b);}
 }
}
