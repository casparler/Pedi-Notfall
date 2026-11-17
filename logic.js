/**
 * PediCalc - Pädiatrische Notfall-Berechnungs-Engine
 * Berechnet Gewicht und Medikamentendosierungen für Kinder
 */

class PediCalc {
  constructor() {
    // Medikamentendaten direkt eingebettet (kein fetch nötig - iPhone-kompatibel)
    this.medications = [
      // REANIMATION
      {
        "id": "adrenalin_reanimation",
        "name": "Adrenalin (Epinephrin)",
        "gruppe": "Reanimation",
        "dosierung_pro_kg": 10,
        "einheit": "µg",
        "max_dosis": 1000,
        "hinweise": "I.V./I.O. während Reanimation, alle 3-5 Minuten wiederholbar",
        "verdünnung": "1 mg auf 10 ml NaCl 0,9% = 100 µg/ml",
        "kritisch": true
      },
      {
        "id": "amiodaron_reanimation",
        "name": "Amiodaron",
        "gruppe": "Reanimation",
        "dosierung_pro_kg": 5,
        "einheit": "mg",
        "max_dosis": 300,
        "hinweise": "Bei VF/VT nach 3. Schock, über 10-20 Min. I.V.",
        "verdünnung": "150 mg auf 100 ml Glukose 5%",
        "kritisch": true
      },

      // ATEMWEG / INTUBATION (nur Rocuronium; Einleitung: Propofol/Ketamin siehe Tab Sedierung)
      {
        "id": "rocuronium",
        "name": "Rocuronium",
        "gruppe": "Intubation",
        "dosierung_pro_kg": 1,
        "einheit": "mg",
        "max_dosis": 100,
        "bereich": "Notfall-/Schnellintubation 0,9–1,2 mg/kg (Standard 0,3–0,6 mg/kg)",
        "hinweise": "Muskelrelaxierung zur Intubation. Narkoseeinleitung/Sedierung zuvor: siehe Tab Sedierung (Propofol, Ketamin). Beatmung muss gesichert sein.",
        "kritisch": false
      },

      // SEDIERUNG
      {
        "id": "midazolam",
        "name": "Midazolam",
        "gruppe": "Sedierung",
        "dosierung_pro_kg": 0.1,
        "einheit": "mg",
        "max_dosis": 10,
        "bereich": "0,05–0,2 mg/kg i.v., bei unzureichender Wirkung wiederholen",
        "hinweise": "Sedierung/Anxiolyse, unter Beobachtung titrieren. Als Kombinationspartner von Ketamin geeignet. < 6 Monate off-label.",
        "kritisch": false
      },
      {
        "id": "propofol_sedierung",
        "name": "Propofol",
        "gruppe": "Sedierung",
        "dosierung_pro_kg": 1,
        "einheit": "mg",
        "max_dosis": 200,
        "bereich": "Sedierung 1–2 mg/kg Bolus, ggf. + bis 1 mg/kg",
        "hinweise": "Sedierung bei diagnostischen/chirurgischen Maßnahmen. Erhaltung 1,5–9 mg/kg/h. Narkoseeinleitung 2,5–4 mg/kg über 40–80 s. Sedierung Beatmeter 0,3–4 mg/kg/h, max. 48 h (Propofol-Infusionssyndrom). Kontraindiziert bei Mitochondriopathie.",
        "kritisch": true
      },
      {
        "id": "ketamin_sedierung",
        "name": "Ketamin (S-Ketamin)",
        "gruppe": "Sedierung",
        "dosierung_pro_kg": 0.5,
        "einheit": "mg",
        "max_dosis": 50,
        "bereich": "0,125–0,5 mg/kg (niedrig = Analgesie, hoch = Sedierung); Analgosedierung initial 0,5–1 mg/kg",
        "hinweise": "Langsam i.v. und nach Wirkung titrieren. Dosis gilt für S-Ketamin, razemisches Ketamin ist etwa halb so potent. Wird häufig mit Midazolam kombiniert (siehe Midazolam).",
        "kritisch": false
      },

      // ANALGESIE
      {
        "id": "sufentanil",
        "name": "Sufentanil",
        "gruppe": "Analgesie",
        "dosierung_pro_kg": 0.2,
        "einheit": "µg",
        "max_dosis": 50,
        "bereich": "0,2–0,5 µg/kg, max. 1 µg/kg bei großen Eingriffen",
        "hinweise": "Starkes Opioid, über mindestens 30 s langsam i.v. (Thoraxrigidität). Atemdepression: Beatmungsbereitschaft.",
        "kritisch": true
      },
      {
        "id": "morphin",
        "name": "Morphin",
        "gruppe": "Analgesie",
        "dosierung_pro_kg": 0.1,
        "einheit": "mg",
        "max_dosis": 10,
        "hinweise": "Analgesie, langsam titrieren, RR-Abfall möglich",
        "kritisch": false
      },

      // KARDIOVASKULÄR
      {
        "id": "adrenalin_schock",
        "name": "Adrenalin (Schock)",
        "gruppe": "Kardiovaskulär",
        "dosierung_pro_kg": 0.1,
        "einheit": "µg",
        "max_dosis": 10,
        "hinweise": "Perfusor bei Schock: 0.05-1 µg/kg/min, titrieren",
        "verdünnung": "1 mg auf 50 ml NaCl = 20 µg/ml",
        "kritisch": true
      },
      {
        "id": "noradrenalin",
        "name": "Noradrenalin",
        "gruppe": "Kardiovaskulär",
        "dosierung_pro_kg": 0.1,
        "einheit": "µg",
        "max_dosis": 10,
        "hinweise": "Bei vasoplegischem Schock: 0.05-1 µg/kg/min",
        "verdünnung": "1 mg auf 50 ml Glukose 5% = 20 µg/ml",
        "kritisch": true
      },
      {
        "id": "dobutamin",
        "name": "Dobutamin",
        "gruppe": "Kardiovaskulär",
        "dosierung_pro_kg": 5,
        "einheit": "µg",
        "max_dosis": 500,
        "hinweise": "Inotrop bei Herzinsuffizienz: 2-20 µg/kg/min",
        "kritisch": false
      },
      {
        "id": "atropin",
        "name": "Atropin",
        "gruppe": "Kardiovaskulär",
        "dosierung_pro_kg": 20,
        "einheit": "µg",
        "max_dosis": 500,
        "hinweise": "Bei Bradykardie, Mindestdosis 0.1 mg",
        "kritisch": false
      },

      // ANTIKONVULSIVA: konvulsiver Status epilepticus, Reihenfolge nach S1-Leitlinie GNP (AWMF 022-019, 09/2025)
      {
        "id": "se_midazolam_bukkal",
        "name": "Midazolam bukkal (Buccolam)",
        "gruppe": "Antikonvulsiva",
        "reihenfolge": 10,
        "stufe": "Stufe 1 · ab 5 min · ohne IV-Zugang",
        "einheit": "mg",
        "staffel": [
          { "bis_alter": 0.25, "pro_kg": 0.2, "text": "1–3 Monate (Formularium, nicht in Leitlinientabelle)" },
          { "bis_alter": 1, "dosis": 2.5, "text": "3 Monate–1 Jahr" },
          { "bis_alter": 5, "dosis": 5, "text": "1–<5 Jahre" },
          { "bis_alter": 10, "dosis": 7.5, "text": "5–<10 Jahre" },
          { "bis_alter": 999, "dosis": 10, "text": "10–18 Jahre" }
        ],
        "max_dosis": 10,
        "hinweise": "Altersspezifische Dosis nach Leitlinie, max. 10 mg. Zulassung ab 3 Monaten, bei jungen Säuglingen unter klinischer Überwachung. Mehr als 2 Benzodiazepin-Gaben erhöhen das Risiko einer Atemdepression: dann Stufe 2.",
        "kritisch": true
      },
      {
        "id": "se_diazepam_rektal",
        "name": "Diazepam rektal",
        "gruppe": "Antikonvulsiva",
        "reihenfolge": 11,
        "stufe": "Stufe 1 · ab 5 min · ohne IV-Zugang",
        "einheit": "mg",
        "staffel": [
          { "nach": "gewicht", "bis_gewicht": 15, "dosis": 5, "text": "< 15 kg" },
          { "nach": "gewicht", "bis_gewicht": 9999, "dosis": 10, "text": "ab 15 kg" }
        ],
        "max_dosis": 20,
        "hinweise": "Dosis nach Körpergewicht (Leitlinie). Alternative zu bukkalem Midazolam, wenn kein IV-Zugang vorhanden ist. Zulassung ab 6 Monaten. Formularium: Wiederholung nach 10 Minuten möglich.",
        "kritisch": true
      },
      {
        "id": "se_midazolam_nasal",
        "name": "Midazolam nasal",
        "gruppe": "Antikonvulsiva",
        "reihenfolge": 12,
        "stufe": "Stufe 1 · ab 5 min · ohne IV-Zugang (off-label)",
        "dosierung_pro_kg": 0.2,
        "einheit": "mg",
        "max_dosis": 10,
        "hinweise": "In Deutschland off-label. Bei Bedarf einmal nach 5 Minuten wiederholen.",
        "kritisch": true
      },
      {
        "id": "se_midazolam_im",
        "name": "Midazolam i.m.",
        "gruppe": "Antikonvulsiva",
        "reihenfolge": 13,
        "stufe": "Stufe 1 · ohne IV-Zugang (off-label)",
        "einheit": "mg",
        "staffel": [
          { "nach": "gewicht", "bis_gewicht": 13, "keine": true, "text": "< 13 kg" },
          { "nach": "gewicht", "bis_gewicht": 40.001, "dosis": 5, "text": "13–40 kg" },
          { "nach": "gewicht", "bis_gewicht": 9999, "dosis": 10, "text": "> 40 kg" }
        ],
        "max_dosis": 10,
        "hinweise": "Off-label. Anstelle von i.v. Lorazepam, wenn kein IV-Zugang gelingt (Leitlinie, Dosen nach Welch 2015). Alternativ intraossäre Gabe erwägen.",
        "kritisch": true
      },
      {
        "id": "se_midazolam_iv",
        "name": "Midazolam i.v.",
        "gruppe": "Antikonvulsiva",
        "reihenfolge": 20,
        "stufe": "Stufe 1 · IV-Benzodiazepin (≥ 5–10 min), eines wählen",
        "dosierung_pro_kg": 0.2,
        "einheit": "mg",
        "max_dosis": 5,
        "bereich": "0,1–0,2 mg/kg, max. 5 mg (Leitlinie)",
        "hinweise": "Bei Bedarf nach 5 Minuten einmal wiederholen (Formularium). Ausreichend hoch dosieren: zu niedrige Dosen sind ein häufiger Fehler. Mehr als 2 Gaben erhöhen das Risiko einer Atemdepression: dann Stufe 2.",
        "kritisch": true
      },
      {
        "id": "se_diazepam_iv",
        "name": "Diazepam i.v.",
        "gruppe": "Antikonvulsiva",
        "reihenfolge": 21,
        "stufe": "Stufe 1 · IV-Benzodiazepin (≥ 5–10 min), eines wählen",
        "dosierung_pro_kg": 0.2,
        "einheit": "mg",
        "max_dosis": 10,
        "bereich": "0,15–0,2 mg/kg, max. 10 mg (Leitlinie)",
        "hinweise": "Wiederholung bei Bedarf einmal nach 5–15 min. Mehr als 2 Gaben erhöhen das Risiko einer Atemdepression: dann Stufe 2. Beatmungsbereitschaft.",
        "kritisch": true
      },
      {
        "id": "se_lorazepam_iv",
        "name": "Lorazepam i.v.",
        "gruppe": "Antikonvulsiva",
        "reihenfolge": 22,
        "stufe": "Stufe 1 · IV-Benzodiazepin (≥ 5–10 min), eines wählen",
        "dosierung_pro_kg": 0.05,
        "einheit": "mg",
        "max_dosis": 4,
        "bereich": "Leitlinie Tabelle 3: 0,05 mg/kg. Formularium und PECARN-Studie: 0,1 mg/kg (max. 4 mg)",
        "hinweise": "Weniger lipophil als Diazepam: langsamerer Wirkeintritt, längere Wirkdauer. Eingeschränkte Anwendung bei Kindern < 4 Jahren. Bei persistierenden Anfällen einmalig nach 10–15 min wiederholen (Formularium).",
        "kritisch": true
      },
      {
        "id": "se_levetiracetam",
        "name": "Levetiracetam i.v.",
        "gruppe": "Antikonvulsiva",
        "reihenfolge": 30,
        "stufe": "Stufe 2 · Zweitlinie (Klinik, Monitoring) · bevorzugt",
        "dosierung_pro_kg": 40,
        "einheit": "mg",
        "max_dosis": 4500,
        "hinweise": "Kurzinfusion über 10 Minuten (off-label). Max. 4500 mg bei Jugendlichen/Erwachsenen. In der Leitlinie neben Phenobarbital bevorzugt, gleich wirksam wie Phenytoin, geringes Interaktionsrisiko, kein hepatischer Metabolismus, geringeres Risiko für kardiorespiratorische Nebenwirkungen.",
        "kritisch": false
      },
      {
        "id": "se_phenobarbital",
        "name": "Phenobarbital i.v.",
        "gruppe": "Antikonvulsiva",
        "reihenfolge": 31,
        "stufe": "Stufe 2 · Zweitlinie (Klinik, Monitoring) · bevorzugt",
        "dosierung_pro_kg": 20,
        "einheit": "mg",
        "bereich": "10–20 mg/kg (Leitlinie)",
        "hinweise": "EKG- und Blutdruck-Monitoring: arterielle Hypotonie, Atemdepression. Starker Enzyminduktor mit zahlreichen Interaktionen. Die Leitlinie nennt als Maximaldosis für Jugendliche/Erwachsene 200 mg, das passt nicht zu 10–20 mg/kg: bei großen Kindern Dosis ärztlich prüfen.",
        "kritisch": true
      },
      {
        "id": "se_phenytoin",
        "name": "Phenytoin i.v.",
        "gruppe": "Antikonvulsiva",
        "reihenfolge": 32,
        "stufe": "Stufe 2 · Zweitlinie (Klinik, Monitoring)",
        "dosierung_pro_kg": 20,
        "einheit": "mg",
        "max_dosis": 1500,
        "bereich": "10–20 mg/kg, max. 1500 mg (Leitlinie)",
        "hinweise": "Langsame Kurzinfusion über 20 Minuten, gelöst in NaCl 0,9 %. EKG- und Blutdruck-Monitoring (Hypotonie, Bradykardie, AV-Block). Sicherer IV-Zugang: Gewebenekrose bei Extravasat. Kann bei SCN1A-Epilepsien (Dravet-Syndrom) Anfälle verstärken.",
        "kritisch": true
      },
      {
        "id": "se_valproat",
        "name": "Valproat i.v.",
        "gruppe": "Antikonvulsiva",
        "reihenfolge": 33,
        "stufe": "Stufe 2 · Zweitlinie (Klinik, Monitoring)",
        "dosierung_pro_kg": 20,
        "einheit": "mg",
        "max_dosis": 3000,
        "bereich": "20–40 mg/kg, max. 3000 mg (Leitlinie)",
        "hinweise": "Kurzinfusion. KONTRAINDIKATION: Mitochondriopathie (z. B. POLG/Alpers), Harnstoffzyklusdefekt, ungeklärte metabolische Erkrankung. Erhöhtes Leberrisiko bei Kindern < 2 Jahren, Polytherapie und ungeklärter Entwicklungsstörung. Weitere Risiken: Thrombopenie, Hyperammonämie, Pankreatitis, Gerinnungsstörung.",
        "kritisch": true
      },
      {
        "id": "se_midazolam_dauer",
        "name": "Midazolam Dauerinfusion",
        "gruppe": "Antikonvulsiva",
        "reihenfolge": 40,
        "stufe": "Stufe 3 · refraktär (Intensivstation, Narkose, EEG)",
        "dosierung_pro_kg": 0.1,
        "einheit": "mg",
        "bereich": "Bolus 0,1 mg/kg, dann 0,1 mg/kg/h",
        "hinweise": "Intubation und Beatmung, EEG-Monitoring (Burst Suppression). Erhaltung alle 5 Minuten um 0,1 mg/kg/h steigern, vor jeder Steigerung erneut Bolus 0,1 mg/kg, max. 1 mg/kg/h. Narkose meist 24–48 h, dann stufenweise beenden.",
        "kritisch": true
      },
      {
        "id": "se_thiopental",
        "name": "Thiopental",
        "gruppe": "Antikonvulsiva",
        "reihenfolge": 41,
        "stufe": "Stufe 3 · refraktär (Intensivstation, Narkose, EEG)",
        "dosierung_pro_kg": 5,
        "einheit": "mg",
        "bereich": "Bolus 5 mg/kg, dann 5 mg/kg/h (max. 10 mg/kg/h)",
        "hinweise": "Intubation und Beatmung, EEG-Monitoring. Bolus alle 20 min wiederholen bis Burst Suppression (30 s). Erhaltung um 1–2 mg/kg/h steigern, max. 10 mg/kg/h. Atemfunktion und Herzleistung vermindert, Gewebenekrose bei Paravasat. Propofol ist nachrangig (Propofol-Infusionssyndrom, siehe Tab Sedierung).",
        "kritisch": true
      },

      // ATEMWEGE: Status asthmaticus (Stufenschema laut Kinderformularium) und Pseudokrupp
      {
        "id": "salbutamol",
        "name": "Salbutamol inhalativ (Vernebler)",
        "gruppe": "Bronchodilatator",
        "reihenfolge": 10,
        "stufe": "Stufe 1 · Asthmaanfall (Sauerstoff!)",
        "einheit": "mg",
        "staffel": [
          { "bis_alter": 5, "dosis": 2.5, "text": "< 5 Jahre" },
          { "bis_alter": 999, "dosis": 5, "text": "5–18 Jahre" }
        ],
        "max_dosis": 5,
        "bereich": "Aerosol alternativ 400–800 µg, alle 10–20 min wiederholbar",
        "hinweise": "Bei unzureichendem Ansprechen zusätzlich Prednisolon; bei schwerem Anfall zusätzlich Ipratropium; bei lebensbedrohlichem Anfall Salbutamol kontinuierlich inhalieren + Sauerstoff + Prednisolon i.v. + Ipratropium.",
        "kritisch": false
      },
      {
        "id": "ipratropium",
        "name": "Ipratropiumbromid inhalativ",
        "gruppe": "Bronchodilatator",
        "reihenfolge": 11,
        "stufe": "Stufe 1 · schwerer Anfall (zusätzlich zu Salbutamol)",
        "einheit": "mg",
        "staffel": [
          { "bis_alter": 5, "dosis": 0.25, "text": "1 Monat–5 Jahre" },
          { "bis_alter": 999, "dosis": 0.5, "text": "5–18 Jahre" }
        ],
        "max_dosis": 0.5,
        "bereich": "Aerosol alternativ 80 µg in Kombination mit Salbutamol",
        "hinweise": "Vernebler in Kombination mit Salbutamol. Laut Formularium bei Kindern < 5 Jahren frühestens nach 6 h wiederholen, max. 1 mg/Tag.",
        "kritisch": false
      },
      {
        "id": "prednisolon",
        "name": "Prednisolon i.v.",
        "gruppe": "Bronchodilatator",
        "reihenfolge": 12,
        "stufe": "Stufe 1 · ab unzureichendem Ansprechen",
        "dosierung_pro_kg": 1,
        "einheit": "mg",
        "tagesdosis": true,
        "teiler": 2,
        "max_dosis": 40,
        "bereich": "Tagesdosis 1–2 mg/kg, max. 40 mg/Tag, 3–5 Tage",
        "hinweise": "Tagesdosis auf 2 Gaben verteilen. Oral gleichwertig (Saft), wenn möglich. Ausschleichen nicht nötig.",
        "kritisch": false
      },
      {
        "id": "magnesium_asthma",
        "name": "Magnesiumsulfat i.v. (Asthma)",
        "gruppe": "Bronchodilatator",
        "reihenfolge": 20,
        "stufe": "Stufe 2 · therapierefraktärer Anfall (Status asthmaticus)",
        "dosierung_pro_kg": 40,
        "einheit": "mg",
        "max_dosis": 2000,
        "hinweise": "Über 10–15 Minuten (off-label). Verdünnt infundieren, RR und EKG überwachen (Hypotonie, Flush, Atemdepression bei Überdosierung).",
        "kritisch": false
      },
      {
        "id": "reproterol_asthma",
        "name": "Reproterol i.v. (Status asthmaticus)",
        "gruppe": "Bronchodilatator",
        "reihenfolge": 30,
        "stufe": "Stufe 3 · Status asthmaticus (Intensivstation)",
        "dosierung_pro_kg": 1.2,
        "einheit": "µg",
        "bereich": "Alternativ 1 µg/kg/min über 10 min; dann 0,2–2 µg/kg/min",
        "hinweise": "Ab 3 Monaten. Bolus, dann Dauerinfusion nach Wirkung in 0,1-µg/kg/min-Schritten alle 10–30 min titrieren, Herzfrequenz überwachen (max. 200/min), Kalium kontrollieren. Therapiedauer 36–48 h, dann über 6–24 h reduzieren.",
        "kritisch": true
      },
      {
        "id": "adrenalin_croup",
        "name": "Adrenalin (Inhalativ)",
        "gruppe": "Bronchodilatator",
        "reihenfolge": 90,
        "stufe": "Pseudokrupp / Epiglottitis",
        "dosierung_pro_kg": 0.5,
        "einheit": "mg",
        "max_dosis": 5,
        "hinweise": "Bei Pseudokrupp/Epiglottitis inhalativ",
        "verdünnung": "Mit NaCl 0.9% auf 3-5 ml verdünnen",
        "kritisch": false
      },

      // ELEKTROLYTE / GLUKOSE
      {
        "id": "glukose",
        "name": "Glukose 10%",
        "gruppe": "Elektrolyte",
        "dosierung_pro_kg": 2,
        "einheit": "ml",
        "max_dosis": 200,
        "hinweise": "Bei Hypoglykämie, entspricht 0.2 g/kg Glukose",
        "kritisch": false
      },
      {
        "id": "calcium",
        "name": "Calcium-Chlorid 10%",
        "gruppe": "Elektrolyte",
        "dosierung_pro_kg": 0.2,
        "einheit": "ml",
        "max_dosis": 20,
        "hinweise": "Bei Hypocalcämie/Hyperkalämie, langsam I.V. unter EKG",
        "kritisch": true
      },
      {
        "id": "magnesium_elektrolyt",
        "name": "Magnesiumsulfat (Hypomagnesiämie)",
        "gruppe": "Elektrolyte",
        "dosierung_pro_kg": 25,
        "einheit": "mg",
        "max_dosis": 2000,
        "bereich": "25–50 mg/kg, max. 2 g; Erhaltung 3–20 mg/kg/h",
        "hinweise": "Hypomagnesiämie, ventrikuläre Arrhythmien (Torsade-de-pointes). Bolus über 3 Minuten (Formularium), bei Bedarf wiederholen, EKG-Monitoring. Bei Arrhythmie off-label.",
        "kritisch": true
      },
      {
        "id": "phosphat",
        "name": "Natriumglycerophosphat (Phosphat)",
        "gruppe": "Elektrolyte",
        "dosierung_pro_kg": 0.2,
        "einheit": "mmol",
        "max_dosis": 20,
        "bereich": "1 Monat–2 Jahre 0,2–0,5 mmol/kg/Tag, 2–18 Jahre 0,2 mmol/kg/Tag, in 1 Dosis",
        "hinweise": "Hypophosphatämie. Nur verdünnt, Infusionsdauer mindestens 8 Stunden, max. 20 mmol Phosphat/h. Natriumgehalt beachten. KONTRAINDIKATION: Hyperphosphatämie, Hypernatriämie, Hypokalzämie, Niereninsuffizienz. Phosphat im Serum kontrollieren.",
        "kritisch": true
      },
      {
        "id": "natriumbicarbonat",
        "name": "Natriumbicarbonat 8.4%",
        "gruppe": "Elektrolyte",
        "dosierung_pro_kg": 1,
        "einheit": "ml",
        "max_dosis": 100,
        "hinweise": "Bei schwerer Azidose/Hyperkaliämie, 1:1 mit Aqua verdünnen",
        "verdünnung": "1:1 mit Aqua dest. verdünnen auf 4.2%",
        "kritisch": true
      },

      // ANTIDOTE / ANTAGONISTEN
      {
        "id": "naloxon",
        "name": "Naloxon",
        "gruppe": "Antidot",
        "dosierung_pro_kg": 10,
        "einheit": "µg",
        "max_dosis": 400,
        "hinweise": "Opioid-Antagonist, wiederholbar alle 2-3 Min.",
        "kritisch": false
      },
      {
        "id": "flumazenil",
        "name": "Flumazenil",
        "gruppe": "Antidot",
        "dosierung_pro_kg": 10,
        "einheit": "µg",
        "max_dosis": 200,
        "hinweise": "Benzodiazepin-Antagonist, CI: Krampfanamnese",
        "kritisch": true
      }
    ];
  }

  /**
   * Lädt Medikamentendaten (Legacy-Funktion für Kompatibilität)
   * Daten sind jetzt direkt eingebettet, daher sofort verfügbar
   */
  async loadMedications() {
    // Daten sind bereits im Constructor geladen
    return Promise.resolve();
  }

  /**
   * Schätzt das Körpergewicht basierend auf dem Alter
   * 
   * Medizinische Formeln:
   * - Säuglinge < 1 Jahr (0-12 Monate): 
   *   Neugeborene ~3.5 kg + (Alter in Monaten * 0.5 kg)
   * - Kinder 1-10 Jahre: (Alter in Jahren + 4) × 2
   * - Kinder > 10 Jahre: Alter × 3 - 10 (bis max. 70 kg)
   * 
   * @param {number} ageYears - Alter in Jahren (kann Dezimalzahl sein, z.B. 0.5 für 6 Monate)
   * @returns {number} Geschätztes Gewicht in kg
   */
  estimateWeight(ageYears) {
    // Säuglinge < 1 Jahr (präzise Berechnung für 0-12 Monate)
    if (ageYears < 1) {
      const ageMonths = ageYears * 12;
      
      // Neugeborene (0-1 Monate): 3.5 kg Durchschnitt
      if (ageMonths < 1) {
        return 3.5;
      }
      
      // 1-12 Monate: Basis 3.5 kg + 0.5 kg pro Monat
      // (entspricht ca. 500g Gewichtszunahme pro Monat im ersten Jahr)
      return 3.5 + (ageMonths * 0.5);
    }
    
    // Kinder 1-10 Jahre: Standard-Formel (Alter + 4) × 2
    if (ageYears >= 1 && ageYears <= 10) {
      return (ageYears + 4) * 2;
    }
    
    // Kinder > 10 Jahre: Alter × 3 - 10
    // Mit oberer Grenze von 70 kg für Berechnungssicherheit
    if (ageYears > 10) {
      const weight = ageYears * 3 - 10;
      return Math.min(weight, 70);
    }
    
    return null;
  }

  /**
   * Schätzt das Alter (Jahre) aus dem Gewicht (Umkehrung von estimateWeight).
   * Wird nur für altersgestaffelte Dosen genutzt, wenn kein Alter eingegeben wurde.
   */
  ageFromWeight(weight) {
    if (weight < 10) return Math.max(0, (weight - 3.5) / 0.5) / 12;
    if (weight <= 28) return weight / 2 - 4;
    return (weight + 10) / 3;
  }

  /**
   * Berechnet die Medikamentendosis basierend auf Gewicht (oder Alter bei altersgestaffelten Dosen)
   * Beachtet automatisch die maximale Einzeldosis
   *
   * @param {string} medId - Medikamenten-ID
   * @param {number} weight - Körpergewicht in kg
   * @param {number} age - Alter in Jahren (optional, für Plausibilitätsprüfung und Altersdosen)
   * @returns {object|null} Dosis-Objekt mit berechneter Dosis, Einheit und Hinweisen
   */
  calculateDose(medId, weight, age = null) {
    const medication = this.medications.find(med => med.id === medId);

    if (!medication) {
      console.error(`Medikament mit ID "${medId}" nicht gefunden`);
      return null;
    }

    if (!weight || weight <= 0) {
      console.error('Ungültiges Gewicht');
      return null;
    }

    // Plausibilitätsprüfung: Gewicht vs. Alter
    let weightPlausibilityWarning = null;
    if (age !== null && age > 0) {
      const estimatedWeight = this.estimateWeight(age);
      const deviation = Math.abs(weight - estimatedWeight);
      const deviationPercent = (deviation / estimatedWeight) * 100;

      if (deviationPercent > 50) {
        weightPlausibilityWarning = `⚠️ WARNUNG: Gewicht ${weight} kg erscheint ungewöhnlich für Alter ${age} Jahre (erwartet: ~${Math.round(estimatedWeight * 10) / 10} kg)`;
      }
    }

    // Berechnung: altersgestaffelte Fixdosis oder Dosierung pro kg
    let calculatedDose;
    let formula;
    let altersHinweis = null;
    let nichtVerfuegbar = null;
    if (medication.staffel) {
      const nachGewicht = medication.staffel[0].nach === 'gewicht';
      const ageKnown = age !== null && age !== undefined && age >= 0;
      const stufen = medication.staffel;
      let e, alter = null;
      if (nachGewicht) {
        e = stufen.find(x => weight < x.bis_gewicht) || stufen[stufen.length - 1];
      } else {
        alter = ageKnown ? age : this.ageFromWeight(weight);
        e = stufen.find(x => alter < x.bis_alter) || stufen[stufen.length - 1];
      }
      if (e.keine) {
        nichtVerfuegbar = `Keine Dosisangabe in der Leitlinie für ${e.text}. Andere Applikation (bukkal, nasal, i.v.) wählen.`;
        calculatedDose = 0;
        formula = e.text;
      } else {
        calculatedDose = e.dosis !== undefined ? e.dosis : e.pro_kg * weight;
        formula = e.dosis !== undefined
          ? `Dosis ${e.text}: ${e.dosis} ${medication.einheit}`
          : `${e.pro_kg} ${medication.einheit}/kg × ${weight} kg (${e.text})`;
      }
      altersHinweis = nachGewicht
        ? `Dosis nach Gewicht (${e.text})`
        : (ageKnown
          ? `Altersgruppe: ${e.text}`
          : `Alter nicht eingegeben: Altersgruppe aus dem Gewicht geschätzt (${e.text}). Alter eingeben für exakte Dosis.`);
    } else {
      calculatedDose = medication.dosierung_pro_kg * weight;
      formula = null;
    }

    // Sicherheitscheck: Maximaldosis nicht überschreiten
    const hasMax = medication.max_dosis !== undefined && medication.max_dosis !== null;
    const doseLimited = hasMax && calculatedDose > medication.max_dosis;
    if (doseLimited) {
      calculatedDose = medication.max_dosis;
    }
    const rounded = Math.round(calculatedDose * 100) / 100;

    if (formula === null) {
      const perKgUnit = `${medication.einheit}/kg${medication.tagesdosis ? '/Tag' : ''}`;
      formula = `${medication.dosierung_pro_kg} ${perKgUnit} × ${weight} kg = ${rounded} ${medication.einheit}${medication.tagesdosis ? '/Tag' : ''}`;
    }

    // Tagesdosis auf Einzelgaben verteilen (z. B. Prednisolon)
    let proGabe = null;
    if (medication.teiler) {
      proGabe = Math.round((calculatedDose / medication.teiler) * 100) / 100;
    }

    return {
      medicationName: medication.name,
      dose: rounded,
      unit: medication.einheit,
      weight: weight,
      isMaxDose: doseLimited,
      maxDose: hasMax ? medication.max_dosis : null,
      gruppe: medication.gruppe,
      hinweise: medication.hinweise || '',
      bereich: medication.bereich || null,
      stufe: medication.stufe || null,
      reihenfolge: medication.reihenfolge !== undefined ? medication.reihenfolge : null,
      tagesdosis: !!medication.tagesdosis,
      teiler: medication.teiler || null,
      proGabe: proGabe,
      altersHinweis: altersHinweis,
      nichtVerfuegbar: nichtVerfuegbar,
      verdünnung: medication.verdünnung || null,
      kritisch: medication.kritisch || false,
      weightPlausibilityWarning: weightPlausibilityWarning,
      formula: formula
    };
  }

  /**
   * Kombinierte Funktion: Berechnet Dosis basierend auf Alter
   * (schätzt zunächst das Gewicht, dann die Dosis)
   * 
   * @param {string} medId - Medikamenten-ID
   * @param {number} ageYears - Alter in Jahren
   * @returns {object|null} Erweiterte Dosis-Information inkl. geschätztem Gewicht
   */
  calculateDoseByAge(medId, ageYears) {
    const estimatedWeight = this.estimateWeight(ageYears);
    
    if (!estimatedWeight) {
      console.error('Gewicht konnte nicht geschätzt werden');
      return null;
    }

    const doseResult = this.calculateDose(medId, estimatedWeight, ageYears);
    
    if (doseResult) {
      doseResult.estimatedWeight = true;
      doseResult.age = ageYears;
    }

    return doseResult;
  }

  /**
   * Gibt alle verfügbaren Medikamente einer bestimmten Gruppe zurück
   * 
   * @param {string} gruppe - Medikamentengruppe (z.B. "Reanimation", "Intubation")
   * @returns {array} Array von Medikamenten
   */
  getMedicationsByGroup(gruppe) {
    return this.medications.filter(med => med.gruppe === gruppe);
  }

  /**
   * Gibt alle verfügbaren Medikamentengruppen zurück
   * 
   * @returns {array} Array von eindeutigen Gruppennamen
   */
  getAllGroups() {
    const groups = this.medications.map(med => med.gruppe);
    return [...new Set(groups)]; // Duplikate entfernen
  }
}

// Export für Module (optional, falls verwendet)
if (typeof module !== 'undefined' && module.exports) {
  module.exports = PediCalc;
}
