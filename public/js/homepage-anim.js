/* VirtuArts Cinematic Engine — Animation Loop + Scroll Controller */
(function(){
'use strict';
const V=window._VA; if(!V) return;
const {R,S,cam,coreL,camL,stars,nebulas,parts,pP,pV,pC,embers,eP,eC,
  dG,dRing,dGlow,dLight,syms,tRings,DZ,
  muG,eqBars,swRing,mNotes,vinyl,muLight,
  drG,strokes,drLight,
  wrG,letters,wrLight,
  mdG,wires,hCube,mdLight,
  auG,auOrb,auOrb2,auOrb3,auRings,auHelixes,auShells,auParts,rayCone,auPanels,auLight,auLight2,auLight3,
  vmG,vmLight,
  fpG,fpRing,ribbons}=V;

gsap.registerPlugin(ScrollTrigger);

const DEPTH=-280;
let sp=0; // scroll progress 0→1
const mouse={x:0,y:0,sx:0,sy:0};
window.addEventListener('mousemove',e=>{
  mouse.x=(e.clientX/window.innerWidth)*2-1;
  mouse.y=-(e.clientY/window.innerHeight)*2+1;
});

// Zones
const Z={
  void:[0,.06],hero:[.03,.10],approach:[.08,.20],door:[.18,.28],enter:[.26,.33],
  music:[.32,.43],draw:[.43,.54],write:[.54,.65],model:[.65,.76],
  aura:[.76,.85],video:[.83,.91],finale:[.90,1]
};
function inZ(n){return sp>=Z[n][0]&&sp<=Z[n][1]}
function zp(n){const z=Z[n];return Math.max(0,Math.min(1,(sp-z[0])/(z[1]-z[0])))}

// GSAP ScrollTrigger
ScrollTrigger.create({
  trigger:'#scrollSpacer',start:'top top',end:'bottom bottom',scrub:.6,
  onUpdate:s=>{sp=s.progress}
});

// Overlay text controller
function updateUI(){
  const map={textHero:Z.hero,textDoor:Z.approach,textMusic:Z.music,textDraw:Z.draw,
    textWrite:Z.write,text3D:Z.model,textAura:Z.aura};
  for(const[id,z]of Object.entries(map)){
    const el=document.getElementById(id);
    if(!el) continue;
    const mid=(z[0]+z[1])/2, hw=(z[1]-z[0])/2;
    el.classList.toggle('active',sp>=z[0]&&sp<=z[1]&&Math.abs(sp-mid)<hw*.75);
  }
  // Video wrap
  const vw=document.getElementById('videoWrap');
  if(vw) vw.classList.toggle('active',sp>=Z.video[0]&&sp<=Z.video[1]);
  // Final CTA
  const fc=document.getElementById('finalCTA');
  if(fc) fc.classList.toggle('active',sp>.94);
  // Scroll cue
  const sc=document.getElementById('scrollCue');
  if(sc) sc.classList.toggle('show',sp<.04);
  // Progress bar
  const pb=document.getElementById('cinProgress');
  if(pb) pb.style.width=(sp*100)+'%';
  // Floating hero images — all show during hero section only
  const heroActive=sp>=.02&&sp<=.12;
  ['floatMusic','floatBrush','floatPalette','floatPen','floatGamepad'].forEach(id=>{
    const el=document.getElementById(id);
    if(el) el.classList.toggle('show',heroActive);
  });
}

// Video play handler
const vid=document.getElementById('cinVideo');
const vPlay=document.getElementById('videoPlay');
if(vPlay&&vid){
  vPlay.addEventListener('click',()=>{
    vPlay.style.opacity='0';vPlay.style.pointerEvents='none';
    vid.muted=false;vid.play();
  });
}

// ═══ ANIMATION LOOP ═══
const clock=new THREE.Clock();

function animate(){
  requestAnimationFrame(animate);
  const t=clock.getElapsedTime();

  // Smooth mouse
  mouse.sx+=(mouse.x-mouse.sx)*.035;
  mouse.sy+=(mouse.y-mouse.sy)*.035;

  // ── Camera ──
  cam.position.z=sp*DEPTH;
  cam.position.x=mouse.sx*1.5;
  cam.position.y=mouse.sy*1;
  cam.lookAt(cam.position.x*.2,cam.position.y*.15,cam.position.z-12);

  // Camera light follows
  camL.position.copy(cam.position);
  camL.position.z-=2;
  coreL.position.set(0,0,cam.position.z-8);
  coreL.intensity=.4+sp*2.5;

  // Dynamic fog
  let fogD=.015;
  if(inZ('enter')) fogD+=zp('enter')*.08;
  if(sp>.33) fogD=.01;
  if(inZ('aura')) fogD=.008;
  S.fog.density=fogD;

  // ── BACKGROUND LAYERS ──
  // Stars parallax (far, slow)
  stars.position.z=cam.position.z*.15;
  stars.rotation.y=t*.003;

  // Nebulas drift
  nebulas.forEach(n=>{
    n.position.y=n.userData.oy+Math.sin(t*n.userData.sp+n.userData.ph)*.8;
    n.scale.setScalar(1+Math.sin(t*.3+n.userData.ph)*.1);
  });

  // Near particles
  const pp=parts.geometry.attributes.position.array;
  for(let i=0;i<pC;i++){
    const i3=i*3;
    pp[i3]+=pV[i3]+Math.sin(t+i*.01)*.001;
    pp[i3+1]+=pV[i3+1]+Math.cos(t*.7+i*.01)*.001;
    if(pp[i3]>15)pp[i3]=-15;if(pp[i3]<-15)pp[i3]=15;
    if(pp[i3+1]>15)pp[i3+1]=-15;if(pp[i3+1]<-15)pp[i3+1]=15;
  }
  parts.geometry.attributes.position.needsUpdate=true;

  // Embers float up
  const ep=embers.geometry.attributes.position.array;
  for(let i=0;i<eC;i++){
    ep[i*3+1]+=.008+Math.sin(t+i)*.003;
    if(ep[i*3+1]>8){ep[i*3+1]=-8;ep[i*3]=(Math.random()-.5)*15;}
  }
  embers.geometry.attributes.position.needsUpdate=true;

  // Energy ribbons pulse
  ribbons.forEach((r,i)=>{
    r.material.opacity=.08+Math.sin(t*.5+i)*0.05;
  });

  // ── DOOR ──
  const dDist=Math.abs(cam.position.z-DZ);
  dG.visible=dDist<35;
  if(dG.visible){
    dRing.rotation.z=t*.08;
    const ap=zp('approach'), dp=zp('door');
    dGlow.material.opacity=ap*.1+dp*.08;
    dLight.intensity=ap*3+dp*4;
    dRing.material.emissiveIntensity=.25+ap*1.2+dp*.8;
    dRing.scale.setScalar(1+dp*.6);
    // Mouse reactivity on door
    dG.rotation.y=mouse.sx*.08;
    dG.rotation.x=mouse.sy*.05;
    // Symbols orbit
    syms.forEach(s=>{
      s.userData.a+=s.userData.sp*.012;
      s.position.x=Math.cos(s.userData.a)*s.userData.r;
      s.position.y=Math.sin(s.userData.a)*s.userData.r*.5+s.userData.yo;
      s.position.z=Math.sin(s.userData.a*1.5)*.6;
      s.rotation.x=t*.4;s.rotation.y=t*.6;
    });
    // Deco rings
    dG.children.forEach(c=>{if(c.userData.sp)c.rotation.z+=c.userData.sp*c.userData.dir*.008;});
  }

  // Tunnel
  const ep2=zp('enter');
  tRings.forEach((r,i)=>{
    r.material.opacity=ep2>.1?Math.min(.25,ep2*.4)*(1-i/tRings.length):0;
    r.rotation.z=t*.25*(i%2?1:-1);
    r.scale.setScalar(1+Math.sin(t*2+i)*.05);
  });

  // ── MUSIC WORLD ──
  muG.visible=Math.abs(cam.position.z-muG.position.z)<28;
  if(muG.visible){
    const mp=zp('music');
    muLight.intensity=mp*3;
    eqBars.forEach(b=>{
      const h=b.userData.bh*(.4+Math.sin(t*3.5+b.userData.ph)*.6);
      b.scale.y=h;b.position.y=-2.5+h*.25;
    });
    swRing.rotation.z=t*.3;
    swRing.scale.setScalar(1+Math.sin(t*2)*.15);
    vinyl.rotation.z=t*.4;
    mNotes.forEach(n=>{n.position.y=n.userData.oy+Math.sin(t*1.2+n.userData.ph)*.5;});
  }

  // ── DRAWING WORLD ──
  drG.visible=Math.abs(cam.position.z-drG.position.z)<28;
  if(drG.visible){
    drLight.intensity=zp('draw')*2.5;
    strokes.forEach((s,i)=>{s.material.opacity=.2+Math.sin(t*.8+i)*.15;});
  }

  // ── WRITING WORLD ──
  wrG.visible=Math.abs(cam.position.z-wrG.position.z)<28;
  if(wrG.visible){
    wrLight.intensity=zp('write')*2;
    letters.forEach(l=>{
      l.position.y=l.userData.oy+Math.sin(t*.8+l.userData.ph)*.35;
      l.rotation.z+=l.userData.rs;
    });
  }

  // ── 3D WORLD ──
  mdG.visible=Math.abs(cam.position.z-mdG.position.z)<28;
  if(mdG.visible){
    mdLight.intensity=zp('model')*3;
    wires.forEach(m=>{m.rotation.x+=m.userData.rx;m.rotation.y+=m.userData.ry;});
    hCube.rotation.x=t*.35;hCube.rotation.y=t*.5;
    hCube.scale.setScalar(1+Math.sin(t*1.8)*.12);
  }

  // ── AURA AI — GIANT AI HEAD ──
  auG.visible=Math.abs(cam.position.z-auG.position.z)<35;
  if(auG.visible){
    const aurP=zp('aura');
    // Skull wireframe breathes
    const breathe=1+Math.sin(t*.8)*.03;
    auOrb.scale.set(breathe,breathe*1.25,breathe*1.1);
    auOrb.material.opacity=.08+Math.sin(t*1.5)*.04;
    auOrb2.scale.set(breathe,breathe*1.25,breathe*1.1);
    // Eyes pulse intensely
    const eyePulse=.5+Math.sin(t*3)*.3;
    auG.children.forEach(c=>{
      if(c.geometry&&c.geometry.type==='SphereGeometry'&&c.geometry.parameters.radius===.35){
        c.material.opacity=eyePulse;
      }
    });
    // Visor flicker
    const visorObj=auG.children.find(c=>c.geometry&&c.geometry.type==='BoxGeometry'&&c.geometry.parameters.width===6);
    if(visorObj) visorObj.material.opacity=.18+Math.sin(t*4)*.08;
    // Data rings orbit
    auRings.forEach(r=>{r.rotation[r.userData.ax]+=r.userData.sp*.005;});
    // Neural circuits shimmer
    auHelixes.forEach((h,i)=>{h.material.opacity=.08+Math.sin(t*1.2+i)*.06;});
    // Brain particle shells counter-rotate
    auShells[0].rotation.y=t*.12;
    auShells[0].rotation.x=Math.sin(t*.2)*.1;
    auShells[1].rotation.y=-t*.06;
    auShells[1].rotation.z=Math.sin(t*.15)*.08;
    if(auShells[2]){auShells[2].rotation.y=t*.03;auShells[2].rotation.x=Math.cos(t*.1)*.06;}
    // Eye god-ray cone pulsates
    rayCone.material.opacity=.015+Math.sin(t*.8)*.012;
    rayCone.scale.set(1+Math.sin(t*.5)*.1,1,1+Math.sin(t*.5)*.1);
    // Holographic panels orbit around head
    auPanels.forEach(p=>{
      p.userData.ang+=.002;
      p.position.x=Math.cos(p.userData.ang)*p.userData.r;
      p.position.z=Math.sin(p.userData.ang)*p.userData.r;
      p.position.y=p.userData.oy+Math.sin(t*.4+p.userData.ph)*.5;
      p.lookAt(0,p.position.y,0);
      p.material.opacity=.03+aurP*.07;
    });
    // Divine illumination — eyes light up the scene
    auLight.intensity=aurP*6;
    auLight2.intensity=aurP*4+Math.sin(t*3)*.5; // eye light pulses
    auLight3.intensity=aurP*2;
    // Mouse reactivity — head subtly tracks cursor
    auG.rotation.y=mouse.sx*.08;
    auG.rotation.x=mouse.sy*.05;
  }

  // ── VIDEO ZONE ──
  vmG.visible=Math.abs(cam.position.z-vmG.position.z)<30;
  if(vmG.visible){
    vmLight.intensity=zp('video')*3;
  }

  // ── FINAL PORTAL ──
  fpG.visible=sp>.88;
  if(fpG.visible){
    const fp=zp('finale');
    fpRing.material.opacity=fp*.4;
    fpRing.rotation.z=t*.06;
    fpG.children.forEach(c=>{
      if(c.userData.i!==undefined){
        c.material.opacity=fp*.15;
        c.rotation.z=-t*.04*(c.userData.i+1);
      }
    });
  }

  // ── UI ──
  updateUI();

  // ── Render ──
  R.render(S,cam);
}

// Resize
window.addEventListener('resize',()=>{
  cam.aspect=window.innerWidth/window.innerHeight;
  cam.updateProjectionMatrix();
  R.setSize(window.innerWidth,window.innerHeight);
});

// Cursor glow
const cEl=document.getElementById('cinCursor');
if(cEl) document.addEventListener('mousemove',e=>{cEl.style.left=e.clientX+'px';cEl.style.top=e.clientY+'px';});

// CTA button hover → energy pulse
const enterBtn=document.getElementById('enterBtn');
if(enterBtn){
  enterBtn.addEventListener('mouseenter',()=>{
    camL.intensity=2;
    gsap.to(camL,{intensity:.3,duration:1.5,ease:'power2.out'});
  });
}

// Loader dismiss
setTimeout(()=>{
  const l=document.getElementById('cinLoader');
  if(l)l.classList.add('done');
  document.getElementById('scrollCue')?.classList.add('show');
},2400);

animate();
console.log('✨ VirtuArts Engine — Live');
})();
