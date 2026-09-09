export const ROOMS = [
 {id:'teahouse',name:'拾光茶馆',subtitle:'把片刻，留给快乐。',x:-6.8,accent:'#d5a574',symbol:'茶',destination:'/moment-forever/'},
 {id:'pawnshop',name:'第八号会客厅',subtitle:'今夜，想把时间花在哪里？',x:0,accent:'#c49b59',symbol:'捌',destination:null},
 {id:'ledger',name:'有数账房',subtitle:'一盏灯，理清生活的账。',x:6.8,accent:'#8db5aa',symbol:'账',destination:'/money-compass/'}
];
export const CATALOG=[{id:'moment',name:'Moment & Forever',label:'拾光小游戏',description:'点一份快乐，留住此刻。',href:'/moment-forever/',symbol:'光'}, {id:'money',name:'有数 · 财务助手',label:'生活账本',description:'收入、支出和心里的底气。',href:'/money-compass/',symbol:'数'}];
export function clampPosition(x,z,inside=false){return inside?{x:Math.max(-3.7,Math.min(3.7,x)),z:Math.max(-.9,Math.min(3.8,z))}:{x:Math.max(-10.4,Math.min(10.4,x)),z:Math.max(.7,Math.min(7.8,z))};}
export function interactionAt(x,z,roomId=null){if(roomId){if(Math.hypot(x,z+.85)<2)return{type:'menu',label:'打开菜单'};if(z>3.1)return{type:'exit',label:'回到街上'};return null;}const r=ROOMS.find(r=>Math.hypot(x-r.x,z-.8)<1.65);return r?{type:'enter',room:r.id,label:'进入'+r.name}:null;}
export function stepToward(position,target,distance,inside=false){const dx=target.x-position.x,dz=target.z-position.z,d=Math.hypot(dx,dz);if(d<.025)return{...position,moving:false};const n=Math.min(distance,d)/d;return{...clampPosition(position.x+dx*n,position.z+dz*n,inside),moving:true};}
