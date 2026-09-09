export const ROOMS = [
 {id:'travel',name:'旅途留影',subtitle:'空相框，等下一段旅程住进来。',x:-13.6,symbol:'旅',base:120,kind:'travel'},
 {id:'teahouse',name:'拾光茶馆',subtitle:'在这里歇一歇，再去下一扇门。',x:-6.8,symbol:'茶',base:60,kind:'lounge'},
 {id:'pawnshop',name:'第八号会客厅',subtitle:'每一扇门，都是一段可以走进去的生活。',x:0,symbol:'捌',base:60,kind:'lounge'},
 {id:'museum',name:'木心美术馆',subtitle:'水桥、书墙，还有画里的秘密。',x:6.8,symbol:'馆',destination:'/museum/?from=street',kind:'portal'},
 {id:'mountains',name:'山野来信',subtitle:'先在星空下坐坐，山的名字以后再写。',x:13.6,symbol:'山',base:180,kind:'mountains'}
];
export const CATALOG=ROOMS.map(r=>({id:r.id,name:r.name,description:r.subtitle}));
export function clampPosition(x,z,inside=false){return inside?{x:Math.max(-3.7,Math.min(3.7,x)),z:Math.max(-.9,Math.min(3.8,z))}:{x:Math.max(-17,Math.min(17,x)),z:Math.max(.7,Math.min(7.8,z))};}
export function interactionAt(x,z,roomId=null){if(roomId){if(Math.hypot(x,z+.85)<2)return{type:roomId==='travel'||roomId==='mountains'?'memory':'menu',label:roomId==='travel'?'翻开旅行册':roomId==='mountains'?'读山野来信':'看看下一扇门'};if(z>3.1)return{type:'exit',label:'回到街上'};return null;}const r=ROOMS.find(r=>Math.hypot(x-r.x,z-.8)<1.65);return r?{type:'enter',room:r.id,label:'进入'+r.name}:null;}
export function stepToward(position,target,distance,inside=false){const dx=target.x-position.x,dz=target.z-position.z,d=Math.hypot(dx,dz);if(d<.025)return{...position,moving:false};const n=Math.min(distance,d)/d;return{...clampPosition(position.x+dx*n,position.z+dz*n,inside),moving:true};}
