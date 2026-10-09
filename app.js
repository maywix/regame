/* ===================== RE:GAME — app.js ===================== */
const LS_KEY = 'regame_data_v1';

const DEFAULT_DATA = {
  mechanics: [
    { id: cryptoId(), title: "Système de furtivité", tag: "Gameplay core", desc: "Le joueur doit se cacher dans des placards / sous des lits pour échapper à l'entité. Détection basée sur bruit + lumière.", diff: "dur" },
    { id: cryptoId(), title: "Inventaire limité", tag: "Gameplay", desc: "Sac à dos avec slots limités, forcer les choix entre objets de survie et objets de quête.", diff: "moyen" },
    { id: cryptoId(), title: "IA de l'entité (pathfinding + sens)", tag: "IA", desc: "L'ennemi principal suit odeur/bruit via NavMesh, patrouille, et a un mode chasse si le joueur est repéré.", diff: "dur" },
    { id: cryptoId(), title: "Jumpscares scriptés + aléatoires", tag: "Horreur", desc: "Mix de jumpscares déclenchés par trigger (scénarisés) et d'événements aléatoires pour casser la routine du joueur.", diff: "moyen" }
  ],
  maps: [
    { id: cryptoId(), title: "Manoir abandonné", tag: "Map principale", desc: "Map principale du jeu : manoir victorien avec sous-sol, grenier et jardin. Plusieurs étages à explorer.", diff: "dur" },
    { id: cryptoId(), title: "Ancien lycée désaffecté", tag: "Map secondaire", desc: "Référence directe au bahut : un lycée abandonné hanté, couloirs + salles de classe + gymnase.", diff: "moyen" }
  ],
  eggs: [
    { id: cryptoId(), title: "Portrait qui bouge", tag: "Visuel", desc: "Un tableau dans le couloir principal dont les yeux suivent le joueur si on reste statique plus de 10 secondes.", diff: "facile" },
    { id: cryptoId(), title: "Référence aux profs", tag: "Clin d'œil", desc: "Un carnet caché dans la salle de classe mentionnant les profs du bahut en easter egg texte.", diff: "facile" }
  ],
  tasks: [
    { id: cryptoId(), title: "Modéliser le manoir (blockout)", status: "doing", notes: "" },
    { id: cryptoId(), title: "Script IA ennemi v1", status: "todo", notes: "" },
    { id: cryptoId(), title: "Menu principal", status: "done", notes: "" }
  ],
  team: [
    { id: cryptoId(), name: "", role: "Membre de l'équipe", desc: "Ajoute les membres de l'équipe ici (dev, level design, son, 3D...)." }
  ],
  profs: [
    { id: cryptoId(), name: "Rachedi Laroussi", role: "Professeur encadrant", desc: "Rôle dans le projet à préciser (matière enseignée, suivi pédagogique, encadrement du TP/projet)." },
    { id: cryptoId(), name: "Fares Al Salti", role: "Professeur", desc: "Rôle dans le projet à préciser." },
    { id: cryptoId(), name: "Baccouch", role: "Professeur", desc: "Rôle dans le projet à préciser (nom à confirmer / compléter)." }
  ],
  school: "Lycée Gustave Eiffel",
  notes: ""
};

function cryptoId(){ return Math.random().toString(36).slice(2,10) + Date.now().toString(36); }

let DATA = loadData();

function loadData(){
  try{
    const raw = localStorage.getItem(LS_KEY);
    if(!raw) { localStorage.setItem(LS_KEY, JSON.stringify(DEFAULT_DATA)); return structuredClone(DEFAULT_DATA); }
    const parsed = JSON.parse(raw);
    // ensure all keys exist (future-proof merges)
    for(const k of Object.keys(DEFAULT_DATA)){ if(!(k in parsed)) parsed[k] = DEFAULT_DATA[k]; }
    return parsed;
  }catch(e){ console.error(e); return structuredClone(DEFAULT_DATA); }
}
function saveData(){ localStorage.setItem(LS_KEY, JSON.stringify(DATA)); renderAll(); }

/* ---------------- Navigation ---------------- */
document.getElementById('tabs').addEventListener('click', (e)=>{
  const btn = e.target.closest('button[data-view]');
  if(!btn) return;
  document.querySelectorAll('nav.tabs button').forEach(b=>b.classList.remove('active'));
  btn.classList.add('active');
  document.querySelectorAll('.view').forEach(v=>v.classList.remove('active'));
  document.getElementById('view-' + btn.dataset.view).classList.add('active');
});

/* ---------------- Rendering ---------------- */
function diffBadge(d){
  if(!d) return '';
  const map = {facile:'Facile', moyen:'Moyen', dur:'Difficile'};
  return `<span class="badge diff-${d}">${map[d]||d}</span>`;
}

function renderGrid(containerId, list, kind){
  const el = document.getElementById(containerId);
  if(!list.length){ el.innerHTML = `<div class="empty-state">Rien ici pour l'instant. Clique sur "+ Nouveau" pour ajouter le premier élément.</div>`; return; }
  el.innerHTML = list.map(item => `
    <div class="card">
      <div class="actions">
        <button class="icon-btn" onclick="editItem('${kind}','${item.id}')">✎</button>
        <button class="icon-btn" onclick="deleteItem('${kind}','${item.id}')">✕</button>
      </div>
      ${item.tag ? `<span class="tag">${escapeHtml(item.tag)}</span>` : ''}
      <h4>${escapeHtml(item.title || item.name || '(sans titre)')}</h4>
      <p>${escapeHtml(item.desc || '')}</p>
      ${item.diff ? `<div class="badge-row">${diffBadge(item.diff)}</div>` : ''}
    </div>
  `).join('');
}

function renderTeamLike(containerId, list, kind, showRole){
  const el = document.getElementById(containerId);
  if(!list.length || list.every(i=>!i.name)){ el.innerHTML = `<div class="empty-state">Aucun membre ajouté. Clique sur "+ Ajouter".</div>`; return; }
  el.innerHTML = list.filter(i=>i.name).map(item => `
    <div class="card prof-card">
      <div class="actions">
        <button class="icon-btn" onclick="editItem('${kind}','${item.id}')">✎</button>
        <button class="icon-btn" onclick="deleteItem('${kind}','${item.id}')">✕</button>
      </div>
      <div class="prof-avatar">${escapeHtml((item.name||'?').trim().charAt(0).toUpperCase())}</div>
      <div>
        <span class="tag">${escapeHtml(item.role||'')}</span>
        <h4>${escapeHtml(item.name)}</h4>
        <p>${escapeHtml(item.desc||'')}</p>
      </div>
    </div>
  `).join('');
}

function renderKanban(){
  const cols = [
    { key:'todo', label:'À faire' },
    { key:'doing', label:'En cours' },
    { key:'done', label:'Terminé' }
  ];
  const board = document.getElementById('kanbanBoard');
  board.innerHTML = cols.map(col => {
    const items = DATA.tasks.filter(t => t.status === col.key);
    return `
      <div class="kanban-col">
        <h4>${col.label} <span class="count">${items.length}</span></h4>
        ${items.map(t => `
          <div class="kcard">
            <div>${escapeHtml(t.title)}</div>
            ${t.notes ? `<div style="color:var(--muted); font-size:11px; margin-top:4px;">${escapeHtml(t.notes)}</div>` : ''}
            <div class="kactions">
              <select onchange="moveTask('${t.id}', this.value)">
                <option value="todo" ${t.status==='todo'?'selected':''}>À faire</option>
                <option value="doing" ${t.status==='doing'?'selected':''}>En cours</option>
                <option value="done" ${t.status==='done'?'selected':''}>Terminé</option>
              </select>
              <button class="icon-btn" onclick="editItem('tasks','${t.id}')">✎</button>
              <button class="icon-btn" onclick="deleteItem('tasks','${t.id}')">✕</button>
            </div>
          </div>
        `).join('') || '<div style="color:var(--muted); font-size:12px;">Vide</div>'}
      </div>
    `;
  }).join('');
}

function moveTask(id, status){
  const t = DATA.tasks.find(x=>x.id===id);
  if(t){ t.status = status; saveData(); }
}

function renderStats(){
  const stats = [
    { num: DATA.mechanics.length, lbl: 'Mécaniques' },
    { num: DATA.maps.length, lbl: 'Maps' },
    { num: DATA.eggs.length, lbl: 'Easter Eggs' },
    { num: DATA.tasks.filter(t=>t.status!=='done').length, lbl: 'Tâches ouvertes' },
    { num: DATA.team.filter(t=>t.name).length, lbl: 'Membres équipe' },
    { num: DATA.profs.filter(p=>p.name).length, lbl: 'Profs référencés' }
  ];
  document.getElementById('statsGrid').innerHTML = stats.map(s => `
    <div class="stat-card"><div class="num">${s.num}</div><div class="lbl">${s.lbl}</div></div>
  `).join('');
}

function renderActivity(){
  const el = document.getElementById('recentActivity');
  const all = [
    ...DATA.mechanics.map(x=>({...x,kind:'Mécanique'})),
    ...DATA.maps.map(x=>({...x,kind:'Map'})),
    ...DATA.eggs.map(x=>({...x,kind:'Easter egg'})),
  ];
  if(!all.length){ el.innerHTML = `<div class="empty-state">Rien pour l'instant.</div>`; return; }
  el.innerHTML = `<div class="cards-grid">` + all.slice(-6).reverse().map(x => `
    <div class="card"><span class="tag">${x.kind}</span><h4>${escapeHtml(x.title)}</h4><p>${escapeHtml((x.desc||'').slice(0,80))}${(x.desc||'').length>80?'…':''}</p></div>
  `).join('') + `</div>`;
}

function renderAll(){
  renderStats();
  renderActivity();
  renderGrid('grid-mechanics', DATA.mechanics, 'mechanics');
  renderGrid('grid-maps', DATA.maps, 'maps');
  renderGrid('grid-eggs', DATA.eggs, 'eggs');
  renderKanban();
  renderTeamLike('grid-team', DATA.team, 'team', true);
  renderTeamLike('grid-profs', DATA.profs, 'profs', true);
  document.getElementById('schoolName').textContent = DATA.school || 'Lycée Gustave Eiffel';
  document.getElementById('notesArea').value = DATA.notes || '';
}

function escapeHtml(str){
  return String(str).replace(/[&<>"']/g, m => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m]));
}

/* ---------------- Modal / CRUD ---------------- */
const FORM_CONFIGS = {
  mechanics: { title:'Mécanique de jeu', fields:[
    {key:'title', label:'Nom', type:'text'},
    {key:'tag', label:'Catégorie', type:'text'},
    {key:'desc', label:'Description', type:'textarea'},
    {key:'diff', label:'Difficulté', type:'select', options:[['facile','Facile'],['moyen','Moyen'],['dur','Difficile']]},
  ]},
  maps: { title:'Map / Niveau', fields:[
    {key:'title', label:'Nom de la map', type:'text'},
    {key:'tag', label:'Type (principale/secondaire/bonus)', type:'text'},
    {key:'desc', label:'Description', type:'textarea'},
    {key:'diff', label:'Niveau de difficulté', type:'select', options:[['facile','Facile'],['moyen','Moyen'],['dur','Difficile']]},
  ]},
  eggs: { title:'Easter Egg', fields:[
    {key:'title', label:'Nom du secret', type:'text'},
    {key:'tag', label:'Catégorie (visuel/son/texte...)', type:'text'},
    {key:'desc', label:'Comment le déclencher / où il se trouve', type:'textarea'},
    {key:'diff', label:'Difficulté à trouver', type:'select', options:[['facile','Facile'],['moyen','Moyen'],['dur','Difficile']]},
  ]},
  tasks: { title:'Tâche', fields:[
    {key:'title', label:'Titre de la tâche', type:'text'},
    {key:'status', label:'Statut', type:'select', options:[['todo','À faire'],['doing','En cours'],['done','Terminé']]},
    {key:'notes', label:'Notes', type:'textarea'},
  ]},
  team: { title:'Membre de l\'équipe', fields:[
    {key:'name', label:'Nom', type:'text'},
    {key:'role', label:'Rôle (dev, 3D, son, level design...)', type:'text'},
    {key:'desc', label:'Description / ce qu\'il fait sur le projet', type:'textarea'},
  ]},
  profs: { title:'Professeur', fields:[
    {key:'name', label:'Nom du professeur', type:'text'},
    {key:'role', label:'Fonction', type:'text'},
    {key:'desc', label:'Fonctionnement / rôle dans le projet', type:'textarea'},
  ]}
};

let modalState = { kind:null, editingId:null };

function openModal(kind, id=null){
  modalState = { kind, editingId:id };
  const cfg = FORM_CONFIGS[kind];
  document.getElementById('modalTitle').textContent = (id ? 'Modifier — ' : 'Nouveau — ') + cfg.title;
  const existing = id ? DATA[kind].find(x=>x.id===id) : {};
  document.getElementById('modalFields').innerHTML = cfg.fields.map(f => {
    const val = existing[f.key] || '';
    if(f.type === 'textarea'){
      return `<div class="field"><label>${f.label}</label><textarea data-key="${f.key}">${escapeHtml(val)}</textarea></div>`;
    }
    if(f.type === 'select'){
      return `<div class="field"><label>${f.label}</label><select data-key="${f.key}">${f.options.map(([v,l])=>`<option value="${v}" ${v===val?'selected':''}>${l}</option>`).join('')}</select></div>`;
    }
    return `<div class="field"><label>${f.label}</label><input data-key="${f.key}" type="text" value="${escapeHtml(val)}"></div>`;
  }).join('');
  document.getElementById('overlay').classList.add('open');
}
function closeModal(){ document.getElementById('overlay').classList.remove('open'); }
function editItem(kind, id){ openModal(kind, id); }

function saveModal(){
  const { kind, editingId } = modalState;
  const cfg = FORM_CONFIGS[kind];
  const obj = editingId ? DATA[kind].find(x=>x.id===editingId) : { id: cryptoId() };
  cfg.fields.forEach(f => {
    const input = document.querySelector(`#modalFields [data-key="${f.key}"]`);
    obj[f.key] = input.value;
  });
  if(!editingId) DATA[kind].push(obj);
  saveData();
  closeModal();
}

function deleteItem(kind, id){
  if(!confirm('Supprimer cet élément ?')) return;
  DATA[kind] = DATA[kind].filter(x=>x.id!==id);
  saveData();
}

/* ---------------- Notes / Export / Import / Reset ---------------- */
function saveNotes(){
  DATA.notes = document.getElementById('notesArea').value;
  localStorage.setItem(LS_KEY, JSON.stringify(DATA));
}

function exportData(){
  const blob = new Blob([JSON.stringify(DATA, null, 2)], {type:'application/json'});
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url; a.download = 'regame-data.json'; a.click();
  URL.revokeObjectURL(url);
}

function importData(ev){
  const file = ev.target.files[0];
  if(!file) return;
  const reader = new FileReader();
  reader.onload = () => {
    try{
      const parsed = JSON.parse(reader.result);
      DATA = parsed;
      for(const k of Object.keys(DEFAULT_DATA)){ if(!(k in DATA)) DATA[k] = DEFAULT_DATA[k]; }
      saveData();
      alert('Import réussi !');
    }catch(e){ alert('Fichier invalide.'); }
  };
  reader.readAsText(file);
}

function resetAll(){
  if(!confirm('Réinitialiser toutes les données locales du site ? Cette action est irréversible.')) return;
  localStorage.removeItem(LS_KEY);
  DATA = loadData();
  renderAll();
}

/* ---------------- Init ---------------- */
renderAll();
