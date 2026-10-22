# Núcleo canônico de NorthVale — 0.6

O jogo agora tem um enredo fixo: Bobby Miller é responsável pelo desaparecimento de Sarah; Ruth Mercer participa do acobertamento. A seed antiga é um identificador de arquivo, não decide o culpado. A migração conserva o caso anterior em `legacyCase`, preserva evidências antigas como documentos históricos e reinicia deduções incompatíveis. Um save canônico incompatível é rejeitado, não reinterpretado silenciosamente.

## Código executado

`index.html` carrega **somente `src/main.js`**, com módulos ES. `npm run build` percorre as dependências desse mesmo arquivo e gera dois HTMLs autocontidos idênticos: `dist/NorthVale.html` e `JOGAR_OFFLINE.html`. Código, CSS, 15 manifestos JSON e PNGs ficam incorporados. Os antigos `src/bundle-*.js`, `interiors-data.js`, gerador aleatório e avaliador de sete finais são preservados como referência histórica e não são carregados pela aplicação atual.

O runtime não exige bibliotecas de terceiros. Playwright é uma dependência de desenvolvimento para os testes de navegador. Para o alvo desktop, instale um NW.js moderno com suporte a `structuredClone` e execute `nw desktop` depois do build. O manifesto em `desktop/package.json` aponta para a distribuição autocontida e desabilita integração Node na página. O binário NW.js não está incluído nem foi executado neste ambiente.

## Os cinco módulos

| Arquivo | Contrato |
|---|---|
| `src/engine/IsoProjection.js` | Conversão mundo/tela, inversa no plano Z conhecido, profundidade e frustum. Rejeita NaN, infinito e limites inválidos. |
| `src/engine/RenderQueue.js` | Array reutilizado, ordenação estável recalculada, suporte a 32 ou mais atores, passes de chão/estruturas e atores/telhados/overlay e fade de 250 ms em polígonos côncavos ou AABBs. |
| `src/systems/InputManager.js` | Ações abstratas, dois vínculos por ação, teclado e três botões de mouse, bordas por frame, cancelamento por blur, persistência tolerante a falhas e remoção de duplicatas. |
| `src/systems/QuestManager.js` | Cinco missões, pré-requisitos, evidência real para avançar, estágios sem saltos, estados terminais e payload JSON defensivo. |
| `src/systems/EndingManager.js` | Avaliação pura dos sete campos de entrada, 14 resultados ou `null`, bloqueio definitivo e snapshot da decisão. |

`CanonicalCampaign` é o adaptador entre evidências físicas, favores, missões e eventos de decisão. `CampaignPanel` é uma interface substituível; os cinco módulos centrais não dependem dela. As entidades do renderizador e os telhados existentes usam a nova fila. O picking dos interiores aplica a inversa com a origem da câmera antes de testar os polígonos dos objetos.

### Projeção e câmera

Foi seguida a **fórmula de 30°** do documento: `cos = sqrt(3)/2` e `sin = 0.5`. A razão horizontal/vertical resultante é aproximadamente 1,732:1. Uma projeção dimétrica estritamente 2:1 exigiria coeficientes diferentes; misturar essas duas convenções deslocaria os cliques.

```js
const projection = new IsoProjection();
const pixel = projection.worldToScreen(120, 80, 24, 660, 170);
const world = projection.screenToWorld(pixel.x, pixel.y, 24, 660, 170);
```

`RenderQueue.draw(ctx, viewport, originX, originY)` espera viewport e pontos projetados no mesmo espaço. A largura/altura da entidade devem cobrir seu desenho para que o culling preserve partes visíveis. A fila controla `ctx.globalAlpha`; o argumento `alpha` do callback é informativo e não deve ser multiplicado novamente. Estruturas e atores compartilham a ordenação para manter a oclusão. Telhados podem usar `buildingId` para compartilhar a transição com o respectivo polígono.

### Entradas

Padrões: WASD/setas mover; E ou mouse esquerdo interagir; J caderno; C cortiça; L isqueiro; T relógio; Espaço/Enter avançar diálogo; 1/2/3 escolhas; Escape pausa/cancelamento. Um slot primário vazio (`''`) significa sem vínculo; o secundário vazio usa `null`. Escape não pode ser removido nem atribuído a outra ação. `resetFrameStates()` é chamado ao final do frame. Destruir o gerenciador remove todos os listeners.

O painel **Controles** permite capturar teclas e selecionar Mouse0/1/2. Configuração em `northvale_keymap`. Armazenamento indisponível mantém os controles funcionando em memória. Os atalhos auxiliares do host — M mapa, X missões, I interrogar, P seguir, F viatura, O fechar porta e K trancar — só são atendidos quando o código físico não foi atribuído a uma ação abstrata.

### Missões e provas

O prólogo inicia a trilha principal. A carta de Sarah libera a investigação dos arquivos; a escritura de 1978 leva ao confronto com a prova da viatura; planta da câmara, lanterna e ferramentas permitem tentar o resgate nas turbinas. Até o terceiro dia, Sarah pode ser resgatada viva; depois disso o resgate encontra Sarah morta por hipotermia e a missão principal falha. A investigação pode continuar após essa falha.

Elias entrega fenol/luminol mediante a prescrição. Sam concede as gazuas após a recuperação da caixa. Owen confirma a viatura nº 04. Clara decifra a escritura de 1978. Recompensas não se repetem. A gazua não faz parte do inventário inicial.

As pistas físicas têm `interiorId`, `roomId` e `propId` validados contra os manifestos nos testes. Documentos obtidos de testemunhas só são concedidos pelo respectivo favor. O peso probatório é recalculado das dez provas canônicas, com teto 10; itens marcados `evidenceIntegrity[id] === false` não contam. A carta e o relatório valem um ponto cada. Uma travessia deliberada sem proteger os documentos da chuva na represa pode inutilizar as provas escritas, preservando a dedução. Assim o final 09 pode decorrer de uma investigação correta com provas materiais perdidas. Ligações sem sustentação no quadro aumentam a paranoia em cinco pontos e não podem ser repetidas para acumular pontos. A comprovação da culpa no quadro usa três evidências interligadas e gera `CORRECT_DEDUCTION`.

`SARAH_STATUS` usa os valores do documento. Antes da descoberta do destino, `SARAH_OUTCOME_KNOWN === false` evita apresentar um valor técnico inicial como fato narrativo. O resgate marca o destino conhecido. Paranoia, vigilância, reputação, estabilidade, provas, flags e missões são persistidos no save.

## Finais e precedência

Uma condição numérica isolada não força um evento narrativo. Os flags abaixo representam ações efetivamente realizadas. `null` significa que o mundo deve continuar. O fluxo só chama `lockEnding` após uma avaliação válida, salva o snapshot e bloqueia movimento/interação; menus e consulta continuam disponíveis.

| Final | Condição e evento |
|---|---|
| 01 Redenção Analógica | Provas ≥ 8, Sarah viva, sem suborno, `PROOFS_DISPATCHED_TRAIN`. |
| 02 Justiça Sombria | Provas ≥ 8, Sarah morta de hipotermia, `EXECUTED_BOBBY_AT_SPILLWAY`. |
| 03 O Sacrifício do Forasteiro | Sarah viva, vigilância ≥ 90, `BARRICADED_STATION`. |
| 04 A Queda do Sistema | Sarah viva, reputação ≥ 30, `PUBLIC_ACCUSATION`. |
| 05 A Última Confissão | Estabilidade de Bobby = 0, `BOBBY_IN_PHARMACY_CUSTODY`. |
| 06 Pacto de Ferro | Sarah viva, `RUTH_DEAL_SIGNED`. |
| 07 O Chantagista | Provas ≥ 8, `CORRUPT_BRIBE_ACCEPTED` e `FLED_WITH_75000`. |
| 08 O Crime Perfeito de Bobby | Vigilância ≥ 85, `AMBUSHED_AT_SLUICE`. |
| 09 Louco Sem Provas | Provas ≤ 3, `CORRECT_DEDUCTION` e `PSYCHIATRIC_REPORT_FILED`. |
| 10 O Incêndio do Arquivo | `BOBBY_PANIC_UNCONTAINED`. |
| 11 A Cúmplice Silenciosa | `CLARA_BLAMED`. |
| 12 A Vingança de Helen | `HELEN_ARMED`. |
| 13 O Abandono Covarde | `ABANDONED_CITY`, ou paranoia = 100 no dia 2 com `DAY2_INACTION`. |
| 14 Morte em Serviço | A partir do dia 3, `DAM_INVADED_UNEQUIPPED`. |

O anexo não define desempate. A implementação usa **14 → 05 → 10 → 11 → 12 → 08 → 13 → 03 → 02 → 07 → 06 → 04 → 01 → 09**. Eventos fatais específicos precedem acordos; acordos precedem a conclusão por provas. Por exemplo, armar Helen prevalece sobre um envio de provas previamente registrado. Depois de bloqueado, um final não pode ser substituído por outro.

O painel de decisões depende do local: trem no depósito, resgate/vertedouro na represa, Ruth na delegacia, exposição/Helen no diner, custódia na farmácia, Clara/pânico no cartório e fuga no posto ou motel. É um adaptador funcional de decisões, não uma campanha com 14 cutscenes novas. A camada visual pode consumir o mesmo resultado e substituir o painel por cenas dirigidas.

## Validação e limites

`npm test` verifica os cinco contratos, os 14 finais, limites numéricos, precedência, save/migração, progressão, colisões e renderização existente. `npm run test:canonical` faz buscas reais em dez objetos (com posições de teste), quatro favores, confronto, resgate, envio pelo trem, recarga e bloqueio de movimento. `npm run test:offline` abre a distribuição sem rede e atravessa portas internas. A sintaxe é verificada por `npm run check`.

A fila reutiliza seu array; isso não elimina todas as alocações dos produtores de entidades nem garante 60 FPS em qualquer hardware. Desempenho final depende de resolução, quantidade de objetos e GPU; os testes de lógica não equivalem a um benchmark visual. NW.js ainda precisa ser validado na máquina desktop de destino. O núcleo não cria 32 biografias ou novas artes: suporta essa quantidade de entidades sem um limite artificial de NPCs.

Medição isolada nesta máquina: 1.024 entidades (32 atores), 600 frames após aquecimento, mediana de 0,063 ms e percentil 95 de 0,262 ms para projeção, culling e ordenação com callbacks vazios. Essa medição exclui a pintura Canvas e a GPU, portanto não representa o FPS visual do jogo.
