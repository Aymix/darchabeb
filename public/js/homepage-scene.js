/* VirtuArts Cinematic Engine — Scene Builder */
(function(){
'use strict';
if(!window.THREE) return;
const W=window,T=THREE,canvas=document.getElementById('cinCanvas');
if(!canvas) return;

// Renderer
const R=new T.WebGLRenderer({canvas,antialias:true,alpha:false});
R.setSize(W.innerWidth,W.innerHeight);
R.setPixelRatio(Math.min(W.devicePixelRatio,1.5));
R.setClearColor(0x050505);

// Scene + Camera
const S=new T.Scene();
S.fog=new T.FogExp2(0x050505,0.015);
const cam=new T.PerspectiveCamera(65,W.innerWidth/W.innerHeight,0.1,600);

// Lights
S.add(new T.AmbientLight(0xff9500,0.06));
const coreL=new T.PointLight(0xff9500,0,35);
S.add(coreL);
const camL=new T.PointLight(0xff7a00,0.3,15);
S.add(camL);

// ═══ LAYERED BACKGROUND ═══

// Layer 1: Far galaxy stars
const starC=2000, stG=new T.BufferGeometry(), stP=new Float32Array(starC*3);
for(let i=0;i<starC;i++){
  stP[i*3]=(Math.random()-.5)*100;
  stP[i*3+1]=(Math.random()-.5)*80;
  stP[i*3+2]=-Math.random()*300;
}
stG.setAttribute('position',new T.BufferAttribute(stP,3));
const stars=new T.Points(stG,new T.PointsMaterial({color:0xffb347,size:0.04,transparent:true,opacity:0.35,blending:T.AdditiveBlending,depthWrite:false}));
S.add(stars);

// Layer 2: Mid nebula clouds
const nebulas=[];
for(let i=0;i<12;i++){
  const n=new T.Mesh(new T.SphereGeometry(3+Math.random()*5,12,12),
    new T.MeshBasicMaterial({color:0xff7a00,transparent:true,opacity:0.015+Math.random()*0.01}));
  n.position.set((Math.random()-.5)*40,(Math.random()-.5)*20,-20-Math.random()*250);
  n.userData={oy:n.position.y,ph:Math.random()*6.28,sp:0.1+Math.random()*0.2};
  S.add(n); nebulas.push(n);
}

// Layer 3: Near atmospheric particles
const pC=1500,pG=new T.BufferGeometry(),pP=new Float32Array(pC*3),pV=new Float32Array(pC*3);
for(let i=0;i<pC;i++){
  pP[i*3]=(Math.random()-.5)*30;
  pP[i*3+1]=(Math.random()-.5)*30;
  pP[i*3+2]=-Math.random()*280;
  pV[i*3]=(Math.random()-.5)*0.006;
  pV[i*3+1]=(Math.random()-.5)*0.006;
  pV[i*3+2]=(Math.random()-.5)*0.002;
}
pG.setAttribute('position',new T.BufferAttribute(pP,3));
const parts=new T.Points(pG,new T.PointsMaterial({color:0xff9500,size:0.05,transparent:true,opacity:0.45,blending:T.AdditiveBlending,depthWrite:false}));
S.add(parts);

// Layer 4: Foreground embers (close, large, rare)
const eC=200,eG=new T.BufferGeometry(),eP=new Float32Array(eC*3);
for(let i=0;i<eC;i++){
  eP[i*3]=(Math.random()-.5)*15;
  eP[i*3+1]=(Math.random()-.5)*12;
  eP[i*3+2]=-Math.random()*280;
}
eG.setAttribute('position',new T.BufferAttribute(eP,3));
const embers=new T.Points(eG,new T.PointsMaterial({color:0xffb347,size:0.1,transparent:true,opacity:0.3,blending:T.AdditiveBlending,depthWrite:false}));
S.add(embers);

// ═══ ENERGY FLOW RIBBONS ═══
const ribbons=[];
for(let r=0;r<6;r++){
  const pts=[];
  const sx=(Math.random()-.5)*8, sy=(Math.random()-.5)*4;
  for(let j=0;j<60;j++){
    pts.push(new T.Vector3(sx+Math.sin(j*.2+r)*3, sy+Math.cos(j*.15+r)*2, -10-j*4.2));
  }
  const crv=new T.CatmullRomCurve3(pts);
  const rMesh=new T.Mesh(new T.TubeGeometry(crv,80,0.015+Math.random()*0.02,5,false),
    new T.MeshBasicMaterial({color:0xff9500,transparent:true,opacity:0.12}));
  S.add(rMesh); ribbons.push(rMesh);
}

// ═══ THE DOOR (z=-25) ═══
const DZ=-25, dG=new T.Group(); dG.position.z=DZ;
const dRing=new T.Mesh(new T.TorusGeometry(4,0.14,32,128),
  new T.MeshStandardMaterial({color:0x1a1a1a,emissive:0xff7a00,emissiveIntensity:0.25,metalness:.95,roughness:.15}));
dG.add(dRing);
const dGlow=new T.Mesh(new T.CircleGeometry(3.8,64),
  new T.MeshBasicMaterial({color:0xff9500,transparent:true,opacity:0,side:T.DoubleSide}));
dG.add(dGlow);
// Deco rings
for(let i=0;i<4;i++){
  const dr=new T.Mesh(new T.TorusGeometry(4.6+i*.7,0.018-i*.003,12,72),
    new T.MeshBasicMaterial({color:0xff9500,transparent:true,opacity:.12-i*.025}));
  dr.userData={sp:.06+i*.025,dir:i%2?1:-1}; dG.add(dr);
}
// Symbols
const syms=[];
for(let i=0;i<30;i++){
  const s=new T.Mesh(new T.OctahedronGeometry(.07),new T.MeshBasicMaterial({color:0xffb347}));
  s.userData={a:(i/30)*6.28,r:4.2+Math.random()*.9,sp:.05+Math.random()*.12,yo:(Math.random()-.5)*2};
  dG.add(s); syms.push(s);
}
const dLight=new T.PointLight(0xff9500,0,25); dG.add(dLight);
S.add(dG);

// Tunnel rings
const tRings=[];
for(let i=0;i<18;i++){
  const tr=new T.Mesh(new T.TorusGeometry(2.2+Math.sin(i)*.6,.025,8,48),
    new T.MeshBasicMaterial({color:0xff9500,transparent:true,opacity:0}));
  tr.position.z=DZ-3-i*2.2; S.add(tr); tRings.push(tr);
}

// ═══ MUSIC WORLD (z=-80) ═══
const muG=new T.Group(); muG.position.z=-80;
const eqBars=[];
for(let i=0;i<24;i++){
  const h=.4+Math.random()*2.2;
  const b=new T.Mesh(new T.BoxGeometry(.22,h,.22),
    new T.MeshBasicMaterial({color:0xff9500,transparent:true,opacity:.55}));
  b.position.set((i-12)*.55,-2.5,0); b.userData={bh:h,ph:Math.random()*6.28};
  muG.add(b); eqBars.push(b);
}
// Soundwave ring
const swRing=new T.Mesh(new T.TorusGeometry(5,.03,8,64),
  new T.MeshBasicMaterial({color:0xff7a00,transparent:true,opacity:.2}));
muG.add(swRing);
// Music notes
const mNotes=[];
for(let i=0;i<35;i++){
  const n=new T.Mesh(new T.SphereGeometry(.06,6,6),
    new T.MeshBasicMaterial({color:0xffb347,transparent:true,opacity:.45}));
  n.position.set((Math.random()-.5)*14,(Math.random()-.5)*8,(Math.random()-.5)*10);
  n.userData={oy:n.position.y,ph:Math.random()*6.28};
  muG.add(n); mNotes.push(n);
}
// Vinyl
const vinyl=new T.Mesh(new T.TorusGeometry(2,.6,4,32),
  new T.MeshBasicMaterial({color:0x1a0f00,transparent:true,opacity:.25}));
vinyl.position.set(5,1,-3); vinyl.rotation.x=.4; muG.add(vinyl);
// Music world light
const muLight=new T.PointLight(0xff7a00,0,18); muG.add(muLight);
S.add(muG);

// ═══ DRAWING WORLD (z=-110) ═══
const drG=new T.Group(); drG.position.z=-110;
const strokes=[];
const cols=[0xff9500,0xffb347,0xff7a00,0xffcc00,0xff6600];
for(let i=0;i<15;i++){
  const pts=[];
  const sx=(Math.random()-.5)*12,sy=(Math.random()-.5)*7;
  for(let j=0;j<25;j++) pts.push(new T.Vector3(sx+j*.28*(Math.random()-.3),sy+Math.sin(j*.4)*1.8,(Math.random()-.5)*4));
  const geo=new T.TubeGeometry(new T.CatmullRomCurve3(pts),35,.03+Math.random()*.06,5,false);
  const st=new T.Mesh(geo,new T.MeshBasicMaterial({color:cols[i%cols.length],transparent:true,opacity:.35}));
  drG.add(st); strokes.push(st);
}
// Splashes
for(let i=0;i<8;i++){
  const sp=new T.Mesh(new T.SphereGeometry(.3+Math.random()*.5,8,8),
    new T.MeshBasicMaterial({color:cols[i%cols.length],transparent:true,opacity:.08}));
  sp.position.set((Math.random()-.5)*10,(Math.random()-.5)*6,(Math.random()-.5)*5);
  drG.add(sp);
}
const drLight=new T.PointLight(0xffcc00,0,16); drG.add(drLight);
S.add(drG);

// ═══ WRITING WORLD (z=-140) ═══
const wrG=new T.Group(); wrG.position.z=-140;
const letters=[];
for(let i=0;i<50;i++){
  const l=new T.Mesh(new T.BoxGeometry(.12+Math.random()*.18,.18+Math.random()*.12,.025),
    new T.MeshBasicMaterial({color:0xffb347,transparent:true,opacity:.25+Math.random()*.3}));
  l.position.set((Math.random()-.5)*16,(Math.random()-.5)*10,(Math.random()-.5)*10);
  l.userData={oy:l.position.y,ph:Math.random()*6.28,rs:(Math.random()-.5)*.015};
  wrG.add(l); letters.push(l);
}
// Books
for(let i=0;i<3;i++){
  const bk=new T.Mesh(new T.BoxGeometry(1.5+Math.random(),2+Math.random(),.15),
    new T.MeshBasicMaterial({color:0x1a0f00,transparent:true,opacity:.18}));
  bk.position.set((Math.random()-.5)*6,(Math.random()-.5)*3,-2-i*2);
  bk.rotation.y=Math.random()*.4; wrG.add(bk);
}
const wrLight=new T.PointLight(0xffb347,0,14); wrLight.position.y=2; wrG.add(wrLight);
S.add(wrG);

// ═══ 3D WORLD (z=-170) ═══
const mdG=new T.Group(); mdG.position.z=-170;
const wires=[];
[new T.IcosahedronGeometry(1.6,1),new T.OctahedronGeometry(1.3),new T.TorusKnotGeometry(1,.28,64,8),
 new T.DodecahedronGeometry(1.1),new T.TetrahedronGeometry(1.2)].forEach((g,i)=>{
  const m=new T.Mesh(g,new T.MeshBasicMaterial({color:0xff9500,wireframe:true,transparent:true,opacity:.35}));
  const a=(i/5)*6.28; m.position.set(Math.cos(a)*4.5,Math.sin(a)*2.5,(Math.random()-.5)*5);
  m.userData={rx:(Math.random()-.5)*.012,ry:(Math.random()-.5)*.012};
  mdG.add(m); wires.push(m);
});
const hCube=new T.Mesh(new T.BoxGeometry(1.4,1.4,1.4),
  new T.MeshBasicMaterial({color:0xffb347,wireframe:true,transparent:true,opacity:.45}));
mdG.add(hCube);
const mdLight=new T.PointLight(0xff9500,0,18); mdG.add(mdLight);
S.add(mdG);

// ═══ AURA AI — GIANT AI HEAD (z=-200) ═══
const auG=new T.Group(); auG.position.z=-200;

// CRANIUM — giant elongated wireframe skull
const auOrb=new T.Mesh(new T.SphereGeometry(5,24,18),
  new T.MeshBasicMaterial({color:0xff9500,wireframe:true,transparent:true,opacity:.12}));
auOrb.scale.set(1,1.25,1.1);
auG.add(auOrb);
// Inner cranium glow shell
const auOrb2=new T.Mesh(new T.SphereGeometry(4.8,16,16),
  new T.MeshBasicMaterial({color:0xff7a00,transparent:true,opacity:.02}));
auOrb2.scale.set(1,1.25,1.1);
auG.add(auOrb2);
// Solid dark inner skull
const auOrb3=new T.Mesh(new T.SphereGeometry(4.5,16,16),
  new T.MeshBasicMaterial({color:0x0a0500,transparent:true,opacity:.3}));
auOrb3.scale.set(1,1.25,1.1);
auG.add(auOrb3);

// VISOR — glowing horizontal strip across the eye line
const visor=new T.Mesh(new T.BoxGeometry(6,.4,.2),
  new T.MeshBasicMaterial({color:0xff9500,transparent:true,opacity:.25}));
visor.position.set(0,.8,4.6);
auG.add(visor);
// Visor glow
const visorGlow=new T.Mesh(new T.BoxGeometry(6.5,.8,.1),
  new T.MeshBasicMaterial({color:0xff9500,transparent:true,opacity:.04}));
visorGlow.position.set(0,.8,4.7);
auG.add(visorGlow);

// EYES — two intense glowing orbs behind the visor
const eyeMat=new T.MeshBasicMaterial({color:0xff9500,transparent:true,opacity:.8});
const eyeL=new T.Mesh(new T.SphereGeometry(.35,16,16),eyeMat.clone());
eyeL.position.set(-1.2,.8,4.4);
auG.add(eyeL);
const eyeR=new T.Mesh(new T.SphereGeometry(.35,16,16),eyeMat.clone());
eyeR.position.set(1.2,.8,4.4);
auG.add(eyeR);
// Eye glow halos
const eyeGlowL=new T.Mesh(new T.RingGeometry(.35,.6,24),
  new T.MeshBasicMaterial({color:0xffb347,transparent:true,opacity:.15,side:T.DoubleSide}));
eyeGlowL.position.copy(eyeL.position); eyeGlowL.position.z+=.2;
auG.add(eyeGlowL);
const eyeGlowR=eyeGlowL.clone();
eyeGlowR.position.set(1.2,.8,4.6);
auG.add(eyeGlowR);

// JAW — geometric angular jaw structure
const jawPts=[[-2.5,-.5,4],[-.8,-2,4.5],[.8,-2,4.5],[2.5,-.5,4]];
for(let i=0;i<jawPts.length-1;i++){
  const a=jawPts[i],b=jawPts[i+1];
  const pts2=[new T.Vector3(...a),new T.Vector3(...b)];
  const jaw=new T.Line(new T.BufferGeometry().setFromPoints(pts2),
    new T.LineBasicMaterial({color:0xff9500,transparent:true,opacity:.2}));
  auG.add(jaw);
}
// Chin line
const chinPts=[new T.Vector3(-.8,-2,4.5),new T.Vector3(0,-2.6,4.2),new T.Vector3(.8,-2,4.5)];
const chinLine=new T.Line(new T.BufferGeometry().setFromPoints(chinPts),
  new T.LineBasicMaterial({color:0xffb347,transparent:true,opacity:.18}));
auG.add(chinLine);

// NEURAL CIRCUITS — lines running across the skull surface
const auHelixes=[];
for(let i=0;i<8;i++){
  const pts=[];
  const startAngle=Math.random()*6.28;
  for(let j=0;j<40;j++){
    const a=startAngle+j*.08;
    const r=4.9;
    const y=3-j*.18+Math.sin(j*.3)*.3;
    pts.push(new T.Vector3(Math.cos(a)*r*Math.cos(y*.15),y,Math.sin(a)*r*Math.cos(y*.15)));
  }
  const circ=new T.Line(new T.BufferGeometry().setFromPoints(pts),
    new T.LineBasicMaterial({color:i<4?0xff9500:0xffb347,transparent:true,opacity:.1+Math.random()*.08}));
  auG.add(circ); auHelixes.push(circ);
}

// BRAIN PARTICLES — dense cloud inside the skull
const auShells=[];
[{c:400,rMin:.5,rMax:3.5,sz:.04,op:.5,col:0xff9500},
 {c:250,rMin:3.5,rMax:5.5,sz:.03,op:.25,col:0xffb347},
 {c:150,rMin:5.5,rMax:8,sz:.06,op:.12,col:0xff7a00}].forEach(cfg=>{
  const g=new T.BufferGeometry(),p=new Float32Array(cfg.c*3);
  for(let i=0;i<cfg.c;i++){
    const th=Math.random()*6.28,ph=Math.acos(2*Math.random()-1);
    const rr=cfg.rMin+Math.random()*(cfg.rMax-cfg.rMin);
    p[i*3]=rr*Math.sin(ph)*Math.cos(th);
    p[i*3+1]=rr*Math.sin(ph)*Math.sin(th)*1.2;
    p[i*3+2]=rr*Math.cos(ph);
  }
  g.setAttribute('position',new T.BufferAttribute(p,3));
  const pts=new T.Points(g,new T.PointsMaterial({color:cfg.col,size:cfg.sz,transparent:true,opacity:cfg.op,blending:T.AdditiveBlending,depthWrite:false}));
  auG.add(pts); auShells.push(pts);
});
const auParts=auShells[0];

// ORBITING DATA RINGS around the head
const auRings=[];
for(let i=0;i<6;i++){
  const r=6+i*.8;
  const ar=new T.Mesh(new T.TorusGeometry(r,.015,8,64),
    new T.MeshBasicMaterial({color:i<3?0xff9500:0xffb347,transparent:true,opacity:.18-i*.02}));
  ar.rotation.x=Math.PI*(.15+i*.15);
  ar.rotation.y=Math.PI*(i*.3);
  ar.userData={sp:.15+i*.06,ax:['x','y','z'][i%3]};
  auG.add(ar); auRings.push(ar);
}

// EYE GOD RAYS — light beams from eyes
const rayCone=new T.Mesh(new T.ConeGeometry(1.5,10,16,1,true),
  new T.MeshBasicMaterial({color:0xff9500,transparent:true,opacity:.02,side:T.DoubleSide}));
rayCone.position.set(0,.8,9); rayCone.rotation.x=Math.PI/2;
auG.add(rayCone);

// HOLOGRAPHIC UI PANELS floating around head
const auPanels=[];
for(let i=0;i<8;i++){
  const pw=.6+Math.random()*.8, ph2=.4+Math.random()*.5;
  const panel=new T.Mesh(new T.PlaneGeometry(pw,ph2),
    new T.MeshBasicMaterial({color:0xff9500,transparent:true,opacity:.05,side:T.DoubleSide}));
  const ang=(i/8)*6.28;
  const pr=7+Math.random()*2;
  panel.position.set(Math.cos(ang)*pr,-2+Math.random()*5,Math.sin(ang)*pr);
  panel.lookAt(0,panel.position.y,0);
  const border=new T.Mesh(new T.PlaneGeometry(pw,ph2),
    new T.MeshBasicMaterial({color:0xffb347,wireframe:true,transparent:true,opacity:.1,side:T.DoubleSide}));
  panel.add(border);
  panel.userData={ang,r:pr,oy:panel.position.y,ph:Math.random()*6.28};
  auG.add(panel); auPanels.push(panel);
}

// LIGHTS — divine multi-point
const auLight=new T.PointLight(0xff9500,0,30);
auG.add(auLight);
const auLight2=new T.PointLight(0xffb347,0,20);
auLight2.position.set(0,.8,5); // from eyes
auG.add(auLight2);
const auLight3=new T.PointLight(0xff7a00,0,18);
auLight3.position.y=-4;
auG.add(auLight3);
S.add(auG);

// ═══ VIDEO ZONE — no 3D geometry, just light + position marker ═══
const vmG=new T.Group(); vmG.position.z=-230;
const vmLight=new T.PointLight(0xff9500,0,20); vmLight.position.z=3; vmG.add(vmLight);
S.add(vmG);

// ═══ FINAL PORTAL (z=-260) ═══
const fpG=new T.Group(); fpG.position.z=-260;
const fpRing=new T.Mesh(new T.TorusGeometry(5,.1,24,96),
  new T.MeshBasicMaterial({color:0xff9500,transparent:true,opacity:0}));
fpG.add(fpRing);
for(let i=0;i<3;i++){
  const fr=new T.Mesh(new T.TorusGeometry(5.8+i*.6,.015,8,48),
    new T.MeshBasicMaterial({color:0xffb347,transparent:true,opacity:0}));
  fr.userData={i}; fpG.add(fr);
}
S.add(fpG);

// Export to window for Part 2
W._VA={R,S,cam,coreL,camL,stars,nebulas,parts,pP,pV,pC,embers,eP,eC,
  dG,dRing,dGlow,dLight,syms,tRings,DZ,
  muG,eqBars,swRing,mNotes,vinyl,muLight,
  drG,strokes,drLight,
  wrG,letters,wrLight,
  mdG,wires,hCube,mdLight,
  auG,auOrb,auOrb2,auOrb3,auRings,auHelixes,auShells,auParts,rayCone,auPanels,auLight,auLight2,auLight3,
  vmG,vmLight,
  fpG,fpRing,ribbons};

console.log('🌌 Scene built');
})();
