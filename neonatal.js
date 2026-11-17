/**
 * NeoCalc - Neugeborenen-Notfall: Berechnungen, Equipment und Medikamentendaten
 *
 * WICHTIG (klinische Sicherheit):
 *  - Jede Medikamentenkarte trägt ein Evidenz-Level:
 *      A = gegen Leitlinie / Übersichtsarbeit abgeglichen (ERC 2025)
 *      B = nur teilweise oder über Sekundärquellen abgeglichen
 *      C = Standarddosis aus der Praxis, NICHT gegen eine Quelle geprüft
 *    Level B und C müssen vor klinischem Einsatz mit Klinik-SOP / Formularium abgeglichen werden.
 *  - Klinik-SOP-Werte überschreiben die Leitlinienwerte: siehe neonatal-sop.js.
 */

const NEO_EVIDENZ = {
  A: 'Gegen ERC-Leitlinie 2025 / Übersichtsarbeit abgeglichen',
  B: 'Teilweise oder über Sekundärquellen abgeglichen. Mit SOP prüfen',
  C: 'Standarddosis, nicht gegen eine Quelle geprüft. Vor Einsatz mit SOP/Formularium abgleichen',
  SOP: 'Wert aus der Klinik-SOP'
};

// Grobe 50. Perzentile des Geburtsgewichts nach SSW in Gramm (Näherung nach Fenton, Mittel beider Geschlechter).
// Nur als Schätzwert, wenn das Gewicht unbekannt ist.
const NEO_GEWICHT_P50 = {
  23: 560, 24: 650, 25: 750, 26: 850, 27: 980, 28: 1100, 29: 1250, 30: 1400, 31: 1600,
  32: 1800, 33: 2000, 34: 2250, 35: 2500, 36: 2750, 37: 3000, 38: 3200, 39: 3350,
  40: 3450, 41: 3550, 42: 3600
};

// Plausibilitätsgrenzen (Eingabefehler abfangen, z. B. kg statt g)
const NEO_GEWICHT_MIN_G = 250;
const NEO_GEWICHT_MAX_G = 6500;

/**
 * Medikamentendaten.
 * mode:  'bolus' | 'infusion' | 'fixed'
 * dose:  { unit, min, max, start }  (pro kg; bei Infusion pro kg und Zeit -> per: 'min' | 'h')
 * conc:  { value, unit, text }      (value = Menge pro ml, gleiche Einheit wie dose.unit)
 */
const NEO_MEDICATIONS = [
  // ───────────────────────── REANIMATION ─────────────────────────
  {
    id: 'adrenalin_neo_iv', name: 'Adrenalin i.v. / i.o.', bereiche: ['Reanimation'], mode: 'bolus',
    route: 'UVK (bevorzugt) oder i.o.', kritisch: true, evidenz: 'A',
    dose: { unit: 'µg', min: 10, max: 30, start: 10 },
    conc: { value: 100, unit: 'µg', text: '1 mg (1 ml) + 9 ml NaCl 0,9 % = 100 µg/ml (1:10 000)' },
    altConc: { value: 10, text: '1 ml der 1:10 000-Lösung + 9 ml NaCl = 10 µg/ml (bei Volumen < 0,2 ml)' },
    hinweise: [
      'Bei HF < 60/min und nicht ansteigend nach ≥ 30 s Thoraxkompressionen mit Beatmung',
      'Bei anhaltender Bradykardie alle 4 Minuten wiederholen (ERC 2025)',
      'Danach mit NaCl 0,9 % nachspülen'
    ],
    quelle: 'ERC 2025 (Hogeveen et al.), Übersicht Mileder & Wagner 2026'
  },
  {
    id: 'adrenalin_neo_tracheal', name: 'Adrenalin endotracheal', bereiche: ['Reanimation'], mode: 'bolus',
    route: 'Endotracheal, nur Überbrückung', kritisch: true, evidenz: 'B',
    dose: { unit: 'µg', min: 100, max: 100, start: 100 },
    conc: { value: 100, unit: 'µg', text: '100 µg/ml (1:10 000) = 1 ml/kg' },
    hinweise: [
      'Nur solange kein UVK/i.o.-Zugang liegt',
      'Sobald UVK oder i.o. liegt: sofort i.v.-Dosis geben, unabhängig vom Zeitpunkt der tracheal Gabe',
      'Wirkung unsicher. Zugang hat Vorrang'
    ],
    quelle: 'Sekundärquelle (RCUK-Adaptation ERC 2025), Primärtext nicht eingesehen'
  },
  {
    id: 'nacl_neo_bolus', name: 'NaCl 0,9 % Volumenbolus', bereiche: ['Reanimation', 'Kreislauf'], mode: 'bolus',
    route: 'UVK / i.v. / i.o., über 5–10 Min.', kritisch: false, evidenz: 'B',
    dose: { unit: 'ml', min: 10, max: 10, start: 10 },
    hinweise: [
      'Nur bei Verdacht auf Hypovolämie oder Blutverlust (Blässe, schwacher Puls, HF-Anstieg bleibt trotz effektiver Reanimation aus)',
      'Bei akutem Blutverlust Blut (0 Rh-neg.) bevorzugen',
      'Wiederholung nach Re-Evaluation. Nicht > 20 ml/kg ohne Rücksprache mit dem Zentrum'
    ],
    quelle: 'ERC (2021, im 2025-Überblick nicht als geändert gelistet); 20-ml/kg-Grenze: UK-PPHN-Review'
  },
  {
    id: 'glukose_neo_bolus', name: 'Glukose 10 % Bolus', bereiche: ['Reanimation', 'Metabolisch'], mode: 'bolus',
    route: 'UVK / i.v. / i.o.', kritisch: false, evidenz: 'A',
    dose: { unit: 'ml', min: 2, max: 2, start: 2 },
    hinweise: [
      'ERC 2025: Blutzucker messen und NUR bei niedrigem Wert behandeln (kein empirischer Bolus)',
      '2 ml/kg G10 % = 200 mg/kg, über ca. 5 Minuten',
      'Schwellenwert nach SOP (häufig < 2,6 mmol/l bzw. < 47 mg/dl)',
      'Anschließend Erhaltung mit GIR (siehe Karte „Glukose Erhaltung“) und BZ-Kontrolle'
    ],
    quelle: 'ERC 2025, Übersicht Mileder & Wagner 2026'
  },

  // ───────────────────────── KREISLAUF ─────────────────────────
  {
    id: 'dopamin_neo', name: 'Dopamin', bereiche: ['Kreislauf'], mode: 'infusion',
    route: 'Perfusor, bevorzugt zentral', kritisch: true, evidenz: 'B',
    dose: { unit: 'µg', per: 'min', min: 5, max: 20, start: 5 },
    conc: { value: 1000, unit: 'µg', text: '50 mg auf 50 ml = 1 mg/ml (SOP-abhängig)' },
    hinweise: [
      'Start 5 µg/kg/min (BNFc), UK-Pfade beginnen mit 10; auf Wirkung titrieren, max. 20',
      'Bei PPHN > 15 µg/kg/min möglichst vermeiden (pulmonale Vasokonstriktion)',
      'Extravasation vermeiden (Nekrosen)'
    ],
    quelle: 'UK-PPHN-Review (BNFc, 4 UK-Leitlinien)'
  },
  {
    id: 'dobutamin_neo', name: 'Dobutamin', bereiche: ['Kreislauf'], mode: 'infusion',
    route: 'Perfusor', kritisch: false, evidenz: 'B',
    dose: { unit: 'µg', per: 'min', min: 5, max: 20, start: 5 },
    conc: { value: 1000, unit: 'µg', text: '50 mg auf 50 ml = 1 mg/ml (SOP-abhängig)' },
    hinweise: ['Inotrop bei Pumpversagen / niedrigem Herzzeitvolumen', 'Kann zu Tachykardie und Vasodilatation führen'],
    quelle: 'UK-PPHN-Review (BNFc, 4 UK-Leitlinien)'
  },
  {
    id: 'adrenalin_neo_infusion', name: 'Adrenalin Perfusor', bereiche: ['Kreislauf'], mode: 'infusion',
    route: 'Perfusor, zentral', kritisch: true, evidenz: 'B',
    dose: { unit: 'µg', per: 'min', min: 0.1, max: 1, start: 0.1 },
    conc: { value: 20, unit: 'µg', text: '1 mg auf 50 ml = 20 µg/ml' },
    hinweise: [
      'Mittel der Wahl bei Sepsis oder Hypotonie ohne PPHN',
      'Bei PPHN: > 0,5 µg/kg/min kann die Lungendurchblutung verschlechtern, Rücksprache Zentrum'
    ],
    quelle: 'UK-PPHN-Review (0,1–1,0 µg/kg/min)'
  },
  {
    id: 'noradrenalin_neo', name: 'Noradrenalin Perfusor', bereiche: ['Kreislauf'], mode: 'infusion',
    route: 'Perfusor, zentral', kritisch: true, evidenz: 'C',
    dose: { unit: 'µg', per: 'min', min: 0.05, max: 1, start: 0.05 },
    conc: { value: 20, unit: 'µg', text: '1 mg auf 50 ml = 20 µg/ml' },
    hinweise: ['Bei vasoplegischem Schock (warm, niedriger diastolischer Druck)', 'Auf Wirkung titrieren, Perfusion beurteilen'],
    quelle: 'Standarddosis, nicht verifiziert'
  },
  {
    id: 'hydrocortison_neo', name: 'Hydrocortison', bereiche: ['Kreislauf'], mode: 'bolus',
    route: 'i.v.', kritisch: false, evidenz: 'B',
    dose: { unit: 'mg', min: 1, max: 2.5, start: 1 },
    hinweise: [
      'Bei katecholaminrefraktärer Hypotonie, wiederholt alle 6–8 h',
      'UK-Pfade: 2,5 mg/kg alle 6 h nach Dopamin + Dobutamin bis je 20 µg/kg/min',
      'Möglichst vorher Cortisol abnehmen'
    ],
    quelle: 'UK-PPHN-Review (2,5 mg/kg q6h); 1 mg/kg als Startwert nicht verifiziert'
  },
  {
    id: 'alprostadil_neo', name: 'Alprostadil (PGE1)', bereiche: ['Kreislauf'], mode: 'infusion',
    route: 'Perfusor, bei Verdacht auf duktusabhängiges Vitium', kritisch: true, evidenz: 'B',
    dose: { unit: 'µg', per: 'min', min: 0.005, max: 0.05, start: 0.01 },
    conc: { value: 1, unit: 'µg', text: '50 µg auf 50 ml = 1 µg/ml (Verdünnung stark SOP-abhängig!)' },
    hinweise: [
      'Bei Zyanose oder Schock mit V.a. duktusabhängiges Vitium sofort starten, nicht auf das Echo warten',
      'Start 0,01 µg/kg/min (ANMF), Bereich 0,005–0,05. Niedrigste wirksame Dosis anstreben',
      'Zugelassene Startdosis 0,05–0,1 µg/kg/min. Bei fast verschlossenem Duktus nach Rücksprache Kinderkardiologie höher',
      'Apnoe in 12–30 % (v. a. > 0,02): Intubationsbereitschaft, ggf. Koffein. Außerdem Fieber, Hypotonie'
    ],
    quelle: 'ANMF-Protokoll, Yucel 2013 (doi 10.1017/S1047951113001522), Zulassungstext'
  },
  {
    id: 'adenosin_neo', name: 'Adenosin (SVT)', bereiche: ['Kreislauf'], mode: 'bolus',
    route: 'Rascher i.v.-Bolus mit NaCl-Flush', kritisch: true, evidenz: 'C',
    dose: { unit: 'mg', min: 0.1, max: 0.2, start: 0.1 },
    hinweise: [
      '1. Dosis 0,1 mg/kg, bei Persistenz 0,2 mg/kg (max. 0,3 mg/kg)',
      'Zuvor vagale Manöver (Eisbeutel auf das Gesicht), EKG-Dokumentation, Defibrillator bereit',
      'Hämodynamisch instabil: synchronisierte Kardioversion (0,5–1 J/kg)'
    ],
    quelle: 'Standarddosis, nicht verifiziert'
  },

  // ───────────────────────── METABOLISCH / NEUROLOGISCH ─────────────────────────
  {
    id: 'glukose_neo_gir', name: 'Glukose Erhaltung (GIR)', bereiche: ['Metabolisch'], mode: 'infusion',
    route: 'i.v., G10 %', kritisch: false, evidenz: 'C',
    dose: { unit: 'mg', per: 'min', min: 5, max: 8, start: 5 },
    conc: { value: 100, unit: 'mg', text: 'Glukose 10 % = 100 mg/ml' },
    hinweise: [
      'Im Anschluss an den Bolus. G10 % bei 5 mg/kg/min ≈ 72 ml/kg/d',
      'BZ-Kontrolle nach 30 Min., Ziel nach SOP',
      'Bei persistierender Hypoglykämie: Rücksprache Neonatologie/Endokrinologie, kritische Probe sichern'
    ],
    quelle: 'Standarddosis, nicht verifiziert'
  },
  {
    id: 'ca_gluconat_neo', name: 'Calciumgluconat 10 %', bereiche: ['Metabolisch'], mode: 'bolus',
    route: 'Langsam i.v. über 10–30 Min. unter EKG', kritisch: true, evidenz: 'C',
    dose: { unit: 'ml', min: 1, max: 2, start: 1 },
    hinweise: [
      '1–2 ml/kg Calciumgluconat 10 % = 100–200 mg/kg bei symptomatischer Hypokalzämie (Krampf)',
      'Auch bei Hyperkaliämie mit EKG-Veränderungen (Membranstabilisierung)',
      'EKG-Monitoring (Bradykardie), sicherer venöser Zugang, Extravasation vermeiden, nicht in die A. umbilicalis'
    ],
    quelle: 'Standarddosis, nicht verifiziert'
  },
  {
    id: 'phenobarbital_neo', name: 'Phenobarbital', bereiche: ['Metabolisch', 'Asphyxie'], mode: 'bolus',
    route: 'i.v. über 20 Min.', kritisch: true, evidenz: 'B',
    dose: { unit: 'mg', min: 20, max: 20, start: 20 },
    hinweise: [
      'Mittel der 1. Wahl bei neonatalen Krämpfen, unabhängig von der Ätiologie (ILAE 2023)',
      'Bei Persistenz Nachladung 10 mg/kg (bis Gesamtdosis 40 mg/kg) nach SOP',
      'Atemdepression und Hypotonie: Beatmungsbereitschaft',
      'Vorher Glukose, Calcium und Natrium prüfen. Wenn möglich EEG/aEEG'
    ],
    quelle: 'ILAE 2023 (Substanzwahl geprüft), Dosis aus Klinikpfaden (nicht im ILAE-Volltext geprüft)'
  },
  {
    id: 'levetiracetam_neo', name: 'Levetiracetam', bereiche: ['Metabolisch', 'Asphyxie'], mode: 'bolus',
    route: 'i.v. über 15 Min.', kritisch: false, evidenz: 'B',
    dose: { unit: 'mg', min: 40, max: 60, start: 40 },
    hinweise: [
      '2. Wahl nach Phenobarbital. Bei Herzerkrankung bevorzugt (ILAE 2023)',
      'Dosen in Klinikpfaden uneinheitlich (20–60 mg/kg), SOP prüfen'
    ],
    quelle: 'ILAE 2023 (Substanzwahl geprüft), Dosis aus Suchtreffern (Sharpe 2020)'
  },
  {
    id: 'midazolam_neo', name: 'Midazolam (Krampf)', bereiche: ['Metabolisch'], mode: 'bolus',
    route: 'Langsam i.v. über ca. 5 Min.', kritisch: true, evidenz: 'C',
    dose: { unit: 'mg', min: 0.05, max: 0.2, start: 0.1 },
    hinweise: [
      '2.-Linien-Option (ILAE 2023). Quellen uneinheitlich (0,05–0,2 mg/kg), Wert mit SOP abgleichen',
      'Atemdepression und Hypotonie, besonders mit Phenobarbital: Beatmungsbereitschaft'
    ],
    quelle: 'ILAE 2023 (Substanz), Dosis nicht verifiziert'
  },
  {
    id: 'pyridoxin_neo', name: 'Pyridoxin (Vitamin B6)', bereiche: ['Metabolisch'], mode: 'fixed',
    route: 'i.v.', kritisch: false, evidenz: 'C',
    fixed: '100 mg i.v. (Fixdosis)',
    hinweise: [
      'Therapieversuch bei klinischem Verdacht auf B6-abhängige Epilepsie und Krämpfen trotz 2.-Linien-Therapie (ILAE 2023)',
      'Apnoe-Risiko: Beatmungsbereitschaft, wenn möglich unter EEG'
    ],
    quelle: 'ILAE 2023 (Empfehlung geprüft), Fixdosis nicht verifiziert'
  },

  // ───────────────────────── PPHN ─────────────────────────
  {
    id: 'ino_neo', name: 'Inhalatives Stickstoffmonoxid (iNO)', bereiche: ['PPHN'], mode: 'fixed',
    route: 'Über Beatmungsgerät', kritisch: true, evidenz: 'B',
    fixed: 'Start 20 ppm (Maximum 20 ppm)',
    hinweise: [
      'Vorher Echokardiographie: duktusabhängiges Vitium / TAPVC ausschließen',
      'Höhere Dosen als 20 ppm bringen keinen Vorteil, erhöhen das Methämoglobin-Risiko',
      'Methämoglobin kontrollieren (z. B. alle 12 h, bei > 2 % neu bewerten)',
      'Entwöhnen: 5-ppm-Schritte alle 1–2 h bis 5 ppm, dann 1-ppm-Schritte. Nicht abrupt beenden'
    ],
    quelle: 'UK-PPHN-Review (4 Leitlinien einheitlich 20 ppm)'
  },
  {
    id: 'surfactant_neo', name: 'Surfactant (Poractant alfa)', bereiche: ['PPHN'], mode: 'bolus',
    route: 'Endotracheal (bzw. nach Hausstandard)', kritisch: false, evidenz: 'B',
    dose: { unit: 'mg', min: 100, max: 200, start: 200 },
    conc: { value: 80, unit: 'mg', text: 'Poractant alfa 80 mg/ml' },
    hinweise: [
      '200 mg/kg bei PPHN mit relevantem Surfactantmangel oder schwerem MAS, nicht routinemäßig bei jeder PPHN',
      'Zubereitung bestätigen (Produkt nennt der Pfad nicht, Rechnung gilt für Poractant alfa)',
      'Vorübergehend Hypoxie und Bradykardie möglich'
    ],
    quelle: 'UK-PPHN-Review, Fachinformation Poractant alfa'
  },
  {
    id: 'milrinon_neo', name: 'Milrinon', bereiche: ['PPHN'], mode: 'infusion',
    route: 'Perfusor, nur nach Rücksprache mit dem Zentrum', kritisch: true, evidenz: 'B',
    dose: { unit: 'µg', per: 'min', min: 0.25, max: 0.75, start: 0.25 },
    conc: { value: 200, unit: 'µg', text: '10 mg auf 50 ml = 200 µg/ml (SOP-abhängig)' },
    hinweise: [
      'Kann den Systemdruck senken: UK-Pfad empfiehlt vorher 10 ml/kg NaCl 0,9 % und Adrenalin parallel',
      'UK-Pfade nennen 0,5–0,75 µg/kg/min, Formularium 0,25–0,75',
      'Studienlage für Monotherapie oder Zusatz zu iNO begrenzt'
    ],
    quelle: 'UK-PPHN-Review'
  },
  {
    id: 'vasopressin_neo', name: 'Vasopressin', bereiche: ['PPHN'], mode: 'infusion',
    route: 'Perfusor, nur nach Rücksprache (ECMO-Zentrum)', kritisch: true, evidenz: 'B',
    dose: { unit: 'E', per: 'h', min: 0.02, max: 0.1, start: 0.02 },
    conc: { value: 0.2, unit: 'E', text: '10 E auf 50 ml = 0,2 E/ml (SOP-abhängig)' },
    hinweise: ['Systemische Hypotonie bei PPHN', 'Hyponatriämie und Perfusionsstörungen beachten'],
    quelle: 'UK-PPHN-Review (0,02–0,1 E/kg/h)'
  },
  {
    id: 'fentanyl_neo', name: 'Fentanyl Bolus', bereiche: ['PPHN'], mode: 'bolus',
    route: 'Langsam i.v.', kritisch: true, evidenz: 'B',
    dose: { unit: 'µg', min: 2, max: 2, start: 2 },
    hinweise: [
      'Zusätzliche Sedierung unter Beatmung, Minimal Handling',
      'Thoraxrigidität bei schneller Injektion. Stark verdünnen, langsam geben'
    ],
    quelle: 'UK-PPHN-Review (Boli 2 µg/kg)'
  },
  {
    id: 'morphin_neo', name: 'Morphin Perfusor', bereiche: ['PPHN', 'Asphyxie'], mode: 'infusion',
    route: 'Perfusor', kritisch: true, evidenz: 'B',
    dose: { unit: 'µg', per: 'h', min: 5, max: 20, start: 10 },
    conc: { value: 100, unit: 'µg', text: '5 mg auf 50 ml = 100 µg/ml (SOP-abhängig)' },
    hinweise: [
      'Analgosedierung (PPHN, Therapeutische Hypothermie)',
      'Formularium 5–20 µg/kg/h (max. 40). Atemdepression, Hypotonie, Harnverhalt'
    ],
    quelle: 'UK-PPHN-Review (Formularium 5–20 µg/kg/h)'
  }
];

const NEO_BEREICHE = ['Reanimation', 'Kreislauf', 'Metabolisch', 'PPHN', 'Asphyxie'];

// Medikamente, die nach ERC 2025 NICHT mehr in der Neugeborenen-Reanimation empfohlen werden
const NEO_NICHT_MEHR_EMPFOHLEN = ['Natriumbikarbonat (ILCOR: weder direkte noch indirekte Evidenz)', 'Naloxon (Cochrane: kein Nutzen belegt, Sicherheitsbedenken)'];

function neoFmt(n) {
  if (n === null || n === undefined || isNaN(n)) return '–';
  const a = Math.abs(n);
  const d = a >= 100 ? 0 : a >= 10 ? 1 : a >= 1 ? 2 : a >= 0.1 ? 3 : 4;
  let s = (Math.round(n * Math.pow(10, d)) / Math.pow(10, d)).toFixed(d);
  if (s.indexOf('.') >= 0) s = s.replace(/0+$/, '').replace(/\.$/, '');
  return s.replace('.', ',');
}

class NeoCalc {
  constructor(overrides) {
    const sop = overrides || (typeof NEO_SOP_OVERRIDES !== 'undefined' ? NEO_SOP_OVERRIDES : {});
    this.medications = NEO_MEDICATIONS.map(m => {
      const o = sop[m.id];
      if (!o) return m;
      return Object.assign({}, m, o, {
        dose: o.dose ? Object.assign({}, m.dose, o.dose) : m.dose,
        conc: o.conc ? Object.assign({}, m.conc, o.conc) : m.conc,
        evidenz: 'SOP',
        quelle: o.quelle || 'Klinik-SOP'
      });
    });
  }

  /** Gewichtsschätzung (g) aus SSW, nur wenn kein Gewicht bekannt ist. */
  estimateWeightG(ga) {
    if (!ga || isNaN(ga)) return null;
    const g = Math.min(42, Math.max(23, Math.round(ga)));
    return NEO_GEWICHT_P50[g];
  }

  /** SSW grob aus dem Gewicht ableiten (Umkehrung der P50-Tabelle). */
  estimateGaFromWeight(weightG) {
    let best = null, diff = Infinity;
    Object.keys(NEO_GEWICHT_P50).forEach(k => {
      const d = Math.abs(NEO_GEWICHT_P50[k] - weightG);
      if (d < diff) { diff = d; best = parseInt(k, 10); }
    });
    return best;
  }

  gaKategorie(ga) {
    if (ga === null || ga === undefined || isNaN(ga)) return null;
    if (ga < 28) return 'Extrem Frühgeborenes (< 28 SSW)';
    if (ga < 32) return 'Sehr Frühgeborenes (28–31 SSW)';
    if (ga < 34) return 'Moderat Frühgeborenes (32–33 SSW)';
    if (ga < 37) return 'Spät Frühgeborenes (34–36 SSW)';
    return 'Reifgeborenes (≥ 37 SSW)';
  }

  /**
   * Löst Gewicht und SSW zu einem belastbaren Eingabeobjekt auf.
   * @returns {{ok:boolean, error?:string, kg?:number, weightG?:number, ga?:number, gaApprox?:boolean,
   *            weightEstimated?:boolean, warnings:string[]}}
   */
  resolveInput(weightG, ga) {
    const warnings = [];
    const hasW = weightG !== null && weightG !== undefined && !isNaN(weightG) && weightG > 0;
    const hasGa = ga !== null && ga !== undefined && !isNaN(ga) && ga > 0;
    if (hasGa && (ga < 22 || ga > 44)) {
      return { ok: false, error: 'SSW außerhalb 22–44. Bitte prüfen.', warnings };
    }
    let w = weightG, weightEstimated = false;
    if (!hasW) {
      if (!hasGa) return { ok: false, error: null, warnings };
      w = this.estimateWeightG(ga);
      weightEstimated = true;
      warnings.push(`Gewicht unbekannt: Schätzwert ${w} g (50. Perzentile für ${Math.round(ga)} SSW). Echtes Gewicht sofort nachtragen.`);
    }
    if (w < NEO_GEWICHT_MIN_G || w > NEO_GEWICHT_MAX_G) {
      return {
        ok: false,
        error: `Gewicht ${w} g unplausibel (erlaubt ${NEO_GEWICHT_MIN_G}–${NEO_GEWICHT_MAX_G} g). Gewicht in GRAMM eingeben (z. B. 3400).`,
        warnings
      };
    }
    let gaUse = hasGa ? Math.round(ga) : null, gaApprox = false;
    if (!hasGa) {
      gaUse = this.estimateGaFromWeight(w);
      gaApprox = true;
      warnings.push(`SSW unbekannt: aus dem Gewicht grob auf ca. ${gaUse} SSW geschlossen. Das gilt nur für Beatmungsdruck und O₂-Start. Echte SSW eintragen, wenn bekannt.`);
    } else if (!weightEstimated) {
      const p50 = this.estimateWeightG(gaUse);
      const ratio = w / p50;
      if (ratio < 0.6 || ratio > 1.5) {
        warnings.push(`Gewicht ${w} g weicht stark vom Erwartungswert für ${gaUse} SSW ab (ca. ${p50} g). Mangelgeboren/Makrosomie oder Eingabefehler? Bitte prüfen.`);
      }
    }
    return { ok: true, kg: w / 1000, weightG: w, ga: gaUse, gaApprox, weightEstimated, warnings };
  }

  /** Beatmungs- und Reanimationsparameter nach ERC 2025. */
  respiratory(kg, ga) {
    const unter32 = ga < 32;
    return {
      pipInitial: unter32 ? 25 : 30,
      fio2Start: unter32 ? '≥ 30 %' : '21 % (Raumluft)',
      peep: 6,
      vtMin: Math.round(kg * 4 * 10) / 10,
      vtMax: Math.round(kg * 8 * 10) / 10,
      folie: unter32,
      supraglottisch: ga >= 34 && kg >= 1.5
    };
  }

  /** Equipment-Größen nach Gewicht (ERC-Tabelle Neugeborenen-Reanimation). */
  equipment(kg, ga) {
    let tubus, tubusMax, spatel;
    if (kg < 1) { tubus = '2,5'; tubusMax = 2.5; spatel = 'Miller 00'; }
    else if (kg < 2) { tubus = '3,0'; tubusMax = 3.0; spatel = 'Miller 0'; }
    else if (kg < 3) { tubus = '3,5'; tubusMax = 3.5; spatel = 'Miller 0'; }
    else { tubus = '3,5 (–4,0)'; tubusMax = 4.0; spatel = 'Miller 1'; }
    const resp = this.respiratory(kg, ga);
    return {
      tubus,
      tubusTiefe: neoFmt(Math.round((kg + 6) * 10) / 10),
      absaugCh: Math.round(tubusMax * 2),
      spatel,
      uvkGroesse: kg < 1.5 ? '3,5 Fr' : '5 Fr',
      uvkTiefe: '2–4 cm, nur bis Blutrückfluss',
      lma: resp.supraglottisch ? 'Größe 1' : 'Nicht empfohlen (< 34 SSW oder < 1500 g)',
      vt: `${neoFmt(resp.vtMin)}–${neoFmt(resp.vtMax)} ml (4–8 ml/kg)`
    };
  }

  /**
   * Berechnet ein Medikament für ein Gewicht.
   * @returns {object|null}
   */
  calculate(medId, kg) {
    const m = this.medications.find(x => x.id === medId);
    if (!m || !kg || kg <= 0) return null;
    const r = {
      id: m.id, name: m.name, mode: m.mode, route: m.route, kritisch: !!m.kritisch,
      evidenz: m.evidenz, quelle: m.quelle, hinweise: m.hinweise || [], bereiche: m.bereiche
    };
    if (m.mode === 'fixed') {
      r.fixed = m.fixed;
      return r;
    }
    const d = m.dose;
    const per = d.per ? '/' + d.per : '';
    r.unit = d.unit;
    r.perKgUnit = `${d.unit}/kg${per}`;
    const start = d.start !== undefined ? d.start : d.min;
    const range = (v) => ({ min: v.min * kg, max: v.max * kg, start: start * kg });
    r.perKg = { min: d.min, max: d.max, start };
    if (m.mode === 'bolus') {
      r.total = range(d);
      if (m.conc) {
        r.conc = m.conc;
        r.volume = { min: r.total.min / m.conc.value, max: r.total.max / m.conc.value, start: r.total.start / m.conc.value };
      }
      if (m.altConc) {
        r.altConc = m.altConc;
        r.altVolume = { min: r.total.min / m.altConc.value, max: r.total.max / m.altConc.value, start: r.total.start / m.altConc.value };
      }
    } else if (m.mode === 'infusion') {
      const factor = d.per === 'min' ? 60 : 1; // -> pro Stunde
      r.conc = m.conc;
      const ratePerH = (v) => (v * kg * factor) / m.conc.value;
      r.rate = { min: ratePerH(d.min), max: ratePerH(d.max), start: ratePerH(start) };
      r.total = range(d); // Menge pro Zeiteinheit
      r.totalPer = d.per || '';
    }
    return r;
  }

  byBereich(bereich) {
    return this.medications.filter(m => m.bereiche.indexOf(bereich) >= 0);
  }
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = { NeoCalc, NEO_MEDICATIONS, NEO_EVIDENZ, NEO_BEREICHE, NEO_NICHT_MEHR_EMPFOHLEN, neoFmt, NEO_GEWICHT_P50 };
}
