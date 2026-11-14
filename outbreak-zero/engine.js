(function(root){
'use strict';
const regions=[['北美',370,178,166,'cold'],['中美',180,223,242,'hot'],['南美',430,290,338,'hot'],['格陵兰',6,350,96,'cold'],['西欧',420,470,153,'cold'],['北欧',100,513,100,'cold'],['东欧',290,558,163,'cold'],['北非',250,478,237,'hot'],['西非',410,450,301,'hot'],['中非',220,525,320,'hot'],['南非',190,550,403,'hot'],['中东',300,601,225,'hot'],['北亚',230,725,118,'cold'],['东亚',1650,805,217,'mild'],['南亚',1900,704,272,'hot'],['东南亚',680,805,315,'hot'],['大洋洲',45,881,407,'hot'],['日本',125,900,210,'mild']];
const upgrades=[
{id:'air',name:'气流扩散',group:'传播',icon:'↗',cost:8,max:3,desc:'增加跨地区传播与基础扩散。'},
{id:'sea',name:'远洋迁移',group:'传播',icon:'≈',cost:8,max:3,desc:'提高远距离传播，抵消部分封锁。'},
{id:'cold',name:'低温适应',group:'适应',icon:'❄',cost:7,max:2,desc:'提高寒冷地区的扩散效率。'},
{id:'heat',name:'高温适应',group:'适应',icon:'☼',cost:7,max:2,desc:'提高炎热地区的扩散效率。'},
{id:'stealth',name:'潜伏特性',group:'适应',icon:'◌',cost:12,max:3,desc:'降低警觉，延缓解药研发。'},
{id:'symptom',name:'系统侵蚀',group:'症状',icon:'⌁',cost:10,max:3,desc:'提高扩散与致死率，也提高警觉。'},
{id:'fatal',name:'全面崩溃',group:'症状',icon:'✳',cost:20,max:3,requires:'symptom',desc:'大幅提高致死率。需要系统侵蚀。'},
{id:'resist',name:'序列重组',group:'适应',icon:'⧖',cost:18,max:3,desc:'回退 12% 解药进度，并减慢后续研发。'}];
function create(difficulty='normal'){return {version:1,day:0,dna:18,cure:0,alert:0,status:'ready',difficulty,levels:Object.fromEntries(upgrades.map(u=>[u.id,0])),regions:regions.map((r,id)=>({id,name:r[0],pop:r[1]*1e6,x:r[2],y:r[3],climate:r[4],i:0,d:0,seen:false})),logs:[],reward:0,seed:Math.floor(Math.random()*1e9)+1};}
function random(s){s.seed=(Math.imul(s.seed,1664525)+1013904223)>>>0;return s.seed/4294967296;}
function totals(s){return s.regions.reduce((a,r)=>({pop:a.pop+r.pop,i:a.i+r.i,d:a.d+r.d,hit:a.hit+(r.seen?1:0)}),{pop:0,i:0,d:0,hit:0});}
function log(s,text){s.logs.unshift({day:s.day,text});s.logs=s.logs.slice(0,30);}
function start(s,id){if(s.status!=='ready'||!s.regions[id])return false;const r=s.regions[id];r.i=20000;r.seen=true;s.status='playing';log(s,`零号事件出现在${r.name}。`);return true;}
function price(s,u){return u.cost+s.levels[u.id]*Math.ceil(u.cost*.65);}
function buy(s,id){const u=upgrades.find(x=>x.id===id);if(!u||s.status!=='playing'||s.levels[id]>=u.max||(u.requires&&!s.levels[u.requires])||s.dna<price(s,u))return false;s.dna-=price(s,u);s.levels[id]++;if(id==='resist')s.cure=Math.max(0,s.cure-12);log(s,`${u.name}进化至 ${s.levels[id]} 级。`);return true;}
function tick(s){if(s.status!=='playing')return;s.day++;const l=s.levels,t=totals(s);const difficulty=s.difficulty==='easy'?.7:s.difficulty==='hard'?1.35:1;
s.alert=Math.min(100,Math.max(0,(t.i+t.d)/t.pop*80+l.symptom*9+l.fatal*15-l.stealth*11+s.day*.035));
const closed=s.alert>55;
for(const r of s.regions){const susceptible=Math.max(0,r.pop-r.i-r.d);let climate=r.climate==='cold'?.58+l.cold*.32:r.climate==='hot'?.7+l.heat*.26:1;
const rate=(.16+l.air*.045+l.sea*.018+l.symptom*.035)*climate*(closed?.7:1);
const fresh=Math.min(susceptible,r.i*rate*susceptible/r.pop);
const deaths=Math.min(r.i,r.i*(l.symptom*.0015+l.fatal*.024));r.i=Math.max(0,r.i+fresh-deaths);r.d+=deaths;
if(r.i<1&&r.i>0){r.d+=r.i;r.i=0;}
}
const sources=s.regions.filter(r=>r.i>10000);
if(sources.length){for(const r of s.regions.filter(r=>!r.seen)){const chance=(.0015+l.air*.0025+l.sea*.0035)*sources.length*(closed?.25+l.sea*.12:1);if(random(s)<chance){r.i=10000;r.seen=true;s.dna+=4;log(s,`${r.name}出现传播，获得 4 进化点。`);}}}
const now=totals(s);const milestones=Math.floor((now.i+now.d)/now.pop*100);if(milestones>s.reward){s.dna+=(milestones-s.reward)*2;s.reward=milestones;}if(s.day%5===0)s.dna+=2;
if(s.alert>15)s.cure=Math.min(100,s.cure+(.075+s.alert*.007)*difficulty/(1+l.stealth*.25+l.resist*.4)*(1-now.d/now.pop*.75));
if(s.day%30===0){const n=random(s);if(n<.35){s.dna+=6;log(s,'发现新的变异片段：获得 6 进化点。');}else if(n<.65&&s.alert>20){s.cure=Math.min(100,s.cure+2);log(s,'国际研究协作取得突破：解药 +2%。');}else log(s,closed?'全球交通管制持续，跨地区传播受限。':'全球航线持续运行，地区间往来频繁。');}
if(now.d/now.pop>=.85){s.status='won';log(s,'世界秩序崩溃，零号实验完成。');}else if(s.cure>=100||now.i<1){s.status='lost';log(s,s.cure>=100?'解药研发完成，传播被终止。':'感染者耗尽，传播链中断。');}
}
function valid(s){return s&&s.version===1&&['ready','playing','won','lost'].includes(s.status)&&['easy','normal','hard'].includes(s.difficulty)&&['day','dna','cure','alert','reward','seed'].every(k=>Number.isFinite(s[k])&&s[k]>=0)&&Array.isArray(s.logs)&&s.logs.every(l=>typeof l.text==='string'&&Number.isFinite(l.day))&&s.levels&&upgrades.every(u=>Number.isInteger(s.levels[u.id])&&s.levels[u.id]>=0&&s.levels[u.id]<=u.max)&&Array.isArray(s.regions)&&s.regions.length===regions.length&&s.regions.every((r,i)=>r.id===i&&r.pop===regions[i][1]*1e6&&Number.isFinite(r.i)&&Number.isFinite(r.d)&&r.i>=0&&r.d>=0&&r.i+r.d<=r.pop+1);}
const api={regions,upgrades,create,start,buy,tick,totals,price,valid};if(typeof module!=='undefined')module.exports=api;else root.Game=api;
})(typeof window!=='undefined'?window:globalThis);
