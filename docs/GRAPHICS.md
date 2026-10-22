# NorthVale — pipeline gráfico 0.4

O runtime mantém Canvas 2D para geometria isométrica, ordenação espacial e composição. Um contexto WebGL2 auxiliar executa os materiais e contornos em GLSL ES 3.00; seus resultados são compostos no Canvas. A interface **Gráficos** permite inspecionar os cinco rostos e seus quatro canais, mudar para fallback Canvas, reduzir detalhes e desligar luzes/AO separadamente.

## Sistemas entregues

| Arquivo | Responsabilidade |
|---|---|
| `src/graphics/materials.js` | Identidades faciais, materiais de superfície e validação de descritores |
| `src/graphics/procedural.js` | Geração determinística de pele, traços, desgaste e mapas; carregamento de imagens externas |
| `src/graphics/texture-manager.js` | Streaming com duas cargas simultâneas, prioridades, deduplicação, leases, cancelamento, descarte e LRU |
| `src/graphics/material-renderer.js` | Compilação GLSL, upload GPU, mipmaps, normalização da orientação de ImageBitmap, liberação e restauração de contexto |
| `src/graphics/shaders.js` | Fonte autoritativa dos shaders usados pelo jogo |
| `shaders/material.*.glsl` | Exportação dos mesmos shaders para ferramentas externas |
| `src/interiors/manifest-loader.js` | Carregamento e validação de 15 plantas JSON exclusivas |
| `src/interiors/interior-renderer.js` | Cômodos em corte, props, sombras, iluminação, picking e cache |
| `src/graphics/interaction.js` | Picking geométrico dos volumes isométricos e alcance de interação |
| `src/graphics/lighting.js` | Luzes pontuais com atenuação, oclusão de contato e pools de luz |
| `src/graphics/sprite-cache.js` | Reuso de props rasterizados com orçamento de 8 MiB |
| `src/scenes/police-station.js` | Fundo pintado, y-sorting, máscara frontal, iluminação e chuva |
| `src/scenes/isometric-collision.js` | Matriz invisível, obstáculos poligonais, colisão por raio e A* |
| `src/graphics/spritesheet.js` | Spritesheets em oito direções e âncora nos pés |
| `src/ui/dialogue.js` | Retratos dinâmicos, escolhas e progressão da conversa |

O nome NorthVale está aplicado ao pacote, lockfile, tela inicial, mapa, cidade, servidor, distribuição e configurações. As variáveis são `NORTHVALE_PORT`, `NORTHVALE_URL` e `NORTHVALE_CHROMIUM_PATH`; nenhuma credencial é necessária. `northvale-save` é o namespace atual de salvamento. A única referência ao nome anterior em produção é a chave de compatibilidade isolada em `src/storage.js`, necessária para importar partidas existentes sem apagar o original.

## Pipeline de assets

A delegacia usa arte dedicada: fundo e máscara frontal em 1536×1024, Alex em grade 8×6, Ruth em grade 8×4 e três retratos de 256×256. A ordem das colunas dos spritesheets é S, SO, O, NO, N, NE, E, SE. Cada quadro mede 192×192 e ancora o personagem pelos pés, permitindo ordenar atores e recortes de mobiliário pelo eixo Y.

O fundo é desenhado primeiro. Mesas e cadeiras que precisam ocultar os atores são redesenhadas como recortes do próprio fundo dentro da fila de profundidade. Luz `multiply`, pools `screen`, chuva recortada nas janelas e `fore_mascara_delegacia.png` são compostos depois. O contorno roxo de interação usa um passe `screen` pulsante.

Com o servidor iniciado por `npm start`:

```sh
npm ci
npx playwright install chromium
npm run assets:bake
npm run build
```

Se Chromium já estiver instalado, defina `NORTHVALE_CHROMIUM_PATH` para seu executável. O comando de bake precisa acessar o servidor; `NORTHVALE_URL` permite apontar para outra porta. No Windows, variáveis podem ser definidas com `$env:NORTHVALE_CHROMIUM_PATH='caminho'` no PowerShell.

O bake gera 44 mapas PNG e `assets/materials/manifest.json`: cinco rostos × quatro canais e seis superfícies × quatro canais. Os assets gerados são originais deste projeto, sem imagens externas. O manifest é carregado na execução HTTP. Quando uma imagem falha, o erro é registrado no laboratório gráfico e o material recebe fallback procedural. A distribuição `dist/NorthVale.html` inclui os geradores e shaders, sem requisitar o manifest ou imagens externas.

### Substituir um rosto por material artístico

Edite a entrada correspondente no manifest. Preserve `kind`, `profile` e as quatro referências. Exemplo:

```json
{
  "id": "face:alex",
  "kind": "face",
  "size": 512,
  "profile": {"skin":[177,138,109],"hair":"#352f29","eyes":"#697c7e","age":38,"seed":501,"brow":5,"jaw":0.86},
  "maps": {
    "base": "/assets/materials/faces/alex-base.png",
    "normal": "/assets/materials/faces/alex-normal.png",
    "specular": "/assets/materials/faces/alex-specular.png",
    "ao": "/assets/materials/faces/alex-ao.png"
  }
}
```

Use PNG/WebP com dimensões quadradas iguais, UV frontal de sprite, alfa reto na base, base color em sRGB e mapas de dados lineares. Normais tangent-space RGB no padrão OpenGL (+Y para cima); converta o canal verde ao importar mapas DirectX. Specular e AO usam o canal R. Não embuta sombras direcionais na base. O shader lineariza apenas o albedo, calcula Lambert e brilho Blinn–Phong com roughness e aplica AO à iluminação ambiente. Não é um shader completo de pele PBR/subsurface scattering.

Materiais externos podem ser produzidos em resolução maior, mas o runtime limita os rostos a 512² e as superfícies a 256² no decode. O gerador aceita perfis individuais e cada entidade usa seu próprio ID; Alex e os quatro moradores não compartilham a mesma textura facial. Na cidade, o mapping é de sprite frontal com pequena deformação pela direção. Dentro dos novos cômodos, Alex usa o spritesheet pintado em oito direções. Não há cabeça 3D ou UV de malha esquelética. Close-ups cinematográficos exigirão arte e animação dedicadas.

## Densidade e interação

A versão 0.4 usa 15 manifestos JSON exclusivos em `assets/interiors/`, cobrindo 42 cômodos e 27 portas. Há 260 objetos autorais, incluindo pistas, gavetas, interruptores e móveis, além de 2.746 microdetalhes. Os arranjos genéricos anteriores foram retirados do runtime. Veja [arquitetura de interiores, exemplos e persistência](INTERIORS.md).

A densidade decorativa não modifica colisões ou remove pistas. Móveis e portas fechadas compõem a matriz de navegação; detalhes de mesa/chão permanecem sem colisores. O picking respeita profundidade e objetos elevados têm prioridade sobre o móvel de apoio. Clicar solicita uma aproximação por A*; a ação só ocorre no alcance permitido. E continua disponível.

Portas compartilham estado entre seus dois lados, verificam chave e permitem fechar/trancar por C/L. O fade troca o cômodo no ponto médio e enquadra sua própria geometria. Gavetas, buscas, interruptores, visitas e trancas são gravados por ID global via SaveSystem, com checkpoints automáticos. A recepção pintada permanece conectada às outras salas da delegacia.

## Iluminação e limites técnicos

O material GPU aceita até quatro point lights em coordenadas locais normalizadas, com posição XYZ, cor RGB e raio. Posições são comparadas à superfície no shader e a atenuação é quadrática. Os interiores usam três luzes posicionais no espaço do mundo para variar luminosidade dos móveis e projetar pools suaves de cor no piso.

AO dos materiais usa mapa dedicado. A oclusão de contato entre móveis e piso é uma aproximação 2.5D por volumes e sombras radiais, não SSAO/GTAO ou GI. O render atual não calcula sombras dinâmicas de cada point light, múltiplas reflexões ou iluminação por pixel em todas as faces da geometria Canvas. Normais e specular são processados por pixel nos passes de material. Os tiles de superfície são pré-iluminados/reutilizados; a iluminação espacial dos interiores é aproximada na composição.

## Orçamentos e ciclo de vida

- Mapas decodificados: alvo LRU de 48 MiB; entradas em uso ficam protegidas, portanto o gerenciador genérico pode reportar sobre-orçamento com muitos pins. O runtime restringe resolução e trabalha com seis superfícies e os cinco IDs faciais existentes para limitar esse conjunto.
- Duas cargas simultâneas. Personagens visíveis/inspecionados têm prioridade sobre superfícies de fundo. Pedidos pendentes sem usuário são cancelados; falhas não deixam entradas bloqueadas.
- Liberação de `ImageBitmap.close()` e `gl.deleteTexture()` ao descartar material. A GPU usa mipmaps e samplers clamp/linear.
- GPU: orçamento separado implícito pelo conjunto residente e pelo máximo de 12 materiais de contorno. Mipmaps custam aproximadamente 4/3 do tamanho dos mapas. Os 48 MiB não incluem memória GPU, framebuffer, snapshots e buffers internos do navegador.
- Cache de sprites: limite de 8 MiB, LRU. Rostos/superfícies iluminados são snapshots reutilizados; alterações de material ou modo de renderização invalidam as chaves.
- Pixel ratio limitado a 2; no modo leve, 1. Context loss usa fallback Canvas e tenta reconstruir programas/texturas na restauração.

O laboratório mostra memória estimada de mapas e contadores de GPU. Não houve certificação de FPS em hardware Windows ou teste de estresse com milhares de personagens. Os rostos incluídos são procedurais e estilizados, não fotografias ou assets fotorrealistas de alta fidelidade. O pipeline permite substituí-los por arte final licenciada sem reescrever o renderer.

## Verificações executáveis

```sh
npm test
npm run check
npm run test:browser
npm run test:graphics
npm run test:police
npm run test:interiors
```

Os testes de lógica cobrem limites de memória/cancelamento, estabilidade dos interiores, caminhos até todos os objetos, alcance e picking, luzes, colisões, rotinas e persistência/migração. O smoke gráfico exige WebGL2 e verifica compilação/link, cinco rostos, quatro canais, fallback, mudança real de pixels pela luz e expansão da máscara pelo contorno. O smoke da delegacia verifica os quatro layers, o A*, os pontos interativos, a troca de retratos e erros de página. O smoke funcional cobre também exploração, prova, direção e salvamento. Capturas ficam em `test-results/`.
