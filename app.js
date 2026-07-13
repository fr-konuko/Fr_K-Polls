import { firebaseConfig } from './firebase-config.js';
import { initializeApp } from 'https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js';
import {
  getFirestore,
  collection,
  addDoc,
  deleteDoc,
  doc,
  updateDoc,
  increment,
  onSnapshot,
  query,
  orderBy,
  serverTimestamp
} from 'https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js';

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);
const aspirantsRef = collection(db, 'aspirants');
const page = document.body.dataset.page;
const PLACEHOLDER = 'https://placehold.co/500x500/EEF2FF/4F46E5?text=Photo';
const CHART_COLORS = ['#4f46e5', '#06b6d4', '#7c3aed', '#f59e0b', '#10b981', '#ef4444', '#0f172a', '#ec4899', '#84cc16', '#14b8a6'];

function escapeHTML(value = '') {
  return String(value)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;');
}

function showStatus(elementId, message, type = 'good') {
  const el = document.getElementById(elementId);
  if (!el) return;
  el.textContent = message;
  el.className = `status show ${type}`;
  setTimeout(() => { el.className = 'status'; }, 4000);
}

function aspirantsQuery() {
  return query(aspirantsRef, orderBy('createdAt', 'asc'));
}

function safeImage(url) {
  return url && url.trim() ? url.trim() : PLACEHOLDER;
}

function setShareLinks() {
  const base = window.location.href.replace(/admin\.html.*$/, '');
  const voteLink = document.getElementById('voteLink');
  const dashboardLink = document.getElementById('dashboardLink');
  if (voteLink) voteLink.value = `${base}vote.html`;
  if (dashboardLink) dashboardLink.value = `${base}dashboard.html`;

  document.getElementById('copyVoteLink')?.addEventListener('click', async () => {
    await navigator.clipboard.writeText(voteLink.value);
    showStatus('adminStatus', 'Voting link copied.');
  });

  document.getElementById('copyDashboardLink')?.addEventListener('click', async () => {
    await navigator.clipboard.writeText(dashboardLink.value);
    showStatus('adminStatus', 'Dashboard link copied.');
  });
}

function renderAdmin() {
  setShareLinks();

  const form = document.getElementById('aspirantForm');
  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const name = document.getElementById('name').value.trim();
    const position = document.getElementById('position').value.trim();
    const imageUrl = document.getElementById('imageUrl').value.trim();

    if (!name || !position) {
      showStatus('adminStatus', 'Please enter name and position.', 'bad');
      return;
    }

    try {
      await addDoc(aspirantsRef, {
        name,
        position,
        imageUrl,
        votes: 0,
        createdAt: serverTimestamp()
      });
      form.reset();
      showStatus('adminStatus', 'Aspirant saved successfully.');
    } catch (error) {
      console.error(error);
      showStatus('adminStatus', 'Could not save aspirant. Check Firebase config and Firestore rules.', 'bad');
    }
  });

  onSnapshot(aspirantsQuery(), (snapshot) => {
    const list = document.getElementById('aspirantsList');
    list.innerHTML = '';

    if (snapshot.empty) {
      list.innerHTML = '<div class="card"><p class="small">No aspirants added yet.</p></div>';
      return;
    }

    snapshot.forEach((item) => {
      const a = item.data();
      const card = document.createElement('div');
      card.className = 'card aspirant-card';
      card.innerHTML = `
        <img src="${escapeHTML(safeImage(a.imageUrl))}" alt="${escapeHTML(a.name)}" onerror="this.src='${PLACEHOLDER}'" />
        <div class="aspirant-info">
          <h3>${escapeHTML(a.name)}</h3>
          <span class="position-pill">${escapeHTML(a.position)}</span>
          <p style="margin-top:8px"><strong>${a.votes || 0}</strong> votes</p>
        </div>
        <button class="danger" data-delete="${item.id}">Delete</button>
      `;
      list.appendChild(card);
    });

    document.querySelectorAll('[data-delete]').forEach((btn) => {
      btn.addEventListener('click', async () => {
        const ok = confirm('Delete this aspirant? This also removes their votes.');
        if (!ok) return;
        await deleteDoc(doc(db, 'aspirants', btn.dataset.delete));
      });
    });
  });
}

function renderVote() {
  const hasVotedKey = 'poll_has_voted_v1';
  const alreadyVoted = localStorage.getItem(hasVotedKey);

  if (alreadyVoted) {
    showStatus('voteStatus', 'Already submitted your vote! Thanks.', 'bad');
  }

  onSnapshot(aspirantsQuery(), (snapshot) => {
    const list = document.getElementById('votingList');
    list.innerHTML = '';

    if (snapshot.empty) {
      list.innerHTML = '<div class="card"><p>No aspirants have been added yet.</p></div>';
      return;
    }

    snapshot.forEach((item) => {
      const a = item.data();
      const card = document.createElement('div');
      card.className = 'card vote-card';
      card.innerHTML = `
        <div class="aspirant-card">
          <img src="${escapeHTML(safeImage(a.imageUrl))}" alt="${escapeHTML(a.name)}" onerror="this.src='${PLACEHOLDER}'" />
          <div class="aspirant-info">
            <h3>${escapeHTML(a.name)}</h3>
            <span class="position-pill">${escapeHTML(a.position)}</span>
          </div>
        </div>
        <button data-vote="${item.id}" ${alreadyVoted ? 'disabled' : ''}>Vote for ${escapeHTML(a.name)}</button>
      `;
      list.appendChild(card);
    });

    document.querySelectorAll('[data-vote]').forEach((btn) => {
      btn.addEventListener('click', async () => {
        if (localStorage.getItem(hasVotedKey)) {
          showStatus('voteStatus', 'Already submitted your vote! Thanks.', 'bad');
          return;
        }

        const ok = confirm('Confirm your vote? You cannot vote again from this browser.');
        if (!ok) return;

        try {
          await updateDoc(doc(db, 'aspirants', btn.dataset.vote), { votes: increment(1) });
          localStorage.setItem(hasVotedKey, btn.dataset.vote);
          showStatus('voteStatus', 'Thank you. Your vote has been submitted.');
          setTimeout(() => window.location.href = 'dashboard.html', 900);
        } catch (error) {
          console.error(error);
          showStatus('voteStatus', 'Vote failed. Please try again.', 'bad');
        }
      });
    });
  });
}

function drawPieChart(canvasId, rows) {
  const canvas = document.getElementById(canvasId);
  if (!canvas) return;
  const ctx = canvas.getContext('2d');
  const dpr = window.devicePixelRatio || 1;
  const rect = canvas.getBoundingClientRect();
  canvas.width = Math.max(420, rect.width) * dpr;
  canvas.height = 320 * dpr;
  ctx.scale(dpr, dpr);
  const width = canvas.width / dpr;
  const height = canvas.height / dpr;
  ctx.clearRect(0, 0, width, height);

  const total = rows.reduce((sum, r) => sum + (r.votes || 0), 0);
  const cx = width * 0.34;
  const cy = height * 0.50;
  const radius = Math.min(width, height) * 0.30;

  if (!rows.length || total === 0) {
    ctx.fillStyle = '#64748b';
    ctx.font = '700 16px Arial';
    ctx.textAlign = 'center';
    ctx.fillText('No votes yet', width / 2, height / 2);
    return;
  }

  let start = -Math.PI / 2;
  rows.forEach((r, index) => {
    const slice = ((r.votes || 0) / total) * Math.PI * 2;
    ctx.beginPath();
    ctx.moveTo(cx, cy);
    ctx.arc(cx, cy, radius, start, start + slice);
    ctx.closePath();
    ctx.fillStyle = CHART_COLORS[index % CHART_COLORS.length];
    ctx.fill();
    start += slice;
  });

  ctx.beginPath();
  ctx.arc(cx, cy, radius * 0.55, 0, Math.PI * 2);
  ctx.fillStyle = '#ffffff';
  ctx.fill();
  ctx.fillStyle = '#102033';
  ctx.font = '900 28px Arial';
  ctx.textAlign = 'center';
  ctx.fillText(total, cx, cy + 2);
  ctx.font = '700 12px Arial';
  ctx.fillStyle = '#64748b';
  ctx.fillText('votes', cx, cy + 24);

  let y = 48;
  ctx.textAlign = 'left';
  rows.slice(0, 7).forEach((r, index) => {
    const pct = Math.round(((r.votes || 0) / total) * 100);
    ctx.fillStyle = CHART_COLORS[index % CHART_COLORS.length];
    ctx.fillRect(width * 0.66, y - 10, 13, 13);
    ctx.fillStyle = '#102033';
    ctx.font = '800 13px Arial';
    ctx.fillText(`${r.name}`, width * 0.66 + 22, y);
    ctx.fillStyle = '#64748b';
    ctx.font = '700 12px Arial';
    ctx.fillText(`${r.votes || 0} votes • ${pct}%`, width * 0.66 + 22, y + 17);
    y += 45;
  });
}

function drawBarChart(canvasId, rows) {
  const canvas = document.getElementById(canvasId);
  if (!canvas) return;
  const ctx = canvas.getContext('2d');
  const dpr = window.devicePixelRatio || 1;
  const rect = canvas.getBoundingClientRect();
  canvas.width = Math.max(520, rect.width) * dpr;
  canvas.height = 320 * dpr;
  ctx.scale(dpr, dpr);
  const width = canvas.width / dpr;
  const height = canvas.height / dpr;
  ctx.clearRect(0, 0, width, height);

  if (!rows.length) {
    ctx.fillStyle = '#64748b';
    ctx.font = '700 16px Arial';
    ctx.textAlign = 'center';
    ctx.fillText('No aspirants yet', width / 2, height / 2);
    return;
  }

  const chartRows = rows.slice(0, 8);
  const maxVotes = Math.max(1, ...chartRows.map(r => r.votes || 0));
  const left = 130;
  const right = 32;
  const top = 26;
  const rowHeight = Math.min(36, (height - 58) / chartRows.length);
  const barMax = width - left - right;

  ctx.font = '800 12px Arial';
  chartRows.forEach((r, index) => {
    const y = top + index * rowHeight + 8;
    const barWidth = ((r.votes || 0) / maxVotes) * barMax;
    ctx.fillStyle = '#475569';
    ctx.textAlign = 'right';
    const label = r.name.length > 16 ? `${r.name.slice(0, 15)}…` : r.name;
    ctx.fillText(label, left - 12, y + 13);
    ctx.fillStyle = '#e2e8f0';
    roundRect(ctx, left, y, barMax, 16, 8, true);
    const gradient = ctx.createLinearGradient(left, y, left + barMax, y);
    gradient.addColorStop(0, CHART_COLORS[index % CHART_COLORS.length]);
    gradient.addColorStop(1, '#06b6d4');
    ctx.fillStyle = gradient;
    roundRect(ctx, left, y, Math.max(2, barWidth), 16, 8, true);
    ctx.fillStyle = '#0f172a';
    ctx.textAlign = 'left';
    ctx.font = '900 12px Arial';
    ctx.fillText(`${r.votes || 0}`, left + barWidth + 8, y + 13);
    ctx.font = '800 12px Arial';
  });
}

function roundRect(ctx, x, y, w, h, r, fill) {
  const radius = Math.min(r, w / 2, h / 2);
  ctx.beginPath();
  ctx.moveTo(x + radius, y);
  ctx.arcTo(x + w, y, x + w, y + h, radius);
  ctx.arcTo(x + w, y + h, x, y + h, radius);
  ctx.arcTo(x, y + h, x, y, radius);
  ctx.arcTo(x, y, x + w, y, radius);
  ctx.closePath();
  if (fill) ctx.fill();
}

function renderDashboard() {
  onSnapshot(aspirantsQuery(), (snapshot) => {
    const data = [];
    snapshot.forEach((item) => data.push({ id: item.id, ...item.data() }));
    data.sort((a, b) => (b.votes || 0) - (a.votes || 0));

    const total = data.reduce((sum, a) => sum + (a.votes || 0), 0);
    document.getElementById('totalVotes').textContent = total;
    document.getElementById('totalAspirants').textContent = data.length;
    document.getElementById('leadingName').textContent = data[0]?.name || '-';

    drawPieChart('pieChart', data);
    drawBarChart('barChart', data);

    const resultsList = document.getElementById('resultsList');
    const resultsTable = document.getElementById('resultsTable');
    resultsList.innerHTML = '';
    resultsTable.innerHTML = '';

    if (data.length === 0) {
      resultsList.innerHTML = '<p class="small">No aspirants have been added yet.</p>';
      return;
    }

    data.forEach((a, index) => {
      const votes = a.votes || 0;
      const percentage = total === 0 ? 0 : Math.round((votes / total) * 100);

      const row = document.createElement('div');
      row.className = 'result-row';
      row.innerHTML = `
        <div class="result-top">
          <span>${index + 1}. ${escapeHTML(a.name)} <span class="small">• ${escapeHTML(a.position)}</span></span>
          <span>${votes} votes • ${percentage}%</span>
        </div>
        <div class="bar-wrap"><div class="bar" style="width:${percentage}%"></div></div>
      `;
      resultsList.appendChild(row);

      const tr = document.createElement('tr');
      tr.innerHTML = `
        <td><div class="rank">${index + 1}</div></td>
        <td>${escapeHTML(a.name)}</td>
        <td>${escapeHTML(a.position)}</td>
        <td><strong>${votes}</strong></td>
        <td>${percentage}%</td>
      `;
      resultsTable.appendChild(tr);
    });
  });
}

try {
  if (page === 'admin') renderAdmin();
  if (page === 'vote') renderVote();
  if (page === 'dashboard') renderDashboard();
} catch (error) {
  console.error(error);
  const msg = 'Firebase is not configured yet. Open firebase-config.js and paste your Firebase web app config.';
  showStatus('adminStatus', msg, 'bad');
  showStatus('voteStatus', msg, 'bad');
}
