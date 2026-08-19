'use strict';
const SUBJECTS=window.ATPL_SUBJECTS||[];
const byId=Object.fromEntries(SUBJECTS.map(s=>[s.id,s]));
const allQuestions=SUBJECTS.flatMap(s=>s.questions.map(q=>({...q,subject:s.id,subjectName:s.name})));
const $=id=>document.getElementById(id);
let chosen=new Set(SUBJECTS.map(s=>s.id));
let session=[], idx=0, answers={}, optionOrders={}, mode='study', sessionShuffleA=false;
let saved=loadState();
const SESSION_KEY='atpl10_session_v2';
function loadState(){try{return JSON.parse(localStorage.getItem('atpl10_state_v1'))||{wrong:[],attempted:0,correct:0}}catch(e){return{wrong:[],attempted:0,correct:0}}}
function saveState(){localStorage.setItem('atpl10_state_v1',JSON.stringify(saved))}
function saveSession(){
  if(!session.length)return;
  const order={}; for(const [uid,opts] of Object.entries(optionOrders)) order[uid]=opts.map(o=>o.letter);
  localStorage.setItem(SESSION_KEY,JSON.stringify({uids:session.map(q=>q.uid),idx,answers,optionOrders:order,mode,shuffleA:sessionShuffleA,updated:Date.now()}));
}
function clearSession(){localStorage.removeItem(SESSION_KEY)}
function getSavedSession(){try{return JSON.parse(localStorage.getItem(SESSION_KEY))}catch(e){return null}}
function restoreSession(){
  const st=getSavedSession(); if(!st||!Array.isArray(st.uids))return false;
  const qmap=new Map(allQuestions.map(q=>[q.uid,q])); session=st.uids.map(u=>qmap.get(u)).filter(Boolean); if(!session.length)return false;
  idx=Math.min(Math.max(Number(st.idx)||0,0),session.length-1); answers=st.answers||{}; mode=st.mode||'study'; sessionShuffleA=!!st.shuffleA; optionOrders={};
  for(const q of session){const letters=st.optionOrders&&st.optionOrders[q.uid]; if(letters){const om=new Map(q.options.map(o=>[o.letter,o])); optionOrders[q.uid]=letters.map(l=>om.get(l)).filter(Boolean)}}
  show('quiz'); render(); return true;
}
function shuffle(a){a=[...a];for(let i=a.length-1;i>0;i--){const j=Math.floor(Math.random()*(i+1));[a[i],a[j]]=[a[j],a[i]]}return a}
function esc(s){return String(s??'').replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'}[m]))}
function init(){
 const total=allQuestions.length, wrong=(saved.wrong||[]).length;
 $('stats').innerHTML=`<span class="pill"><b>${total.toLocaleString()}</b> câu</span><span class="pill"><b>${SUBJECTS.length}</b> môn</span><span class="pill"><b>${wrong}</b> câu đang cần ôn</span>`;
 $('subjects').innerHTML=SUBJECTS.map(s=>`<button class="subject ${chosen.has(s.id)?'active':''}" data-id="${s.id}"><b>${esc(s.name)}</b><small>${s.questions.length.toLocaleString()} câu</small></button>`).join('');
 document.querySelectorAll('.subject').forEach(b=>b.onclick=()=>{const id=b.dataset.id;if(chosen.has(id))chosen.delete(id);else chosen.add(id);if(!chosen.size)chosen.add(id);init()});
 const st=getSavedSession();
 if(st&&Array.isArray(st.uids)&&st.uids.length){const d=Object.keys(st.answers||{}).length; $('resumeCard').classList.remove('hidden'); $('resumeCard').innerHTML=`<h3 style="margin-top:0">Lượt đang làm</h3><div>${esc(st.mode==='exam'?'Exam':'Study')} • ${d}/${st.uids.length} câu đã trả lời</div><div class="row" style="margin-top:12px"><button class="btn primary" id="resumeBtn">Tiếp tục</button><button class="btn secondary" id="discardBtn">Bỏ lượt này</button></div>`; $('resumeBtn').onclick=restoreSession; $('discardBtn').onclick=()=>{clearSession();init()};}
 else $('resumeCard').classList.add('hidden');
}
$('allBtn').onclick=()=>{chosen=new Set(SUBJECTS.map(s=>s.id));init()};
$('resetBtn').onclick=()=>{if(confirm('Xoá toàn bộ danh sách câu sai, thống kê và lượt đang làm?')){saved={wrong:[],attempted:0,correct:0};saveState();clearSession();init()}};
$('startBtn').onclick=start;
$('homeBtn').onclick=()=>{saveSession();show('home')};
function show(id){['home','quiz','results'].forEach(x=>$(x).classList.toggle('hidden',x!==id));if(id==='home')init();window.scrollTo(0,0)}
function start(){
 mode=$('mode').value;const wanted=new Set(chosen);let pool=allQuestions.filter(q=>wanted.has(q.subject));
 if(mode==='wrong'){const w=new Set(saved.wrong||[]);pool=pool.filter(q=>w.has(q.uid));if(!pool.length){alert('Chưa có câu sai trong các môn đã chọn.');return}}
 if($('shuffleQ').checked)pool=shuffle(pool);
 const n=$('count').value==='all'?pool.length:Math.min(parseInt($('count').value),pool.length);session=pool.slice(0,n);
 if(!session.length){alert('Không có câu hỏi phù hợp.');return}
 idx=0;answers={};optionOrders={};sessionShuffleA=$('shuffleA').checked;saveSession();show('quiz');render();
}
function orderFor(q){if(optionOrders[q.uid])return optionOrders[q.uid];let opts=q.options.map(o=>({...o}));if(sessionShuffleA&&!q.visuals.length)opts=shuffle(opts);optionOrders[q.uid]=opts;saveSession();return opts}
function render(){
 const q=session[idx],ans=answers[q.uid],opts=orderFor(q),studyRevealed=(mode!=='exam'&&!!ans);
 $('quizTitle').textContent=q.subjectName;$('quizMeta').textContent=`Câu ${idx+1}/${session.length} • câu ${q.ordinal} trong môn • số gốc ${q.source_number} • trang ${q.start_page}`;
 $('prog').style.width=`${((idx+1)/session.length)*100}%`;
 const done=Object.keys(answers).length;const good=Object.entries(answers).filter(([uid,a])=>{const qq=session.find(x=>x.uid===uid);return qq&&a===qq.correct}).length;
 $('scorePill').innerHTML=mode==='exam'?`Đã làm <b>${done}</b>`:`Đúng <b>${good}</b>/${done}`;
 let visuals=(q.visuals||[]).map(src=>`<img class="visual" src="${src}" alt="Hình từ đề gốc">`).join('');
 let options=opts.map(o=>{let cls='option';if(ans===o.letter)cls+=' selected';if(studyRevealed){if(o.letter===q.correct)cls+=' correct';else if(ans===o.letter)cls+=' wrong'}let txt=o.text||`Phương án ${o.letter} — xem hình gốc`;return `<button class="${cls}" data-letter="${o.letter}" ${studyRevealed?'disabled':''}><span class="letter">${o.letter}</span><span>${esc(txt)}</span></button>`}).join('');
 let fb='';if(studyRevealed){fb=ans===q.correct?`<div class="feedback good">✓ Chính xác — đáp án ${q.correct}</div>`:`<div class="feedback bad">✕ Chưa đúng — đáp án đúng: ${q.correct}</div>`}
 $('qcard').innerHTML=`<div class="qnum">${esc(q.subject)} • CÂU ${q.ordinal} <span class="tiny">(số gốc ${q.source_number})</span></div><div class="question">${esc(q.question)}</div>${visuals}<div>${options}</div>${fb}<div class="source">Nguồn: ${esc(q.subjectName)} • trang ${q.start_page}</div><div class="nav"><button class="btn secondary" id="prevBtn" ${idx===0?'disabled':''}>← Trước</button>${idx===session.length-1?`<button class="btn primary" id="finishBtn">${mode==='exam'?'Nộp bài':'Hoàn thành'}</button>`:`<button class="btn primary" id="nextBtn">Tiếp →</button>`}</div>`;
 document.querySelectorAll('.option').forEach(b=>b.onclick=()=>choose(q,b.dataset.letter));
 const pb=$('prevBtn');if(pb)pb.onclick=()=>{idx--;saveSession();render();window.scrollTo(0,0)};
 const nb=$('nextBtn');if(nb)nb.onclick=()=>{idx++;saveSession();render();window.scrollTo(0,0)};
 const fbbtn=$('finishBtn');if(fbbtn)fbbtn.onclick=finish; saveSession();
}
function choose(q,letter){
 if(mode!=='exam'&&answers[q.uid])return;
 const first=answers[q.uid]===undefined;answers[q.uid]=letter;
 if(first&&mode!=='exam'){saved.attempted=(saved.attempted||0)+1;if(letter===q.correct)saved.correct=(saved.correct||0)+1;const w=new Set(saved.wrong||[]);if(letter===q.correct)w.delete(q.uid);else w.add(q.uid);saved.wrong=[...w];saveState()}
 saveSession();render();if(mode==='exam')setTimeout(()=>{if(idx<session.length-1){idx++;saveSession();render();window.scrollTo(0,0)}},110);
}
function finish(){
 const answered=session.filter(q=>answers[q.uid]!==undefined);const correct=answered.filter(q=>answers[q.uid]===q.correct);const wrong=answered.filter(q=>answers[q.uid]!==q.correct);const unanswered=session.length-answered.length;
 if(mode==='exam'){const w=new Set(saved.wrong||[]);for(const q of answered){if(answers[q.uid]===q.correct)w.delete(q.uid);else w.add(q.uid)}saved.wrong=[...w];saved.attempted=(saved.attempted||0)+answered.length;saved.correct=(saved.correct||0)+correct.length;saveState()}
 const pct=session.length?Math.round(correct.length/session.length*100):0;clearSession();
 $('results').innerHTML=`<div class="hero"><h1>Kết quả</h1><p>${esc(session.length+' câu • '+(mode==='exam'?'Exam mode':'Study mode'))}</p></div><div class="card"><div class="resultScore">${pct}%</div><div class="statline"><span class="pill">Đúng <b>${correct.length}</b></span><span class="pill">Sai <b>${wrong.length}</b></span><span class="pill">Chưa làm <b>${unanswered}</b></span></div><div class="row" style="margin-top:18px"><button class="btn primary" id="retryWrong">Ôn ${wrong.length} câu sai</button><button class="btn secondary" id="backHome">Về trang chủ</button></div></div><div class="card"><h3>Các câu sai</h3>${wrong.length?wrong.slice(0,200).map(q=>`<div class="reviewItem"><b>${esc(q.subject)} Q${q.source_number}</b><div class="tiny">Bạn chọn ${answers[q.uid]} • Đáp án ${q.correct}</div><div>${esc(q.question)}</div></div>`).join(''):`<div class="empty">Không có câu sai.</div>`}</div>`;
 show('results');$('backHome').onclick=()=>show('home');$('retryWrong').onclick=()=>{session=wrong;idx=0;answers={};optionOrders={};mode='wrong';sessionShuffleA=false;if(session.length){saveSession();show('quiz');render()}else show('home')};
}
function updateNetwork(){const online=navigator.onLine;$('netText').textContent=online?'Có mạng':'Đang offline'}
async function setupPWA(){
 updateNetwork();window.addEventListener('online',updateNetwork);window.addEventListener('offline',updateNetwork);
 if(!('serviceWorker' in navigator)){ $('offlineText').textContent='Trình duyệt không hỗ trợ offline'; return; }
 try{
   await navigator.serviceWorker.register('./sw.js',{scope:'./'});
   await navigator.serviceWorker.ready;
   $('offlineDot').classList.add('ready');$('offlineText').textContent='Offline ready';
 }catch(err){console.error(err);$('offlineText').textContent='Chưa bật được offline';}
}
window.addEventListener('beforeunload',()=>{if(session.length)saveSession()});
init();setupPWA();
window.addEventListener('load',()=>setTimeout(()=>$('loading').classList.add('hidden'),60));
