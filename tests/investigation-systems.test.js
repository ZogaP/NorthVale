import test from 'node:test';
import assert from 'node:assert/strict';

import {KillerGenerator, CULPRIT_ARCHETYPES} from '../src/investigation/killer-generator.js';
import {ACHIEVEMENTS, AchievementSystem} from '../src/narrative/achievements.js';
import {ENDINGS, EndingsEvaluator} from '../src/narrative/endings.js';
import {RoofCutawaySystem} from '../src/graphics/roof-cutaway.js';
import {createState, collect, serialize, deserialize} from '../src/state.js';
import {InternalDoor} from '../src/interiors/interior-world.js';

test('legacy archive: KillerGenerator gera sementes determinísticas e cobre os 4 arquétipos', () => {
  const genA = new KillerGenerator(1989);
  const caseA1 = genA.generate();
  const caseA2 = new KillerGenerator(1989).generate();

  // Deterministic seed reproduction
  assert.equal(caseA1.archetypeKey, caseA2.archetypeKey);
  assert.equal(caseA1.culpritId, caseA2.culpritId);
  assert.ok(caseA1.motive.length > 20);
  assert.ok(caseA1.falseAlibi.claim.length > 10);
  assert.ok(caseA1.lyingWitness.npcId);
  assert.equal(Object.keys(caseA1.clues).length, 5);

  // Check archetype coverage
  const archetypesFound = new Set();
  for (let s = 1; s < 200 && archetypesFound.size < 4; s++) {
    const c = new KillerGenerator(s).generate();
    archetypesFound.add(c.archetypeKey);
  }
  assert.equal(archetypesFound.size, 4, 'Todos os 4 arquétipos devem ser gerados');
});

test('AchievementSystem rastreia conquistas normais, difíceis e secretas', () => {
  // Mock DOM for container if running in node test environment
  if (typeof document === 'undefined') {
    global.document = {
      querySelector: () => null,
      createElement: () => ({ appendChild: () => {}, classList: { add: () => {} }, remove: () => {} }),
      body: { appendChild: () => {} }
    };
  }

  const state = createState();
  const achievements = new AchievementSystem(state);

  assert.equal(achievements.has('first_trace'), false);
  assert.equal(achievements.unlock('first_trace'), true);
  assert.equal(achievements.has('first_trace'), true);
  // Duplicate unlock returns false
  assert.equal(achievements.unlock('first_trace'), false);

  // Check obsession trigger
  achievements.checkObsession(80);
  assert.equal(achievements.has('fever_mind'), true);

  // Check 3h am trigger
  achievements.checkTime(3 * 60, 1);
  assert.equal(achievements.has('night_wanderer'), true);
});

test('legacy archive: EndingsEvaluator ramifica para os 7 finais distintos', () => {
  const state = createState(1989);
  const evaluator = new EndingsEvaluator(state);
  const culpritId = state.case.culpritId;

  // 1. Extreme Paranoia -> Final 3: Espiral da Loucura
  state.obsession = 90;
  assert.equal(evaluator.evaluateEnding(culpritId, 'legal').id, 'ESPIRAL_DA_LOUCURA');

  // Reset obsession
  state.obsession = 30;

  // 2. Bribe / Corruption -> Final 2: Pacto do Silêncio
  assert.equal(evaluator.evaluateEnding(culpritId, 'bribe').id, 'PACTO_DO_SILENCIO');

  // 3. Vigilante justice -> Final 4: Acerto de Contas
  state.evidence = Object.keys(state.case.clues);
  assert.equal(evaluator.evaluateEnding(culpritId, 'vigilante').id, 'ACERTO_DE_CONTAS');

  // 4. Insufficient proof or wrong suspect -> Final 5: Arquivo Morto
  assert.equal(evaluator.evaluateEnding('wrong_suspect', 'legal').id, 'ARQUIVO_MORTO');

  // 5. Correct accusation with reckless public speech -> Final 6: Mártir
  state.corkboardDeductions = ['d1', 'd2'];
  assert.equal(evaluator.evaluateEnding(culpritId, 'expose_reckless').id, 'MARTIR_DE_NORTHVALE');

  // 6. High integrity, low obsession, complete proof -> Final 7: Sombras Sob a Chuva
  state.integrity = 85;
  state.obsession = 35;
  assert.equal(evaluator.evaluateEnding(culpritId, 'legal').id, 'SOMBRAS_SOB_A_CHUVA');

  // 7. Standard legal prosecution -> Final 1: Justiça Inflexível
  state.integrity = 60;
  assert.equal(evaluator.evaluateEnding(culpritId, 'legal').id, 'JUSTICA_INFLEXIVEL');
});

test('RoofCutawaySystem calcula alpha de fade-out em aproximações e interiores', () => {
  const cutaway = new RoofCutawaySystem();
  const buildings = [
    {id: 'police', x: 580, y: 450, w: 220, h: 200}
  ];

  // Distant player: alpha remains 1.0
  cutaway.update(0.1, {x: 100, y: 100}, buildings, false, null);
  assert.ok(cutaway.getAlpha('police') > 0.95);

  // Player enters police interior: alpha cuts away towards 0.0
  for (let i = 0; i < 20; i++) {
    cutaway.update(0.1, {x: 600, y: 500}, buildings, true, 'police');
  }
  assert.ok(cutaway.getAlpha('police') < 0.1, 'Telhado deve sofrer fade-out no interior');
});

test('InternalDoor permite gazua de aço para forçar trancas', () => {
  const doorDef = {
    id: 'test-locked-door',
    isOpen: false,
    isLocked: true,
    requiresKey: 'Chave Rara'
  };
  const door = new InternalDoor('police', doorDef);
  const saveMock = {
    read: () => ({isOpen: false, isLocked: true}),
    interact: () => {}
  };

  // Without key or gazua: blocked
  const resFail = door.open(saveMock, ['Lanterna', 'Crachá'], 'reception');
  assert.equal(resFail.ok, false);

  // With Gazua de Aço: unlocks
  const resGazua = door.open(saveMock, ['Lanterna', 'Gazua de Aço'], 'reception');
  assert.equal(resGazua.ok, true);
  assert.ok(resGazua.message.includes('Gazua de Aço'));
});
