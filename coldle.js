// Coldle — guess the mystery peak.
// Peaks come from peaks.csv: name,height,prominence,parent,lat,lon,range,country.
// The map is a Lambert cylindrical equal-area projection (x = longitude, y = sin latitude);
// its geometry comes from map.svg, where 1 unit = 1 km at the equator.

// ── CSV parsing ──────────────────────────────────────────────────────────────
// Parse CSV text into rows of string fields. Handles quoted fields (""
// inside quotes is a literal quote) and \r\n line endings.
function parseCSV(text){
  const rows=[];let row=[],field="",inQuotes=false;
  for(let i=0;i<text.length;i++){const c=text[i];
    if(inQuotes){
      if(c=='"'){if(text[i+1]=='"'){field+='"';i++}else inQuotes=false}
      else field+=c;
    }
    else if(c=='"')inQuotes=true;
    else if(c==","){row.push(field);field=""}
    else if(c=="\n"||c=="\r"){                       // end of row (\r\n counts as one break)
      if(c=="\r"&&text[i+1]=="\n")i++;
      row.push(field);rows.push(row);row=[];field="";
    }
    else field+=c;
  }
  if(field!==""||row.length){row.push(field);rows.push(row)}   // final row without trailing newline
  return rows;
}

// ── Small helpers ────────────────────────────────────────────────────────────
const $=selector=>document.querySelector(selector),
      MAX_GUESSES=8,
      bodyFontSize=()=>parseFloat(getComputedStyle(document.body).fontSize),
      toRad=deg=>deg*Math.PI/180,
      // Colour bucket for a guess's "linked %" score (table text and SVG fills)
      accuracyClass=pct=>pct>=50?"ok":pct>=15?"near":"far",
      colLabel=m=>m?m.toLocaleString()+" m":"sea level";

// ── Game state ───────────────────────────────────────────────────────────────
let mode="daily",        // "daily" (same peak for everyone today) or "random"
    peaks=[],            // all peaks, in CSV order
    byName={},           // peak name → index in peaks
    target=null,         // index of the mystery peak
    guesses=[],          // indices of guessed peaks, in order
    selected=null,       // index of the peak currently picked on the map
    roundOver=false;

// ── Rounds ───────────────────────────────────────────────────────────────────
function newRound(){
  // Daily peak: hash the day count so every visitor gets the same one.
  const day=Math.floor(Date.now()/864e5);
  target=mode==="daily"?((day*2654435761)>>>0)%peaks.length:Math.floor(Math.random()*peaks.length);
  guesses=[];roundOver=false;selected=null;
  $("#sel").textContent="Tap a peak on the map, then press Guess.";
  render();
}

function guess(){
  const g=selected;
  if(roundOver||g===null||guesses.includes(g))return;
  guesses.push(g);
  selected=null;
  roundOver=g===target||guesses.length>=MAX_GUESSES;
  $("#sel").textContent=roundOver?"":"Tap another peak on the map, then press Guess.";
  render();
  if(g===target)confetti();
}

// ── Page rendering ───────────────────────────────────────────────────────────
function render(){
  renderTable();
  renderHint();
  drawChart();
  drawMap();
  if(roundOver)$("#sel").textContent="Round over. Pick Random for another peak.";
  renderEndBanner();
}

function renderTable(){
  const rows=guesses.map((gi,i)=>{
    const peak=peaks[gi];
    if(gi===target)return `<tr><td>${i+1}</td><td>${peak.name}</td><td>🎯 Correct</td><td class="ok">100%</td></tr>`;
    const k=link(gi,target);
    return `<tr><td>${i+1}</td><td>${peak.name}</td><td>${colLabel(k.colAlt)}</td><td class="${accuracyClass(k.pct)}">${k.pct}%</td></tr>`;
  });
  $("#rows").innerHTML=rows.length
    ?`<table><tr><th>#</th><th>Peak</th><th>Linking col</th><th>Linked</th></tr>${rows.join("")}</table>`
    :"";
}

function renderHint(){
  if(roundOver){$("#hint").textContent="";return}
  const t=peaks[target],n=guesses.length;
  let h=`Guess ${Math.min(n+1,MAX_GUESSES)} of ${MAX_GUESSES}`;
  if(n>=3)h+=` · Hint: its elevation is ${t.height.toLocaleString()} m`;
  if(n>=5)h+=` · its parent starts with “${(t.parent||"—")[0]}”`;
  $("#hint").textContent=h;
}

function renderEndBanner(){
  if(!roundOver){$("#end").innerHTML="";return}
  const won=guesses.includes(target),t=peaks[target];
  $("#end").innerHTML=`<div class="msg"><b>${won?`Got it in ${guesses.length}!`:"Out of guesses."}</b> The peak was <b>${t.name}</b> (${t.range}, ${t.country}), ${t.height.toLocaleString()} m high with ${t.prominence.toLocaleString()} m of prominence.<br><p><button id="sh">Share results</button> <span id="shm" class="hint"></span></p></div>`;
  $("#sh").onclick=shareResult;
}

// ── Peak relationships ───────────────────────────────────────────────────────
// Each peak has a "parent": the higher peak that is key to its prominence.
const parentIdx=i=>peaks[i].parent?byName[peaks[i].parent]:-1;

// Indices of the peak and every ancestor above it.
function parentChain(i){
  const chain=[i];
  for(let p=parentIdx(i);p>=0;p=parentIdx(p))chain.push(p);
  return chain;
}

// Walking from one peak to the other: the lowest col you must cross, and how
// high it is as a percentage of the target peak.
function link(guessIdx,targetIdx){
  const a=parentChain(guessIdx),b=parentChain(targetIdx),
        meet=a.find(i=>b.includes(i));     // highest peak common to both routes, or undefined
  // You cross the key col of every peak before the meeting point on each chain.
  // If the chains share nothing, indexOf(undefined) is -1, so slice(0,-1) keeps
  // every peak except the topmost of each chain (unchanged legacy behaviour).
  const crossed=[...a.slice(0,a.indexOf(meet)),...b.slice(0,b.indexOf(meet))],
        colAlt=crossed.length
          ?Math.min(...crossed.map(i=>peaks[i].colAlt))
          :peaks[guessIdx].height;         // nothing in the way: measured from the summit itself
  //return{colAlt,pct:Math.round(100*colAlt/Math.min(peaks[guessIdx].height,peaks[targetIdx].height))};
  return{colAlt,pct:Math.round(100*colAlt/peaks[targetIdx].height)};
}

// ── Chart: one bar per guess ─────────────────────────────────────────────────
function drawChart(){
  const chart=$("#ch"),
        pxW=chart.clientWidth||360,pxH=chart.clientHeight||500,  // element size in CSS px
        viewW=Math.max(360,360*pxW/pxH),   // widen the viewBox on wide screens so bars spread out
        scale=Math.min(pxW/viewW,pxH/236)||1,                    // how far the viewBox shrinks to fit
        fontUnits=bodyFontSize()/scale,    // body font size in viewBox units → body-sized text on screen
        slotW=(viewW-36)/9,                // 9 slots: up to 8 guesses + the answer
        slotX=i=>36+slotW*(i+.5),
        barW=Math.min(28,slotW*.9),
        yFor=alt=>178-alt/9000*168;        // altitude 0…9000 m → y 178…10
  chart.setAttribute("viewBox",`0 0 ${viewW.toFixed(1)} 236`);
  let out="";
  // Gridlines and axis labels
  [0,2000,4000,6000,8000].forEach(alt=>out+=`<line x1="28" x2="${(viewW-4).toFixed(1)}" y1="${yFor(alt)}" y2="${yFor(alt)}"/><text class="start" x="2" y="${yFor(alt)+3}">${alt}</text>`);
  const trimName=n=>n.length>17?n.slice(0,16)+"…":n,
        nameLabel=(x,n)=>`<text class="end" transform="translate(${x+3} 184) rotate(-45)">${trimName(n)}</text>`,
        // The grey "ghost" bar shows the part of the peak hidden by the col.
        bar=(x,peak,cls,colAlt)=>{
          const y0=yFor(0),colY=yFor(colAlt),peakY=yFor(peak.height);
          return(colAlt<peak.height?`<rect class="ghost" x="${(x-barW/2).toFixed(1)}" y="${peakY}" width="${barW.toFixed(1)}" height="${y0-peakY}" rx="2"/>`:"")
               +`<rect class="${cls}" x="${(x-barW/2).toFixed(1)}" y="${colY}" width="${barW.toFixed(1)}" height="${y0-colY}"/>`;
        };
  guesses.forEach((gi,i)=>{
    const peak=peaks[gi],isTarget=gi===target,x=slotX(i),
          k=isTarget?{colAlt:peak.height}:link(gi,target);
    out+=bar(x,peak,isTarget?"f-ok":"f-"+accuracyClass(k.pct),k.colAlt)
        +`<text x="${x.toFixed(1)}" y="${yFor(peak.height)-3}">${peak.height.toLocaleString()}</text>`
        +(isTarget?""
          :`<text x="${x.toFixed(1)}" y="${yFor(k.colAlt)-yFor(peak.height)>10?yFor(k.colAlt)-2:yFor(k.colAlt)+9}" class="b">${k.colAlt.toLocaleString()}</text>`)
        +nameLabel(x,peak.name);
  });
  // After a loss, show the answer in slot 9.
  if(roundOver&&!guesses.includes(target)){
    const t=peaks[target],x=slotX(8);
    out+=bar(x,t,"f-tgt",t.colAlt)+`<text x="${x.toFixed(1)}" y="${yFor(t.height)-3}">${peak.height.toLocaleString()}</text>`+nameLabel(x,t.name);
  }
  chart.setAttribute("font-size",fontUnits.toFixed(2));
  chart.innerHTML=out;
}

// ── Confetti (canvas overlay) ────────────────────────────────────────────────
function confetti(){
  if(matchMedia("(prefers-reduced-motion: reduce)").matches)return;
  const dpr=devicePixelRatio||1,
        canvas=document.createElement("canvas"),ctx=canvas.getContext("2d");
  canvas.className="confetti";               // look & positioning come from coldle.css
  canvas.width=innerWidth*dpr;canvas.height=innerHeight*dpr;
  document.body.appendChild(canvas);
  const btn=$("#go").getBoundingClientRect(),
        originX=(btn.left+btn.width/2)*dpr,originY=(btn.top+btn.height/2)*dpr,
        colors=["#0072b2","#e69f00","#cc79a7","#56b4e9","#009e73","#f0e442"],
        // Launch particles upwards from the Guess button in a cone.
        particles=Array.from({length:160},()=>{
          const angle=-Math.PI/2+(Math.random()-.5)*Math.PI*1.2,speed=(6+Math.random()*11)*dpr;
          return{x:originX,y:originY,vx:Math.cos(angle)*speed,vy:Math.sin(angle)*speed,
                 size:(6+Math.random()*6)*dpr,rot:Math.random()*6,vr:(Math.random()-.5)*.4,
                 color:colors[Math.random()*colors.length|0],life:0};
        });
  let last=performance.now();
  (function tick(now){
    const dt=Math.max(0,Math.min(2,(now-last)/16.7));last=now;   // clamp: max 2 frames of motion
    ctx.clearRect(0,0,canvas.width,canvas.height);
    let alive=0;
    for(const p of particles){
      p.vy+=.35*dpr*dt;p.vx*=.99;p.x+=p.vx*dt;p.y+=p.vy*dt;p.rot+=p.vr*dt;p.life+=dt;
      if(p.y<canvas.height+20&&p.life<220){
        alive++;
        ctx.save();ctx.translate(p.x,p.y);ctx.rotate(p.rot);
        ctx.globalAlpha=Math.min(1,(220-p.life)/40);   // fade out over the last 40 frames
        ctx.fillStyle=p.color;ctx.fillRect(-p.size/2,-p.size/4,p.size,p.size/2);
        ctx.restore();
      }
    }
    alive?requestAnimationFrame(tick):canvas.remove();
  })(last);
}

// ── Map: world, projection, data ─────────────────────────────────────────────
let world={W:40030,H:12742,R:6371,lon0:0},   // world size + projection info (replaced by load())
    view={x:0,y:0,w:40030,h:12742};          // visible rectangle, in world units
const MAX_ZOOM=150,                          // zoom-in limit: view never narrower than world.W/MAX_ZOOM
      mapSvg=$("#mp"),markerLayer=$("#pk"),mapLayer=$("#bg");

// Longitude/latitude → world units; longitudes wrap around the central meridian.
function project(lat,lon){
  const d=((lon-world.lon0+540)%360)-180;
  return[world.W/2+world.R*toRad(d),world.H/2-world.R*Math.sin(toRad(lat))];
}

async function load(){
  const[csv,svgText]=await Promise.all(["peaks.csv","map.svg"].map(url=>fetch(url).then(r=>{
    if(!r.ok)throw new Error(url+" "+r.status);
    return r.text();
  })));
  peaks=parseCSV(csv).slice(1).filter(a=>a.length>=8).map(a=>({
    name:a[0],height:+a[1],prominence:+a[2],parent:a[3],lat:+a[4],lon:+a[5],range:a[6],country:a[7]
  }));
  peaks.forEach((p,i)=>{p.colAlt=p.height-p.prominence;byName[p.name]=i});
  const svg=new DOMParser().parseFromString(svgText,"image/svg+xml").documentElement,
        attr=n=>+svg.getAttribute("data-"+n);
  world={W:svg.viewBox.baseVal.width,H:svg.viewBox.baseVal.height,R:attr("r"),lon0:attr("lon0")};
  mapLayer.replaceChildren(...[...svg.childNodes].map(n=>document.importNode(n,true)));
  peaks.forEach(p=>{[p.x,p.y]=project(p.lat,p.lon)});
  resetView();
}

// ── Map: view state (pan & zoom) ─────────────────────────────────────────────
const mapAspect=()=>{const r=mapSvg.getBoundingClientRect();return r.height?r.width/r.height:world.W/world.H},
      minViewW=()=>world.W/MAX_ZOOM,
      maxViewW=()=>Math.min(world.W,world.H*mapAspect());

// Start centred on 60°E, vertically centred on the world.
function resetView(){
  const w=maxViewW(),h=w/mapAspect(),cx=project(0,60)[0];
  view={x:cx-w/2,y:(world.H-h)/2,w,h};
}

function clampView(){
  view.w=Math.max(minViewW(),Math.min(maxViewW(),view.w));
  view.h=view.w/mapAspect();
  view.x=Math.max(0,Math.min(world.W-view.w,view.x));
  view.y=Math.max(0,Math.min(world.H-view.h,view.y));
}

// Screen (client) coordinates → world units.
function clientToWorld(cx,cy){
  const r=mapSvg.getBoundingClientRect();
  return[view.x+(cx-r.left)/r.width*view.w,view.y+(cy-r.top)/r.height*view.h];
}

// Zoom by `factor`, keeping the world point under (cx,cy) fixed on screen.
function zoomAt(factor,cx,cy){
  const r=mapSvg.getBoundingClientRect(),[wx,wy]=clientToWorld(cx,cy),
        w=Math.max(minViewW(),Math.min(maxViewW(),view.w*factor)),h=w/mapAspect();
  view.x=wx-(cx-r.left)/r.width*w;
  view.y=wy-(cy-r.top)/r.height*h;
  view.w=w;
  drawMap();
}

function zoom(factor){   // used by the ＋ / － buttons
  if(!peaks.length)return;
  const r=mapSvg.getBoundingClientRect();
  zoomAt(factor,r.left+r.width/2,r.top+r.height/2);
}

function resetMap(){resetView();drawMap()}   // used by the Reset button

addEventListener("resize",()=>{if(!peaks.length)return;drawMap();drawChart()});

// ── Map: drawing ─────────────────────────────────────────────────────────────
// Name-label visibility, by visible width as a fraction of the whole world:
const LABELS_ALL=.28,      // zoomed in ~3.6×: label every peak
      LABELS_GUESSED=.56;  // zoomed in ~1.8×: also label peaks already guessed

function drawMap(){
  clampView();
  const unitsPerPx=view.w/(mapSvg.clientWidth||640),
        labelFont=bodyFontSize()*unitsPerPx,  // body font size in viewBox units → labels stay body-sized on screen at any zoom
        zoomFrac=view.w/world.W;
  mapSvg.setAttribute("viewBox",`${view.x} ${view.y} ${view.w} ${view.h}`);
  let out="";
  peaks.forEach((p,i)=>{
    const guessIdx=guesses.indexOf(i),isSelected=i===selected;
    let cls="";
    if(guessIdx>=0)cls=i===target?"f-ok":"f-"+accuracyClass(link(i,target).pct);
    else if(roundOver&&i===target)cls="f-tgt";
    const tapAttr=roundOver?"":` data-i="${i}"`;   // only clickable while the round is live; cursor comes from CSS
    out+=`<circle class="${cls}${isSelected?" sel":""}"${tapAttr} cx="${p.x.toFixed(1)}" cy="${p.y.toFixed(1)}" r="${((isSelected?6.5:5)*unitsPerPx).toFixed(1)}"/>`;
    if(zoomFrac<=LABELS_ALL||isSelected||(guessIdx>=0&&zoomFrac<=LABELS_GUESSED))
      out+=`<text${tapAttr} x="${(p.x+8*unitsPerPx).toFixed(1)}" y="${(p.y+4*unitsPerPx).toFixed(1)}">${p.name}</text>`;
  });
  markerLayer.setAttribute("font-size",labelFont.toFixed(2));
  markerLayer.innerHTML=out;
}

// ── Map: selecting a peak ────────────────────────────────────────────────────
// Peak index within ~20 px of the tap/click, or -1. Fallback for taps that
// miss a marker; direct clicks are resolved by the DOM via data-i.
function nearestPeak(cx,cy){
  const[wx,wy]=clientToWorld(cx,cy),
        radius=20*view.w/mapSvg.getBoundingClientRect().width,   // 20 px, in world units
        maxDist=radius*radius;
  let best=-1,bestDist=maxDist;
  peaks.forEach((p,i)=>{const d=(p.x-wx)**2+(p.y-wy)**2;if(d<bestDist){bestDist=d;best=i}});
  return best;
}

function selectPeak(i){
  selected=i;
  $("#sel").textContent=`Selected: ${peaks[i].name}. Press Guess to confirm.`;
  drawMap();
}

// ── Map: pointer input ───────────────────────────────────────────────────────
// One pointer pans, two pointers pinch-zoom (anchored at the midpoint).
// Taps on a marker or label select that peak: the hit is recorded on
// pointerdown, because setPointerCapture retargets pointerup to #mp.
const pointers=new Map();
let dragged=false,drag=null,pinch=null;

const midpoint=()=>{const[a,b]=[...pointers.values()];return{x:(a.x+b.x)/2,y:(a.y+b.y)/2,dist:Math.hypot(a.x-b.x,a.y-b.y)||1}},
      startPinch=()=>{const m=midpoint(),[wx,wy]=clientToWorld(m.x,m.y);
                      pinch={dist:m.dist,viewW:view.w,worldX:wx,worldY:wy}};

mapSvg.onpointerdown=e=>{
  if(!peaks.length)return;
  mapSvg.setPointerCapture(e.pointerId);
  pointers.set(e.pointerId,{x:e.clientX,y:e.clientY});
  if(pointers.size===1){
    dragged=false;
    const el=e.target.closest("[data-i]");
    drag={x:e.clientX,y:e.clientY,viewX:view.x,viewY:view.y,hitPeak:el?+el.dataset.i:-1};
  }else if(pointers.size===2){dragged=true;drag=null;startPinch()}
};

mapSvg.onpointermove=e=>{
  if(!pointers.has(e.pointerId))return;   // pure hover — the cursor is handled by CSS on #pk [data-i]
  pointers.set(e.pointerId,{x:e.clientX,y:e.clientY});
  const r=mapSvg.getBoundingClientRect();
  if(pointers.size>=2&&pinch){            // pinch: scale the view around the starting world point
    const m=midpoint(),
          w=Math.max(minViewW(),Math.min(maxViewW(),pinch.viewW*pinch.dist/m.dist)),h=w/mapAspect();
    view.w=w;
    view.x=pinch.worldX-(m.x-r.left)/r.width*w;
    view.y=pinch.worldY-(m.y-r.top)/r.height*h;
    drawMap();
  }else if(drag){                         // pan (only once the pointer moves >5 px)
    const dx=e.clientX-drag.x,dy=e.clientY-drag.y;
    if(Math.abs(dx)+Math.abs(dy)>5)dragged=true;
    if(dragged){
      const worldPerPx=view.w/r.width;
      view.x=drag.viewX-dx*worldPerPx;view.y=drag.viewY-dy*worldPerPx;
      drawMap();
    }
  }
};

function endPtr(e){
  if(!pointers.delete(e.pointerId))return;
  if(pointers.size===2)startPinch();      // three→two fingers: re-anchor the pinch
  else if(pointers.size===1){             // two→one: keep panning with the remaining finger
    const[p]=pointers.values();
    drag={x:p.x,y:p.y,viewX:view.x,viewY:view.y,hitPeak:-1};pinch=null;
  }else{                                  // last pointer up: maybe it was a tap
    const hit=drag?drag.hitPeak:-1;
    drag=pinch=null;
    if(e.type==="pointerup"&&!dragged&&!roundOver){
      const i=hit>=0?hit:nearestPeak(e.clientX,e.clientY);
      if(i>=0)selectPeak(i);
    }
  }
}
mapSvg.onpointerup=mapSvg.onpointercancel=endPtr;

mapSvg.addEventListener("wheel",e=>{
  e.preventDefault();
  if(!peaks.length)return;
  const step=e.deltaMode===1?.4:.012;   // line-mode deltas are much larger than pixel ones
  zoomAt(Math.exp(Math.max(-100,Math.min(100,e.deltaY))*step),e.clientX,e.clientY);
},{passive:false});

// ── Controls, share, boot ────────────────────────────────────────────────────
 $("#go").onclick=guess;
document.querySelectorAll("input[name=mode]").forEach(r=>r.onchange=()=>{mode=r.value;newRound()});

function shareResult(){
  const won=guesses.includes(target),
        highest=Math.max(...peaks.map(p=>p.height)),
        // One block per guess, sized by the col height relative to the highest peak.
        blocks=guesses.map(g=>"▁▂▃▄▅▆▇█"[Math.round((g===target?peaks[g].height:link(g,target).colAlt)/highest*7)]).join("")+(won?"🎯":""),
        text=`Coldle ${mode==="daily"?new Date().toISOString().slice(0,10):"(random)"} ${won?guesses.length:"X"}/${MAX_GUESSES}\n${blocks}\nhttps://ianto-cannon.github.io/coldle.html`,
        fallback=()=>{
          const box=$("#shm");box.textContent="";
          const ta=document.createElement("textarea");
          ta.value=text;ta.readOnly=true;ta.rows=8;
          box.appendChild(ta);ta.select();
        };
  if(navigator.clipboard)navigator.clipboard.writeText(text).then(()=>{$("#shm").textContent="Copied to clipboard"},fallback);
  else fallback();
}

load().then(newRound).catch(e=>{$("#sel").textContent="Could not load map data: "+e.message});
