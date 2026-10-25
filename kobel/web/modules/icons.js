/* ═════════ league logos + career-step icons (flat outline, rounded) ═════════
   League logos: assets/www/leagues/t0..t5.png (dark parts already turned white for the dark theme).
   Career icons: one small outline icon per stage, in STAGES order (41). */
const LEAGUE_LOGO=(i,s=42)=>`<span class="stg-i lg" style="width:${s}px;height:${s}px"><img src="leagues/t${i}.png" alt="" draggable="false"></span>`;
const SI=(p)=>p;
const STAGE_ICONS=[
 /*0 Bolzplatz: goal*/ SI('<path d="M4 20V8h16v12"/><path d="M4 8l3-3h10l3 3"/><path d="M8 8v12M16 8v12M4 14h16" stroke-width="1.2"/>'),
 /*1 Hinterhof-Turnier: courtyard fence*/ SI('<path d="M4 20V10l2-2 2 2v10M10 20V10l2-2 2 2v10M16 20V10l2-2 2 2v10M3 15h18"/>'),
 /*2 Parkliga: tree*/ SI('<path d="M12 20.5V13.5"/><path d="M12 13.5c-3.4 0-5.6-2.1-5.6-4.7 0-2.8 2.4-5 5.6-5s5.6 2.2 5.6 5c0 2.6-2.200 4.7-5.600 4.7z"/><path d="M8.5 20.5h7"/>'),
 /*3 Sonntagsliga: shirt*/ SI('<path d="M8.5 4 3.5 7l2 3.6 2.5-1.1V20h8V9.5l2.5 1.1 2-3.6-5-3a3.6 3.6 0 0 1-7 0z"/>'),
 /*4 Kreisliga C: club shield*/ SI('<path d="M12 3l7 2.6v5.8c0 4.4-3 7.4-7 9.4-4-2-7-5-7-9.4V5.6z"/>'),
 /*5 Kreisliga B: pyramid steps*/ SI('<path d="M3 20h18M6 20v-4h12v4M9 16v-4h6v4M11 12V8.5h2V12"/>'),
 /*6 Kreisliga A: scouts (eye)*/ SI('<path d="M2.5 12S6 5.5 12 5.5 21.5 12 21.5 12 18 18.5 12 18.5 2.5 12 2.5 12z"/><circle cx="12" cy="12" r="2.6"/>'),
 /*7 Bezirksliga: table*/ SI('<rect x="4" y="5" width="16" height="14" rx="2"/><path d="M4 10h16M4 14.5h16M9 5v14"/>'),
 /*8 Landesliga: minibus*/ SI('<path d="M3 16V8a2 2 0 0 1 2-2h9.5L21 11.5V16a1 1 0 0 1-1 1H3z"/><path d="M3 11.5h18M9 6v5.5"/><circle cx="7.5" cy="17.5" r="1.8"/><circle cx="16.5" cy="17.5" r="1.8"/>'),
 /*9 Oberliga: stopwatch*/ SI('<circle cx="12" cy="13.5" r="7"/><path d="M12 13.5V9.5M10 3h4M18.6 6.6l1.4-1.4"/>'),
 /*10 Regionalliga: flag*/ SI('<path d="M6 21V4"/><path d="M6 5h11.5l-2.3 3.8L17.5 12.5H6"/>'),
 /*11 Pokal-Qualifikation: ticket*/ SI('<path d="M4 8.5A2 2 0 0 1 6 6.5h12a2 2 0 0 1 2 2V10a2 2 0 0 0 0 4v1.5a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V14a2 2 0 0 0 0-4z"/><path d="M10 6.5v11" stroke-dasharray="1.6 2.4"/>'),
 /*12 1. Pokalrunde: draw ball 1*/ SI('<circle cx="12" cy="12" r="8.5"/><path d="M10.4 9.6 12.6 8v8"/>'),
 /*13 2. Pokalrunde: draw ball 2*/ SI('<circle cx="12" cy="12" r="8.5"/><path d="M9.6 9.8a2.5 2.5 0 0 1 4.8.7c0 2.1-4.8 3.4-4.8 5.5h4.9"/>'),
 /*14 Achtelfinale: bracket*/ SI('<path d="M4 5h5v3.6H4zM4 15.4h5V19H4zM9 6.8h3v10.4H9M12 12h4"/><rect x="16" y="9.8" width="4" height="4.4" rx="1"/>'),
 /*15 Viertelfinale: floodlight*/ SI('<rect x="6" y="3" width="12" height="6.5" rx="1.5"/><path d="M9 3v6.5M12 3v6.5M15 3v6.5M12 9.5V21M9 21h6"/>'),
 /*16 Halbfinale: two sides, one final*/ SI('<rect x="3.5" y="7" width="6.5" height="10" rx="1.5"/><rect x="14" y="7" width="6.5" height="10" rx="1.5"/><path d="M10 12h4"/>'),
 /*17 Pokalfinale: cup*/ SI('<path d="M7 4h10v5a5 5 0 0 1-10 0z"/><path d="M7 6H4v1.5A3.5 3.5 0 0 0 7 11M17 6h3v1.5a3.5 3.5 0 0 1-3 3.5M12 14v4M8.5 20.5h7"/>'),
 /*18 Aufsteiger: up*/ SI('<circle cx="12" cy="12" r="9"/><path d="M12 16.5V8M8 11.8 12 8l4 3.8"/>'),
 /*19 Tabellenmitte: middle row*/ SI('<path d="M4 6.5h16M4 17.5h16"/><rect x="4" y="9.8" width="16" height="4.4" rx="1.2"/>'),
 /*20 Oberes Mittelfeld: look up*/ SI('<path d="M6 14.5l6-6 6 6M6 20l6-6 6 6" />'),
 /*21 Aufstiegsplatz: podium*/ SI('<path d="M3 20.5h18"/><rect x="9" y="9" width="6" height="11.5"/><path d="M9 14H3v6.5M15 16h6v4.5"/>'),
 /*22 Relegations-Finale: two matches*/ SI('<path d="M4 8h14l-3-3.2M20 16H6l3 3.2"/>'),
 /*23 Bundesliga-Neuling: star*/ SI('<path d="M12 3.6l2.5 5.3 5.8.8-4.2 4.1 1 5.8L12 16.8 6.9 19.6l1-5.8-4.2-4.1 5.8-.8z"/>'),
 /*24 Mittelfeld-Team: shield check*/ SI('<path d="M12 3l7 2.6v5.8c0 4.4-3 7.4-7 9.4-4-2-7-5-7-9.4V5.6z"/><path d="M8.6 12l2.4 2.4 4.4-4.8"/>'),
 /*25 Europa-Kandidat: target*/ SI('<circle cx="12" cy="12" r="8.5"/><circle cx="12" cy="12" r="4.5"/><circle cx="12" cy="12" r=".8" fill="currentColor"/>'),
 /*26 Kader für den Titel: squad*/ SI('<circle cx="9" cy="8" r="3"/><path d="M3.5 19c0-3.3 2.4-5.5 5.5-5.5s5.5 2.2 5.5 5.5"/><circle cx="17.2" cy="9" r="2.4"/><path d="M16.5 13.8c2.6 0 4.6 1.8 4.6 4.7"/>'),
 /*27 Titelkandidat: medal*/ SI('<circle cx="12" cy="15" r="5.2"/><path d="M8.6 3.5 12 10l3.4-6.5M10.3 15l1.3 1.3 2.3-2.6"/>'),
 /*28 Meisterschale: bowl*/ SI('<path d="M3 9.5h18"/><path d="M5 9.5c0 5 3 8 7 8s7-3 7-8"/><path d="M12 17.5v3M8 20.5h8"/>'),
 /*29 Gruppenphase EL: 2x2*/ SI('<rect x="4" y="4" width="7" height="7" rx="1.8"/><rect x="13" y="4" width="7" height="7" rx="1.8"/><rect x="4" y="13" width="7" height="7" rx="1.8"/><rect x="13" y="13" width="7" height="7" rx="1.8"/>'),
 /*30 Playoffs: bolt*/ SI('<path d="M13.2 3 5.5 13.5h6L10.8 21l7.7-10.5h-6z"/>'),
 /*31 Achtelfinale EL: globe*/ SI('<circle cx="12" cy="12" r="8.8"/><path d="M3.2 12h17.6M12 3.2c3 3 3 14.6 0 17.6M12 3.2c-3 3-3 14.6 0 17.6"/>'),
 /*32 Halbfinale EL: two flags*/ SI('<path d="M5 21V4M5 4.5h7.5l-1.6 3 1.6 3H5M17 21v-9M17 12.2h4l-1 1.8 1 1.8h-4"/>'),
 /*33 Europa-Finale: trophy*/ SI('<path d="M8 3h8v6a4 4 0 0 1-8 0z"/><path d="M8 5H5v2a3 3 0 0 0 3 3M16 5h3v2a3 3 0 0 1-3 3M12 13v5M10 18h4M8 21h8"/>'),
 /*34 Qualifikation CL: door*/ SI('<path d="M6 21V4h12v17M4 21h16"/><circle cx="14.6" cy="12.6" r=".8" fill="currentColor"/>'),
 /*35 Gruppenphase CL: anthem notes*/ SI('<path d="M9 17.5V6.5l10-2v11"/><circle cx="6.5" cy="17.5" r="2.5"/><circle cx="16.5" cy="15.5" r="2.5"/>'),
 /*36 K.-o.-Runde: pulse*/ SI('<path d="M3 12h4.5l2-5.5 3.5 11 2.2-5.5H21"/>'),
 /*37 Viertelfinale CL: eight*/ SI('<circle cx="12" cy="7.8" r="3.6"/><circle cx="12" cy="16.4" r="4.4"/>'),
 /*38 Halbfinale CL: night*/ SI('<path d="M20 14.6A8 8 0 1 1 9.4 4a6.4 6.4 0 0 0 10.6 10.6z"/>'),
 /*39 CL-Finale: ball*/ SI('<circle cx="12" cy="12" r="9"/><path d="M12 8.3l3.5 2.6-1.3 4.1H9.8l-1.3-4.1zM12 8.3V3.2M15.5 10.9l4.7-1.6M14.2 15l3 4M9.8 15l-3 4M8.5 10.9 3.8 9.3"/>'),
 /*40 Weltklasse: crown*/ SI('<path d="M3.5 8.5l4.6 4 3.9-7 3.9 7 4.6-4-1.5 10.6h-14z"/>')
];
const stageIco=(i,s=24)=>`<svg class="sico-s" viewBox="0 0 24 24" width="${s}" height="${s}" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${STAGE_ICONS[i]||''}</svg>`;
