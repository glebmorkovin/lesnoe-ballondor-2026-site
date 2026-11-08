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
const POINTS = [15,12,10,8,7,5,4,3,2,1];
const FALLBACK_NOMINEES = NAMES.map((name,i) => ({id:`p${String(i+1).padStart(2,'0')}`,name}));
const API_ORIGIN = location.hostname === 'glebmorkovin.github.io' ? 'https://lesnoe-ballondor-2026-gleb.ghh1988.chatgpt.site' : '';
const $ = (id) => document.getElementById(id);
const state = {
 nominees:FALLBACK_NOMINEES, selected:[], results:[], votes:0,
 myVote:null, votingOpen:true, requireCodes:false, demo:false, rankingMode:'official',
 adminKey:'', heroUrl:null, step:'select'
};
function esc(s){return String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));}
function initials(name){return name.trim().replace(/\(.*\)/g,'').split(/\s+/).slice(0,2).map(x=>x[0]).join('').toUpperCase();}
function findNominee(id){return state.nominees.find(p=>p.id===id);}
function toast(message){const e=$('toast');e.textContent=message;e.classList.add('show');clearTimeout(toast.timer);toast.timer=setTimeout(()=>e.classList.remove('show'),3600);}
function feedback(message,type=''){const e=$('voteFeedback');e.className='feedback '+type;e.textContent=message;}
function draftSave(){try{localStorage.setItem('lesnoe_2026_draft',JSON.stringify(state.selected));}catch{}}
function draftLoad(){try{const value=JSON.parse(localStorage.getItem('lesnoe_2026_draft')||'[]'); if(Array.isArray(value)){state.selected=[...new Set(value.filter(v=>state.nominees.some(n=>n.id===v)))].slice(0,10);}}catch{}}
function demoBallots(){try{const v=JSON.parse(localStorage.getItem('lesnoe_2026_ballots')||'[]');return Array.isArray(v)?v:[];}catch{return [];}}
function leaderboard(ballots){const rows=state.nominees.map(n=>({...n,points:0,firstPlaces:0,mentions:0,positions:new Array(10).fill(0)}));const byId=Object.fromEntries(rows.map(v=>[v.id,v]));for(const ballot of ballots){if(!Array.isArray(ballot.picks))continue;ballot.picks.forEach((id,i)=>{const p=byId[id];if(p&&i<10){p.points+=POINTS[i];p.positions[i]+=1;p.mentions+=1;if(i===0)p.firstPlaces+=1;}});}return rows;}
function compareOfficial(a,b){if(b.points!==a.points)return b.points-a.points;for(let i=0;i<10;i++){if(b.positions[i]!==a.positions[i])return b.positions[i]-a.positions[i];}return a.name.localeCompare(b.name,'ru');}
function compareFirst(a,b){return (b.firstPlaces-a.firstPlaces)||compareOfficial(a,b);}
function rankData(){const rows=state.results.map(x=>({...x}));rows.sort(state.rankingMode==='official'?compareOfficial:compareFirst);return rows;}
function refreshAll(){renderNominees();renderVoteCandidates();renderBallot();renderResults();}
function pick(id){
 if(state.myVote){toast('Голос уже отправлен — бюллетень нельзя изменить.');return;}
 if(!state.votingOpen){toast('Приём голосов закрыт организатором.');return;}
 if(state.selected.includes(id)){toast('Этот игрок уже в твоём топ-10.');return;}
 if(state.selected.length===10){toast('Все 10 мест заняты. Удали кого-то из списка, чтобы выбрать другого.');return;}
 if(!findNominee(id))return;
 state.selected.push(id);draftSave();renderNominees();renderVoteCandidates();renderBallot();
}
function setPlace(id,value){
 if(state.myVote||!state.votingOpen)return;
 const place=Number(value),from=state.selected.indexOf(id);
 if(!Number.isInteger(place)||place<1||place>10||String(value).trim()===''){toast('Укажи целое место от 1 до 10.');renderBallot();return;}
 if(from<0||from===place-1)return;
 state.selected.splice(from,1);state.selected.splice(place-1,0,id);draftSave();renderBallot();
 toast(findNominee(id).name+' — место '+place+'. Остальные игроки сдвинулись.');
}
function showStep(step){state.step=step;renderBallot();(step==='rank'?$('ballotPanel'):$('selectionPanel')).scrollIntoView({behavior:'smooth',block:'start'});}
function remove(position){if(state.myVote||!state.votingOpen)return;state.selected.splice(position,1);state.step='select';draftSave();refreshAll();}
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
 const chosen=state.selected.includes(n.id),locked=!!state.myVote||!state.votingOpen||(!chosen&&state.selected.length>=10);
 return `<button type="button" class="candidate-option ${chosen?'selected':''}" data-pick="${n.id}" ${locked?'disabled':''} aria-label="${chosen?'Убрать из топ-10: ':'Выбрать '}${esc(n.name)}"><span class="candidate-mini">${esc(initials(n.name))}</span><b>${esc(n.name)}</b><span class="${chosen?'mini-selected':'plus'}">${chosen?'✓':'+'}</span></button>`;
 }).join('')||'<p style="color:#a9ad9c;text-align:center">Игроков не найдено</p>';
}
function renderBallot(){
 const selected=state.selected;const count=selected.length;$('selectedCount').textContent=count;
 const ranking=!!state.myVote||(state.step==='rank'&&count===10);
 $('selectionPanel').classList.toggle('hidden',ranking);$('ballotPanel').classList.toggle('hidden',!ranking);
 $('selectionCount').textContent='ВЫБРАНО '+count+' / 10';
 $('selectionHint').textContent=count===10?'Топ-10 собран. Теперь расставь игроков по местам.':'Выбрано '+count+' из 10. Осталось выбрать: '+(10-count)+'.';
 $('continueBallot').disabled=count!==10||!state.votingOpen;
 $('backToSelection').classList.toggle('hidden',!!state.myVote);
 $('selectedPlayers').innerHTML=selected.map((id,i)=>`<button type="button" data-unpick="${i}" class="selected-player" ${state.myVote||!state.votingOpen?'disabled':''} aria-label="Убрать из топ-10: ${esc(findNominee(id).name)}">${esc(findNominee(id).name)} <span aria-hidden="true">×</span></button>`).join('');
 $('ballotProgress').style.width=(count*10)+'%';
 $('ballotList').innerHTML=POINTS.map((p,i)=>{
 const nominee=findNominee(selected[i]);const filled=!!nominee;
 const place=filled&&!state.myVote?`<input class="place-input" type="number" min="1" max="10" step="1" inputmode="numeric" value="${i+1}" data-place="${nominee.id}" aria-label="Место для ${esc(nominee.name)}" ${!state.votingOpen?'disabled':''}>`:`<span class="ballot-place">${String(i+1).padStart(2,'0')}.</span>`;
 return `<div class="ballot-row ${filled?'filled':''} ${i===0&&filled?'first':''}">${place}<span class="ballot-name">${nominee?esc(nominee.name):'Выбери игрока'}</span><span class="ballot-points">+${p} ОЧК.</span></div>`;
 }).join('');
 const submit=$('submitVote');submit.disabled=!(count===10&&!state.myVote&&state.votingOpen);$('voterName').disabled=!!state.myVote||!state.votingOpen;$('inviteCode').disabled=!!state.myVote||!state.votingOpen;
 if(state.myVote){submit.textContent='ГОЛОС УЧТЁН ✓';feedback('Твой топ-10 сохранён. Спасибо за участие в истории Лесного!','success');}
 else if(!state.votingOpen){feedback('Организатор закрыл приём голосов. Посмотреть результаты по-прежнему можно.','error');}
 else if(count<10){feedback('Осталось свободных мест: '+(10-count)+'.');}
 else{feedback('Проверь места, введи своё имя и отправь бюллетень.','success');}
 $('inviteCodeWrap').classList.toggle('hidden',!state.requireCodes);
}
function plural(n,forms){return forms[n%10===1&&n%100!==11?0:n%10>=2&&n%10<=4&&(n%100<12||n%100>14)?1:2];}
function renderResults(){
 const ranked=rankData(), votes=state.votes;$('votesCount').textContent=votes;
 $('sortOfficial').classList.toggle('active',state.rankingMode==='official');$('sortFirst').classList.toggle('active',state.rankingMode==='first');
 $('rankingBody').innerHTML=ranked.map((n,i)=>`<tr><td><span class="rank-number">${n.points?String(i+1).padStart(2,'0'):'—'}</span></td><td><div class="rank-player"><span class="rank-avatar">${esc(initials(n.name))}</span><span>${esc(n.name)}</span></div></td><td class="numcol points-cell">${n.points}</td><td class="numcol">${n.firstPlaces}</td><td class="numcol">${n.mentions}</td></tr>`).join('');
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
function initDemo(){state.demo=true;$('demoBanner').classList.remove('hidden');const records=demoBallots();const own=records.find(v=>v.session===getDemoSession());state.myVote=own?own.picks:null;state.votes=records.length;state.results=leaderboard(records);}
function getDemoSession(){let key;try{key=localStorage.getItem('lesnoe_2026_session');if(!key){key='demo-'+Math.random().toString(36).slice(2)+Date.now();localStorage.setItem('lesnoe_2026_session',key);}}catch{key='no-storage';}return key;}
async function load(){
 if(location.protocol==='file:'){initDemo();return;}
 try{
  const [info,results]=await Promise.all([request('state'),request('results')]);
  if(Array.isArray(info.nominees)&&info.nominees.length)state.nominees=info.nominees;
  state.myVote=info.myVote?.picks||null;state.votingOpen=!!info.votingOpen;state.requireCodes=!!info.requireCodes;
  state.votes=results.votes;state.results=results.standings;applyHero(info.heroUrl);
 }catch(err){console.error('Backend unavailable',err);state.votingOpen=false;toast('Нет соединения с сервером. Обнови страницу перед голосованием.');}
}
async function updateResults(){if(state.demo)return;try{const d=await request('results');state.votes=d.votes;state.results=d.standings;renderResults();}catch{}}
async function submitVote(){
 if(state.myVote)return;
 if(state.selected.length!==10){toast('Для голосования необходимо заполнить все десять мест.');return;}
 const name=$('voterName').value.trim().replace(/\s+/g,' '), code=$('inviteCode').value.trim().toUpperCase();
 if(name.length<2||name.length>48){feedback('Укажи своё имя (от 2 до 48 символов).','error');$('voterName').focus();return;}
 if(state.requireCodes&&!code){feedback('Введи персональный код от организатора.','error');$('inviteCode').focus();return;}
 $('submitVote').disabled=true;feedback('Отправляем бюллетень…');
 try{
  const payload={name,picks:[...state.selected],code};
  if(state.demo){const records=demoBallots();if(records.some(r=>r.name.toLowerCase()===name.toLowerCase()))throw new Error('Это имя уже участвовало в голосовании.');if(records.some(r=>r.session===getDemoSession()))throw new Error('На этом устройстве уже голосовали.');records.push({...payload,session:getDemoSession()});localStorage.setItem('lesnoe_2026_ballots',JSON.stringify(records));state.myVote=[...state.selected];state.votes=records.length;state.results=leaderboard(records);
  }else{await request('vote',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(payload)});state.myVote=[...state.selected];await updateResults();}
  toast('Твой голос принят. Спасибо за участие!');refreshAll();setTimeout(()=>$('ranking').scrollIntoView({behavior:'smooth'}),700);
 }catch(e){feedback(e.message,'error');$('submitVote').disabled=false;}
}
function adminMessage(message,type=''){const el=$('adminFeedback');el.className='feedback '+type;el.textContent=message;}
async function adminRequest(path,opts={}){return request('admin/'+path,{...opts,headers:{'X-Admin-Key':state.adminKey,...(opts.headers||{})}});}
async function adminAuth(){if(state.demo){adminMessage('Панель работает только при запущенном сервере.','error');return;}state.adminKey=$('adminPassword').value;try{const d=await adminRequest('status');$('adminTools').classList.remove('hidden');$('adminVotingOpen').checked=!!d.votingOpen;$('adminCodesRequired').checked=!!d.requireCodes;adminMessage('Доступ открыт. Отправлено бюллетеней: '+d.votes,'success');}catch(e){adminMessage(e.message,'error');}}
async function adminSave(){try{const data=await adminRequest('settings',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({votingOpen:$('adminVotingOpen').checked,requireCodes:$('adminCodesRequired').checked})});state.votingOpen=data.votingOpen;state.requireCodes=data.requireCodes;refreshAll();adminMessage('Настройки сохранены.','success');}catch(e){adminMessage(e.message,'error');}}
async function adminUpload(){const f=$('adminHero').files?.[0];if(!f){adminMessage('Выбери фотографию.','error');return;}if(f.size>8*1024*1024){adminMessage('Файл больше 8 МБ.','error');return;}try{const data=await adminRequest('hero',{method:'PUT',headers:{'Content-Type':f.type||'application/octet-stream'},body:f});applyHero(data.heroUrl+'?t='+Date.now());adminMessage('Фото сезона загружено. Обнови страницу, если изображение ещё старое.','success');}catch(e){adminMessage(e.message,'error');}}
async function adminGenerate(){const n=Math.max(1,Math.min(100,Number($('codesAmount').value)||10));try{const d=await adminRequest('codes',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({count:n})});$('generatedCodes').value=d.codes.join('\n');adminMessage(`Сгенерировано ${d.codes.length} кодов. Скопируй и сохрани: повторно получить их нельзя.`,'success');}catch(e){adminMessage(e.message,'error');}}
async function adminExport(){if(state.demo){adminMessage('Экспорт доступен после запуска сервера.','error');return;}try{const r=await apiFetch('admin/export',{headers:{'X-Admin-Key':state.adminKey}});if(!r.ok)throw new Error('Ошибка экспорта: '+r.status);const blob=await r.blob();const url=URL.createObjectURL(blob);const a=document.createElement('a');a.href=url;a.download='lesnoe-ballondor-2026-votes.csv';a.click();URL.revokeObjectURL(url);adminMessage('CSV загружен.','success');}catch(e){adminMessage(e.message,'error');}}
function bind(){
 $('nomineesGrid').addEventListener('click',e=>{const b=e.target.closest('[data-pick]');if(b){pick(b.dataset.pick);$('vote').scrollIntoView({behavior:'smooth',block:'start'});}});
 $('voteCandidates').addEventListener('click',e=>{const b=e.target.closest('[data-pick]');if(b){const i=state.selected.indexOf(b.dataset.pick);if(i>=0)remove(i);else pick(b.dataset.pick);}});
 $('nomineeSearch').addEventListener('input',renderNominees);$('voteSearch').addEventListener('input',renderVoteCandidates);
 $('continueBallot').addEventListener('click',()=>{if(state.selected.length===10)showStep('rank');});
 $('backToSelection').addEventListener('click',()=>showStep('select'));
 $('selectedPlayers').addEventListener('click',e=>{const b=e.target.closest('[data-unpick]');if(b)remove(Number(b.dataset.unpick));});
 $('ballotList').addEventListener('focusout',e=>{if(e.target.matches('[data-place]'))setPlace(e.target.dataset.place,e.target.value);});
 $('ballotList').addEventListener('keydown',e=>{if(e.key==='Enter'&&e.target.matches('[data-place]')){e.preventDefault();setPlace(e.target.dataset.place,e.target.value);}});
 $('submitVote').addEventListener('click',submitVote);
 $('sortOfficial').addEventListener('click',()=>{state.rankingMode='official';renderResults();});
 $('sortFirst').addEventListener('click',()=>{state.rankingMode='first';renderResults();});
 $('menuBtn').addEventListener('click',()=>{const open=$('mobileLinks').classList.toggle('open');$('menuBtn').setAttribute('aria-expanded',String(open));});
 document.querySelectorAll('#mobileLinks a').forEach(x=>x.addEventListener('click',()=>$('mobileLinks').classList.remove('open')));
 $('adminOpen').addEventListener('click',()=>$('adminDialog').showModal());$('adminClose').addEventListener('click',()=>$('adminDialog').close());
 $('adminDialog').addEventListener('click',e=>{if(e.target===$('adminDialog'))$('adminDialog').close();});
 $('adminAuth').addEventListener('click',adminAuth);$('adminSave').addEventListener('click',adminSave);$('adminUpload').addEventListener('click',adminUpload);$('adminGenerate').addEventListener('click',adminGenerate);$('adminExport').addEventListener('click',adminExport);
 $('adminCopy').addEventListener('click',async()=>{try{await navigator.clipboard.writeText($('generatedCodes').value);adminMessage('Коды скопированы.','success');}catch{adminMessage('Не получилось скопировать. Выдели текст вручную.','error');}});
}
async function start(){bind();renderPoints();await load();if(state.myVote)state.selected=[...state.myVote];else draftLoad();refreshAll();setInterval(()=>{if(!document.hidden)updateResults();},30000);}
start();
})();
