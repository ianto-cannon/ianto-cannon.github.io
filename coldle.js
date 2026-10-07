// Peaks are loaded from peaks.csv: name,height,prominence,parent,lat,lon,range,country
let P=[],ix={};
function parseCSV(t){const rows=[];let r=[],f="",q=false;
 for(let i=0;i<t.length;i++){const c=t[i];
  if(q){if(c=='"'){if(t[i+1]=='"'){f+='"';i++}else q=false}else f+=c}
  else if(c=='"')q=true;
  else if(c==","){r.push(f);f=""}
  else if(c=="\n"||c=="\r"){if(c=="\r"&&t[i+1]=="\n")i++;r.push(f);rows.push(r);r=[];f=""}
  else f+=c}
 if(f||r.length){r.push(f);rows.push(r)}return rows}
const $=s=>document.querySelector(s),MAX=8,AR="↑↗→↘↓↙←↖";
const par=i=>P[i].par?ix[P[i].par]:-1;
const chain=i=>{const a=[i];while(par(a[a.length-1])>=0)a.push(par(a[a.length-1]));return a};
function link(g,t){const a=chain(g),b=chain(t),l=a.find(x=>b.includes(x));
 const up=[...a.slice(0,a.indexOf(l)),...b.slice(0,b.indexOf(l))];
 const m=up.length?Math.min(...up.map(x=>P[x].col)):P[g].h;
 return{m,l,hops:up.length,pct:Math.round(100*m/Math.min(P[g].h,P[t].h))}}
const colr=p=>p>=50?"var(--ok)":p>=15?"var(--near)":"var(--far)";
const rad=x=>x*Math.PI/180;
function geo(a,b){const dl=rad(b.lo-a.lo),p1=rad(a.la),p2=rad(b.la);
 const h=Math.sin((p2-p1)/2)**2+Math.cos(p1)*Math.cos(p2)*Math.sin(dl/2)**2;
 const y=Math.sin(dl)*Math.cos(p2),x=Math.cos(p1)*Math.sin(p2)-Math.sin(p1)*Math.cos(p2)*Math.cos(dl);
 return[12742*Math.asin(Math.sqrt(h)),AR[Math.round(((Math.atan2(y,x)*180/Math.PI+360)%360)/45)%8]]}
const cmp=(v,t,u)=>t===v?`<span class="c y">✓ ${u}</span>`:`<span class="c n">${u} ${t>v?"↑":"↓"} ${Math.abs(t-v).toLocaleString()} m</span>`;
const shareC=(a,b)=>a.split("/").some(x=>b.split("/").includes(x));
const mm=v=>v?v.toLocaleString()+" m":"sea level";
let mode="daily",T,G=[],done=false;
function start(){const d=Math.floor(Date.now()/864e5);T=mode==="daily"?(d*2654435761>>>0)%P.length:Math.random()*P.length|0;G=[];done=false;sel=null;$("#sel").textContent="Tap a peak on the map, then press Guess.";render()}
function guess(){const g=sel;if(done||g===null||G.includes(g))return;G.push(g);sel=null;if(g===T||G.length>=MAX)done=true;$("#sel").textContent=done?"":"Tap another peak on the map, then press Guess.";render();if(g===T)confetti()}
function confetti(){
 if(matchMedia("(prefers-reduced-motion: reduce)").matches)return;
 const cv=document.createElement("canvas"),x=cv.getContext("2d"),dpr=devicePixelRatio||1;
 cv.style.cssText="position:fixed;inset:0;width:100%;height:100%;pointer-events:none;z-index:99";
 const w=cv.width=innerWidth*dpr,h=cv.height=innerHeight*dpr;document.body.appendChild(cv);
 const b=$("#go").getBoundingClientRect(),ox=(b.left+b.width/2)*dpr,oy=(b.top+b.height/2)*dpr;
 const cols=["#0072b2","#e69f00","#cc79a7","#56b4e9","#009e73","#f0e442"];
 const ps=Array.from({length:160},()=>{const a=-Math.PI/2+(Math.random()-.5)*Math.PI*1.2,v=(6+Math.random()*11)*dpr;
  return{x:ox,y:oy,vx:Math.cos(a)*v,vy:Math.sin(a)*v,s:(6+Math.random()*6)*dpr,r:Math.random()*6,vr:(Math.random()-.5)*.4,c:cols[Math.random()*cols.length|0],life:0}});
 let t0=performance.now();
 (function f(t){const dt=Math.max(0,Math.min(2,(t-t0)/16.7));t0=t;x.clearRect(0,0,w,h);let alive=0;
  for(const p of ps){p.vy+=.35*dpr*dt;p.vx*=.99;p.x+=p.vx*dt;p.y+=p.vy*dt;p.r+=p.vr*dt;p.life+=dt;
   if(p.y<h+20&&p.life<220){alive++;x.save();x.translate(p.x,p.y);x.rotate(p.r);x.globalAlpha=Math.min(1,(220-p.life)/40);x.fillStyle=p.c;x.fillRect(-p.s/2,-p.s/4,p.s,p.s/2);x.restore()}}
  alive?requestAnimationFrame(f):cv.remove()})(t0);
}
function render(){
 const won=G.includes(T),t=P[T];
 $("#rows").innerHTML=G.length?`<table><tr><th>#</th><th>Peak</th><th>Linking col</th><th>Linked</th></tr>${G.map((gi,i)=>{if(gi===T)return`<tr><td>${i+1}</td><td>${P[gi].n}</td><td>🎯 Correct</td><td style="color:var(--ok)">100%</td></tr>`;const k=link(gi,T);return`<tr><td>${i+1}</td><td>${P[gi].n}</td><td>${mm(k.m)}</td><td style="color:${colr(k.pct)}">${k.pct}%</td></tr>`}).join("")}</table>`:"";
 const n=G.length;let h=`Guess ${Math.min(n+1,MAX)} of ${MAX}`;
 if(!done){if(n>=3)h+=` · Hint: its elevation is ${t.h.toLocaleString()} m`;if(n>=5)h+=` · its parent starts with “${(t.par||"—")[0]}”`}
 $("#hint").textContent=done?"":h;
 const s=v=>178-v/9000*168;let m="";
 [0,2000,4000,6000,8000].forEach(v=>m+=`<line x1="28" x2="360" y1="${s(v)}" y2="${s(v)}" stroke="var(--bd)" stroke-width=".5"/><text x="2" y="${s(v)+3}" fill="currentcolor" font-size="8">${v}</text>`);
 const nm=n=>n.length>17?n.slice(0,16)+"…":n,
  name=(x,n)=>`<text transform="translate(${x+3} 184) rotate(-45)" text-anchor="end" font-size="7.5" fill="currentColor">${nm(n)}</text>`,
  bar=(x,p,f,b)=>{const y0=s(0),yb=s(b),yh=s(p.h);return(b<p.h?`<rect x="${x-7}" y="${yh}" width="14" height="${y0-yh}" rx="2" fill="var(--mut)" opacity=".5"/>`:"")+`<rect x="${x-7}" y="${yb}" width="14" height="${y0-yb}" fill="${f}" opacity=".9"/>`};
 G.forEach((gi,i)=>{const x=48+i*38,g=P[gi],w=gi===T,m0=w?g.h:link(gi,T).m,top=s(g.h),yb=s(m0);
  m+=bar(x,g,w?"var(--ok)":colr(link(gi,T).pct),m0)+`<text x="${x}" y="${top-3}" font-size="7.5" text-anchor="middle" fill="currentColor">${g.h.toLocaleString()}</text>`+(w?"":`<text x="${x}" y="${yb-top>10?yb-2:yb+9}" font-size="7.5" font-weight="bold" text-anchor="middle" fill="currentColor">${m0.toLocaleString()}</text>`)+name(x,g.n)});
 if(done&&!won)m+=bar(345,t,"currentColor",t.col)+`<text x="345" y="${s(t.h)-3}" font-size="9" text-anchor="middle">⭐</text>`+name(345,t.n);
 $("#ch").innerHTML=m;drawMap();if(done)$("#sel").textContent="Round over. Pick Random for another peak.";
 if(done){const c=chain(T);
  $("#end").innerHTML=`<div class="msg"><b>${won?`Got it in ${G.length}!`:"Out of guesses."}</b> The peak was <b>${t.n}</b> (${t.r}, ${t.c}), ${t.h.toLocaleString()} m high with ${t.p.toLocaleString()} m of prominence.<br><p><button id="sh">Share results</button> <span id="shm" class="hint"></span></p></div>`;$("#sh").onclick=share}else $("#end").innerHTML="";
}
// Map: Lambert cylindrical equal-area (x = lon, y = sin lat), geometry from map.svg (1 unit = 1 km at the equator)
let MV={W:40030,H:12742,R:6371,lon0:0},vb={x:0,y:0,w:40030,h:12742},sel=null,moved=false,dr=null,pin=null;
const MAXZ=150,ptr=new Map(),mp=$("#mp"),pk=$("#pk"),bg=$("#bg");
function proj(la,lo){const d=((lo-MV.lon0+540)%360)-180;return[MV.W/2+MV.R*rad(d),MV.H/2-MV.R*Math.sin(rad(la))]}
async function load(){
 const [c,t]=await Promise.all(["peaks.csv","map.svg"].map(u=>fetch(u).then(r=>{if(!r.ok)throw new Error(u+" "+r.status);return r.text()})));
 P=parseCSV(c).slice(1).filter(a=>a.length>=8).map(a=>({n:a[0],h:+a[1],p:+a[2],par:a[3],la:+a[4],lo:+a[5],r:a[6],c:a[7]}));
 P.forEach((p,i)=>{p.col=p.h-p.p;ix[p.n]=i});
 const svg=new DOMParser().parseFromString(t,"image/svg+xml").documentElement,g=n=>+svg.getAttribute("data-"+n);
 MV={W:svg.viewBox.baseVal.width,H:svg.viewBox.baseVal.height,R:g("r"),lon0:g("lon0")};
 bg.replaceChildren(...[...svg.childNodes].map(n=>document.importNode(n,true)));
 P.forEach(p=>{[p.x,p.y]=proj(p.la,p.lo)});
 home()}
const asp=()=>{const r=mp.getBoundingClientRect();return r.height?r.width/r.height:MV.W/MV.H},minW=()=>MV.W/MAXZ,maxW=()=>Math.min(MV.W,MV.H*asp());
function home(){const w=maxW(),h=w/asp(),cx=proj(0,60)[0];vb={x:cx-w/2,y:(MV.H-h)/2,w,h}}
function clampV(){vb.w=Math.max(minW(),Math.min(maxW(),vb.w));vb.h=vb.w/asp();vb.x=Math.max(0,Math.min(MV.W-vb.w,vb.x));vb.y=Math.max(0,Math.min(MV.H-vb.h,vb.y))}
const at=(cx,cy)=>{const r=mp.getBoundingClientRect();return[vb.x+(cx-r.left)/r.width*vb.w,vb.y+(cy-r.top)/r.height*vb.h]};
function zoomAt(f,cx,cy){const r=mp.getBoundingClientRect(),[mx,my]=at(cx,cy),nw=Math.max(minW(),Math.min(maxW(),vb.w*f)),nh=nw/asp();
 vb.x=mx-(cx-r.left)/r.width*nw;vb.y=my-(cy-r.top)/r.height*nh;vb.w=nw;drawMap()}
function zoom(f){if(!P.length)return;const r=mp.getBoundingClientRect();zoomAt(f,r.left+r.width/2,r.top+r.height/2)}
function resetMap(){home();drawMap()}
addEventListener("resize",()=>{if(P.length)drawMap()});
function drawMap(){clampV();const u=vb.w/(mp.clientWidth||640),fr=vb.w/MV.W;
 mp.setAttribute("viewBox",`${vb.x} ${vb.y} ${vb.w} ${vb.h}`);
 let s="";
 P.forEach((p,i)=>{const gi=G.indexOf(i);let f="var(--mut)";
  if(gi>=0)f=i===T?"var(--ok)":colr(link(i,T).pct);else if(done&&i===T)f="currentColor";
  const on=i===sel,x=p.x.toFixed(1),y=p.y.toFixed(1);
  s+=`<circle cx="${x}" cy="${y}" r="${((on?6.5:5)*u).toFixed(1)}" fill="${f}" stroke="${on?"currentColor":"var(--card)"}" stroke-width="${((on?2.2:1)*u).toFixed(1)}"/>`;
  if(fr<=.28||on||(gi>=0&&fr<=.56))s+=`<text x="${(p.x+8*u).toFixed(1)}" y="${(p.y+4*u).toFixed(1)}" font-size="${(12*u).toFixed(1)}" fill="black" stroke="var(--card)" stroke-width="${(3.5*u).toFixed(1)}" paint-order="stroke" style="pointer-events:none">${p.n}</text>`});
 pk.innerHTML=s}
function pick(cx,cy){const[mx,my]=at(cx,cy),k=vb.w/mp.getBoundingClientRect().width;let b=-1,bd=(20*k)**2;
 P.forEach((p,i)=>{const d=(p.x-mx)**2+(p.y-my)**2;if(d<bd){bd=d;b=i}});return b}
function select(i){sel=i;$("#sel").textContent=`Selected: ${P[i].n}. Press Guess to confirm.`;drawMap()}
// pointer events: one pointer pans, two pointers pinch-zoom (and pan with the midpoint)
const mid=()=>{const[a,b]=[...ptr.values()];return{x:(a.x+b.x)/2,y:(a.y+b.y)/2,d:Math.hypot(a.x-b.x,a.y-b.y)||1}};
const startPin=()=>{const m=mid();pin={d:m.d,w:vb.w,at:at(m.x,m.y)}};
mp.onpointerdown=e=>{if(!P.length)return;mp.setPointerCapture(e.pointerId);ptr.set(e.pointerId,{x:e.clientX,y:e.clientY});
 if(ptr.size===1){moved=false;dr={x:e.clientX,y:e.clientY,vx:vb.x,vy:vb.y}}
 else if(ptr.size===2){moved=true;dr=null;startPin()}};
mp.onpointermove=e=>{if(!ptr.has(e.pointerId)){ // hover: pointer cursor over a selectable peak
  if(e.pointerType==="mouse"&&P.length)mp.style.cursor=!done&&pick(e.clientX,e.clientY)>=0?"pointer":"grab";return}
 ptr.set(e.pointerId,{x:e.clientX,y:e.clientY});
 const r=mp.getBoundingClientRect();
 if(ptr.size>=2&&pin){const m=mid(),nw=Math.max(minW(),Math.min(maxW(),pin.w*pin.d/m.d)),nh=nw/asp();
  vb.w=nw;vb.x=pin.at[0]-(m.x-r.left)/r.width*nw;vb.y=pin.at[1]-(m.y-r.top)/r.height*nh;drawMap()}
 else if(dr){const dx=e.clientX-dr.x,dy=e.clientY-dr.y;if(Math.abs(dx)+Math.abs(dy)>5)moved=true;
  if(moved){const k=vb.w/r.width;vb.x=dr.vx-dx*k;vb.y=dr.vy-dy*k;drawMap()}}};
const endPtr=e=>{if(!ptr.delete(e.pointerId))return;
 if(ptr.size===2)startPin();
 else if(ptr.size===1){const[p]=ptr.values();dr={x:p.x,y:p.y,vx:vb.x,vy:vb.y};pin=null}
 else if(ptr.size===0){dr=pin=null;
  if(e.type==="pointerup"&&!moved&&!done){const i=pick(e.clientX,e.clientY);if(i>=0)select(i)}}};
mp.onpointerup=mp.onpointercancel=endPtr;
mp.addEventListener("wheel",e=>{e.preventDefault();if(!P.length)return;zoomAt(Math.exp(Math.max(-100,Math.min(100,e.deltaY))*(e.deltaMode===1?.05:.0015)),e.clientX,e.clientY)},{passive:false});
$("#go").onclick=guess;
document.querySelectorAll("input[name=mode]").forEach(r=>r.onchange=()=>{mode=r.value;start()});
function share(){const won=G.includes(T),hi=Math.max(...P.map(p=>p.h)),
  sq=G.map(g=>"▁▂▃▄▅▆▇█"[Math.round((g===T?P[g].h:link(g,T).m)/hi*7)]).join("")+(won?"🎯":"");
 const txt=`Coldle ${mode==="daily"?new Date().toISOString().slice(0,10):"(random)"} ${won?G.length:"X"}/${MAX}\n${sq}\nhttps://ianto-cannon.github.io/coldle.html`;
 const fb=()=>{const m=$("#shm");m.textContent="";const ta=document.createElement("textarea");ta.value=txt;ta.readOnly=true;ta.rows=8;ta.style.width="100%";m.appendChild(ta);ta.select()};
 if(navigator.clipboard)navigator.clipboard.writeText(txt).then(()=>{$("#shm").textContent="Copied to clipboard"},fb);else fb()}
load().then(start).catch(e=>{$("#sel").textContent="Could not load map data: "+e.message});
