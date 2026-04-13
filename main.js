// main.js - Steuerung der SafePedi App
const pediCalc = new PediCalc();
const ageInput = document.getElementById('ageInput');
const weightInput = document.getElementById('weightInput');
const medicationList = document.getElementById('medicationList');
const weightHint = document.getElementById('weightEstimationHint');
const categoryTitle = document.getElementById('category-title');
const medCount = document.getElementById('med-count');

// Zustand für Vier-Augen-Prinzip (welche Medikamente wurden bestätigt?)
const confirmedMedications = new Set();

// Aktuelle Kategorie
let currentCategory = 'all';

// Initialisierung: Warten bis Daten geladen sind, dann Anzeige
async function init() {
    console.log('Initialisiere App...');
    await pediCalc.loadMedications();
    console.log('Medikamente geladen:', pediCalc.medications.length);
    
    // Tab Event Listeners
    document.querySelectorAll('.tab-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            // Alle tabs deaktivieren
            document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
            // Geklickten tab aktivieren
            btn.classList.add('active');
            // Kategorie setzen
            currentCategory = btn.dataset.category;
            // UI aktualisieren
            updateUI();
        });
    });
    
    updateUI(); // Erste Anzeige (leer oder mit Standardwerten)
    
    // PWA Installation Prompt
    if ('serviceWorker' in navigator) {
        navigator.serviceWorker.register('sw.js').then(() => {
            console.log('Service Worker registriert (für Offline-Nutzung)');
        }).catch(err => {
            console.log('Service Worker Registrierung fehlgeschlagen:', err);
        });
    }
}

function updateUI() {
    const weight = parseFloat(weightInput.value);
    const age = parseFloat(ageInput.value);
    
    console.log('updateUI aufgerufen - Gewicht:', weight, 'Alter:', age, 'Medikamente:', pediCalc.medications.length);
    
    // Prüfe ob Medikamente geladen wurden
    if (!pediCalc.medications || pediCalc.medications.length === 0) {
        medicationList.innerHTML = '<p class="text-yellow-500 text-center py-10">⏳ Lade Medikamentendaten...</p>';
        return;
    }
    
    if (!weight || weight <= 0) {
        medicationList.innerHTML = '<p class="text-slate-500 text-center py-10">Bitte Gewicht eingeben für Dosierungen...</p>';
        return;
    }

    // Medikamente nach Kategorie filtern
    let meds = pediCalc.medications;
    if (currentCategory !== 'all') {
        meds = meds.filter(med => med.gruppe === currentCategory);
    }
    
    // Kategorie-Titel und Counter aktualisieren
    if (currentCategory === 'all') {
        categoryTitle.textContent = 'Alle Medikamente';
    } else {
        categoryTitle.textContent = currentCategory;
    }
    medCount.textContent = `${meds.length} Medikament${meds.length !== 1 ? 'e' : ''}`;
    
    medicationList.innerHTML = ''; // Container leeren
    
    console.log('Generiere Karten für', meds.length, 'Medikamente in Kategorie:', currentCategory);
    
    if (meds.length === 0) {
        medicationList.innerHTML = '<p class="text-slate-500 text-center py-10">Keine Medikamente in dieser Kategorie</p>';
        return;
    }
    
    meds.forEach(med => {
        const result = pediCalc.calculateDose(med.id, weight, age || null);
        const isMax = result.isMaxDose;
        const isConfirmed = confirmedMedications.has(med.id);
        
        // Karte erstellen
        const card = document.createElement('div');
        card.className = `bg-slate-800 p-4 rounded-xl border-2 ${
            isConfirmed ? 'border-green-500' : 'border-slate-700'
        } shadow-md transition-all hover:border-blue-500`;
        
        card.innerHTML = `
            <div class="flex justify-between items-start mb-2">
                <h3 class="font-bold text-lg text-blue-300">${result.medicationName}</h3>
                <span class="text-xs px-2 py-1 bg-slate-700 rounded text-slate-400">${result.gruppe}</span>
            </div>
            
            ${result.weightPlausibilityWarning ? `
                <div class="bg-orange-900/30 border border-orange-500 text-orange-300 text-xs p-2 rounded-lg mb-3 font-semibold">
                    ${result.weightPlausibilityWarning}
                </div>
            ` : ''}
            
            <div class="flex items-baseline gap-2">
                <span class="text-4xl font-black ${isMax ? 'text-red-500' : 'text-green-400'}">
                    ${result.dose}
                </span>
                <span class="text-xl font-bold text-slate-300">${result.unit}</span>
                ${isMax ? '<span class="text-xs font-bold text-red-500 animate-pulse">⚠️ MAX</span>' : ''}
            </div>
            <p class="text-[10px] text-slate-500 mt-1 font-mono">${result.formula}</p>
            
            ${result.verdünnung ? `
                <div class="bg-red-900/20 border border-red-700 text-red-300 text-xs p-2 rounded-lg mt-3 font-semibold">
                    🧪 VERDÜNNUNG: ${result.verdünnung}
                </div>
            ` : ''}
            
            <p class="text-sm text-slate-300 mt-3 border-t border-slate-700 pt-2 italic">${result.hinweise}</p>
            
            <button 
                class="w-full mt-3 py-2 px-4 rounded-lg font-bold text-sm transition-all ${
                    isConfirmed 
                        ? 'bg-green-600 text-white cursor-default' 
                        : 'bg-blue-600 hover:bg-blue-500 text-white'
                }"
                onclick="confirmMedication('${med.id}')"
                ${isConfirmed ? 'disabled' : ''}>
                ${isConfirmed ? '✓ Geprüft & Bestätigt' : '👥 Vier-Augen-Check'}
            </button>
        `;
        
        medicationList.appendChild(card);
    });
}

// Funktion für Vier-Augen-Prinzip Bestätigung
function confirmMedication(medId) {
    confirmedMedications.add(medId);
    updateUI();
}

// Event Listener
ageInput.addEventListener('input', () => {
    const age = parseFloat(ageInput.value);
    if (age >= 0) {
        const estWeight = pediCalc.estimateWeight(age);
        weightInput.value = estWeight;
        weightHint.innerText = `⚡ Geschätztes Gewicht: ${estWeight} kg (basierend auf Alter)`;
        updateUI();
    }
});

weightInput.addEventListener('input', () => {
    weightHint.innerText = ageInput.value ? "✏️ Gewicht manuell angepasst" : "";
    updateUI();
});

// Start der App
init();