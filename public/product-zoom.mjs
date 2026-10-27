let viewer;
export function openProductZoom({images,index=0,name='Product photo'}){
 if(!images?.length)return;
 if(viewer?.open)viewer.close();
 const dialog=document.createElement('dialog');viewer=dialog;dialog.className='product-zoom';
 dialog.setAttribute('aria-label','Product image viewer');
 dialog.innerHTML=`<div class="zoom-toolbar"><div><strong class="zoom-title"></strong><span class="zoom-counter" aria-live="polite"></span></div><div class="zoom-tools"><button type="button" data-action="out" aria-label="Zoom out">−</button><output class="zoom-level" aria-live="polite">100%</output><button type="button" data-action="in" aria-label="Zoom in">+</button><button type="button" data-action="reset">Reset</button><button type="button" data-action="close" aria-label="Close image viewer">×</button></div></div><div class="zoom-stage"><img class="zoom-photo" draggable="false" alt=""><button type="button" class="zoom-prev" aria-label="Previous photo">‹</button><button type="button" class="zoom-next" aria-label="Next photo">›</button><span class="zoom-error" role="status" hidden>Photo could not load. Try another photo.</span></div><div class="zoom-bottom"><p>Pinch or use + / − to zoom · Drag to explore · Double-tap to zoom</p><div class="zoom-thumbs" aria-label="Product photos"></div></div>`;
 const stage=dialog.querySelector('.zoom-stage'),photo=dialog.querySelector('.zoom-photo'),thumbs=dialog.querySelector('.zoom-thumbs');
 dialog.querySelector('.zoom-title').textContent=name;
 let current=Math.max(0,Math.min(index,images.length-1)),scale=1,x=0,y=0,lastTap=0,lastTapX=0,lastTapY=0,gesture=null;
 const pointers=new Map(),previousFocus=document.activeElement,oldOverflow=document.body.style.overflow;
 function paint(){
  const bx=Math.max(0,(photo.offsetWidth*scale-stage.clientWidth)/2),by=Math.max(0,(photo.offsetHeight*scale-stage.clientHeight)/2);
  x=Math.max(-bx,Math.min(bx,x));y=Math.max(-by,Math.min(by,y));
  photo.style.transform=`translate(${x}px,${y}px) scale(${scale})`;
  stage.classList.toggle('is-zoomed',scale>1);
  dialog.querySelector('.zoom-level').textContent=Math.round(scale*100)+'%';
  dialog.querySelector('[data-action="out"]').disabled=scale<=1;
  dialog.querySelector('[data-action="in"]').disabled=scale>=4;
 }
 function zoomTo(next,cx=stage.clientWidth/2,cy=stage.clientHeight/2){
  next=Math.max(1,Math.min(4,next));const ratio=next/scale,ox=cx-stage.clientWidth/2,oy=cy-stage.clientHeight/2;
  x=ox-(ox-x)*ratio;y=oy-(oy-y)*ratio;scale=next;if(scale===1)x=y=0;paint();
 }
 function select(next){
  current=(next+images.length)%images.length;scale=1;x=y=0;gesture=null;pointers.clear();
  dialog.querySelector('.zoom-error').hidden=true;photo.src=images[current];photo.alt=name+' — photo '+(current+1);
  dialog.querySelector('.zoom-counter').textContent=`Photo ${current+1} of ${images.length}`;
  [...thumbs.children].forEach((b,i)=>{b.setAttribute('aria-pressed',String(i===current));});paint();
 }
 for(const [i,src] of images.entries()){
  const button=document.createElement('button');button.type='button';button.setAttribute('aria-label','View photo '+(i+1));
  const image=document.createElement('img');image.src=src;image.alt='';image.loading='lazy';button.append(image);button.onclick=()=>select(i);thumbs.append(button);
 }
 for(const button of dialog.querySelectorAll('.zoom-prev,.zoom-next'))button.hidden=images.length<2;
 thumbs.hidden=images.length<2;
 dialog.querySelector('.zoom-prev').onclick=()=>select(current-1);dialog.querySelector('.zoom-next').onclick=()=>select(current+1);
 dialog.querySelector('[data-action="in"]').onclick=()=>zoomTo(scale+.5);
 dialog.querySelector('[data-action="out"]').onclick=()=>zoomTo(scale-.5);
 dialog.querySelector('[data-action="reset"]').onclick=()=>zoomTo(1);
 dialog.querySelector('[data-action="close"]').onclick=()=>dialog.close();
 photo.onload=paint;photo.onerror=()=>{dialog.querySelector('.zoom-error').hidden=false;};
 const point=e=>{const r=stage.getBoundingClientRect();return{x:e.clientX-r.left,y:e.clientY-r.top}};
 function startGesture(){const a=[...pointers.values()];if(a.length>=2){const [p,q]=a;gesture={pinch:true,distance:Math.max(1,Math.hypot(q.x-p.x,q.y-p.y)),scale,x,y,cx:(p.x+q.x)/2-stage.clientWidth/2,cy:(p.y+q.y)/2-stage.clientHeight/2};}else if(a.length)gesture={pinch:false,px:a[0].x,py:a[0].y,x,y,moved:false};else gesture=null;}
 stage.onpointerdown=e=>{if(e.target.closest('button')||e.button>0)return;pointers.set(e.pointerId,point(e));stage.setPointerCapture(e.pointerId);startGesture();};
 stage.onpointermove=e=>{
  if(!pointers.has(e.pointerId)||!gesture)return;pointers.set(e.pointerId,point(e));const a=[...pointers.values()];
  if(gesture.pinch&&a.length>=2){const [p,q]=a,next=Math.max(1,Math.min(4,gesture.scale*Math.hypot(q.x-p.x,q.y-p.y)/gesture.distance)),ratio=next/gesture.scale;
   x=(p.x+q.x)/2-stage.clientWidth/2-(gesture.cx-gesture.x)*ratio;y=(p.y+q.y)/2-stage.clientHeight/2-(gesture.cy-gesture.y)*ratio;scale=next;lastTap=0;paint();
  }else if(!gesture.pinch){const dx=a[0].x-gesture.px,dy=a[0].y-gesture.py;if(Math.hypot(dx,dy)>8)gesture.moved=true;if(scale>1){x=gesture.x+dx;y=gesture.y+dy;paint();}}
 };
 function end(e){if(!pointers.has(e.pointerId))return;const p=point(e),tap=gesture&&!gesture.pinch&&!gesture.moved;
  pointers.delete(e.pointerId);if(e.type==='pointerup'&&tap){const now=Date.now();if(now-lastTap<350&&Math.hypot(p.x-lastTapX,p.y-lastTapY)<30){zoomTo(scale>1?1:2.5,p.x,p.y);lastTap=0;}else{lastTap=now;lastTapX=p.x;lastTapY=p.y;}}
  if(stage.hasPointerCapture(e.pointerId))stage.releasePointerCapture(e.pointerId);startGesture();
 }
 stage.onpointerup=end;stage.onpointercancel=end;
 stage.addEventListener('wheel',e=>{if(e.target.closest('button'))return;e.preventDefault();const p=point(e);zoomTo(scale*Math.exp(-e.deltaY*.002),p.x,p.y);},{passive:false});
 dialog.addEventListener('keydown',e=>{if(e.key==='ArrowLeft'){e.preventDefault();select(current-1);}if(e.key==='ArrowRight'){e.preventDefault();select(current+1);}if(e.key==='+'||e.key==='='){e.preventDefault();zoomTo(scale+.5);}if(e.key==='-'){e.preventDefault();zoomTo(scale-.5);}});
 const resized=()=>paint(),routeChanged=()=>dialog.close();
 dialog.addEventListener('close',()=>{window.removeEventListener('resize',resized);window.removeEventListener('hashchange',routeChanged);document.body.style.overflow=oldOverflow;dialog.remove();if(previousFocus?.isConnected)previousFocus.focus();if(viewer===dialog)viewer=null;},{once:true});
 window.addEventListener('resize',resized);window.addEventListener('hashchange',routeChanged);
 document.body.append(dialog);document.body.style.overflow='hidden';dialog.showModal();select(current);dialog.querySelector('[data-action="close"]').focus();
}
