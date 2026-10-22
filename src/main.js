// NorthVale — Sombras de 1989
// Core Technical Architecture & Game Loop by Technical Director & Senior Game Architect
// Integrating Isometric Graphic Engine, Seed-based Culprit Generator, Unique Dense Interiors,
// 24h Social Simulation & Discrete Tailing, Corkboard Deductions, Advanced Interrogation,
// Achievement System, and 7 Narrative Branching Endings.

import {buildings, door, move, isOpen} from './world.js';
import {residents, residentPosition, updateVehicle, routine} from './simulation.js';
import {createState, collect, clues, getFullCluesRegistry} from './state.js';
import {Renderer} from './render.js';
import {AudioSystem} from './audio.js';
import {faceProfiles} from './graphics/materials.js';
import {SaveSystem} from './interiors/save-system.js';
import {DialogueSystem} from './ui/dialogue.js';

// Investigative, Narrative & Social Modules
import {AchievementSystem} from './narrative/achievements.js';
import {CanonicalCampaign} from './systems/CanonicalCampaign.js';
import {InputManager} from './systems/InputManager.js';
import {CampaignPanel} from './ui/CampaignPanel.js';
import {CorkboardSystem} from './investigation/corkboard.js';
import {InterrogationSystem} from './investigation/interrogation.js';
import {TailingSystem} from './social/tailing.js';

let state = createState();
const renderer = new Renderer(document.querySelector('canvas'));
const audio = new AudioSystem();
const keys = new Set();
const panel = document.querySelector('#panel');
const content = document.querySelector('#content');
const dialogue = new DialogueSystem();

let started = false;
let cinematic = false;
let sceneTime = 0;
let last = performance.now();
let toastTimer = 0;
let near = null;

const $ = s => document.querySelector(s);
const distance = (a, b) => Math.hypot(a.x - b.x, a.y - b.y);
const time = m => `${String(Math.floor(m / 60) % 24).padStart(2, '0')}:${String(Math.floor(m % 60)).padStart(2, '0')}`;

function toast(text) {
  $('#toast').textContent = text;
  $('#toast').style.display = 'block';
  toastTimer = 5;
}

function show(html) {
  renderer.inspectingIds = [];
  panel.classList.remove('canonical-panel');
  content.innerHTML = html;
  keys.clear();
  input?.releaseAll();
  if (!panel.open) panel.showModal();
}

function close() {
  panel.close();
  renderer.inspectingIds = [];
  keys.clear();
}

$('#close').onclick = close;
panel.addEventListener('close', () => keys.clear());
window.addEventListener('blur', () => keys.clear());

// Initialize Modular Investigation Systems
const achievements = new AchievementSystem(state, toast);
let campaign = new CanonicalCampaign(state,{onLock:()=>input.setWorldEnabled(false)});
let campaignPanel;
let input;

function onDeductionUnlocked(deduction) {
  if(deduction.isCulpritIndictment)campaign.flag('CORRECT_DEDUCTION');
  campaign.sync();checkpoint();
  audio.tone(440);
  toast(`DEDUÇÃO RESOLVIDA: ${deduction.title}!`);
  achievements.unlock('red_string_master');
  if (deduction.isCulpritIndictment) {
    achievements.unlock('master_deducer');
    toast(`DOSSIÊ CONCLUÍDO! Você identificou as conexões do assassino.`);
  }
}

function onContradictionProven(npcId, clueId) {
  campaign.confront(npcId);
  checkpoint();
  audio.tone(520);
  toast(`CONTRADIÇÃO PROVADA: o depoimento foi confrontado com prova material.`);
  state.PARANOIA = Math.min(100, state.PARANOIA + 8);
  state.obsession=state.PARANOIA;
}

function onClandestineMeeting(npc) {
  audio.tone(360);
  toast(`ENCONTRO CLANDESTINO FLAGRADO! Você observou ${npc.name} repassando informações nas sombras.`);
  achievements.unlock('silent_shadow');
  state.integrity = Math.max(0, (state.integrity || 50) + 5);
}

const corkboard = new CorkboardSystem(state, getFullCluesRegistry(state), onDeductionUnlocked, achievements,checkpoint);
const interrogation = new InterrogationSystem(state, getFullCluesRegistry(state), onContradictionProven, achievements);
const tailing = new TailingSystem(state, achievements, onClandestineMeeting);

// Game Flow & Intro
function finishIntro() {
  cinematic = false;
  state.introDone = true;
  state.metHelen = true;
  if (!state.inventory.includes('Chave de Sarah')) state.inventory.push('Chave de Sarah');
  campaign.sync();checkpoint();
  toast('Helen entregou a chave da casa. “Por favor, encontre minha filha.” [J] Caderno | [C] Cortiça | [T] Conquistas');
}

$('#begin').onclick = () => {
  $('#intro').hidden = true;
  started = true;
  cinematic = true;
  sceneTime = 0;
};

// Persistence
function save() {
  try {
    new SaveSystem(state).save(localStorage);
    toast('Investigação e missões salvas neste navegador.');
  } catch {
    toast('Não foi possível salvar. Verifique o armazenamento do navegador.');
  }
}

function checkpoint() {
  try {
    new SaveSystem(state).save(localStorage);
  } catch {
    /* Manual save fallback */
  }
}

async function load() {
  try {
    const saved = SaveSystem.load(localStorage);
    if (saved.interior) await renderer.interiors.ready;
    state = saved;
    renderer.buildingTransition.cancel();
    // Re-bind systems to loaded state
    achievements.state = state;
    campaign = new CanonicalCampaign(state,{onLock:()=>input.setWorldEnabled(false)});
    campaign.sync();
    input.setWorldEnabled(!state.ending);
    corkboard.state = state;
    corkboard.cluesRegistry = getFullCluesRegistry(state);
    interrogation.state = state;
    interrogation.cluesRegistry = getFullCluesRegistry(state);
    tailing.state = state;

    started = true;
    cinematic = false;
    renderer.focus = null;
    dialogue.close();
    if (state.interior) renderer.interiors.enter(state);
    else {
      renderer.interiors.navigation = null;
      renderer.interiors.transition = null;
    }
    $('#intro').hidden = true;
    close();
    near = null;
    toast('Investigação canônica carregada.');
    if(state.ending)campaignPanel.ending(state.ending);
  } catch (e) {
    toast(e.message);
  }
}

$('#save').onclick = save;
$('#load').onclick = load;
$('#sound').onclick = () => {
  $('#sound').textContent = 'Som: ' + (audio.toggle() ? 'ligado' : 'desligado');
};

$('#corkboard-btn').onclick = () => corkboard.open();
$('#achievements-btn').onclick = () => showAchievementsPanel();
$('#accuse-btn').onclick = () => openAccusationPanel();

const pointerCanvas = document.querySelector('#world');
pointerCanvas.addEventListener('pointermove', e => {
  const rect = pointerCanvas.getBoundingClientRect();
  renderer.pointer = {x: e.clientX - rect.left, y: e.clientY - rect.top};
});
pointerCanvas.addEventListener('pointerleave', () => renderer.pointer = null);


renderer.interiors.ready.catch(error => toast(error.message));

// Graphics & Visual Laboratory
$('#graphics').onclick = () => {
  show(`
    <small>NORTHVALE / LABORATÓRIO VISUAL & SHADERS</small>
    <h2>Materiais, Luzes & Fachadas</h2>
    <p>Renderização com Y-sorting dinâmico, Roof Cutaway para transição de fachadas, asfalto molhado com poças refletivas e sombras com shadowBlur.</p>
    <div class="face-grid">${Object.keys(faceProfiles).map(id => `<figure><canvas class="portrait" data-face="${id}" width="256" height="256"></canvas><figcaption>${id.toUpperCase()}</figcaption></figure>`).join('')}</div>
    <h3>Canais do material de Alex Hale</h3>
    <div class="map-grid">${['base', 'normal', 'specular', 'ao'].map(name => `<figure><canvas class="map-preview" data-map="${name}" width="256" height="256"></canvas><figcaption>${name}</figcaption></figure>`).join('')}</div>
    <label>Renderização <select id="quality"><option value="high">Materiais WebGL2</option><option value="low">Canvas / baixa resolução</option></select></label>
    <label>Detalhes <select id="density"><option value="1">Completo</option><option value="0.5">Médio</option><option value="0.25">Leve</option></select></label>
    <p><label><input id="light-toggle" type="checkbox"> Luzes pontuais</label> <label><input id="ao-toggle" type="checkbox"> Oclusão de contato & sombras</label></p>
    <output id="graphics-stats"></output>
  `);
  renderer.inspectingIds = Object.keys(faceProfiles);
  $('#quality').value = renderer.quality;
  $('#density').value = String(renderer.density);
  $('#light-toggle').checked = renderer.lighting.enabled;
  $('#ao-toggle').checked = renderer.lighting.ao;
  $('#quality').onchange = e => { renderer.quality = e.target.value; renderer.assets.setGPU(renderer.quality === 'high'); renderer.resize(); };
  $('#density').onchange = e => renderer.density = Number(e.target.value);
  $('#light-toggle').onchange = e => renderer.lighting.enabled = e.target.checked;
  $('#ao-toggle').onchange = e => renderer.lighting.ao = e.target.checked;
};

function updateVisualPanels() {
  if (!panel.open) return;
  for (const canvas of content.querySelectorAll('[data-face]')) {
    const image = renderer.assets.portrait(canvas.dataset.face);
    if (image) {
      const c = canvas.getContext('2d');
      c.clearRect(0, 0, 256, 256);
      c.drawImage(image, 0, 0, 256, 256);
    }
  }
  const material = renderer.assets.leases.get('face:alex')?.lease?.value;
  if (material) {
    for (const canvas of content.querySelectorAll('[data-map]')) {
      const c = canvas.getContext('2d');
      c.clearRect(0, 0, 256, 256);
      c.drawImage(material.maps[canvas.dataset.map], 0, 0, 256, 256);
    }
  }
  const output=$('#graphics-stats');if(output){const stats=renderer.assets.stats();output.textContent=`${stats.webgl&&renderer.assets.gpuEnabled?'WebGL2 ativo':'Canvas fallback'} · ${(stats.bytes/1048576).toFixed(1)} MiB · ${stats.entries} materiais · ${stats.drawCalls} passes GPU`;output.dataset.webgl=String(stats.webgl);output.dataset.drawCalls=String(stats.drawCalls);output.dataset.errors=JSON.stringify([...stats.errors,...stats.shaderErrors]);}

}

// Notebook / Investigation Dossier & Alex Hale Psychometrics
function notebook() {
  const reg = getFullCluesRegistry(state);
  show(`
    <small>CADERNO DE ALEX HALE · 1989</small>
    <h2>Dossiê Investigativo & Mente do Detetive</h2>
    <div style="background:#1b262c;color:#e8ecda;padding:14px;margin-bottom:16px;border-left:4px solid #a855f7">
      <strong>Perfil Psicométrico de Alex Hale:</strong>
      <p style="margin:4px 0">Obsessão / Paranoia: <b>${state.obsession || 20}%</b> · Integridade Moral: <b>${state.integrity || 75}%</b></p>
      <small style="color:#adb5bd">Inspecionar cenas perturbadoras e não dormir eleva a paranoia. Recusar subornos eleva a integridade.</small>
    </div>
    <p>Dia ${state.day} · ${time(state.minute)} · ${state.evidence.length} evidências registradas · Campanha canônica</p>
    <button id="journal-missions">Missões e decisões</button><button id="journal-controls">Controles</button><h3>Inventário Pessoal</h3>
    <p>${state.inventory.map(id=>({phenol:'Frasco de fenol',luminol:'Frasco de luminol',lockpick_receipt:'Recibo das ferramentas'})[id]||id).join(' · ')}</p>
    <h3>Evidências Registradas (${state.evidence.length})</h3>
    ${state.evidence.map(id => `<div class="entry"><strong>${reg[id]?.title || id}</strong><p>${reg[id]?.text || ''}</p></div>`).join('') || '<p>Nenhuma evidência registrada ainda.</p>'}
    <h3>Deduções no Quadro de Cortiça (${state.corkboardDeductions?.length || 0})</h3>
    <p>Pressione <b>[C]</b> para abrir o Quadro de Cortiça interativo e conectar fotografias e documentos com a linha vermelha.</p>
    <h3>Rotinas dos Moradores às ${time(state.minute)}</h3>
    ${residents.map(p => `
      <div class="entry">
        <strong>${p.name}</strong> <small style="color:#b5b69f">(${p.personality})</small>
        <p><span class="tag">${routine(p, state.minute).activity} · ${buildings.find(b => b.id === routine(p, state.minute).place)?.name || 'NorthVale'}</span></p>
      </div>
    `).join('')}
    <h3>Avanço Temporal</h3>
    <button id="wait">Esperar 1 hora</button>
  `);
  $('#journal-missions').onclick=()=>openAccusationPanel();$('#journal-controls').onclick=()=>campaignPanel.controls();
  $('#wait').onclick = () => { if(state.ending)return;advance(60);checkpoint();notebook(); };
}

function showAchievementsPanel() {
  show(achievements.renderListHTML());
}

// Final Accusation & 7 Endings Panel
function openAccusationPanel(){campaign.sync();campaignPanel.open();}

function map() {
  show(`
    <small>GUIA MUNICIPAL · 1989</small>
    <h2>NorthVale</h2>
    <p>O norte fica na diagonal superior direita da vista isométrica. A avenida principal atravessa o centro.</p>
    <svg viewBox="0 0 570 510" role="img" aria-label="Mapa físico da cidade" style="width:100%;background:#bcc1a8">
      <path d="M0 243H570 M285 0V510" stroke="#687b77" stroke-width="36"/>
      ${buildings.map(b => `<rect x="${b.x * .3}" y="${b.y * .3}" width="${b.w * .3}" height="${b.h * .3}" fill="#515d52"/><text x="${b.x * .3}" y="${b.y * .3 - 5}" fill="#273934" font-size="8">${b.name}</text>`).join('')}
      <circle cx="${(state.interior ? state.outdoor.x : state.player.x) * .3}" cy="${(state.interior ? state.outdoor.y : state.player.y) * .3}" r="6" fill="#8e362e"/>
    </svg>
    <p>● Posição Atual · Prédios em cinza escuro · Aproxime-se das portas para revelar interiores.</p>
  `);
}

function advance(minutes) {
  if(state.ending)return;
  state.minute += minutes;
  while (state.minute >= 1440) {
    state.minute -= 1440;
    state.day++;
  }
  achievements.checkTime(state.minute, state.day);
  achievements.checkObsession(state.obsession);
}

function findNearby() {
  if (state.interior) {
    if (!renderer.interiors.loaded) return null;
    const hovered = renderer.interiorView.pick(renderer.pointer, state);
    const target = renderer.interiors.nearby(state, hovered);
    renderer.interiorView.focus = target;
    return target ? {type: 'interior', target, label: 'E · ' + target.name + (target.isLocked ? ' · Trancada' : '')} : null;
  }
  const npc = residents.find(p => {
    const pos = residentPosition(p, state.minute);
    return !pos.inside && distance(state.player, pos) < 55;
  });
  if (npc && !state.driving && !(npc.id === 'helen' && state.metHelen)) {
    return {type: 'npc', npc, label: `E · Falar com ${npc.name}  |  I · Interrogar  |  P · Seguir`};
  }
  const b = buildings.find(b => distance(state.player, door(b)) < 65);
  if (b && !state.driving) {
    return {type: 'door', building: b, label: 'E · Entrar em ' + b.name + (isOpen(b, state.minute) ? '' : ' · Fechado')};
  }
  return null;
}

function requestInterior(target) {
  const result = renderer.interiors.navigate(state, target);
  keys.clear();
  if (result.arrived) performInterior(result.arrived);
  else if (result.message) toast(result.message);
}

function performInterior(target) {
  if (renderer.interiors.transition||state.ending) return;
  const result = renderer.interiors.interact(state, target);
  if (!result.ok) {
    if (result.message) toast(result.message);
    return;
  }
  keys.clear();

  if (result.exit) {
    renderer.buildingTransition.cancel();
    state.player = { ...(state.outdoor || {x: 720, y: 705, angle: 0}), vx: 0, vy: 0 };
    state.interior = null;
    state.interiorRoom = null;
    renderer.interiors.navigation = null;
    renderer.interiorView.focus = null;
    checkpoint();
    return;
  }

  checkpoint();
  // Authored canonical evidence, matched to its exact room and prop
  if (state.case?.clues) {
    for (const [clueId, clueData] of Object.entries(state.case.clues)) {
      if (
        !clueData.discovered &&
        clueData.interiorId === state.interior &&
        (clueData.roomId === state.interiorRoom || !clueData.roomId) &&
        clueData.propId === target.object?.id
      ) {
        collect(state, clueId);campaign.sync();
        achievements.unlock('first_trace');
        if (state.interior === 'dam') achievements.unlock('deep_waters');
        toast(`NOVA EVIDÊNCIA DO CASO ENCONTRADA: ${clueData.title}!`);
        corkboard.cluesRegistry = getFullCluesRegistry(state);
        interrogation.cluesRegistry = getFullCluesRegistry(state);
        show(`
          <small>EVIDÊNCIA MATERIAL REGISTRADA</small>
          <h2>${clueData.title}</h2>
          <p>${clueData.text}</p>
          <p class="tag">Conecte esta pista no Quadro de Cortiça [C] ou no Caderno [J].</p>
        `);
        checkpoint();
        return;
      }
    }
  }

  if (result.evidence) {
    collect(state, result.evidence);campaign.sync();
    achievements.unlock('first_trace');
    checkpoint();
  }

  if (result.dialogue === 'ruth-dialogue') {
    dialogue.play([
      {speaker: 'ruth', name: 'XERIFE RUTH MERCER', text: 'Hale. A cidade já decidiu o que aconteceu com Sarah. Você pretende discutir com a cidade inteira?', choices: [{label: '“Pretendo discutir com os fatos.”', next: 1}, {label: '“Só quero ver o relatório.”', next: 2}]},
      {speaker: 'alex', name: 'ALEX HALE', text: 'Fatos não desaparecem. Pessoas desaparecem. Alguém aqui confundiu as duas coisas.'},
      {speaker: 'ruth', name: 'XERIFE RUTH MERCER', text: 'Então comece pela mesa central. E aprenda depressa quem escuta atrás destas paredes.'},
    ], () => keys.clear());
    return;
  }

  if (result.dialogue === 'report-dialogue') {
    dialogue.play([
      {speaker: 'alex', name: 'ALEX HALE', text: 'Três desaparecimentos classificados como partidas voluntárias. Mesma frase. Mesma máquina de escrever.'},
      {speaker: 'ruth', name: 'DEPOIMENTO — RUTH MERCER', text: 'A viatura 04 não consta de nenhuma ocorrência naquela noite. Não há motivo para interrogar Bobby Miller.'},
      {speaker: 'alex', name: 'ALEX HALE', text: 'Calma demais para alguém que, segundo a própria mãe, tinha medo de sair de casa à noite.'},
    ]);
    return;
  }

  if (result.evidence) {
    const clue = getFullCluesRegistry(state)[result.evidence];
    if (clue) {
      show(`<small>EVIDÊNCIA REGISTRADA</small><h2>${clue.title}</h2><p>${clue.text}</p><p class="tag">Disponível no caderno [J] e quadro de cortiça [C].</p>`);
    }
    return;
  }

  if (result.message) toast(result.message);
}

async function interact() {
  near=findNearby();
  if (!near||state.ending) return;
  audio.tone(300);

  if (near.type === 'interior') {
    performInterior(near.target);
    return;
  }

  if (near.type === 'door') {
    const b = near.building;
    if (!isOpen(b, state.minute)) {
      toast(`Fechado. Horário comercial: ${b.open}h–${b.close}h.`);
      return;
    }
    if (b.id === 'sarah' && !state.inventory.includes('Chave de Sarah')) {
      toast('A porta está trancada. Helen tem a chave.');
      return;
    }
    try {
      await renderer.interiors.ready;
      renderer.buildingTransition.start(renderer,b);
      state.outdoor = { ...state.player };
      state.interior = b.id;
      state.interiorRoom = null;
      state.player = {x: 275, y: 395, vx: 0, vy: 0, angle: 0};
      renderer.interiors.enter(state, {fromStreet: true});
      keys.clear();
      near = null;
    } catch (error) {
      toast(error.message);
    }
    return;
  }

  if (near.type === 'npc') {
    const p = near.npc;
    const message = p.id === 'helen' ? '“Sarah nunca sairia sem dizer nada. Ela guardava tudo no quarto. Tome a chave.”' :
                    p.id === 'ruth' ? '“São adultos, Hale. Pessoas vão embora. Não desperdice recursos.”' :
                    p.id === 'elias' ? '“O rapaz do balcão sumiu depois de trocar o turno. A biblioteca fecha às nove.”' :
                    p.id === 'viktor' ? '“Minha fábrica sustenta metade deste vale, Hale. Não cruze meu caminho.”' :
                    p.id === 'bobby' ? '“Não tenho nada para conversar com a polícia. Vá dar sua volta.”' :
                    p.id === 'clara' ? '“Os registros antigos guardam coisas que NorthVale preferiu enterrar.”' :
                    '“Vou à represa no fim da tarde. Só para caminhar. Você deveria experimentar.”';

    if (p.id === 'helen') {
      state.metHelen = true;
      if (!state.inventory.includes('Chave de Sarah')) state.inventory.push('Chave de Sarah');
    }

    show(`
      <small>CONVERSA RÁPIDA · [I] PARA INTERROGAR</small>
      <h2>${p.name}</h2>
      <canvas class="portrait" data-face="${p.id}" width="256" height="256" aria-label="Retrato de ${p.name}"></canvas>
      <p>${message}</p>
      <p class="tag">${p.personality}</p>
      <div style="margin-top:14px">
        <button id="btn-fast-interrogate" style="background:#581c87;color:#fff">Iniciar Interrogatório Oficial [I]</button>
      </div>
    `);
    renderer.inspectingIds = [p.id];
    $('#btn-fast-interrogate').onclick = () => {
      close();
      interrogation.start(p, state.case);
    };
  }
}

function nearestDoor() {
  return renderer.interiors.doors(state)
    .filter(d => renderer.interiors.distance(state, d) <= d.range)
    .sort((a, b) => renderer.interiors.distance(state, a) - renderer.interiors.distance(state, b))[0];
}

function doorControl(action) {
  if (state.ending || !state.interior || !renderer.interiors.loaded || renderer.interiors.transition) return;
  const target = nearestDoor();
  if (!target) {
    toast('Aproxime-se de uma porta interna.');
    return;
  }
  renderer.interiors.navigation = null;
  keys.clear();
  const result = renderer.interiors.doorAction(state, target, action);
  if (result.ok) {
    checkpoint();
    achievements.unlock('all_doors_open');
  }
  if (result.message) toast(result.message);
}

let hudSignature = '';
function updateRoomHUD() {
  const hud = $('#room-hud');
  hud.hidden = !state.interior || !renderer.interiors.loaded || dialogue.active || cinematic;
  if (hud.hidden) {
    hudSignature = '';
    return;
  }
  const room = renderer.interiors.room(state);
  const doors = renderer.interiors.doors(state);
  const closeDoor = nearestDoor();
  const signature = `${state.interior}:${room.id}:${doors.map(d => d.id + d.isOpen + d.isLocked).join(',')}:${closeDoor?.id || ''}:${Boolean(renderer.interiors.transition)}`;

  $('#room-name').textContent = room.name;
  hud.dataset.building = state.interior;
  hud.dataset.room = room.id;
  hud.dataset.transitioning = String(Boolean(renderer.interiors.transition));

  if (signature === hudSignature) return;
  hudSignature = signature;
  $('#room-doors').replaceChildren();

  for (const door of doors) {
    const other = door.definition.a.room === room.id ? door.definition.b.room : door.definition.a.room;
    const name = renderer.interiors.manifest(state).rooms.find(r => r.id === other).name;
    const button = document.createElement('button');
    button.dataset.door = door.id;
    button.disabled = Boolean(renderer.interiors.transition);
    button.textContent = `${name} · ${door.isLocked ? 'trancada' : door.isOpen ? 'aberta' : 'fechada'}`;
    button.onclick = () => {
      if (panel.open || dialogue.active) return;
      const target = renderer.interiors.doors(state).find(d => d.id === door.id);
      requestInterior(target);
    };
    $('#room-doors').append(button);
  }

  $('#door-close').disabled = !closeDoor || Boolean(renderer.interiors.transition);
  $('#door-lock').disabled = !closeDoor || Boolean(renderer.interiors.transition);
  $('#door-lock').textContent = closeDoor?.isLocked ? 'Destrancar [K]' : 'Trancar [K]';
}

$('#door-close').onclick = () => doorControl('close');
$('#door-lock').onclick = () => doorControl('lock');

// Abstract actions own input. Legacy auxiliary controls remain available through code queries.
function handleAction(action,event){
 if(action==='PAUSE_MENU'){
  if(corkboard.modal?.open){corkboard.close();return;}
  if(interrogation.modal?.open){interrogation.modal.close();return;}
  if(dialogue.active){dialogue.close();return;}
  if(panel.open){close();return;}
  if(cinematic){finishIntro();return;}
  show('<h2>Pausa</h2><p>Escape para continuar.</p>');return;
 }
 if(dialogue.active){if(action==='DIALOGUE_ADVANCE')dialogue.handleAdvance();if(action.startsWith('CHOICE_')){const index=Number(action.slice(-1))-1;if(dialogue.lines[dialogue.index]?.choices?.[index])dialogue.advance(index);}return;}
 if(panel.open||corkboard.modal?.open||interrogation.modal?.open)return;
 if(!started)return;
 if(cinematic){if(action==='DIALOGUE_ADVANCE')finishIntro();return;}
 if(action==='INSPECT_NOTEBOOK'){notebook();return;}
 if(action==='CORKBOARD'){corkboard.open();return;}
 if(action==='CHECK_WATCH'){toast('Dia '+state.day+' · '+time(state.minute));return;}
 if(state.ending)return;
 if(action==='LIGHTER'){if(!state.inventory.includes('Isqueiro'))state.inventory.push('Isqueiro');else state.inventory.splice(state.inventory.indexOf('Isqueiro'),1);toast(state.inventory.includes('Isqueiro')?'Isqueiro aceso.':'Isqueiro apagado.');}
 if(action==='INTERACT'){if(event.type==='pointerdown'&&state.interior&&renderer.interiors.loaded){const rect=pointerCanvas.getBoundingClientRect(),target=renderer.interiorView.pick({x:event.clientX-rect.left,y:event.clientY-rect.top},state);if(target)requestInterior(target);}else interact();}
}
input=new InputManager({onAction:handleAction,filterEvent:event=>event.type!=='pointerdown'||event.target===pointerCanvas});
campaignPanel=new CampaignPanel({getCampaign:()=>campaign,show,close,save:checkpoint,toast,input,onEnding:ending=>{if(state.PLAYER_DECISION_FLAGS.includes('CORRECT_DEDUCTION'))achievements.unlock('truth_of_sarah');campaignPanel.ending(ending);},interrogate:npc=>interrogation.start(npc,state.case)});
$('#controls-btn').onclick=()=>campaignPanel.controls();
// Extra host actions use physical codes here and never shadow abstract bindings.
window.addEventListener('keydown',event=>{
 if(event.target.closest?.('input,select,textarea')||event.repeat||panel.open||dialogue.active||corkboard.modal?.open||interrogation.modal?.open||!started||cinematic)return;
 const reserved=Object.values(input.bindings).some(b=>b.primary===event.code||b.secondary===event.code);if(reserved)return;
 if(event.code==='KeyM')map();if(event.code==='KeyX')openAccusationPanel();
 if(state.ending)return;
 if(event.code==='KeyI'&&near?.type==='npc')interrogation.start(near.npc,state.case);
 if(event.code==='KeyP'&&near?.type==='npc'){if(tailing.activeTarget)tailing.stopTailing();else tailing.startTailing(near.npc);}
 if(event.code==='KeyF'&&!state.interior){if(state.driving){state.driving=false;state.player={...state.player,x:state.car.x,y:state.car.y+38,vx:0,vy:0};state.car.speed=0;}else if(distance(state.player,state.car)<85)state.driving=true;}
 if(event.code==='KeyO')doorControl('close');if(event.code==='KeyK')doorControl('lock');
});

// Simulation & Movement Update
function update(dt) {
  if (!started || panel.open || dialogue.active || corkboard.modal?.open || interrogation.modal?.open || state.ending || renderer.buildingTransition.active) return;

  if (cinematic) {
    sceneTime += dt;
    state.player.x = 720 + Math.min(sceneTime, 5) * 5;
    state.player.y = 705 - Math.min(sceneTime, 5) * 2;
    state.player.vx = sceneTime < 5 ? 10 : 0;
    toast([
      'Alex Hale. Transferido depois de denunciar os próprios colegas.',
      'Helen: “Minha filha está desaparecida há três dias.”',
      'Ruth: “Ela fugiu. Não há caso, Hale.”',
      'Helen: “Sarah não fugiu. Encontre-a. Tome a chave.”'
    ][Math.min(3, Math.floor(sceneTime / 4))] + '  [Espaço para pular]');
    if (sceneTime > 16) finishIntro();
    return;
  }

  // Tracking foot time for achievement
  if (!state.driving && !state.interior) {
    state.footTime = (state.footTime || 0) + dt;
  }

  // Tailing Stalking Update
  if (tailing.activeTarget && !state.interior) {
    const targetPos = residentPosition(tailing.activeTarget, state.minute);
    const nextPos = residentPosition(tailing.activeTarget, state.minute + 0.01);
    const targetAngle = Math.atan2(nextPos.y - targetPos.y, nextPos.x - targetPos.x);
    tailing.update(dt, state.player, targetPos, targetAngle);
  }

  if (state.interior && renderer.interiors.loaded) {
    const moving = ['MOVE_UP','MOVE_DOWN','MOVE_LEFT','MOVE_RIGHT'].some(action=>input.isActionDown(action));
    if (moving) renderer.interiors.navigation = null;
    if (renderer.interiors.transition || renderer.interiors.navigation) {
      advance(dt * 1.2);
      const previousRoom = state.interiorRoom;
      const arrived = renderer.interiors.update(dt, state);
      if (previousRoom !== state.interiorRoom) checkpoint();
      if (arrived) performInterior(arrived);
      near = findNearby();
      audio.update(state.interior, state.interior ? renderer.interiors.lights(state) : []);
      return;
    }
  }

  advance(dt * 1.2);

  const forward = input.isActionDown('MOVE_UP');
  const back = input.isActionDown('MOVE_DOWN');
  const left = input.isActionDown('MOVE_LEFT');
  const right = input.isActionDown('MOVE_RIGHT');

  if (state.driving) {
    const delta = updateVehicle(state.car, {forward, back, left, right, brake: input.held.has('Space')}, dt);
    const old = {x: state.car.x, y: state.car.y};
    move(state.car, delta.dx, delta.dy, 27);
    if (Math.abs(state.car.x - old.x - delta.dx) > 0.1 || Math.abs(state.car.y - old.y - delta.dy) > 0.1) {
      state.car.speed *= 0.3;
    }
    state.player.x = state.car.x;
    state.player.y = state.car.y;
  } else {
    let sx = (right ? 1 : 0) - (left ? 1 : 0);
    let sy = (back ? 1 : 0) - (forward ? 1 : 0);
    const magnitude = Math.hypot(sx, sy);
    if (magnitude) {
      sx /= magnitude;
      sy /= magnitude;
    }
    const speed = (input.held.has('ShiftLeft')||input.held.has('ShiftRight')) ? 160 : 95;
    const tx = (sx + sy) * 0.7071 * speed;
    const ty = (sy - sx) * 0.7071 * speed;
    const blend = 1 - Math.exp(-10 * dt);
    state.player.vx += (tx - state.player.vx) * blend;
    state.player.vy += (ty - state.player.vy) * blend;
    if (magnitude) state.player.angle = Math.atan2(ty, tx);

    if (state.interior) {
      if (renderer.interiors.loaded) renderer.interiors.move(state, state.player.vx * dt, state.player.vy * dt);
    } else {
      move(state.player, state.player.vx * dt, state.player.vy * dt);
    }
  }

  near = findNearby();
  audio.update(state.interior, state.interior && renderer.interiors.loaded ? renderer.interiors.lights(state) : []);
}

// Render Loop
function frame(now) {
  const dt = Math.max(0,Math.min((now - last) / 1000, 0.05));
  last = now;

  update(dt);
  renderer.draw(state, dt, cinematic);
  updateVisualPanels();
  updateRoomHUD();

  if (toastTimer > 0) {
    toastTimer -= dt;
    if (toastTimer <= 0) $('#toast').style.display = 'none';
  }

  $('#status').textContent = `TER ${16 + state.day} OUT 1989  /  ${time(state.minute)}  /  ${state.driving ? 'VIATURA' : 'ALEX HALE'}`;
  $('#location').textContent = state.interior ? buildings.find(b => b.id === state.interior)?.name || 'INTERIOR' : 'CENTRO · NORTHVALE';
  $('#objective').textContent = state.evidence.length >= 4 ?
    'Pistas reunidas. Compare os documentos no Quadro de Cortiça [C] ou indicie em Encerrar Caso [X].' :
    state.metHelen ? 'A chave de Sarah abre a casa dos Miller, a leste. Explore os interiores.' : 'Helen espera perto da delegacia.';

  $('#prompt').style.display = near && !cinematic && !panel.open && !dialogue.active ? 'block' : 'none';
  $('#prompt').textContent = near?.label || '';

  input.resetFrameStates();
  requestAnimationFrame(frame);
}

requestAnimationFrame(frame);
