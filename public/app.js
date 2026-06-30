// Alfred — Command Center

let appState = {};
let memory = { facts: [] };
let approvals = [];
let approvalHistory = [];
let chatHistory = [];
let isStreaming = false;
let currentWorkspace = null;
let isSubmitting = false;  // global submit guard
let ghlStageMap = {};      // loaded from /api/ghl-stage-map on init

// ── INIT ──────────────────────────────────────────────────────
async function init() {
  setTopDate();
  updateCountdowns();
  await loadState();
  updateGHLSyncStatus();
  loadSyncHealth();
  setupKeyboard();
}

async function loadState() {
  try {
    const [stateRes, mapRes] = await Promise.all([
      fetch('/api/state'),
      fetch('/api/ghl-stage-map'),
    ]);
    if (!stateRes.ok) throw new Error(`State server ${stateRes.status}`);
    const data = await stateRes.json();
    appState = data.state || {};
    memory = data.memory || { facts: [] };
    approvals = Array.isArray(data.approvals) ? data.approvals : [];
    approvalHistory = Array.isArray(data.approvalHistory) ? data.approvalHistory : [];
    if (mapRes.ok) ghlStageMap = await mapRes.json();
    renderAll();
    const tsEl = document.getElementById('stateLoadTime');
    if (tsEl) tsEl.textContent = 'SYNCED ' + new Date().toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true });
  } catch (e) {
    console.error('Failed to load state:', e);
    showToast('Failed to load Alfred data. Check server.', 'error');
  }
}

// ── TOAST ─────────────────────────────────────────────────────
function showToast(message, type = 'success') {
  const existing = document.querySelector('.alfred-toast');
  if (existing) existing.remove();
  const toast = document.createElement('div');
  toast.className = `alfred-toast toast-${type}`;
  toast.textContent = message;
  document.body.appendChild(toast);
  requestAnimationFrame(() => toast.classList.add('toast-visible'));
  setTimeout(() => {
    toast.classList.remove('toast-visible');
    setTimeout(() => toast.remove(), 300);
  }, 3000);
}

function renderAll() {
  renderApprovals();
  renderMemory();
  renderMCData();
  renderLAMData();
  renderWealthData();
  renderLifeOSData();
  renderHomeAlerts();
  updateApprovalBadge();
  loadNotes();
}

function renderHomeAlerts() {
  const el = document.getElementById('homeAlerts');
  if (!el) return;

  const mc     = appState?.mc     || {};
  const lam    = appState?.lam    || {};
  const lo     = appState?.lifeOS || {};
  const wealth = appState?.wealth || {};
  const body   = lo.body || {};

  const chips = [];

  // Open wealth deadlines — computed live via deadlineStatus()
  const openDeadlines = (wealth.urgentDeadlines || []).filter(d => !d.resolvedStatus);
  openDeadlines.forEach(d => chips.push({ text: deadlineChipText(d), cls: 'critical' }));

  // LAM revenue
  chips.push({ text: `LAM MTD $${(lam.mthRevenue || 0).toLocaleString()}`, cls: '' });

  // MC revenue if > 0
  if (mc.revenueMTD > 0) {
    chips.push({ text: `MC MTD $${mc.revenueMTD.toLocaleString()} · ${mc.policiesClosed || 0} close`, cls: 'green' });
  }

  // Weight
  const wt = body.currentWeight;
  const wStatus = body.status || '—';
  if (wt) {
    chips.push({ text: `${wt} → ${body.goalWeight || 200} lbs · ${wStatus}`, cls: wStatus === 'BEHIND' ? 'warn' : '' });
  }

  // Days to Sept 1 via deadlineStatus()
  const targetDate = lo.targetDate || '2026-09-01';
  const { liveDays: daysLeft } = deadlineStatus(targetDate);
  chips.push({ text: `${daysLeft} days to quit W2`, cls: '' });

  const parts = chips.map((c, i) =>
    `${i > 0 ? '<span class="alert-sep">·</span>' : ''}<span class="alert-chip${c.cls ? ' ' + c.cls : ''}">${escHtml(c.text)}</span>`
  ).join('');

  el.innerHTML = `<span class="alert-label">⚠ ACTIVE ALERTS</span>${parts}`;

  // Update wealth node stat
  const wealthNode = document.getElementById('node-wealth-stat');
  if (wealthNode) {
    const next = openDeadlines[0];
    wealthNode.textContent = next ? `${next.label.split('—')[0].trim().slice(0, 22)} ⚠` : 'No open deadlines';
  }
}

function setTopDate() {
  const el = document.getElementById('topDate');
  if (!el) return;
  const now = new Date();
  el.textContent = now.toLocaleDateString('en-US', {
    weekday: 'short', month: 'short', day: 'numeric', year: 'numeric'
  }).toUpperCase();
}

function updateCountdowns() {
  const today = new Date(); today.setHours(0,0,0,0);
  const sept1 = new Date('2026-09-01');
  const days = Math.ceil((sept1 - today) / 86400000);

  const lifeStat = document.getElementById('node-lifeos-stat');
  if (lifeStat) lifeStat.textContent = `${days} days → Sept 1`;

  const quitEl = document.getElementById('daysToQuit');
  if (quitEl) quitEl.textContent = days;
}

function setupKeyboard() {
  document.addEventListener('keydown', e => {
    if (e.key === 'Escape') {
      if (document.querySelector('.modal-backdrop.open')) {
        document.querySelectorAll('.modal-backdrop.open').forEach(m => m.classList.remove('open'));
      } else if (document.getElementById('chatOverlay').classList.contains('open')) {
        toggleChat();
      } else if (currentWorkspace) {
        goHome();
      }
    }
  });
}

// ── APPROVALS NAVIGATION ──────────────────────────────────────
function enterApprovals() {
  currentWorkspace = 'approvals';
  document.querySelectorAll('.screen').forEach(s => s.classList.remove('active', 'entering'));
  const ws = document.getElementById('screen-approvals');
  ws.classList.add('active', 'entering');
  setTimeout(() => ws.classList.remove('entering'), 300);
  const trail = document.getElementById('navTrail');
  if (trail) trail.textContent = 'Approvals';
  setCoreStatus('APPROVALS');
  renderApprovalsScreen();
}

// ── NAVIGATION ────────────────────────────────────────────────
function enterWorkspace(name) {
  currentWorkspace = name;
  document.querySelectorAll('.screen').forEach(s => s.classList.remove('active', 'entering'));
  const ws = document.getElementById('screen-' + name);
  ws.classList.add('active', 'entering');
  setTimeout(() => ws.classList.remove('entering'), 300);

  // Scan-line sweep effect
  const sweep = document.createElement('div');
  sweep.className = 'scan-sweep';
  document.body.appendChild(sweep);
  setTimeout(() => sweep.remove(), 550);

  const trail = document.getElementById('navTrail');
  const labels = { mc: 'Martinez Capital', lam: 'Living Alpha Male', lifeos: 'Life OS', wealth: 'Wealth' };
  if (trail) trail.textContent = labels[name] || name;

  setCoreStatus('WORKSPACE ACTIVE');
  setCoreTagline('');
}

function goHome() {
  const prev = currentWorkspace ? document.getElementById('screen-' + currentWorkspace) : null;
  currentWorkspace = null;

  if (prev) {
    prev.classList.add('leaving');
    setTimeout(() => {
      prev.classList.remove('active', 'leaving', 'entering');
      _showHome();
    }, 200);
  } else {
    _showHome();
  }
}

function _showHome() {
  document.querySelectorAll('.screen').forEach(s => {
    if (!s.classList.contains('leaving')) s.classList.remove('active', 'entering');
  });
  const home = document.getElementById('screen-home');
  home.classList.add('active', 'entering');
  setTimeout(() => home.classList.remove('entering'), 450);

  const trail = document.getElementById('navTrail');
  if (trail) trail.textContent = '';

  setCoreStatus('ONLINE');
  setCoreTagline('STANDING BY — SELECT WORKSPACE OR MESSAGE ALFRED');
}

// ── CORE STATE ────────────────────────────────────────────────
function setCoreState(state) {
  const core = document.getElementById('alfredCore');
  if (!core) return;
  core.className = 'alfred-core state-' + state;
  const dot = document.getElementById('chatCoreDot');
  if (dot) {
    dot.style.background = state === 'responding' ? 'var(--gold)' :
                           state === 'thinking'   ? 'var(--cyan)' : 'var(--cyan)';
  }
}

function setCoreStatus(text) {
  const el = document.getElementById('coreStatus');
  if (el) el.textContent = text;
}

function setCoreTagline(text) {
  const el = document.getElementById('coreTagline');
  if (el) el.textContent = text;
}

// ── CHAT ──────────────────────────────────────────────────────
function toggleChat() {
  const panel = document.getElementById('chatOverlay');
  panel.classList.toggle('open');
}

function handleChatKey(e) {
  if (e.key === 'Enter' && !e.shiftKey) {
    e.preventDefault();
    sendMessage();
  }
}

function autoResize(el) {
  el.style.height = 'auto';
  el.style.height = Math.min(el.scrollHeight, 100) + 'px';
}

function workspaceContext() {
  if (!currentWorkspace) return '';

  const mc     = appState?.mc     || {};
  const lam    = appState?.lam    || {};
  const lo     = appState?.lifeOS || {};
  const wealth = appState?.wealth || {};

  const ctxMap = {
    mc: () => {
      const ranked = rankLeads(mc.callList || []);
      const topCalls = ranked.filter(l => l._meta.activeQueue).slice(0, 3).map(l => `${l.name} [${l.ghlStage}${l._staleFlag ? ' STALE' : ''}]`).join(', ') || 'none';
      const staleCount = ranked.filter(l => l._meta.activeQueue && l._staleFlag).length;
      const revenue = '$' + (mc.revenueMTD || 0).toLocaleString('en-US');
      const blockers = (mc.blockers || []).length;
      return `[MC CONTEXT: Revenue MTD ${revenue} · ${mc.policiesClosed || 0} close(s) · Top calls: ${topCalls} · ${staleCount} stale · ${blockers} open blocker(s) · GHL is source of truth for lead stages] `;
    },
    lam: () => {
      const revenue = '$' + (lam.mthRevenue || 0).toLocaleString('en-US');
      const queue = (lam.productQueue || []).filter(q => q.status !== 'done').length;
      return `[LAM CONTEXT: Revenue MTD ${revenue} · ${queue} item(s) in production queue · Stage-first, no auto-publishing] `;
    },
    lifeos: () => {
      const body = lo.body || {};
      const today = new Date().toISOString().slice(0, 10);
      const checkin = (lo.dailyCheckins || []).find(c => c.date === today);
      const done = checkin ? `${checkin.completed.length}/3` : '0/3';
      const weight = body.currentWeight ? `${body.currentWeight} lbs (${body.status || '—'})` : '—';
      const days = Math.ceil((new Date('2026-09-01') - new Date()) / 86400000);
      return `[LIFE OS CONTEXT: Today's non-negotiables ${done} · Weight ${weight} · ${days} days to Sept 1] `;
    },
    wealth: () => {
      const open = (wealth.urgentDeadlines || []).filter(d => !d.resolvedStatus);
      const deadlines = open.map(d => deadlineChipText(d)).join('; ') || 'none';
      const kill = (wealth.snowballOrder || []).find(s => s.status === 'KILL TARGET #1');
      const killLine = kill ? `Kill #1: ${kill.account} $${kill.balance}` : '';
      return `[WEALTH CONTEXT: ${open.length} open deadline(s): ${deadlines} · ${killLine} · Total debt $${(wealth.totalDebt || 0).toLocaleString()}] `;
    },
  };

  return (ctxMap[currentWorkspace] || (() => ''))();
}

// ── GHL SYNC ─────────────────────────────────────────────────

async function syncFromGHL() {
  const btn = document.getElementById('ghlSyncBtn');
  const badge = document.getElementById('ghlSyncBadge');
  if (btn) { btn.disabled = true; btn.textContent = 'SYNCING…'; }
  if (badge) { badge.textContent = 'GHL: SYNCING…'; badge.className = 'badge badge-amber'; }
  try {
    const res = await fetch('/api/ghl/sync', { method: 'POST' });
    const data = await res.json();
    if (!res.ok || data.error) {
      const msg = data.error || `Server ${res.status}`;
      if (!data.configured) {
        showToast('GHL credentials not configured — add GHL_API_KEY, GHL_LOCATION_ID, GHL_PIPELINE_ID to .env', 'error');
      } else {
        showToast(`GHL sync failed: ${msg}`, 'error');
      }
      if (badge) { badge.textContent = 'GHL: ERROR'; badge.className = 'badge badge-red'; }
      return;
    }
    await loadState();
    loadSyncHealth();
    // Primary result toast
    const parts = [
      data.added    ? `${data.added} added`           : null,
      data.updated  ? `${data.updated} updated`        : null,
      data.manual_kept ? `${data.manual_kept} manual kept` : null,
    ].filter(Boolean);
    showToast(`GHL sync complete — ${parts.join(', ') || 'no changes'}.`, 'success');
    // Surface conflicts as separate warning toasts (one per conflict, capped at 3)
    const conflicts = Array.isArray(data.conflicts) ? data.conflicts : [];
    if (conflicts.length) {
      conflicts.slice(0, 3).forEach(c => {
        showToast(
          `⚠ Conflict: "${c.ghlName}" (${c.ghlStage}) — ${c.reason}`,
          'warn'
        );
      });
      if (conflicts.length > 3) {
        showToast(`${conflicts.length - 3} more conflict(s) — see audit log.`, 'warn');
      }
    }
    updateGHLSyncStatus();
  } catch (e) {
    showToast(`GHL sync error: ${e.message}`, 'error');
    if (badge) { badge.textContent = 'GHL: ERROR'; badge.className = 'badge badge-red'; }
  } finally {
    if (btn) { btn.disabled = false; btn.textContent = 'SYNC FROM GHL'; }
  }
}

async function updateGHLSyncStatus() {
  try {
    const res = await fetch('/api/ghl/status');
    if (!res.ok) return;
    const data = await res.json();
    const badge = document.getElementById('ghlSyncBadge');
    const lastSyncEl = document.getElementById('ghlLastSync');
    if (!badge) return;
    if (!data.configured) {
      badge.textContent = 'GHL: NOT CONFIGURED';
      badge.className = 'badge badge-gray';
      badge.title = `Missing: ${(data.missing || []).join(', ')}. Add to .env file.`;
      if (lastSyncEl) lastSyncEl.textContent = '';
    } else if (data.lastSync) {
      const dt = new Date(data.lastSync);
      const formatted = dt.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
        + ' ' + dt.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true });
      badge.textContent = 'GHL: LIVE';
      badge.className = 'badge badge-green';
      badge.title = 'GHL read-only sync active. Last sync: ' + formatted;
      if (lastSyncEl) lastSyncEl.textContent = 'LAST SYNC ' + formatted.toUpperCase();
    } else {
      badge.textContent = 'GHL: READY';
      badge.className = 'badge badge-blue';
      badge.title = 'GHL configured. Click SYNC FROM GHL to pull live opportunities.';
      if (lastSyncEl) lastSyncEl.textContent = 'NEVER SYNCED';
    }
  } catch (_) { /* non-fatal */ }
}

// ── SYNC HEALTH ───────────────────────────────────────────────

async function loadSyncHealth() {
  try {
    const res = await fetch('/api/mc/sync_health');
    if (!res.ok) return;
    renderSyncHealth(await res.json());
  } catch (_) { /* non-fatal — panel shows stale state */ }
}

function fmtSyncTime(iso) {
  if (!iso) return 'Never';
  const dt = new Date(iso);
  return dt.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
    + ' ' + dt.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true });
}

function renderSyncHealth(h) {
  const el = document.getElementById('syncHealthBody');
  if (!el) return;

  const hasConflicts = (h.conflict_count    || 0) > 0;
  const hasCollapses = (h.collapse_count_24h || 0) > 0;
  const collapseList = (h.collapse_events_24h || []);
  const trend        = h.dedup_trend ?? '';
  const trendClass   = trend.includes('increased') ? 'red'
                     : trend.includes('decreased') ? 'green'
                     : 'dim';

  // Conflict banner — icon + message, code tag for the field name
  const conflictBanner = hasConflicts
    ? `<div class="sync-conflict-banner" data-testid="sync-conflict-banner">
         <span class="sync-conflict-icon">⚠</span>
         <span>${h.conflict_count} unresolved conflict${h.conflict_count > 1 ? 's' : ''} —
         GHL record skipped. Assign <code>ghlOpportunityId</code> manually to resolve.</span>
       </div>`
    : '';

  // Collapse section — expandable when events exist, clean dot when none
  const collapseSection = hasCollapses
    ? `<details class="sync-collapse-details" data-testid="sync-collapse-details">
         <summary class="sync-collapse-summary">
           ${h.collapse_count_24h} collapse${h.collapse_count_24h > 1 ? 's' : ''} in last 24h
         </summary>
         <div class="sync-collapse-list">
           ${collapseList.map(ev =>
             `<div class="sync-collapse-row">
               <span class="sync-collapse-kept"  title="${ev.kept}">${ev.kept}</span>
               <span class="sync-collapse-arrow">←</span>
               <span class="sync-collapse-dropped" title="${ev.dropped}">${ev.dropped}</span>
             </div>`
           ).join('')}
         </div>
       </details>`
    : `<div class="sync-clean-state" data-testid="sync-collapse-count">
         <span class="sync-clean-dot"></span>no collapses in 24h
       </div>`;

  el.innerHTML = `
    ${conflictBanner}
    <div class="stat-row">
      <span class="stat-label">Total</span>
      <span class="stat-val" data-testid="sh-total">${h.total_leads ?? '—'}</span>
    </div>
    <div class="stat-row">
      <span class="stat-label">Synced</span>
      <span class="stat-val green" data-testid="sh-synced">${h.synced_count ?? '—'}</span>
    </div>
    <div class="stat-row">
      <span class="stat-label">Manual</span>
      <span class="stat-val dim" data-testid="sh-manual">${h.manual_count ?? '—'}</span>
    </div>
    <div class="stat-row">
      <span class="stat-label">Last deduped</span>
      <span class="stat-val" data-testid="sh-last-deduped">${h.last_sync_deduped ?? 0}</span>
    </div>
    <div class="sh-trend-block">
      <div class="sh-trend-label">Trend</div>
      <div class="sh-trend-value ${trendClass}" data-testid="sh-trend">${trend || '—'}</div>
    </div>
    <div class="stat-row">
      <span class="stat-label">Last sync</span>
      <span class="stat-val dim" data-testid="sh-last-sync">${fmtSyncTime(h.last_sync_at)}</span>
    </div>
    ${collapseSection}
  `;

  // Panel border + header turn red on active conflicts
  const panel = document.getElementById('syncHealthPanel');
  if (panel) panel.classList.toggle('sync-health-conflict', hasConflicts);
}

// ── AGENT INVOCATION ─────────────────────────────────────────
// Client sends only: workspace, agent_name, prompt, optional trigger.
// Server constructs permitted context from live state.
async function invokeAgent(agentName, prompt, trigger = {}) {
  const wsMap = { maya: 'mc', atlas: 'mc', brooks: 'wealth' };
  const workspace = wsMap[agentName];
  if (!workspace) throw new Error(`Unknown agent: ${agentName}`);
  const res = await fetch('/api/agents/invoke', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ workspace, agent_name: agentName, prompt, trigger }),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || `Agent server error ${res.status}`);
  return data;
}

async function sendMessage() {
  if (isStreaming) return;
  const input = document.getElementById('chatInput');
  const text = input.value.trim();
  if (!text) return;

  // Ensure chat panel is open
  if (!document.getElementById('chatOverlay').classList.contains('open')) {
    toggleChat();
  }

  input.value = '';
  input.style.height = 'auto';
  isStreaming = true;
  document.getElementById('chatSend').disabled = true;
  setCoreState('thinking');
  setCoreStatus('PROCESSING');

  const userContent = workspaceContext() + text;
  chatHistory.push({ role: 'user', content: userContent });
  appendMsg('user', text);
  const typingId = appendTyping();

  try {
    const res = await fetch('/api/chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ messages: chatHistory })
    });

    if (!res.ok) throw new Error(`Server ${res.status}`);

    removeTyping(typingId);
    setCoreState('responding');
    setCoreStatus('RESPONDING');

    const msgEl = appendMsg('alfred', '');
    const bodyEl = msgEl.querySelector('.msg-body');

    const reader = res.body.getReader();
    const decoder = new TextDecoder();
    let buf = '', full = '';

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      buf += decoder.decode(value, { stream: true });
      const lines = buf.split('\n');
      buf = lines.pop();

      for (const line of lines) {
        if (!line.startsWith('data: ')) continue;
        try {
          const evt = JSON.parse(line.slice(6));
          if (evt.type === 'delta') {
            full += evt.text;
            bodyEl.innerHTML = renderMarkdown(full);
            scrollChat();
          }
          if (evt.type === 'error') {
            bodyEl.textContent = 'Error: ' + evt.text;
          }
        } catch {}
      }
    }

    chatHistory.push({ role: 'assistant', content: full });
    if (full.toUpperCase().includes('APPROVAL REQUIRED')) {
      extractAndQueueApproval(full);
    }

  } catch (err) {
    removeTyping(typingId);
    appendMsg('alfred', 'Connection error. Check server and API key.');
    console.error(err);
  }

  isStreaming = false;
  document.getElementById('chatSend').disabled = false;
  setCoreState('idle');
  setCoreStatus(currentWorkspace ? 'WORKSPACE ACTIVE' : 'ONLINE');
}

function appendMsg(role, text) {
  const container = document.getElementById('chatMessages');
  const div = document.createElement('div');
  div.className = `msg ${role}`;
  div.innerHTML = `
    <div class="msg-role">${role === 'alfred' ? 'ALFRED' : 'YOU'}</div>
    <div class="msg-body">${role === 'alfred' ? renderMarkdown(text) : escHtml(text)}</div>
  `;
  container.appendChild(div);
  scrollChat();
  return div;
}

function appendTyping() {
  const container = document.getElementById('chatMessages');
  const id = 'typing-' + Date.now();
  const div = document.createElement('div');
  div.id = id;
  div.className = 'msg alfred';
  div.innerHTML = `
    <div class="msg-role">ALFRED</div>
    <div class="typing-indicator">
      <div class="typing-dot"></div>
      <div class="typing-dot"></div>
      <div class="typing-dot"></div>
    </div>
  `;
  container.appendChild(div);
  scrollChat();
  return id;
}

function removeTyping(id) { document.getElementById(id)?.remove(); }
function scrollChat() {
  const m = document.getElementById('chatMessages');
  if (m) m.scrollTop = m.scrollHeight;
}

function clearChat() {
  chatHistory = [];
  document.getElementById('chatMessages').innerHTML = `
    <div class="msg alfred">
      <div class="msg-role">ALFRED</div>
      <div class="msg-body">Standing by. What do you need?</div>
    </div>
  `;
}

// ── MARKDOWN ──────────────────────────────────────────────────
function renderMarkdown(t) {
  let h = escHtml(t);
  h = h.replace(/^### (.+)$/gm, '<strong style="display:block;margin-top:10px;margin-bottom:3px;color:var(--text)">$1</strong>');
  h = h.replace(/^## (.+)$/gm, '<strong style="display:block;margin-top:12px;margin-bottom:4px;font-size:14px;color:var(--text)">$1</strong>');
  h = h.replace(/^# (.+)$/gm, '<strong style="display:block;margin-top:12px;margin-bottom:5px;font-size:15px;color:var(--gold)">$1</strong>');
  h = h.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>');
  h = h.replace(/\*(.+?)\*/g, '<em style="color:var(--text2)">$1</em>');
  h = h.replace(/`([^`]+)`/g, '<code>$1</code>');
  h = h.replace(/^[-•] (.+)$/gm, '<div style="display:flex;gap:6px;margin:2px 0"><span style="color:var(--cyan);margin-top:1px;font-size:12px">›</span><span>$1</span></div>');
  h = h.replace(/^(\d+)\. (.+)$/gm, '<div style="display:flex;gap:6px;margin:2px 0"><span style="color:var(--gold);font-family:\'DM Mono\',monospace;font-size:11px;min-width:16px">$1.</span><span>$2</span></div>');
  h = h.replace(/^---$/gm, '<hr style="border:none;border-top:1px solid var(--border);margin:10px 0">');
  h = h.replace(/\n/g, '<br>');
  h = h.replace(/APPROVAL REQUIRED: (.+?)(?=<br>|$)/gi,
    `<div class="approval-gate"><span class="approval-gate-label">⚠ APPROVAL REQUIRED</span>$1</div>`);
  return h;
}

function escHtml(t) {
  return String(t).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}

// ── DATE UTILITY — single source for all deadline status ──────
function deadlineStatus(dateStr) {
  if (!dateStr) return { liveDays: null, status: 'unknown' };
  const today = new Date(); today.setHours(0,0,0,0);
  const liveDays = Math.ceil((new Date(dateStr + 'T00:00:00') - today) / 86400000);
  const status = liveDays < 0 ? 'overdue' : liveDays === 0 ? 'due-today' : 'upcoming';
  return { liveDays, status };
}

function deadlineChipText(d) {
  const { liveDays, status } = deadlineStatus(d.date);
  if (status === 'overdue')   return `${d.label} — OVERDUE`;
  if (status === 'due-today') return `${d.label} — DUE TODAY`;
  if (liveDays != null)       return `${d.label} (${liveDays}d)`;
  return d.label;
}

function renderBlockerList(elId, blockers) {
  const el = document.getElementById(elId);
  if (!el) return;
  el.innerHTML = (blockers || []).length
    ? blockers.map(b => `<div class="blocker-row">⛔ ${escHtml(b)}</div>`).join('')
    : '<div class="hud-empty">No active blockers.</div>';
}

function deadlineRowHtml(d, resolved) {
  if (resolved) {
    return `<div class="blocker-row resolved">✓ ${escHtml(d.label)} — <span style="color:var(--green)">${escHtml(d.resolvedStatus)}</span>${d.resolvedNote ? `<br><span class="dispute-note">${escHtml(d.resolvedNote)}</span>` : ''}</div>`;
  }
  const { liveDays, status } = deadlineStatus(d.date);
  const suffix = status === 'overdue' ? ' — OVERDUE' : status === 'due-today' ? ' — DUE TODAY' : liveDays != null ? ` (${liveDays} DAYS)` : '';
  return `<div class="blocker-row critical">🔴 ${escHtml(d.label)}${suffix}</div>`;
}

// ── BRIEFING ──────────────────────────────────────────────────
async function generateBriefing() {
  if (!document.getElementById('chatOverlay').classList.contains('open')) toggleChat();

  const today = new Date().toLocaleDateString('en-US', {
    weekday: 'long', month: 'long', day: 'numeric', year: 'numeric'
  });

  // Pull live state data
  const mc     = appState?.mc     || {};
  const lam    = appState?.lam    || {};
  const lo     = appState?.lifeOS || {};
  const wealth = appState?.wealth || {};
  const body   = lo.body || {};

  const todayStr = new Date().toISOString().slice(0, 10);
  const checkin = (lo.dailyCheckins || []).find(c => c.date === todayStr);
  const nnDone  = checkin ? checkin.completed.join(', ') : 'none logged yet';

  const openDeadlines = (wealth.urgentDeadlines || []).filter(d => !d.resolvedStatus);
  const deadlineLines = openDeadlines.map(d => {
    const { liveDays, status } = deadlineStatus(d.date);
    const suffix = status === 'overdue' ? ' — OVERDUE' : status === 'due-today' ? ' — DUE TODAY' : liveDays != null ? ` — ${liveDays} days` : '';
    return `  - ${d.label} (${d.date})${suffix}`;
  }).join('\n') || '  None open.';

  const rankedLeads = rankLeads(mc.callList || []);
  const callList = rankedLeads.filter(l => l._meta.activeQueue).slice(0, 5).map(l =>
    `  - ${l.name} [${l.ghlStage}${l._staleFlag ? ` — STALE ${l._staleDays}d` : ''}]${l.nextAction ? ' · ' + l.nextAction : ''}`
  ).join('\n') || '  Empty.';

  const openBlockers = (mc.blockers || []).map((b, i) => `  ${i+1}. ${b}`).join('\n') || '  None.';

  const killTarget = (wealth.snowballOrder || []).find(s => s.status === 'KILL TARGET #1');
  const killLine = killTarget ? `${killTarget.account} — $${killTarget.balance.toLocaleString()} remaining` : 'none';

  const loTargetDate = lo.targetDate || '2026-09-01';
  const { liveDays: daysToSept1 } = deadlineStatus(loTargetDate);

  const prompt = `Generate today's CEO briefing for ${today}.

LIVE DATA (use these exact figures — do not substitute):

MARTINEZ CAPITAL:
  Revenue MTD: $${(mc.revenueMTD || 0).toLocaleString()} / $10,000 goal (${mc.policiesClosed || 0} close(s))
  Call list:
${callList}
  Open blockers:
${openBlockers}

LIVING ALPHA MALE:
  Revenue MTD: $${(lam.mthRevenue || 0).toLocaleString()}
  Next product to build: 30-Day Chest Program ($27 tripwire)

LIFE OS:
  Non-negotiables today: ${nnDone}
  Weight: ${body.currentWeight || '—'} lbs → ${body.goalWeight || 200} lbs goal | ${body.lbsToGoal || '—'} lbs to go | Pace: ${body.status || '—'}
  Days to Sept 1 (quit W2 + weight goal): ${daysToSept1}

WEALTH — OPEN DEADLINES:
${deadlineLines}
  Snowball kill target: ${killLine}

---

Format the briefing exactly as follows:

## CRITICAL — ACT TODAY
List only open deadlines that require an action today or are overdue. Specific. No commentary.

## MARTINEZ CAPITAL
Revenue vs goal. Call list: name the top 2 leads and their status. One blocker that is most actionable.

## LIVING ALPHA MALE
Revenue MTD. One next action.

## LIFE OS
Non-negotiables status. Weight vs goal and pace status. Days to target.

## TOP 3 ACTIONS TODAY
Numbered. Specific. Assigned to context (MC / LAM / Wealth / Life). No motivational language.

Keep it tight. Executive. No fluff. Under 300 words total.`;


  chatHistory.push({ role: 'user', content: prompt });

  isStreaming = true;
  document.getElementById('chatSend').disabled = true;
  setCoreState('thinking');

  const typingId = appendTyping();

  try {
    const res = await fetch('/api/chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ messages: chatHistory })
    });

    removeTyping(typingId);
    setCoreState('responding');

    const msgEl = appendMsg('alfred', '');
    const bodyEl = msgEl.querySelector('.msg-body');

    const reader = res.body.getReader();
    const decoder = new TextDecoder();
    let buf = '', full = '';

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      buf += decoder.decode(value, { stream: true });
      const lines = buf.split('\n');
      buf = lines.pop();
      for (const line of lines) {
        if (!line.startsWith('data: ')) continue;
        try {
          const evt = JSON.parse(line.slice(6));
          if (evt.type === 'delta') { full += evt.text; bodyEl.innerHTML = renderMarkdown(full); scrollChat(); }
        } catch {}
      }
    }

    chatHistory.push({ role: 'assistant', content: full });
  } catch (e) {
    removeTyping(typingId);
    appendMsg('alfred', 'Error generating briefing.');
  }

  isStreaming = false;
  document.getElementById('chatSend').disabled = false;
  setCoreState('idle');
  setCoreStatus(currentWorkspace ? 'WORKSPACE ACTIVE' : 'ONLINE');
}

// ── MODALS ────────────────────────────────────────────────────
function openModal(id) {
  document.getElementById(id)?.classList.add('open');
  // Life OS modals — pre-fill today's date and reflect current state
  const today = new Date().toISOString().slice(0,10);
  if (id === 'modal-log-weight') {
    const d = document.getElementById('weightDate');
    if (d && !d.value) d.value = today;
  }
  if (id === 'modal-checkin') {
    const d = document.getElementById('checkinDate');
    if (d && !d.value) d.value = today;
    const lo = appState?.lifeOS || {};
    const existing = (lo.dailyCheckins || []).find(c => c.date === today);
    const completed = new Set(existing?.completed || []);
    ['Bible','Workout','Business'].forEach(item => {
      const cb = document.getElementById(`ci-${item}`);
      if (cb) cb.checked = completed.has(item);
    });
  }
  if (id === 'modal-log-week') {
    const d = document.getElementById('weekOf');
    if (d && !d.value) d.value = today;
  }
}

function closeModal(event, id) {
  const el = document.getElementById(id);
  if (!event || event.target === el) el?.classList.remove('open');
}

function openOverlay(name) {
  document.getElementById('overlay-' + name)?.classList.add('open');
  if (name === 'memory') {
    switchMemoryTab('facts');
  }
}

function closeOverlay(event, name) {
  if (!event || event.target === document.getElementById('overlay-' + name)) {
    document.getElementById('overlay-' + name)?.classList.remove('open');
  }
}

// ── APPROVALS ─────────────────────────────────────────────────
function extractAndQueueApproval(text) {
  const m = text.match(/APPROVAL REQUIRED:\s*(.+?)(?:\n|$)/i);
  if (!m) return;
  fetch('/api/approvals', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ title: 'Alfred Action', description: m[1].trim(), workspace: currentWorkspace || 'Alfred', action: m[1].trim() })
  }).then(() => loadState());
}

function renderApprovals() {
  // Keep the old list in overlay (legacy) and update badge
  const badge = document.getElementById('approvalQueueBadge');
  const pending = approvals.filter(a => a.status === 'pending');
  if (badge) badge.textContent = `${pending.length} PENDING`;
  renderApprovalsScreen();
}

function renderApprovalsScreen() {
  const pending = approvals.filter(a => a.status === 'pending');
  const deferred = approvals.filter(a => a.status === 'deferred');
  const badge = document.getElementById('approvalQueueBadge');
  if (badge) badge.textContent = `${pending.length} PENDING`;

  const listEl = document.getElementById('approvalsListScreen');
  const histEl = document.getElementById('approvalsHistory');

  if (listEl) {
    const all = [...pending, ...deferred];
    if (!all.length) {
      listEl.innerHTML = '<div class="hud-empty">No pending approvals.</div>';
    } else {
      listEl.innerHTML = all.map(a => {
        const isDeferred = a.status === 'deferred';
        return `
        <div class="approval-card ${isDeferred ? 'approval-card-deferred' : ''}">
          <div class="approval-card-ws">${escHtml(a.workspace || 'Alfred')}</div>
          <div class="approval-card-title">${escHtml(a.title || 'Action')}</div>
          <div class="approval-card-desc">${escHtml(a.description || '')}</div>
          ${isDeferred ? `<div class="approval-card-defer-note">Deferred: ${escHtml(a.deferNote || '—')}</div>` : ''}
          <div class="approval-card-meta">${fmtDate(a.createdAt)}</div>
          <div class="approval-card-actions">
            <button class="btn-approve" onclick="approveItem('${a.id}')">APPROVE</button>
            <button class="btn-reject" onclick="rejectItem('${a.id}')">REJECT</button>
            ${!isDeferred ? `<button class="btn-defer" onclick="openDeferModal('${a.id}')">DEFER</button>` : ''}
          </div>
        </div>`;
      }).join('');
    }
  }

  if (histEl) {
    if (!approvalHistory.length) {
      histEl.innerHTML = '<div class="hud-empty">No resolved actions yet.</div>';
    } else {
      histEl.innerHTML = approvalHistory.map(a => `
        <div class="approval-hist-item">
          <span class="approval-hist-status ${a.status === 'approved' ? 'status-approved' : a.status === 'rejected' ? 'status-rejected' : 'status-deferred'}">${a.status.toUpperCase()}</span>
          <span class="approval-hist-title">${escHtml(a.title || 'Action')}</span>
          <span class="approval-hist-ws">${escHtml(a.workspace || '—')}</span>
          <span class="approval-hist-date">${fmtDate(a.resolvedAt || a.createdAt)}</span>
        </div>
      `).join('');
    }
  }
}

function fmtDate(iso) {
  if (!iso) return '—';
  try {
    return new Date(iso).toLocaleString('en-US', { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' });
  } catch { return iso; }
}

function updateApprovalBadge() {
  const pending = approvals.filter(a => a.status === 'pending');
  const el = document.getElementById('approvalAlert');
  const count = document.getElementById('approvalAlertCount');
  if (el) el.classList.toggle('hidden', !pending.length);
  if (count) count.textContent = pending.length;
}

async function approveItem(id) {
  try {
    const res = await fetch(`/api/approvals/${id}/approve`, { method: 'POST' });
    const data = await res.json();
    if (!res.ok) { showToast(data.error || 'Approval failed', 'error'); return; }
    await loadState();
    showToast('Action approved and logged.', 'success');
  } catch { showToast('Network error. Try again.', 'error'); }
}

async function rejectItem(id) {
  try {
    const res = await fetch(`/api/approvals/${id}/reject`, { method: 'POST' });
    const data = await res.json();
    if (!res.ok) { showToast(data.error || 'Rejection failed', 'error'); return; }
    await loadState();
    showToast('Action rejected and logged.', 'warn');
  } catch { showToast('Network error. Try again.', 'error'); }
}

function openDeferModal(id) {
  document.getElementById('deferTargetId').value = id;
  document.getElementById('deferNote').value = '';
  openModal('modal-defer');
}

async function submitDefer() {
  if (isSubmitting) return;
  const id = document.getElementById('deferTargetId').value;
  const note = document.getElementById('deferNote').value.trim();
  if (!id) return;
  isSubmitting = true;
  try {
    const res = await fetch(`/api/approvals/${id}/defer`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ note })
    });
    const data = await res.json();
    if (!res.ok) { showToast(data.error || 'Defer failed', 'error'); return; }
    closeModal(null, 'modal-defer');
    await loadState();
    showToast('Action deferred' + (note ? `: ${note}` : '.'), 'warn');
  } catch { showToast('Network error. Try again.', 'error'); }
  finally { isSubmitting = false; }
}

// ── MEMORY ────────────────────────────────────────────────────
function renderMemory() {
  const list = document.getElementById('memoryList');
  if (!list) return;
  const facts = memory.facts || [];
  if (!facts.length) {
    list.innerHTML = '<div class="hud-empty">No memory facts.</div>';
    return;
  }
  list.innerHTML = facts.map((f, i) => `
    <div class="memory-fact">
      <div class="fact-num">${String(i+1).padStart(2,'0')}</div>
      <div class="fact-text" contenteditable="true" onblur="editFact(${i},this.textContent)">${escHtml(f)}</div>
      <button class="fact-del" onclick="deleteFact(${i})">✕</button>
    </div>
  `).join('');
}

async function addFact() {
  const input = document.getElementById('newFactInput');
  const fact = input.value.trim();
  if (!fact) return;
  memory.facts.push(fact);
  input.value = '';
  await saveAllMemory();
}

function editFact(i, text) {
  if (memory.facts) memory.facts[i] = text.trim();
}

async function deleteFact(i) {
  memory.facts.splice(i, 1);
  await saveAllMemory();
}

async function saveAllMemory() {
  await fetch('/api/memory', {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ facts: memory.facts })
  });
  await loadState();
}

// ── MEMORY TABS ───────────────────────────────────────────────
function switchMemoryTab(tab) {
  document.getElementById('memory-tab-facts').classList.toggle('hidden', tab !== 'facts');
  document.getElementById('memory-tab-activity').classList.toggle('hidden', tab !== 'activity');
  document.getElementById('tab-facts').classList.toggle('active', tab === 'facts');
  document.getElementById('tab-activity').classList.toggle('active', tab === 'activity');
  if (tab === 'activity') renderActivityLog();
}

// ── ACTIVITY LOG ──────────────────────────────────────────────
const AUDIT_LABELS = {
  mc_close:                  (e) => `Policy close — ${e.contact} · $${(e.premium||0).toLocaleString()}`,
  wealth_payment:            (e) => `Payment — ${e.account} · $${(e.amount||0).toLocaleString()} applied`,
  wealth_score:              (e) => `Credit score — ${e.bureau} ${e.score}${e.prev ? ' (was '+e.prev+')' : ''}`,
  wealth_dispute:            (e) => `Dispute — ${e.label} → ${e.status}`,
  agent_transition:          (e) => `Agent — ${e.agent} · ${e.from}→${e.to}`,
  agent_transition_requested:(e) => `Agent request — ${e.agent} · ${e.from}→${e.to} (pending approval)`,
  agent_activated:           (e) => `Agent activated — ${e.agent} → ${e.toState||e.to}`,
  agent_state_corrected:     (e) => `State model update — ${e.agent} · ${e.from_state}→${e.to_state}`,
  agent_note_corrected:      (e) => `Note updated — ${e.agent}`,
  approval_created:          (e) => `Approval queued — ${e.title}`,
  approval_resolved:         (e) => `Approval ${e.status} — id ${e.id}`,
  approval_deferred:         (e) => `Approval deferred — id ${e.id}`,
  memory_update:             (e) => `Memory updated — ${e.count} fact(s)`,
  state_update:              (e) => `State patched — ${(e.patch||[]).join(', ')}`,
  lifeos_weight:             (e) => `Weight logged — ${e.weight} lbs · ${e.lbsToGoal} to goal · ${e.status}`,
  lifeos_checkin:            (e) => `Check-in — ${e.completed?.length||0}/3 completed (${(e.completed||[]).join(', ')||'none'})`,
  lifeos_scoreboard:         (e) => `Weekly scoreboard — week of ${e.weekOf}`,
};

const AUDIT_WS_LABELS = { mc: 'MC', lam: 'LAM', lifeos: 'LIFE OS', wealth: 'WEALTH' };

function fmtAuditEntry(e) {
  const fn = AUDIT_LABELS[e.type];
  return fn ? fn(e) : (e.type || 'event').replace(/_/g,' ');
}

function fmtAuditTs(ts) {
  if (!ts) return '';
  const d = new Date(ts);
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) + ' ' +
         d.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true });
}

async function renderActivityLog() {
  const el = document.getElementById('activityLog');
  if (!el) return;
  const ws = document.getElementById('activityWsFilter')?.value || '';
  const url = '/api/audit?limit=50' + (ws ? '&workspace=' + ws : '');
  try {
    const res = await fetch(url);
    const entries = await res.json();
    if (!entries.length) {
      el.innerHTML = '<div class="hud-empty">No activity logged yet.</div>';
      return;
    }
    // Group by date
    const groups = {};
    entries.forEach(e => {
      const day = e.timestamp ? e.timestamp.slice(0,10) : (e.at ? e.at.slice(0,10) : 'unknown');
      if (!groups[day]) groups[day] = [];
      groups[day].push(e);
    });
    el.innerHTML = Object.entries(groups).map(([day, items]) => `
      <div class="activity-date-group">
        <div class="activity-date-label">${fmtDate(day)}</div>
        ${items.map(e => `
          <div class="activity-entry">
            <div class="activity-entry-main">${escHtml(fmtAuditEntry(e))}</div>
            <div class="activity-entry-meta">
              ${e.workspace ? `<span class="activity-ws-tag">${AUDIT_WS_LABELS[e.workspace]||e.workspace}</span>` : ''}
              <span class="activity-ts">${fmtAuditTs(e.timestamp||e.at)}</span>
            </div>
            ${e.reason ? `<div class="activity-entry-reason">${escHtml(e.reason)}</div>` : ''}
            ${e.unblock_condition ? `<div class="activity-entry-unblock">Unblock: ${escHtml(e.unblock_condition)}</div>` : ''}
          </div>
        `).join('')}
      </div>
    `).join('');
  } catch(err) {
    el.innerHTML = '<div class="hud-empty">Failed to load activity log.</div>';
  }
}

async function renderRecentActivity(wsKey, elId) {
  const el = document.getElementById(elId);
  if (!el) return;
  try {
    const res = await fetch(`/api/audit?limit=5&workspace=${wsKey}`);
    const entries = await res.json();
    if (!entries.length) {
      el.innerHTML = '<div class="hud-empty" style="font-size:11px">No activity yet.</div>';
      return;
    }
    el.innerHTML = entries.slice(0,3).map(e => `
      <div class="recent-activity-entry">
        <div class="recent-activity-label">${escHtml(fmtAuditEntry(e))}</div>
        <div class="recent-activity-ts">${fmtAuditTs(e.timestamp||e.at)}</div>
      </div>
    `).join('');
  } catch(err) {
    el.innerHTML = '<div class="hud-empty" style="font-size:11px">—</div>';
  }
}

// ── GHL STAGE MAP HELPERS ─────────────────────────────────────

const GHL_STAGE_FALLBACK = {
  alfredPriority: 'LOW', staleAfterDays: 999,
  suggestMaya: false, suggestAtlas: false,
  nextActionHint: 'Unknown GHL stage — verify in GHL',
  alfredLabel: 'UNKNOWN', badgeClass: 'badge-gray',
  activeQueue: true, nurtureQueue: false, sortWeight: 0,
};

function stageMeta(ghlStage) {
  return ghlStageMap[ghlStage] || GHL_STAGE_FALLBACK;
}

// Returns scored+annotated leads sorted by priority descending.
function rankLeads(leads) {
  const today = new Date(); today.setHours(0, 0, 0, 0);
  return leads.map(lead => {
    const meta = stageMeta(lead.ghlStage);

    let staleFlag = false, staleDays = 0;
    if (lead.lastContactDate && meta.staleAfterDays != null) {
      const last = new Date(lead.lastContactDate + 'T00:00:00');
      staleDays = Math.floor((today - last) / 86400000);
      staleFlag = staleDays > meta.staleAfterDays;
    }

    let overdueScore = 0;
    if (lead.nextActionDate) {
      const nad = new Date(lead.nextActionDate + 'T00:00:00');
      const diff = Math.floor((today - nad) / 86400000);
      if (diff > 0) overdueScore = 500;
      else if (diff === 0) overdueScore = 250;
    }

    const prioScore = { HIGH: 300, MEDIUM: 200, LOW: 100 }[meta.alfredPriority] || 0;
    const valueScore = Math.min(lead.value || 0, 500);
    const staleScore = staleFlag ? 1000 : 0;
    const score = staleScore + overdueScore + prioScore + (meta.sortWeight || 0) + valueScore;

    return { ...lead, _meta: meta, _staleFlag: staleFlag, _staleDays: staleDays, _score: score };
  }).sort((a, b) => b._score - a._score);
}

function leadCardHtml(lead, idx, section) {
  const m = lead._meta;
  const name = lead.name || 'Unknown';
  const initial = name[0].toUpperCase();

  // Stale chip
  const staleChip = lead._staleFlag
    ? `<span class="badge badge-red" style="font-size:9px">STALE ${lead._staleDays}d</span>`
    : '';

  // Sync status chip
  const syncChip = lead.ghlSyncStatus === 'manual'
    ? `<span class="badge badge-gray" style="font-size:9px;opacity:0.6" title="Manually entered — not yet confirmed by GHL sync">MANUAL</span>`
    : '';

  // Stage badge
  const stageBadge = `<span class="badge ${m.badgeClass}" style="font-size:9px">${escHtml(m.alfredLabel)}</span>`;

  // Value display
  const valueText = lead.value > 0 ? `<span style="color:var(--green);font-size:10px">$${Number(lead.value).toLocaleString()}</span>` : '';

  // Next action display
  const actionText = lead.nextAction || m.nextActionHint || '';

  // Next action date
  const nadText = lead.nextActionDate ? `<span style="color:var(--amber);font-size:10px"> · ${lead.nextActionDate}</span>` : '';

  // Agent suggestion buttons
  const atlasBtn = m.suggestAtlas
    ? `<button class="hud-btn-sm" style="font-size:9px;padding:2px 6px" onclick="suggestAtlas(${JSON.stringify(name)})" title="Atlas — carrier routing support">ATLAS</button>`
    : '';
  const mayaBtn = m.suggestMaya
    ? `<button class="hud-btn-sm" style="font-size:9px;padding:2px 6px" onclick="suggestMaya(${JSON.stringify(name)})" title="Maya — draft outreach or follow-up">MAYA</button>`
    : '';

  // Remove button (only in active/nurture sections)
  const removeBtn = `<button class="hud-btn-sm" style="font-size:9px;padding:2px 5px;opacity:0.4" onclick="removeCall(${idx})" title="Remove lead">✕</button>`;

  return `<div class="hud-list-item" style="flex-wrap:wrap;gap:4px;align-items:flex-start;padding:10px 12px">
    <div style="display:flex;align-items:center;gap:8px;width:100%">
      <div class="hud-list-avatar" style="flex-shrink:0">${initial}</div>
      <div style="flex:1;min-width:0">
        <div style="display:flex;align-items:center;gap:5px;flex-wrap:wrap">
          <span class="hud-list-name">${escHtml(name)}</span>
          ${stageBadge}${staleChip}${syncChip}${valueText}
        </div>
        <div class="hud-list-meta" style="margin-top:2px">${escHtml(actionText)}${nadText}</div>
      </div>
      <div style="display:flex;gap:4px;align-items:center;flex-shrink:0">
        ${atlasBtn}${mayaBtn}${removeBtn}
      </div>
    </div>
  </div>`;
}

// ── MC DATA ───────────────────────────────────────────────────
function renderMCData() {
  const mc = appState?.mc || {};
  const allLeads = mc.callList || [];

  // Revenue + policies
  const revEl = document.getElementById('mcRevenueMTD');
  const polEl = document.getElementById('mcPoliciesClosed');
  if (revEl) revEl.textContent = '$' + (mc.revenueMTD || 0).toLocaleString('en-US', {minimumFractionDigits: 0});
  if (polEl) polEl.textContent = mc.policiesClosed || 0;

  // Mirror MC revenue to Wealth revenue tracker
  const wMCRev = document.getElementById('wealthMCRevenue');
  if (wMCRev) wMCRev.textContent = '$' + (mc.revenueMTD || 0).toLocaleString('en-US', {minimumFractionDigits: 0});

  // LAM and W2 revenue rows
  const wLAMRev = document.getElementById('wealthLAMRevenue');
  if (wLAMRev) wLAMRev.textContent = '$' + (appState?.lam?.mthRevenue || 0).toLocaleString('en-US');
  const wW2 = document.getElementById('wealthW2Income');
  if (wW2) wW2.textContent = '$' + (appState?.wealth?.income?.w2Biweekly || 0).toLocaleString('en-US');
  const wTotal = document.getElementById('wealthTotalRevenue');
  if (wTotal) {
    const total = (mc.revenueMTD || 0) + (appState?.lam?.mthRevenue || 0) + (appState?.wealth?.income?.w2Biweekly || 0);
    wTotal.textContent = '$' + total.toLocaleString('en-US', {minimumFractionDigits: 0});
  }

  // Refresh GHL badge whenever MC data re-renders (e.g. after sync)
  updateGHLSyncStatus();

  // Blockers, phase, goal, agents, activity
  renderBlockerList('mcBlockerList', mc.blockers);
  const phaseEl = document.getElementById('mcPhase');
  if (phaseEl && mc.phase) phaseEl.textContent = mc.phase.replace(/^Phase (\d+)\s*[—\-]\s*/, '$1 · ');
  const goalEl = document.getElementById('mcRevenueGoal');
  if (goalEl && mc.revenueGoal) goalEl.textContent = mc.revenueGoal;
  renderAgentRegistry('mc', 'mcAgentList', 'mc');
  renderRecentActivity('mc', 'mcRecentActivity');

  // ── PIPELINE RANKING ──
  const ranked = rankLeads(allLeads);

  // Partition into sections
  const activeLeads  = ranked.filter(l => l._meta.activeQueue);
  const nurtureLeads = ranked.filter(l => l._meta.nurtureQueue);
  const closedLeads  = ranked.filter(l => !l._meta.activeQueue && !l._meta.nurtureQueue);

  // Stale count for status panel
  const staleCount = activeLeads.filter(l => l._staleFlag).length;
  const topLead = activeLeads[0];

  // Update STATUS panel stats
  const pipelineStatEl = document.getElementById('mcPipelineStat');
  const staleStatEl    = document.getElementById('mcStaleStat');
  const topCallEl      = document.getElementById('mcTopCallStat');
  const pipelineCountEl = document.getElementById('mcPipelineCount');
  if (pipelineStatEl) pipelineStatEl.textContent = `${activeLeads.length} active`;
  if (staleStatEl) {
    staleStatEl.textContent = staleCount > 0 ? `${staleCount} need attention` : 'none';
    staleStatEl.className = 'stat-val' + (staleCount > 0 ? ' red' : ' green');
  }
  if (topCallEl) topCallEl.textContent = topLead ? topLead.name : '—';
  if (pipelineCountEl) pipelineCountEl.textContent = allLeads.length > 0 ? `(${allLeads.length})` : '';

  // Update UPDATE LEAD modal dropdown
  const updateLeadSelect = document.getElementById('updateLeadName');
  if (updateLeadSelect) {
    updateLeadSelect.innerHTML = allLeads.map(l =>
      `<option value="${escHtml(l.name)}">${escHtml(l.name)}</option>`
    ).join('');
  }

  // ── RENDER ACTIVE PIPELINE ──
  const pipelineEl = document.getElementById('mcPipelineHud');
  if (pipelineEl) {
    if (!activeLeads.length) {
      pipelineEl.innerHTML = '<div class="hud-empty">No active leads. Add manually or sync from GHL when P2-D is live.</div>';
    } else {
      // Section dividers: top 3 = "TODAY", then rest
      const top3    = activeLeads.slice(0, 3);
      const rest    = activeLeads.slice(3);
      const staleRest = rest.filter(l => l._staleFlag);
      const normalRest = rest.filter(l => !l._staleFlag);

      // Get original indices for remove buttons
      const origLeads = allLeads;
      const indexedHtml = (group) => group.map(lead => {
        const origIdx = origLeads.findIndex(l => l.name === lead.name);
        return leadCardHtml(lead, origIdx, 'active');
      }).join('');

      let html = `<div class="pipeline-section-label">TODAY — TOP CALLS</div>`;
      html += indexedHtml(top3);

      if (staleRest.length) {
        html += `<div class="pipeline-section-label stale-label">STALE — NEEDS ATTENTION</div>`;
        html += indexedHtml(staleRest);
      }

      if (normalRest.length) {
        html += `<div class="pipeline-section-label">PIPELINE</div>`;
        html += indexedHtml(normalRest);
      }

      pipelineEl.innerHTML = html;
    }
  }

  // ── RENDER NURTURE ──
  const nurturePanel = document.getElementById('mcNurturePanel');
  const nurtureEl = document.getElementById('mcNurtureHud');
  if (nurturePanel) nurturePanel.style.display = nurtureLeads.length ? '' : 'none';
  if (nurtureEl && nurtureLeads.length) {
    nurtureEl.innerHTML = nurtureLeads.map(lead => {
      const origIdx = allLeads.findIndex(l => l.name === lead.name);
      return leadCardHtml(lead, origIdx, 'nurture');
    }).join('');
  }

  // ── RENDER CLOSED / DEAD ──
  const closedPanel = document.getElementById('mcClosedPanel');
  const closedEl = document.getElementById('mcClosedHud');
  if (closedPanel) closedPanel.style.display = closedLeads.length ? '' : 'none';
  if (closedEl && closedLeads.length) {
    closedEl.innerHTML = closedLeads.map((lead, i) => {
      const origIdx = allLeads.findIndex(l => l.name === lead.name);
      return leadCardHtml(lead, origIdx, 'closed');
    }).join('');
  }
}

// ── LAM DATA ──────────────────────────────────────────────────
function renderLAMData() {
  const lam = appState?.lam || {};
  const queue = lam.productQueue || [];
  const rev = lam.mthRevenue || 0;

  // Home node stat
  const lamNodeStat = document.getElementById('node-lam-stat');
  if (lamNodeStat) lamNodeStat.textContent = `MTD: $${rev.toLocaleString()}`;

  // Workspace stats
  const lamRevMTD = document.getElementById('lamRevenueMTD');
  if (lamRevMTD) lamRevMTD.textContent = `$${rev.toLocaleString()}`;
  const lamStatMTD = document.getElementById('lamStatsMTD');
  if (lamStatMTD) lamStatMTD.textContent = `$${rev.toLocaleString()}`;

  // Product list from state — visually distinguished by tier
  const productListEl = document.getElementById('lamProductList');
  if (productListEl) {
    const products = lam.products || [];
    const tierMeta = {
      'lead-magnet': { label: 'LEAD MAGNET', cls: 'badge-gray',  priceText: p => 'FREE' },
      'tripwire':    { label: 'TRIPWIRE',    cls: 'badge-blue',  priceText: p => `$${p.price}` },
      'low-ticket':  { label: 'LOW-TICKET',  cls: 'badge-amber', priceText: p => `$${p.price}` },
      'flagship':    { label: 'FLAGSHIP',    cls: 'badge-gold',  priceText: p => `$${p.price}` },
    };
    productListEl.innerHTML = products.map(p => {
      const meta    = tierMeta[p.tier] || { label: p.tier || '—', cls: 'badge-gray', priceText: p => `$${p.price}` };
      const revenue = p.unitsSold * p.price;
      const isFree  = p.price === 0;
      const valText = p.status === 'not-built' ? 'NOT BUILT'
                    : p.status === 'paused'     ? 'PAUSED'
                    : isFree                    ? (p.unitsSold > 0 ? `${p.unitsSold} downloaded` : 'READY')
                    : revenue > 0               ? `$${revenue.toLocaleString()} (${p.unitsSold} sold)`
                    :                             '$0';
      const valCls  = revenue > 0 || (isFree && p.unitsSold > 0) ? 'green' : p.status !== 'active' ? 'dim' : '';
      return `<div class="stat-row lam-product-row">
        <span class="stat-label">${escHtml(p.name)}</span>
        <span style="display:flex;align-items:center;gap:6px;margin-left:auto">
          <span class="badge ${meta.cls}" style="font-size:9px">${meta.label}</span>
          <span class="stat-val ${valCls}" style="min-width:80px;text-align:right">${valText}</span>
        </span>
      </div>`;
    }).join('');
  }

  // Units sold and next product from state
  const soldEl = document.getElementById('lamStatsSold');
  if (soldEl) soldEl.textContent = lam.unitsSold != null ? lam.unitsSold : '—';
  const nextEl = document.getElementById('lamNextProduct');
  if (nextEl) nextEl.textContent = lam.nextProduct || '—';

  // Blockers from state
  renderBlockerList('lamBlockerList', lam.blockers);

  // Agent registry — clickable rows with transition support
  renderAgentRegistry('lam', 'lamAgentList', 'lam');

  // Recent activity
  renderRecentActivity('lam', 'lamRecentActivity');

  // Product queue
  const pqEl = document.getElementById('lamProductQueueHud');
  if (pqEl) {
    if (!queue.length) {
      pqEl.innerHTML = '<div class="hud-empty">No items in queue.</div>';
    } else {
      pqEl.innerHTML = queue.map((q, i) => `
        <div class="hud-list-item">
          <div class="hud-list-name" style="flex:1">${escHtml(q.title||'Item')}</div>
          <span class="badge ${q.status==='done'?'badge-green':'badge-amber'}">${escHtml(q.status||'pending')}</span>
          <button class="hud-btn-sm" onclick="removeProductItem(${i})" style="margin-left:6px">✕</button>
        </div>
      `).join('');
    }
  }
}

// ── WEALTH DATA ───────────────────────────────────────────────
function renderWealthData() {
  const w = appState?.wealth || {};

  // Net worth panel
  const tdEl = document.getElementById('wealthTotalDebt');
  const taEl = document.getElementById('wealthTotalAssets');
  const nwEl = document.getElementById('wealthNetWorth');
  if (tdEl) tdEl.textContent = '$' + (w.totalDebt || 0).toLocaleString('en-US', {minimumFractionDigits: 0});
  if (taEl) taEl.textContent = '$' + (w.totalAssets || 0).toLocaleString('en-US', {minimumFractionDigits: 2});
  if (nwEl) {
    const nw = w.netWorth || 0;
    nwEl.textContent = (nw < 0 ? '-$' : '$') + Math.abs(nw).toLocaleString('en-US', {minimumFractionDigits: 0});
  }

  // Debt list
  const debtEl = document.getElementById('wealthDebtList');
  if (debtEl) {
    const snowball = new Set((w.snowballOrder || []).map(s => s.account));
    const statusMap = {};
    (w.snowballOrder || []).forEach(s => { statusMap[s.account] = s.status; });

    const rows = (w.debt || []).map(d => {
      const st = statusMap[d.account];
      const badge = st === 'KILL TARGET #1' ? `<span class="badge badge-red" style="margin:0 6px">KILL #1</span>` :
                    st === 'Next'            ? `<span class="badge badge-amber" style="margin:0 6px">NEXT</span>` :
                    st === 'Queued'          ? `<span class="badge badge-gray" style="margin:0 6px">QUEUED</span>` : '';
      const isSb = snowball.has(d.account);
      return `<div class="stat-row${isSb ? ' snowball-row' : ''}">
        <span class="stat-label">${escHtml(d.account)}</span>
        ${badge}
        <span class="stat-val" style="margin-left:auto${d.balance === 0 ? ';color:var(--green)' : ''}">
          ${d.balance === 0 ? '✓ PAID' : '$' + d.balance.toLocaleString('en-US', {minimumFractionDigits: 0})}
        </span>
      </div>`;
    });
    const snowballItems = rows.filter((_, i) => snowball.has((w.debt || [])[i]?.account));
    const rest = rows.filter((_, i) => !snowball.has((w.debt || [])[i]?.account));
    debtEl.innerHTML = snowballItems.join('') +
      (rest.length ? `<div class="stat-divider"></div>${rest.join('')}` : '') +
      `<div class="stat-divider"></div>
       <div class="stat-row"><span class="stat-label"><strong>TOTAL DEBT</strong></span>
       <span class="stat-val" style="color:var(--red);margin-left:auto"><strong>$${(w.totalDebt||0).toLocaleString('en-US')}</strong></span></div>`;
  }

  // Credit scores
  const scoresEl = document.getElementById('wealthScores');
  if (scoresEl) {
    const scores = w.creditScores || {};
    const bureaus = [
      { key: 'experian', label: 'Experian (FICO)' },
      { key: 'transunion', label: 'TransUnion (VS)' },
      { key: 'equifax', label: 'Equifax (VS)' }
    ];
    scoresEl.innerHTML = bureaus.map(b => {
      const s = scores[b.key] || {};
      const delta = s.delta != null ? (s.delta > 0 ? ` <span style="color:var(--green)">+${s.delta}</span>` : ` <span style="color:var(--red)">${s.delta}</span>`) : '';
      return `<div class="stat-row">
        <span class="stat-label">${b.label}</span>
        <span class="stat-val gold">${s.score || '—'}${delta}</span>
      </div>`;
    }).join('') + `<div class="panel-note" style="margin-top:8px">${scores.equifax?.note || 'Log a new pull to update scores'}</div>`;
  }

  // Urgent deadlines panel (left column — live computed)
  const urgentEl = document.getElementById('wealthUrgentDeadlinesPanel');
  if (urgentEl) {
    const open = (w.urgentDeadlines || []).filter(d => !d.resolvedStatus);
    urgentEl.innerHTML = open.length
      ? open.map(d => deadlineRowHtml(d, false)).join('')
      : '<div class="hud-empty">No open deadlines.</div>';
  }

  // Deadlines / disputes (dispute status panel — live computed)
  const deadlinesEl = document.getElementById('wealthDeadlines');
  if (deadlinesEl) {
    const dl = w.urgentDeadlines || [];
    if (!dl.length) {
      deadlinesEl.innerHTML = '<div class="hud-empty">No active deadlines.</div>';
    } else {
      deadlinesEl.innerHTML = dl.map(d => deadlineRowHtml(d, d.resolvedStatus)).join('');
    }

    // Populate dispute select
    const sel = document.getElementById('disputeLabel');
    if (sel) {
      const unresolved = dl.filter(d => !d.resolvedStatus);
      sel.innerHTML = '<option value="">— select —</option>' +
        unresolved.map(d => `<option value="${escHtml(d.label)}">${escHtml(d.label)}</option>`).join('');
    }
  }

  // Populate payment account select
  const acctSel = document.getElementById('paymentAccount');
  if (acctSel) {
    const debt = (w.debt || []).filter(d => d.balance > 0);
    acctSel.innerHTML = '<option value="">— select account —</option>' +
      debt.map(d => `<option value="${escHtml(d.account)}">${escHtml(d.account)} ($${d.balance.toLocaleString('en-US')})</option>`).join('');
  }

  // Recent activity
  renderRecentActivity('wealth', 'wealthRecentActivity');
}

function statusBadge(status) {
  const map = {
    'ACTIVE': 'badge-green', 'ON-DEMAND': 'badge-blue', 'WEBHOOK-ONLY': 'badge-blue',
    'PAUSED': 'badge-amber', 'FROZEN': 'badge-red', 'RETIRED': 'badge-gray',
    'SAVED': 'badge-gray'
  };
  return map[status] || 'badge-gray';
}

// ── LIFE OS DATA ──────────────────────────────────────────────
function renderLifeOSData() {
  const lo = appState?.lifeOS || {};
  const body = lo.body || {};

  // Countdown — days to Sept 1 (already computed in updateCountdowns, re-run here for safety)
  const today = new Date(); today.setHours(0,0,0,0);
  const sept1 = new Date('2026-09-01'); sept1.setHours(0,0,0,0);
  const days = Math.ceil((sept1 - today) / 86400000);

  const daysEl = document.getElementById('daysToQuit');
  if (daysEl) daysEl.textContent = days;

  const kdQuit = document.getElementById('kdQuitW2');
  const kdWeight = document.getElementById('kdWeightGoal');
  if (kdQuit) kdQuit.textContent = `${days} days`;
  if (kdWeight) kdWeight.textContent = `${days} days`;

  const sept9 = new Date('2026-09-09'); sept9.setHours(0,0,0,0);
  const daysBd = Math.ceil((sept9 - today) / 86400000);
  const kdBd = document.getElementById('kdBirthday');
  if (kdBd) kdBd.textContent = `${daysBd} days`;

  // Weight stats
  const lbs = body.lbsToGoal ?? (body.currentWeight ? body.currentWeight - (body.goalWeight || 200) : null);
  const lbsEl = document.getElementById('lbsToGoal');
  if (lbsEl) lbsEl.textContent = lbs != null ? Math.round(lbs) : '—';

  const curEl = document.getElementById('weightCurrent');
  if (curEl) curEl.textContent = body.currentWeight ? `${body.currentWeight} lbs` : '— lbs';

  const rangeEl = document.getElementById('weightRange');
  if (rangeEl) rangeEl.textContent = `${body.currentWeight || '—'} → ${body.goalWeight || 200} lbs`;

  const statusEl = document.getElementById('weightStatus');
  if (statusEl) {
    statusEl.textContent = body.status || '—';
    statusEl.className = 'countdown-hud-num ' + (body.status === 'ON TRACK' ? 'green' : body.status === 'BEHIND' ? 'red' : '');
  }

  // Weight log — last 5 entries descending
  const logEl = document.getElementById('weightLogList');
  if (logEl) {
    const log = [...(lo.weightLog || [])].sort((a, b) => b.date.localeCompare(a.date)).slice(0, 5);
    if (!log.length) {
      logEl.innerHTML = '<div class="hud-empty">No entries yet.</div>';
    } else {
      logEl.innerHTML = log.map(e => `
        <div class="stat-row">
          <span class="stat-label">${fmtDate(e.date)}</span>
          <span class="stat-val">${e.weight} lbs</span>
        </div>`).join('');
    }
  }

  // Non-negotiables — reflect today's check-in
  const todayStr = today.toISOString().slice(0, 10);
  const checkins = lo.dailyCheckins || [];
  const todayCheckin = checkins.find(c => c.date === todayStr);
  const completed = new Set(todayCheckin?.completed || []);
  const nns = lo.nonNegotiables || ['Bible', 'Workout', 'Business'];
  nns.forEach(item => {
    const cb = document.getElementById(`nn-${item}`);
    if (cb) cb.checked = completed.has(item);
  });
  const ciDateEl = document.getElementById('lifeosCheckinDate');
  if (ciDateEl) ciDateEl.textContent = todayCheckin
    ? `${completed.size}/${nns.length} completed today`
    : 'No check-in logged today';

  // Daily protocol from state
  const protoEl = document.getElementById('lifeosProtocol');
  if (protoEl && lo.dailyProtocol?.length) {
    protoEl.innerHTML = lo.dailyProtocol.map(p => {
      const parts = p.split(' — ');
      const time = parts[0].replace('AM','').replace('PM','').replace(':00','').trim();
      const act = parts.slice(1).join(' — ') || p;
      return `<div class="proto-row"><span class="proto-time">${escHtml(time)}</span><span class="proto-act">${escHtml(act)}</span></div>`;
    }).join('');
  }

  // Weekly scoreboard — most recent entry
  const scoreboard = [...(lo.weeklyScoreboard || [])].sort((a, b) => b.weekOf?.localeCompare(a.weekOf || '') || 0);
  const latest = scoreboard[0];
  const weekOfEl = document.getElementById('scoreboardWeekOf');
  if (weekOfEl) weekOfEl.textContent = latest ? `Week of ${fmtDate(latest.weekOf)}` : 'No entry yet';
  ['body', 'discipline', 'social', 'wins', 'focus'].forEach(f => {
    const el = document.getElementById(`sb-${f}`);
    if (el) el.textContent = latest?.[f] != null ? latest[f] : '—';
  });

  // Recent activity
  renderRecentActivity('lifeos', 'lifeosRecentActivity');
}

// ── LIFE OS SUBMIT HANDLERS ───────────────────────────────────
async function submitLogWeight() {
  if (isSubmitting) return;
  const weight = parseFloat(document.getElementById('weightEntry')?.value);
  const date = document.getElementById('weightDate')?.value || new Date().toISOString().slice(0,10);
  if (!weight || isNaN(weight)) { showToast('Enter a valid weight.', 'error'); return; }
  isSubmitting = true;
  try {
    const res = await apiPost('/api/lifeos/weight', { weight, date });
    closeModal(null, 'modal-log-weight');
    document.getElementById('weightEntry').value = '';
    await loadState();
    showToast(`Weight logged: ${res.weight} lbs · ${res.lbsToGoal} lbs to goal · ${res.status}`, 'success');
  } catch(e) {
    showToast(e.message || 'Failed to log weight.', 'error');
  } finally {
    isSubmitting = false;
  }
}

async function submitCheckin() {
  if (isSubmitting) return;
  const date = document.getElementById('checkinDate')?.value || new Date().toISOString().slice(0,10);
  const items = ['Bible', 'Workout', 'Business'];
  const completed = items.filter(item => document.getElementById(`ci-${item}`)?.checked);
  isSubmitting = true;
  try {
    await apiPost('/api/lifeos/checkin', { date, completed });
    closeModal(null, 'modal-checkin');
    await loadState();
    showToast(`Check-in saved: ${completed.length}/3 completed`, 'success');
  } catch(e) {
    showToast(e.message || 'Failed to save check-in.', 'error');
  } finally {
    isSubmitting = false;
  }
}

async function submitLogWeek() {
  if (isSubmitting) return;
  const weekOf = document.getElementById('weekOf')?.value;
  if (!weekOf) { showToast('Select a week-of date.', 'error'); return; }
  const fields = ['body', 'discipline', 'social', 'wins', 'focus'];
  const scores = {};
  for (const f of fields) {
    const val = document.getElementById(`sb-${f}-input`)?.value;
    if (val !== '' && val != null) scores[f] = parseInt(val, 10);
  }
  const note = document.getElementById('sb-note-input')?.value?.trim() || '';
  if (!Object.keys(scores).length) { showToast('Enter at least one score.', 'error'); return; }
  isSubmitting = true;
  try {
    await apiPost('/api/lifeos/scoreboard', { weekOf, ...scores, note });
    closeModal(null, 'modal-log-week');
    document.getElementById('weekOf').value = '';
    fields.forEach(f => { const el = document.getElementById(`sb-${f}-input`); if (el) el.value = ''; });
    document.getElementById('sb-note-input').value = '';
    await loadState();
    showToast(`Week of ${fmtDate(weekOf)} logged.`, 'success');
  } catch(e) {
    showToast(e.message || 'Failed to save scoreboard.', 'error');
  } finally {
    isSubmitting = false;
  }
}

// ── NOTES ─────────────────────────────────────────────────────
function loadNotes() {
  const map = [
    ['mc', 'mcNotes'], ['lam', 'lamNotes'], ['lifeOS', 'lifeosNotes'], ['wealth', 'wealthNotes']
  ];
  map.forEach(([key, id]) => {
    const el = document.getElementById(id);
    if (el && appState?.[key]?.notes) el.value = appState[key].notes;
  });
}

async function saveNotes(workspace) {
  const map = { mc:'mc', lam:'lam', lifeos:'lifeOS', wealth:'wealth' };
  const elMap = { mc:'mcNotes', lam:'lamNotes', lifeos:'lifeosNotes', wealth:'wealthNotes' };
  const key = map[workspace];
  const val = document.getElementById(elMap[workspace])?.value || '';
  await fetch('/api/state', {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ [key]: { notes: val } })
  });
}

// ── QUICK ADDS ────────────────────────────────────────────────
function openAddCall() { openModal('modal-add-call'); }
function openAddFollowUp() { openModal('modal-add-followup'); }

async function apiPost(url, body) {
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body)
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || `Server ${res.status}`);
  return data;
}

async function apiPatch(url, body) {
  const res = await fetch(url, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body)
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || `Server ${res.status}`);
  return data;
}

async function submitAddCall() {
  if (isSubmitting) return;
  const name      = document.getElementById('callName').value.trim();
  const ghlStage  = document.getElementById('callGhlStage').value;
  const value     = parseFloat(document.getElementById('callValue').value) || 0;
  const nextAction = document.getElementById('callNextAction').value.trim();
  if (!name) { showToast('Lead name required.', 'error'); return; }
  const existing = (appState?.mc?.callList || []).find(c => c.name.toLowerCase() === name.toLowerCase());
  if (existing) { showToast(`${name} is already in the pipeline.`, 'warn'); return; }
  isSubmitting = true;
  try {
    const newLead = {
      name, ghlStage, ghlSyncStatus: 'manual', value,
      lastContactDate: null, nextActionDate: null,
      nextAction: nextAction || stageMeta(ghlStage).nextActionHint || '',
      alfredNote: '',
    };
    const calls = [...(appState?.mc?.callList || []), newLead];
    await apiPatch('/api/state', { mc: { callList: calls } });
    closeModal(null, 'modal-add-call');
    document.getElementById('callName').value = '';
    document.getElementById('callValue').value = '';
    document.getElementById('callNextAction').value = '';
    await loadState();
    showToast(`${name} added — ${ghlStage}.`, 'success');
  } catch (e) { showToast(e.message, 'error'); }
  finally { isSubmitting = false; }
}

async function submitUpdateLead() {
  if (isSubmitting) return;
  const name = document.getElementById('updateLeadName').value;
  if (!name) { showToast('Select a lead.', 'error'); return; }
  const fields = {};
  const stage = document.getElementById('updateLeadStage').value;
  const lastContact = document.getElementById('updateLeadLastContact').value;
  const nextDate = document.getElementById('updateLeadNextDate').value;
  const nextAction = document.getElementById('updateLeadNextAction').value.trim();
  const value = document.getElementById('updateLeadValue').value;
  const note = document.getElementById('updateLeadNote').value.trim();
  if (stage)       fields.ghlStage = stage;
  if (lastContact) fields.lastContactDate = lastContact;
  if (nextDate)    fields.nextActionDate = nextDate;
  if (nextAction)  fields.nextAction = nextAction;
  if (value !== '' && !isNaN(parseFloat(value))) fields.value = parseFloat(value);
  if (note)        fields.alfredNote = note;
  if (!Object.keys(fields).length) { showToast('No changes entered.', 'warn'); return; }
  isSubmitting = true;
  try {
    const res = await fetch('/api/mc/lead', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name, ...fields }),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || `Server ${res.status}`);
    closeModal(null, 'modal-update-lead');
    document.getElementById('updateLeadStage').value = '';
    document.getElementById('updateLeadLastContact').value = '';
    document.getElementById('updateLeadNextDate').value = '';
    document.getElementById('updateLeadNextAction').value = '';
    document.getElementById('updateLeadValue').value = '';
    document.getElementById('updateLeadNote').value = '';
    await loadState();
    showToast(`${name} updated — ${Object.keys(fields).join(', ')}.`, 'success');
  } catch (e) { showToast(e.message, 'error'); }
  finally { isSubmitting = false; }
}

// Pre-fill chat with Maya/Atlas context for a specific lead
function suggestMaya(leadName) {
  const lead = (appState?.mc?.callList || []).find(l => l.name === leadName);
  if (!lead) return;
  const stage = lead.ghlStage || 'unknown stage';
  const hint = `Maya — draft outreach for ${leadName} (${stage}). Last contact: ${lead.lastContactDate || 'not recorded'}. Next action: ${lead.nextAction || 'none set'}.`;
  const input = document.getElementById('chatInput');
  if (input) { input.value = hint; input.focus(); }
  if (currentWorkspace !== 'mc') enterWorkspace('mc');
  showToast(`Maya context loaded for ${leadName}`, 'success');
}

function suggestAtlas(leadName) {
  const lead = (appState?.mc?.callList || []).find(l => l.name === leadName);
  if (!lead) return;
  const hint = `Atlas — I'm on a call with ${leadName} (${lead.ghlStage || 'unknown stage'}). ${lead.alfredNote ? 'Note: ' + lead.alfredNote + '.' : ''} Recommend carrier and script line.`;
  const input = document.getElementById('chatInput');
  if (input) { input.value = hint; input.focus(); }
  if (currentWorkspace !== 'mc') enterWorkspace('mc');
  showToast(`Atlas context loaded for ${leadName}`, 'success');
}

function openAddProduct() {
  const title = prompt('Production item:');
  if (!title) return;
  const queue = [...(appState?.lam?.productQueue || []), { title, status: 'pending' }];
  fetch('/api/state', {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ lam: { productQueue: queue } })
  }).then(() => loadState());
}

async function submitLogClose() {
  if (isSubmitting) return;
  const contact = document.getElementById('closeContact').value.trim();
  const premium = parseFloat(document.getElementById('closePremium').value);
  if (!contact) { showToast('Contact name required.', 'error'); return; }
  if (!premium || premium <= 0) { showToast('Premium must be greater than $0.', 'error'); return; }
  isSubmitting = true;
  try {
    const data = await apiPost('/api/mc/close', { contact, premium });
    closeModal(null, 'modal-log-close');
    document.getElementById('closeContact').value = '';
    document.getElementById('closePremium').value = '';
    await loadState();
    showToast(`Close logged: ${contact} · $${premium.toLocaleString()} · Revenue MTD: $${data.revenueMTD.toLocaleString()}`, 'success');
  } catch (e) { showToast(e.message, 'error'); }
  finally { isSubmitting = false; }
}

async function submitLogPayment() {
  if (isSubmitting) return;
  const account = document.getElementById('paymentAccount').value;
  const amount = parseFloat(document.getElementById('paymentAmount').value);
  if (!account) { showToast('Select an account.', 'error'); return; }
  if (!amount || amount <= 0) { showToast('Payment amount must be greater than $0.', 'error'); return; }
  isSubmitting = true;
  try {
    const data = await apiPost('/api/wealth/payment', { account, amount });
    closeModal(null, 'modal-log-payment');
    document.getElementById('paymentAmount').value = '';
    await loadState();
    const balance = data.newBalance === 0 ? '✓ PAID OFF' : `Balance: $${data.newBalance.toLocaleString()}`;
    showToast(`$${amount.toLocaleString()} logged for ${account} · ${balance}`, 'success');
  } catch (e) { showToast(e.message, 'error'); }
  finally { isSubmitting = false; }
}

async function submitLogScore() {
  if (isSubmitting) return;
  const bureau = document.getElementById('scoreBureau').value;
  const score = parseInt(document.getElementById('scoreValue').value);
  const model = document.getElementById('scoreModel').value;
  const asOf = document.getElementById('scoreAsOf').value.trim() || new Date().toLocaleDateString('en-US', {month:'long', year:'numeric'});
  if (!score || score < 300 || score > 850) { showToast('Score must be between 300 and 850.', 'error'); return; }
  isSubmitting = true;
  try {
    const data = await apiPost('/api/wealth/score', { bureau, score, model, asOf });
    closeModal(null, 'modal-log-score');
    document.getElementById('scoreValue').value = '';
    await loadState();
    const delta = data.delta != null ? (data.delta >= 0 ? ` (+${data.delta})` : ` (${data.delta})`) : '';
    showToast(`${bureau.charAt(0).toUpperCase() + bureau.slice(1)}: ${score}${delta} logged.`, 'success');
  } catch (e) { showToast(e.message, 'error'); }
  finally { isSubmitting = false; }
}

async function submitUpdateDispute() {
  if (isSubmitting) return;
  const label = document.getElementById('disputeLabel').value;
  const status = document.getElementById('disputeStatus').value;
  const note = document.getElementById('disputeNote').value.trim();
  if (!label) { showToast('Select a dispute item.', 'error'); return; }
  isSubmitting = true;
  try {
    await apiPost('/api/wealth/dispute', { label, status, note });
    closeModal(null, 'modal-update-dispute');
    document.getElementById('disputeNote').value = '';
    await loadState();
    showToast(`Dispute updated: ${status}${note ? ' · ' + note : ''}`, 'success');
  } catch (e) { showToast(e.message, 'error'); }
  finally { isSubmitting = false; }
}

async function removeCall(i) {
  const calls = [...(appState?.mc?.callList || [])];
  calls.splice(i, 1);
  await fetch('/api/state', { method: 'PATCH', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ mc: { callList: calls } }) });
  await loadState();
}

async function removeProductItem(i) {
  const q = [...(appState?.lam?.productQueue || [])];
  q.splice(i, 1);
  await fetch('/api/state', { method: 'PATCH', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ lam: { productQueue: q } }) });
  await loadState();
}

// ── AGENT ACTIVATION ──────────────────────────────────────────

const AGENT_VALID_TRANSITIONS = {
  'ACTIVE':       ['ON-DEMAND', 'PAUSED'],
  'ON-DEMAND':    ['PAUSED', 'ACTIVE'],
  'PAUSED':       ['ON-DEMAND', 'ACTIVE'],
  'SAVED':        ['ON-DEMAND', 'PAUSED'],
  'FROZEN':       ['PAUSED'],
  'WEBHOOK-ONLY': [],
  'RETIRED':      [],
  'MONITORING':   ['ON-DEMAND'],
};

const AGENT_REQUIRES_APPROVAL = new Set([
  'ON-DEMAND→ACTIVE', 'PAUSED→ACTIVE', 'SAVED→ACTIVE',
  'MONITORING→ACTIVE', 'FROZEN→PAUSED'
]);

const AGENT_STATE_LABELS = {
  'ACTIVE':       { badge: 'badge-green', label: 'ACTIVE', desc: 'Running automatically' },
  'ON-DEMAND':    { badge: 'badge-blue',  label: 'ON-DEMAND', desc: 'Manual trigger only' },
  'WEBHOOK-ONLY': { badge: 'badge-blue',  label: 'WEBHOOK-ONLY', desc: 'External trigger only — no manual control' },
  'PAUSED':       { badge: 'badge-amber', label: 'PAUSED', desc: 'Stopped — condition pending' },
  'SAVED':        { badge: 'badge-amber', label: 'SAVED', desc: 'Defined but never activated' },
  'FROZEN':       { badge: 'badge-red',   label: 'FROZEN', desc: 'Blocked — dependency unresolved' },
  'RETIRED':      { badge: 'badge-gray',  label: 'RETIRED', desc: 'Permanently decommissioned' },
  'MONITORING':   { badge: 'badge-gray',  label: 'MONITORING', desc: 'Passive — no execution' },
};

const AGENT_TRANSITION_LABELS = {
  'ACTIVE':    { label: 'SET ACTIVE',    desc: 'Requires approval — will auto-run on schedule', warn: true },
  'ON-DEMAND': { label: 'SET ON-DEMAND', desc: 'Manual trigger only — no auto-runs', warn: false },
  'PAUSED':    { label: 'PAUSE',         desc: 'Stop execution — can be re-enabled later', warn: false },
};

const AGENT_TERMINAL_REASON = {
  'RETIRED':      'Permanently decommissioned. No transitions permitted.',
  'WEBHOOK-ONLY': 'Managed by external webhook. No manual control permitted.',
};

function openAgentModal(workspace, agentName) {
  const wsKey = { mc: 'mc', lam: 'lam', lifeos: 'lifeOS', wealth: 'wealth' }[workspace];
  const agents = appState?.[wsKey]?.agents || [];
  const agent = agents.find(a => a.name === agentName);
  if (!agent) return;

  const state = (agent.status || 'FROZEN').toUpperCase();
  const info = AGENT_STATE_LABELS[state] || { badge: 'badge-gray', label: state, desc: '' };
  const pending = agent.pendingActivation;
  const history = agent.stateHistory || [];

  // Populate modal fields
  document.getElementById('agentModalName').textContent = agentName;
  document.getElementById('agentModalWs').textContent = workspace.toUpperCase();
  document.getElementById('agentModalCurrentBadge').className = `badge ${info.badge}`;
  document.getElementById('agentModalCurrentBadge').textContent = info.label;
  document.getElementById('agentModalPending').style.display = pending ? 'block' : 'none';
  document.getElementById('agentModalWorkspace').value = workspace;
  document.getElementById('agentModalTargetState').value = '';
  document.getElementById('agentTransitionNote').value = '';
  document.getElementById('agentNoteRow').style.display = 'none';
  document.getElementById('agentModalActions').style.display = 'none';

  // Reason / note
  const reasonEl = document.getElementById('agentModalReason');
  const terminalReason = AGENT_TERMINAL_REASON[state];
  if (terminalReason) {
    reasonEl.innerHTML = `<div class="agent-reason-locked">${terminalReason}</div>`;
  } else if (agent.note) {
    const label = state === 'FROZEN' ? 'BLOCKED:' : state === 'PAUSED' ? 'CONDITION:' : 'NOTE:';
    reasonEl.innerHTML = `<div class="agent-reason-note"><span class="agent-reason-label">${label}</span> ${escHtml(agent.note)}</div>`;
  } else {
    reasonEl.innerHTML = '';
  }

  // State history
  const histEl = document.getElementById('agentModalHistory');
  if (history.length) {
    histEl.innerHTML = `<div class="agent-hist-label">RECENT CHANGES</div>` +
      history.map(h => `<div class="agent-hist-row">
        <span class="agent-hist-states">${h.from} → ${h.to}</span>
        <span class="agent-hist-date">${fmtDate(h.at)}</span>
        ${h.note ? `<span class="agent-hist-note">${escHtml(h.note)}</span>` : ''}
      </div>`).join('');
  } else {
    histEl.innerHTML = '';
  }

  // Transition buttons
  const transEl = document.getElementById('agentModalTransitions');
  const allowed = (AGENT_VALID_TRANSITIONS[state] || []);

  if (pending) {
    transEl.innerHTML = `<div class="agent-transition-pending">Pending approval to become <strong>${pending.toState}</strong>.<br>Approve or reject in the Approvals screen.</div>`;
  } else if (!allowed.length) {
    transEl.innerHTML = `<div class="agent-transition-locked">No transitions available from this state.</div>`;
  } else {
    transEl.innerHTML = `<div class="form-label" style="margin-bottom:8px">AVAILABLE TRANSITIONS</div>` +
      allowed.map(toState => {
        const tl = AGENT_TRANSITION_LABELS[toState] || { label: `SET ${toState}`, desc: '', warn: false };
        const needsApproval = AGENT_REQUIRES_APPROVAL.has(`${state}→${toState}`);
        return `<div class="agent-transition-btn ${tl.warn ? 'agent-transition-warn' : ''}" onclick="selectAgentTransition('${toState}', ${state === 'FROZEN'}, ${needsApproval})">
          <div class="agent-transition-btn-label">${tl.label}${needsApproval ? ' ↗' : ''}</div>
          <div class="agent-transition-btn-desc">${tl.desc}${needsApproval ? ' — routes to Approvals' : ''}</div>
        </div>`;
      }).join('');
  }

  openModal('modal-agent-transition');
}

function selectAgentTransition(toState, noteRequired, needsApproval) {
  document.getElementById('agentModalTargetState').value = toState;
  document.getElementById('agentModalActions').style.display = 'flex';

  const noteRow = document.getElementById('agentNoteRow');
  const noteLabel = document.getElementById('agentNoteLabel');
  noteRow.style.display = 'block';
  if (noteRequired) {
    noteLabel.textContent = 'RESOLUTION NOTE (required — what condition was resolved?)';
    document.getElementById('agentTransitionNote').placeholder = 'e.g. 3-call/24hr FL law update applied';
  } else if (needsApproval) {
    noteLabel.textContent = 'REASON FOR ACTIVATION (required)';
    document.getElementById('agentTransitionNote').placeholder = 'e.g. Revenue target hit, enabling for warm market phase';
  } else {
    noteLabel.textContent = 'NOTE (optional)';
    document.getElementById('agentTransitionNote').placeholder = 'Optional context for this change';
  }

  const btn = document.getElementById('agentConfirmBtn');
  const tl = AGENT_TRANSITION_LABELS[toState] || { label: toState };
  btn.textContent = needsApproval ? 'REQUEST ACTIVATION' : `CONFIRM — ${tl.label}`;
  btn.className = needsApproval ? 'hud-btn badge-red' : 'hud-btn gold';
}

async function submitAgentTransition() {
  if (isSubmitting) return;
  const workspace = document.getElementById('agentModalWorkspace').value;
  const agentName = document.getElementById('agentModalName').textContent;
  const toState = document.getElementById('agentModalTargetState').value;
  const note = document.getElementById('agentTransitionNote').value.trim();

  if (!toState) { showToast('Select a transition first.', 'error'); return; }

  const wsKey = { mc: 'mc', lam: 'lam', lifeos: 'lifeOS', wealth: 'wealth' }[workspace];
  const agents = appState?.[wsKey]?.agents || [];
  const agent = agents.find(a => a.name === agentName);
  const fromState = agent?.status?.toUpperCase() || '';
  const isFrozen = fromState === 'FROZEN';
  const needsApproval = AGENT_REQUIRES_APPROVAL.has(`${fromState}→${toState}`);

  if ((isFrozen || needsApproval) && !note) {
    showToast('A note is required for this transition.', 'error');
    document.getElementById('agentTransitionNote').focus();
    return;
  }

  isSubmitting = true;
  try {
    const data = await apiPost('/api/agents/transition', { workspace, agentName, toState, note });
    closeModal(null, 'modal-agent-transition');
    await loadState();
    if (data.requiresApproval) {
      showToast(`Activation request submitted for ${agentName}. Approve in the Approvals screen.`, 'warn');
    } else {
      showToast(`${agentName} → ${toState}`, 'success');
    }
  } catch (e) { showToast(e.message, 'error'); }
  finally { isSubmitting = false; }
}

function renderAgentRegistry(wsKey, containerId, workspace) {
  const el = document.getElementById(containerId);
  if (!el) return;
  const agents = appState?.[wsKey]?.agents || [];
  if (!agents.length) { el.innerHTML = '<div class="hud-empty">No agents loaded.</div>'; return; }

  const triadNames = new Set(['Maya — COO', 'Atlas — Sales Assistant', 'Brooks — CFO']);
  const list = workspace === 'mc' ? agents.filter(a => !triadNames.has(a.name)) : agents;

  el.innerHTML = list.map(a => {
    const st = (a.status || '').toUpperCase();
    const info = AGENT_STATE_LABELS[st] || { badge: 'badge-gray', label: st };
    const isLocked = st === 'RETIRED' || st === 'WEBHOOK-ONLY';
    const hasPending = !!a.pendingActivation;
    return `<div class="agent-registry-row ${isLocked ? 'agent-row-locked' : ''}" onclick="${isLocked ? '' : `openAgentModal('${workspace}', ${JSON.stringify(a.name)})`}">
      <div class="agent-registry-left">
        <span class="agent-registry-name">${escHtml(a.name)}</span>
        ${a.note ? `<span class="agent-registry-note">${escHtml(a.note)}</span>` : ''}
      </div>
      <div class="agent-registry-right">
        ${hasPending ? '<span class="agent-pending-dot" title="Pending approval">⏳</span>' : ''}
        <span class="badge ${info.badge}">${info.label}</span>
      </div>
    </div>`;
  }).join('');
}

// ── JARVIS HUD CHROME INJECTION ───────────────────────────────
// Injects atmosphere layers and per-panel chrome elements after DOM is ready.
function initHudChrome() {
  const app = document.getElementById('app');
  if (!app) return;

  // Make scrollable columns keyboard-reachable (axe: scrollable-region-focusable)
  document.querySelectorAll('.hud-col').forEach(el => {
    if (!el.hasAttribute('tabindex')) el.setAttribute('tabindex', '0');
  });

  // Global layers (inserted as first children so they sit below everything)
  if (!document.querySelector('.hud-atmosphere')) {
    ['hud-atmosphere', 'hud-scanlines'].forEach(cls => {
      const el = document.createElement('div');
      el.className = cls;
      el.setAttribute('aria-hidden', 'true');
      app.insertBefore(el, app.firstChild);
    });
  }

  // Per-panel chrome: TR+BL corner brackets + horizontal sweep line
  let delay = 0;
  document.querySelectorAll('.hud-panel').forEach(panel => {
    if (panel.querySelector('.panel-chrome')) return; // already done

    const chrome = document.createElement('div');
    chrome.className = 'panel-chrome';
    chrome.setAttribute('aria-hidden', 'true');
    panel.appendChild(chrome);

    const sweep = document.createElement('div');
    sweep.className = 'panel-sweep';
    sweep.setAttribute('aria-hidden', 'true');
    sweep.style.setProperty('--sweep-delay', `${delay.toFixed(1)}s`);
    sweep.style.setProperty('--sweep-dur',   `${(9 + (delay % 6)).toFixed(1)}s`);
    panel.appendChild(sweep);

    delay += 1.4;
  });
}

// ── BOOT ──────────────────────────────────────────────────────
init();
initHudChrome();
