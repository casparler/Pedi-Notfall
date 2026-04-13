/**
 * PediCalc - Pädiatrische Notfall-Berechnungs-Engine
 * Berechnet Gewicht und Medikamentendosierungen für Kinder
 */

class PediCalc {
  constructor() {
    this.medications = [];
    this.loadMedications();
  }

  /**
   * Lädt Medikamentendaten aus data.json
   */
  async loadMedications() {
    try {
      const response = await fetch('data.json');
      const data = await response.json();
      this.medications = data.medications;
    } catch (error) {
      console.error('Fehler beim Laden der Medikamentendaten:', error);
    }
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
