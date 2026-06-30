import 'dotenv/config';
import express from 'express';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { streamChat } from './brain.js';
import {
  getMemory, getApprovals, getState,
  updateMemory, addMemoryFact, updateState,
  addApproval, resolveApproval, logAudit
} from './memory.js';

const __dir = dirname(fileURLToPath(import.meta.url));
const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json());
app.use(express.static(join(__dir, 'public')));

// ── CHAT (streaming SSE) ──────────────────────────────────────
app.post('/api/chat', async (req, res) => {
  const { messages } = req.body;
  if (!messages?.length) return res.status(400).json({ error: 'messages required' });

  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');

  try {
    await streamChat(
      messages,
      (delta) => {
        res.write(`data: ${JSON.stringify({ type: 'delta', text: delta })}\n\n`);
      },
      (finalMsg, err) => {
        if (err) {
          res.write(`data: ${JSON.stringify({ type: 'error', text: err.message })}\n\n`);
        } else {
          res.write(`data: ${JSON.stringify({ type: 'done' })}\n\n`);
          logAudit({ type: 'chat', inputTokens: finalMsg?.usage?.input_tokens, outputTokens: finalMsg?.usage?.output_tokens });
        }
        res.end();
      }
    );
  } catch (e) {
    res.write(`data: ${JSON.stringify({ type: 'error', text: e.message })}\n\n`);
    res.end();
  }
});

// ── DASHBOARD STATE ───────────────────────────────────────────
app.get('/api/state', (req, res) => {
  const state = getState();
  const approvals = getApprovals();
  const memory = getMemory();
  res.json({ state, approvals: approvals.queue || [], memory });
});

app.patch('/api/state', (req, res) => {
  const updated = updateState(req.body);
  logAudit({ type: 'state_update', patch: Object.keys(req.body) });
  res.json(updated);
});

// ── MEMORY ────────────────────────────────────────────────────
app.get('/api/memory', (req, res) => res.json(getMemory()));

app.put('/api/memory', (req, res) => {
  const { facts } = req.body;
  if (!Array.isArray(facts)) return res.status(400).json({ error: 'facts must be array' });
  updateMemory(facts);
  logAudit({ type: 'memory_update', count: facts.length });
  res.json({ ok: true });
});

app.post('/api/memory/fact', (req, res) => {
  const { fact } = req.body;
  if (!fact) return res.status(400).json({ error: 'fact required' });
  addMemoryFact(fact);
  res.json({ ok: true });
});

// ── APPROVALS ─────────────────────────────────────────────────
app.get('/api/approvals', (req, res) => {
  const a = getApprovals();
  res.json(a.queue || []);
});

app.post('/api/approvals', (req, res) => {
  const { title, description, workspace, action } = req.body;
  addApproval({ title, description, workspace, action });
  logAudit({ type: 'approval_created', title });
  res.json({ ok: true });
});

app.post('/api/approvals/:id/approve', (req, res) => {
  const item = resolveApproval(req.params.id, 'approved');
  logAudit({ type: 'approval_resolved', id: req.params.id, status: 'approved', title: item?.title });
  res.json({ ok: true, item });
});

app.post('/api/approvals/:id/reject', (req, res) => {
  const item = resolveApproval(req.params.id, 'rejected');
  logAudit({ type: 'approval_resolved', id: req.params.id, status: 'rejected', title: item?.title });
  res.json({ ok: true, item });
});

// ── WORKSPACE QUICK UPDATES ───────────────────────────────────
app.post('/api/mc/call-list', (req, res) => {
  const { callList } = req.body;
  updateState({ martinezCapital: { callList } });
  res.json({ ok: true });
});

app.post('/api/mc/follow-up', (req, res) => {
  const { followUpQueue } = req.body;
  updateState({ martinezCapital: { followUpQueue } });
  res.json({ ok: true });
});

app.post('/api/lam/product-queue', (req, res) => {
  const { productQueue } = req.body;
  updateState({ livingAlphaMale: { productQueue } });
  res.json({ ok: true });
});

// ── START ─────────────────────────────────────────────────────
if (!process.env.ANTHROPIC_API_KEY) {
  console.warn('\n⚠  ANTHROPIC_API_KEY not set. Copy .env.example to .env and add your key.\n');
}

app.listen(PORT, () => {
  console.log(`\nAlfred is running → http://localhost:${PORT}\n`);
});
