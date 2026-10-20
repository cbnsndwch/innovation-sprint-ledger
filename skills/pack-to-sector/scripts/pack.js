/* Sector Exploration Pack (.docx) → sector.json
 * Runs in the browser (sprint.html) and in Bun (kit.ts sector). No dependencies:
 * a tiny zip reader + DecompressionStream('deflate-raw') + regex over word/document.xml.
 * All the packs (one per sector) share one layout: a title block, then numbered sections
 * (definition, players, value chain, key figures, challenge, guiding questions,
 * glossary, sources). Sections are matched by keywords in their heading, not by
 * number, and every section also keeps its raw paragraphs and tables, so a pack
 * that drifts from the layout still shows up readable on the Brief tab.
 */
const SectorPack = (() => {
  'use strict';
  const SECTOR_SCHEMA = 'sector-pack/1';

  // ---------- zip ----------
  async function unzipEntry(buf, name) {
    const u8 = new Uint8Array(buf), dv = new DataView(u8.buffer, u8.byteOffset, u8.byteLength);
    let eocd = -1;
    for (let i = u8.length - 22; i >= Math.max(0, u8.length - 65557); i--) if (dv.getUint32(i, true) === 0x06054b50) { eocd = i; break; }
    if (eocd < 0) throw new Error('Not a .docx file (no zip directory found)');
    let p = dv.getUint32(eocd + 16, true);
    const n = dv.getUint16(eocd + 10, true), dec = new TextDecoder();
    for (let k = 0; k < n; k++) {
      if (dv.getUint32(p, true) !== 0x02014b50) break;
      const method = dv.getUint16(p + 10, true), csize = dv.getUint32(p + 20, true);
      const nl = dv.getUint16(p + 28, true), xl = dv.getUint16(p + 30, true), cl = dv.getUint16(p + 32, true);
      const off = dv.getUint32(p + 42, true), fname = dec.decode(u8.subarray(p + 46, p + 46 + nl));
      if (fname === name) {
        const start = off + 30 + dv.getUint16(off + 26, true) + dv.getUint16(off + 28, true);
        const data = u8.subarray(start, start + csize);
        if (method === 0) return dec.decode(data);
        if (method !== 8) throw new Error('Unsupported compression in .docx');
        const stream = new Blob([data]).stream().pipeThrough(new DecompressionStream('deflate-raw'));
        return await new Response(stream).text();
      }
      p += 46 + nl + xl + cl;
    }
    throw new Error(name + ' not found in the file');
  }

  // ---------- docx → blocks ----------
  const ent = (s) => s.replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"').replace(/&apos;/g, "'").replace(/&amp;/g, '&');
  const clean = (s) => ent(s).replace(/\s+/g, ' ').trim();
  const runText = (xml) => clean((xml.match(/<w:t(?:\s[^>]*)?>[^<]*<\/w:t>|<w:tab\/>|<w:br\/>/g) || []).map(t => t.startsWith('<w:t') ? t.replace(/<[^>]+>/g, '') : ' ').join(''));

  function blocks(xml) {
    const body = (/<w:body>([\s\S]*)<\/w:body>/.exec(xml) || [, xml])[1];
    const out = [];
    const re = /<w:tbl>[\s\S]*?<\/w:tbl>|<w:p[ >][\s\S]*?<\/w:p>/g;
    let m;
    while ((m = re.exec(body))) {
      const s = m[0];
      if (s.startsWith('<w:tbl>')) {
        const rows = (s.match(/<w:tr[ >][\s\S]*?<\/w:tr>/g) || []).map(r => (r.match(/<w:tc>[\s\S]*?<\/w:tc>/g) || []).map(c => runText(c)));
        out.push({ t: 'table', rows: rows.filter(r => r.some(Boolean)) });
      } else {
        const text = runText(s);
        if (text) out.push({ t: 'p', text, style: (/<w:pStyle w:val="([^"]+)"/.exec(s) || [])[1] || '' });
      }
    }
    return out;
  }

  // ---------- blocks → sector ----------
  const SECTION_KEYS = [
    ['definition', /definition|boundar/i], ['players', /who is in|make money|players|actors/i], ['valueChain', /value chain|journey/i],
    ['keyFigures', /key figures|figures|data/i], ['challenge', /challenge/i], ['questions', /guiding|questions/i],
    ['glossary', /glossary/i], ['sources', /sources/i]
  ];
  const splitDots = (s) => String(s || '').split(/\s*[·•]\s*/).map(x => x.trim().replace(/\.$/, '')).filter(Boolean);
  const slug = (s) => String(s || '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/&/g, ' ').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
  const isHeading = (b) => b.t === 'p' && /^\d{1,2}\.\s+\S/.test(b.text) && b.text.length < 90 && b.text === b.text.toUpperCase();

  function parseBlocks(bl) {
    const sector = { schema: SECTOR_SCHEMA, id: '', name: '', label: '', referenceMarket: '', intro: '', definition: '', inside: [], outside: [], boundaryRows: [], players: [], playersNote: '', revenueModels: [],
      valueChain: { note: '', steps: [], enabling: [] }, keyFigures: [], figuresNote: '', challenge: '', pestelNote: '', sprint2Questions: [], glossary: [], sources: [], sections: [], extra: [] };
    let i = 0;
    const head = [];
    while (i < bl.length && !isHeading(bl[i])) head.push(bl[i++]);
    const hp = head.filter(b => b.t === 'p').map(b => b.text);
    sector.label = hp.find(t => /exploration pack|workshop/i.test(t)) || '';
    sector.name = hp.find(t => t !== sector.label && t.length < 80 && t === t.toUpperCase()) || hp.find(t => t !== sector.label) || 'Sector';
    const introP = hp.filter(t => t !== sector.label && t !== sector.name).join(' ');
    const rm = /Reference market:\s*([^.]*(?:\([^)]*\))?[^.]*)\./i.exec(introP);
    if (rm) sector.referenceMarket = rm[1].trim();
    sector.intro = introP.replace(/^.*?Reference market:[^.]*(?:\([^)]*\))?[^.]*\.\s*/i, '').trim() || introP;
    sector.name = titleCase(sector.name);
    sector.id = slug(sector.name);

    while (i < bl.length) {
      const heading = bl[i++].text;
      const items = [];
      while (i < bl.length && !isHeading(bl[i])) items.push(bl[i++]);
      const key = (SECTION_KEYS.find(([, re]) => re.test(heading.replace(/^\d+\.\s*/, ''))) || [])[0] || '';
      const title = titleCase(heading.replace(/^\d+\.\s*/, ''));
      sector.sections.push({ key, title });
      if (!key) sector.extra.push({ title, blocks: items });
      const ps = items.filter(b => b.t === 'p').map(b => b.text), tables = items.filter(b => b.t === 'table');
      try {
        if (key === 'definition') {
          sector.definition = ps[0] || '';
          for (const r of (tables[0] || {}).rows || []) {
            if (/^inside/i.test(r[0])) sector.inside = splitDots(r.slice(1).join(' '));
            else if (/^outside/i.test(r[0])) sector.outside = [r.slice(1).join(' ')];
            // any other labelled row, e.g. Fintech's "Rules of the game" (the regulators)
            else if (r[0] && r.slice(1).join('').trim()) {
              const txt = r.slice(1).join(' '), cut = txt.search(/\.\s+[A-Z]/);
              sector.boundaryRows.push(Object.assign({ label: r[0], items: splitDots(cut > 0 ? txt.slice(0, cut) : txt) }, cut > 0 ? { note: txt.slice(cut + 1).trim() } : {}));
            }
          }
          if (sector.outside.length === 1) {
            const s = sector.outside[0], cut = s.search(/\.\s+[A-Z]/);
            const list = cut > 0 ? s.slice(0, cut) : s;
            sector.outside = splitDots(list); if (cut > 0) sector.outsideNote = s.slice(cut + 1).trim();
          }
        } else if (key === 'players') {
          const t = tables[0];
          if (t) sector.players = t.rows.slice(1).map(r => ({ type: r[0] || '', howMoney: r[1] || '', examples: r[2] || '' }));
          sector.playersNote = ps.find(p => !/^revenue models/i.test(p)) || '';
          const rv = ps.find(p => /^revenue models/i.test(p));
          if (rv) sector.revenueModels = splitDots(rv.replace(/^[^:]*:\s*/, ''));
        } else if (key === 'valueChain') {
          sector.valueChain.note = ps.join(' ');
          const t = tables[0];
          if (t && t.rows.length) {
            const [names, actors = []] = t.rows;
            sector.valueChain.steps = names.map((n, k) => ({ name: n.replace(/^\d+\.\s*/, ''), actors: actors[k] || '' }));
            const en = t.rows.slice(2).map(r => r.filter(Boolean).join(' ')).join(' ');
            if (en) { sector.valueChain.enablingLabel = (/^([^:]+):/.exec(en) || [, 'Enabling layer'])[1]; sector.valueChain.enabling = splitDots(en.replace(/^[^:]*:\s*/, '')); }
          }
        } else if (key === 'keyFigures') {
          const t = tables[0];
          if (t) sector.keyFigures = t.rows.slice(1).map(r => ({ level: r[0] || '', figure: r[1] || '', source: r[2] || '' }));
          sector.figuresNote = ps.join(' ');
        } else if (key === 'challenge') {
          sector.challenge = ps.join('\n\n');
        } else if (key === 'questions') {
          sector.pestelNote = ps.join(' ');
          const t = tables[0];
          if (t) sector.sprint2Questions = t.rows.slice(1).map(r => ({ dimension: r[0] || '', question: r[1] || '' }));
        } else if (key === 'glossary') {
          for (const t of tables) for (const r of t.rows) for (let k = 0; k + 1 < r.length; k += 2) if (r[k]) sector.glossary.push({ term: r[k], def: r[k + 1] || '' });
        } else if (key === 'sources') {
          const all = ps.join(' ');
          const parts = all.split(/\s*(?=\b[A-Z][A-Za-z ]{2,30}:\s)/).filter(Boolean);
          for (const part of parts) {
            const mm = /^([^:]{2,32}):\s*(.*)$/.exec(part);
            sector.sources.push(mm ? { group: mm[1].trim(), items: splitDots(mm[2]) } : { group: 'Sources', items: splitDots(part) });
          }
        }
      } catch (e) { /* keep the raw section; the Brief tab falls back to it */ }
    }
    return sector;
  }
  function titleCase(s) {
    if (s !== s.toUpperCase()) return s;
    const small = new Set(['and', 'of', 'the', 'in', 'for', 'to', 'a', 'an', 'or', 'on', 'by']);
    return s.toLowerCase().replace(/\b[\w']+/g, (w, o) => (o && small.has(w)) ? w : w.charAt(0).toUpperCase() + w.slice(1)).replace(/\bU\.s\./g, 'U.S.');
  }

  async function fromDocx(buf) {
    const xml = await unzipEntry(buf, 'word/document.xml');
    return parseBlocks(blocks(xml));
  }

  /** Light check used before writing sector.json: returns a list of problems (empty = fine). */
  function check(s) {
    const out = [];
    if (!s || typeof s !== 'object') return ['not an object'];
    if (!s.name) out.push('no sector name');
    if (!s.challenge) out.push('no Exploration Challenge found');
    if (!s.definition) out.push('no sector definition found');
    if (!(s.keyFigures || []).length) out.push('no key figures table found');
    if (!(s.sprint2Questions || []).length) out.push('no Sprint 2 guiding questions found');
    return out;
  }

  const api = { SECTOR_SCHEMA, fromDocx, parseBlocks, blocks, check, slug };
  if (typeof globalThis !== 'undefined') globalThis.SectorPack = api;
  return api;
})();
