/* Золотой мяч Лесного — 2026. Без сторонних JS-зависимостей. */
(() => {
'use strict';
const NAMES = [
 'Глеб','Ваня','Игорь','Николаич','Серёга (Якут маленький)','Сергей (Якут большой)',
 'Стёпа','Дядя Серёжа','Гипер Алексей','Лёха Бетон','Саня Судачков','Алексей (Джейд)',
 'Ильгам','Андрей','Вова','Владимир','Дядя Саша','Дядя Паша','Ярик','Макар',
 'Кирилл (младший брат Макара)','Шатак','Тимофей','Егор','Пафланков','Илья','Митяй',
 'Денис Фролов','Мишка','Ибра','Бек','Элвин','Бахтияров Ярослав','Паша маленький',
 'Игнат','Гоша'
];
const AWARDS=globalThis.LESNOE_AWARDS;
let POINTS=AWARDS[0].points;
const activeAward=()=>AWARDS.find(a=>a.id===state.award);
const limit=()=>POINTS.length;
const FALLBACK_NOMINEES = NAMES.map((name,i) => ({id:`p${String(i+1).padStart(2,'0')}`,name}));
const API_ORIGIN = location.hostname === 'glebmorkovin.github.io' ? 'https://lesnoe-ballondor-2026-gleb.ghh1988.chatgpt.site' : '';
const $ = (id) => document.getElementById(id);
const state = {
 nominees:FALLBACK_NOMINEES, selected:[], results:[], votes:0,
 myVote:null, votingOpen:true, requireCodes:false, demo:false, rankingMode:'official',
 adminKey:'', heroUrl:null, step:'select', award:'main', loading:true, submitting:false, connectionError:false, resultsAward:'main', resultsLoading:true
};
function esc(s){return String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));}
function initials(name){return name.trim().replace(/\(.*\)/g,'').split(/\s+/).slice(0,2).map(x=>x[0]).join('').toUpperCase();}
function findNominee(id){return state.nominees.find(p=>p.id===id);}
function toast(message){const e=$('toast');e.textContent=message;e.classList.add('show');clearTimeout(toast.timer);toast.timer=setTimeout(()=>e.classList.remove('show'),3600);}
function feedback(message,type=''){const e=$('voteFeedback');e.className='feedback '+type;e.textContent=message;}
function draftKey(){return 'lesnoe_2026_draft'+(state.award==='main'?'':'_'+state.award);}
function draftSave(){try{localStorage.setItem(draftKey(),JSON.stringify(state.selected));}catch{}}
function draftLoad(){try{const value=JSON.parse(localStorage.getItem(draftKey())||'[]'); if(Array.isArray(value)){state.selected=[...new Set(value.filter(v=>state.nominees.some(n=>n.id===v)))].slice(0,limit());}}catch{}}
function allDemoBallots(){try{const v=JSON.parse(localStorage.getItem('lesnoe_2026_ballots')||'[]');return Array.isArray(v)?v:[];}catch{return [];}}
function demoBallots(){return allDemoBallots().filter(b=>(b.award||'main')===state.award);}
function leaderboard(ballots){const rows=state.nominees.map(n=>({...n,points:0,firstPlaces:0,mentions:0,positions:new Array(limit()).fill(0)}));const byId=Object.fromEntries(rows.map(v=>[v.id,v]));for(const ballot of ballots){if(!Array.isArray(ballot.picks))continue;ballot.picks.forEach((id,i)=>{const p=byId[id];if(p&&i<limit()){p.points+=POINTS[i];p.positions[i]+=1;p.mentions+=1;if(i===0)p.firstPlaces+=1;}});}return rows;}
const resultAward=()=>AWARDS.find(a=>a.id===state.resultsAward);
function compareOfficial(a,b){if(b.points!==a.points)return b.points-a.points;for(let i=0;i<resultAward().points.length;i++){if(b.positions[i]!==a.positions[i])return b.positions[i]-a.positions[i];}return a.name.localeCompare(b.name,'ru');}
function compareFirst(a,b){return (b.firstPlaces-a.firstPlaces)||compareOfficial(a,b);}
function rankData(){const rows=state.results.map(x=>({...x}));rows.sort(state.rankingMode==='official'?compareOfficial:compareFirst);return rows;}
function refreshAll(){renderAwardDetails();renderNominees();renderVoteCandidates();renderBallot();renderResults();}
function pick(id){
 if(state.loading||state.submitting)return;
 if(state.myVote){toast('В этой награде голос уже отправлен. Выбери другую номинацию.');return;}
 if(!state.votingOpen){toast('Приём голосов закрыт организатором.');return;}
 if(state.selected.includes(id)){toast('Этот игрок уже в твоём топ-'+limit()+'.');return;}
 if(state.selected.length===limit()){toast('Все '+limit()+' мест заняты. Удали кого-то из списка, чтобы выбрать другого.');return;}
 if(!findNominee(id))return;
 state.selected.push(id);draftSave();renderNominees();renderVoteCandidates();renderBallot();
}
function setPlace(id,value){
 if(state.myVote||!state.votingOpen||state.loading||state.submitting)return;
 const place=Number(value),from=state.selected.indexOf(id);
 if(!Number.isInteger(place)||place<1||place>limit()||String(value).trim()===''){toast('Укажи целое место от 1 до '+limit()+'.');renderBallot();return;}
 if(from<0||from===place-1)return;
 state.selected.splice(from,1);state.selected.splice(place-1,0,id);draftSave();renderBallot();
 toast(findNominee(id).name+' — место '+place+'. Остальные игроки сдвинулись.');
}
function showStep(step){state.step=step;renderBallot();(step==='rank'?$('ballotPanel'):$('selectionPanel')).scrollIntoView({behavior:'smooth',block:'start'});}
function remove(position){if(state.myVote||!state.votingOpen||state.loading||state.submitting)return;state.selected.splice(position,1);state.step='select';draftSave();refreshAll();}
function matches(name,query){return name.toLocaleLowerCase('ru').includes(query.toLocaleLowerCase('ru').trim());}
function renderNominees(){
 const q=$('nomineeSearch').value;const shown=state.nominees.filter(n=>matches(n.name,q));
 $('nomineesShown').textContent=shown.length+' ИГРОКОВ';$('nomineeCount').textContent=state.nominees.length;
 $('nomineesGrid').innerHTML=shown.map(n=>{
 const chosen=state.selected.includes(n.id);return `<button class="nominee-card ${chosen?'chosen':''}" data-pick="${n.id}" type="button" aria-label="${chosen?'Уже выбран: ':'Добавить: '}${esc(n.name)}"><span class="nominee-avatar">${esc(initials(n.name))}</span><span><b class="nominee-name">${esc(n.name)}</b><small class="nominee-meta">НОМИНАНТ • 2026</small></span><span class="nominee-action">${chosen?'✓':'+'}</span></button>`;
 }).join('')||'<div class="empty-filter">Никого не нашли — попробуй другое имя.</div>';
}
function renderVoteCandidates(){
 const q=$('voteSearch').value;const shown=state.nominees.filter(n=>matches(n.name,q));
 $('voteCandidates').innerHTML=shown.map(n=>{
 const chosen=state.selected.includes(n.id),locked=!!state.myVote||!state.votingOpen||(!chosen&&state.selected.length>=limit());
 return `<button type="button" class="candidate-option ${chosen?'selected':''}" data-pick="${n.id}" ${locked?'disabled':''} aria-label="${chosen?'Убрать из топ-'+limit()+': ':'Выбрать '}${esc(n.name)}"><span class="candidate-mini">${esc(initials(n.name))}</span><b>${esc(n.name)}</b><span class="${chosen?'mini-selected':'plus'}">${chosen?'✓':'+'}</span></button>`;
 }).join('')||'<p style="color:#a9ad9c;text-align:center">Игроков не найдено</p>';
}
function renderBallot(){
 const selected=state.selected;const count=selected.length;$('selectedCount').textContent=count;
 const ranking=!!state.myVote||(state.step==='rank'&&count===limit());
 $('selectionPanel').classList.toggle('hidden',ranking);$('ballotPanel').classList.toggle('hidden',!ranking);
 $('selectionCount').textContent='ВЫБРАНО '+count+' / '+limit();
 $('selectionHint').textContent=state.loading?'Загружаем награду…':count===limit()?'Топ-'+limit()+' собран. Теперь расставь игроков по местам.':'Выбрано '+count+' из '+limit()+'. Осталось выбрать: '+(limit()-count)+'.';
 $('continueBallot').disabled=count!==limit()||!state.votingOpen||state.loading;
 $('backToSelection').classList.toggle('hidden',!!state.myVote);$('viewBallotResults').classList.toggle('hidden',!state.myVote);
 $('selectedPlayers').innerHTML=selected.map((id,i)=>`<button type="button" data-unpick="${i}" class="selected-player" ${state.myVote||!state.votingOpen?'disabled':''} aria-label="Убрать из топ-${limit()}: ${esc(findNominee(id).name)}">${esc(findNominee(id).name)} <span aria-hidden="true">×</span></button>`).join('');
 $('ballotProgress').style.width=(count/limit()*100)+'%';
 $('ballotList').innerHTML=POINTS.map((p,i)=>{
 const nominee=findNominee(selected[i]);const filled=!!nominee;
 const place=filled&&!state.myVote?`<input class="place-input" type="number" min="1" max="${limit()}" step="1" inputmode="numeric" value="${i+1}" data-place="${nominee.id}" aria-label="Место для ${esc(nominee.name)}" ${!state.votingOpen?'disabled':''}>`:`<span class="ballot-place">${String(i+1).padStart(2,'0')}.</span>`;
 return `<div class="ballot-row ${filled?'filled':''} ${i===0&&filled?'first':''}">${place}<span class="ballot-name">${nominee?esc(nominee.name):'Выбери игрока'}</span><span class="ballot-points">+${p} ОЧК.</span></div>`;
 }).join('');
 const submit=$('submitVote');submit.disabled=!(count===limit()&&!state.myVote&&state.votingOpen&&!state.loading&&!state.submitting);$('voterName').disabled=!!state.myVote||!state.votingOpen;$('inviteCode').disabled=!!state.myVote||!state.votingOpen;
 submit.textContent=state.submitting?'ОТПРАВЛЯЕМ…':'ОТПРАВИТЬ ГОЛОС ↗';
 if(state.myVote){submit.textContent='ГОЛОС УЧТЁН ✓';feedback('Твой топ-'+limit()+' в награде «'+activeAward().shortName+'» сохранён. Можно голосовать в других номинациях.','success');}
 else if(state.loading){feedback('Загружаем награду…');}
 else if(state.connectionError){feedback('Нет соединения с сервером. Обнови страницу, чтобы продолжить.','error');}
 else if(!state.votingOpen){feedback('Организатор закрыл приём голосов. Посмотреть результаты по-прежнему можно.','error');}
 else if(count<limit()){feedback('Осталось свободных мест: '+(limit()-count)+'.');}
 else{feedback('Проверь места, введи своё имя и отправь бюллетень.','success');}
 $('inviteCodeWrap').classList.toggle('hidden',!state.requireCodes);
}
function plural(n,forms){return forms[n%10===1&&n%100!==11?0:n%10>=2&&n%10<=4&&(n%100<12||n%100>14)?1:2];}
function renderResults(){
 renderResultDetails();
 const ranked=rankData(), votes=state.votes;$('votesCount').textContent=votes;
 $('sortOfficial').classList.toggle('active',state.rankingMode==='official');$('sortFirst').classList.toggle('active',state.rankingMode==='first');
 $('rankingBody').innerHTML=ranked.map((n,i)=>`<tr><td><span class="rank-number">${n.points?String(i+1).padStart(2,'0'):'—'}</span></td><td><div class="rank-player"><span class="rank-avatar">${esc(initials(n.name))}</span><span>${esc(n.name)}</span></div></td><td class="numcol points-cell">${n.points}</td><td class="numcol">${n.firstPlaces}</td><td class="numcol">${n.mentions}</td></tr>`).join('');
 if(state.resultsLoading){$('podiumWrap').innerHTML='<div class="waiting-state"><span>✧</span><h3>Загружаем результаты…</h3></div>';return;}
 if(!votes){$('podiumWrap').innerHTML='<div class="waiting-state"><span>✧</span><h3>История ещё пишется</h3><p>Как только появится первый голос, здесь появятся лидеры сезона.</p></div>';return;}
 const top=ranked.slice(0,3);$('podiumWrap').innerHTML='<div class="podium">'+top.map((n,i)=>`<div class="podium-card place-${i+1}"><span class="podium-medal">${i===0?'✦ ЗОЛОТО':'✧ '+(i===1?'СЕРЕБРО':'БРОНЗА')} / 0${i+1}</span><div class="podium-icon">${esc(initials(n.name))}</div><h3>${esc(n.name)}</h3><strong>${n.points}</strong><small>ОЧКОВ · ${n.firstPlaces} ПЕРВЫХ МЕСТ</small></div>`).join('')+'</div>';
}
function renderPoints(){$('pointsGrid').innerHTML=POINTS.map((n,i)=>`<div class="point-item"><b>${n}</b><small>${i+1}-Е МЕСТО</small></div>`).join('');}
function applyHero(url){if(!url)return;state.heroUrl=url;const safeUrl = /^\/api\/hero(?:\?|$)/.test(url) ? API_ORIGIN+url : null;if(safeUrl){$('heroBackdrop').style.backgroundImage=`url('${safeUrl}')`;}}
let voterSession;
function crossSiteSession(){if(voterSession)return voterSession;try{voterSession=localStorage.getItem('lesnoe_2026_voter_session');}catch{}if(!/^[a-f0-9]{48}$/.test(voterSession||'')){voterSession=Array.from(crypto.getRandomValues(new Uint8Array(24)),b=>b.toString(16).padStart(2,'0')).join('');try{localStorage.setItem('lesnoe_2026_voter_session',voterSession);}catch{}}return voterSession;}
function apiFetch(path,opts={}){return fetch(API_ORIGIN+'/api/'+path,{cache:'no-store',...opts,credentials:API_ORIGIN?'omit':'same-origin',headers:{...(API_ORIGIN?{'X-Voter-Session':crossSiteSession()}:{}),...opts.headers}});}
async function request(path,opts={}){
 const response=await apiFetch(path,opts);
 let data;try{data=await response.json();}catch{data={error:'Не удалось прочитать ответ сервера.'};}
 if(!response.ok)throw new Error(data.error||`Ошибка ${response.status}`);return data;
}
function initDemo(){state.demo=true;$('demoBanner').classList.remove('hidden');const records=demoBallots();const own=records.find(v=>v.session===getDemoSession());state.myVote=own?own.picks:null;}
function getDemoSession(){let key;try{key=localStorage.getItem('lesnoe_2026_session');if(!key){key='demo-'+Math.random().toString(36).slice(2)+Date.now();localStorage.setItem('lesnoe_2026_session',key);}}catch{key='no-storage';}return key;}
let loadSequence=0;
async function load(){
 const sequence=++loadSequence,award=state.award;
 state.loading=true;state.connectionError=false;state.votingOpen=false;
 if(location.protocol==='file:'){initDemo();state.votingOpen=true;state.loading=false;return;}
 try{
  const info=await request('state?award='+encodeURIComponent(award));
  if(sequence!==loadSequence)return false;
  if(Array.isArray(info.nominees)&&info.nominees.length)state.nominees=info.nominees;
  state.myVote=info.myVote?.picks||null;state.votingOpen=!!info.votingOpen;state.requireCodes=!!info.requireCodes;
  applyHero(info.heroUrl);
 }catch(err){if(sequence!==loadSequence)return false;console.error('Backend unavailable',err);state.connectionError=true;state.votingOpen=false;toast('Нет соединения с сервером. Обнови страницу перед голосованием.');}
 finally{if(sequence===loadSequence)state.loading=false;}
 return sequence===loadSequence;
}
async function switchAward(id,scroll=false){
 if(state.submitting){toast('Подожди, бюллетень отправляется.');$('awardSelect').value=state.award;return;}
 if(!AWARDS.some(a=>a.id===id))return;
 if(id===state.award){if(scroll)$('vote').scrollIntoView({behavior:'smooth'});return;}
 if(!state.myVote)draftSave();
 const name=$('voterName').value;try{if(name)localStorage.setItem('lesnoe_voter_name',name);}catch{}
 state.award=id;POINTS=activeAward().points;state.selected=[];state.myVote=null;state.step='select';state.loading=true;
 $('nomineeSearch').value='';$('voteSearch').value='';refreshAll();renderPoints();
 if(scroll)$('vote').scrollIntoView({behavior:'smooth'});
 const current=await load();if(current===false||state.award!==id)return;
 if(state.myVote)state.selected=[...state.myVote];else draftLoad();refreshAll();
}
let resultsSequence=0;
async function updateResults(){
 const award=state.resultsAward,sequence=++resultsSequence;
 if(state.demo){const records=allDemoBallots().filter(b=>(b.award||'main')===award);const oldPoints=POINTS;POINTS=resultAward().points;state.results=leaderboard(records);POINTS=oldPoints;state.votes=records.length;state.resultsLoading=false;renderResults();return;}
 try{const data=await request('results?award='+encodeURIComponent(award));if(sequence!==resultsSequence||award!==state.resultsAward)return;state.votes=data.votes;state.results=data.standings;state.resultsLoading=false;renderResults();}
 catch{if(sequence!==resultsSequence)return;state.resultsLoading=false;$('podiumWrap').innerHTML='<div class="waiting-state"><h3>Не удалось загрузить результаты</h3><p>Обнови страницу или выбери награду ещё раз.</p></div>';}
}
async function switchResults(id){if(!AWARDS.some(a=>a.id===id))return;state.resultsAward=id;state.results=[];state.votes=0;state.resultsLoading=true;state.rankingMode='official';renderResults();await updateResults();}
async function submitVote(){
 if(state.myVote||state.submitting||state.loading||!state.votingOpen)return;
 if(state.selected.length!==limit()){toast('Для этой награды выбери ровно '+limit()+' разных номинантов.');return;}
 const name=$('voterName').value.trim().replace(/\s+/g,' '), code=$('inviteCode').value.trim().toUpperCase();
 if(name.length<2||name.length>48){feedback('Укажи своё имя (от 2 до 48 символов).','error');$('voterName').focus();return;}
 if(state.requireCodes&&!code){feedback('Введи персональный код от организатора.','error');$('inviteCode').focus();return;}
 state.submitting=true;$('submitVote').disabled=true;feedback('Отправляем бюллетень…');
 try{
  const payload={award:state.award,name,picks:[...state.selected],code};
  if(state.demo){const records=demoBallots();if(records.some(r=>r.name.toLowerCase()===name.toLowerCase()))throw new Error('Это имя уже участвовало в голосовании.');if(records.some(r=>r.session===getDemoSession()))throw new Error('На этом устройстве уже голосовали.');records.push({...payload,session:getDemoSession()});localStorage.setItem('lesnoe_2026_ballots',JSON.stringify([...allDemoBallots().filter(b=>(b.award||'main')!==state.award),...records]));state.myVote=[...state.selected];await updateResults();
  }else{await request('vote',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(payload)});state.myVote=[...state.selected];await updateResults();}
  state.submitting=false;toast('Голос за «'+activeAward().shortName+'» принят. Спасибо!');refreshAll();if(state.award==='main')setTimeout(()=>$('ranking').scrollIntoView({behavior:'smooth'}),700);
 }catch(e){feedback(e.message,'error');$('submitVote').disabled=false;}finally{state.submitting=false;}
}
function adminMessage(message,type=''){const el=$('adminFeedback');el.className='feedback '+type;el.textContent=message;}
async function adminRequest(path,opts={}){return request('admin/'+path,{...opts,headers:{'X-Admin-Key':state.adminKey,...(opts.headers||{})}});}
async function adminAuth(){if(state.demo){adminMessage('Панель работает только при запущенном сервере.','error');return;}state.adminKey=$('adminPassword').value;try{const d=await adminRequest('status');$('adminTools').classList.remove('hidden');$('adminVotingOpen').checked=!!d.votingOpen;$('adminCodesRequired').checked=!!d.requireCodes;adminMessage('Доступ открыт. Всего бюллетеней во всех наградах: '+(d.totalBallots??d.votes),'success');}catch(e){adminMessage(e.message,'error');}}
async function adminSave(){try{const data=await adminRequest('settings',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({votingOpen:$('adminVotingOpen').checked,requireCodes:$('adminCodesRequired').checked})});state.votingOpen=data.votingOpen;state.requireCodes=data.requireCodes;refreshAll();adminMessage('Настройки сохранены.','success');}catch(e){adminMessage(e.message,'error');}}
async function adminUpload(){const f=$('adminHero').files?.[0];if(!f){adminMessage('Выбери фотографию.','error');return;}if(f.size>8*1024*1024){adminMessage('Файл больше 8 МБ.','error');return;}try{const data=await adminRequest('hero',{method:'PUT',headers:{'Content-Type':f.type||'application/octet-stream'},body:f});applyHero(data.heroUrl+'?t='+Date.now());adminMessage('Фото сезона загружено. Обнови страницу, если изображение ещё старое.','success');}catch(e){adminMessage(e.message,'error');}}
async function adminGenerate(){const n=Math.max(1,Math.min(100,Number($('codesAmount').value)||10));try{const d=await adminRequest('codes',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({count:n})});$('generatedCodes').value=d.codes.join('\n');adminMessage(`Сгенерировано ${d.codes.length} кодов. Скопируй и сохрани: повторно получить их нельзя.`,'success');}catch(e){adminMessage(e.message,'error');}}
async function adminExport(){if(state.demo){adminMessage('Экспорт доступен после запуска сервера.','error');return;}try{const r=await apiFetch('admin/export',{headers:{'X-Admin-Key':state.adminKey}});if(!r.ok)throw new Error('Ошибка экспорта: '+r.status);const blob=await r.blob();const url=URL.createObjectURL(blob);const a=document.createElement('a');a.href=url;a.download='lesnoe-ballondor-2026-votes.csv';a.click();URL.revokeObjectURL(url);adminMessage('CSV загружен.','success');}catch(e){adminMessage(e.message,'error');}}
function renderAwardDetails(){
 const a=activeAward(),n=limit();
 $('awardSelect').value=a.id;
 $('activeAwardName').textContent=a.name;$('activeAwardDescription').textContent=a.description;$('activeAwardGuidance').textContent=a.guidance;
 $('awardScoring').textContent=n===3?'Три разных номинанта · 1-е место — 3 очка · 2-е — 2 · 3-е — 1':'Десять разных игроков · Очки за места: '+POINTS.join(', ');
 $('voteTitle').innerHTML='СОСТАВЬ СВОЙ <em>ТОП-'+n+'</em>';
 $('selectionInstruction').textContent='Сначала выбери '+n+' разных номинантов — пока в любом порядке. Затем расставь их по местам в бюллетене.';
 $('rankingInstruction').textContent='Введи место от 1 до '+n+' рядом с игроком и нажми Enter или выйди из поля. Игрок переместится на это место, остальные сдвинутся. Первое место — '+POINTS[0]+(n===3?' очка.':' очков.');
 $('ballotLimit').textContent=n;$('backToSelection').textContent='← ИЗМЕНИТЬ СОСТАВ ТОП-'+n;
 $('rulesAwardTitle').textContent='Твой топ-'+n+' = один бюллетень';
 $('rulesAwardDescription').textContent=a.guidance+' Очки за места: '+POINTS.join(', ')+'. Побеждает кандидат с наибольшей суммой очков в этой награде.';
 document.querySelectorAll('[data-award]').forEach(button=>{button.classList.toggle('active',button.dataset.award===a.id);button.setAttribute('aria-pressed',String(button.dataset.award===a.id));});
}
function renderResultDetails(){const a=resultAward();$('resultsAwardSelect').value=a.id;$('rankingAwardName').textContent=a.name;$('mentionsHeading').textContent='В ТОП-'+a.points.length;$('rankingAwardDescription').textContent=a.id==='main'?'По умолчанию здесь результаты Золотого мяча — лучшего игрока Лесного в целом. Другие награды можно открыть в списке выше.':'Результаты награды «'+a.name+'». Очки из других категорий сюда не входят.';}
function initAwards(){
 const options=AWARDS.map(a=>`<option value="${a.id}">${esc(a.name)}</option>`).join('');$('awardSelect').innerHTML=options;$('resultsAwardSelect').innerHTML=options;
 $('awardsGrid').innerHTML=AWARDS.map((a,i)=>`<article class="award-card ${i===0?'award-card-main':''}"><div class="award-card-top"><span class="award-icon" aria-hidden="true">${a.icon}</span><span class="mini-tag">${i===0?'ГЛАВНАЯ НАГРАДА':'ТОП-3 · 3 / 2 / 1'}</span></div><h3>${esc(a.name)}</h3><p>${esc(a.description)}</p><details><summary>Как голосовать</summary><p>${esc(a.guidance)}</p><p>${i===0?'Очки за места: '+a.points.join(', '):'1-е место — 3 очка, 2-е — 2, 3-е — 1. Выбери ровно трёх разных номинантов.'}</p></details><button type="button" class="award-vote-button" data-award="${a.id}" aria-pressed="false">ВЫБРАТЬ ${i===0?'ТОП-10':'ТОП-3'} <span aria-hidden="true">↗</span><span class="sr-only"> — ${esc(a.name)}</span></button></article>`).join('');
 $('awardsGrid').addEventListener('click',e=>{const button=e.target.closest('[data-award]');if(button)switchAward(button.dataset.award,true);});
 $('awardSelect').addEventListener('change',e=>switchAward(e.target.value));$('resultsAwardSelect').addEventListener('change',e=>switchResults(e.target.value));
 try{$('voterName').value=localStorage.getItem('lesnoe_voter_name')||'';}catch{}
}
const momentsState={items:[],index:0,paused:matchMedia('(prefers-reduced-motion: reduce)').matches,sending:false};
function momentFeedback(message,error=false){$('momentFeedback').textContent=message;$('momentFeedback').className='feedback '+(error?'error':'success');}
function renderMoment(){
 const {items}=momentsState;momentsState.index=items.length?((momentsState.index%items.length)+items.length)%items.length:0;
 const item=items[momentsState.index];$('momentText').textContent=item?item.text:'Пока нет историй. Вспомни гол, спасение, смешной эпизод или день, который хочется сохранить в истории нашего поля.';
 $('momentCount').textContent=items.length?(momentsState.index+1)+' / '+items.length:'ТВОЯ ИСТОРИЯ МОЖЕТ СТАТЬ ПЕРВОЙ';
 $('momentPrev').disabled=items.length<2;$('momentNext').disabled=items.length<2;$('momentPause').disabled=items.length<2;
 $('momentPause').textContent=momentsState.paused?'ПРОДОЛЖИТЬ ↗':'ПАУЗА Ⅱ';$('momentPause').setAttribute('aria-pressed',String(momentsState.paused));
}
async function loadMoments(quiet=false){try{const id=momentsState.items[momentsState.index]?.id;const data=await request('moments');momentsState.items=data.moments;const keep=data.moments.findIndex(item=>item.id===id);momentsState.index=keep>=0?keep:0;renderMoment();}catch{if(!quiet)$('momentText').textContent='Истории пока не загрузились. Обнови страницу, чтобы прочитать или добавить момент года.';}}
function shiftMoment(delta){momentsState.index+=delta;renderMoment();}
async function submitMoment(event){
 event.preventDefault();if(momentsState.sending)return;const text=$('momentInput').value.trim();if(text.length<15||text.length>1200){momentFeedback('Опиши момент: от 15 до 1200 символов.',true);return;}
 momentsState.sending=true;$('momentSubmit').disabled=true;momentFeedback('Публикуем историю…');
 try{const data=await request('moments',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({text})});momentsState.items=[data.moment,...momentsState.items.filter(m=>m.id!==data.moment.id)];momentsState.index=0;momentsState.paused=true;renderMoment();$('momentForm').reset();$('momentLength').textContent='0 / 1200';momentFeedback('Твой момент опубликован анонимно. Он уже виден всем.');}
 catch(e){momentFeedback(e.message,true);}finally{momentsState.sending=false;$('momentSubmit').disabled=false;}
}
function initMoments(){
 $('momentForm').addEventListener('submit',submitMoment);$('momentInput').addEventListener('input',()=>$('momentLength').textContent=$('momentInput').value.length+' / 1200');
 $('momentPrev').addEventListener('click',()=>{momentsState.paused=true;shiftMoment(-1);});$('momentNext').addEventListener('click',()=>{momentsState.paused=true;shiftMoment(1);});$('momentPause').addEventListener('click',()=>{momentsState.paused=!momentsState.paused;renderMoment();});
 setInterval(()=>{const banner=$('momentBanner');if(!momentsState.paused&&!document.hidden&&!banner.matches(':hover')&&!banner.contains(document.activeElement)&&momentsState.items.length>1)shiftMoment(1);},12000);
 renderMoment();
}
function bind(){
 $('nomineesGrid').addEventListener('click',e=>{const b=e.target.closest('[data-pick]');if(b){pick(b.dataset.pick);$('vote').scrollIntoView({behavior:'smooth',block:'start'});}});
 $('voteCandidates').addEventListener('click',e=>{const b=e.target.closest('[data-pick]');if(b){const i=state.selected.indexOf(b.dataset.pick);if(i>=0)remove(i);else pick(b.dataset.pick);}});
 $('nomineeSearch').addEventListener('input',renderNominees);$('voteSearch').addEventListener('input',renderVoteCandidates);
 $('continueBallot').addEventListener('click',()=>{if(state.selected.length===limit())showStep('rank');});
 $('backToSelection').addEventListener('click',()=>showStep('select'));
 $('selectedPlayers').addEventListener('click',e=>{const b=e.target.closest('[data-unpick]');if(b)remove(Number(b.dataset.unpick));});
 $('ballotList').addEventListener('focusout',e=>{if(e.target.matches('[data-place]'))setPlace(e.target.dataset.place,e.target.value);});
 $('ballotList').addEventListener('keydown',e=>{if(e.key==='Enter'&&e.target.matches('[data-place]')){e.preventDefault();setPlace(e.target.dataset.place,e.target.value);}});
 $('submitVote').addEventListener('click',submitVote);
 $('viewBallotResults').addEventListener('click',()=>{switchResults(state.award);$('ranking').scrollIntoView({behavior:'smooth'});});
 $('sortOfficial').addEventListener('click',()=>{state.rankingMode='official';renderResults();});
 $('sortFirst').addEventListener('click',()=>{state.rankingMode='first';renderResults();});
 $('menuBtn').addEventListener('click',()=>{const open=$('mobileLinks').classList.toggle('open');$('menuBtn').setAttribute('aria-expanded',String(open));});
 document.querySelectorAll('#mobileLinks a').forEach(x=>x.addEventListener('click',()=>$('mobileLinks').classList.remove('open')));
 $('adminOpen').addEventListener('click',()=>$('adminDialog').showModal());$('adminClose').addEventListener('click',()=>$('adminDialog').close());
 $('adminDialog').addEventListener('click',e=>{if(e.target===$('adminDialog'))$('adminDialog').close();});
 $('adminAuth').addEventListener('click',adminAuth);$('adminSave').addEventListener('click',adminSave);$('adminUpload').addEventListener('click',adminUpload);$('adminGenerate').addEventListener('click',adminGenerate);$('adminExport').addEventListener('click',adminExport);
 $('adminCopy').addEventListener('click',async()=>{try{await navigator.clipboard.writeText($('generatedCodes').value);adminMessage('Коды скопированы.','success');}catch{adminMessage('Не получилось скопировать. Выдели текст вручную.','error');}});
}
async function start(){initAwards();initMoments();bind();renderAwardDetails();renderPoints();renderResults();await Promise.all([load(),updateResults(),loadMoments()]);if(state.myVote)state.selected=[...state.myVote];else draftLoad();refreshAll();setInterval(()=>{if(!document.hidden){updateResults();loadMoments(true);}},30000);}
start();
})();
