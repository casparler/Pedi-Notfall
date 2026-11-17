// neonatal-ui.js - Darstellung des Tabs "Neugeborenen-Notfall"
// Benötigt: neonatal.js (NeoCalc, NEO_*), optional neonatal-sop.js
(function () {
  'use strict';

  const calc = new NeoCalc();
  const area = document.getElementById('neonatal-area');
  const weightInput = document.getElementById('neoWeightInput');
  const gaInput = document.getElementById('neoGaInput');
  const statusEl = document.getElementById('neoStatus');
  const content = document.getElementById('neoContent');
  const subtabs = document.querySelectorAll('.neo-subtab');

  let currentSub = 'ablauf';
  // Vier-Augen-Check: gilt nur für das Gewicht, bei dem bestätigt wurde
  const confirmed = new Map();

  const SUBTAB_TITEL = {
    ablauf: 'Ablaufschema (ERC 2025)', equipment: 'Equipment nach Gewicht',
    Reanimation: 'Reanimation: Medikamente', Kreislauf: 'Kreislauf und Schock',
    Metabolisch: 'Metabolisch / Neurologisch', PPHN: 'PPHN', Asphyxie: 'Asphyxie / Hypothermie'
  };

  function esc(s) {
    return String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  }

  function readInput() {
    const w = parseFloat(weightInput.value);
    const g = parseFloat(gaInput.value);
    return calc.resolveInput(isNaN(w) ? null : w, isNaN(g) ? null : g);
  }

  // ───────── statische Inhalte ─────────

  const ABLAUF = [
    { titel: '0 · Vorbereitung', farbe: 'slate', punkte: [
      'Risikofaktoren klären, Team und Aufgaben briefen, Equipment/Wärmequelle prüfen',
      'Zeit starten (Uhr/Timer)'
    ] },
    { titel: '1 · Bei Geburt', farbe: 'blue', punkte: [
      'Stabil und ohne Atemhilfe: Abnabeln ≥ 60 s verzögern (bei < 34 SSW eher länger). Nabelschnur bei < 28 SSW nicht ausstreichen',
      'Lebensrettende Maßnahmen nötig: innerhalb 30 s abnabeln',
      'Trocknen, Nasses entfernen, Kopf und Körper abdecken, unter vorgewärmtem Strahler. < 32 SSW: Plastikfolie/-sack',
      'Körpertemperatur 36,5–37,5 °C, regelmäßig oder kontinuierlich messen'
    ] },
    { titel: '2 · Beurteilen', farbe: 'blue', punkte: [
      'Atmung, Muskeltonus, Herzfrequenz (EKG oder Pulsoxymetrie). Hautfarbe ist unzuverlässig',
      'Rückenlage, Kopf neutral, ggf. Esmarch (am besten zu zweit)',
      'Kein routinemäßiges Absaugen, nur wenn die Lungenentfaltung misslingt',
      'Stimulieren (taktil)'
    ] },
    { titel: '3 · Beatmung (Atmung insuffizient oder HF < 100)', farbe: 'amber', punkte: [
      'Maske oder Nasenansatz, idealerweise innerhalb 60 s nach Geburt',
      '5 Inflationsatemzüge, bis 3 s lang',
      'Anschließend 30 Atemzüge/min, Inspirationszeit ca. 1 s. Atemzugvolumen 4–8 ml/kg (T-Stück-Gerät bevorzugt)',
      'Effektiv: sichtbare Thoraxhebung und steigende HF'
    ] },
    { titel: '4 · Kein Effekt: MR SOPA', farbe: 'amber', punkte: [
      'M Maske anpassen · R Reposition des Kopfes · S Suction (Absaugen) · O Open mouth/Esmarch · P Pressure erhöhen · A Alternativer Atemweg (Larynxmaske oder Intubation)',
      'Intubation: Videolaryngoskop bevorzugen, wenn verfügbar'
    ] },
    { titel: '5 · HF < 60/min trotz ≥ 30 s effektiver Beatmung', farbe: 'red', punkte: [
      'Thoraxkompression: Daumen-Umfassungs-Technik, untere Sternumhälfte, Tiefe ⅓ des a.-p. Durchmessers',
      'Verhältnis 3:1 (90 Kompressionen + 30 Beatmungen pro Minute), FiO₂ 100 %',
      'Supraglottischen Atemweg oder Intubation erwägen',
      'Notfallzugang: Nabelvene (UVK) oder intraossär'
    ] },
    { titel: '6 · HF < 60/min und nicht ansteigend nach ≥ 30 s CPR', farbe: 'red', punkte: [
      'Adrenalin 10–30 µg/kg i.v./i.o. (siehe Tab „Reanimation“), danach alle 4 Min. bei anhaltender Bradykardie',
      'Volumen 10 ml/kg bei Verdacht auf Hypovolämie. Blutzucker messen, Glukose NUR bei niedrigem Wert',
      'Ursachen: Pneumothorax, Hypovolämie, Atemwegsverlegung, Tubusfehllage'
    ] },
    { titel: '7 · Entscheidungen und Kommunikation', farbe: 'slate', punkte: [
      'Eltern informieren. Therapiebegrenzung bzw. -abbruch nur nach Rücksprache mit Neonatologie und Eltern (ERC 2025, Kapitel Ethik)',
      'Dokumentation: Zeiten, Maßnahmen, Medikamente, HF/SpO₂-Verlauf'
    ] }
  ];

  const SPO2_ZIELE = [['3 Min.', '70–75 %'], ['5 Min.', '80–85 %'], ['10 Min.', '85–95 %']];

  const INFO = {
    Kreislauf: [
      { titel: 'Schock beim Neugeborenen: Ursache einordnen', evidenz: 'C', punkte: [
        'Hypovolämisch (Blutverlust, Plazentalösung, fetomaternale Transfusion) · septisch · kardiogen · duktusabhängiges Vitium',
        'Zyanose oder Schock in der 1. Lebenswoche (Duktusverschluss): PGE1 sofort, nicht auf Echo warten',
        'Prä-/postduktale Blutdruck- und SpO₂-Differenz messen, Femoralispulse tasten, Laktat und BGA'
      ] }
    ],
    PPHN: [
      { titel: 'Erkennen und Basismaßnahmen', evidenz: 'B', punkte: [
        'Hypoxämie außer Verhältnis zum Lungenbefund, prä-/postduktale SpO₂-Differenz',
        'Vor iNO Echokardiographie: duktusabhängiges Vitium und TAPVC ausschließen',
        'Minimal Handling, Normothermie, Normoglykämie und -kalzämie, ausreichende Analgosedierung',
        'Beatmung: Lungenvolumen optimieren, pH und CO₂ im Zielbereich (SOP), früh Kontakt mit Transport-/ECMO-Zentrum',
        'Oxygenierungsindex berechnen, Eskalationsschwellen nach SOP (nicht ECMO-Kriterium)',
        'Sildenafil, Milrinon und Vasopressin nicht ohne Rücksprache mit dem Zentrum starten (UK-Pfade), internationale Leitlinien sehen Sildenafil bei iNO-Refraktärität vor'
      ], quelle: 'UK-PPHN-Review (Mohamed 2026, doi 10.7759/cureus.116003)' }
    ],
    Asphyxie: [
      { titel: 'Kriterien Therapeutische Hypothermie (Orientierung)', evidenz: 'C', punkte: [
        '≥ 36 SSW (Studien: ≥ 1800 g), Beginn innerhalb von 6 Lebensstunden',
        'A: pH ≤ 7,0 oder BE ≤ −16 mmol/l (Nabelarterie oder erste Lebensstunde) ODER pH 7,01–7,15/BE −10 bis −15,9 plus akutes Ereignis und 10-Min.-Apgar ≤ 5 oder Beatmung ≥ 10 Min.',
        'B: mittelschwere oder schwere Enzephalopathie (Sarnat/Thompson), ggf. aEEG-Veränderung',
        'AWMF 024/023 (2013, abgelaufen, in Überarbeitung) nennt pH < 7,0 in der Nabelarterie. Zentren-Kriterien weichen ab: SOP gilt'
      ], quelle: 'NICHD/TOBY-Standardkriterien, nicht gegen die Primärquelle geprüft' },
      { titel: 'Durchführung', evidenz: 'B', punkte: [
        'Zielkerntemperatur 33,5 °C (33–34 °C), rektal oder ösophageal, für 72 Stunden',
        'Danach langsam wiedererwärmen (üblich ≤ 0,5 °C/h auf 36,5 °C). Wert nach SOP',
        'Vor Verlegung passiv kühlen: Wärmequelle aus, keine Überkühlung (< 33 °C vermeiden), Temperatur engmaschig messen',
        'Frühzeitig Kontakt mit dem Kühlzentrum aufnehmen'
      ], quelle: 'Temperatur und Dauer: Hypothermie-Literatur (Düsseldorfer Dissertation, 2025-Review); Details nach SOP' },
      { titel: 'Begleitmaßnahmen', evidenz: 'C', punkte: [
        'Normoglykämie, Normokapnie, Hyperoxie und Hypokapnie vermeiden',
        'Krämpfe behandeln: Phenobarbital (siehe Karte), aEEG/EEG',
        'Analgosedierung (z. B. Morphin-Perfusor, siehe Karte), restriktive Flüssigkeitszufuhr',
        'Überwachen: Kreislauf (Bradykardie unter Kühlung), Gerinnung, Elektrolyte, Laktat, Nieren- und Leberwerte'
      ], quelle: 'Standardempfehlungen, nicht verifiziert' }
    ]
  };

  const FARBEN = {
    slate: 'border-slate-500', blue: 'border-blue-500', amber: 'border-amber-500', red: 'border-red-500'
  };

  const EVI_STYLE = {
    A: 'bg-green-900/40 text-green-300 border-green-700',
    B: 'bg-yellow-900/40 text-yellow-300 border-yellow-700',
    C: 'bg-orange-900/40 text-orange-300 border-orange-700',
    SOP: 'bg-blue-900/40 text-blue-300 border-blue-700'
  };

  function eviBadge(level) {
    return `<span class="text-[10px] font-bold px-2 py-0.5 rounded border ${EVI_STYLE[level] || EVI_STYLE.C}" title="${esc(NEO_EVIDENZ[level] || '')}">Evidenz ${esc(level)}</span>`;
  }

  // ───────── Renderer ─────────

  function renderAblauf(inp) {
    const p = inp.ok ? calc.respiratory(inp.kg, inp.ga) : null;
    const pipTxt = p ? `${p.pipInitial} cmH₂O` : '30 cmH₂O (≥ 32 SSW) · 25 cmH₂O (< 32 SSW)';
    const fio2Txt = p ? p.fio2Start : '21 % (≥ 32 SSW) · ≥ 30 % (< 32 SSW)';
    const vtTxt = p ? `${neoFmt(p.vtMin)}–${neoFmt(p.vtMax)} ml` : '4–8 ml/kg';
    let html = `
      <div class="bg-slate-800 border-2 border-pink-700 rounded-xl p-4">
        <h3 class="font-bold text-pink-300 mb-2">Beatmungsparameter ${p ? '(für dieses Kind)' : ''}</h3>
        <div class="grid grid-cols-2 gap-2 text-sm">
          <div class="bg-slate-900 rounded-lg p-2"><div class="text-[10px] uppercase text-slate-400">Start-Inflationsdruck</div><div class="font-bold">${esc(pipTxt)}</div></div>
          <div class="bg-slate-900 rounded-lg p-2"><div class="text-[10px] uppercase text-slate-400">Start-FiO₂</div><div class="font-bold">${esc(fio2Txt)}</div></div>
          <div class="bg-slate-900 rounded-lg p-2"><div class="text-[10px] uppercase text-slate-400">PEEP / CPAP-Start</div><div class="font-bold">6 cmH₂O</div></div>
          <div class="bg-slate-900 rounded-lg p-2"><div class="text-[10px] uppercase text-slate-400">Atemzugvolumen</div><div class="font-bold">${esc(vtTxt)}</div></div>
        </div>
        <div class="mt-3 text-xs text-slate-300">
          <div class="uppercase text-[10px] text-slate-400 mb-1">SpO₂-Ziele präduktal (rechte Hand), FiO₂ nach SpO₂ titrieren</div>
          <div class="flex gap-2">
            ${SPO2_ZIELE.map(z => `<div class="flex-1 bg-slate-900 rounded-lg p-2 text-center"><div class="text-[10px] text-slate-400">${z[0]}</div><div class="font-bold text-sm">${z[1]}</div></div>`).join('')}
          </div>
        </div>
        <div class="mt-2 text-xs text-slate-400">${eviBadge('A')} ERC 2025 (Hogeveen et al., doi 10.1016/j.resuscitation.2025.110766)</div>
      </div>`;
    ABLAUF.forEach(s => {
      html += `
      <div class="bg-slate-800 border-l-4 ${FARBEN[s.farbe]} rounded-xl p-4">
        <h3 class="font-bold mb-2">${esc(s.titel)}</h3>
        <ul class="list-disc pl-5 space-y-1 text-sm text-slate-200">
          ${s.punkte.map(x => `<li>${esc(x)}</li>`).join('')}
        </ul>
      </div>`;
    });
    html += `
      <div class="bg-red-950/40 border border-red-800 rounded-xl p-3 text-xs text-red-200">
        <b>Nicht mehr empfohlen (ERC 2025):</b> ${NEO_NICHT_MEHR_EMPFOHLEN.map(esc).join(' · ')}
      </div>`;
    return html;
  }

  function renderEquipment(inp) {
    if (!inp.ok) return needInput();
    const e = calc.equipment(inp.kg, inp.ga);
    const row = (k, v, hint) => `
      <div class="flex justify-between items-start gap-3 py-2 border-b border-slate-700 last:border-0">
        <div><div class="text-sm font-semibold">${esc(k)}</div>${hint ? `<div class="text-[11px] text-slate-400">${esc(hint)}</div>` : ''}</div>
        <div class="text-right font-bold text-lg text-green-400">${esc(v)}</div>
      </div>`;
    return `
      <div class="bg-slate-800 border-2 border-slate-700 rounded-xl p-4">
        <h3 class="font-bold text-pink-300 mb-1">${inp.weightG} g · ${inp.ga} SSW${inp.gaApprox ? ' (geschätzt)' : ''}</h3>
        ${row('Endotrachealtubus (ID, mm)', e.tubus, 'ohne Cuff')}
        ${row('Einführtiefe oral (ab Lippe)', e.tubusTiefe + ' cm', 'Gewicht (kg) + 6 cm. Lage per Auskultation, CO₂ und ggf. Röntgen prüfen')}
        ${row('Laryngoskop-Spatel', e.spatel, 'gängige Praxis')}
        ${row('Absaugkatheter', 'Ch ' + e.absaugCh, 'ca. Tubusgröße × 2')}
        ${row('Larynxmaske', e.lma, 'ERC 2025: v. a. > 34 SSW und > 1500 g')}
        ${row('Nabelvenenkatheter (UVK)', e.uvkGroesse, 'Notfall: ' + e.uvkTiefe)}
        ${row('Atemzugvolumen', e.vt, 'ERC 2025: 4–8 ml/kg')}
      </div>
      <div class="text-xs text-slate-400">${eviBadge('B')} Größen nach ERC-Tabelle (Gewicht/SSW) und gängiger Praxis. Nicht gegen den ERC-2025-Volltext geprüft, im Zweifel Tubus eine Größe kleiner bereithalten.</div>`;
  }

  function nf(v) { return neoFmt(v); }
  function rng(o, unit) {
    return o.min === o.max ? `${nf(o.min)} ${unit}` : `${nf(o.min)}–${nf(o.max)} ${unit}`;
  }

  function medCard(r, inp) {
    const stamp = confirmed.get(r.id);
    const isConfirmed = stamp === inp.weightG;
    let main = '', detail = '', warn = '';

    if (r.mode === 'fixed') {
      main = `<div class="text-2xl font-black text-green-400">${esc(r.fixed)}</div>`;
    } else if (r.mode === 'bolus') {
      const mainTxt = r.unit === 'ml' ? `${nf(r.total.start)} ml` : `${nf(r.total.start)} ${r.unit}`;
      main = `<div class="flex items-baseline gap-2 flex-wrap">
          <span class="text-4xl font-black text-green-400">${esc(mainTxt)}</span>
          <span class="text-sm text-slate-400">(${nf(r.perKg.start)} ${esc(r.perKgUnit)})</span></div>`;
      if (r.volume && r.unit !== 'ml') {
        detail += `<div class="text-sm mt-1">= <b>${nf(r.volume.start)} ml</b> <span class="text-slate-400">(${esc(r.conc.text)})</span></div>`;
      }
      if (r.perKg.min !== r.perKg.max) {
        detail += `<div class="text-xs text-slate-300 mt-1">Bereich ${rng(r.perKg, r.perKgUnit)} → ${rng(r.total, r.unit)}${r.volume ? ' = ' + rng(r.volume, 'ml') : ''}</div>`;
      }
      if (r.altVolume && r.volume.start < 0.2) {
        warn += `<div class="bg-orange-900/30 border border-orange-600 text-orange-200 text-xs p-2 rounded-lg mt-2">Volumen &lt; 0,2 ml: weiter verdünnen. ${esc(r.altConc.text)} → <b>${nf(r.altVolume.start)} ml</b></div>`;
      }
    } else if (r.mode === 'infusion') {
      main = `<div class="flex items-baseline gap-2 flex-wrap">
          <span class="text-4xl font-black text-green-400">${nf(r.rate.start)}</span>
          <span class="text-xl font-bold text-slate-300">ml/h</span>
          <span class="text-sm text-slate-400">(Start ${nf(r.perKg.start)} ${esc(r.perKgUnit)})</span></div>`;
      detail += `<div class="text-xs text-slate-300 mt-1">Bereich ${rng(r.perKg, r.perKgUnit)} → ${rng(r.rate, 'ml/h')}</div>`;
      detail += `<div class="text-xs text-slate-400 mt-1">Konzentration: ${esc(r.conc.text)}</div>`;
      if (r.rate.start < 0.2) {
        warn += `<div class="bg-orange-900/30 border border-orange-600 text-orange-200 text-xs p-2 rounded-lg mt-2">Sehr niedrige Laufrate (&lt; 0,2 ml/h): Verdünnung und Pumpengenauigkeit nach SOP prüfen.</div>`;
      }
    }

    const hinweise = r.hinweise.length
      ? `<ul class="list-disc pl-5 space-y-1 text-xs text-slate-300 mt-3 border-t border-slate-700 pt-2">${r.hinweise.map(h => `<li>${esc(h)}</li>`).join('')}</ul>` : '';

    return `
      <div class="bg-slate-800 p-4 rounded-xl border-2 ${isConfirmed ? 'border-green-500' : (r.kritisch ? 'border-red-800' : 'border-slate-700')} shadow-md">
        <div class="flex justify-between items-start gap-2 mb-1">
          <h3 class="font-bold text-lg text-pink-300">${esc(r.name)}</h3>
          ${eviBadge(r.evidenz)}
        </div>
        <div class="text-[11px] text-slate-400 mb-2">${esc(r.route)}${r.kritisch ? ' · <span class="text-red-400 font-semibold">Hochrisiko-Medikament</span>' : ''}</div>
        ${main}${detail}${warn}${hinweise}
        <div class="text-[10px] text-slate-500 mt-2">Quelle: ${esc(r.quelle)}</div>
        <button class="neo-confirm w-full mt-3 py-2 px-4 rounded-lg font-bold text-sm ${isConfirmed ? 'bg-green-600 text-white cursor-default' : 'bg-blue-600 hover:bg-blue-500 text-white'}"
                data-id="${esc(r.id)}" ${isConfirmed ? 'disabled' : ''}>
          ${isConfirmed ? '✓ Geprüft &amp; Bestätigt' : '👥 Vier-Augen-Check'}
        </button>
      </div>`;
  }

  function infoCard(c) {
    return `
      <div class="bg-slate-800 border-l-4 border-pink-500 rounded-xl p-4">
        <div class="flex justify-between items-start gap-2 mb-2">
          <h3 class="font-bold">${esc(c.titel)}</h3>${eviBadge(c.evidenz)}
        </div>
        <ul class="list-disc pl-5 space-y-1 text-sm text-slate-200">${c.punkte.map(x => `<li>${esc(x)}</li>`).join('')}</ul>
        ${c.quelle ? `<div class="text-[10px] text-slate-500 mt-2">Quelle: ${esc(c.quelle)}</div>` : ''}
      </div>`;
  }

  function needInput() {
    return '<p class="text-slate-400 text-center py-10">Bitte Gewicht (g) und/oder SSW eingeben …</p>';
  }

  function renderBereich(bereich, inp) {
    let html = '';
    if (bereich === 'Reanimation') {
      html += `<div class="bg-red-950/40 border border-red-800 rounded-xl p-3 text-xs text-red-200">
        <b>Nicht mehr empfohlen (ERC 2025):</b> ${NEO_NICHT_MEHR_EMPFOHLEN.map(esc).join(' · ')}</div>`;
    }
    (INFO[bereich] || []).forEach(c => { html += infoCard(c); });
    if (inp.ok) {
      calc.byBereich(bereich).forEach(m => {
        const r = calc.calculate(m.id, inp.kg);
        if (r) html += medCard(r, inp);
      });
    } else {
      html += needInput();
    }
    return html;
  }

  function render() {
    const inp = readInput();

    // Statuszeile
    let status = '';
    if (inp.ok) {
      const kat = calc.gaKategorie(inp.ga);
      status = `<span class="text-pink-300 font-semibold">${inp.weightG} g${inp.weightEstimated ? ' (geschätzt)' : ''}</span>
                · ${inp.ga} SSW${inp.gaApprox ? ' (geschätzt)' : ''} · ${esc(kat)}`;
      inp.warnings.forEach(w => { status += `<div class="mt-1 text-orange-300 font-semibold">⚠️ ${esc(w)}</div>`; });
    } else if (inp.error) {
      status = `<div class="text-red-400 font-semibold">⚠️ ${esc(inp.error)}</div>`;
    } else {
      status = '<span class="text-slate-400">Gewicht in Gramm und/oder SSW eingeben. Ohne Gewicht wird ein Schätzwert aus der SSW verwendet.</span>';
    }
    statusEl.innerHTML = status;

    subtabs.forEach(b => {
      const active = b.dataset.sub === currentSub;
      b.classList.toggle('active', active);
    });

    let html = `<h2 class="text-lg font-semibold">${esc(SUBTAB_TITEL[currentSub])}</h2>`;
    if (currentSub === 'ablauf') html += renderAblauf(inp);
    else if (currentSub === 'equipment') html += renderEquipment(inp);
    else html += renderBereich(currentSub, inp);

    html += `
      <div class="bg-slate-800/60 border border-slate-700 rounded-xl p-3 text-[11px] text-slate-400 space-y-1">
        <div><b>Evidenz:</b> ${eviBadge('A')} ${esc(NEO_EVIDENZ.A)}</div>
        <div>${eviBadge('B')} ${esc(NEO_EVIDENZ.B)}</div>
        <div>${eviBadge('C')} ${esc(NEO_EVIDENZ.C)}</div>
        <div class="pt-1">Entscheidungshilfe, ersetzt weder Leitlinie, Klinik-SOP noch ärztliche Prüfung. Jede Dosis und Verdünnung vor der Gabe unabhängig kontrollieren. SOP-Werte können in <code>neonatal-sop.js</code> hinterlegt werden.</div>
      </div>`;
    content.innerHTML = html;
  }

  // ───────── Events ─────────

  weightInput.addEventListener('input', render);
  gaInput.addEventListener('input', render);

  subtabs.forEach(b => b.addEventListener('click', () => {
    currentSub = b.dataset.sub;
    render();
  }));

  content.addEventListener('click', ev => {
    const btn = ev.target.closest('.neo-confirm');
    if (!btn) return;
    const inp = readInput();
    if (!inp.ok) return;
    confirmed.set(btn.dataset.id, inp.weightG);
    render();
  });

  window.NeoUI = {
    show(visible) {
      area.classList.toggle('hidden', !visible);
      if (visible) render();
    },
    render
  };
})();
