# NorthVale — recursos visuais

`interiors/` contém os 15 manifestos exclusivos do jogo: plantas, cômodos, portas, luzes, objetos, chaves e textos. Eles são carregados por `InteriorManifestLoader` e incorporados ao HTML offline pelo build. Não fazem parte do bake de texturas. Veja `docs/INTERIORS.md` para o schema e as classes.

Os PNGs em `materials/` foram gerados por `scripts/bake-assets.mjs` a partir do código procedural original deste projeto. Podem ser regenerados com `npm run assets:bake` enquanto o servidor estiver em execução. Não há imagens de bancos de terceiros ou retratos recuperados.

Os arquivos em `scenes/delegacia/`, `characters/` e `portraits/` formam o conjunto de arte original da delegacia 2.5D:

- `background_delegacia.png`: pintura base, 1536×1024.
- `fore_mascara_delegacia.png`: luminárias, ventilador e placa em transparência, 1536×1024.
- `alex_hale_walk.png`: grade 8×6, células de 192×192; colunas S, SO, O, NO, N, NE, E, SE.
- `npc_sargento_idle.png`: grade 8×4 com as mesmas direções.
- `townspeople_walk.png`: grade 8×6, células 181×181; linhas 0–1 Helen, 2–3 Elias, 4–5 Owen, com dois passos por direção. Usado nas ruas, com a mesma ordem de direções de Alex.
- `town-officials_walk.png`: grade 8×8, duas linhas por personagem: Viktor, Clara, Bobby e Sam.
- `portraits/*.png`: retratos de diálogo em 256×256.

Esses PNGs foram gerados para este projeto e revisados no contexto da cena. Preserve dimensões, grade e transparência ao substituí-los. O build converte os nove arquivos em data URLs dentro de `dist/NorthVale.html`.

`materials/manifest.json` é o ponto de entrada para substituir mapas por assets artísticos. A geração é destrutiva apenas para os caminhos de saída conhecidos desse bake: guarde arte final em uma pasta diferente e atualize suas URLs no manifest depois de gerar. Veja `docs/GRAPHICS.md` para convenções de UV, color space, normal maps e orçamentos.
