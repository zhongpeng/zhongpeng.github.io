const assert=require('node:assert/strict'),G=require('./engine.js');
let checks=0;function test(name,fn){fn();checks++;console.log('PASS',name)}
test('start and upgrade rules',()=>{let s=G.create();assert(!G.buy(s,'air'));assert(G.start(s,13));assert(!G.start(s,2));assert(!G.buy(s,'fatal'));assert(G.buy(s,'air'));assert.equal(s.dna,10);assert(!G.buy(s,'air'));});
test('population conservation over 600 days',()=>{for(let seed=1;seed<=20;seed++){let s=G.create();s.seed=seed;G.start(s,seed%18);for(let i=0;i<600;i++){G.tick(s);assert(G.valid(s));const t=G.totals(s);assert(t.i+t.d<=t.pop+1);}}});
test('cure defeat',()=>{let s=G.create();G.start(s,0);s.cure=99.99;s.levels.symptom=3;G.tick(s);assert.equal(s.status,'lost');});
test('extinction defeat',()=>{let s=G.create();G.start(s,0);s.regions[0].i=.1;G.tick(s);assert.equal(s.status,'lost');});
test('victory and terminal state freeze',()=>{let s=G.create();G.start(s,0);for(let r of s.regions){r.d=r.pop*.86;r.i=r.pop*.01;}G.tick(s);assert.equal(s.status,'won');const copy=JSON.stringify(s);G.tick(s);assert.equal(JSON.stringify(s),copy);});
test('save roundtrip and corrupted save rejection',()=>{let s=G.create();G.start(s,2);G.tick(s);assert(G.valid(JSON.parse(JSON.stringify(s))));s.regions[0].i=-1;assert(!G.valid(s));assert(!G.valid({}));});
test('research rollback and maximum level',()=>{let s=G.create();G.start(s,0);s.dna=500;s.cure=50;assert(G.buy(s,'resist'));assert.equal(s.cure,38);G.buy(s,'resist');G.buy(s,'resist');assert(!G.buy(s,'resist'));});
let wins=0;for(let seed=1;seed<=30;seed++){let s=G.create();s.seed=seed;G.start(s,13);for(let i=0;i<1300&&s.status==='playing';i++){for(let id of ['air','sea','cold','heat','stealth'])G.buy(s,id);if(G.totals(s).i/G.totals(s).pop>.65||s.levels.fatal){G.buy(s,'symptom');G.buy(s,'fatal');}if(s.cure>45)G.buy(s,'resist');G.tick(s);}if(s.status==='won')wins++;}
console.log(`Strategy simulation: ${wins}/30 standard games won`);assert(wins>=20,'The intended strategy must be viable');console.log(`${checks} tests passed`);
