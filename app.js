const DEFAULT_AGENTS = [
  "9432 - PATRICIA", "9433 - OFICIAL PARRA", "11862 - DAVID MELLADO", "9421 - MELCHOR GARCIA", "9436 - JOSE M. PUPO",
  "9411 - OFICIAL MUÑOZ", "9428 - ANTONIO MALIA", "16799 - JOSE MARIA", "9414 - J.G. APARICIO", "14641 - J.A. CORREA",
  "9416 - FRANCISCO ASENCIO", "14643 - SARMIENTO", "14642 - PEDRO GUERRERO", "9417 - A. CAAMAÑO", "9423 - J.G. GUNDIN",
  "16798 - ANA ANDRADES", "9437 - VICTOR GUERRA", "9426 - DAVID LECHUGA", "9431 - OFICIAL CORTABARRA",
  "9434 - SAMUEL PEREZ", "9427 - DOLORES LOPEZ"
];

const DEFAULT_LEAVE_TYPES = [
  "Libre Disposición", "Horas por Juicio", "Asuntos Familiares", "Asuntos Propios", 
  "Examen", "Cursos de Formación", "Baja", "Otros", "Horas Sindicales", "Horas de Prevención"
];

const SPECIAL_TYPES = new Set(["Horas Sindicales","Horas de Prevención"]);

let AGENTS = JSON.parse(localStorage.getItem("pl_agents")) || DEFAULT_AGENTS;
let LEAVE_TYPES = JSON.parse(localStorage.getItem("pl_types")) || DEFAULT_LEAVE_TYPES;

function saveConfig(){
  triggerAutoSync();
  localStorage.setItem("pl_agents", JSON.stringify(AGENTS));
  localStorage.setItem("pl_types", JSON.stringify(LEAVE_TYPES));
}

const today = new Date(); today.setHours(0,0,0,0);
let weekOffset = 0;
let selectedRequestId = null;

const DEFAULT_REQUESTS = [];

let requests = JSON.parse(localStorage.getItem("pl_requests")) || DEFAULT_REQUESTS;

function saveRequests(){
  triggerAutoSync();
  localStorage.setItem("pl_requests", JSON.stringify(requests));
}

const STATUS = {pending:"Pendiente",granted:"Concedido",denied:"No concedido"};

function iso(d){return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}-${String(d.getDate()).padStart(2,"0")}`}
function parseDate(s){const [y,m,d]=s.split("-").map(Number);return new Date(y,m-1,d)}
function startOfWeek(d){const x=new Date(d);x.setHours(0,0,0,0);x.setDate(x.getDate()-(x.getDay()+6)%7);return x}
function fmt(d,opts){return new Intl.DateTimeFormat("es-ES",opts).format(d)}
function escapeHtml(s){return String(s).replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]))}

function populateSelects(){
  const agentSelect = document.querySelector("#agent");
  const calledSelect = document.querySelector("#called-agent");
  const typeSelect = document.querySelector("#leave-type");

  if(!agentSelect || !calledSelect || !typeSelect) return;

  const currentAgent = agentSelect.value;
  const currentCalled = calledSelect.value;
  const currentType = typeSelect.value;

  agentSelect.innerHTML = '<option value="">Seleccionar agente</option>' + AGENTS.map(a=>`<option>${escapeHtml(a)}</option>`).join("");
  calledSelect.innerHTML = '<option value="">Seleccionar agente</option>' + AGENTS.map(a=>`<option>${escapeHtml(a)}</option>`).join("");
  typeSelect.innerHTML = '<option value="">Seleccionar tipo</option>' + LEAVE_TYPES.map(t=>`<option>${escapeHtml(t)}</option>`).join("");

  if(AGENTS.includes(currentAgent)) agentSelect.value = currentAgent;
  if(AGENTS.includes(currentCalled)) calledSelect.value = currentCalled;
  if(LEAVE_TYPES.includes(currentType)) typeSelect.value = currentType;

  renderSettingsLists();
}

function renderSettingsLists(){
  const agentsList = document.querySelector("#agents-list");
  const typesList = document.querySelector("#types-list");
  if(!agentsList || !typesList) return;

  agentsList.innerHTML = AGENTS.map((a, i)=>`
    <li class="admin-item">
      <span>${escapeHtml(a)}</span>
      <div class="item-actions">
        <button type="button" class="move-btn" title="Subir" onclick="moveAgent(${i}, -1)">▲</button>
        <button type="button" class="move-btn" title="Bajar" onclick="moveAgent(${i}, 1)">▼</button>
        <button type="button" class="del-btn" title="Eliminar" onclick="removeAgent('${escapeHtml(a)}')">×</button>
      </div>
    </li>
  `).join("");

  typesList.innerHTML = LEAVE_TYPES.map((t, i)=>{
    const isProtected = SPECIAL_TYPES.has(t);
    return `
      <li class="admin-item ${isProtected ? 'protected' : ''}">
        <span>${escapeHtml(t)} ${isProtected ? '<span class="badge-locked">PROTEGIDO</span>' : ''}</span>
        <div class="item-actions">
          <button type="button" class="move-btn" title="Subir" onclick="moveLeaveType(${i}, -1)">▲</button>
          <button type="button" class="move-btn" title="Bajar" onclick="moveLeaveType(${i}, 1)">▼</button>
          ${isProtected ? '' : `<button type="button" class="del-btn" title="Eliminar" onclick="removeLeaveType('${escapeHtml(t)}')">×</button>`}
        </div>
      </li>
    `;
  }).join("");
}

window.moveAgent = function(index, direction){
  const newIndex = index + direction;
  if(newIndex < 0 || newIndex >= AGENTS.length) return;
  const item = AGENTS.splice(index, 1)[0];
  AGENTS.splice(newIndex, 0, item);
  saveConfig();
  populateSelects();
  renderWeek();
};

window.moveLeaveType = function(index, direction){
  const newIndex = index + direction;
  if(newIndex < 0 || newIndex >= LEAVE_TYPES.length) return;
  const item = LEAVE_TYPES.splice(index, 1)[0];
  LEAVE_TYPES.splice(newIndex, 0, item);
  saveConfig();
  populateSelects();
  renderWeek();
};

window.removeAgent = function(name){
  if(AGENTS.length <= 1){ alert("Debe haber al menos un agente en la plantilla."); return; }
  AGENTS = AGENTS.filter(a => a !== name);
  saveConfig();
  populateSelects();
  renderWeek();
};

window.removeLeaveType = function(name){
  if(SPECIAL_TYPES.has(name)){ alert("Este tipo de día está protegido y no se puede eliminar."); return; }
  if(LEAVE_TYPES.length <= 1){ alert("Debe haber al menos un tipo de día libre."); return; }
  LEAVE_TYPES = LEAVE_TYPES.filter(t => t !== name);
  saveConfig();
  populateSelects();
  renderWeek();
};

const addAgentForm = document.querySelector("#add-agent-form");
if(addAgentForm){
  addAgentForm.addEventListener("submit", e=>{
    e.preventDefault();
    const input = document.querySelector("#new-agent-name");
    const name = input.value.trim().toUpperCase();
    if(!name) return;
    if(AGENTS.includes(name)){ alert("Este agente ya existe en la plantilla."); return; }
    AGENTS.push(name);
    saveConfig();
    input.value = "";
    populateSelects();
    renderWeek();
  });
}

const addTypeForm = document.querySelector("#add-type-form");
if(addTypeForm){
  addTypeForm.addEventListener("submit", e=>{
    e.preventDefault();
    const input = document.querySelector("#new-type-name");
    const name = input.value.trim();
    if(!name) return;
    if(LEAVE_TYPES.includes(name)){ alert("Este tipo de día ya existe."); return; }
    LEAVE_TYPES.push(name);
    saveConfig();
    input.value = "";
    populateSelects();
    renderWeek();
  });
}

// JSON Backup & Restore handlers
const exportBtn = document.querySelector("#export-json");
if(exportBtn){
  exportBtn.addEventListener("click", ()=>{
    const data = {
      version: "1.0",
      exportDate: new Date().toISOString(),
      agents: AGENTS,
      leaveTypes: LEAVE_TYPES,
      requests: requests
    };
    const blob = new Blob([JSON.stringify(data, null, 2)], {type: "application/json"});
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `backup_solicitudes_pl_${iso(new Date())}.json`;
    a.click();
    URL.revokeObjectURL(url);
  });
}

const importInput = document.querySelector("#import-json");
if(importInput){
  importInput.addEventListener("change", e=>{
    const file = e.target.files[0];
    if(!file) return;
    const reader = new FileReader();
    reader.onload = event => {
      try {
        const data = JSON.parse(event.target.result);
        if(!data.agents || !data.leaveTypes || !data.requests) {
          throw new Error("El archivo JSON no tiene la estructura válida.");
        }
        AGENTS = data.agents;
        LEAVE_TYPES = data.leaveTypes;
        requests = data.requests;
        saveConfig();
        saveRequests();
        populateSelects();
        renderWeek();
        renderHistory();
        alert("Copia de seguridad importada correctamente.");
      } catch(err) {
        alert("Error al importar el archivo JSON: " + err.message);
      }
      e.target.value = "";
    };
    reader.readAsText(file);
  });
}

const resetBtn = document.querySelector("#reset-data");
if(resetBtn){
  resetBtn.addEventListener("click", ()=>{
    if(confirm("¿Estás seguro de restablecer los valores iniciales? Se perderán los datos actuales no exportados.")) {
      AGENTS = [...DEFAULT_AGENTS];
      LEAVE_TYPES = [...DEFAULT_LEAVE_TYPES];
      requests = [...DEFAULT_REQUESTS];
      saveConfig();
      saveRequests();
      populateSelects();
      renderWeek();
      renderHistory();
      alert("Aplicación restablecida a los valores iniciales (sin solicitudes de prueba).");
    }
  });
}

function getWeekDates(){
  const start=startOfWeek(today);start.setDate(start.getDate()+weekOffset*7);
  return Array.from({length:7},(_,i)=>{const d=new Date(start);d.setDate(start.getDate()+i);return d});
}
function comparePriority(a,b){return (a.submittedDate+"T"+a.submittedTime).localeCompare(b.submittedDate+"T"+b.submittedTime)||a.createdAt.localeCompare(b.createdAt)}
function compareDayShift(a,b){return a.date.localeCompare(b.date)||(a.shift==="MAÑANA"?0:1)-(b.shift==="MAÑANA"?0:1)||comparePriority(a,b)}
function printGroups(weekRequests){return [
  {title:"Horas Sindicales/Prevención",items:weekRequests.filter(r=>r.status==="pending"&&SPECIAL_TYPES.has(r.type)).sort(compareDayShift)},
  {title:"Solicitudes pendientes",items:weekRequests.filter(r=>r.status==="pending"&&!SPECIAL_TYPES.has(r.type)).sort(comparePriority)},
  {title:"Solicitudes resueltas",items:weekRequests.filter(r=>r.status!=="pending").sort(compareDayShift)}
]}
function renderPrint(){
  const days=getWeekDates(),from=iso(days[0]),to=iso(days[6]);
  const groups=printGroups(requests.filter(r=>r.date>=from&&r.date<=to));
  const weekLabelEl = document.querySelector("#week-label");
  document.querySelector("#print-report").innerHTML=`<header class="print-heading"><img class="print-crest" src="icono-192.png" alt="Escudo de la Policía Local de Vejer"><h1>Gestión de solicitudes · Policía Local</h1><p>${escapeHtml(weekLabelEl ? weekLabelEl.textContent : '')}</p></header>`+groups.map((g,gi)=>`<section class="print-group"><h2>${g.title} (${g.items.length})</h2>${g.items.length?g.items.map((r,i)=>`<article class="print-entry"><div class="print-date">${fmt(parseDate(r.date),{weekday:"long",day:"2-digit",month:"2-digit"})}</div>${card(r,gi===1?i+1:undefined)}</article>`).join(""):'<p class="print-empty">Sin solicitudes</p>'}</section>`).join("");
}

const printWeekBtn = document.querySelector("#print-week");
if(printWeekBtn) printWeekBtn.addEventListener("click",()=>{renderPrint();window.print()});
window.addEventListener("beforeprint",renderPrint);

function renderWeek(){
  const days=getWeekDates(), first=days[0],last=days[6];
  const weekLabelEl = document.querySelector("#week-label");
  if(weekLabelEl){
    weekLabelEl.textContent=`${fmt(first,{day:"2-digit",month:"long",year:"numeric"})} — ${fmt(last,{day:"2-digit",month:"long",year:"numeric"})}`.toUpperCase();
  }
  const from=iso(first),to=iso(last);
  const weekRequests=requests.filter(r=>r.date>=from&&r.date<=to);
  const pending=[...weekRequests].filter(r=>r.status==="pending"&&!SPECIAL_TYPES.has(r.type)).sort(comparePriority);
  const ranks=new Map(pending.map((r,i)=>[r.id,i+1]));
  const weekGridEl = document.querySelector("#week-grid");
  if(weekGridEl){
    weekGridEl.innerHTML=days.map(d=>{
      const date=iso(d),list=weekRequests.filter(r=>r.date===date).sort((a,b)=>{
        if(a.status==="pending"&&b.status!=="pending")return -1;if(b.status==="pending"&&a.status!=="pending")return 1;
        return (a.submittedDate+a.submittedTime).localeCompare(b.submittedDate+b.submittedTime);
      });
      return `<section class="day-column"><div class="day-head"><div class="day-name">${fmt(d,{weekday:"long"}).toUpperCase()}</div><div class="day-date">${fmt(d,{day:"2-digit",month:"short"})}</div></div><div class="day-content">${list.length?list.map(r=>card(r,ranks.get(r.id))).join(""):'<div class="empty-day">Sin solicitudes</div>'}</div></section>`;
    }).join("");
    document.querySelectorAll(".request-card").forEach(el=>el.addEventListener("click",()=>openManage(el.dataset.id)));
  }
}

function card(r,rank){
  const specialPending=r.status==="pending"&&SPECIAL_TYPES.has(r.type);
  const badge=specialPending?"":r.status==="pending"?`PRIORIDAD ${rank}`:STATUS[r.status].toUpperCase();
  return `<button class="request-card ${r.status}${specialPending?" special-pending":""}" data-id="${r.id}">${badge?`<div class="card-top"><span class="priority">${badge}</span></div>`:""}<div class="card-agent">${escapeHtml(r.agent)}</div><div class="card-type">${escapeHtml(r.type)}</div><div class="card-shift ${r.shift==="MAÑANA"?"morning":"night"}">TURNO DE ${escapeHtml(r.shift)}</div><div class="card-time">Solicitud: ${fmt(parseDate(r.submittedDate),{day:"2-digit",month:"2-digit","year":"numeric"})} · ${escapeHtml(r.submittedTime)}</div></button>`;
}

function openManage(id){
  const r=requests.find(x=>x.id===id);if(!r)return;selectedRequestId=id;
  const dialogTitle = document.querySelector("#dialog-title");
  const dialogDetails = document.querySelector("#dialog-details");
  if(dialogTitle) dialogTitle.textContent=`${r.agent} · ${fmt(parseDate(r.date),{day:"2-digit",month:"long",year:"numeric"})}`;
  if(dialogDetails) dialogDetails.innerHTML=`<strong>Agente:</strong> ${escapeHtml(r.agent)}<br><strong>Tipo:</strong> ${escapeHtml(r.type)}<br><strong>Turno:</strong> ${escapeHtml(r.shift)}<br><strong>Fecha de solicitud:</strong> ${escapeHtml(r.submittedDate)} · ${escapeHtml(r.submittedTime)}<br><strong>Estado:</strong> ${STATUS[r.status]}${r.called?`<br><strong>Agente llamado:</strong> ${escapeHtml(r.called)}`:""}`;
  
  const calledAgentEl = document.querySelector("#called-agent");
  const noAgentEl = document.querySelector("#no-agent");
  const resolutionEl = document.querySelector("#resolution");
  const observationsEl = document.querySelector("#observations");
  const manageDialogEl = document.querySelector("#manage-dialog");

  if(calledAgentEl) calledAgentEl.value=r.called||"";
  if(noAgentEl) noAgentEl.checked=r.called==="SIN AGENTE DISPONIBLE";
  if(resolutionEl) resolutionEl.value=r.status==="pending"?"":r.status;
  if(observationsEl) observationsEl.value=r.observations||"";
  if(manageDialogEl) manageDialogEl.showModal();
}

function showView(name){
  document.querySelectorAll(".view").forEach(v=>v.classList.toggle("active",v.id===`view-${name}`));
  document.querySelectorAll(".nav-btn").forEach(b=>b.classList.toggle("active",b.dataset.view===name));
  if(name==="weekly")renderWeek();if(name==="history")renderHistory();
}

document.querySelectorAll(".nav-btn").forEach(b=>b.addEventListener("click",()=>showView(b.dataset.view)));

const prevWeekBtn = document.querySelector("#prev-week");
const nextWeekBtn = document.querySelector("#next-week");
const thisWeekBtn = document.querySelector("#this-week");

if(prevWeekBtn) prevWeekBtn.addEventListener("click",()=>{weekOffset--;renderWeek()});
if(nextWeekBtn) nextWeekBtn.addEventListener("click",()=>{weekOffset++;renderWeek()});
if(thisWeekBtn) thisWeekBtn.addEventListener("click",()=>{weekOffset=0;renderWeek()});

const requestForm = document.querySelector("#request-form");
if(requestForm){
  requestForm.addEventListener("submit",e=>{
    e.preventDefault();
    const r={id:crypto.randomUUID(),agent:document.querySelector("#agent").value,type:document.querySelector("#leave-type").value,date:document.querySelector("#requested-date").value,shift:document.querySelector("#shift").value,submittedDate:document.querySelector("#submitted-date").value,submittedTime:document.querySelector("#submitted-time").value,status:"pending",called:"",observations:"",createdAt:new Date().toISOString(),resolvedAt:""};
    requests.push(r);
    saveRequests();
    e.target.reset();weekOffset=Math.floor((startOfWeek(parseDate(r.date))-startOfWeek(today))/(7*86400000));showView("weekly");
  });
}

const noAgentCheckbox = document.querySelector("#no-agent");
if(noAgentCheckbox) noAgentCheckbox.addEventListener("change",e=>{if(e.target.checked)document.querySelector("#called-agent").value=""});

const calledAgentSelect = document.querySelector("#called-agent");
if(calledAgentSelect) calledAgentSelect.addEventListener("change",e=>{if(e.target.value)document.querySelector("#no-agent").checked=false});

const manageForm = document.querySelector("#manage-form");
if(manageForm){
  manageForm.addEventListener("submit",e=>{
    e.preventDefault();const r=requests.find(x=>x.id===selectedRequestId);if(!r)return;
    const resolution=document.querySelector("#resolution").value;if(!resolution){alert("Selecciona si la solicitud se concede o no se concede.");return}
    const noAgent=document.querySelector("#no-agent").checked,called=document.querySelector("#called-agent").value;
    if(!noAgent&&!called){alert("Selecciona el agente llamado o marca que no hay ningún agente disponible.");return}
    r.called=noAgent?"SIN AGENTE DISPONIBLE":called;r.status=resolution;r.observations=document.querySelector("#observations").value;r.resolvedAt=new Date().toISOString();
    saveRequests();
    document.querySelector("#manage-dialog").close();renderWeek();
  });
}

const cancelManageBtn = document.querySelector("#cancel-manage");
if(cancelManageBtn) cancelManageBtn.addEventListener("click",()=>document.querySelector("#manage-dialog").close());

function renderHistory(){
  const fromEl = document.querySelector("#history-from");
  const toEl = document.querySelector("#history-to");
  const statusEl = document.querySelector("#history-status");
  const historyBodyEl = document.querySelector("#history-body");
  if(!historyBodyEl) return;

  const from=fromEl?fromEl.value:"",to=toEl?toEl.value:"",status=statusEl?statusEl.value:"";
  const rows=requests.filter(r=>(!from||r.date>=from)&&(!to||r.date<=to)&&(!status||r.status===status)).sort((a,b)=>b.date.localeCompare(a.date));
  historyBodyEl.innerHTML=rows.length?rows.map(r=>`<tr><td>${escapeHtml(r.date)}</td><td>${escapeHtml(r.agent)}</td><td>${escapeHtml(r.type)}</td><td>${escapeHtml(r.shift)}</td><td><span class="status-pill ${r.status}">${STATUS[r.status]}</span></td><td>${escapeHtml(r.called||"—")}</td><td>${r.resolvedAt?fmt(new Date(r.resolvedAt),{day:"2-digit",month:"2-digit",year:"numeric",hour:"2-digit",minute:"2-digit"}):"—"}</td></tr>`).join(""):'<tr><td colspan="7">No hay solicitudes para los filtros seleccionados.</td></tr>';
}

const applyFiltersBtn = document.querySelector("#apply-filters");
if(applyFiltersBtn) applyFiltersBtn.addEventListener("click",renderHistory);

const clearFiltersBtn = document.querySelector("#clear-filters");
if(clearFiltersBtn) clearFiltersBtn.addEventListener("click",()=>{["history-from","history-to","history-status"].forEach(id=>document.querySelector("#"+id).value="");renderHistory()});

if("serviceWorker" in navigator && location.protocol.startsWith("http"))navigator.serviceWorker.register("./service-worker.js").catch(()=>{});

const deleteRequestBtn = document.querySelector("#delete-request");
if(deleteRequestBtn){
  deleteRequestBtn.addEventListener("click", ()=>{
    if(!selectedRequestId) return;
    if(confirm("¿Estás seguro de eliminar esta solicitud? Se retirará permanentemente.")) {
      requests = requests.filter(r => r.id !== selectedRequestId);
      saveRequests();
      document.querySelector("#manage-dialog").close();
      renderWeek();
      renderHistory();
    }
  });
}

// GitHub Sync Configuration & Integration
let ghConfig = JSON.parse(localStorage.getItem("pl_gh_config")) || {
  owner: "",
  repo: "",
  branch: "main",
  path: "datos.json",
  token: ""
};

function initGitHubSettingsForm(){
  const ownerEl = document.querySelector("#gh-owner");
  const repoEl = document.querySelector("#gh-repo");
  const branchEl = document.querySelector("#gh-branch");
  const pathEl = document.querySelector("#gh-path");
  const tokenEl = document.querySelector("#gh-token");

  if(ownerEl) ownerEl.value = ghConfig.owner;
  if(repoEl) repoEl.value = ghConfig.repo;
  if(branchEl) branchEl.value = ghConfig.branch || "main";
  if(pathEl) pathEl.value = ghConfig.path || "datos.json";
  if(tokenEl) tokenEl.value = ghConfig.token;
}

const saveGhConfigBtn = document.querySelector("#gh-save-config");
if(saveGhConfigBtn){
  saveGhConfigBtn.addEventListener("click", ()=>{
    ghConfig = {
      owner: document.querySelector("#gh-owner").value.trim(),
      repo: document.querySelector("#gh-repo").value.trim(),
      branch: document.querySelector("#gh-branch").value.trim() || "main",
      path: document.querySelector("#gh-path").value.trim() || "datos.json",
      token: document.querySelector("#gh-token").value.trim()
    };
    localStorage.setItem("pl_gh_config", JSON.stringify(ghConfig));
    alert("Credenciales de GitHub guardadas correctamente.");
  });
}

async function syncWithGitHub(silent = false){
  if(!ghConfig.owner || !ghConfig.repo || !ghConfig.token){
    if(!silent) alert("Por favor, configura el usuario, repositorio y el Token de GitHub en la sección de Configuración.");
    return;
  }

  const url = `https://api.github.com/repos/${ghConfig.owner}/${ghConfig.repo}/contents/${ghConfig.path}`;
  const headers = {
    "Authorization": `Bearer ${ghConfig.token}`,
    "Accept": "application/vnd.github+json",
    "X-GitHub-Api-Version": "2022-11-28"
  };

  try {
    // 1. Try to fetch existing file to get current SHA and data
    let currentSha = null;
    let remoteData = null;

    const getRes = await fetch(`${url}?ref=${ghConfig.branch}`, { headers });
    if(getRes.ok){
      const fileData = await getRes.json();
      currentSha = fileData.sha;
      // Decode base64 content
      const jsonString = new TextDecoder().decode(Uint8Array.from(atob(fileData.content), c => c.charCodeAt(0)));
      remoteData = JSON.parse(jsonString);
    } else if(getRes.status !== 404){
      const errJson = await getRes.json();
      throw new Error(errJson.message || "Error al conectar con GitHub");
    }

    // Compare or merge / push local state
    // For simplicity and full GitHub as single source of truth:
    // If remote exists and has data, we can merge or ask, or push local data to remote.
    // Let's push local data to GitHub so any device update is propagated, or if local is empty/older, pull.
    // Actually, let's push current local state to GitHub (or if remote is newer, pull).
    
    const payloadData = {
      version: "1.0",
      syncDate: new Date().toISOString(),
      agents: AGENTS,
      leaveTypes: LEAVE_TYPES,
      requests: requests
    };

    const contentEncoded = btoa(unescape(encodeURIComponent(JSON.stringify(payloadData, null, 2))));

    const putBody = {
      message: `Sync solicitudes PL - ${new Date().toLocaleString()}`,
      content: contentEncoded,
      branch: ghConfig.branch
    };
    if(currentSha) putBody.sha = currentSha;

    const putRes = await fetch(url, {
      method: "PUT",
      headers: { ...headers, "Content-Type": "application/json" },
      body: JSON.stringify(putBody)
    });

    if(!putRes.ok){
      const errJson = await putRes.json();
      throw new Error(errJson.message || "Error al guardar en GitHub");
    }

    if(!silent) alert("¡Sincronización con GitHub completada con éxito!");
  } catch(err){
    if(!silent) alert("Error en la sincronización con GitHub: " + err.message);
    console.error(err);
  }
}

async function loadFromGitHub(silent = true){
  if(!ghConfig.owner || !ghConfig.repo || !ghConfig.token) return;

  const url = `https://api.github.com/repos/${ghConfig.owner}/${ghConfig.repo}/contents/${ghConfig.path}`;
  const headers = {
    "Authorization": `Bearer ${ghConfig.token}`,
    "Accept": "application/vnd.github+json",
    "X-GitHub-Api-Version": "2022-11-28"
  };

  try {
    const res = await fetch(`${url}?ref=${ghConfig.branch}`, { headers });
    if(res.ok){
      const fileData = await res.json();
      const jsonString = new TextDecoder().decode(Uint8Array.from(atob(fileData.content), c => c.charCodeAt(0)));
      const data = JSON.parse(jsonString);
      if(data.agents && data.leaveTypes && data.requests){
        AGENTS = data.agents;
        LEAVE_TYPES = data.leaveTypes;
        requests = data.requests;
        saveConfig();
        saveRequests();
        populateSelects();
        renderWeek();
        renderHistory();
        if(!silent) alert("Datos descargados y actualizados desde GitHub.");
      }
    }
  } catch(err){
    console.error("No se pudo cargar automáticamente desde GitHub:", err);
  }
}

const syncNowBtn = document.querySelector("#gh-sync-now");
if(syncNowBtn){
  syncNowBtn.addEventListener("click", async ()=>{
    syncNowBtn.textContent = "Sincronizando...";
    syncNowBtn.disabled = true;
    await syncWithGitHub(false);
    syncNowBtn.textContent = "☁️ Sincronizar con GitHub (Subir/Descargar)";
    syncNowBtn.disabled = false;
  });
}

// Auto load from GitHub on startup if configured
window.addEventListener("DOMContentLoaded", ()=>{
  initGitHubSettingsForm();
  loadFromGitHub(true);
});

// Auto-sync wrapper for GitHub
let isSyncing = false;
let syncTimeout = null;

function triggerAutoSync(){
  if(!ghConfig.owner || !ghConfig.repo || !ghConfig.token) return;
  if(syncTimeout) clearTimeout(syncTimeout);
  syncTimeout = setTimeout(async () => {
    if(isSyncing) return;
    isSyncing = true;
    try {
      await syncWithGitHub(true); // silent sync
    } catch(e) {
      console.error("Auto-sync error:", e);
    } finally {
      isSyncing = false;
    }
  }, 1500); // Wait 1.5 seconds after last change to batch edits
}

// Auto load from GitHub on startup if configured
window.addEventListener("DOMContentLoaded", async ()=>{
  initGitHubSettingsForm();
  if(ghConfig.owner && ghConfig.repo && ghConfig.token){
    await loadFromGitHub(true);
  }
  populateSelects();
  renderWeek();
  renderHistory();
});
