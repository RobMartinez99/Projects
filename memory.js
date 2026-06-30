import { readFileSync, writeFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __dir = dirname(fileURLToPath(import.meta.url));
const DATA = join(__dir, 'data');

function read(file) {
  try { return JSON.parse(readFileSync(join(DATA, file), 'utf8')); }
  catch { return {}; }
}

function write(file, data) {
  writeFileSync(join(DATA, file), JSON.stringify(data, null, 2));
}

export function getMemory() { return read('memory.json'); }
export function getApprovals() { return read('approvals.json'); }
export function getState() { return read('state.json'); }
export function getAudit() { return read('audit.json'); }

export function updateMemory(facts) {
  const m = getMemory();
  m.facts = facts;
  m.updated = new Date().toISOString().split('T')[0];
  write('memory.json', m);
}

export function addMemoryFact(fact) {
  const m = getMemory();
  if (!m.facts) m.facts = [];
  m.facts.push(fact);
  m.updated = new Date().toISOString().split('T')[0];
  write('memory.json', m);
}

export function updateState(patch) {
  const s = getState();
  const merged = deepMerge(s, patch);
  write('state.json', merged);
  return merged;
}

export function addApproval(item) {
  const a = getApprovals();
  if (!a.queue) a.queue = [];
  a.queue.push({ ...item, id: Date.now().toString(), createdAt: new Date().toISOString(), status: 'pending' });
  write('approvals.json', a);
}

export function resolveApproval(id, status) {
  const a = getApprovals();
  const item = a.queue.find(x => x.id === id);
  if (item) { item.status = status; item.resolvedAt = new Date().toISOString(); }
  write('approvals.json', a);
  return item;
}

export function logAudit(entry) {
  const a = getAudit();
  if (!a.log) a.log = [];
  a.log.unshift({ ...entry, at: new Date().toISOString() });
  if (a.log.length > 500) a.log = a.log.slice(0, 500);
  write('audit.json', a);
}

function deepMerge(target, source) {
  const out = { ...target };
  for (const k of Object.keys(source)) {
    if (source[k] && typeof source[k] === 'object' && !Array.isArray(source[k])) {
      out[k] = deepMerge(target[k] || {}, source[k]);
    } else {
      out[k] = source[k];
    }
  }
  return out;
}
