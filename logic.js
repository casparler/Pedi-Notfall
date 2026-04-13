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
      
      // ATEMWEG / INTUBATION
      {
        "id": "propofol_intubation",
        "name": "Propofol",
        "gruppe": "Intubation",
        "dosierung_pro_kg": 2.5,
        "einheit": "mg",
        "max_dosis": 200,
        "hinweise": "Zur Narkoseeinleitung, langsame I.V. Gabe über 30-60 Sek.",
        "kritisch": false
      },
      {
        "id": "ketamin_intubation",
        "name": "Ketamin (S-Ketamin)",
        "gruppe": "Intubation",
        "dosierung_pro_kg": 2,
        "einheit": "mg",
        "max_dosis": 150,
        "hinweise": "Alternative bei Kreislaufinstabilität, erhält Spontanatmung",
        "kritisch": false
      },
      {
        "id": "rocuronium",
        "name": "Rocuronium",
        "gruppe": "Intubation",
        "dosierung_pro_kg": 1,
        "einheit": "mg",
        "max_dosis": 100,
        "hinweise": "Muskelrelaxierung zur Intubation, Wirkdauer 30-40 Min.",
        "kritisch": false
      },
      {
        "id": "succinylcholin",
        "name": "Succinylcholin",
        "gruppe": "Intubation",
        "dosierung_pro_kg": 2,
        "einheit": "mg",
        "max_dosis": 150,
        "hinweise": "Schnelle Relaxierung (60 Sek.), CI: Hyperkaliämie, Verbrennung",
        "kritisch": true
      },
      
      // SEDIERUNG & ANALGESIE
      {
        "id": "midazolam",
        "name": "Midazolam",
        "gruppe": "Sedierung",
        "dosierung_pro_kg": 0.1,
        "einheit": "mg",
        "max_dosis": 10,
        "hinweise": "Sedierung/Anxiolyse, titrieren bis Wirkung",
        "kritisch": false
      },
      {
        "id": "fentanyl",
        "name": "Fentanyl",
        "gruppe": "Analgesie",
        "dosierung_pro_kg": 2,
        "einheit": "µg",
        "max_dosis": 100,
        "hinweise": "Starkes Opioid, Atemdepression beachten",
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
      
      // ANTIKONVULSIVA
      {
        "id": "midazolam_krampf",
        "name": "Midazolam (Krampf)",
        "gruppe": "Antikonvulsiva",
        "dosierung_pro_kg": 0.15,
        "einheit": "mg",
        "max_dosis": 10,
        "hinweise": "Status epilepticus, bukkal/nasal möglich",
        "kritisch": false
      },
      {
        "id": "phenytoin",
        "name": "Phenytoin",
        "gruppe": "Antikonvulsiva",
        "dosierung_pro_kg": 20,
        "einheit": "mg",
        "max_dosis": 1500,
        "hinweise": "Langsam I.V. (max. 1 mg/kg/min), EKG-Monitoring",
        "kritisch": true
      },
      {
        "id": "levetiracetam",
        "name": "Levetiracetam",
        "gruppe": "Antikonvulsiva",
        "dosierung_pro_kg": 40,
        "einheit": "mg",
        "max_dosis": 3000,
        "hinweise": "Alternative zu Phenytoin, über 15 Min. I.V.",
        "kritisch": false
      },
      
      // ATEMWEGE / BRONCHOSPASMUS
      {
        "id": "salbutamol",
        "name": "Salbutamol",
        "gruppe": "Bronchodilatator",
        "dosierung_pro_kg": 0.15,
        "einheit": "mg",
        "max_dosis": 5,
        "hinweise": "Inhalativ bei Asthma/Bronchospasmus, wiederholbar",
        "kritisch": false
      },
      {
        "id": "adrenalin_croup",
        "name": "Adrenalin (Inhalativ)",
        "gruppe": "Bronchodilatator",
        "dosierung_pro_kg": 0.5,
        "einheit": "mg",
        "max_dosis": 5,
        "hinweise": "Bei Pseudokrupp/Epiglottitis inhalativ",
        "verdünnung": "Mit NaCl 0.9% auf 3-5 ml verdünnen",
        "kritisch": false
      },
      {
        "id": "prednisolon",
        "name": "Prednisolon",
        "gruppe": "Steroid",
        "dosierung_pro_kg": 2,
        "einheit": "mg",
        "max_dosis": 100,
        "hinweise": "Bei Pseudokrupp/Asthma, oral oder I.V.",
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
   * Berechnet die Medikamentendosis basierend auf Gewicht
   * Beachtet automatisch die maximale Einzeldosis
   * 
   * @param {string} medId - Medikamenten-ID aus data.json
   * @param {number} weight - Körpergewicht in kg
   * @param {number} age - Alter in Jahren (optional, für Plausibilitätsprüfung)
   * @returns {object|null} Dosis-Objekt mit berechneter Dosis, Einheit und Hinweisen
   */
  calculateDose(medId, weight, age = null) {
    // Medikament aus Datenbank finden
    const medication = this.medications.find(med => med.id === medId);
    
    if (!medication) {
      console.error(`Medikament mit ID "${medId}" nicht gefunden`);
      return null;
    }

    // Validierung: Gewicht muss positiv sein
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
      
      // Warnung bei mehr als 50% Abweichung vom erwarteten Gewicht
      if (deviationPercent > 50) {
        weightPlausibilityWarning = `⚠️ WARNUNG: Gewicht ${weight} kg erscheint ungewöhnlich für Alter ${age} Jahre (erwartet: ~${Math.round(estimatedWeight * 10) / 10} kg)`;
      }
    }

    // Berechnung: Dosis = Dosierung pro kg × Gewicht
    let calculatedDose = medication.dosierung_pro_kg * weight;
    
    // Sicherheitscheck: Maximaldosis nicht überschreiten
    const doseLimited = calculatedDose > medication.max_dosis;
    if (doseLimited) {
      calculatedDose = medication.max_dosis;
    }

    // Rückgabe mit allen relevanten Informationen
    return {
      medicationName: medication.name,
      dose: Math.round(calculatedDose * 100) / 100, // Runden auf 2 Dezimalstellen
      unit: medication.einheit,
      weight: weight,
      isMaxDose: doseLimited,
      maxDose: medication.max_dosis,
      gruppe: medication.gruppe,
      hinweise: medication.hinweise || '',
      verdünnung: medication.verdünnung || null,
      kritisch: medication.kritisch || false,
      weightPlausibilityWarning: weightPlausibilityWarning,
      formula: `${medication.dosierung_pro_kg} ${medication.einheit}/kg × ${weight} kg = ${Math.round(calculatedDose * 100) / 100} ${medication.einheit}`
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
