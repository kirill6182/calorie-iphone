'use strict';
const KEY='cal:v1',$=s=>document.querySelector(s),rnd=Math.round;
const esc=s=>String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const uid=()=>Date.now().toString(36)+Math.random().toString(36).slice(2,7);
const today=()=>new Date(Date.now()-new Date().getTimezoneOffset()*6e4).toISOString().slice(0,10);
const isToday=t=>new Date(t).toDateString()===new Date().toDateString();
const TYPES=[['breakfast','Завтрак'],['lunch','Обед'],['dinner','Ужин'],['snack','Перекус']];
const hourType=()=>{const h=new Date().getHours();return h<11?'breakfast':h<16?'lunch':h<21?'dinner':'snack'};
const ic=(p,s=22)=>`<svg width="${s}" height="${s}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${p}</svg>`;
const IC={
  cam:ic('<path d="M14.5 4h-5L7 7H4a2 2 0 0 0-2 2v9a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V9a2 2 0 0 0-2-2h-3l-2.5-3z"/><circle cx="12" cy="13" r="3"/>'),
  trash:ic('<path d="M3 6h18"/><path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"/><path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"/>',20),
  x:ic('<path d="M18 6 6 18"/><path d="m6 6 12 12"/>',20),
  img:ic('<rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="9" cy="9" r="2"/><path d="m21 15-3.1-3.1a2 2 0 0 0-2.8 0L6 21"/>',24),
  gear:ic('<circle cx="12" cy="12" r="3"/><path d="M12 2v3M12 19v3M2 12h3M19 12h3M4.9 4.9l2.1 2.1M17 17l2.1 2.1M4.9 19.1 7 17M17 7l2.1-2.1"/>',20),
  mode:ic('<circle cx="12" cy="12" r="9"/><path d="M12 3a9 9 0 0 1 0 18z" fill="currentColor"/>',20)
};
/* название, ккал, белки, жиры, углеводы — на 100 г (приблизительно) */
const FOODS=[['Куриная грудка',165,31,3.6,0],['Рис варёный',130,2.7,.3,28],['Гречка варёная',110,4,1,21],['Овсянка на воде',70,2.5,1.5,12],['Яйцо варёное',155,13,11,1.1],['Банан',89,1.1,.3,23],['Яблоко',52,.3,.2,14],['Хлеб пшеничный',265,9,3.2,49],['Творог 5%',121,17,5,1.8],['Молоко 2.5%',52,2.9,2.5,4.8],['Сыр твёрдый',350,25,27,0],['Картофель варёный',87,1.9,.1,20],['Макароны варёные',158,5.8,.9,31],['Лосось',208,20,13,0],['Огурец',15,.8,.1,2.8],['Помидор',18,.9,.2,3.9],['Пицца',266,11,10,33],['Йогурт натуральный',60,4,3,4.7],['Авокадо',160,2,15,9],['Миндаль',579,21,50,22],['Шоколад молочный',535,7.6,30,59],['Оливковое масло',884,0,100,0]];

/* ---------- состояние ---------- */
const defaults=()=>({meals:[],goals:{cal:2000,p:150,f:70,c:200},settings:{apiKey:'',model:'claude-haiku-5-5',theme:'system'},hintHidden:false});
function load(){try{const d=JSON.parse(localStorage.getItem(KEY))||{},b=defaults();return {...b,...d,goals:{...b.goals,...d.goals},settings:{...b.settings,...d.settings}}}catch(e){return defaults()}}
let S=load(),tab='home',stream=null,sc={},mf={};
function save(){try{localStorage.setItem(KEY,JSON.stringify(S))}catch(e){toast('Не удалось сохранить: память переполнена')}}
let tt;function toast(m){const t=$('#toast');t.textContent=m;t.classList.add('show');clearTimeout(tt);tt=setTimeout(()=>t.classList.remove('show'),2800)}
const mq=matchMedia('(prefers-color-scheme: dark)');
function applyTheme(){const t=S.settings.theme,d=t==='dark'||(t==='system'&&mq.matches);document.documentElement.dataset.theme=d?'dark':'light';$('meta[name=theme-color]').content=d?'#000000':'#f2f2f7'}
mq.addEventListener('change',applyTheme);
const todayMeals=()=>S.meals.filter(m=>isToday(m.timestamp));
function totals(){const t={cal:0,p:0,f:0,c:0};todayMeals().forEach(m=>m.items.forEach(i=>{t.cal+=i.calories;t.p+=i.protein;t.f+=i.fat;t.c+=i.carbs}));return t}

/* ---------- экраны ---------- */
const standalone=()=>navigator.standalone||matchMedia('(display-mode: standalone)').matches;
const macro=(l,v,g)=>`<div class="m"><span>${l}</span><span class="num">${rnd(v)} / ${g} г</span></div><div class="bar"><i data-w="${Math.min(v/Math.max(g,1),1)*100}"></i></div>`;
function viewHome(){
  const t=totals(),g=S.goals,left=g.cal-t.cal,C=2*Math.PI*88,p=Math.min(t.cal/Math.max(g.cal,1),1);
  const hint=!standalone()&&!S.hintHidden?`<div class="card hint"><span>Добавь на экран «Домой»: <b>Поделиться → На экран «Домой»</b>. Так данные не сотрутся, а приложение откроется на весь экран.</span><button data-act="hint">Понятно</button></div>`:'';
  return `${hint}<div class="ringwrap"><svg viewBox="0 0 200 200"><circle class="trk" cx="100" cy="100" r="88"/><circle class="arc${left<0?' over':''}" cx="100" cy="100" r="88" stroke-dasharray="${C}" stroke-dashoffset="${C}" data-to="${C*(1-p)}"/></svg><div class="ctr"><small>${left>=0?'Осталось калорий':'Превышение'}</small><b class="num">${Math.abs(rnd(left))}</b><small>съедено ${rnd(t.cal)} из ${g.cal}</small></div></div><div class="card">${macro('Белки',t.p,g.p)}${macro('Жиры',t.f,g.f)}${macro('Углеводы',t.c,g.c)}</div>`;
}
function viewDiary(){
  const ms=todayMeals();
  if(!ms.length)return `<div class="empty">Сегодня записей пока нет.<br>Нажми «Добавить еду».</div>`;
  return TYPES.map(([k,l])=>{const list=ms.filter(m=>m.type===k);if(!list.length)return '';
    return `<h3>${l}</h3>`+list.map(m=>{const th=(m.items.find(i=>i.imageUrl)||{}).imageUrl,kc=m.items.reduce((s,i)=>s+i.calories,0);
      return `<div class="meal">${th?`<img src="${esc(th)}" alt="">`:''}<div class="mt"><b>${esc(m.items.map(i=>i.name).join(', '))}</b><small>${new Date(m.timestamp).toLocaleTimeString('ru-RU',{hour:'2-digit',minute:'2-digit'})}</small></div><b class="num">${rnd(kc)} ккал</b><button class="ix" data-act="del" data-id="${m.id}" aria-label="Удалить">${IC.trash}</button></div>`}).join('')}).join('');
}
function render(){
  $('#date').textContent=new Date().toLocaleDateString('ru-RU',{weekday:'long',day:'numeric',month:'long'});
  document.querySelectorAll('.seg button').forEach(b=>b.classList.toggle('on',b.dataset.t===tab));
  $('#view').innerHTML=tab==='home'?viewHome():viewDiary();
  requestAnimationFrame(()=>requestAnimationFrame(()=>{
    document.querySelectorAll('[data-to]').forEach(e=>e.style.strokeDashoffset=e.dataset.to);
    document.querySelectorAll('[data-w]').forEach(e=>e.style.width=e.dataset.w+'%');
  }));
}
function addMeal(items,type){S.meals.push({id:uid(),type,items,timestamp:Date.now()});save();closeSheet();tab='diary';render();toast('Добавлено в дневник')}
const chips=(act,sel)=>TYPES.map(([k,l])=>`<button class="chip${k===sel?' on':''}" data-act="${act}" data-k="${k}">${l}</button>`).join('');

/* ---------- распознавание ---------- */
const MOCK=[[{name:'Куриная грудка',weight:150,calories:248,protein:46,fat:5,carbs:0},{name:'Рис варёный',weight:100,calories:130,protein:3,fat:0,carbs:28}],[{name:'Овсянка с бананом',weight:250,calories:220,protein:7,fat:4,carbs:40}],[{name:'Пицца',weight:120,calories:319,protein:13,fat:12,carbs:40},{name:'Салат из овощей',weight:100,calories:45,protein:1,fat:3,carbs:4}]];
const PROMPT=`Ты нутрициолог. По фото определи еду и оцени вес порции.
Верни ТОЛЬКО JSON без пояснений и без markdown:
{"items":[{"name":"Название по-русски","weight":150,"calories":248,"protein":46,"fat":5,"carbs":0}]}
weight — граммы, calories — ккал, protein/fat/carbs — граммы; всё для указанного веса порции.
Если на фото нет еды, верни {"items":[]}.`;
const num=v=>Math.max(0,rnd(Number(v)||0));
/* Здесь подключается распознавание. Без ключа — демо (случайные блюда).
   С ключом — запрос к Claude (Anthropic). Чтобы использовать другой сервис
   (LogMeal и т.п.), замените блок fetch ниже и верните массив
   [{name,weight,calories,protein,fat,carbs}]. Многие API запрещают вызовы
   из браузера (CORS) — тогда нужен свой серверный прокси. */
async function recognize(img){
  const key=S.settings.apiKey.trim();
  if(!key){await new Promise(r=>setTimeout(r,2000));return JSON.parse(JSON.stringify(MOCK[Math.floor(Math.random()*MOCK.length)]))}
  let res;
  try{res=await fetch('https://api.anthropic.com/v1/messages',{method:'POST',headers:{'content-type':'application/json','x-api-key':key,'anthropic-version':'2023-06-01','anthropic-dangerous-direct-browser-access':'true'},
    body:JSON.stringify({model:S.settings.model.trim()||'claude-haiku-5-5',max_tokens:1000,system:PROMPT,messages:[{role:'user',content:[{type:'image',source:{type:'base64',media_type:'image/jpeg',data:img.split(',')[1]}},{type:'text',text:'Что на фото? Верни JSON.'}]}]})})}
  catch(e){throw new Error('Нет соединения с сервисом распознавания.')}
  if(!res.ok)throw new Error(res.status===401?'Неверный API-ключ. Проверь его в настройках.':res.status===429?'Слишком много запросов. Подожди минуту.':`Ошибка сервиса распознавания (${res.status}).`);
  const data=await res.json(),text=(data.content||[]).filter(b=>b.type==='text').map(b=>b.text).join(''),a=text.indexOf('{'),z=text.lastIndexOf('}');
  if(a<0||z<0)throw new Error('Не удалось разобрать ответ. Попробуй ещё раз.');
  return (JSON.parse(text.slice(a,z+1)).items||[]).map(i=>({name:String(i.name||'Блюдо'),weight:num(i.weight),calories:num(i.calories),protein:num(i.protein),fat:num(i.fat),carbs:num(i.carbs)}));
}

/* ---------- сканер ---------- */
function shrink(src,w,h,max,q){const k=Math.min(1,max/Math.max(w,h)),c=document.createElement('canvas');c.width=rnd(w*k);c.height=rnd(h*k);c.getContext('2d').drawImage(src,0,0,c.width,c.height);return c.toDataURL('image/jpeg',q)}
function stopCam(){if(stream)stream.getTracks().forEach(t=>t.stop());stream=null;$('#vid').srcObject=null}
function closeScan(){stopCam();$('#scan').hidden=true}
async function openScan(){
  sc={phase:'live',type:hourType(),items:[]};$('#scan').hidden=false;paintScan();
  try{
    if(!navigator.mediaDevices||!navigator.mediaDevices.getUserMedia)throw new Error('Камера в браузере недоступна.');
    const s=await navigator.mediaDevices.getUserMedia({video:{facingMode:{ideal:'environment'}},audio:false});
    if($('#scan').hidden){s.getTracks().forEach(t=>t.stop());return}
    stream=s;const v=$('#vid');v.srcObject=s;await v.play().catch(()=>{});
  }catch(e){sc.camErr=(e&&e.name==='NotAllowedError')?'Нет доступа к камере. Разреши его в настройках Safari или выбери фото кнопкой слева.':'Камера недоступна. Выбери или сними фото кнопкой слева.';paintScan()}
}
function paintScan(){
  const s=sc;$('#shot').hidden=s.phase==='live';
  let h=`<button class="rb close" data-act="sclose" aria-label="Закрыть">${IC.x}</button>${S.settings.apiKey.trim()?'':'<span class="demo">Демо-режим: ключ не задан</span>'}`;
  if(s.phase==='live')h+=(s.camErr?`<p class="camerr">${esc(s.camErr)}</p>`:'<div class="frame"></div>')+`<div class="shutter-row"><label class="rb pick" aria-label="Снять или выбрать фото">${IC.img}<input type="file" accept="image/*" id="pick" style="display:none"></label>${s.camErr?'':'<button class="shutter" data-act="snap" aria-label="Сделать снимок"></button>'}</div>`;
  else if(s.phase==='analyzing')h+='<div class="analyzing"><p class="pulse">Анализируем…</p></div>';
  else if(s.phase==='result')h+=`<div class="panel"><h2>Распознано</h2><ul>${s.items.map((d,i)=>`<li><span>${esc(d.name)} (${d.weight} г) — <b>${d.calories} ккал</b></span><button class="ix" data-act="sdrop" data-i="${i}" aria-label="Убрать">${IC.x}</button></li>`).join('')}</ul><div class="chips">${chips('stype',s.type)}</div><div class="two"><button class="btn" data-act="smanual">Изменить вручную</button><button class="btn pri" data-act="sok"${s.items.length?'':' disabled'}>Подтвердить</button></div></div>`;
  else h+=`<div class="panel"><p>${esc(s.err)}</p><div class="two"><button class="btn" data-act="smanual">Ввести вручную</button><button class="btn pri" data-act="retry">Повторить</button></div></div>`;
  $('#ui').innerHTML=h;
}
async function analyze(full,small){
  sc.thumb=small;$('#shot').src=full;sc.phase='analyzing';paintScan();
  try{const r=await recognize(full);if($('#scan').hidden)return;if(r.length){sc.items=r;sc.phase='result'}else{sc.err='Еда на фото не найдена. Попробуй ещё раз или введи вручную.';sc.phase='error'}}
  catch(e){if($('#scan').hidden)return;sc.err=e.message||'Не удалось распознать.';sc.phase='error'}
  paintScan();
}
function snap(){const v=$('#vid');if(!v.videoWidth)return;analyze(shrink(v,v.videoWidth,v.videoHeight,1024,.8),shrink(v,v.videoWidth,v.videoHeight,96,.6))}
async function fromFile(f){
  const url=URL.createObjectURL(f),im=new Image();
  try{im.src=url;await im.decode();analyze(shrink(im,im.naturalWidth,im.naturalHeight,1024,.8),shrink(im,im.naturalWidth,im.naturalHeight,96,.6))}
  catch(e){toast('Не удалось открыть фото')}finally{URL.revokeObjectURL(url)}
}

/* ---------- шторка: ручной ввод и настройки ---------- */
function showSheet(h){$('#sheetbody').innerHTML=h;$('#sheet').hidden=false}
function closeSheet(){$('#sheet').hidden=true}
function openManual(){
  mf={n:'',k:0,p:0,f:0,c:0,t:hourType()};
  showSheet(`<div class="sh"><h2>Добавить вручную</h2><button class="ix" data-act="shclose" aria-label="Закрыть">${IC.x}</button></div><input id="q" placeholder="Поиск по базе продуктов" autocomplete="off"><div class="found" id="found"></div><input id="mn" placeholder="Название" maxlength="60"><div class="two"><label>Вес, г<input id="mw" type="number" inputmode="decimal" value="100" min="1"></label><label>Ккал на 100 г<input id="mk" type="number" inputmode="decimal" value="0" min="0"></label></div><div class="chips" id="mchips">${chips('mtype',mf.t)}</div><button class="btn pri wide" id="madd" data-act="madd" disabled>Добавить</button>`);
}
function calc(){
  const w=+$('#mw').value||0,k=+$('#mk').value||0,ok=$('#mn').value.trim()&&w>0&&k>=0;
  $('#madd').disabled=!ok;$('#madd').textContent=`Добавить · ${rnd(k*w/100)} ккал`;
}
function openSettings(){
  const g=S.goals,s=S.settings,gi=(k,l)=>`<label>${l}<input type="number" inputmode="numeric" min="0" data-g="${k}" value="${g[k]}"></label>`;
  showSheet(`<div class="sh"><h2>Настройки</h2><button class="ix" data-act="shclose" aria-label="Закрыть">${IC.x}</button></div><div class="two">${gi('cal','Калории в день')}${gi('p','Белки, г')}${gi('f','Жиры, г')}${gi('c','Углеводы, г')}</div><label>API-ключ Anthropic (для распознавания)<input type="password" autocomplete="off" autocapitalize="off" placeholder="sk-ant-…" data-s="apiKey" value="${esc(s.apiKey)}"></label><label>Модель<input data-s="model" autocapitalize="off" value="${esc(s.model)}"></label><p class="mu">Ключ хранится только на этом устройстве и отправляется только в Anthropic. Без ключа работает демо-режим со случайными блюдами. Оценка калорий по фото приблизительная.</p><div class="two"><button class="btn" data-act="exp">Экспорт</button><button class="btn" data-act="imp">Импорт</button></div><input type="file" id="imp" accept=".json,application/json" style="display:none"><p></p><button class="btn bad wide" data-act="reset">Сбросить день</button>`);
}
async function exportData(){
  const data=JSON.stringify({meals:S.meals,goals:S.goals},null,2),name=`calories_${today()}.json`;
  try{const f=new File([data],name,{type:'application/json'});if(navigator.canShare&&navigator.canShare({files:[f]})){await navigator.share({files:[f],title:name});return}}catch(e){if(e&&e.name==='AbortError')return}
  const a=document.createElement('a');a.href=URL.createObjectURL(new Blob([data],{type:'application/json'}));a.download=name;a.click();setTimeout(()=>URL.revokeObjectURL(a.href),1e3);
}
function importData(f){
  const r=new FileReader();
  r.onload=()=>{try{
    const d=JSON.parse(r.result);if(!d||!Array.isArray(d.meals))throw new Error('bad');
    if(!confirm('Заменить текущие данные импортированными?'))return;
    S.meals=d.meals.filter(m=>m&&Array.isArray(m.items)&&TYPES.some(t=>t[0]===m.type)).map(m=>({id:String(m.id||uid()),type:m.type,timestamp:+m.timestamp||Date.now(),items:m.items.map(i=>({id:String(i.id||uid()),name:String(i.name||'Блюдо'),weight:num(i.weight),calories:num(i.calories),protein:num(i.protein),fat:num(i.fat),carbs:num(i.carbs),imageUrl:typeof i.imageUrl==='string'&&i.imageUrl.startsWith('data:image/')?i.imageUrl:undefined}))}));
    if(d.goals&&typeof d.goals==='object')['cal','p','f','c'].forEach(k=>{if(d.goals[k]!=null)S.goals[k]=num(d.goals[k])});
    save();closeSheet();render();toast('Импорт выполнен');
  }catch(e){toast('Не удалось импортировать файл')}};
  r.readAsText(f);
}

/* ---------- события ---------- */
const THEME_NAMES={system:'как в системе',light:'светлая',dark:'тёмная'};
const ACT={
  tab(d){tab=d.t;render()},
  theme(){const o=['system','light','dark'];S.settings.theme=o[(o.indexOf(S.settings.theme)+1)%3];save();applyTheme();toast('Тема: '+THEME_NAMES[S.settings.theme])},
  settings:openSettings,scan:openScan,shclose:closeSheet,sclose:closeScan,snap,exp:exportData,
  imp(){$('#imp').click()},
  hint(){S.hintHidden=true;save();render()},
  del(d){S.meals=S.meals.filter(m=>m.id!==d.id);save();render()},
  sdrop(d){sc.items.splice(+d.i,1);paintScan()},
  stype(d){sc.type=d.k;paintScan()},
  retry(){sc.phase='live';paintScan()},
  smanual(){closeScan();openManual()},
  sok(){const items=sc.items.map((x,i)=>({...x,id:uid(),imageUrl:i===0?sc.thumb:undefined}));closeScan();addMeal(items,sc.type)},
  mtype(d){mf.t=d.k;$('#mchips').innerHTML=chips('mtype',mf.t)},
  madd(){const w=+$('#mw').value,k=+$('#mk').value,x=w/100;addMeal([{id:uid(),name:$('#mn').value.trim(),weight:w,calories:rnd(k*x),protein:rnd(mf.p*x),fat:rnd(mf.f*x),carbs:rnd(mf.c*x)}],mf.t)},
  reset(){if(confirm('Удалить все записи за сегодня?')){S.meals=S.meals.filter(m=>!isToday(m.timestamp));save();closeSheet();render();toast('День сброшен')}}
};
document.addEventListener('click',e=>{
  const b=e.target.closest('[data-act]');
  if(b&&ACT[b.dataset.act])ACT[b.dataset.act](b.dataset);
  else if(e.target.id==='sheet')closeSheet();
});
document.addEventListener('input',e=>{
  const id=e.target.id;
  if(id==='q'){
    const q=e.target.value.trim().toLowerCase();
    $('#found').innerHTML=q?FOODS.filter(f=>f[0].toLowerCase().includes(q)).slice(0,5).map((f,i)=>`<button data-i="${FOODS.indexOf(f)}"><span>${esc(f[0])}</span><small>${f[1]} ккал / 100 г</small></button>`).join(''):'';
  }else if(id==='mn'||id==='mw'||id==='mk')calc();
});
document.addEventListener('click',e=>{
  const b=e.target.closest('#found button');if(!b)return;
  const f=FOODS[+b.dataset.i];mf={...mf,n:f[0],k:f[1],p:f[2],f:f[3],c:f[4]};
  $('#mn').value=f[0];$('#mk').value=f[1];$('#q').value='';$('#found').innerHTML='';calc();
});
document.addEventListener('change',e=>{
  const t=e.target,f=t.files&&t.files[0];
  if(t.id==='pick'&&f){t.value='';fromFile(f)}
  else if(t.id==='imp'&&f){t.value='';importData(f)}
  else if(t.dataset.g){S.goals[t.dataset.g]=Math.max(0,+t.value||0);save();render()}
  else if(t.dataset.s){S.settings[t.dataset.s]=t.value.trim();save()}
});

/* ---------- запуск ---------- */
$('#themebtn').innerHTML=IC.mode;$('#setbtn').innerHTML=IC.gear;$('#fabbtn').innerHTML=IC.cam+' Добавить еду';
applyTheme();render();
if(navigator.storage&&navigator.storage.persist)navigator.storage.persist().catch(()=>{});
if('serviceWorker' in navigator)addEventListener('load',()=>navigator.serviceWorker.register('sw.js').catch(()=>{}));
