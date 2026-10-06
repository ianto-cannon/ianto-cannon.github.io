// name, height m, prominence m, prominence parent, lat, lon, range, country
const D=[
["Everest",8849,8849,"",27.99,86.93,"Himalayas","China/Nepal"],
["Aconcagua",6961,6961,"Everest",-32.65,-70.01,"Andes","Argentina"],
["Denali",6190,6155,"Aconcagua",63.07,-151.01,"Alaska Range","USA"],
["Kilimanjaro",5895,5885,"Everest",-3.07,37.36,"Eastern Rift","Tanzania"],
["Pico Simón Bolívar",5720,5529,"Aconcagua",10.84,-73.69,"Sierra Nevada de Santa Marta","Colombia"],
["Mount Logan",5959,5250,"Denali",60.57,-140.40,"Saint Elias Mtns","Canada"],
["Pico de Orizaba",5636,4922,"Mount Logan",19.03,-97.27,"Trans-Mexican Volcanic Belt","Mexico"],
["Vinson Massif",4892,4892,"Everest",-78.53,-85.62,"Sentinel Range","Antarctica"],
["Puncak Jaya",4884,4884,"Everest",-4.08,137.18,"Sudirman Range","Indonesia"],
["Elbrus",5642,4741,"Everest",43.35,42.44,"Caucasus","Russia"],
["Mont Blanc",4808,4695,"Everest",45.83,6.87,"Alps","France/Italy"],
["Damavand",5610,4667,"Elbrus",35.96,52.11,"Alborz","Iran"],
["Klyuchevskaya Sopka",4750,4649,"Everest",56.07,160.63,"Kamchatka","Russia"],
["Nanga Parbat",8125,4608,"Everest",35.24,74.59,"Himalayas","Pakistan"],
["Mauna Kea",4205,4205,"Everest",19.82,-155.47,"Hawaii","USA"],
["Jengish Chokusu",7439,4148,"Everest",42.03,80.13,"Tian Shan","China/Kyrgyzstan"],
["Bogda Peak",5445,4122,"Everest",43.80,88.34,"Bogda Shan","China"],
["Chimborazo",6263,4118,"Aconcagua",-1.47,-78.82,"Cordillera Occidental","Ecuador"],
["Namcha Barwa",7782,4106,"Everest",29.63,95.06,"Himalayas","China"],
["Mount Kinabalu",4095,4095,"Everest",6.08,116.56,"Crocker Range","Malaysia"],
["Mount Rainier",4393,4029,"Pico de Orizaba",46.85,-121.76,"Cascades","USA"],
["K2",8611,4020,"Everest",35.88,76.51,"Karakoram","China/Pakistan"],
["Ras Dashen",4550,3997,"Kilimanjaro",13.24,38.37,"Simien Mtns","Ethiopia"],
["Volcán Tajumulco",4220,3980,"Pico de Orizaba",15.03,-91.90,"Sierra Madre de Chiapas","Guatemala"],
["Pico Bolívar",4981,3957,"Chimborazo",8.54,-71.05,"Sierra Nevada de Mérida","Venezuela"],
["Mount Fairweather",4671,3946,"Mount Logan",58.91,-137.53,"Saint Elias Mtns","Canada/USA"],
["Yushan",3952,3952,"Everest",23.47,120.96,"Yushan Range","Taiwan"],
["Mount Stanley",5109,3951,"Kilimanjaro",0.39,29.87,"Rwenzori","DR Congo/Uganda"],
["Kangchenjunga",8586,3922,"Everest",27.70,88.13,"Himalayas","India/Nepal"],
["Tirich Mir",7708,3908,"K2",36.25,71.84,"Hindu Kush","Pakistan"],
["Mount Cameroon",4040,3901,"Mount Stanley",4.22,9.17,"Cameroon line","Cameroon"],
["Mount Kenya",5199,3825,"Kilimanjaro",-0.10,37.20,"Eastern Rift","Kenya"],
["Mount Kerinci",3805,3805,"Everest",-1.70,101.26,"Barisan Mtns","Indonesia"],
["Mount Erebus",3794,3794,"Everest",-77.53,167.28,"Ross Island","Antarctica"],
["Mount Fuji",3776,3776,"Everest",35.36,138.73,"Honshu","Japan"],
["Toubkal",4167,3757,"Mount Stanley",31.06,-7.92,"Atlas","Morocco"],
["Cerro Chirripó",3820,3727,"Chimborazo",9.48,-83.49,"Talamanca","Costa Rica"],
["Mount Rinjani",3726,3726,"Everest",-8.42,116.47,"Lombok","Indonesia"],
["Aoraki / Mount Cook",3724,3724,"Everest",-43.60,170.14,"Southern Alps","New Zealand"],
["Teide",3715,3715,"Everest",28.27,-16.64,"Tenerife","Spain"],
["Mount Boising",4150,3709,"Puncak Jaya",-5.80,146.10,"Finisterre Range","Papua New Guinea"],
["Monte San Valentín",4058,3696,"Aconcagua",-46.60,-73.35,"Andes","Chile"],
["Gunnbjørn Fjeld",3694,3694,"Everest",68.92,-29.90,"Watkins Range","Greenland"],
["Ojos del Salado",6893,3688,"Aconcagua",-27.11,-68.54,"Andes","Argentina/Chile"],
["Semeru",3676,3676,"Everest",-8.10,112.92,"Java","Indonesia"],
["Ritacuba Blanco",5410,3645,"Chimborazo",6.49,-72.30,"Cordillera Oriental","Colombia"],
["Mount Gongga",7556,3642,"K2",29.60,101.88,"Daxue Shan","China"],
["Mount Ararat",5137,3611,"Damavand",39.70,44.30,"Armenian Highlands","Turkey"],
["Kongur Tagh",7649,3585,"K2",38.59,75.31,"Kongur Shan","China"],
["Mount Blackburn",4996,3535,"Mount Logan",61.73,-143.44,"Wrangell Mtns","USA"]];
const P=D.map(a=>({n:a[0],h:a[1],p:a[2],par:a[3],la:a[4],lo:a[5],r:a[6],c:a[7],col:a[1]-a[2]}));
const ix={};P.forEach((p,i)=>ix[p.n]=i);
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
function guess(){const g=sel;if(done||g===null||G.includes(g))return;G.push(g);sel=null;if(g===T||G.length>=MAX)done=true;$("#sel").textContent=done?"":"Tap another peak on the map, then press Guess.";render()}
function render(){
 const won=G.includes(T),t=P[T];
 $("#rows").innerHTML=G.length?`<table><tr><th>#</th><th>Peak</th><th>Linking col</th><th>Linked</th></tr>${G.map((gi,i)=>{if(gi===T)return`<tr><td>${i+1}</td><td>${P[gi].n}</td><td>🎯 Correct</td><td style="color:var(--ok)">100%</td></tr>`;const k=link(gi,T);return`<tr><td>${i+1}</td><td>${P[gi].n}</td><td>${mm(k.m)}</td><td style="color:${colr(k.pct)}">${k.pct}%</td></tr>`}).join("")}</table>`:"";
 const n=G.length;let h=`Guess ${Math.min(n+1,MAX)} of ${MAX}`;
 if(!done){if(n>=3)h+=` · Hint: its key col is at ${mm(t.col)}`;if(n>=5)h+=` · its parent starts with “${(t.par||"—")[0]}”`}
 $("#hint").textContent=done?"":h;
 const s=v=>178-v/9000*168;let m="";
 [0,2000,4000,6000,8000].forEach(v=>m+=`<line x1="28" x2="360" y1="${s(v)}" y2="${s(v)}" stroke="var(--bd)" stroke-width=".5"/><text x="2" y="${s(v)+3}" fill="currentcolor" font-size="8">${v}</text>`);
 const bar=(x,p,f,b)=>`<rect x="${x-7}" y="${s(p.h)}" width="14" height="${s(b)-s(p.h)}" rx="2" fill="${f}" opacity=".85"/>`;
 G.forEach((gi,i)=>{const x=48+i*38,g=P[gi],w=gi===T,m0=w?g.col:link(gi,T).m;
  m+=bar(x,g,w?"var(--ok)":colr(link(gi,T).pct),m0)+`<text x="${x}" y="${s(g.h)-3}" font-size="8" text-anchor="middle">${i+1}</text><text x="${x}" y="${s(m0)+9}" font-size="7.5" font-weight="bold" text-anchor="middle" fill="currentColor">${w?"":m0.toLocaleString()}</text>`});
 if(done&&!won)m+=bar(345,t,"currentColor",t.col)+`<text x="345" y="${s(t.col)+10}" font-size="9" text-anchor="middle">⭐</text>`;
 $("#ch").innerHTML=m;drawMap();if(done)$("#sel").textContent="Round over. Pick Random for another peak.";
 if(done){const c=chain(T);
  $("#end").innerHTML=`<div class="msg"><b>${won?`Got it in ${G.length}!`:"Out of guesses."}</b> The peak was <b>${t.n}</b> (${t.r}, ${t.c}), ${t.h.toLocaleString()} m high with ${t.p.toLocaleString()} m of prominence.<br><p><button id="sh">Share results</button> <span id="shm" class="hint"></span></p></div>`;$("#sh").onclick=share}else $("#end").innerHTML="";
}
const Y0=0,H=180,R=H/360;let vb={x:0,y:Y0,w:360},sel=null,moved=false,dr=null;
const mp=$("#mp"),pk=$("#pk");
function clampV(){vb.w=Math.max(10,Math.min(360,vb.w));vb.x=Math.max(0,Math.min(360-vb.w,vb.x));vb.y=Math.max(Y0,Math.min(Y0+H-vb.w*R,vb.y))}
function zoom(f){const cx=vb.x+vb.w/2,cy=vb.y+vb.w*R/2;vb.w*=f;vb.x=cx-vb.w/2;vb.y=cy-vb.w*R/2;drawMap()}
function resetMap(){vb={x:0,y:Y0,w:360};drawMap()}
function drawMap(){clampV();const sc=vb.w/360;mp.setAttribute("viewBox",`${vb.x} ${vb.y} ${vb.w} ${vb.w*R}`);
 let s="";
 P.forEach((p,i)=>{const gi=G.indexOf(i);let f="var(--mut)";
  if(gi>=0)f=i===T?"var(--ok)":colr(link(i,T).pct);else if(done&&i===T)f="currentColor";
  const x=p.lo+180,y=90-p.la,on=i===sel;
  s+=`<circle data-i="${i}" cx="${x}" cy="${y}" r="${(on?3.6:3)*sc}" fill="${f}" stroke="${on?"currentColor":"var(--card)"}" stroke-width="${(on?1.4:.6)*sc}" style="cursor:pointer"/>`;
  if(vb.w<=100||on||(gi>=0&&vb.w<=200))s+=`<text x="${x+4.5*sc}" y="${y+sc}" font-size="${7*sc}" fill="black" stroke="var(--card)" stroke-width="${2*sc}" paint-order="stroke" style="pointer-events:none">${p.n}</text>`});
 pk.innerHTML=s}
mp.onpointerdown=e=>{dr={x:e.clientX,y:e.clientY,vx:vb.x,vy:vb.y};moved=false};
mp.onpointermove=e=>{if(!dr)return;const dx=e.clientX-dr.x,dy=e.clientY-dr.y;if(Math.abs(dx)+Math.abs(dy)>5)moved=true;
 if(moved){const k=vb.w/mp.getBoundingClientRect().width;vb.x=dr.vx-dx*k;vb.y=dr.vy-dy*k;drawMap()}};
mp.onpointerup=mp.onpointerleave=()=>{dr=null};
mp.onclick=e=>{if(moved||done)return;const c=e.target.closest("circle");if(!c)return;sel=+c.dataset.i;
 $("#sel").textContent=`Selected: ${P[sel].n}. Press Guess to confirm.`;drawMap()};
mp.addEventListener("wheel",e=>{e.preventDefault();zoom(Math.exp(Math.max(-100,Math.min(100,e.deltaY))*(e.deltaMode===1?.05:.0015)))},{passive:false});
$("#go").onclick=guess;
document.querySelectorAll("input[name=mode]").forEach(r=>r.onchange=()=>{mode=r.value;start()});
function share(){const won=G.includes(T),pc=g=>link(g,T).pct,sq=G.map(g=>g===T?"🎯":pc(g)>=50?"🟩":pc(g)>=15?"🟨":"🟥").join("");
 const txt=`Coldle ${mode==="daily"?new Date().toISOString().slice(0,10):"(random)"} ${won?G.length:"X"}/${MAX}\n${sq}\nhttps://ianto-cannon.github.io/coldle.html`;
 const fb=()=>{const m=$("#shm");m.textContent="";const ta=document.createElement("textarea");ta.value=txt;ta.readOnly=true;ta.rows=4;ta.style.width="100%";m.appendChild(ta);ta.select()};
 if(navigator.clipboard)navigator.clipboard.writeText(txt).then(()=>{$("#shm").textContent="Copied to clipboard"},fb);else fb()}
start();
