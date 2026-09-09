import * as T from 'three';
export function makeMemoryScenes(scene,{group,box,ball,cyl,sign,planter,M}){
 const travel=group(scene,120,0,0),mountains=group(scene,180,0,0);travel.visible=mountains.visible=false;
 const paper=new T.MeshStandardMaterial({color:'#d8c6a3'}),green=new T.MeshStandardMaterial({color:'#344d43'}),rock=new T.MeshStandardMaterial({color:'#657876',flatShading:true});
 box(travel,0,-.13,0,9,.26,9,M.floor);box(travel,0,2.4,-3.7,9,4.8,.25,M.wall);box(travel,-4.4,1.8,0,.25,3.6,7.6,M.wall);
 for(let i=0;i<3;i++){let x=(i-1)*2.7;box(travel,x,2,-3.5,2.2,2.45,.12,M.woodLight);box(travel,x,2,-3.42,1.98,2.2,.04,paper);sign(travel,['一 座 城','一 片 海','一 段 路'][i],x,2.2,-3.38,1.65,.4,{bg:'#d8c6a3',fg:'#526858',size:100});sign(travel,'等一张你的照片',x,1.7,-3.37,1.65,.3,{bg:'#d8c6a3',fg:'#81755f',size:70});}
 sign(travel,'旅 途 留 影',0,4,-3.5,3.4,.6);box(travel,0,.5,-1.65,2.3,1,.8,M.woodLight);box(travel,0,1.04,-1.6,1.1,.07,.65,paper);sign(travel,'未写完的旅行册',0,.65,-1.21,1.9,.3);planter(travel,-3.7,0,-2.6,1.3);planter(travel,3.7,0,-2.6,1.3);
 for(const x of[-3,3]){box(travel,x,.5,1,.8,1,.7,M.wood);box(travel,x,.99,1,.85,.1,.75,M.green);} 
 box(mountains,0,-.13,0,10,.26,10,green);for(let i=0;i<6;i++)box(mountains,Math.sin(i)*.18,.012,3.6-i*.75,1.25,.035,.55,M.stone);
 for(let i=0;i<13;i++){let x=(i-6)*1.65,z=-5-(i%3)*1.4,h=3+(i*7%5);const peak=new T.Mesh(new T.ConeGeometry(2.8,h,5),rock);peak.position.set(x,h/2-.1,z);peak.rotation.y=i;mountains.add(peak);}
 for(const x of[-4,4])for(let j=0;j<4;j++){let z=2-j*1.5;cyl(mountains,x,.8,z,.12,1.6,M.wood);for(let k=0;k<3;k++){const crown=new T.Mesh(new T.ConeGeometry(.9-k*.18,1.6,6),green);crown.position.set(x,1.6+k*.7,z);mountains.add(crown);}}
 // A tent beside the path; the central walking corridor stays clear.
 const tent=new T.Mesh(new T.ConeGeometry(1.3,1.7,3),new T.MeshStandardMaterial({color:'#cc9764',side:T.DoubleSide}));tent.position.set(-2.5,.85,.3);tent.rotation.y=Math.PI/6;mountains.add(tent);
 box(mountains,2.7,.38,1.6,1.4,.15,.5,M.woodLight);for(const x of[2.2,3.2])box(mountains,x,.18,1.6,.12,.36,.4,M.wood);
 box(mountains,0,.6,-1.65,.12,1.2,.12,M.wood);sign(mountains,'山的名字，留给下一次',0,1.35,-1.61,3.4,.55);sign(mountains,'山 野 来 信',0,2.2,-3.5,3.4,.7);
 const moon=new T.Mesh(new T.SphereGeometry(.6,20,12),new T.MeshBasicMaterial({color:'#efd8ad'}));moon.position.set(3.8,7,-6);mountains.add(moon);
 for(const [g,color]of[[travel,'#ffdaa1'],[mountains,'#a6d4e5']]){const l=new T.PointLight(color,85,22,1.5);l.position.set(0,6,1);g.add(l);}
 return {travel,mountains};
}
