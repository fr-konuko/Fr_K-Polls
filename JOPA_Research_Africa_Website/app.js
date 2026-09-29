(function () {
  "use strict";

  const POSITION_ORDER = ["President", "Governor", "Senator", "Women Rep", "Member of Parliament", "MCA"];
  const PLACEHOLDER = "assets/placeholder.svg";
  const BROWSER_TOKEN_KEY = "frk_poll_browser_token";
  const APP_CONFIG = window.__APP_CONFIG__ || {};
  const ADMIN_PASSCODE = (APP_CONFIG.adminPasscode || "").trim();
  let browserTokenCache = null;
  let unsubscribeAdminAspirants = null;
  let unsubscribeVote = null;
  let unsubscribeDashboard = null;
  let unsubscribeContactMessages = null;
  let currentRows = [];

  const $ = (id) => document.getElementById(id);

  function initMobileNav() {
    const toggle = document.querySelector(".mobile-toggle");
    const nav = document.querySelector(".nav");
    if (!toggle || !nav) return;
    toggle.addEventListener("click", () => {
      const open = nav.classList.toggle("open");
      toggle.setAttribute("aria-expanded", String(open));
    });
    nav.querySelectorAll("a").forEach((link) => link.addEventListener("click", () => {
      nav.classList.remove("open");
      toggle.setAttribute("aria-expanded", "false");
    }));
  }

  function escapeHTML(value = "") {
    return String(value)
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;")
      .replaceAll('"', "&quot;")
      .replaceAll("'", "&#039;");
  }

  function status(id, message, type = "good") {
    const el = $(id);
    if (!el) return;
    el.textContent = message;
    el.className = `status show ${type}`;
  }

  function clearStatus(id) {
    const el = $(id);
    if (el) el.className = "status";
  }

  function showGlobal(message, type = "bad") {
    ["homeStatus", "adminStatus", "loginStatus", "voteStatus", "dashboardStatus", "contactStatus"].forEach((id) => status(id, message, type));
    console.error(message);
  }

  function firebaseError(error) {
    console.error(error);
    const code = error && error.code ? error.code : "";
    if (code.includes("permission-denied")) return "Permission denied. Review the Firestore rules for polls, aspirants and votes.";
    if (code.includes("unavailable")) return "Firebase is currently unavailable. Check the internet connection and try again.";
    if (code.includes("failed-precondition")) return "Firestore needs additional setup. Confirm that the Firestore Database has been created.";
    return error?.message || "Something went wrong. Check the Firebase setup and try again.";
  }

  function normalizePosition(position) {
    const p = String(position || "Other").trim();
    return p.toLowerCase() === "senetor" ? "Senator" : p;
  }

  function getBrowserToken() {
    if (browserTokenCache) return browserTokenCache;
    try {
      let token = localStorage.getItem(BROWSER_TOKEN_KEY);
      if (!token) {
        token = window.crypto && typeof window.crypto.randomUUID === "function"
          ? window.crypto.randomUUID()
          : `browser_${Date.now()}_${Math.random().toString(36).slice(2)}_${Math.random().toString(36).slice(2)}`;
        localStorage.setItem(BROWSER_TOKEN_KEY, token);
      }
      browserTokenCache = token;
      return token;
    } catch (error) {
      console.error(error);
      throw new Error("Browser storage is disabled. Enable site storage to vote.");
    }
  }

  function browserVoteDocId(pollId) { return `${pollId}_${getBrowserToken()}`; }
  function baseUrl() { return window.location.origin + window.location.pathname.replace(/[^/]*$/, ""); }
  function getParam(name) { return new URLSearchParams(window.location.search).get(name); }

  function imageUrl(url) {
    let value = String(url || "").trim();
    if (!value) return PLACEHOLDER;
    const drive = value.match(/drive\.google\.com\/file\/d\/([^/]+)/);
    if (drive) return `https://drive.google.com/uc?export=view&id=${drive[1]}`;
    const imgur = value.match(/https?:\/\/(?:www\.)?imgur\.com\/([a-zA-Z0-9]+)$/);
    if (imgur) return `https://i.imgur.com/${imgur[1]}.jpg`;
    return value;
  }

  function groupByPosition(rows) {
    const groups = {};
    POSITION_ORDER.forEach((p) => { groups[p] = []; });
    rows.forEach((row) => {
      const position = normalizePosition(row.position);
      if (!groups[position]) groups[position] = [];
      groups[position].push({ ...row, position });
    });
    Object.keys(groups).forEach((key) => groups[key].sort((a, b) => String(a.name || "").localeCompare(String(b.name || ""))));
    return groups;
  }

  initMobileNav();

  const page = document.body.dataset.page;
  if (!page) return;

  if (typeof firebase === "undefined") {
    showGlobal("Firebase scripts did not load. Check the internet connection.");
    return;
  }
  if (typeof firebaseConfig === "undefined") {
    showGlobal("firebase-config.js was not found in the same folder.");
    return;
  }

  if (!firebase.apps.length) firebase.initializeApp(firebaseConfig);
  const db = firebase.firestore();
  const pollsRef = db.collection("polls");
  const aspirantsRef = db.collection("aspirants");
  const votesRef = db.collection("votes");
  const contactMessagesRef = db.collection("contactMessages");

  function pollOption(poll) {
    return `<option value="${escapeHTML(poll.id)}">${escapeHTML(poll.name)}${poll.status === "closed" ? " (Closed)" : ""}</option>`;
  }

  async function getPolls(includeClosed = false) {
    const snapshot = await pollsRef.orderBy("createdAt", "desc").get();
    let rows = [];
    snapshot.forEach((doc) => rows.push({ id: doc.id, ...doc.data() }));
    if (!includeClosed) rows = rows.filter((p) => (p.status || "active") === "active");
    return rows;
  }

  async function fillPollSelect(selectId, includeClosed = false, selectedId = null) {
    const select = $(selectId);
    if (!select) return [];
    const polls = await getPolls(includeClosed);
    select.innerHTML = polls.length ? polls.map(pollOption).join("") : '<option value="">No poll created yet</option>';
    const param = getParam("poll");
    if (selectedId && polls.some((p) => p.id === selectedId)) select.value = selectedId;
    else if (param && polls.some((p) => p.id === param)) select.value = param;
    return polls;
  }

  async function renderHome() {
    try {
      const polls = await getPolls(false);
      const box = $("pollsList");
      if (!box) return;
      clearStatus("homeStatus");
      if (!polls.length) {
        box.innerHTML = '<div class="card"><span class="section-kicker">No active polls</span><h3>Nothing is open for voting right now.</h3><p class="small">Please check again later.</p></div>';
        return;
      }
      box.innerHTML = polls.map((poll) => `
        <article class="card feature">
          <div class="feature-icon">✓</div>
          <h3>${escapeHTML(poll.name)}</h3>
          <p>${escapeHTML(poll.description || "Open poll for voting and live results.")}</p>
          <div style="display:flex;gap:9px;flex-wrap:wrap;margin-top:18px">
            <a class="btn orange" href="vote.html?poll=${encodeURIComponent(poll.id)}">Vote</a>
            <a class="btn outline" href="dashboard.html?poll=${encodeURIComponent(poll.id)}">Results</a>
          </div>
        </article>`).join("");
    } catch (error) {
      status("homeStatus", firebaseError(error), "bad");
    }
  }

  function renderContact() {
    const form = $("contactForm");
    if (!form) return;

    form.addEventListener("submit", async (event) => {
      event.preventDefault();
      clearStatus("contactStatus");
      const submit = $("contactSubmit");
      const name = $("contactName")?.value.trim() || "";
      const email = $("contactEmail")?.value.trim() || "";
      const phone = $("contactPhone")?.value.trim() || "";
      const organization = $("contactOrg")?.value.trim() || "";
      const service = $("contactService")?.value || "";
      const message = $("contactMessage")?.value.trim() || "";
      const consent = Boolean($("contactConsent")?.checked);

      if (!name || !email || !service || !message || !consent) {
        return status("contactStatus", "Please complete all required fields and accept the consent statement.", "bad");
      }
      if (!/^\S+@\S+\.\S+$/.test(email)) return status("contactStatus", "Enter a valid email address.", "bad");

      try {
        if (submit) { submit.disabled = true; submit.textContent = "Sending…"; }
        await contactMessagesRef.add({
          name,
          email,
          phone,
          organization,
          service,
          message,
          status: "new",
          source: "website-contact-form",
          createdAt: firebase.firestore.FieldValue.serverTimestamp()
        });
        form.reset();
        status("contactStatus", "Thank you. Your inquiry has been sent successfully.");
      } catch (error) {
        const messageText = firebaseError(error);
        if ((error?.code || "").includes("permission-denied")) {
          status("contactStatus", "The contact form needs Firestore permission for the contactMessages collection. You can still reach us using the chat button on this page.", "bad");
        } else status("contactStatus", messageText, "bad");
      } finally {
        if (submit) { submit.disabled = false; submit.innerHTML = 'Send inquiry <span aria-hidden="true">→</span>'; }
      }
    });
  }

  function requireAdmin() {
    const okay = sessionStorage.getItem("frk_admin_ok") === "yes";
    $("adminLogin")?.classList.toggle("hidden", okay);
    $("adminArea")?.classList.toggle("hidden", !okay);
    return okay;
  }

  async function renderAdmin() {
    $("loginBtn")?.addEventListener("click", () => {
      if (($("adminPasscode")?.value || "") === ADMIN_PASSCODE) {
        sessionStorage.setItem("frk_admin_ok", "yes");
        status("loginStatus", "Access granted.");
        location.reload();
      } else status("loginStatus", "Wrong passcode.", "bad");
    });

    $("adminPasscode")?.addEventListener("keydown", (event) => {
      if (event.key === "Enter") $("loginBtn")?.click();
    });

    $("logoutBtn")?.addEventListener("click", () => {
      sessionStorage.removeItem("frk_admin_ok");
      location.reload();
    });

    document.querySelectorAll("[data-admin-tab]").forEach((button) => button.addEventListener("click", () => {
      document.querySelectorAll("[data-admin-tab]").forEach((b) => b.classList.remove("active"));
      document.querySelectorAll(".admin-tab-panel").forEach((panel) => panel.classList.add("hidden"));
      button.classList.add("active");
      $(button.dataset.adminTab)?.classList.remove("hidden");
    }));

    if (!requireAdmin()) return;

    function formatContactDate(value) {
      if (!value) return "Just submitted";
      const date = typeof value.toDate === "function" ? value.toDate() : new Date(value);
      return Number.isNaN(date.getTime()) ? "" : date.toLocaleString([], { year: "numeric", month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" });
    }

    function listenContactMessages() {
      if (unsubscribeContactMessages) unsubscribeContactMessages();
      const list = $("contactMessagesList");
      if (!list) return;
      unsubscribeContactMessages = contactMessagesRef.orderBy("createdAt", "desc").onSnapshot((snapshot) => {
        const rows = [];
        snapshot.forEach((doc) => rows.push({ id: doc.id, ...doc.data() }));
        const unread = rows.filter((row) => (row.status || "new") === "new").length;
        if ($("contactMessageCount")) $("contactMessageCount").textContent = unread ? String(unread) : "";
        if (!rows.length) {
          list.innerHTML = '<div class="empty-message-state"><strong>No contact messages yet.</strong><p class="small">New website inquiries will appear here.</p></div>';
          return;
        }
        list.innerHTML = rows.map((row) => `
          <article class="contact-message ${row.status === "read" ? "is-read" : "is-new"}">
            <div class="contact-message-head">
              <div><strong>${escapeHTML(row.name || "Unknown")}</strong><span>${escapeHTML(row.organization || row.email || "")}</span></div>
              <div class="contact-message-meta"><span class="pill">${escapeHTML(row.status || "new")}</span><time>${escapeHTML(formatContactDate(row.createdAt))}</time></div>
            </div>
            <div class="contact-message-details"><span><b>Email:</b> ${escapeHTML(row.email || "-")}</span><span><b>Phone:</b> ${escapeHTML(row.phone || "-")}</span><span><b>Service:</b> ${escapeHTML(row.service || "-")}</span></div>
            <p>${escapeHTML(row.message || "")}</p>
            <div class="contact-message-actions">
              ${row.status === "read" ? `<button type="button" data-contact-status="new" data-contact-id="${escapeHTML(row.id)}">Mark new</button>` : `<button type="button" data-contact-status="read" data-contact-id="${escapeHTML(row.id)}">Mark read</button>`}
              <button type="button" class="danger" data-delete-contact="${escapeHTML(row.id)}">Delete</button>
            </div>
          </article>`).join("");

        document.querySelectorAll("[data-contact-status]").forEach((button) => button.addEventListener("click", async () => {
          try { await contactMessagesRef.doc(button.dataset.contactId).update({ status: button.dataset.contactStatus }); }
          catch (error) { status("adminStatus", firebaseError(error), "bad"); }
        }));
        document.querySelectorAll("[data-delete-contact]").forEach((button) => button.addEventListener("click", async () => {
          if (!confirm("Delete this contact message?")) return;
          try { await contactMessagesRef.doc(button.dataset.deleteContact).delete(); status("adminStatus", "Contact message deleted."); }
          catch (error) { status("adminStatus", firebaseError(error), "bad"); }
        }));
      }, (error) => {
        list.innerHTML = `<div class="status show bad">${escapeHTML(firebaseError(error))}</div>`;
      });
    }

    listenContactMessages();

    async function refreshAdminPolls(selected = null) {
      const polls = await fillPollSelect("adminPollSelect", true, selected);
      await fillPollSelect("aspirantPoll", true, selected);
      await fillPollSelect("endPollSelect", true, selected);
      const adminSelect = $("adminPollSelect");
      const aspirantSelect = $("aspirantPoll");
      if (adminSelect && aspirantSelect) aspirantSelect.value = adminSelect.value;
      updateShareLinks();
      renderPollsAdminList(polls);
      listenAspirants(adminSelect?.value || "");
    }

    function updateShareLinks() {
      const pollId = $("adminPollSelect")?.value || "";
      if ($("voteLink")) $("voteLink").value = `${baseUrl()}vote.html${pollId ? `?poll=${encodeURIComponent(pollId)}` : ""}`;
      if ($("dashboardLink")) $("dashboardLink").value = `${baseUrl()}dashboard.html${pollId ? `?poll=${encodeURIComponent(pollId)}` : ""}`;
    }

    $("adminPollSelect")?.addEventListener("change", () => {
      if ($("aspirantPoll")) $("aspirantPoll").value = $("adminPollSelect").value;
      updateShareLinks();
      listenAspirants($("adminPollSelect").value);
    });

    $("copyVoteLink")?.addEventListener("click", async () => {
      await navigator.clipboard.writeText($("voteLink").value);
      status("adminStatus", "Voting link copied.");
    });
    $("copyDashboardLink")?.addEventListener("click", async () => {
      await navigator.clipboard.writeText($("dashboardLink").value);
      status("adminStatus", "Dashboard link copied.");
    });

    async function closePoll(pollId) {
      if (!pollId) return status("adminStatus", "Select a poll to end.", "bad");
      if (!confirm("End this poll now? Voters will no longer be able to vote in it.")) return;
      try {
        await pollsRef.doc(pollId).update({ status: "closed", closedAt: firebase.firestore.FieldValue.serverTimestamp() });
        status("adminStatus", "Poll ended successfully.");
        await refreshAdminPolls(pollId);
      } catch (error) { status("adminStatus", firebaseError(error), "bad"); }
    }

    $("endPollBtn")?.addEventListener("click", () => closePoll($("endPollSelect")?.value || ""));

    $("pollForm")?.addEventListener("submit", async (event) => {
      event.preventDefault();
      try {
        const name = $("pollName").value.trim();
        if (!name) return status("adminStatus", "Enter poll name.", "bad");
        const doc = await pollsRef.add({
          name,
          description: $("pollDescription").value.trim(),
          status: $("pollStatus").value,
          createdAt: firebase.firestore.FieldValue.serverTimestamp()
        });
        event.target.reset();
        status("adminStatus", "Poll saved successfully.");
        await refreshAdminPolls(doc.id);
      } catch (error) { status("adminStatus", firebaseError(error), "bad"); }
    });

    $("aspirantForm")?.addEventListener("submit", async (event) => {
      event.preventDefault();
      try {
        const pollId = $("aspirantPoll").value;
        const name = $("name").value.trim();
        const position = normalizePosition($("position").value);
        if (!pollId || !name || !position) return status("adminStatus", "Select a poll, enter the aspirant name and choose a position.", "bad");
        await aspirantsRef.add({
          pollId,
          name,
          position,
          imageUrl: $("imageUrl").value.trim(),
          votes: 0,
          createdAt: firebase.firestore.FieldValue.serverTimestamp()
        });
        event.target.reset();
        $("aspirantPoll").value = pollId;
        status("adminStatus", "Aspirant saved successfully.");
      } catch (error) { status("adminStatus", firebaseError(error), "bad"); }
    });

    function renderPollsAdminList(polls) {
      const el = $("pollsAdminList");
      if (!el) return;
      if (!polls.length) { el.innerHTML = '<p class="small">No polls created yet.</p>'; return; }
      el.innerHTML = polls.map((poll) => `
        <div style="border-bottom:1px solid var(--line);padding:14px 0">
          <strong>${escapeHTML(poll.name)}</strong><br>
          <span class="pill">${escapeHTML(poll.status || "active")}</span>
          <p class="small">${escapeHTML(poll.description || "No description")}</p>
          <div style="display:flex;gap:8px;flex-wrap:wrap">
            <button type="button" data-close-poll="${escapeHTML(poll.id)}" ${poll.status === "closed" ? "disabled" : ""}>${poll.status === "closed" ? "Poll closed" : "End poll"}</button>
            <button type="button" class="danger" data-delete-poll="${escapeHTML(poll.id)}">Delete</button>
          </div>
        </div>`).join("");

      document.querySelectorAll("[data-close-poll]").forEach((button) => button.addEventListener("click", () => closePoll(button.dataset.closePoll)));
      document.querySelectorAll("[data-delete-poll]").forEach((button) => button.addEventListener("click", async () => {
        if (!confirm("Delete this poll? Aspirants under it will remain in the database unless deleted separately.")) return;
        try {
          await pollsRef.doc(button.dataset.deletePoll).delete();
          status("adminStatus", "Poll deleted.");
          await refreshAdminPolls();
        } catch (error) { status("adminStatus", firebaseError(error), "bad"); }
      }));
    }

    function listenAspirants(pollId) {
      if (unsubscribeAdminAspirants) unsubscribeAdminAspirants();
      const list = $("aspirantsList");
      if (!list) return;
      if (!pollId) { list.innerHTML = '<div class="card"><p class="small">Select or create a poll first.</p></div>'; return; }
      unsubscribeAdminAspirants = aspirantsRef.where("pollId", "==", pollId).onSnapshot((snapshot) => {
        if (snapshot.empty) { list.innerHTML = '<div class="card"><p class="small">No aspirants added for this poll yet.</p></div>'; return; }
        list.innerHTML = "";
        snapshot.forEach((doc) => {
          const a = { id: doc.id, ...doc.data() };
          const div = document.createElement("div");
          div.className = "card aspirant-card";
          div.innerHTML = `<img src="${escapeHTML(imageUrl(a.imageUrl))}" referrerpolicy="no-referrer" onerror="this.src='${PLACEHOLDER}'" alt="${escapeHTML(a.name)}"><div class="aspirant-info"><h3>${escapeHTML(a.name)}</h3><span class="pill">${escapeHTML(normalizePosition(a.position))}</span><p class="small"><strong>${a.votes || 0}</strong> votes</p></div><button type="button" class="danger" data-del-asp="${escapeHTML(a.id)}">Delete</button>`;
          list.appendChild(div);
        });
        document.querySelectorAll("[data-del-asp]").forEach((button) => button.addEventListener("click", async () => {
          if (!confirm("Delete this aspirant?")) return;
          try { await aspirantsRef.doc(button.dataset.delAsp).delete(); status("adminStatus", "Aspirant deleted."); }
          catch (error) { status("adminStatus", firebaseError(error), "bad"); }
        }));
      }, (error) => status("adminStatus", firebaseError(error), "bad"));
    }

    await refreshAdminPolls();
  }

  async function renderVote() {
    try {
      await fillPollSelect("votePollSelect", false);
      const select = $("votePollSelect");
      select?.addEventListener("change", () => listenVote(select.value));
      listenVote(select?.value || "");
    } catch (error) { status("voteStatus", firebaseError(error), "bad"); }
  }

  function listenVote(pollId) {
    if (unsubscribeVote) unsubscribeVote();
    const box = $("votingList");
    if (!box) return;
    if (!pollId) { box.innerHTML = '<div class="card"><p>No active poll found.</p></div>'; return; }

    unsubscribeVote = aspirantsRef.where("pollId", "==", pollId).onSnapshot(async (snapshot) => {
      try {
        const rows = [];
        snapshot.forEach((doc) => rows.push({ id: doc.id, ...doc.data() }));
        if (!rows.length) { box.innerHTML = '<div class="card"><p>No aspirants have been added for this poll.</p></div>'; return; }
        const voteDoc = await votesRef.doc(browserVoteDocId(pollId)).get();
        const alreadyVoted = voteDoc.exists;
        const groups = groupByPosition(rows);
        box.innerHTML = "";
        Object.entries(groups).forEach(([position, items]) => {
          if (!items.length) return;
          const section = document.createElement("section");
          section.className = "position-block";
          section.innerHTML = `<h2 class="position-title"><span>${escapeHTML(position)}</span></h2><div class="grid">${items.map((a) => `
            <div class="card vote-card">
              <div class="aspirant-card"><img src="${escapeHTML(imageUrl(a.imageUrl))}" referrerpolicy="no-referrer" onerror="this.src='${PLACEHOLDER}'" alt="${escapeHTML(a.name)}"><div class="aspirant-info"><h3>${escapeHTML(a.name)}</h3><span class="pill">${escapeHTML(position)}</span></div></div>
              <button type="button" data-vote="${escapeHTML(a.id)}" data-position="${escapeHTML(position)}" data-name="${escapeHTML(a.name)}" ${alreadyVoted ? "disabled" : ""}>${alreadyVoted ? "Already voted" : `Vote for ${escapeHTML(a.name)}`}</button>
            </div>`).join("")}</div>`;
          box.appendChild(section);
        });
        if (alreadyVoted) {
          status("voteStatus", "You have already submitted a vote in this poll using this browser.", "bad");
          return;
        }
        clearStatus("voteStatus");
        document.querySelectorAll("[data-vote]").forEach((button) => button.addEventListener("click", () => castVote(pollId, button.dataset.vote, button.dataset.position, button.dataset.name)));
      } catch (error) { status("voteStatus", error.message || firebaseError(error), "bad"); }
    }, (error) => status("voteStatus", firebaseError(error), "bad"));
  }

  async function castVote(pollId, aspirantId, position, name) {
    if (!confirm(`Confirm your vote for ${name} as ${position}? You can vote only once in this poll using this browser.`)) return;
    try {
      const voteDocId = browserVoteDocId(pollId);
      await db.runTransaction(async (transaction) => {
        const voteDoc = votesRef.doc(voteDocId);
        const existing = await transaction.get(voteDoc);
        if (existing.exists) throw new Error("You have already submitted your vote in this poll.");
        transaction.set(voteDoc, { pollId, browserToken: getBrowserToken(), position, aspirantId, createdAt: firebase.firestore.FieldValue.serverTimestamp() });
        transaction.update(aspirantsRef.doc(aspirantId), { votes: firebase.firestore.FieldValue.increment(1) });
      });
      status("voteStatus", "Vote submitted successfully. This browser cannot vote again in this poll.");
      document.querySelectorAll("[data-vote]").forEach((button) => { button.disabled = true; button.textContent = "Already voted"; });
    } catch (error) { status("voteStatus", error.message || firebaseError(error), "bad"); }
  }

  async function renderDashboard() {
    try {
      await fillPollSelect("dashboardPollSelect", true);
      const select = $("dashboardPollSelect");
      select?.addEventListener("change", () => listenDashboard(select.value));
      $("dashboardPositionSelect")?.addEventListener("change", drawCurrentChart);
      listenDashboard(select?.value || "");
    } catch (error) { status("dashboardStatus", firebaseError(error), "bad"); }
  }

  function listenDashboard(pollId) {
    if (unsubscribeDashboard) unsubscribeDashboard();
    if (!pollId) { renderDashboardRows([]); return; }
    unsubscribeDashboard = aspirantsRef.where("pollId", "==", pollId).onSnapshot((snapshot) => {
      currentRows = [];
      snapshot.forEach((doc) => currentRows.push({ id: doc.id, ...doc.data(), position: normalizePosition(doc.data().position) }));
      renderDashboardRows(currentRows);
    }, (error) => status("dashboardStatus", firebaseError(error), "bad"));
  }

  function renderDashboardRows(rows) {
    const total = rows.reduce((sum, row) => sum + (row.votes || 0), 0);
    if ($("totalVotes")) $("totalVotes").textContent = total.toLocaleString();
    if ($("totalAspirants")) $("totalAspirants").textContent = rows.length.toLocaleString();
    const leader = [...rows].sort((a, b) => (b.votes || 0) - (a.votes || 0))[0];
    if ($("leadingAspirant")) $("leadingAspirant").textContent = leader ? leader.name : "-";

    const posSelect = $("dashboardPositionSelect");
    if (posSelect) {
      const existing = posSelect.value;
      const positions = [...new Set(rows.map((row) => normalizePosition(row.position)))];
      positions.sort((a, b) => {
        const ai = POSITION_ORDER.indexOf(a), bi = POSITION_ORDER.indexOf(b);
        return (ai === -1 ? 999 : ai) - (bi === -1 ? 999 : bi) || a.localeCompare(b);
      });
      posSelect.innerHTML = positions.length ? positions.map((p) => `<option>${escapeHTML(p)}</option>`).join("") : "<option>No position</option>";
      if (positions.includes(existing)) posSelect.value = existing;
    }

    const groups = groupByPosition(rows);
    const list = $("resultsList");
    const table = $("resultsTable");
    const summary = $("positionSummary");
    if (list) list.innerHTML = "";
    if (table) table.innerHTML = "";
    if (summary) summary.innerHTML = "";

    Object.entries(groups).forEach(([position, items]) => {
      if (!items.length) return;
      items = [...items].sort((a, b) => (b.votes || 0) - (a.votes || 0) || String(a.name || "").localeCompare(String(b.name || "")));
      const positionTotal = items.reduce((sum, row) => sum + (row.votes || 0), 0);
      const section = document.createElement("section");
      section.className = "position-block";
      section.innerHTML = `<h2 class="position-title"><span>${escapeHTML(position)}</span><small class="small">${positionTotal.toLocaleString()} votes</small></h2><div class="grid">${items.map((a, index) => {
        const pct = positionTotal ? Math.round(((a.votes || 0) / positionTotal) * 100) : 0;
        return `<div class="card result-card"><img class="photo" src="${escapeHTML(imageUrl(a.imageUrl))}" referrerpolicy="no-referrer" onerror="this.src='${PLACEHOLDER}'" alt="${escapeHTML(a.name)}"><div><h3>${escapeHTML(a.name)}</h3><span class="pill">Rank ${index + 1}</span><div class="bar-wrap"><div class="bar" style="width:${pct}%"></div></div><p class="small">${(a.votes || 0).toLocaleString()} votes · ${pct}%</p></div><strong>${pct}%</strong></div>`;
      }).join("")}</div>`;
      list?.appendChild(section);

      if (summary) summary.innerHTML += `<div style="padding:14px 0;border-bottom:1px solid var(--line)"><strong>${escapeHTML(position)}</strong><p class="small" style="margin-bottom:0">Total votes: ${positionTotal.toLocaleString()}<br>Leading: ${escapeHTML(items[0]?.name || "-")}</p></div>`;
      items.forEach((a, index) => {
        const pct = positionTotal ? Math.round(((a.votes || 0) / positionTotal) * 100) : 0;
        if (table) table.innerHTML += `<tr><td>${escapeHTML(position)}</td><td>${index + 1}</td><td><img class="photo" style="width:38px;height:38px;border-radius:9px" src="${escapeHTML(imageUrl(a.imageUrl))}" referrerpolicy="no-referrer" onerror="this.src='${PLACEHOLDER}'" alt=""></td><td>${escapeHTML(a.name)}</td><td>${(a.votes || 0).toLocaleString()}</td><td>${pct}%</td></tr>`;
      });
    });
    drawCurrentChart();
  }

  function drawCurrentChart() {
    const chart = $("photoChart");
    if (!chart) return;
    const position = $("dashboardPositionSelect")?.value;
    const rows = currentRows.filter((row) => normalizePosition(row.position) === position).sort((a, b) => (b.votes || 0) - (a.votes || 0) || String(a.name || "").localeCompare(String(b.name || "")));
    if (!rows.length) { chart.innerHTML = '<div class="empty-chart">No data to show</div>'; return; }
    const max = Math.max(...rows.map((row) => row.votes || 0), 1);
    chart.innerHTML = rows.map((row) => {
      const votes = row.votes || 0;
      const width = Math.max(4, Math.round((votes / max) * 100));
      return `<div class="photo-chart-row"><img src="${escapeHTML(imageUrl(row.imageUrl))}" referrerpolicy="no-referrer" onerror="this.src='${PLACEHOLDER}'" alt="${escapeHTML(row.name)}"><div><div class="photo-chart-label"><strong>${escapeHTML(row.name)}</strong><span>${votes.toLocaleString()} votes</span></div><div class="bar-wrap"><div class="bar" style="width:${width}%"></div></div></div></div>`;
    }).join("");
  }

  if (page === "home") renderHome();
  if (page === "contact") renderContact();
  if (page === "admin") renderAdmin();
  if (page === "vote") renderVote();
  if (page === "dashboard") renderDashboard();
})();
