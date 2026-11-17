// main.js - Steuerung der SafePedi App
const pediCalc = new PediCalc();
const ageInput = document.getElementById('ageInput');
const weightInput = document.getElementById('weightInput');
const medicationList = document.getElementById('medicationList');
const weightHint = document.getElementById('weightEstimationHint');
const categoryTitle = document.getElementById('category-title');
const medCount = document.getElementById('med-count');

// Info-Kästen über der Medikamentenliste einzelner Kategorien
const CATEGORY_INFO = {
    Antikonvulsiva: {
        titel: 'Konvulsiver Status epilepticus: Stufenschema',
        zeilen: [
            'Notfall-ABCD, Blutzucker messen (Hypoglykämie ausschließen), Diagnostik parallel, ohne die Therapie zu verzögern.',
            'Stufe 1 ab 5 Minuten Anfallsdauer: Benzodiazepin. Ohne IV-Zugang Midazolam bukkal oder Diazepam rektal, sonst i.v. (Lorazepam, Diazepam, Midazolam). Maximal 2 Gaben.',
            'Stufe 2 (≥ 10 min, trotz Benzodiazepin): Levetiracetam, Phenytoin, Phenobarbital oder Valproat. Levetiracetam und Phenobarbital sind laut Leitlinie bevorzugt, alle vergleichbar wirksam.',
            'Stufe 3 (refraktär, > 30–60 min): Narkose mit Midazolam oder Thiopental (Propofol nachrangig) unter Intubation, Beatmung und EEG-Monitoring.'
        ],
        quelle: 'Reihenfolge: S1-Leitlinie GNP „Therapie des konvulsiven Status epilepticus im Kindes- und Jugendalter“ (AWMF 022-019, 09/2025). Dosen: Tabellen 3, 4 und 5 der Leitlinie (Midazolam bukkal im Alter von 1–3 Monaten: Kinderformularium).'
    },
    Bronchodilatator: {
        titel: 'Status asthmaticus: Stufenschema',
        zeilen: [
            'Sauerstoff, Salbutamol inhalativ. Bei unzureichendem Ansprechen zusätzlich Prednisolon, bei schwerem Anfall zusätzlich Ipratropium.',
            'Lebensbedrohlicher Anfall: Salbutamol kontinuierlich inhalieren + Sauerstoff + Prednisolon i.v. + Ipratropium.',
            'Therapierefraktär: Magnesiumsulfat i.v., danach Reproterol i.v. auf der Intensivstation.'
        ],
        quelle: 'Stufenschema und Dosen: Kinderformularium (Monographien Salbutamol, Ipratropium, Prednisolon, Magnesiumsulfat, Reproterol).'
    }
};

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
        // Bei einer neuen Version die Seite einmal automatisch neu laden
        const hadController = !!navigator.serviceWorker.controller;
        let reloaded = false;
        navigator.serviceWorker.addEventListener('controllerchange', () => {
            if (hadController && !reloaded) {
                reloaded = true;
                window.location.reload();
            }
        });
        navigator.serviceWorker.register('sw.js').then(reg => {
            console.log('Service Worker registriert (für Offline-Nutzung)');
            reg.update(); // sofort nach einer neueren Version suchen
        }).catch(err => {
            console.log('Service Worker Registrierung fehlgeschlagen:', err);
        });
    }
}

// Neugeborenen-Tab: eigener Bereich mit eigener Eingabe (Gramm/SSW)
function setNeonatalMode(on) {
    document.getElementById('input-area').classList.toggle('hidden', on);
    document.getElementById('results-area').classList.toggle('hidden', on);
    if (window.NeoUI) NeoUI.show(on);
}

function updateUI() {
    const isNeo = currentCategory === 'Neonatal';
    setNeonatalMode(isNeo);
    if (isNeo) return;

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

    // Medikamente nach Kategorie filtern (innerhalb einer Kategorie nach Reihenfolge sortieren)
    let meds = pediCalc.medications;
    if (currentCategory !== 'all') {
        meds = meds.filter(med => med.gruppe === currentCategory);
        if (meds.some(med => med.reihenfolge !== undefined)) {
            meds = meds.slice().sort((a, b) => (a.reihenfolge ?? 999) - (b.reihenfolge ?? 999));
        }
    }
    
    // Kategorie-Titel und Counter aktualisieren
    if (currentCategory === 'all') {
        categoryTitle.textContent = 'Alle Medikamente';
    } else {
        categoryTitle.textContent = currentCategory;
    }
    medCount.textContent = `${meds.length} Medikament${meds.length !== 1 ? 'e' : ''}`;
    
    medicationList.innerHTML = ''; // Container leeren

    // Info-Kasten (z. B. Stufenschema) oberhalb der Karten
    const info = currentCategory !== 'all' ? CATEGORY_INFO[currentCategory] : null;
    if (info) {
        const box = document.createElement('div');
        box.className = 'bg-slate-800 border-l-4 border-blue-500 rounded-xl p-4';
        box.innerHTML = `
            <h3 class="font-bold mb-2">${info.titel}</h3>
            <ul class="list-disc pl-5 space-y-1 text-sm text-slate-200">${info.zeilen.map(z => `<li>${z}</li>`).join('')}</ul>
            <p class="text-[10px] text-slate-500 mt-2">${info.quelle}</p>`;
        medicationList.appendChild(box);
    }
    
    console.log('Generiere Karten für', meds.length, 'Medikamente in Kategorie:', currentCategory);
    
    if (meds.length === 0) {
        medicationList.innerHTML = '<p class="text-slate-500 text-center py-10">Keine Medikamente in dieser Kategorie</p>';
        return;
    }
    
    meds.forEach(med => {
        const result = pediCalc.calculateDose(med.id, weight, age || null);
        const isMax = result.isMaxDose;

        // Stufen-Kennzeichnung (Farbe nach Stufe 1/2/3)
        const stufeNr = result.stufe ? (result.stufe.match(/Stufe (\d)/) || [])[1] : null;
        const stufeStyle = { '1': 'bg-blue-900/50 text-blue-200 border-blue-600', '2': 'bg-amber-900/50 text-amber-200 border-amber-600', '3': 'bg-red-900/50 text-red-200 border-red-600' }[stufeNr] || 'bg-slate-700 text-slate-200 border-slate-500';
        const hinweiseHtml = Array.isArray(result.hinweise)
            ? `<ul class="list-disc pl-5 space-y-1 text-sm text-slate-300">${result.hinweise.map(h => `<li>${h}</li>`).join('')}</ul>`
            : `<p class="text-sm text-slate-300 italic">${result.hinweise}</p>`;
        const unitLabel = result.unit + (result.tagesdosis ? '/Tag' : '');

        const card = document.createElement('div');
        card.className = 'bg-slate-800 p-4 rounded-xl border-2 border-slate-700 shadow-md transition-all hover:border-blue-500';

        card.innerHTML = `
            ${result.stufe ? `<div class="mb-2"><span class="text-xs font-bold px-2 py-1 rounded border ${stufeStyle}">${result.stufe}</span></div>` : ''}
            <div class="flex justify-between items-start mb-2">
                <h3 class="font-bold text-lg text-blue-300">${result.medicationName}</h3>
                <span class="text-xs px-2 py-1 bg-slate-700 rounded text-slate-400">${result.gruppe}</span>
            </div>

            ${result.weightPlausibilityWarning ? `
                <div class="bg-orange-900/30 border border-orange-500 text-orange-300 text-xs p-2 rounded-lg mb-3 font-semibold">
                    ${result.weightPlausibilityWarning}
                </div>
            ` : ''}

            ${result.nichtVerfuegbar ? `
                <div class="bg-orange-900/30 border border-orange-500 text-orange-200 text-sm p-3 rounded-lg font-semibold">${result.nichtVerfuegbar}</div>
            ` : `
            <div class="flex items-baseline gap-2">
                <span class="text-4xl font-black ${isMax ? 'text-red-500' : 'text-green-400'}">
                    ${result.dose}
                </span>
                <span class="text-xl font-bold text-slate-300">${unitLabel}</span>
                ${isMax ? '<span class="text-xs font-bold text-red-500 animate-pulse">⚠️ MAX</span>' : ''}
            </div>`}
            ${result.proGabe !== null ? `<p class="text-sm text-slate-300 mt-1">= je Gabe <b>${result.proGabe} ${result.unit}</b> (${result.teiler} Gaben pro Tag)</p>` : ''}
            <p class="text-[10px] text-slate-500 mt-1 font-mono">${result.formula}</p>
            ${result.bereich ? `<p class="text-xs text-slate-400 mt-1">Bereich: ${result.bereich}</p>` : ''}
            ${result.altersHinweis ? `<p class="text-xs ${/geschätzt/.test(result.altersHinweis) ? 'text-orange-300 font-semibold' : 'text-slate-400'} mt-1">${result.altersHinweis}</p>` : ''}

            ${result.verdünnung ? `
                <div class="bg-red-900/20 border border-red-700 text-red-300 text-xs p-2 rounded-lg mt-3 font-semibold">
                    🧪 VERDÜNNUNG: ${result.verdünnung}
                </div>
            ` : ''}

            <div class="mt-3 border-t border-slate-700 pt-2">${hinweiseHtml}</div>
        `;

        medicationList.appendChild(card);
    });
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