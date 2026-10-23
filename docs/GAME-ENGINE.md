# Orquestrador central e integração Gemini

O checkout incorpora a atualização remota `6d7d713` (views do Gemini), preservando os módulos lógicos desenvolvidos anteriormente. A entrada principal usa `src/main.js` e `#gameCanvas`. A interface anterior, com seu loop próprio, é uma aplicação separada em `legacy.html`/`src/legacy-main.js`; ela nunca é importada pelo novo motor.

## Responsabilidades

| Arquivo | Responsabilidade |
|---|---|
| `src/GameEngine.js` | FSM, relógio, input, lifecycle do RAF e coordenação das regras. Importável em Node sem DOM. |
| `src/main.js` | Bootstrap, armazenamento/idioma, listeners, viewport e controles DOM acessíveis. |
| `src/engine/NorthValeWorld.js` | Adaptador do mapa/colisões/interiores existentes, navegação de NPCs, interações e eventos acústicos. |
| `src/engine/GeminiPresentation.js` | Tradução dos DTOs e callbacks para as assinaturas reais das views do Gemini. Todo desenho fica nesta camada e nos renderizadores. |
| `src/systems/CutsceneDirector.js` | Relógio cinematográfico, cancelamento e conclusão única com token. |
| `src/ui/DetectiveJournal.js` | Caderno paginado com provas, inventário, missões e agendas, usando `DocumentViewer`. |

O repositório atualizado forneceu `IntroCutsceneView` e `CutsceneRenderer`, mas não um diretor lógico de cutscenes nem um caderno. Foram acrescentados os dois adaptadores necessários. A introdução usa a view do carro; epílogo e créditos usam as views respectivas. O `CutsceneRenderer` genérico permanece disponível para outras cenas. O módulo de iluminação existente faz os pools de luz externos e mantém as luzes dos interiores; não foi inventado um import para uma classe `LightingFX` ausente.

## Inicialização e extensões

```js
import { GameEngine } from './src/GameEngine.js';

const engine = new GameEngine({
  state, storage, input,
  trees: authoredDialogues,
  world: worldAdapter,
  presentation: geminiAdapter,
  onError: error => showError(error.message),
});
await engine.initialize();
engine.start();
// Ao desmontar a aplicação:
engine.destroy();
```

`initialize()` aguarda `world.ready` e a inicialização/assets da apresentação. `start()` é idempotente: só existe um RAF agendado. `stop()` cancela o frame pendente e limpa teclas; `destroy()` também libera os recursos dos adaptadores e o input pertencente ao motor. No bootstrap, `window.northvale` expõe `{engine, world, presentation, setLanguage, destroy}` para autoria e inspeção no DevTools.

Para adaptar outro renderer, implemente os métodos necessários de apresentação: `initialize(engine)`, `enterState(mode,payload,engine)`, `exitState(mode,engine)`, `update(dt,engine)`, `resize(viewport)`, `beginFrame(frame)`, `renderGround`, `renderEntities`, `renderRoofs`, `renderWeatherLighting`, `renderUI`, `renderModal`, `endFrame`, além dos eventos de interface desejados. Métodos opcionais são verificados antes da chamada. Cada frame contém estado, modo, câmera, viewport, overlay e pausa.

O adaptador de mundo fornece `ready`, `routineOptions`, `pathfinding`, `zones`, `reset(state,engine)`, `movePlayer(dt,engine)`, `update(dt,engine)`, `interact(engine)`, `unlockDoor(door,engine)` e callbacks de diálogo/som. É possível injetar sistemas especializados por `systemsFactory(state,engine)`. O núcleo nunca importa views, DOM ou Canvas.

## Estados e interrupções

Os dez estados são exportados em `GAME_STATES`:

- `MAIN_MENU`: novo jogo, continuar, idioma e acesso aos créditos.
- `INTRO_CUTSCENE`: diretor aciona a cena do carro. Espaço/Enter pula. Terminar marca `introDone` e entra em exploração uma vez.
- `EXPLORATION`: relógio, movimento, interiores, gatilhos, rotinas e investigação.
- `DIALOGUE`: bloqueia o mundo, aponta a câmera ao interlocutor e liga cursor/escolhas do runner à view.
- `INSPECTION`: documento ou close-up de cena/gaveta.
- `CORKBOARD`: arrastar de um cartão a outro chama `connectNodes` e `validateConnection`; o resultado e os pontos vêm do motor lógico.
- `LOCKPICKING`: A/D ajusta o ângulo e Espaço aplica tensão. A faixa correta abre gradualmente; tensão fora dela desgasta a gazua no inventário.
- `CASSETTE`: apenas fitas recolhidas podem ser abertas; a view recebe a transcrição autoral, sem usar a narrativa de exemplo dela.
- `EPILOGUE`: estado bloqueado por `EndingManager`; continuar abre créditos.
- `CREDITS`: conclusão/skip da view retorna ao menu. Uma partida nova reinicializa os sistemas; carregar um final conserva o bloqueio.

As transições são verificadas por tabela. Uma cutscene cancelada ou um callback com token antigo não pode reabrir o mundo. A confirmação de um final é persistida em autosave. `engine.act(action)` encaminha decisões ao `CanonicalCampaign` e abre imediatamente o epílogo quando a decisão já fecha o caso. A detecção normal de finais também acontece na exploração.

Pausa e overlays são ortogonais à FSM: não acrescentam estados fora dos dez solicitados. Tab (também J) abre/fecha o caderno, C alterna a cortiça e M alterna o mapa. Escape fecha primeiro um overlay, depois um modo de interação; quando nenhum está aberto, alterna a pausa. Os atalhos não avançam a narrativa. Os créditos respeitam o tempo mínimo de skip definido pela view. `blur`/aba oculta pausam e limpam teclas; retornar não simula o tempo passado em segundo plano.

APIs para eventos de cenário/UI:

```js
engine.startDialogue('talk-bobby', 'bobby');
engine.chooseDialogue('confront'); // O runner revalida os requisitos.
engine.inspect({ title: 'Registro', text: 'Conteúdo recolhido...' });
engine.inspect({ type: 'scene', data: { title: 'Gaveta', type: 'drawer', hotspots: [] } });
engine.playCassette('tape', { title: 'Fita recolhida', transcription });
engine.startLockpicking(actualDoorTarget, 'Gazua de Aço');
engine.areaChanged('police/archive'); // Após confirmar a transição de área.
engine.saveGame(1);
engine.loadGame('autosave');
```

Hotspots de `SceneInspectView` usam coordenadas lógicas e um tipo gráfico (`document`, etc.). Para coleta, forneça `itemData: {id,type,metadata}` ou `itemId`; na ausência desses campos, o adaptador usa o `id` do hotspot como evidência. O tipo gráfico não é repassado como tipo do inventário. Repetir o clique não duplica o item.

Os diálogos de integração cobrem os 32 registros e conectam os favores/confrontos canônicos existentes. São uma base autoral curta; a interface recebe os mesmos contratos ao trocar essas árvores por diálogos extensos. O catálogo mantém os oito personagens principais e os 24 figurantes já documentados no sistema de rotinas. Retratos usam o catálogo do Gemini e sprites usam os atlas existentes.

## Tempo, física e renderização

Cada callback RAF calcula `dt = (timestamp - lastTime) / 1000`, limitado a `[0,0.1]`. O primeiro frame e o reinício após pausa usam zero. Timestamps regressivos não geram tempo negativo. O movimento usa subpassos de no máximo 1/120 s; o input de interação é consumido uma vez por frame. O relógio, NPCs e movimentação ficam suspensos durante modais, enquanto animações de interface continuam com o delta seguro. Erros do loop param o RAF e são reportados ao host.

`render()` não altera o relógio ou as regras. A ordem de delegação é chão/poças → entidades/estruturas ordenadas → telhados/transição → luz/clima → HUD/paranoia → modais. As views mantêm suas animações visuais. Os interiores preservam o pacote de desenho já existente, com seu próprio y-sorting de móveis, portas, personagens e iluminação. A mudança interior/exterior recebe composição de fade de 250 ms; os telhados do Gemini mantêm seus próprios alphas.

O mundo usa as coordenadas XY existentes em unidades de mundo. O adaptador converte para a grade 2:1 de tiles 64×32 do Gemini dividindo XY por 32. A navegação usa células de 32 unidades; colisão contínua conserva as plantas e footprints existentes. As rotinas consultam os 32 NPCs pelo relógio e interpolam os percursos do A*, com cache por trajeto/revisão. Posições locais de interiores pertencem ao espaço daquele cômodo; a acústica não mistura coordenadas repetidas de salas distintas.

O alvo é a cadência do `requestAnimationFrame` com movimento independente do FPS. Isso não garante 60 FPS em todo hardware: custo de desenho e GPU continuam dependendo de resolução e complexidade das views. O loop não cria um segundo RAF para HUD, cutscene ou modal.

## Viewport, idioma e saves

O viewport lógico é 1440×900. `fitGameViewport` calcula letterbox sem distorcer o aspecto 16:10, ajustando backing store à escala CSS e ao DPR, limitado a 2. Coordenadas de ponteiro são convertidas de `getBoundingClientRect()` para esse espaço lógico, inclusive após resize e em telas estreitas.

`northvale_lang` aceita `PT-BR`, `EN`, `ES`, `DE`. A seleção existente é carregada e o atributo `lang` do documento acompanha o menu/seletor. A preferência seleciona as traduções que as views já fornecem; os diálogos autorais desta integração continuam em português. Armazenamento bloqueado na inicialização usa memória temporária, com aviso; falhas posteriores de quota são reportadas preservando slots anteriores.

Três slots manuais e autosave vêm do `SaveLoadManager`. O slot 1 importa o save único anterior quando estiver vazio. Carregar valida antes de substituir o estado, reconstrói os adaptadores lógicos e retoma diálogo/epílogo quando aplicável. Inspeções, minigames e overlays são sessões transitórias; seus resultados, itens e integridade persistem. O estado de menu não é um segundo save de jogo.

## Executar e validar

```sh
npm start
npm test
npm run check
npm run test:engine
npm run build
npm run test:offline
```

Os smokes da interface antiga usam `legacy.html` por padrão. O novo smoke abre a página principal e atravessa os dez estados, incluindo arraste real de alfinetes, escolha com prova, recarga de diálogo, movimento, gazua, fita, entrada na delegacia, idioma, resize e encerramento do loop. Testes unitários verificam delta/subpassos, FSM, prioridade de modais, camadas e persistência sem navegador.
