(function(){
  const ADMIN_PASSCODE = 'FRK2002';
  const POSITIONS = ['President','Governor','Senetor','Women Rep','Member of Parliament','MCA'];
  const PLACEHOLDER = 'https://placehold.co/500x500/eaf5ff/0f4c81?text=Photo';
  const COLORS = ['#0f4c81','#0ea5e9','#f59e0b','#059669','#7c3aed','#ef4444','#14b8a6','#334155'];

  if(typeof firebase === 'undefined') return showGlobal('Firebase scripts did not load. Check your internet connection.','bad');
  if(typeof firebaseConfig === 'undefined') return showGlobal('firebase-config.js was not found in the same folder.','bad');
  firebase.initializeApp(firebaseConfig);
  const db = firebase.firestore();
  const pollsRef = db.collection('polls');
  const aspirantsRef = db.collection('aspirants');
  const votesRef = db.collection('votes');
  const page = document.body.dataset.page;

  function $(id){return document.getElementById(id)}
  function escapeHTML(v=''){return String(v).replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('>','&gt;').replaceAll('"','&quot;').replaceAll("'",'&#039;')}
  function status(id,msg,type='good'){const el=$(id); if(!el) return; el.textContent=msg; el.className=`status show ${type}`}
  function showGlobal(msg,type='bad'){['homeStatus','adminStatus','loginStatus','voteStatus','dashboardStatus'].forEach(id=>status(id,msg,type)); console.error(msg)}
  function fbError(e){console.error(e); const c=e&&e.code?e.code:''; if(c.includes('permission-denied')) return 'Permission denied. Update Firestore rules to allow polls, aspirants and votes.'; if(c.includes('unavailable')) return 'Firebase unavailable. Check internet connection.'; if(c.includes('failed-precondition')) return 'Firestore needs setup. Confirm Firestore Database is created.'; return e.message || 'Something went wrong. Check Firebase setup and try again.'}
  const BROWSER_TOKEN_KEY = 'frk_poll_browser_token';
  let browserTokenCache = null;
  function getBrowserToken(){
    if(browserTokenCache) return browserTokenCache;
    try{
      let token=localStorage.getItem(BROWSER_TOKEN_KEY);
      if(!token){
        token=(window.crypto&&typeof window.crypto.randomUUID==='function')
          ? window.crypto.randomUUID()
          : `browser_${Date.now()}_${Math.random().toString(36).slice(2)}_${Math.random().toString(36).slice(2)}`;
        localStorage.setItem(BROWSER_TOKEN_KEY,token);
      }
      browserTokenCache=token;
      return token;
    }catch(e){
      console.error(e);
      throw new Error('Browser storage is disabled. Enable cookies/site storage to vote.');
    }
  }
  function browserVoteDocId(pollId){return `${pollId}_${getBrowserToken()}`}
  function baseUrl(){return window.location.origin + window.location.pathname.replace(/[^/]*$/,'')}
  function getParam(name){return new URLSearchParams(window.location.search).get(name)}
  function imageUrl(url){
    let u=String(url||'').trim();
    if(!u) return PLACEHOLDER;
    const drive = u.match(/drive\.google\.com\/file\/d\/([^/]+)/);
    if(drive) return `https://drive.google.com/uc?export=view&id=${drive[1]}`;
    const imgur = u.match(/https?:\/\/(?:www\.)?imgur\.com\/([a-zA-Z0-9]+)$/);
    if(imgur) return `https://i.imgur.com/${imgur[1]}.jpg`;
    return u;
  }
  function pollOption(p){return `<option value="${escapeHTML(p.id)}">${escapeHTML(p.name)}${p.status==='closed'?' (Closed)':''}</option>`}
  async function getPolls(includeClosed=false){
    const snap = await pollsRef.orderBy('createdAt','desc').get();
    let rows=[]; snap.forEach(d=>rows.push({id:d.id,...d.data()}));
    if(!includeClosed) rows=rows.filter(p=>(p.status||'active')==='active');
    return rows;
  }
  async function fillPollSelect(selectId, includeClosed=false, selectedId=null){
    const sel=$(selectId); if(!sel) return [];
    const polls=await getPolls(includeClosed);
    sel.innerHTML = polls.length ? polls.map(pollOption).join('') : '<option value="">No poll created yet</option>';
    const param=getParam('poll');
    if(selectedId) sel.value=selectedId; else if(param && polls.some(p=>p.id===param)) sel.value=param;
    return polls;
  }
  function groupByPosition(rows){
    const groups={}; POSITIONS.forEach(p=>groups[p]=[]);
    rows.forEach(r=>{const pos=r.position||'Other'; if(!groups[pos]) groups[pos]=[]; groups[pos].push(r)});
    Object.keys(groups).forEach(k=>groups[k].sort((a,b)=>String(a.name||'').localeCompare(String(b.name||''))));
    return groups;
  }

  async function renderHome(){
    try{
      const polls=await getPolls(false); const box=$('pollsList');
      if(!box) return;
      if(!polls.length){box.innerHTML='<div class="card"><p>No active polls yet. Please check again later.</p></div>';return;}
      box.innerHTML=polls.map(p=>`<div class="card feature"><div class="feature-icon">✓</div><h3>${escapeHTML(p.name)}</h3><p>${escapeHTML(p.description||'Open poll for voting and live results.')}</p><div style="display:flex;gap:10px;flex-wrap:wrap"><a class="btn" href="vote.html?poll=${p.id}">Vote</a><a class="btn dark" href="dashboard.html?poll=${p.id}">Results</a></div></div>`).join('');
    }catch(e){status('homeStatus',fbError(e),'bad')}
  }

  function requireAdmin(){
    const ok=sessionStorage.getItem('frk_admin_ok')==='yes';
    $('adminLogin')?.classList.toggle('hidden',ok); $('adminArea')?.classList.toggle('hidden',!ok);
    return ok;
  }
  async function renderAdmin(){
    $('loginBtn')?.addEventListener('click',()=>{if(($('adminPasscode').value||'')===ADMIN_PASSCODE){sessionStorage.setItem('frk_admin_ok','yes');status('loginStatus','Access granted.');location.reload()}else status('loginStatus','Wrong passcode.','bad')});
    $('logoutBtn')?.addEventListener('click',()=>{sessionStorage.removeItem('frk_admin_ok');location.reload()});
    document.querySelectorAll('[data-admin-tab]').forEach(btn=>btn.addEventListener('click',()=>{
      document.querySelectorAll('[data-admin-tab]').forEach(b=>b.classList.remove('active'));
      document.querySelectorAll('.admin-tab-panel').forEach(panel=>panel.classList.add('hidden'));
      btn.classList.add('active');
      $(btn.dataset.adminTab)?.classList.remove('hidden');
    }));
    if(!requireAdmin()) return;

    async function refreshAdminPolls(selected=null){
      const polls=await fillPollSelect('adminPollSelect',true,selected); await fillPollSelect('aspirantPoll',true,selected); await fillPollSelect('endPollSelect',true,selected);
      const adminSel=$('adminPollSelect'); const aspSel=$('aspirantPoll'); if(adminSel && aspSel) aspSel.value=adminSel.value;
      updateShareLinks(); renderPollsAdminList(polls); listenAspirants(adminSel.value);
    }
    function updateShareLinks(){ const pollId=$('adminPollSelect')?.value||''; $('voteLink').value=`${baseUrl()}vote.html${pollId?'?poll='+pollId:''}`; $('dashboardLink').value=`${baseUrl()}dashboard.html${pollId?'?poll='+pollId:''}`; }
    $('adminPollSelect')?.addEventListener('change',()=>{ if($('aspirantPoll')) $('aspirantPoll').value=$('adminPollSelect').value; updateShareLinks(); listenAspirants($('adminPollSelect').value); });
    $('copyVoteLink')?.addEventListener('click',async()=>{await navigator.clipboard.writeText($('voteLink').value);status('adminStatus','Voting link copied.')});
    $('copyDashboardLink')?.addEventListener('click',async()=>{await navigator.clipboard.writeText($('dashboardLink').value);status('adminStatus','Dashboard link copied.')});
    $('endPollBtn')?.addEventListener('click',async()=>{try{const pollId=$('endPollSelect')?.value; if(!pollId) return status('adminStatus','Select a poll to end.','bad'); if(!confirm('End this poll now? Voters will no longer be able to vote in it.')) return; await pollsRef.doc(pollId).update({status:'closed',closedAt:firebase.firestore.FieldValue.serverTimestamp()}); status('adminStatus','Poll ended successfully.'); await refreshAdminPolls(pollId);}catch(err){status('adminStatus',fbError(err),'bad')}});
    $('pollForm')?.addEventListener('submit',async e=>{e.preventDefault(); try{const name=$('pollName').value.trim(); if(!name) return status('adminStatus','Enter poll name.','bad'); const doc=await pollsRef.add({name,description:$('pollDescription').value.trim(),status:$('pollStatus').value,createdAt:firebase.firestore.FieldValue.serverTimestamp()}); e.target.reset(); status('adminStatus','Poll saved successfully.'); await refreshAdminPolls(doc.id);}catch(err){status('adminStatus',fbError(err),'bad')}});
    $('aspirantForm')?.addEventListener('submit',async e=>{e.preventDefault(); try{const pollId=$('aspirantPoll').value; const name=$('name').value.trim(); const position=$('position').value; if(!pollId||!name||!position) return status('adminStatus','Select poll, enter name and choose position.','bad'); await aspirantsRef.add({pollId,name,position,imageUrl:$('imageUrl').value.trim(),votes:0,createdAt:firebase.firestore.FieldValue.serverTimestamp()}); e.target.reset(); $('aspirantPoll').value=pollId; status('adminStatus','Aspirant saved successfully.');}catch(err){status('adminStatus',fbError(err),'bad')}});
    await refreshAdminPolls();
  }
  function renderPollsAdminList(polls){
    const el=$('pollsAdminList'); if(!el) return;
    if(!polls.length){el.innerHTML='<p class="small">No polls created yet.</p>';return;}
    el.innerHTML=polls.map(p=>`<div class="card" style="margin-bottom:10px;padding:15px"><strong>${escapeHTML(p.name)}</strong><br><span class="pill">${escapeHTML(p.status||'active')}</span><p class="small">${escapeHTML(p.description||'No description')}</p><button data-close-poll="${p.id}" ${p.status==='closed'?'disabled':''}>${p.status==='closed'?'Poll Closed':'End Poll'}</button> <button class="danger" data-delete-poll="${p.id}">Delete Poll</button></div>`).join('');
    document.querySelectorAll('[data-close-poll]').forEach(btn=>btn.onclick=async()=>{if(!confirm('End this poll now?'))return;try{await pollsRef.doc(btn.dataset.closePoll).update({status:'closed',closedAt:firebase.firestore.FieldValue.serverTimestamp()});status('adminStatus','Poll ended successfully.');setTimeout(()=>location.reload(),500)}catch(e){status('adminStatus',fbError(e),'bad')}});
    document.querySelectorAll('[data-delete-poll]').forEach(btn=>btn.onclick=async()=>{if(!confirm('Delete this poll? Aspirants under it will remain in database unless deleted separately.'))return;try{await pollsRef.doc(btn.dataset.deletePoll).delete();status('adminStatus','Poll deleted. Refreshing...');setTimeout(()=>location.reload(),500)}catch(e){status('adminStatus',fbError(e),'bad')}});
  }
  let unsubscribeAdminAspirants=null;
  function listenAspirants(pollId){
    if(unsubscribeAdminAspirants) unsubscribeAdminAspirants(); const list=$('aspirantsList'); if(!list) return;
    if(!pollId){list.innerHTML='<div class="card"><p class="small">Select or create a poll first.</p></div>';return;}
    unsubscribeAdminAspirants=aspirantsRef.where('pollId','==',pollId).onSnapshot(snap=>{
      if(snap.empty){list.innerHTML='<div class="card"><p class="small">No aspirants added for this poll yet.</p></div>';return;}
      list.innerHTML=''; snap.forEach(doc=>{const a={id:doc.id,...doc.data()}; const div=document.createElement('div'); div.className='card aspirant-card'; div.innerHTML=`<img src="${escapeHTML(imageUrl(a.imageUrl))}" referrerpolicy="no-referrer" onerror="this.src='${PLACEHOLDER}'" alt="${escapeHTML(a.name)}"><div class="aspirant-info"><h3>${escapeHTML(a.name)}</h3><span class="pill">${escapeHTML(a.position)}</span><p class="small"><strong>${a.votes||0}</strong> votes</p></div><button class="danger" data-del-asp="${a.id}">Delete</button>`; list.appendChild(div);});
      document.querySelectorAll('[data-del-asp]').forEach(btn=>btn.onclick=async()=>{if(!confirm('Delete this aspirant?'))return;try{await aspirantsRef.doc(btn.dataset.delAsp).delete();status('adminStatus','Aspirant deleted.')}catch(e){status('adminStatus',fbError(e),'bad')}});
    },e=>status('adminStatus',fbError(e),'bad'));
  }

  let unsubscribeVote=null;
  async function renderVote(){
    try{
      await fillPollSelect('votePollSelect',false); const sel=$('votePollSelect');
      sel?.addEventListener('change',()=>listenVote(sel.value)); listenVote(sel?.value);
    }catch(e){status('voteStatus',fbError(e),'bad')}
  }
  function listenVote(pollId){
    if(unsubscribeVote) unsubscribeVote(); const box=$('votingList'); if(!box) return;
    if(!pollId){box.innerHTML='<div class="card"><p>No active poll found.</p></div>';return;}
    unsubscribeVote=aspirantsRef.where('pollId','==',pollId).onSnapshot(async snap=>{
      try{
        const rows=[]; snap.forEach(d=>rows.push({id:d.id,...d.data()}));
        if(!rows.length){box.innerHTML='<div class="card"><p>No aspirants have been added for this poll.</p></div>';return;}
        const voteDoc=await votesRef.doc(browserVoteDocId(pollId)).get();
        const alreadyVoted=voteDoc.exists;
        const groups=groupByPosition(rows); box.innerHTML='';
        Object.entries(groups).forEach(([pos,items])=>{if(!items.length)return; const sec=document.createElement('section'); sec.className='position-block'; sec.innerHTML=`<h2 class="position-title"><span>${escapeHTML(pos)}</span></h2><div class="grid">${items.map(a=>`<div class="card vote-card"><div class="aspirant-card"><img src="${escapeHTML(imageUrl(a.imageUrl))}" referrerpolicy="no-referrer" onerror="this.src='${PLACEHOLDER}'" alt="${escapeHTML(a.name)}"><div class="aspirant-info"><h3>${escapeHTML(a.name)}</h3><span class="pill">${escapeHTML(a.position)}</span></div></div><button data-vote="${a.id}" data-position="${escapeHTML(a.position)}" data-name="${escapeHTML(a.name)}" ${alreadyVoted?'disabled':''}>${alreadyVoted?'Already voted':'Vote for '+escapeHTML(a.name)}</button></div>`).join('')}</div>`; box.appendChild(sec);});
        if(alreadyVoted){
          status('voteStatus','Alreay submited your vote!Thanks','bad');
          return;
        }
        const voteStatus=$('voteStatus'); if(voteStatus) voteStatus.className='status';
        document.querySelectorAll('[data-vote]').forEach(btn=>btn.onclick=()=>castVote(pollId,btn.dataset.vote,btn.dataset.position,btn.dataset.name));
      }catch(e){status('voteStatus',e.message||fbError(e),'bad')}
    },e=>status('voteStatus',fbError(e),'bad'));
  }
  async function castVote(pollId,aspirantId,position,name){
    if(!confirm(`Confirm your vote for ${name} as ${position}? You can vote only once in this poll using this browser.`)) return;
    try{
      const voteDocId=browserVoteDocId(pollId);
      await db.runTransaction(async tx=>{
        const voteDoc=votesRef.doc(voteDocId);
        const existing=await tx.get(voteDoc);
        if(existing.exists) throw new Error('Alreay submited your vote!Thanks');
        tx.set(voteDoc,{pollId,browserToken:getBrowserToken(),position,aspirantId,createdAt:firebase.firestore.FieldValue.serverTimestamp()});
        tx.update(aspirantsRef.doc(aspirantId),{votes:firebase.firestore.FieldValue.increment(1)});
      });
      status('voteStatus','Vote submitted successfully. This browser cannot vote again in this poll.');
      document.querySelectorAll('[data-vote]').forEach(btn=>{btn.disabled=true;btn.textContent='Already voted'});
    }catch(e){status('voteStatus',e.message||fbError(e),'bad')}
  }

  let unsubscribeDashboard=null;
  async function renderDashboard(){
    try{await fillPollSelect('dashboardPollSelect',true); const sel=$('dashboardPollSelect'); sel?.addEventListener('change',()=>listenDashboard(sel.value)); $('dashboardPositionSelect')?.addEventListener('change',()=>drawCurrentChart()); listenDashboard(sel?.value);}catch(e){status('dashboardStatus',fbError(e),'bad')}
  }
  let currentRows=[];
  function listenDashboard(pollId){
    if(unsubscribeDashboard) unsubscribeDashboard(); if(!pollId){renderDashboardRows([]);return;}
    unsubscribeDashboard=aspirantsRef.where('pollId','==',pollId).onSnapshot(snap=>{currentRows=[]; snap.forEach(d=>currentRows.push({id:d.id,...d.data()})); renderDashboardRows(currentRows);},e=>status('dashboardStatus',fbError(e),'bad'));
  }
  function renderDashboardRows(rows){
    const total=rows.reduce((s,r)=>s+(r.votes||0),0); $('totalVotes').textContent=total; $('totalAspirants').textContent=rows.length; const leader=[...rows].sort((a,b)=>(b.votes||0)-(a.votes||0))[0]; $('leadingAspirant').textContent=leader?leader.name:'-';
    const posSel=$('dashboardPositionSelect'); if(posSel){const existing=posSel.value; const positions=[...new Set(rows.map(r=>r.position))]; posSel.innerHTML=positions.length?positions.map(p=>`<option>${escapeHTML(p)}</option>`).join(''):'<option>No position</option>'; if(positions.includes(existing)) posSel.value=existing;}
    const groups=groupByPosition(rows); const list=$('resultsList'); const table=$('resultsTable'); const summary=$('positionSummary'); if(list) list.innerHTML=''; if(table) table.innerHTML=''; if(summary) summary.innerHTML='';
    Object.entries(groups).forEach(([pos,items])=>{if(!items.length)return; items=[...items].sort((a,b)=>(b.votes||0)-(a.votes||0)||String(a.name||'').localeCompare(String(b.name||''))); const posTotal=items.reduce((s,r)=>s+(r.votes||0),0); const sec=document.createElement('section'); sec.className='position-block'; sec.innerHTML=`<h2 class="position-title"><span>${escapeHTML(pos)}</span><small class="small">${posTotal} votes</small></h2><div class="grid">${items.map((a,i)=>{const pct=posTotal?Math.round(((a.votes||0)/posTotal)*100):0;return `<div class="card result-card"><img class="photo" src="${escapeHTML(imageUrl(a.imageUrl))}" referrerpolicy="no-referrer" onerror="this.src='${PLACEHOLDER}'" alt="${escapeHTML(a.name)}"><div><h3>${escapeHTML(a.name)}</h3><span class="pill">Rank ${i+1}</span><div class="bar-wrap"><div class="bar" style="width:${pct}%"></div></div><p class="small">${a.votes||0} votes · ${pct}%</p></div><strong>${pct}%</strong></div>`}).join('')}</div>`; list?.appendChild(sec);
      summary && (summary.innerHTML += `<div class="card" style="margin-bottom:10px;padding:14px"><strong>${escapeHTML(pos)}</strong><p class="small">Total votes: ${posTotal}<br>Leading: ${escapeHTML(items[0]?.name||'-')}</p></div>`);
      items.forEach((a,i)=>{const pct=posTotal?Math.round(((a.votes||0)/posTotal)*100):0; table && (table.innerHTML += `<tr><td>${escapeHTML(pos)}</td><td>${i+1}</td><td><img class="photo" style="width:38px;height:38px;border-radius:10px" src="${escapeHTML(imageUrl(a.imageUrl))}" referrerpolicy="no-referrer" onerror="this.src='${PLACEHOLDER}'"></td><td>${escapeHTML(a.name)}</td><td>${a.votes||0}</td><td>${pct}%</td></tr>`)});
    });
    drawCurrentChart();
  }
  function drawCurrentChart(){
    const chart=$('photoChart'); if(!chart) return;
    const pos=$('dashboardPositionSelect')?.value;
    const rows=currentRows.filter(r=>r.position===pos).sort((a,b)=>(b.votes||0)-(a.votes||0)||String(a.name||'').localeCompare(String(b.name||'')));
    if(!rows.length){chart.innerHTML='<div class="empty-chart">No data to show</div>';return;}
    const max=Math.max(...rows.map(r=>r.votes||0),1);
    chart.innerHTML=rows.map((r,i)=>{
      const votes=r.votes||0;
      const width=Math.max(4,Math.round((votes/max)*100));
      return `<div class="photo-chart-row"><img src="${escapeHTML(imageUrl(r.imageUrl))}" referrerpolicy="no-referrer" onerror="this.src='${PLACEHOLDER}'" alt="${escapeHTML(r.name)}"><div class="photo-chart-main"><div class="photo-chart-label"><strong>${escapeHTML(r.name)}</strong><span>${votes} votes</span></div><div class="bar-wrap"><div class="bar" style="width:${width}%"></div></div></div></div>`;
    }).join('');
  }

  if(page==='home') renderHome();
  if(page==='admin') renderAdmin();
  if(page==='vote') renderVote();
  if(page==='dashboard') renderDashboard();
})();
