(function(){
'use strict';
var KEY='rdm-';
function get(k,d){try{var v=localStorage.getItem(KEY+k);return v?JSON.parse(v):d;}catch(e){return d;}}
function set(k,v){try{localStorage.setItem(KEY+k,JSON.stringify(v));}catch(e){}}
function esc(s){return String(s).replace(/[&<>"]/g,function(c){return{'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c];});}

var CH=window.CHAPITRES||[];
var slug=document.body.dataset.slug||null;
var prog=get('prog',{});      // slug -> pourcentage max lu (0-100)
var done=get('done',{});      // slug -> true
var bms=get('bms',[]);        // [{slug,id,label,ch,t}]

/* ---------- thème ---------- */
function curTheme(){
  var t=document.documentElement.dataset.theme;
  if(t) return t;
  return window.matchMedia&&matchMedia('(prefers-color-scheme: dark)').matches?'dark':'light';
}
var tb=document.getElementById('themeBtn');
if(tb) tb.onclick=function(){
  var n=curTheme()==='dark'?'light':'dark';
  document.documentElement.dataset.theme=n;
  try{localStorage.setItem('rdm-theme',n);}catch(e){}
};

/* ---------- toast ---------- */
var toastT;
function toast(m){var t=document.getElementById('toast');if(!t)return;t.textContent=m;t.classList.add('on');clearTimeout(toastT);toastT=setTimeout(function(){t.classList.remove('on');},2000);}

/* ---------- progression ---------- */
function pct(s){return done[s]?100:Math.round(prog[s]||0);}
function globalPct(){
  var av=CH.filter(function(c){return c.ok;});
  if(!CH.length) return 0;
  var sum=0; CH.forEach(function(c){sum+=pct(c.slug);});
  return Math.round(sum/CH.length);
}

/* ---------- barre latérale ---------- */
function renderSidebar(){
  var sb=document.getElementById('sidebar'); if(!sb) return;
  var g=globalPct();
  var h='<div class="sb-book"><a href="index.html">Recueil d\'épîtres sur la prédication et la méthodologie</a></div>'+
    '<div class="sb-sub">Cheikh Sâlih ibn Fawzân Al-Fawzân</div>'+
    '<div class="gprog"><div class="bar"><div style="width:'+g+'%"></div></div><div class="txt"><span>Progression globale</span><span>'+g+' %</span></div></div>'+
    '<div class="sb-h">Sommaire</div><ul class="chlist">';
  CH.forEach(function(c,i){
    var p=pct(c.slug), cur=c.slug===slug;
    h+='<li class="'+(cur?'cur ':'')+(c.ok?'':'na')+'"><a href="'+c.slug+'.html"><span class="n">'+(i+1)+'</span><span>'+esc(c.fr)+'</span>'+
      '<span class="st'+(p>=100?' ok':'')+'">'+(c.ok?(p>=100?'✓':(p?p+' %':'')):'à venir')+'</span></a>';
    if(cur && window.TOC && TOC.length){
      h+='<ul class="subtoc">';
      TOC.forEach(function(t){h+='<li class="l'+t[0]+'"><a href="#'+t[1]+'" data-id="'+t[1]+'">'+esc(t[2])+'</a></li>';});
      h+='</ul>';
    }
    h+='</li>';
  });
  h+='</ul><div class="sb-h">Marque-pages</div>';
  if(!bms.length) h+='<div class="empty">Aucun marque-page. Utilisez 🔖 en haut pour marquer l\'endroit où vous êtes.</div>';
  else{
    h+='<ul class="bmlist">';
    bms.forEach(function(b,i){
      h+='<li><a href="'+b.slug+'.html#'+b.id+'">'+esc(b.label)+'<small>'+esc(b.ch)+' · '+new Date(b.t).toLocaleDateString('fr-FR')+'</small></a><button data-del="'+i+'" title="Supprimer">×</button></li>';
    });
    h+='</ul>';
  }
  h+='<div class="sb-actions"><button class="btn danger" id="resetBtn">↺ Réinitialiser la progression</button>'+
     (bms.length?'<button class="btn danger" id="clearBm">Supprimer tous les marque-pages</button>':'')+'</div>';
  sb.innerHTML=h;
  sb.querySelectorAll('[data-del]').forEach(function(b){b.onclick=function(){bms.splice(+b.dataset.del,1);set('bms',bms);renderSidebar();};});
  var r=document.getElementById('resetBtn');
  if(r) r.onclick=function(){
    if(confirm('Réinitialiser toute la progression de lecture ? (les marque-pages sont conservés)')){
      prog={};done={};set('prog',prog);set('done',done);set('last',null);renderSidebar();updDone();toast('Progression réinitialisée');
      if(document.getElementById('cards')) renderHome();
    }
  };
  var cb=document.getElementById('clearBm');
  if(cb) cb.onclick=function(){if(confirm('Supprimer tous les marque-pages ?')){bms=[];set('bms',bms);renderSidebar();}};
  sb.querySelectorAll('.subtoc a,.chlist a').forEach(function(a){a.addEventListener('click',function(){document.body.classList.remove('side-open');});});
  var cur=sb.querySelector('.chlist li.cur'); if(cur && !renderSidebar.done){cur.scrollIntoView({block:'center'});renderSidebar.done=true;}
}

var mb=document.getElementById('menuBtn'), veil=document.getElementById('veil');
if(mb) mb.onclick=function(){document.body.classList.toggle('side-open');};
if(veil) veil.onclick=function(){document.body.classList.remove('side-open');};

/* ---------- page de chapitre ---------- */
var blocks=[];
function topBlock(){
  var best=null;
  for(var i=0;i<blocks.length;i++){var r=blocks[i].getBoundingClientRect();if(r.bottom>80){best=blocks[i];break;}}
  return best;
}
function updDone(){
  var d=document.getElementById('doneBtn'); if(!d||!slug) return;
  d.classList.toggle('on',!!done[slug]);
  d.textContent=done[slug]?'✓ Épître lue (cliquer pour annuler)':'✓ Marquer cette épître comme lue';
}
if(slug){
  blocks=[].slice.call(document.querySelectorAll('#text [id]'));
  var bar=document.getElementById('pbar'), saveT, lastSb=-1;
  function onScroll(){
    var h=document.documentElement, max=h.scrollHeight-h.clientHeight;
    var p=max>0?Math.min(100,h.scrollTop/max*100):100;
    bar.style.width=p+'%';
    if(p>(prog[slug]||0)){prog[slug]=p; if(p>=99) done[slug]=true;}
    clearTimeout(saveT);
    saveT=setTimeout(function(){
      set('prog',prog);set('done',done);
      var b=topBlock(); if(b) set('last',{slug:slug,id:b.id,ch:document.querySelector('.ch-head h1').textContent});
      var g=Math.round(pct(slug)); if(g!==lastSb){lastSb=g;renderSidebar();updDone();}
      // section active
      var on=null; document.querySelectorAll('#text h2[id],#text h3[id]').forEach(function(x){if(x.getBoundingClientRect().top<120) on=x.id;});
      document.querySelectorAll('.subtoc a').forEach(function(a){a.classList.toggle('on',a.dataset.id===on);});
    },250);
  }
  addEventListener('scroll',onScroll,{passive:true});
  var d=document.getElementById('doneBtn');
  if(d) d.onclick=function(){done[slug]=!done[slug]; if(!done[slug]) prog[slug]=Math.min(prog[slug]||0,95); set('done',done);set('prog',prog);updDone();renderSidebar();toast(done[slug]?'Épître marquée comme lue':'Marque « lue » retirée');};
  updDone();

  /* marque-page */
  var bb=document.getElementById('bmBtn');
  if(bb) bb.onclick=function(){
    var b=topBlock(); if(!b) return;
    var txt=(b.textContent||'').replace(/\s+/g,' ').trim();
    var label=txt.length>70?txt.slice(0,70)+'…':txt;
    if(bms.some(function(x){return x.slug===slug&&x.id===b.id;})){toast('Ce passage est déjà marqué');return;}
    bms.unshift({slug:slug,id:b.id,label:label,ch:document.querySelector('.ch-head h1').textContent,t:Date.now()});
    set('bms',bms); renderSidebar(); toast('Marque-page ajouté');
    b.classList.remove('flash'); void b.offsetWidth; b.classList.add('flash');
  };

  /* fenêtre des notes */
  var modal=document.getElementById('modal');
  function closeM(){modal.hidden=true;}
  document.querySelectorAll('sup.nref a').forEach(function(a){
    a.addEventListener('click',function(e){
      e.preventDefault();
      var n=a.dataset.n, li=document.getElementById('n'+n);
      var c=li.cloneNode(true); var bk=c.querySelector('.back'); if(bk) bk.remove();
      modal.querySelector('.modal-h').textContent='Note '+n;
      modal.querySelector('.modal-c').innerHTML=c.innerHTML;
      modal.hidden=false;
    });
  });
  modal.addEventListener('click',function(e){if(e.target===modal||e.target.classList.contains('modal-x')) closeM();});
  addEventListener('keydown',function(e){if(e.key==='Escape') closeM();});

  if(location.hash){var t=document.getElementById(location.hash.slice(1)); if(t) setTimeout(function(){t.classList.add('flash');},300);}
}

/* ---------- accueil ---------- */
function renderHome(){
  var box=document.getElementById('cards'); if(!box) return;
  var h='';
  CH.forEach(function(c,i){
    var p=pct(c.slug);
    h+='<a class="card'+(c.ok?'':' na')+'" href="'+c.slug+'.html"><span class="num">'+(i+1)+'</span><span class="t">'+esc(c.fr)+'<small>'+esc(c.ar)+'</small></span><span class="pc">'+(c.ok?(p>=100?'✓ lue':p+' %'):'à venir')+'</span></a>';
  });
  box.innerHTML=h;
  var last=get('last',null), rs=document.getElementById('resume');
  if(rs){
    if(last){rs.hidden=false;rs.href=last.slug+'.html#'+last.id;rs.querySelector('small').textContent=last.ch;}
    else rs.hidden=true;
  }
}
renderSidebar();
renderHome();
})();
