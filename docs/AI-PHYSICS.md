# IA, acústica e volumes lógicos

Os módulos são ES Modules sem bibliotecas externas, comandos gráficos, reprodução de áudio, timers ou aleatoriedade. O host fornece posições, eventos e `dt` em segundos. A apresentação pode consumir os resultados pelo Gemini ou por qualquer outra camada visual.

## Coordenadas e geometria

Todos os pontos usam **coordenadas de mundo não projetadas**: `x/y` no chão e `z` como altitude, com `z = 0` quando omitido. Não passe pixels de tela isométrica. Use o inversor de projeção existente para converter cliques antes das consultas.

`findPath` usa índices inteiros de células. `worldToCell`, `cellToWorld` e `findWorldPath` fazem a conversão usando `cellSize` e `origin`. A navegação é um piso XY; pisos diferentes precisam de instâncias próprias e ligações explícitas (escadas/portas). O som considera distância XYZ, e os volumes podem ter alturas distintas.

`SpatialGeometry.js` fornece as funções compartilhadas de AABB e interseção segmento/caixa. Uma caixa aceita:

```js
{ minX: 0, minY: 0, maxX: 32, maxY: 64, minZ: 0, maxZ: 96 }
// Ou:
{ x: 0, y: 0, z: 0, width: 32, height: 64, depth: 96 }
```

`width/height` são as dimensões no chão; `depth` é a extensão vertical. Os aliases `w/h` também são aceitos. Omitir completamente os limites Z cria uma coluna sem limite de altura. Extensões negativas/nulas, dados não finitos e coordenadas inválidas são rejeitados. AABBs de colisão e gatilhos incluem contato na borda. O host deve manter todas as entidades e caixas na mesma unidade de mundo.

## StealthAudioPropagation

```js
import { StealthAudioPropagation, SOUND_TYPES } from './src/systems/StealthAudioPropagation.js';

const guard = {
  id: 'sloane-guard', position: { x: 384, y: 336, z: 0 },
  spaceId: 'town', hearingThreshold: 25, detectionMarginDb: 3,
};
const alerts = [];
const acoustics = new StealthAudioPropagation({
  cellSize: 32,
  ambientNoiseDb: 10,
  listeners: [guard],
  onSoundDetected(listenerEntity, soundOrigin, intensity) {
    alerts.push({ npcId: listenerEntity.id, soundOrigin, intensity });
  },
});

acoustics.emitSound(SOUND_TYPES.REVOLVER_38, {
  x: 288, y: 336, z: 0, spaceId: 'town',
}, { sourceId: 'alex' });
```

| Tipo | Nível base |
|---|---:|
| `PUDDLE_STEP` | 15 dB |
| `GRAVEL_RUN` | 35 dB |
| `FORCED_DOOR` | 60 dB |
| `REVOLVER_38` | 95 dB |

`emitSound(type, origin, options)` e `calculateIntensity(origin, listenerPosition, type, options)` aceitam um desses nomes em string, seu valor numérico ou outro nível de 0 a 100. `calculateIntensity` retorna o nível recebido antes de aplicar o limiar de audição. `emitSound` devolve os alertas e chama `onSoundDetected` uma vez para cada ouvinte que detectou aquela emissão.

O cálculo é:

```text
d = hypot(dx / cellSize, dy / cellSize, dz × heightScale / cellSize)
distânciaPerdida = distanceRolloff × log10(max(1, d / referenceDistance))
recebido = clamp(clamp(base + noiseModifierDb, 0, 100) − distânciaPerdida − barreiras, 0, 100)
limiar = max(hearingThreshold, ambientNoiseDb + detectionMarginDb)
detecção = recebido > 0 e recebido >= limiar
```

Padrões: `heightScale = 1`, `referenceDistance = 1` célula, `distanceRolloff = 20`, audição mínima 10 e margem 3 dB. Até a distância de referência não há amplificação. Ruído ambiente mascara sons; não é somado ao nível da fonte. O modelo usa dB de gameplay calibráveis, propagação instantânea pelo raio direto e perdas fixas por barreira, sem simular difração, reverberação ou atraso acústico.

Registre barreiras com `setOccluder({id, kind, bounds, attenuationDb?, isOpen?, enabled?, spaceId?})`. Tipos: `wall` (18 dB por padrão) e `door` (12 dB). Cada caixa atravessada desconta seu valor uma vez. Portas abertas, barreiras desativadas, tangências sem percurso dentro do material e caixas fora da altura do raio não amortecem. Posições coincidentes não atravessam material. Use `setDoorOpen(id, boolean)` e `removeOccluder(id)` para alterações dinâmicas.

`addListener(entity)` mantém a referência da entidade: atualizar `entity.position` (ou seus campos `x/y/z`) atualiza o próximo cálculo. `removeListener(id)` a retira. Entidades podem definir `hearingThreshold`, `ambientNoiseDb`, `detectionMarginDb` e `enabled`. `setAmbientNoise(db)` modifica a máscara global; o valor por ouvinte tem precedência. `sourceId` evita que uma entidade alerte a si mesma.

`spaceId` separa mapas com coordenadas locais repetidas: fontes e ouvintes com IDs diferentes não se escutam. Barreiras com `spaceId` só afetam fontes daquele espaço. A ausência de `spaceId` significa coordenadas globais compartilhadas, portanto atribua IDs a todos os participantes quando usar mapas locais.

Todos os ouvintes são avaliados antes das notificações, para que uma reação de IA não altere as detecções restantes da mesma emissão. Os callbacks recebem a entidade original e uma cópia da origem. Cada nova chamada a `emitSound` representa um novo som; cadência de passos e cooldown de alertas pertencem ao host.

## IsometricPathfinding

```js
import { IsometricPathfinding } from './src/systems/IsometricPathfinding.js';

const nav = new IsometricPathfinding({
  width: 64, height: 64, cellSize: 32,
  origin: { x: 0, y: 0, z: 0 },
  allowDiagonal: true,
  blocked: [{ x: 10, y: 9 }, { x: 10, y: 11 }],
});

nav.setDynamicObstacle('gallery-door', [{ x: 10, y: 10 }]);
nav.setDynamicObstacle('police-car', [{ x: 15, y: 12 }, { x: 16, y: 12 }]);
const waypoints = nav.findWorldPath({ x: 288, y: 336 }, { x: 512, y: 336 });
nav.removeDynamicObstacle('gallery-door');
```

O A* usa heap binário, heurística octile admissível (Manhattan com quatro vizinhos), custos 1/√2 e arrays tipados reutilizados com marcações de geração. Os desempates seguem H e índice da célula, sem sorteio. Até 1.000.000 de células são aceitas. `setBlocked(x,y,boolean)` controla bloqueios estáticos.

Bloqueios dinâmicos são footprints por ID, com contagem de referências por célula. Abrir uma porta não libera uma célula ainda ocupada por uma viatura ou parede estática. `setDynamicObstacle(id,cells)` substitui a posição anterior de forma validada; células repetidas no footprint contam uma vez. `removeDynamicObstacle(id)` remove somente aquele objeto. `revision` muda quando a ocupação registrada muda, permitindo ao host invalidar rotas. Uma rota retornada é um snapshot: faça uma nova busca após mudanças relevantes.

`findPath(startCell, goalCell, {smooth = true, maxVisited = width × height})` devolve células, incluindo os extremos. `[]` significa destino bloqueado, fora do mapa, sem caminho ou orçamento esgotado. O algoritmo nunca atravessa cantos entre células bloqueadas. `smooth: false` expõe a rota de vizinhos com custo mínimo; o resultado suavizado pode ter segmentos longos.

`smoothPath(path)` remove waypoints usando visibilidade conservadora sobre a grelha. Não desloca obstáculos nem cria curvas que entrem em paredes. Segmentos inválidos são rejeitados, inclusive em rotas de dois pontos. `allowDiagonal: false` preserva segmentos alinhados aos eixos também na suavização. A suavização usa consultas de visibilidade adicionais; rotas muito longas podem ser processadas com `smooth: false` e suavizadas por trechos no host.

`findWorldPath` retorna os **centros das células**, na altitude `origin.z`. O host trata a aproximação final de uma posição contínua e o tamanho do personagem. Rasterize obstáculos com margem para o raio do agente; a busca representa um ponto na grelha já preparada para esse agente.

### Raycasting e cones

```js
const hit = nav.raycast(guard.position, target.position, {
  occluders: [{ id: 'office-wall', bounds: { x: 320, y: 320, z: 0, width: 32, height: 32, depth: 96 } }],
});
// null ou {cell, obstacleId, fraction, point:{x,y,z}}

const visible = nav.isInVisionCone(guard, target, {
  facingAngle: Math.PI, fov: Math.PI / 3, range: 12 * 32,
});
```

`raycast` e `hasLineOfSight` recebem pontos de mundo. O DDA supercover verifica células adjacentes em empates nos cantos e raios sobre bordas de células, evitando vazamentos de visão. Células bloqueadas e limites externos do mapa ocluem toda a coluna Z; caixas opcionais respeitam altura, `isOpen` e `enabled`. O retorno contém a primeira interseção, com `fraction` entre 0 e 1.

O cone combina distância XYZ, ângulo no plano XY e visibilidade. Ângulos são radianos: 0 aponta para +X e π/2 para +Y. `fov` é a abertura total de 0 a 2π; `range` usa unidades de mundo. `guard.facingAngle` é usado quando a opção não é fornecida. Os pontos podem estar em `entity.position` ou diretamente na entidade. Forneça posições de olhos/alvo apropriadas para oclusores baixos e use um mapa por piso.

## SpatialTriggerSystem

```js
import { SpatialTriggerSystem } from './src/systems/SpatialTriggerSystem.js';

const events = [];
const triggers = new SpatialTriggerSystem({
  baseEnvironment: { humidity: 0.4, footstepNoiseDb: 0, ambientNoiseDb: 10 },
  zones: [{
    id: 'dam-gallery',
    bounds: { x: 0, y: 0, width: 320, height: 640, minZ: 0, maxZ: 96 },
    priority: 10,
    modifiers: { humidity: 0.95, footstepNoiseDb: 8, ambientNoiseDb: 35 },
  }],
  onZoneEnter: zoneId => events.push({ type: 'enter', zoneId }),
  onZoneStay: (zoneId, dt) => events.push({ type: 'stay', zoneId, dt }),
  onZoneExit: zoneId => events.push({ type: 'exit', zoneId }),
});

triggers.update(player, dt);
const environment = triggers.getEnvironment();
acoustics.emitSound(SOUND_TYPES.PUDDLE_STEP, player.position ?? player, {
  sourceId: 'alex', noiseModifierDb: environment.footstepNoiseDb,
});
```

`update(subject, dt)` aceita ponto, `{position}`, AABB ou `{bounds}`. `dt` é fornecido em segundos, finito e não negativo. Uma entrada emite `onZoneEnter`; atualizações seguintes dentro do volume emitem `onZoneStay(zoneId,dt)`; a saída emite `onZoneExit` uma vez. Entradas não emitem Stay no mesmo tick. O retorno contém `{entered, stayed, exited, environment}`. Múltiplas zonas são independentes, com ordem estável por ID nas notificações.

Modificadores aceitos:

| Campo | Composição |
|---|---|
| `humidity` | Valor 0–1 da zona de maior prioridade. |
| `ambientNoiseDb` | Valor 0–100 da zona de maior prioridade. |
| `footstepNoiseDb` | Soma do valor base com todas as zonas, limitada a −100…100. |

Empates de prioridade usam ordem lexical dos IDs, com o último ID prevalecendo. A composição parte da base a cada tick; não acumula modificadores ao permanecer no volume. Ao sair, restaura a base ou as zonas restantes. `getEnvironment()` retorna uma cópia; `onEnvironmentChange(current,previous)` notifica apenas mudanças efetivas.

A umidade é um dado ambiental; o aumento de ruído é explícito no manifesto (`footstepNoiseDb`), permitindo materiais molhados com respostas diferentes. Para a máscara sonora de guardas, use o ambiente no espaço de cada ouvinte; não aplique o ambiente local de Alex indiscriminadamente a NPCs de outros interiores.

`setZone`, `removeZone` e `setZoneEnabled` alteram os sensores; mudanças são processadas no próximo `update`. O sistema confirma o estado/ambiente antes dos callbacks, e alterações de registro feitas por eles só afetam o próximo tick. Atualizações recursivas são rejeitadas. Teletransporte/salto de tempo é consultado na posição final; faça subpassos quando precisar detectar uma travessia muito rápida de uma zona estreita.

Volumes sólidos usam um registro separado: `setCollider({id,bounds,enabled?})`, `removeCollider(id)` e `queryCollisions(subject)`. A consulta retorna IDs ordenados das caixas tocadas, sem mover a entidade nem resolver penetração. Sensores não se tornam paredes. `getActiveZones()` devolve os IDs ativos sem expor o conjunto interno. A consulta é linear na quantidade de volumes registrados.

## Sincronização de uma porta

O host controla um único estado lógico e o encaminha aos três registros:

```js
const doorBounds = { x: 320, y: 320, width: 32, height: 32 };
acoustics.setOccluder({ id: 'gallery-door', kind: 'door', bounds: doorBounds });

function setGalleryDoorOpen(isOpen) {
  acoustics.setDoorOpen('gallery-door', isOpen);
  if (isOpen) {
    nav.removeDynamicObstacle('gallery-door');
    triggers.removeCollider('gallery-door');
  } else {
    nav.setDynamicObstacle('gallery-door', [{ x: 10, y: 10 }]);
    triggers.setCollider({ id: 'gallery-door', bounds: doorBounds });
  }
}
setGalleryDoorOpen(false);
```

Nenhum módulo chama os outros nem decide narrativa/renderização. Callbacks devem tratar seus próprios erros; notificações não revertem estados já confirmados. A apresentação consome waypoints, impactos, alertas e ambiente como dados.

## Testes

`node --test tests/ai-physics.test.js` verifica níveis e fórmulas de som, alturas, máscaras, portas, snapshots de alertas, A* contra Dijkstra em mapas com semente fixa, bloqueios sobrepostos, suavização, cantos, cones, eventos de zona, composição/restauração ambiental e a integração lógica de uma porta na galeria da represa. `npm test` executa essa suíte junto das anteriores.
