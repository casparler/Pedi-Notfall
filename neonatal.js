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
  K: 'Gegen Kinderformularium abgeglichen',
  S: 'Gegen Klinik-SOP (Intensivverordnung KITS/PZ, Stand 09/2023) abgeglichen',
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
 * Medikamentendaten. Dosierungen laut Kinderformularium (kinderformularium.de, Abruf 17.11.2026) bzw. ERC 2025.
 * mode:  'bolus' | 'infusion' | 'fixed'
 * dose:  { unit, min, max, start, per }  (pro kg; bei Infusion pro kg und Zeit -> per: 'min' | 'h')
 *        start = angezeigter Startwert (kann bei Initialdosis ausserhalb des Erhaltungsbereichs min..max liegen)
 * conc:  { value, text }                 (Menge pro ml, gleiche Einheit wie dose.unit)
 * gaMin/gaMax: Karte nur anzeigen, wenn SSW im Bereich (gaMax exklusiv)
 * evidenz: 'A' = ERC 2025, 'K' = Kinderformularium, 'S' = Klinik-SOP geprüft (alle drei ohne Anzeige), 'B'/'C' = nicht vollständig geprüft
 * Perfusor-Konzentrationen: Standardverdünnungen der Klinik-SOP (Intensivverordnung, Blatt 'Standard bis 10kg')
 */
const NEO_MEDICATIONS = [
  // ───────────────────────── REANIMATION ─────────────────────────
  {
    id: 'adrenalin_neo_iv', name: 'Adrenalin i.v. / i.o.', bereiche: ['Reanimation'], mode: 'bolus',
    route: 'UVK (bevorzugt) oder i.o.', kritisch: true, evidenz: 'A',
    dose: { unit: 'µg', min: 10, max: 30, start: 10 },
    conc: { value: 100, text: '1 mg (1 ml) + 9 ml NaCl 0,9 % = 100 µg/ml (1:10 000)' },
    altConc: { value: 10, text: '1 ml der 1:10 000-Lösung + 9 ml NaCl = 10 µg/ml (bei Volumen < 0,2 ml)' },
    hinweise: [
      'Bei HF < 60/min und nicht ansteigend nach ≥ 30 s Thoraxkompressionen mit Beatmung',
      'Bei anhaltender Bradykardie alle 4 Minuten wiederholen (ERC 2025, Formularium: alle 3–5 Min.)',
      'Danach mit NaCl 0,9 % nachspülen'
    ],
    quelle: 'ERC 2025, Kinderformularium (0,01–0,03 mg/kg)'
  },
  {
    id: 'adrenalin_neo_tracheal', name: 'Adrenalin endotracheal', bereiche: ['Reanimation'], mode: 'bolus',
    route: 'Endotracheal, einmalig', kritisch: true, evidenz: 'K',
    dose: { unit: 'µg', min: 50, max: 100, start: 100 },
    conc: { value: 100, text: '100 µg/ml (1:10 000) = 0,5–1 ml/kg' },
    hinweise: [
      'Nicht 1. Wahl, nur wenn kein i.v.-Zugang verfügbar ist',
      'Sobald UVK oder i.o. liegt: sofort i.v.-Dosis geben, unabhängig vom Zeitpunkt der tracheal Gabe'
    ],
    quelle: 'Kinderformularium (0,05–0,1 mg/kg, einmalig)'
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
    route: 'Perfusor, stets über ZVK', kritisch: true, evidenz: 'K',
    dose: { unit: 'µg', per: 'min', min: 2, max: 20, start: 2 },
    conc: { value: 1000, text: '50 mg auf 50 ml = 1 mg/ml (SOP-abhängig)' },
    hinweise: [
      'Klinik-SOP (KITS): Dopamin generell obsolet, Noradrenalin, Adrenalin oder Dobutamin bevorzugen',
      'Mit niedriger Dosierung beginnen und bei Bedarf schrittweise erhöhen',
      'Bei PPHN > 15 µg/kg/min möglichst vermeiden (pulmonale Vasokonstriktion)',
      'Frühgeborene: off-label'
    ],
    quelle: 'Kinderformularium (2–20 µg/kg/min)'
  },
  {
    id: 'dobutamin_neo', name: 'Dobutamin', bereiche: ['Kreislauf'], mode: 'infusion',
    route: 'Perfusor, vorzugsweise zentral (peripher bei Bedarf möglich)', kritisch: false, evidenz: 'K',
    dose: { unit: 'µg', per: 'min', min: 2, max: 20, start: 5 },
    conc: { value: 1000, text: '10 ml (5 mg/ml) + 40 ml NaCl 0,9 % = 1 mg/ml (SOP-Standard)' },
    hinweise: ['Initialdosis 5 µg/kg/min, Erhaltung 2–20 (Klinik-SOP: 5–20)', 'Inkompatibel mit Bikarbonat und stark alkalischen Lösungen', 'Frühgeborene: off-label'],
    quelle: 'Kinderformularium'
  },
  {
    id: 'adrenalin_neo_infusion', name: 'Adrenalin Perfusor', bereiche: ['Kreislauf'], mode: 'infusion',
    route: 'Perfusor, über ZVK (Extravasationsgefahr)', kritisch: true, evidenz: 'K',
    dose: { unit: 'µg', per: 'min', min: 0.02, max: 0.5, start: 0.05 },
    conc: { value: 10, text: '0,5 ml (1 mg/ml) + 49,5 ml NaCl 0,9 % = 10 µg/ml (SOP-Standard)' },
    hinweise: [
      'Startdosis 0,05 µg/kg/min (Klinik-SOP), Formularium-Bereich ab 0,02. Auf die gewünschte Wirkung titrieren (off-label)',
      'Gefahr renaler und mesenterialer Vasokonstriktion',
      'Bei PPHN: > 0,5 µg/kg/min kann die Lungendurchblutung verschlechtern'
    ],
    quelle: 'Kinderformularium (0,02–0,5 µg/kg/min), Klinik-SOP (Konzentration, Start)'
  },
  {
    id: 'noradrenalin_neo', name: 'Noradrenalin Perfusor', bereiche: ['Kreislauf'], mode: 'infusion',
    route: 'Perfusor, über ZVK', kritisch: true, evidenz: 'K',
    dose: { unit: 'µg', per: 'min', min: 0.05, max: 1, start: 0.05 },
    conc: { value: 10, text: '0,5 ml (1 mg/ml) + 49,5 ml NaCl 0,9 % = 10 µg/ml (SOP-Standard)' },
    hinweise: [
      'Dauerinfusion auf Wirkung titrieren (off-label). Formularium 0,05–0,5, Klinik-SOP 0,05–1 µg/kg/min',
      'Maximum 1 µg/kg/min bei Frühgeborenen < 37 SSW, 2 µg/kg/min bei Neugeborenen (Formularium)',
      'Wenn kein ZVK verfügbar: peripherer Beginn möglich, so bald wie möglich wechseln'
    ],
    quelle: 'Kinderformularium'
  },
  {
    id: 'hydrocortison_neo', name: 'Hydrocortison (Schock/Hypotonie)', bereiche: ['Kreislauf'], mode: 'bolus',
    route: 'i.v., 3 Einzeldosen pro Tag', kritisch: false, evidenz: 'K',
    dose: { unit: 'mg', min: 1, max: 1.67, start: 1 },
    hinweise: ['Formularium: 3–5 mg/kg/Tag in 3 Dosen (= 1–1,67 mg/kg alle 8 h), off-label', 'Dosis je nach klinischem Bild ausschleichen', 'Möglichst vorher Cortisol abnehmen'],
    quelle: 'Kinderformularium'
  },
  {
    id: 'alprostadil_neo', name: 'Alprostadil (PGE1)', bereiche: ['Kreislauf'], mode: 'infusion',
    route: 'Perfusor, bei Verdacht auf duktusabhängiges Vitium', kritisch: true, evidenz: 'K',
    dose: { unit: 'µg', per: 'min', min: 0.002, max: 0.02, start: 0.01 },
    conc: { value: 10, text: '1:50-Verdünnung: 0,5 ml Minprog 500 + 24,5 ml Glukose 5 % = 10 µg/ml (SOP-Standard)' },
    hinweise: [
      'Bei Zyanose oder Schock mit V.a. duktusabhängiges Vitium sofort starten, nicht auf das Echo warten',
      'Klinik-SOP: 2–20 ng/kg/min, hier Start 10 ng/kg/min. Formularium: Initialdosis 10–100, Erhaltung 5–100 ng/kg/min, bei weitgehend verschlossenem Duktus höhere Dosen nach Rücksprache Kinderkardiologie',
      'Nach Wirkung auf die niedrigste mögliche Dosis reduzieren. Therapie möglichst früh, bevorzugt bis zum 4. Lebenstag',
      'Eigener Zugang ohne Zuspritzmöglichkeit, Perfusor beschriften („Minprog nicht durchspritzen“), keine Polyurethan-Katheter (Rupturgefahr)',
      'Apnoe und Fieber sehr häufig (> 10 %): Intubationsbereitschaft. Weitere: Bradykardie, Hypotonie'
    ],
    quelle: 'Kinderformularium, Klinik-SOP (Blatt PGE1)'
  },
  {
    id: 'adenosin_neo', name: 'Adenosin (SVT)', bereiche: ['Kreislauf'], mode: 'bolus',
    route: 'Rascher i.v.-Bolus mit NaCl-Flush', kritisch: true, evidenz: 'K',
    dose: { unit: 'mg', min: 0.1, max: 0.3, start: 0.1 },
    hinweise: [
      '1. Dosis 0,1 mg/kg. Wenn unwirksam 0,2 mg/kg, danach 0,3 mg/kg, jeweils 1–2 Min. Abstand. Möglichst zentralvenös (Klinik-SOP)',
      'Keine Dosissteigerung, wenn die Arrhythmie endet und sofort wieder auftritt',
      'Kontinuierliches EKG, Reanimationsbereitschaft. Instabil: synchronisierte Kardioversion nach Pädiatrie-Leitlinie/SOP',
      'Methylxanthine (Koffein, Theophyllin) schwächen die Wirkung'
    ],
    quelle: 'Kinderformularium'
  },

  // ───────────────────────── METABOLISCH / NEUROLOGISCH ─────────────────────────
  {
    id: 'glukose_neo_gir', name: 'Glukose Erhaltung (GIR)', bereiche: ['Metabolisch'], mode: 'infusion',
    route: 'i.v., G10 %', kritisch: false, evidenz: 'C',
    dose: { unit: 'mg', per: 'min', min: 5, max: 8, start: 5 },
    conc: { value: 100, text: 'Glukose 10 % = 100 mg/ml' },
    hinweise: [
      'Im Anschluss an den Bolus. G10 % bei 5 mg/kg/min ≈ 72 ml/kg/d',
      'BZ-Kontrolle nach 30 Min., Ziel nach SOP',
      'Bei persistierender Hypoglykämie: Rücksprache Neonatologie/Endokrinologie, kritische Probe sichern'
    ],
    quelle: 'Standarddosis, nicht verifiziert (keine Formularium-Monographie)'
  },
  {
    id: 'ca_gluconat_neo', name: 'Calciumgluconat 10 % (Hypokalzämie)', bereiche: ['Metabolisch'], mode: 'bolus',
    route: 'i.v. über 30 Min. unter EKG', kritisch: true, evidenz: 'K',
    dose: { unit: 'mg', min: 200, max: 200, start: 200 },
    conc: { value: 94, text: 'Calciumgluconat 10 % = 940 mg/10 ml = 94 mg/ml' },
    hinweise: [
      '200 mg/kg = 18 mg/kg elementares Calcium = 0,45 mmol/kg',
      'Akute Hypokalzämie, Krämpfe bei Hyperphosphatämie/Hypokalzämie. Wiederholung je nach Klinik, Folgedosen nach Plasma-Calcium',
      'Nur langsam i.v. (verdünnt 1:10), Extravasation vermeiden, nicht i.m.'
    ],
    quelle: 'Kinderformularium'
  },
  {
    id: 'ca_gluconat_hyperk', name: 'Calciumgluconat 10 % (Hyperkaliämie)', bereiche: ['Metabolisch'], mode: 'bolus',
    route: 'Langsam i.v. über 5–10 Min. unter EKG', kritisch: true, evidenz: 'K',
    dose: { unit: 'mg', min: 47, max: 47, start: 47 },
    conc: { value: 94, text: 'Calciumgluconat 10 % = 94 mg/ml' },
    hinweise: ['47 mg/kg einmalig, max. 1880 mg (off-label)', '≙ 4,2 mg/kg elementares Calcium = 0,10 mmol/kg'],
    quelle: 'Kinderformularium'
  },
  {
    id: 'phenobarbital_neo', name: 'Phenobarbital (Krampf)', bereiche: ['Metabolisch', 'Asphyxie'], mode: 'bolus',
    route: 'Langsam i.v. (Infusion)', kritisch: true, evidenz: 'K',
    dose: { unit: 'mg', min: 20, max: 20, start: 20 },
    hinweise: [
      'Erste Wahl bei neonatalen Krämpfen. 20 mg/kg einmalig',
      'Falls nötig nach 1 Stunde zweite Dosis 10 mg/kg, bei persistierenden Anfällen weitere 10 mg/kg. Danach Midazolam',
      'Serumspiegel 10–40 µg/ml, wegen Akkumulation am Tag 3 bestimmen',
      'Atemdepression und Hypotonie: Beatmungsbereitschaft',
      'Vorher Glukose, Calcium und Natrium prüfen. Wenn möglich EEG/aEEG'
    ],
    quelle: 'Kinderformularium, ILAE 2023'
  },
  {
    id: 'levetiracetam_neo', name: 'Levetiracetam (Krampf)', bereiche: ['Metabolisch', 'Asphyxie'], mode: 'bolus',
    route: 'i.v.', kritisch: false, evidenz: 'K',
    dose: { unit: 'mg', min: 20, max: 20, start: 20 },
    hinweise: [
      '20 mg/kg/Dosis, bei Bedarf maximal zweimal wiederholen, mindestens 10 Minuten Abstand (insgesamt max. 60 mg/kg)',
      'Erhaltung 20–40 mg/kg/Tag in 2 Dosen (max. 60). Off-label',
      'Bei Herzerkrankung als 2.-Linien-Substanz bevorzugt (ILAE 2023)'
    ],
    quelle: 'Kinderformularium, ILAE 2023'
  },
  {
    id: 'midazolam_neo_fg', name: 'Midazolam Krampf (< 36 SSW)', bereiche: ['Metabolisch'], mode: 'bolus', gaMax: 36,
    route: 'Langsam i.v., dann Perfusor', kritisch: true, evidenz: 'K',
    dose: { unit: 'mg', min: 0.05, max: 0.05, start: 0.05 },
    hinweise: [
      'Gilt bis zu einem postnatalen Alter von 8 Wochen. Off-label',
      'Erhaltung 0,05–0,3 mg/kg/h, in Schritten von 0,05 mg/kg/h titrieren. Vor jeder Steigerung erneut Bolus',
      'Bei Anfallsfreiheit alle 24 h um 0,05 mg/kg/h reduzieren',
      'Verminderte Clearance, erhöhtes Risiko für Hypotonie und reduzierte zerebrale Perfusion'
    ],
    quelle: 'Kinderformularium'
  },
  {
    id: 'midazolam_neo_rg', name: 'Midazolam Krampf (≥ 36 SSW, ohne Hypothermie)', bereiche: ['Metabolisch'], mode: 'bolus', gaMin: 36,
    route: 'Langsam i.v., dann Perfusor', kritisch: true, evidenz: 'K',
    dose: { unit: 'mg', min: 0.1, max: 0.1, start: 0.1 },
    hinweise: [
      'Erhaltung 0,1–0,3 mg/kg/h, in Schritten von 0,1 mg/kg/h titrieren. Vor jeder Steigerung erneut Bolus',
      'Bei Anfallsfreiheit alle 24 h um 0,1 mg/kg/h reduzieren. Off-label',
      'Atemdepression und Hypotonie, besonders mit Phenobarbital: Beatmungsbereitschaft'
    ],
    quelle: 'Kinderformularium'
  },
  {
    id: 'midazolam_neo_hypo', name: 'Midazolam Krampf (≥ 36 SSW, MIT Hypothermie)', bereiche: ['Metabolisch', 'Asphyxie'], mode: 'bolus', gaMin: 36,
    route: 'Langsam i.v., dann Perfusor', kritisch: true, evidenz: 'K',
    dose: { unit: 'mg', min: 0.05, max: 0.05, start: 0.05 },
    hinweise: [
      'Erhaltung 0,05–0,1 mg/kg/h über maximal 24 Stunden. Vor jeder Steigerung erneut Bolus. Off-label',
      'Bei Hypothermie niedrigere Dosis als ohne Kühlung'
    ],
    quelle: 'Kinderformularium'
  },
  {
    id: 'pyridoxin_neo', name: 'Pyridoxin (Vitamin B6)', bereiche: ['Metabolisch'], mode: 'fixed',
    route: 'i.v.', kritisch: false, evidenz: 'S',
    fixed: '100 mg i.v. (bei Krampfanfall 100–200 mg)',
    hinweise: [
      'Klinik-SOP: 100 mg (= 2 ml der 50 mg/ml-Lösung), bei Krampfanfall 100–200 mg, Erhaltung 25 mg/d',
      'Therapieversuch bei klinischem Verdacht auf B6-abhängige Epilepsie und Krämpfen trotz 2.-Linien-Therapie (ILAE 2023)',
      'Apnoe-Risiko: Beatmungsbereitschaft, wenn möglich unter EEG'
    ],
    quelle: 'Klinik-SOP (Intensivverordnung), ILAE 2023'
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
    quelle: 'UK-PPHN-Review (4 Leitlinien einheitlich 20 ppm), keine Formularium-Monographie'
  },
  {
    id: 'surfactant_neo', name: 'Surfactant (Poractant alfa)', bereiche: ['PPHN'], mode: 'bolus',
    route: 'Endotracheal, bei Frühgeborenen bevorzugt per LISA', kritisch: false, evidenz: 'K',
    dose: { unit: 'mg', min: 100, max: 200, start: 200 },
    conc: { value: 80, text: 'Poractant alfa 80 mg/ml' },
    hinweise: [
      'RDS Frühgeborene < 37 SSW: 100–200 mg/kg, bei Bedarf mit 100 mg/kg wiederholen. Mekoniumaspiration (Neugeborene): 200 mg/kg, off-label, wenig Evidenz',
      'Bei PPHN nur bei relevantem Surfactantmangel oder schwerem MAS, nicht routinemäßig',
      'Nur durch in Neugeborenen-Stabilisierung erfahrenes Personal'
    ],
    quelle: 'Kinderformularium'
  },
  {
    id: 'milrinon_neo_fg', name: 'Milrinon (< 37 SSW)', bereiche: ['PPHN'], mode: 'infusion', gaMax: 37,
    route: 'Perfusor, nur nach Rücksprache (Kinderkardiologie)', kritisch: true, evidenz: 'K',
    startLabel: 'Initialdosis über 3 Std.', rangeLabel: 'Erhaltung',
    dose: { unit: 'µg', per: 'min', min: 0.15, max: 0.2, start: 0.75 },
    conc: { value: 100, text: '4 ml (1 mg/ml) + 36 ml NaCl 0,9 % = 100 µg/ml (SOP-Standard)' },
    hinweise: ['Initialdosis 0,75 µg/kg/min über 3 Stunden, dann Erhaltung 0,15–0,2 µg/kg/min', 'Klinik-SOP (alle Kinder ≤ 10 kg): Start 0,33, Bereich 0,37–0,75 µg/kg/min ohne Ladedosis, vor Gebrauch klären', 'Cave: Hypotonie nach der Initialdosis, Herzrhythmusstörungen. Dosierung nach Hämodynamik'],
    quelle: 'Kinderformularium'
  },
  {
    id: 'milrinon_neo', name: 'Milrinon (Neugeborene ≥ 37 SSW)', bereiche: ['PPHN'], mode: 'infusion', gaMin: 37,
    route: 'Perfusor, nur nach Rücksprache (Kinderkardiologie)', kritisch: true, evidenz: 'K',
    startLabel: 'Initialdosis über 1 Std.', rangeLabel: 'Erhaltung',
    dose: { unit: 'µg', per: 'min', min: 0.25, max: 0.75, start: 1.25 },
    conc: { value: 100, text: '4 ml (1 mg/ml) + 36 ml NaCl 0,9 % = 100 µg/ml (SOP-Standard)' },
    hinweise: ['Initialdosis 1,25 µg/kg/min über 1 Stunde, dann Erhaltung 0,25–0,75 µg/kg/min', 'Klinik-SOP (alle Kinder ≤ 10 kg): Start 0,33, Bereich 0,37–0,75 µg/kg/min ohne Ladedosis, vor Gebrauch klären', 'Cave: Hypotonie nach der Initialdosis, Herzrhythmusstörungen. Dosierung nach Hämodynamik'],
    quelle: 'Kinderformularium'
  },
  {
    id: 'vasopressin_neo', name: 'Vasopressin', bereiche: ['PPHN'], mode: 'infusion',
    route: 'Perfusor, Zweitlinie bei refraktärer Hypotonie', kritisch: true, evidenz: 'K',
    dose: { unit: 'E', per: 'h', min: 0.01, max: 0.12, start: 0.02 },
    conc: { value: 0.2, text: '10 E auf 50 ml = 0,2 E/ml (SOP-abhängig)' },
    hinweise: [
      'Hypotonie und vasodilatorischer Schock mit refraktärer Hypotonie, nach Effekt titrieren (off-label). Klinik-SOP: Start 0,02, Bereich 0,02–0,1 E/kg/h, über ZVK',
      'Zweitlinie, wenn Noradrenalin allein nicht ausreicht. Die Fachinformation rät bei Kindern ab',
      'Reduktion der kombinierten Vasopressoren kann nötig werden'
    ],
    quelle: 'Kinderformularium'
  },
  {
    id: 'fentanyl_neo', name: 'Fentanyl Bolus', bereiche: ['PPHN'], mode: 'bolus',
    route: 'Langsam i.v.', kritisch: true, evidenz: 'K',
    dose: { unit: 'µg', min: 0.5, max: 3, start: 1 },
    hinweise: [
      'Initialdosis 0,5–3 µg/kg. Erhaltung: Neugeborene 0,5–2 µg/kg/h, Frühgeborene < 37 SSW 0,5–3 µg/kg/h (off-label)',
      'Minimal Handling, Atemdepression beachten'
    ],
    quelle: 'Kinderformularium'
  },
  {
    id: 'morphin_neo', name: 'Morphin Perfusor', bereiche: ['PPHN', 'Asphyxie'], mode: 'infusion',
    route: 'Perfusor, unter Beobachtung', kritisch: true, evidenz: 'K',
    dose: { unit: 'µg', per: 'h', min: 3, max: 20, start: 3 },
    conc: { value: 100, text: '5 mg auf 50 ml = 100 µg/ml (Annahme, SOP-Standard 0,25 mg/ml)' },
    hinweise: [
      'Initialdosis 50–100 µg/kg über 60 Minuten, danach Erhaltung 3–20 µg/kg/h',
      'Bei unzureichender Wirkung stündliche Dosis als Bolus geben und schrittweise erhöhen',
      'Klinik-SOP (Standard für Kinder ≤ 10 kg): 25–100 µg/kg/h, Formularium Neugeborene 3–20 µg/kg/h. Dosisbereich vor Gebrauch klären',
      'Atemdepression, Hypotonie'
    ],
    quelle: 'Kinderformularium'
  }
];

// Evidenzstufen, die ohne Hinweis auf der Karte angezeigt werden (geprüft)
const NEO_VERIFIZIERT = ['A', 'K', 'S'];

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
    // SSW immer abrunden (31+6 gilt als 31): wirkt in die sichere Richtung (Frühgeborenen-Parameter)
    let gaUse = hasGa ? Math.floor(ga) : null, gaApprox = false;
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
      evidenz: m.evidenz, quelle: m.quelle, hinweise: m.hinweise || [], bereiche: m.bereiche,
      startLabel: m.startLabel || null, rangeLabel: m.rangeLabel || null
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

  /**
   * Medikamente eines Bereichs. Karten mit SSW-Bedingung (gaMin/gaMax, gaMax exklusiv) werden gefiltert.
   * Bei unbekannter oder nur abgeleiteter SSW werden alle Varianten gezeigt (Bedingung steht im Kartentitel).
   */
  byBereich(bereich, ga, gaApprox) {
    const filter = ga !== null && ga !== undefined && !gaApprox;
    return this.medications.filter(m => {
      if (m.bereiche.indexOf(bereich) < 0) return false;
      if (!filter) return true;
      if (m.gaMin !== undefined && ga < m.gaMin) return false;
      if (m.gaMax !== undefined && ga >= m.gaMax) return false;
      return true;
    });
  }
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = { NeoCalc, NEO_MEDICATIONS, NEO_EVIDENZ, NEO_VERIFIZIERT, NEO_BEREICHE, NEO_NICHT_MEHR_EMPFOHLEN, neoFmt, NEO_GEWICHT_P50 };
}
