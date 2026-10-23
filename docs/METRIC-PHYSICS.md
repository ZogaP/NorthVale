# Escala e movimento de NorthVale

Um tile lógico representa **1 × 1 metro**. `WorldMetrics.js` centraliza as conversões. A projeção exterior usa tiles de 64 × 32 pixels; um metro de altura Z corresponde a 32 unidades de desenho antes do zoom.

As coordenadas dos mapas, manifestos antigos, jogador e colisões existentes continuam armazenadas em **32 unidades por metro**. A fronteira com o novo movimento converte por `pointToMeters`/`pointToWorld`. Não passe `npc.position` a APIs antigas de colisão: esse campo está em metros; `npc.x/y` são os valores convertidos para a apresentação existente. `vx/vy` são unidades antigas por segundo, enquanto `velocity` é metros por segundo. O zoom da câmera não altera velocidades ou colisões.

## Dimensões compartilhadas

| Entidade             | Largura × profundidade × altura (m) |
| -------------------- | ----------------------------------- |
| Alex e pedestres     | 0,60 × 0,60 × 1,75                  |
| Poltrona             | 0,90 × 0,90 × 0,80                  |
| Sofá de três lugares | 2,00 × 0,85 × 0,80                  |
| Mesa de centro       | 1,20 × 0,60 × 0,45                  |
| Armário              | 1,00 × 0,50 × 1,40                  |

`FurnitureData.js` também define mesas de trabalho, cadeiras, camas, estantes e eletrodomésticos. O carregador normaliza cópias dos 15 manifestos uma única vez (`metricVersion: 1`), conserva o centro dos móveis quando possível e reposiciona objetos apoiados neles. Desenho, seleção e colisão consomem os mesmos `w/h/height`. `dimensionsMeters`, `rotation` e `boundsMeters` expõem a geometria métrica para outros sistemas. A rotação de 90 graus troca largura e profundidade no mapa. Os pequenos objetos de decoração respeitam os novos suportes.

O humano usa raio de colisão de 0,30 m e sprites com altura de quadro de 56 unidades, inclusive no exterior. A imagem mantém sua proporção e transparência original; o retângulo físico de 0,60 m mede o espaço ocupado no chão, não a largura de toda a roupa desenhada.

## Rotinas sem teletransporte

`NPCRoutineSystem.getRoutineTarget()` fornece destino, atividade e identidade. `MovementSystem` mantém o corpo físico por ID em `state.npcMovement`, com posição, caminho, índice do próximo ponto, velocidade e destino. `NorthValeWorld.updateNPCs(engine, dt)` planeja rotas A\* e integra o deslocamento em **segundos reais**:

```js
position.x += velocity.x * dt;
position.y += velocity.y * dt;
```

A caminhada padrão é 1,4 m/s. `walkSpeedMps` aceita apenas 1,2–1,6 m/s; a velocidade diagonal é normalizada. O integrador conserva o orçamento de tempo ao atravessar vários pontos de uma rota e para sem ultrapassar o destino. O `GameEngine` limita espigões de `dt` a 0,1 s. O relógio acelerado só troca destinos; não multiplica a velocidade. Um destino inacessível mantém a posição atual. A navegação reserva espaço para o raio humano junto às quinas. Pausa e diálogos interrompem a atualização física.

A primeira inicialização coloca cada personagem no local correspondente ao horário inicial. Saves anteriores, sem `npcMovement`, recebem essa inicialização uma vez. Depois disso, mudanças de horário e carregamentos preservam a posição física. Os slots existentes serializam a locomoção junto do restante do estado.

## População e identidade visual

Há 32 registros lógicos de rotina, sem gerador de multidão por quadro. Apenas corpos ativos em trânsito aparecem nas ruas. Moradores em casa, dormindo ou trabalhando dentro de um prédio não são copiados para a calçada. A apresentação filtra pelo setor da câmera e depois pelos limites da tela; o coletor elimina repetições de `id` e `characterId`. Nos interiores, o local e o cômodo da rotina determinam quais personagens são apresentados.

Todo DTO de personagem expõe `characterId` (por exemplo, `alex_hale`, `bobby_miller`, `elias_ward`), `appearance`, `position`, `dimensionsMeters`, `boundsMeters` e `velocity`. `CharacterProfiles.js` associa personagens aos atlas compartilhados. Os coadjuvantes têm variações determinísticas de corpo, paleta e fase de animação. Isso reutiliza os desenhos disponíveis; não adiciona 32 spritesheets inéditos. Artistas podem substituir os perfis por assets próprios mantendo a identidade usada pelo motor.

Verificação: `npm test`, `npm run test:metric` (servidor local na porta 5173) e `npm run test:engine`. A suíte métrica compara 30/60/144 FPS, colisões entre pontos de rota, mudanças abruptas de horário, persistência durante a caminhada, dimensões e suportes dos móveis e filtragem de personagens.
