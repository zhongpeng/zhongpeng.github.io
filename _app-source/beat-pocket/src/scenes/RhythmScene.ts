import Phaser from 'phaser';
import { COLORS,TIMING } from '../core/Constants.ts';
import { gameState } from '../core/GameState.ts';
import { EventBus, Events } from '../core/EventBus.ts';
export class RhythmScene extends Phaser.Scene {
 private ink!:Phaser.GameObjects.Graphics;private clock:()=>number;private pop=0;private bursts:{x:number;y:number;vx:number;vy:number;life:number}[]=[];private cleanups:(()=>void)[]=[];reduced=false;
 constructor(clock:()=>number){super('Rhythm');this.clock=clock;}
 create(){this.ink=this.add.graphics();this.cleanups.push(EventBus.on(Events.FEEDBACK,({grade})=>{this.pop=grade==='MISS'?.2:1;if(grade!=='MISS'&&!this.reduced)for(let i=0;i<10;i++){const angle=Math.PI*2*i/10;this.bursts.push({x:240,y:350,vx:Math.cos(angle)*110,vy:Math.sin(angle)*90,life:1});}}));this.events.once('shutdown',()=>this.cleanups.forEach(f=>f()));this.input.on('pointerdown',()=>EventBus.emit(Events.ACTION));}
 update(_time:number,delta:number){
  if(!this.ink)return;const g=this.ink;g.clear();const t=this.clock(),playing=gameState.phase==='playing'||gameState.phase==='countdown';const time=playing?t:(gameState.phase==='paused'?t:-1.9);const center=240,target=350,beat=60/gameState.bpm;this.pop=Math.max(0,this.pop-delta/270);
  g.fillStyle(COLORS.BG);g.fillRect(0,0,480,440);
  g.fillStyle(0x1c241d,.7);g.fillRoundedRect(135,50,210,350,28);
  for(let i=0;i<7;i++){const y=50+i*50;g.lineStyle(1,0x334137,.45);g.lineBetween(92,y,388,y);}
  for(const x of [135,center,345]){g.lineStyle(1,0x475c45,.32);g.lineBetween(x,50,x,408);}
  for(let i=0;i<4;i++){const active=playing&&Math.floor(Math.max(0,t)/beat)%4===i;g.fillStyle(active?COLORS.LIME:0x465040,active?1:.6);g.fillCircle(210+i*20,30,active?4:2.5);}
  const pulse=playing?Math.pow(1-(Math.max(0,t)%beat)/beat,4):.15;
  g.lineStyle(1,COLORS.LIME,.12+pulse*.12);g.strokeCircle(center,target,56+pulse*7);
  g.fillStyle(COLORS.LIME,.035+this.pop*.08);g.fillCircle(center,target,43+this.pop*8);
  g.lineStyle(2,COLORS.LIME,.85);g.lineBetween(80,target,400,target);
  g.lineStyle(1,COLORS.LIME,.6);g.strokeCircle(center,target,25+this.pop*8);
  g.fillStyle(COLORS.LIME,.8);g.fillCircle(center,target,4);
  for(const n of gameState.notes){if(n.judged&&playing)continue;const dt=n.time-time;if(dt<-.25||dt>TIMING.LEAD+.2)continue;const y=target-dt/TIMING.LEAD*300;if(y<48)continue;const color=n.accent?COLORS.CORAL:COLORS.LIME;g.fillStyle(color,.08);g.fillCircle(center,y,n.accent?23:20);g.lineStyle(2,color,.9);g.strokeCircle(center,y,n.accent?14:11);g.fillStyle(color,1);g.fillCircle(center,y,n.accent?5:3);if(n.accent){g.lineStyle(1,color,.5);g.lineBetween(center-28,y,center-22,y);g.lineBetween(center+22,y,center+28,y);}}
  const dt=Math.min(delta/1000,.05);for(const b of this.bursts){b.life-=dt*2.8;b.x+=b.vx*dt;b.y+=b.vy*dt;g.fillStyle(COLORS.LIME,Math.max(0,b.life));g.fillCircle(b.x,b.y,2*b.life);}this.bursts=this.bursts.filter(b=>b.life>0);
  g.fillStyle(0x839477,.65);for(let i=0;i<12;i++){const h=4+Math.sin(i*2.1+time*4)*3+(playing?pulse*8:0);g.fillRect(20+i*7,420-h,3,h);g.fillRect(382+i*7,420-h,3,h);}
 }
}
