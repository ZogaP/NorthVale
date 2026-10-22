import {createCanonicalCase,migrateCanonicalState} from './systems/CanonicalCampaign.js';

export const clues = {
  tape: {title: 'Fita K7', text: 'Passos na brita. Uma respiração curta. Sarah sussurra: “A represa. Depois das seis. Não confie no relatório.”', category: 'recording'},
  money: {title: 'Dinheiro sob o assoalho', text: 'US$ 420 em notas pequenas. Uma anotação: “Para sair daqui. Nós três.”', category: 'item'},
  photos: {title: 'Três Polaroids', text: 'Sarah, o balconista e a bibliotecária diante da capela em ruínas. No verso: 15/10/1989.', category: 'photo'},
  letter: {title: 'Carta inacabada', text: '“Mãe, se disserem que eu fugi, não acredite. Encontrei algo no arquivo.”', category: 'document'},
  report: {title: 'Relatório oficial', text: 'Três desaparecimentos classificados como partidas voluntárias. Todos assinados por Ruth. Nenhuma entrevista com familiares.', category: 'document'}
};

export function getFullCluesRegistry(state) {
  const merged = {...state?.legacyCase?.clues,...clues};
  if (state?.case?.clues) {
    Object.assign(merged, state.case.clues);
  }
  return merged;
}

export function createState(seed = null) {
  const proceduralCase = createCanonicalCase(seed);
  const state = {
    version: 1,
    minute: 8 * 60 + 35,
    day: 1,
    player: {x: 720, y: 705, vx: 0, vy: 0, angle: 1.5},
    car: {x: 760, y: 808, angle: 0, speed: 0},
    driving: false,
    interior: null,
    interiorRoom: null,
    interiorStates: {},
    evidence: [],
    interactions: {},
    links: [],
    inventory: ['Lanterna', 'Crachá'],
    introDone: false,
    metHelen: false,
    // Investigative & Psychometric architecture
    case: proceduralCase,
    canonVersion:1,
    PARANOIA:20,SCRUTINY:0,REPUTATION:0,SARAH_STATUS:2,SARAH_OUTCOME_KNOWN:false,BOBBY_STABILITY:70,PROOF_WEIGHT:0,PLAYER_DECISION_FLAGS:[],quests:{},evidenceIntegrity:{},ending:null,worldControlsLocked:false,
    obsession: 20,
    integrity: 75,
    achievements: [],
    corkboardNodes: {},
    corkboardLinks: [],
    corkboardDeductions: [],
    suspectMoods: {},
    tailingEvents: [],
    footTime: 0
  };
  return migrateCanonicalState(state);
}

export function collect(state, id) {
  const registry = getFullCluesRegistry(state);
  if (!registry[id] || state.evidence.includes(id)) return false;
  state.evidence.push(id);
  if (state.case?.clues?.[id]) {
    state.case.clues[id].discovered = true;
  }
  state.obsession = Math.min(100, (state.obsession || 0) + 4);
  return true;
}

export function serialize(state) {
  return JSON.stringify(state,(key,value)=>value instanceof Set?[...value]:value);
}

export function deserialize(text) {
  const s = JSON.parse(text);
  if (
    s.version !== 1 ||
    !Number.isFinite(s.minute) || s.minute < 0 || s.minute >= 1440 ||
    !Number.isInteger(s.day) || s.day < 1 ||
    !Array.isArray(s.evidence) ||
    !Array.isArray(s.links) ||
    !Array.isArray(s.inventory) ||
    !s.interactions || typeof s.interactions !== 'object' ||
    !s.player || !s.car ||
    ![s.player.x, s.player.y, s.player.vx, s.player.vy, s.player.angle, s.car.x, s.car.y, s.car.angle, s.car.speed].every(Number.isFinite) ||
    s.player.x < 0 || s.player.x > 1900 || s.player.y < 0 || s.player.y > 1700 ||
    s.car.x < 0 || s.car.x > 1900 || s.car.y < 0 || s.car.y > 1700 ||
    ![null, 'police', 'sarah', 'diner', 'pharmacy', 'library', 'motel', 'home', 'depot', 'dam', 'ruins', 'ruth', 'registry', 'meatpacking', 'scrapyard', 'gasstation'].includes(s.interior)
  ) {
    throw Error('Salvamento incompatível ou danificado');
  }

  s.interiorRoom ??= null;
  s.interiorStates ??= {};
  migrateCanonicalState(s);
  s.obsession ??= 20;
  s.integrity ??= 75;
  s.achievements ??= [];
  s.corkboardNodes ??= {};
  s.corkboardLinks ??= [];
  s.corkboardDeductions ??= [];
  s.suspectMoods ??= {};
  s.tailingEvents ??= [];
  s.footTime ??= 0;

  if (s.interiorRoom !== null && (typeof s.interiorRoom !== 'string' || !/^[a-z][a-z0-9-]{0,70}$/.test(s.interiorRoom)) || typeof s.interiorStates !== 'object' || Array.isArray(s.interiorStates) || Object.keys(s.interiorStates).length > 15000) {
    throw Error('Estado de interiores inválido.');
  }

  for (const [id, value] of Object.entries(s.interiorStates)) {
    if (!/^northvale:[a-z0-9-]+:[a-z0-9-]+:[a-z0-9-]+$/.test(id) || !value || typeof value !== 'object' || Array.isArray(value)) {
      throw Error('Identidade de objeto inválida.');
    }
    for (const [field, v] of Object.entries(value)) {
      if (['isOpen', 'isLocked', 'isOn', 'searched', 'visited'].includes(field)) {
        if (typeof v !== 'boolean') throw Error('Estado de objeto inválido.');
      } else if (field === 'interactions') {
        if (!Number.isSafeInteger(v) || v < 0) throw Error('Contagem de interação inválida.');
      } else {
        throw Error('Campo de estado desconhecido.');
      }
    }
  }

  return s;
}
