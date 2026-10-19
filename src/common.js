/* Innovation Sprint Ledger: storage + sync layer. One self-contained page, no server, nothing to install.
 * One team = one folder of JSON files (see AGENTS.md). Two ways to keep it:
 *   folder : File System Access API (Chrome / Edge). Agents read and write the same files; the page polls them.
 *            Put the folder in OneDrive / Google Drive / Dropbox and teammates who connect it see each other's work.
 *   browser: localStorage, when no folder is connected (or in Safari / Firefox).
 * Teammates without a shared folder pass their work around as a file or pasted text (Share my work → Add a
 * teammate's work). Ids carry the author's name (F-ana-01), so merged work never collides.
 */
const LL = (() => {
  'use strict';
  const SCHEMA = 'innovation-sprint-ledger/1';
  const APP = 'innovation-sprint-ledger';
  const POLL_MS = 2500;

  // ---------- tiny utils ----------
  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => [...r.querySelectorAll(s)];
  function h(tag, attrs, ...kids) {
    const el = document.createElement(tag);
    if (attrs) for (const [k, v] of Object.entries(attrs)) {
      if (v == null || v === false) continue;
      if (k === 'class') el.className = v;
      else if (k === 'style' && typeof v === 'object') Object.assign(el.style, v);
      else if (k.startsWith('on') && typeof v === 'function') el.addEventListener(k.slice(2), v);
      else if (k === 'html') el.innerHTML = v;
      else if (k in el && typeof v !== 'string') el[k] = v;
      else el.setAttribute(k, v === true ? '' : v);
    }
    for (const k of kids.flat(Infinity)) {
      if (k == null || k === false) continue;
      el.append(k instanceof Node ? k : document.createTextNode(String(k)));
    }
    return el;
  }
  const today = () => { const d = new Date(); d.setMinutes(d.getMinutes() - d.getTimezoneOffset()); return d.toISOString().slice(0, 10); };
  const nowIso = () => new Date().toISOString();
  const debounce = (fn, ms) => { let t; return (...a) => { clearTimeout(t); t = setTimeout(() => fn(...a), ms); }; };
  const lsGet = (k, d = null) => { try { const v = localStorage.getItem(k); return v == null ? d : JSON.parse(v); } catch { return d; } };
  const lsSet = (k, v) => { try { localStorage.setItem(k, JSON.stringify(v)); return true; } catch { return false; } };
  const lsDel = (k) => { try { localStorage.removeItem(k); } catch {} };
  const fmtDate = (s) => { if (!s) return ''; const d = new Date(s.length === 10 ? s + 'T12:00:00' : s); return isNaN(d) ? s : d.toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' }); };
  const ago = (t) => { const s = Math.round((Date.now() - t) / 1000); if (s < 5) return 'just now'; if (s < 60) return s + 's ago'; const m = Math.round(s / 60); if (m < 60) return m + 'm ago'; return Math.round(m / 60) + 'h ago'; };
  const lines = (s) => String(s || '').split('\n').map(x => x.replace(/^\s*[-*•]\s*/, '').trim()).filter(Boolean);
  const clone = (o) => o == null ? o : JSON.parse(JSON.stringify(o));
  const isObj = (v) => v && typeof v === 'object' && !Array.isArray(v);

  function toast(msg, ms = 2600) {
    let box = $('.toasts'); if (!box) { box = h('div', { class: 'toasts' }); document.body.append(box); }
    const t = h('div', { class: 'toast' }, msg); box.append(t); setTimeout(() => t.remove(), ms);
  }
  function modal({ title, body, actions, wide }) {
    return new Promise((resolve) => {
      const scrim = h('div', { class: 'scrim open' });
      const close = (v) => { scrim.remove(); m.remove(); document.removeEventListener('keydown', key); resolve(v); };
      const key = (e) => { if (e.key === 'Escape') close(null); };
      const m = h('div', { class: 'modal' + (wide ? ' wide' : ''), role: 'dialog' }, h('div', { class: 'card' },
        h('h3', null, title), typeof body === 'string' ? h('p', { class: 'muted' }, body) : body,
        h('div', { class: 'actions' }, actions.map(a => h('button', { class: 'btn ' + (a.cls || ''), onclick: () => close(typeof a.value === 'function' ? a.value() : a.value) }, a.label)))));
      scrim.addEventListener('click', () => close(null));
      document.addEventListener('keydown', key);
      document.body.append(scrim, m);
      const first = m.querySelector('textarea, input'); if (first) setTimeout(() => first.focus(), 30);
    });
  }
  async function copyText(text, what = 'Copied') {
    try { await navigator.clipboard.writeText(text); toast(what + ' to clipboard'); }
    catch {
      const ta = h('textarea', { style: { position: 'fixed', opacity: 0 } }); ta.value = text; document.body.append(ta); ta.select();
      try { document.execCommand('copy'); toast(what + ' to clipboard'); } catch { toast('Copy failed. Select and copy manually.'); } ta.remove();
    }
  }
  function download(name, text, type = 'application/json') {
    const a = h('a', { href: URL.createObjectURL(new Blob([text], { type })), download: name });
    document.body.append(a); a.click(); a.remove();
  }

  // ---------- who is using this laptop ----------
  // Stored per browser, never in the ledger: it only decides whose name goes on new findings.
  const me = () => lsGet('isl:me', '');
  /** "Ana María" → "ana", "José" → "jose". Used in ids, so teammates never collide. */
  const personSlug = (name) => (String(name || '').trim().split(/\s+/)[0] || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9]/g, '').slice(0, 12) || 'team';
  const setMe = (name) => lsSet('isl:me', name || '');

  // ---------- IndexedDB (folder handle + browser-mode files) ----------
  let _db;
  function idb() {
    if (_db) return _db;
    _db = new Promise((res, rej) => {
      const r = indexedDB.open(APP, 1);
      r.onupgradeneeded = () => { r.result.createObjectStore('kv'); r.result.createObjectStore('blobs'); };
      r.onsuccess = () => res(r.result); r.onerror = () => rej(r.error);
    });
    return _db;
  }
  async function idbDo(store, mode, fn) {
    const db = await idb();
    return new Promise((res, rej) => { const tx = db.transaction(store, mode); const r = fn(tx.objectStore(store)); tx.oncomplete = () => res(r && r.result); tx.onerror = () => rej(tx.error); });
  }
  const idbGet = (s, k) => idbDo(s, 'readonly', st => st.get(k)).catch(() => null);
  const idbPut = (s, k, v) => idbDo(s, 'readwrite', st => st.put(v, k));
  const idbDel = (s, k) => idbDo(s, 'readwrite', st => st.delete(k));
  const idbKeys = (s) => idbDo(s, 'readonly', st => st.getAllKeys()).catch(() => []);

  // ---------- stores ----------
  const split = (p) => p.split('/').filter(Boolean);
  const isJson = (p) => /\.json$/i.test(p);
  const ROOT_FILES = ['ledger.json', 'sector.json'];
  const VALID_NAME = /^[A-Za-z0-9_-]+\.json$/;
  const MANIFEST_DIRS = ['findings', 'opportunities', 'hypotheses', 'decisions', 'sessions'];
  class Exists extends Error { constructor() { super('exists'); this.exists = true; } }

  class FsStore {
    constructor(handle) { this.kind = 'folder'; this.handle = handle; this.label = handle.name; this.urls = new Map(); }
    async permission(ask) {
      const opts = { mode: 'readwrite' };
      if ((await this.handle.queryPermission(opts)) === 'granted') return true;
      if (!ask) return false;
      return (await this.handle.requestPermission(opts)) === 'granted';
    }
    async _dir(parts, create) {
      let d = this.handle;
      for (const p of parts) d = await d.getDirectoryHandle(p, { create });
      return d;
    }
    async _file(path, create) {
      const parts = split(path); const name = parts.pop();
      const d = await this._dir(parts, create);
      return d.getFileHandle(name, { create });
    }
    async read(path) { try { return await (await (await this._file(path)).getFile()).text(); } catch { return null; } }
    async readBlob(path) { try { return await (await this._file(path)).getFile(); } catch { return null; } }
    async write(path, data, opts = {}) {
      if (opts.create && (await this.read(path)) != null) throw new Exists();
      const fh = await this._file(path, true);
      const w = await fh.createWritable(); await w.write(data); await w.close();
      this.urls.delete(path);
    }
    async remove(path) {
      const parts = split(path); const name = parts.pop();
      try { await (await this._dir(parts)).removeEntry(name); } catch {}
      this.urls.delete(path);
    }
    async list(dir) {
      const out = [];
      try { const d = await this._dir(split(dir)); for await (const [name, hd] of d.entries()) if (!name.startsWith('.')) out.push({ name, kind: hd.kind }); } catch {}
      return out.sort((a, b) => a.name.localeCompare(b.name));
    }
    async manifest() {
      const files = {};
      for (const f of ROOT_FILES) try { files[f] = (await (await this.handle.getFileHandle(f)).getFile()).lastModified; } catch {}
      for (const dn of MANIFEST_DIRS) {
        let d; try { d = await this.handle.getDirectoryHandle(dn); } catch { continue; }
        for await (const [name, hd] of d.entries()) {
          // Cloud-sync conflict copies ("F-ana-01 (1).json") aren't valid ids: skip them.
          if (hd.kind !== 'file' || !VALID_NAME.test(name)) continue;
          try { files[dn + '/' + name] = (await hd.getFile()).lastModified; } catch {}
        }
      }
      return files;
    }
    async url(path) {
      if (this.urls.has(path)) return this.urls.get(path);
      const b = await this.readBlob(path); if (!b) return '';
      const u = URL.createObjectURL(b); this.urls.set(path, u); return u;
    }
  }

  class LocalStore {
    constructor() { this.kind = 'browser'; this.label = 'this browser'; this.urls = new Map(); }
    k(p) { return 'isl:f:' + p; }
    async read(path) { if (isJson(path)) { const v = lsGet(this.k(path)); return v ? v.t : null; } return null; }
    async readBlob(path) { return (await idbGet('blobs', path)) || null; }
    async write(path, data, opts = {}) {
      if (opts.create && (await this.read(path)) != null) throw new Exists();
      if (typeof data === 'string') { if (!lsSet(this.k(path), { t: data, m: Date.now() })) throw new Error('Browser storage is full. Connect a folder.'); }
      else { await idbPut('blobs', path, data); this.urls.delete(path); }
    }
    async remove(path) { lsDel(this.k(path)); await idbDel('blobs', path).catch(() => {}); this.urls.delete(path); }
    _jsonKeys() { const out = []; try { for (let i = 0; i < localStorage.length; i++) { const k = localStorage.key(i); if (k.startsWith('isl:f:')) out.push(k.slice(6)); } } catch {} return out; }
    async list(dir) {
      const pre = dir.replace(/\/?$/, '/'); const names = new Set();
      for (const p of [...this._jsonKeys(), ...(await idbKeys('blobs'))]) if (p.startsWith(pre)) { const rest = p.slice(pre.length); names.add(rest.split('/')[0] + (rest.includes('/') ? '/' : '')); }
      return [...names].sort().map(n => n.endsWith('/') ? { name: n.slice(0, -1), kind: 'directory' } : { name: n, kind: 'file' });
    }
    async manifest() { const files = {}; for (const p of this._jsonKeys()) { const v = lsGet(this.k(p)); if (v) files[p] = v.m; } return files; }
    async url(path) {
      if (this.urls.has(path)) return this.urls.get(path);
      const b = await this.readBlob(path); if (!b) return '';
      const u = URL.createObjectURL(b); this.urls.set(path, u); return u;
    }
    hasData() { return this._jsonKeys().length > 0; }
  }

  // ---------- the ledger file ----------
  // Workshop 1 agenda: 120 minutes. Facilitators can change it on the Team tab (or in ledger.json).
  const DEFAULT_AGENDA = [
    { id: 'kickoff', label: 'Kick-off: pack, intros, Team Leader', minutes: 10, tab: 'team' },
    { id: 'pestel', label: 'Sprint 1 · PESTEL research (each person one dimension)', minutes: 15, tab: 'pestel' },
    { id: 'pestel-share', label: 'Sprint 1 · Share and pick the key factors', minutes: 10, tab: 'pestel' },
    { id: 'sector', label: 'Sprint 2 · How the sector works (each person one dimension)', minutes: 20, tab: 'sector' },
    { id: 'sector-share', label: 'Sprint 2 · Share and list opportunities', minutes: 15, tab: 'opportunities' },
    { id: 'hypotheses', label: 'Write three business hypotheses', minutes: 15, tab: 'hypotheses' },
    { id: 'matrix', label: 'Weighted decision matrix + decide', minutes: 15, tab: 'hypotheses' },
    { id: 'define', label: 'Define the chosen idea + launch market', minutes: 15, tab: 'hypotheses' },
    { id: 'close', label: 'Close: decisions + handoff to Workshop 2', minutes: 5, tab: 'handoff' }
  ];
  // Criteria the team weighs hypotheses on. Built from what the jury evaluates (program brief, "Resumen del reto").
  const DEFAULT_CRITERIA = [
    { id: 'evidence', label: 'Evidence the problem is real', weight: 25, hint: 'Data, sources, reviews, reports. Not opinions.' },
    { id: 'customer', label: 'Clear, reachable customer', weight: 15, hint: 'Can you name them and find 10 of them next week?' },
    { id: 'size', label: 'Size of the opportunity', weight: 15, hint: 'How many have the problem, how often, how much it costs them.' },
    { id: 'now', label: 'Why now', weight: 10, hint: 'A PESTEL factor that makes this more urgent today than 3 years ago.' },
    { id: 'pay', label: 'Someone will pay', weight: 20, hint: 'Who pays, how much, through which revenue model.' },
    { id: 'feasible', label: 'Feasible to launch', weight: 15, hint: 'Could a seed-stage team launch it in the chosen market?' }
  ];
  const blankLedger = () => ({
    schema: SCHEMA,
    team: { name: '', number: '', members: [], leader: '', agreements: [] },
    workshop: { current: 1, agenda: clone(DEFAULT_AGENDA), timer: { blockId: '', startedAt: null } },
    assignments: { pestel: {}, sector: {} },
    matrix: { criteria: clone(DEFAULT_CRITERIA), scale: 5 },
    selection: { hypothesisId: '', method: '', votes: {}, rationale: '', decidedAt: null },
    updatedAt: nowIso()
  });

  // Fills in missing defaults IN PLACE, so cards that hold a reference to the ledger (or to ledger.team…)
  // keep editing the live object after a save.
  function normalizeLedger(l) {
    const b = blankLedger(); l = isObj(l) ? l : {};
    const fill = (o, d) => { for (const k of Object.keys(d)) if (!(k in o)) o[k] = d[k]; return o; };
    const sub = (k) => (l[k] = fill(isObj(l[k]) ? l[k] : {}, b[k]));
    fill(l, b);
    const t = sub('team');
    if (!Array.isArray(t.members)) t.members = [];
    if (t.members.some(m => !isObj(m) || !m.name)) t.members = t.members.map(m => typeof m === 'string' ? { name: m } : m).filter(m => isObj(m) && m.name);
    if (!Array.isArray(t.agreements)) t.agreements = t.agreements ? [t.agreements] : [];
    const w = sub('workshop');
    if (!Array.isArray(w.agenda) || !w.agenda.length) w.agenda = clone(DEFAULT_AGENDA);
    w.timer = fill(isObj(w.timer) ? w.timer : {}, b.workshop.timer);
    const a = sub('assignments');
    for (const k of ['pestel', 'sector']) if (!isObj(a[k])) a[k] = {};
    const m = sub('matrix');
    if (!Array.isArray(m.criteria) || !m.criteria.length) m.criteria = clone(DEFAULT_CRITERIA);
    const s = sub('selection');
    if (!isObj(s.votes)) s.votes = {};
    return l;
  }

  // ---------- merging ----------
  // Three-way merge: take every field I changed since I last read the file, keep everything else from disk.
  const same = (a, b) => JSON.stringify(a) === JSON.stringify(b);
  function merge3(base, mine, disk) {
    if (!isObj(base) || !isObj(mine) || !isObj(disk)) return same(mine, base) ? disk : mine;
    const out = Object.assign({}, disk);
    for (const k of new Set([...Object.keys(mine), ...Object.keys(base)])) {
      if (same(mine[k], base[k])) continue;
      if (!(k in mine)) { delete out[k]; continue; }
      out[k] = isObj(mine[k]) && isObj(base[k]) && isObj(disk[k]) ? merge3(base[k], mine[k], disk[k]) : mine[k];
    }
    return out;
  }

  function assignDeep(target, src) {
    for (const k of Object.keys(target)) if (!(k in src) && k !== '_file') delete target[k];
    for (const [k, v] of Object.entries(src)) target[k] = isObj(v) && isObj(target[k]) ? assignDeep(target[k], v) : v;
    return target;
  }

  const SLOTS = ['findings', 'opportunities', 'hypotheses', 'decisions', 'sessions'];
  const Ledger = {
    store: null, ready: false,
    state: { ledger: normalizeLedger(null), sector: null, findings: {}, opportunities: {}, hypotheses: {}, decisions: {}, sessions: {} },
    known: {}, lastWritten: {}, base: {}, subs: [], pollTimer: null, lastSync: 0, writeChain: Promise.resolve(), pending: 0,

    on(fn) { this.subs.push(fn); },
    emit(type, detail) { for (const f of this.subs) try { f(type, detail); } catch (e) { console.error(e); } },

    pathToSlot(path) {
      if (path === 'ledger.json') return ['ledger', null];
      if (path === 'sector.json') return ['sector', null];
      const m = /^(findings|opportunities|hypotheses|decisions|sessions)\/([^/]+)\.json$/.exec(path);
      return m ? [m[1], m[2]] : [null, null];
    },
    apply(path, text) {
      const [slot, key] = this.pathToSlot(path); if (!slot) return;
      if (text == null) { if (key) delete this.state[slot][key]; else if (slot === 'sector') this.state.sector = null; delete this.base[path]; return; }
      let obj; try { obj = JSON.parse(text); } catch { console.warn('Bad JSON in', path); this.emit('badjson', path); return; }
      this.base[path] = clone(obj);
      if (slot === 'sector' || isObj(obj)) { if (key && !obj.id) obj.id = key; this._set(path, obj); }
    },
    blankState() { const s = { ledger: normalizeLedger(null), sector: null }; for (const k of SLOTS) s[k] = {}; return s; },
    async open(store) {
      clearInterval(this.pollTimer);
      this.store = store; this.ready = false;
      this.state = this.blankState();
      this.known = {}; this.lastWritten = {}; this.base = {};
      await this.reload();
      this.ready = true;
      this.emit('load');
      this.pollTimer = setInterval(() => this.poll(), POLL_MS);
    },
    async reload() {
      const man = await this.store.manifest();
      await Promise.all(Object.keys(man).map(async (p) => { this.apply(p, await this.store.read(p)); }));
      this.known = man; this.lastSync = Date.now();
      this.cacheSnapshot();
    },
    async poll() {
      if (!this.store || this.pending || document.hidden) return;
      let man; try { man = await this.store.manifest(); } catch (e) { this.emit('offline', e); return; }
      const changed = [];
      for (const [p, m] of Object.entries(man)) {
        if (this.known[p] === m) continue;
        const text = await this.store.read(p);
        if (text != null && text === this.lastWritten[p]) continue;
        this.apply(p, text); changed.push(p);
      }
      for (const p of Object.keys(this.known)) if (!(p in man)) { this.apply(p, null); changed.push(p); }
      this.known = man; this.lastSync = Date.now();
      if (changed.length) { this.cacheSnapshot(); this.emit('external', changed); }
      this.emit('synced');
    },
    cacheSnapshot() {
      if (!this.store || this.store.kind === 'browser') return;
      const files = {};
      files['ledger.json'] = JSON.stringify(this.state.ledger);
      if (this.state.sector) files['sector.json'] = JSON.stringify(this.state.sector);
      for (const slot of SLOTS) for (const [k, v] of Object.entries(this.state[slot])) { const c = Object.assign({}, v); delete c._file; files[slot + '/' + k + '.json'] = JSON.stringify(c); }
      lsSet('isl:cache', { label: this.store.label, at: Date.now(), files });
    },
    loadCache() {
      const c = lsGet('isl:cache'); if (!c) return null;
      for (const [p, t] of Object.entries(c.files || {})) this.apply(p, t);
      return c;
    },
    serialize(obj) { const c = Object.assign({}, obj); delete c._file; return JSON.stringify(c, null, 2) + '\n'; },
    queue(fn) {
      this.pending++;
      const run = this.writeChain.then(fn).catch(e => { console.error(e); toast('Could not save: ' + (e.message || e)); }).finally(() => { this.pending--; });
      this.writeChain = run; return run;
    },
    // Updates the object already in state IN PLACE (open drawers and cards hold references to it),
    // or stores obj if there's nothing there yet.
    _set(path, obj) {
      const [slot, key] = this.pathToSlot(path);
      if (slot === 'sector') { this.state.sector = obj; return; }
      if (!slot) return;
      const cur = slot === 'ledger' ? this.state.ledger : this.state[slot][key];
      const live = cur && cur !== obj && isObj(cur) ? assignDeep(cur, obj) : obj;
      if (slot === 'ledger') this.state.ledger = normalizeLedger(live);
      else { live.id = key; live._file = path; this.state[slot][key] = live; }
    },
    save(path, obj) {
      const [slot, key] = this.pathToSlot(path);
      obj.updatedAt = nowIso();
      if (slot === 'ledger') obj.schema = obj.schema || SCHEMA;
      if (key) obj.id = key;
      this._set(path, obj);
      const mine = JSON.parse(this.serialize(obj));
      this.emit('local', path);
      return this.queue(async () => {
        let out = mine;
        const base = this.base[path];
        if (base) {
          const diskText = await this.store.read(path);
          if (diskText != null && diskText !== this.lastWritten[path]) {
            try {
              const disk = JSON.parse(diskText);
              if (!same(disk, base)) { out = merge3(base, mine, disk); out.updatedAt = nowIso(); this._set(path, clone(out)); this.emit('merged', path); }
            } catch {}
          }
        }
        const text = this.serialize(out);
        this.lastWritten[path] = text; this.base[path] = clone(out);
        await this.store.write(path, text);
        this.lastSync = Date.now(); this.cacheSnapshot(); this.emit('synced');
      });
    },
    /** Create a new file with an id scoped to its author: F-ana-01, O-ben-02, H-carla-01.
     *  Teammates work in separate copies and merge later, so ids must never collide across people. Resolves to the id. */
    create(slot, prefix, obj) {
      return new Promise((resolve) => {
        this.queue(async () => {
          const who = personSlug(obj.author || obj.by || me());
          let n = this.nextNum(slot, prefix, who);
          for (let tries = 0; tries < 50; tries++, n++) {
            const id = `${prefix}-${who}-${String(n).padStart(2, '0')}`, path = `${slot}/${id}.json`;
            if (this.state[slot][id]) continue;
            const o = Object.assign({}, obj, { id, createdAt: obj.createdAt || nowIso(), updatedAt: nowIso() });
            const text = this.serialize(o);
            try { await this.store.write(path, text, { create: true }); }
            catch (e) { if (e.exists) continue; throw e; }
            this.lastWritten[path] = text; this.base[path] = clone(o); this._set(path, o);
            this.lastSync = Date.now(); this.cacheSnapshot(); this.emit('local', path); this.emit('synced');
            resolve(id); return;
          }
          throw new Error('Could not find a free id in ' + slot);
        }).then(() => resolve(null));
      });
    },
    saveLedger() { return this.save('ledger.json', this.state.ledger); },
    remove(path) {
      this.apply(path, null); delete this.known[path]; delete this.lastWritten[path];
      this.emit('local', path);
      return this.queue(async () => { await this.store.remove(path); this.cacheSnapshot(); });
    },
    putBlob(path, blob) { return this.queue(() => this.store.write(path, blob)); },
    url(path) { return this.store ? this.store.url(path) : Promise.resolve(''); },
    list(dir) { return this.store ? this.store.list(dir) : Promise.resolve([]); },
    nextNum(slot, prefix, who) {
      const re = new RegExp('^' + prefix + '-' + who + '-(\\d+)$');
      let max = 0; for (const k of Object.keys(this.state[slot])) { const m = re.exec(k); if (m) max = Math.max(max, +m[1]); }
      return max + 1;
    },
    async copyAllTo(target) {
      const src = this.store;
      const man = await src.manifest();
      for (const p of Object.keys(man)) { const t = await src.read(p); if (t != null) await target.write(p, t); }
      for (const e of await src.list('sources')) if (e.kind === 'file') { const b = await src.readBlob('sources/' + e.name); if (b) await target.write('sources/' + e.name, b); }
    },
    /** Everything except sector.json (every teammate loads the pack themselves). */
    async exportBundle() {
      const out = { app: APP, schema: SCHEMA, exportedAt: nowIso(), from: me(), sector: this.state.sector ? this.state.sector.id : '', files: {} };
      const man = await this.store.manifest();
      for (const p of Object.keys(man)) if (p !== 'sector.json') out.files[p] = JSON.parse(await this.store.read(p));
      return out;
    }
  };

  // ---------- merging a teammate's work ----------
  // Two laptops share no history, so: for an item, the newer edit wins, but sources are unioned and a check
  // by anyone is kept. For ledger.json: keep ours, fill our gaps from theirs, union the members and votes.
  const srcKey = (s) => (String(s.url || '').trim().toLowerCase() || String(s.label || '').trim().toLowerCase());
  function mergeItem(mine, theirs) {
    if (!mine) return theirs;
    if (same(mine, theirs)) return mine;
    const newer = String(theirs.updatedAt || '') > String(mine.updatedAt || '');
    const older = newer ? mine : theirs, out = Object.assign({}, older, newer ? theirs : mine);
    // A field the newer copy left empty but the older one filled in was most likely never seen, not deleted: keep it.
    const blank = (v) => v == null || v === '' || (Array.isArray(v) && !v.length);
    for (const [k, v] of Object.entries(older)) if (blank(out[k]) && !blank(v)) out[k] = v;
    const byKey = new Map();
    for (const s of [...(mine.sources || []), ...(theirs.sources || [])]) {
      if (!s) continue;
      const k = srcKey(s), cur = byKey.get(k);
      if (!cur) byKey.set(k, Object.assign({}, s));
      else if (s.verified && !cur.verified) Object.assign(cur, { verified: true, verifiedBy: s.verifiedBy, verifiedAt: s.verifiedAt });
    }
    if (mine.sources || theirs.sources) out.sources = [...byKey.values()];
    return out;
  }
  function fillGaps(mine, theirs) {
    for (const [k, v] of Object.entries(theirs || {})) {
      const m = mine[k];
      if (m === undefined || m === null || m === '' || (Array.isArray(m) && !m.length && Array.isArray(v))) mine[k] = clone(v);
      else if (isObj(m) && isObj(v)) fillGaps(m, v);
    }
    return mine;
  }
  function mergeLedger(mine, theirs) {
    const out = fillGaps(normalizeLedger(clone(mine)), theirs);
    const names = new Set(out.team.members.map(m => m.name));
    for (const m of (theirs.team && theirs.team.members) || []) { const n = typeof m === 'string' ? m : m && m.name; if (n && !names.has(n)) { out.team.members.push({ name: n }); names.add(n); } }
    out.selection.votes = Object.assign({}, (theirs.selection || {}).votes || {}, out.selection.votes || {});
    return out;
  }

  // ---------- skills as zip files (built in the browser, store-only, no compression) ----------
  const CRC = (() => { const t = new Uint32Array(256); for (let n = 0; n < 256; n++) { let c = n; for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1; t[n] = c >>> 0; } return t; })();
  const crc32 = (u8) => { let c = 0xffffffff; for (let i = 0; i < u8.length; i++) c = CRC[(c ^ u8[i]) & 0xff] ^ (c >>> 8); return (c ^ 0xffffffff) >>> 0; };
  /** files: { 'skill-name/SKILL.md': 'text', … } → Blob (application/zip) */
  function makeZip(files) {
    const enc = new TextEncoder(), parts = [], dir = [];
    let off = 0;
    for (const [name, text] of Object.entries(files)) {
      const nb = enc.encode(name), data = enc.encode(text), crc = crc32(data);
      const lh = new DataView(new ArrayBuffer(30));
      lh.setUint32(0, 0x04034b50, true); lh.setUint16(4, 20, true); lh.setUint16(6, 0x0800, true); lh.setUint32(14, crc, true);
      lh.setUint32(18, data.length, true); lh.setUint32(22, data.length, true); lh.setUint16(26, nb.length, true);
      const ch = new DataView(new ArrayBuffer(46));
      ch.setUint32(0, 0x02014b50, true); ch.setUint16(4, 20, true); ch.setUint16(6, 20, true); ch.setUint16(8, 0x0800, true); ch.setUint32(16, crc, true);
      ch.setUint32(20, data.length, true); ch.setUint32(24, data.length, true); ch.setUint16(28, nb.length, true); ch.setUint32(42, off, true);
      parts.push(lh.buffer, nb, data); dir.push(ch.buffer, nb);
      off += 30 + nb.length + data.length;
    }
    const size = dir.reduce((n, x) => n + x.byteLength, 0);
    const end = new DataView(new ArrayBuffer(22));
    end.setUint32(0, 0x06054b50, true); end.setUint16(8, Object.keys(files).length, true); end.setUint16(10, Object.keys(files).length, true);
    end.setUint32(12, size, true); end.setUint32(16, off, true);
    return new Blob([...parts, ...dir, end.buffer], { type: 'application/zip' });
  }

  const isImage = (p) => /\.(jpe?g|png|webp|gif|heic|avif)$/i.test(p);

  // ---------- boot + storage bar ----------
  const fsSupported = () => 'showDirectoryPicker' in window;

  async function pickFolder() {
    if (!fsSupported()) {
      await modal({ title: 'This browser can’t open folders', body: h('div', null,
        h('p', null, 'Saving to a folder works in Chrome or Edge on a laptop.'),
        h('p', null, 'Here, your work is saved in this browser. Use ', h('b', null, 'Share my work'), ' to back it up and to send it to your team.')),
        actions: [{ label: 'OK', value: 1, cls: 'primary' }] });
      return null;
    }
    let handle;
    try { handle = await window.showDirectoryPicker({ id: APP, mode: 'readwrite' }); } catch { return null; }
    const store = new FsStore(handle);
    if (!(await store.permission(true))) { toast('Permission denied for that folder'); return null; }
    const man = await store.manifest();
    const cur = Ledger.store;
    if (!Object.keys(man).length && cur && cur.kind === 'browser' && cur.hasData()) {
      const v = await modal({ title: 'Move your work into this folder?', body: 'You have work saved in this browser. Copy it into “' + handle.name + '”?',
        actions: [{ label: 'Start empty', value: 'empty' }, { label: 'Copy it in', value: 'copy', cls: 'primary' }] });
      if (v === 'copy') { toast('Copying…'); await Ledger.copyAllTo(store); }
    }
    await idbPut('kv', 'handle', handle).catch(() => {});
    return store;
  }

  async function boot(ui) {
    if (fsSupported()) {
      const handle = await idbGet('kv', 'handle');
      if (handle) {
        const store = new FsStore(handle);
        let ok = false; try { ok = await store.permission(false); } catch {}
        if (ok) { try { await Ledger.open(store); return; } catch (e) { console.warn(e); } }
        const cache = Ledger.loadCache();
        ui.needReconnect(handle.name, async () => {
          if (await store.permission(true)) { await Ledger.open(store); return true; }
          return false;
        }, cache);
        return;
      }
    }
    await Ledger.open(new LocalStore());
  }

  function storageBar(container) {
    const pill = h('button', { class: 'pill', title: 'Where your work is saved' });
    const render = () => {
      const s = Ledger.store; pill.innerHTML = '';
      if (!s) { pill.append(h('span', { class: 'dot warn' }), 'Not connected'); return; }
      pill.append(h('span', { class: 'dot ' + (s.kind === 'browser' ? 'warn' : 'ok') }), s.kind === 'folder' ? 'Folder: ' + s.label : 'This browser only',
        s.kind === 'folder' && Ledger.lastSync ? h('span', { class: 'muted' }, ' · ' + ago(Ledger.lastSync)) : '');
    };
    pill.addEventListener('click', () => storageInfo());
    Ledger.on((t) => { if (t === 'load' || t === 'synced' || t === 'local') render(); });
    setInterval(render, 5000);
    render(); container.append(pill);
    return pill;
  }

  async function storageInfo() {
    const s = Ledger.store;
    const body = h('div', null);
    if (!s || s.kind === 'browser') {
      body.append(h('p', null, 'Your work is saved in this browser, on this laptop.'),
        fsSupported() ? h('p', null, h('b', null, 'Connect a folder'), ' to save it as files instead. Then Claude, Codex, Cursor or Grok can read and add to it, and you can keep it in OneDrive, Google Drive or Dropbox.') : null,
        h('p', { class: 'muted small' }, 'Use Share my work to back it up, or to send it to your team.'));
    } else {
      body.append(h('p', null, 'Saving to the folder ', h('b', null, s.label), '. Changes your agent makes to the files show up here within a few seconds.'),
        h('p', { class: 'muted small' }, 'Is this folder synced by OneDrive, Google Drive or Dropbox and connected by your teammates too? Then their work shows up here on its own, within the time the sync takes.'));
    }
    const actions = [{ label: 'Close', value: null }];
    if (fsSupported()) actions.unshift({ label: s && s.kind === 'folder' ? 'Switch folder' : 'Connect a folder', value: 'pick', cls: 'primary' });
    actions.unshift({ label: 'Share my work', value: 'share' });
    actions.unshift({ label: 'Add a teammate’s work', value: 'add' });
    const v = await modal({ title: 'Where this is saved', body, actions });
    if (v === 'pick') { const st = await pickFolder(); if (st) { await Ledger.open(st); toast('Connected to ' + st.label); } }
    if (v === 'share') shareWork();
    if (v === 'add') addWork();
  }

  // ---------- sharing work between teammates (no server: files or pasted text) ----------
  const SHARE_HEAD = 'Innovation Sprint Ledger · work from ';
  async function shareWork() {
    const b = await Ledger.exportBundle();
    const n = Object.keys(b.files).length, who = b.from || 'me';
    const text = SHARE_HEAD + who + ' · ' + n + ' files · paste this into “Add a teammate’s work”\n' + JSON.stringify(b);
    const fname = 'sprint-' + personSlug(who) + '-' + new Date().toISOString().slice(0, 16).replace(/[-:T]/g, '') + '.json';
    const v = await modal({ title: 'Share my work', body: h('div', null,
      h('p', null, 'This packs up everything on your board (' + n + ' files). Send it to your Team Leader by WhatsApp, Teams, email or USB. They add it to theirs with ', h('b', null, 'Add a teammate’s work'), '.'),
      h('p', { class: 'small muted' }, 'The Team Leader collects everyone’s work, then shares the merged board back, so the whole team sees all of it. Adding the same work twice is harmless.'),
      !b.from ? h('p', { class: 'small', style: { color: 'var(--warn)' } }, 'Tip: pick your name at the top first, so your teammates see who it came from.') : null),
      actions: [{ label: 'Cancel', value: null }, { label: 'Copy as text', value: 'copy' }, { label: 'Download file', value: 'file', cls: 'primary' }] });
    if (v === 'copy') copyText(text, 'Your work is copied. Paste it in a message');
    if (v === 'file') download(fname, JSON.stringify(b, null, 2));
  }
  async function addWork() {
    const ta = h('textarea', { rows: 6, placeholder: 'Paste the text a teammate sent you (it starts with “' + SHARE_HEAD.trim() + '”)…' });
    const fileIn = h('input', { type: 'file', accept: '.json,application/json', multiple: true });
    const v = await modal({ title: 'Add a teammate’s work', body: h('div', null,
      h('label', { class: 'field' }, h('span', null, 'Their file(s)'), fileIn), h('label', { class: 'field' }, h('span', null, 'Or paste their text'), ta),
      h('p', { class: 'small muted' }, 'New items are added. When you both changed the same item, the newer edit wins. Sources are combined, and a check by either of you is kept. Your team settings stay yours; only empty ones are filled in.')),
      actions: [{ label: 'Cancel', value: false }, { label: 'Add', value: true, cls: 'primary' }] });
    if (!v) return;
    const bundles = [];
    try {
      for (const f of fileIn.files) bundles.push(JSON.parse(await f.text()));
      const t = ta.value.trim(); if (t) bundles.push(JSON.parse(t.slice(t.indexOf('{'))));
    } catch (e) { toast('That isn’t a shared board: ' + e.message, 5000); return; }
    if (!bundles.length) return;
    const tot = { added: 0, updated: 0, same: 0 }, from = [];
    for (const b of bundles) { const r = await importBundle(b); for (const k in tot) tot[k] += r[k]; if (b.from) from.push(b.from); Ledger.emit('imported', b); }
    toast(`${from.length ? 'From ' + from.join(', ') + ': ' : ''}${tot.added} new, ${tot.updated} updated${tot.same ? ', ' + tot.same + ' already here' : ''}`, 4500);
    Ledger.emit('load');
  }

  const BUNDLE_PATH = /^(ledger\.json|sector\.json|(findings|opportunities|hypotheses|decisions|sessions)\/[A-Za-z0-9_-]+\.json)$/;
  /** Merges a shared board (or an agent's ledger-import.json) into this one. Returns counts. */
  async function importBundle(b) {
    const files = b && b.files ? b.files : b;
    if (!files || typeof files !== 'object') throw new Error('Not a ledger bundle');
    const r = { added: 0, updated: 0, same: 0 };
    for (const [path, obj] of Object.entries(files)) {
      if (!BUNDLE_PATH.test(path)) continue;
      const o = typeof obj === 'string' ? JSON.parse(obj) : obj;
      const [slot, key] = Ledger.pathToSlot(path);
      if (slot === 'ledger') {
        const cur = Ledger.state.ledger, merged = mergeLedger(cur, o);
        if (same(merged, cur)) { r.same++; continue; }
        await Ledger.save(path, merged); r.updated++;
      } else if (slot === 'sector') {
        if (Ledger.state.sector) { r.same++; continue; }
        await Ledger.save(path, o); r.added++;
      } else {
        const cur = Ledger.state[slot][key];
        const plain = cur ? JSON.parse(Ledger.serialize(cur)) : null;
        const merged = mergeItem(plain, o);
        if (plain && same(merged, plain)) { r.same++; continue; }
        const keepTime = merged.updatedAt;
        await Ledger.save(path, merged);
        if (keepTime) { Ledger.state[slot][key].updatedAt = keepTime; }
        cur ? r.updated++ : r.added++;
      }
    }
    return r;
  }

  function reconnectBanner(host, name, reconnect, cache) {
    host.innerHTML = '';
    host.append(h('div', { class: 'banner' }, h('div', { class: 'banner-in warn' },
      h('div', { style: { flex: 1, minWidth: '220px' } }, h('b', null, 'Reconnect your folder'), h('div', { class: 'small muted' },
        'The browser needs your OK to keep using “' + name + '”.' + (cache ? ' Showing what was saved ' + ago(cache.at) + ' until you do.' : ''))),
      h('button', { class: 'btn primary', onclick: async () => { if (await reconnect()) { host.innerHTML = ''; toast('Reconnected'); } } }, 'Reconnect'),
      h('button', { class: 'btn ghost', onclick: async () => { const st = await pickFolder(); if (st) { host.innerHTML = ''; await Ledger.open(st); } } }, 'Pick a different folder'))));
  }

  return { SCHEMA, $, $$, h, today, nowIso, debounce, lsGet, lsSet, fmtDate, ago, lines, clone, toast, modal, copyText, download, me, setMe, personSlug,
    Ledger, blankLedger, normalizeLedger, merge3, mergeItem, mergeLedger, DEFAULT_AGENDA, DEFAULT_CRITERIA, isImage, boot, storageBar, storageInfo,
    shareWork, addWork, makeZip, reconnectBanner, pickFolder, importBundle, FsStore, LocalStore, fsSupported };
})();
