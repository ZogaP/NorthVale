# Regras e dados — módulos ES

Os cinco módulos estão em `src/systems/`. Usam apenas JavaScript e imports locais, compartilham um objeto de estado JSON e não acessam Canvas, DOM, áudio ou o loop. `RuleData.js` contém as validações e cópias defensivas comuns. Os exemplos abaixo usam o estado atual do NorthVale.

Esta entrega fornece APIs para a interface. O host deve encaminhar escolhas, eventos de área e consultas de NPCs. Os botões de save e a população visual existentes continuam com seus adaptadores atuais até essa ligação ser feita; o catálogo lógico contém 32 NPCs.

## Inicialização e persistência

```js
import { createState, serialize, deserialize } from './src/state.js';
import { EvidenceInventorySystem } from './src/systems/EvidenceInventorySystem.js';
import { DeductionEngine } from './src/systems/DeductionEngine.js';
import { NPCRoutineSystem } from './src/systems/NPCRoutineSystem.js';
import { DialogueTreeRunner } from './src/systems/DialogueTreeRunner.js';
import { SaveLoadManager } from './src/systems/SaveLoadManager.js';

const state = createState();
const trees = []; // Carregar os dados de diálogo antes de restaurar uma conversa.
let inventory, deductions, routines, dialogue;

function bindRules() {
  inventory = new EvidenceInventorySystem(state);
  deductions = new DeductionEngine(state);
  routines = new NPCRoutineSystem(state);
  dialogue = new DialogueTreeRunner(state, {
    trees,
    onVariableChange: (varName, delta) => console.log(varName, delta),
    onItemReceived: itemId => console.log('Item recebido:', itemId),
  });
}

bindRules();
const saves = new SaveLoadManager(state, {
  storage: localStorage,
  serialize,
  deserialize,
  // Validar também os registros novos antes de substituir o estado vivo.
  validateState(candidate) {
    new EvidenceInventorySystem(candidate);
    new DeductionEngine(candidate);
    new NPCRoutineSystem(candidate);
    new DialogueTreeRunner(candidate, { trees });
    return true;
  },
  onLoad: bindRules,
});

saves.saveGame(1);
saves.loadGame(1);
console.table(saves.getSavedSlotsInfo());

// No evento emitido pelo sistema de transição, depois de atualizar o estado:
state.interior = 'police';
saves.onAreaTransition('police');
// A mesma área não gera outro autosave. Uma volta ao exterior é outra transição.
```

O gerenciador preserva a referência raiz de `state`, substituindo seus campos. Recrie adaptadores que mantenham caches ou referências a arrays internos no `onLoad`. Também é possível injetar `getState`/`setState` quando o host substitui a referência inteira. A importação dos módulos é segura em Node; para instanciar saves fora do navegador, injete um adaptador com `getItem` e `setItem`.

Os IDs dos slots são `1`, `2`, `3` (também aceitam strings) e `'autosave'`. As chaves são `northvale:slots:1`, etc. `getSavedSlotsInfo()` retorna quatro registros com status `empty`, `saved` ou `corrupt`, sem substituir o estado vivo. Cada envelope contém formato, versão, data ISO e estado completo. Erros de quota, armazenamento bloqueado ou dados inválidos são propagados para o host exibir uma mensagem. O slot anterior sobrevive a uma falha de `setItem`.

`loadGame(1)` importa o antigo `northvale-save` (ou `mercy-pines-save`) quando o slot está vazio. `importLegacySave(slotId)` permite importar explicitamente para outro slot vazio e preserva o save original. Versões desconhecidas de envelope são rejeitadas. O validador e o desserializador injetados são responsáveis pelo esquema específico do jogo e suas migrações; a validação padrão exige dados JSON puros, sem funções, ciclos, `Set`, `Map` ou números não finitos.

Para um barramento existente, `saves.bindAreaTransitions(subscribe)` aceita uma função que registra um handler de `areaId` e retorna uma função de cancelamento. O módulo não instala timers nem intercepta o loop.

## Grafo de deduções

```js
inventory.addItem({ id: 'viatura04', type: 'evidence' });
inventory.addItem({ id: 'owen_confession', type: 'evidence' });
const edgeId = deductions.connectNodes('viatura04', 'owen_confession');
const correct = deductions.validateConnection(edgeId);
const theses = deductions.getProvenTheses();
```

`connectNodes` recebe IDs de dois nós distintos e devolve o ID estável da aresta não direcionada. Ambos precisam ser provas coletadas e intactas. A conexão fica pendente até `validateConnection`. Repetir ou inverter a mesma aresta retorna o mesmo ID. Validar uma aresta correta soma seu peso (padrão 1) a `PROOF_WEIGHT`, com teto 10; uma falsa soma 5 a `PARANOIA`, com teto 100. A validação é idempotente, inclusive após save/load.

Por padrão, as teses vêm de `state.case.deductions`, e pares de pistas de uma mesma tese são conexões válidas. Uma tese exige todos os seus nós interligados por arestas validadas dentro daquele conjunto; juntar todos os cartões sem validar as ligações não comprova nada. Provas removidas ou danificadas deixam de sustentar a tese e o peso ativo.

Configuração alternativa:

```js
const graph = new DeductionEngine(customState, {
  nodes: ['photo', 'receipt', 'witness'],
  connections: [
    { nodeA: 'photo', nodeB: 'receipt', weight: 1 },
    { nodeA: 'receipt', nodeB: 'witness', weight: 2 },
  ],
  theses: [{ id: 'timeline', requiredClueIds: ['photo', 'receipt', 'witness'] }],
  onChange: event => refreshBoard(event),
});
```

Configurações de regras são dados autorais e devem ser as mesmas ao carregar. O save guarda nós, arestas e resultados em `state.deductionGraph`. A UI deve consultar os DTOs retornados, sem editar esse registro. Use este motor como autoridade das novas conexões para evitar processar a mesma ação também no adaptador antigo do quadro.

`getProofWeight()` retorna a contribuição ativa do grafo para um agregador que recalcule provas físicas. `CanonicalCampaign.sync()` já soma essa contribuição às provas canônicas intactas, aplica o teto 10 e reconhece a tese `canonical-culprit`; a sincronização não apaga os pontos do novo motor. No modo independente, o host pode recalcular o total após remoção/dano de provas. Nunca some a contribuição novamente ao total anterior em cada frame.

## Inventário, evidências e gazuas

```js
inventory.addItem({
  id: 'lockpick', type: 'tool', durability: 12, maxDurability: 12,
  metadata: { acquiredAt: 'scrapyard', owner: 'Alex Hale' },
});
const result = inventory.useTool('lockpick', 2); // {durability: 10, broken: false}
inventory.setEvidenceIntegrity('viatura04', false);
const metadata = inventory.getItemMetadata('viatura04');
```

Tipos: `item` (padrão), `tool` e `evidence`. Itens e ferramentas continuam como IDs em `state.inventory`; provas, em `state.evidence`. Detalhes ficam em `state.itemRecords`, com integridade probatória compartilhada em `state.evidenceIntegrity`. Os IDs antigos, como `Lanterna`, continuam aceitos e têm metadados vazios até receberem um registro autoral.

`addItem` retorna `true` ao coletar e `false` para duplicatas, sem sobrescrever proveniência nem reparar ferramentas. `removeItem` remove o registro e devolve se havia item. `hasItem` consulta os dois grupos. `getItemMetadata` e `getItem` devolvem cópias defensivas ou `null`. Gazuas quebradas permanecem com durabilidade zero; `useTool` devolve `false` para uma ferramenta já quebrada. Desgaste negativo ou registros inválidos são rejeitados.

## Rotinas e máquina de estados

```js
const position = routines.getNPCLocation('ruth', 12, 30);
// {npcId, locationId, x, y, inside, activity, state}
routines.setNPCState('ruth', 'CONFRONTED', position);
routines.setNPCState('ruth', 'HOSTILE');
routines.resumeRoutine('ruth');
```

O catálogo `DEFAULT_NPC_ROUTINES` preserva os oito personagens com rotinas existentes e adiciona 24 figurantes nomeados e editáveis, sem novos fatos sobre o crime. Os figurantes compartilham endereços disponíveis como dados de população; não criam 24 novas casas ou sprites. `getRoster()` entrega cópias para edição/consulta. `DEFAULT_NPC_LOCATIONS` usa coordenadas das portas do mapa atual como âncoras; a UI converte uma localização interna no ponto da sala desejada.

O relógio aceita inteiros de 0–23 e 0–59. Cada agenda tem início à meia-noite e entradas ordenadas em minutos (0–1439), cobrindo o dia inteiro; o turno de Walter, por exemplo, atravessa a meia-noite. A consulta não depende do frame anterior, portanto funciona após espera, recarga ou NPC fora da câmera.

Estados: `IDLE`, `PATROLLING`, `CONFRONTED`, `HOSTILE`, `FLEEING`. Interações usam `setNPCState` e persistem em `npcRoutineState` até `resumeRoutine`. Passe a posição no confronto para fixar o NPC naquele ponto; novos eventos de deslocamento podem atualizar a posição no mesmo estado. Transições impossíveis (por exemplo, `HOSTILE` direto para `PATROLLING`) são rejeitadas. `onStateChange(npcId, previous, next)` notifica mudanças efetivas.

É possível injetar `{npcs, locations, resolveTravel, onStateChange}`. Cada NPC usa `{id, name, schedule:[{start, locationId, activity, state}]}`. Por padrão, a localização muda no horário da agenda. Para trajetos, `resolveTravel({npc, from, to, elapsedMinutes, minute})` devolve posição validada ou `null` para usar o destino; o host fornece o pathfinding que respeita obstáculos. Não se presume uma linha reta atravessando edifícios.

## Árvores de diálogo

```js
const interview = {
  id: 'bobby-interview', start: 'opening', nodes: {
    opening: {
      speakerId: 'bobby', text: 'Nunca dirigi aquela viatura.',
      choices: [{
        id: 'confront', text: 'O registro contradiz você.', next: 'answer',
        requirements: {
          items: ['viatura04'],
          variables: {
            REPUTATION: { gte: 5 }, SCRUTINY: { lte: 80 },
            BOBBY_STABILITY: { gte: 10 },
          },
        },
        effects: {
          variables: { BOBBY_STABILITY: -20, SCRUTINY: 5 },
          items: [{ id: 'testimony', type: 'evidence', metadata: { witness: 'bobby' } }],
        },
      }],
    },
    answer: { speakerId: 'bobby', text: 'Eu estava lá.' },
  },
};

const runner = new DialogueTreeRunner(state, {
  trees: [interview],
  onVariableChange: (varName, delta) => updateVariableIndicator(varName, delta),
  onItemReceived: itemId => announceItem(itemId),
});
runner.start('bobby-interview');
const node = runner.getCurrentNode();
runner.choose('confront');
runner.advance(); // Encerra o nó terminal.
```

`start`, `choose` e `advance` devolvem se a transição foi aceita. `getCurrentNode()` devolve texto, interlocutor e escolhas liberadas, ou `null` quando inativo. Escolhas bloqueadas não aparecem; a condição é verificada novamente ao selecionar. Um nó pode ter `next` ou `choices`. `next: null` encerra a conversa; um nó sem ambos encerra ao avançar. `onComplete(treeId)` anuncia o término.

Pré-requisitos são declarativos: `items` exige todos os itens e `variables` aceita comparações `eq`, `gte`, `lte`, combinadas por AND. As variáveis permitidas são `REPUTATION` (−50 a 50), `SCRUTINY`, `BOBBY_STABILITY`, `PARANOIA` (0 a 100) e `PROOF_WEIGHT` (0 a 10). Efeitos usam deltas e respeitam esses limites; o evento informa o delta efetivamente aplicado. `PROOF_WEIGHT` da campanha deve ser agregado a partir das provas/grafo, portanto prefira conceder evidências a alterá-lo diretamente nessa campanha.

Efeitos de entrada no nó e efeitos de cada escolha são aplicados uma única vez por ID de árvore/nó/escolha. O ledger e o cursor ficam em `dialogueState`, permitindo retomar a conversa e impedir recompensas repetidas em ciclos ou após recarga. Para eventos repetíveis, use IDs de árvore distintos por ocorrência. Alterar IDs autorais exige migração dos saves antigos.

Os efeitos são preparados numa cópia e só são confirmados se o destino também satisfizer seus requisitos. Callbacks são notificações posteriores ao commit: devem tratar seus próprios erros e não reaplicar os deltas/itens já concedidos. Textos são strings de dados; a UI deve apresentá-los como texto, sem executar HTML de arquivos de diálogo.

## Verificação

`node --test tests/rule-systems.test.js` cobre ligações repetidas, prova danificada, agregação canônica, proveniência, gazuas, todos os minutos dos 32 NPCs, turno noturno, confrontos, condições de diálogo, rollback, retomada, quatro slots, corrupção, quota, migração e autosave por evento. `npm test` inclui essas verificações e a suíte existente.
