/**
 * Klinik-SOP-Overrides für den Tab "Neugeborenen-Notfall".
 *
 * Hier werden Leitlinienwerte aus neonatal.js durch die Werte der eigenen Klinik-SOP ersetzt.
 * Betroffene Karten erhalten automatisch das Label "SOP" statt A/B/C.
 * Der Schlüssel ist die Medikamenten-ID aus neonatal.js (z. B. 'phenobarbital_neo').
 *
 * Erlaubte Felder pro Eintrag (alle optional, es werden nur die angegebenen überschrieben):
 *   dose:      { min, max, start }        // pro kg (bei Infusionen pro kg und Zeit)
 *   conc:      { value, text }            // Menge pro ml, gleiche Einheit wie dose.unit
 *   hinweise:  ['...', '...']             // ersetzt die Hinweisliste
 *   route, quelle
 *
 * Beispiel (auskommentiert):
 *
 *   phenobarbital_neo: {
 *     dose: { min: 20, max: 20, start: 20 },
 *     hinweise: ['Nachladung nach Klinik-SOP Nr. 123 bei Persistenz'],
 *     quelle: 'Klinik-SOP Neonatologie, Stand 01/2026'
 *   },
 *   alprostadil_neo: {
 *     conc: { value: 10, text: '500 µg auf 50 ml = 10 µg/ml' }
 *   }
 */
const NEO_SOP_OVERRIDES = {
};
