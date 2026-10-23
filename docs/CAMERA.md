# Câmera isométrica

`src/engine/CameraSystem.js` exporta `CameraSystem` como ES Module, sem DOM, Canvas, bibliotecas ou loop próprios. O bootstrap registra um único listener `wheel` com `{ passive: false }` e o remove ao destruir o jogo.

```js
import { CameraSystem } from "./engine/CameraSystem.js";

const camera = new CameraSystem({ width: 1440, height: 900 });
camera.snapTo(player); // Primeira entrada, carregamento ou mudança de cômodo.

// No loop existente, com dt em segundos reais:
camera.update(dt, player);
const screen = camera.worldToScreen(player.x, player.y, player.z ?? 0);
const floor = camera.screenToWorld(pointer.x, pointer.y);

// O host decide quando aceitar zoom e registra/remove seus listeners.
function onWheel(event) {
  if (camera.handleWheel(event)) event.preventDefault();
}
```

## Parâmetros

| Parâmetro                     |                        Padrão |
| ----------------------------- | ----------------------------: |
| `defaultZoom` / zoom inicial  |                           1,9 |
| `minZoom`                     |                           1,2 |
| `maxZoom`                     |                           2,6 |
| `trackingSpeed`               |               4,5 por segundo |
| `zoomSpeed`                   |                 8 por segundo |
| `lookAheadDistance`           | 40 unidades de mundo (1,25 m) |
| `projectionX` / `projectionY` |        1 / 0,5 (exterior 2:1) |
| `baseScale`                   |                             1 |

O scroll altera `targetZoom`. `update` aproxima `zoom` desse alvo por amortecimento exponencial, sem saltos, respeitando os limites. Deltas em pixels, linhas e páginas são normalizados. O zoom usa o centro da viewport como pivô. O acompanhamento usa `1 - Math.exp(-trackingSpeed * dt)`. O vetor de antecipação é normalizado: andar na diagonal ou correr não aumenta seu alcance. Quando o movimento para, a câmera retorna suavemente ao personagem. Diálogos acompanham o interlocutor sem antecipação.

Uma direção de lanterna pode substituir a velocidade:

```js
camera.update(dt, player, {
  aimDirection: { x: Math.cos(player.angle), y: Math.sin(player.angle) },
});
```

O adaptador reconhece `state.flashlightOn`/`state.lighterOn` para esse encaixe. A classe também aceita `{ lookAhead: false }`.

## Coordenadas e proporção visual

X/Y/Z de entidades continuam nas unidades métricas existentes: 32 unidades por metro. `camera.x/y` são o centro **já projetado**, antes do zoom. Com `baseScale = 1`, a transformação é:

```js
screenX = (worldIsoX - camera.x) * camera.zoom + width / 2;
screenY = (worldIsoY - camera.y) * camera.zoom + height / 2;
```

O adaptador usa `baseScale = viewport.height / 640`, mantendo o quadro de Alex (56 unidades) em aproximadamente **16,6% da altura da viewport** no zoom 1,9. A escala efetiva é `camera.scale = baseScale * zoom`. Isso calibra a apresentação sem mudar dimensões físicas, velocidade ou bounding boxes. Nos limites, a proporção do quadro varia de 10,5% a 22,75%.

`worldToScreen` e `screenToWorld` compartilham exatamente essa escala e o mesmo pivô. O segundo método recebe opcionalmente `groundZ` para inverter uma projeção em um plano elevado. Os valores são pixels lógicos; o bootstrap converte o ponteiro CSS para esse espaço. `getTransform(pixelRatio)` retorna `[a,b,c,d,e,f]` para desenhar coordenadas **já projetadas** no backing store, incluindo DPR. Não aplique o fator DPR duas vezes.

## Integração

`GeminiPresentation.cameraSystem` controla a câmera ativa. As camadas exteriores existentes recebem um viewport virtual antes do zoom; suas matrizes são restauradas antes de chuva em espaço de tela, HUD, modais e diálogos. O frustum dos NPCs usa a inversa da câmera, inclusive nos extremos de zoom.

Interiores usam a mesma câmera com o coeficiente horizontal existente de 0,866. O enquadramento acompanha Alex em vez de reduzir toda a sala para caber na tela. O renderizador mantém sua transformação inversa para seleção de polígonos. Objetos, portas, personagens, sombras e luzes recebem a mesma escala. Ao trocar de cômodo, a câmera assume a posição local correspondente durante a transição de área.

Scroll é aceito em exploração e diálogo; pausa, caderno, mapa e outros modais preservam seu controle próprio. Saves não precisam converter coordenadas por causa do zoom. A classe não modifica o estado físico do jogador.

Verificação: `npm test` e `npm run test:camera`, com servidor em `http://127.0.0.1:5173`. O teste de navegador mede a proporção desenhada, compara a posição renderizada com a matriz, usa scroll real e clica na mesma poltrona nos três níveis de zoom, incluindo viewport CSS estreita e DPR 2.
