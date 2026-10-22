# NorthVale — Editor de Cenários

Abra `NorthVale_AssetStudio.html` em um navegador desktop. O arquivo é independente: inclui editor, catálogo, prompts e geradores, sem módulos, imagens externas ou instalação. Pode ser servido pelo `npm start` existente. É uma ferramenta de criação separada do jogo.

O catálogo contém 31 presets: 22 vistas dos locais descritos, 8 personagens (incluindo Alex) e a viatura. Os prompts das fachadas, interiores e sprites terminam com o Sufixo Base fornecido. Os parâmetros `--ar` e `--v` são preservados como texto para o gerador de imagens; não são configurações do Canvas.

## Fluxo de criação

1. Selecione a localização, vista ou folha de sprites.
2. Use o catálogo com miniaturas, busca e categorias: móveis, pistas, equipamentos e decoração. Há 77 tipos disponíveis em qualquer ambiente; o filtro inicial mostra os sugeridos para o local.
3. Escolha um item e clique no piso para colocá-lo. Arraste para mover ou edite X/Y no painel da direita. Ajuste nome, largura, profundidade, altura, elevação, rotação, cor, material e colisão. Objetos apoiados em mesas acompanham seu móvel ao mover, girar ou duplicar o conjunto.
4. Exporte a composição PNG, a camada base ou a máscara frontal transparente. A resolução dos ambientes pode ser 1600×900, 1920×1080 ou 2560×1440.
5. Salve o JSON junto da imagem. Para tudo de uma vez, use **Baixar catálogo ZIP**.

**R** gira 90°, **Delete** remove, **Ctrl+D** duplica, **Ctrl+Z** desfaz e **Ctrl+Shift+Z** refaz. Setas movem em incrementos de 0,25; Shift aumenta o passo para 1. Esc cancela colocação ou arrasto. O histórico mantém as últimas 60 alterações por ambiente e semente. A grade de 0,25 pode ser desligada.

**Limpar objetos do ambiente** deixa o piso livre para montar outro layout. **Restaurar layout** recupera o preset original. Ambas as ações podem ser desfeitas. Alterar a semente abre outra variação, preservando a edição anterior. As alterações de cada ambiente permanecem ao usar o seletor de locais.

Em **Editar ambiente e arquitetura**, mude paredes, piso, telhado e nome da fachada, ou oculte arquitetura, elementos altos e objetos. As fachadas têm estruturas próprias: delegacia com torre e ala de celas, farmácia estreita com toldo, biblioteca com arcos e frontão, cartório com pórtico, diner baixo e envidraçado, motel de dois pisos em L, frigorífico com cobertura serrilhada, ferro-velho com oficina aberta e guindaste, casa com telhado de duas águas e varanda.

## Guardar e retomar a edição

Em **Salvar / abrir projeto editável**, escolha **Salvar projeto** para baixar `NorthVale-Projeto.json`. Esse arquivo reúne todos os ambientes/variações editados e as opções de chuva, luz, camada e resolução. **Abrir JSON** aceita tanto esse projeto como o JSON individual exportado de um ambiente. Arquivos inválidos são recusados antes de alterar a edição.

O navegador também salva um rascunho local após cada edição, quando o armazenamento está disponível. Para mudar de computador ou navegador, use o arquivo de projeto. PNG é uma imagem final; o JSON permite continuar editando. O catálogo ZIP inclui os layouts personalizados e preserva a edição que estava aberta antes da exportação.

O ZIP contém 31 composições PNG, 44 camadas PNG, 31 JSONs, manifest, prompts e instruções: 109 entradas. O catálogo completo em 1600×900 ocupa aproximadamente 100 MB. O download ocorre como um único arquivo, com progresso na interface; um link permite repetir o download se o navegador não o iniciar. A exportação usa o instante zero da chuva e exclui seleção e linhas de diagnóstico.

## Objetos e projeção

Os presets originais somam 484 registros examináveis, com 77 tipos de prop. O editor permite adicionar e remover registros. Cada registro exporta `id`, `type`, nome, `x/y/z`, `w/d/h`, `rotation`, `color`/`material` quando personalizados, `sortY`, `seed`, `solid`, `action`, `screenAnchor` e polígono `collision`. A colisão acompanha a rotação e o tamanho editados. `supportId`, quando presente, associa o detalhe ao móvel de apoio. O JSON descreve a ação `examine` para ser ligada à lógica do jogo.

As plantas são específicas por tema, em unidades de mundo. A projeção de referência é:

```js
const screenX = (800 + (x - y) * 43) * exportScale;
const screenY = (205 + (x + y) * 22 - z * 42) * exportScale;
```

`exportScale = larguraExportada / 1600`. Coordenadas dos polígonos de colisão permanecem em unidades de mundo; as âncoras são exportadas no referencial 1600×900. `walkable` descreve o piso de composição; paredes, divisórias e arquitetura devem ser adicionadas à malha de navegação ao integrar uma cena ao jogo. O Studio não executa A* nem recalibra automaticamente a cena pintada da delegacia existente.

## Sprites

Personagens: 1536×1344, células 192×192, oito colunas de direção (S, SO, O, NO, N, NE, E, SE). Linha 0 é idle; linhas 1–6 formam a caminhada, a 9 FPS. Viatura: 2048×192, oito quadros 256×192. O JSON inclui a âncora normalizada de cada tipo de folha. Todos os quadros mantêm margem transparente, sem vazamento para a célula adjacente.

Os desenhos são procedurais e estilizados, úteis para prototipagem, composição e coordenadas. As pinturas detalhadas e os sprites já usados na delegacia continuam sendo um conjunto de arte separado. O campo de prompt permite levar a composição para uma etapa de pintura final.

## Verificação

```sh
npm run test:studio
npm run test:editor
```

Os testes usam Chromium, configurável por `NORTHVALE_CHROMIUM_PATH`, com a rede desativada. Cobrem os 31 presets, reprodução da semente, PNG e JSON, transparência, todos os quadros de sprites e ZIP por CRC. O teste do editor usa arrasto real, controles de propriedades, desfazer/refazer, grupos de apoio, persistência por ambiente, reabertura de projeto com pixels idênticos, rejeição de arquivos inválidos e salvamento local após recarregar. A comparação das nove fachadas usa imagens sem props e o mesmo nome para verificar diferença estrutural. Não precisam do servidor do jogo.
