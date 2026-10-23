# NorthVale — Sombras de 1989

Jogo investigativo isométrico com orquestrador central e interface Gemini, com campanha canônica: Bobby Miller é o culpado e Ruth Mercer participa do acobertamento. Há cinco missões, controles remapeáveis e 14 finais determinísticos, além das 15 construções e 42 cômodos persistentes. Veja [núcleo, migração, regras e precedência dos finais](docs/ENGINE-SYSTEMS.md) e [manifestos dos interiores](docs/INTERIORS.md).

Os novos [módulos de regras e dados](docs/RULE-SYSTEMS.md) fornecem deduções, rotinas de 32 NPCs, diálogo ramificado, inventário de evidências e três slots manuais mais autosave. O guia descreve os contratos e os eventos que a interface deve encaminhar para essas APIs.

Os [subsistemas de IA e física](docs/AI-PHYSICS.md) acrescentam propagação acústica, A* com bloqueios dinâmicos, suavização, cones de visão e volumes de gatilho com modificadores ambientais. São APIs lógicas para integração pela camada de apresentação.

A [escala métrica e a locomoção](docs/METRIC-PHYSICS.md) usam um tile por metro, móveis normalizados e caminhada de NPCs entre 1,2 e 1,6 m/s por delta time real. As rotinas mantêm corpos persistentes e a rua renderiza apenas personagens ativos no setor visível, com identidade visual individual.

A [câmera de investigação](docs/CAMERA.md) acompanha Alex com amortecimento e antecipação de movimento. O scroll ajusta o zoom entre 1,2 e 2,6, com padrão 1,9 e enquadramento calibrado para o personagem ocupar cerca de 16,6% da altura da viewport. O zoom funciona em ruas e interiores, e a seleção de objetos internos acompanha a câmera; HUD e diálogos mantêm seu tamanho.

Veja [pipeline gráfico, shaders e assets](docs/GRAPHICS.md). Durante o jogo, use **Gráficos** para comparar os rostos, canais de material, iluminação, AO e densidade.

Na cidade, Alex e os moradores usam sprites pintados em oito direções. Helen, Elias e Owen têm artes próprias; os passos dos moradores usam dois quadros por direção. As 15 fachadas do jogo têm arquitetura por endereço: torre de relógio na delegacia, varanda de dois pisos no motel, cobertura industrial no depósito, garagem, posto e três casas com telhados diferentes. A arte das fachadas continua sendo desenhada proceduralmente em Canvas, com texturas; o editor de cenários é independente das plantas e fachadas do jogo.

O [Editor de Cenários NorthVale](NorthVale_AssetStudio.html) abre separadamente como um único HTML: coloque e arraste objetos de um catálogo com 77 tipos, edite propriedades, desfaça ações e salve projetos. Inclui fachadas com arquiteturas próprias, interiores e sprites, com exportação PNG/JSON. São 31 presets e 484 objetos iniciais. Veja [uso e formato dos assets](docs/ASSET-STUDIO.md).

A entrada principal usa o novo [GameEngine e bootstrap](docs/GAME-ENGINE.md), com os dez estados, caderno paginado, três slots e autosave. A interface anterior está disponível em `/legacy.html`. Os módulos visuais recebidos do Git foram integrados por um adaptador, mantendo a lógica separada do Canvas.

## Abrir sem servidor

Baixe o [NorthVale-JOGAR.zip](https://github.com/ZogaP/NorthVale/raw/refs/heads/main/dist/NorthVale-JOGAR.zip), extraia e abra `NorthVale.html` no navegador. A aba **Issues** do GitHub serve para relatar problemas; o jogo está no ZIP.

A versão autocontida está em `dist/NorthVale.html`. Copie ou baixe esse arquivo para seu computador e abra no Chrome, Edge ou Firefox em desktop. Ele inclui código, estilos, os 15 manifestos de interiores e os nove PNGs da delegacia e dos personagens, sem buscar módulos ou imagens externas. A persistência depende de o navegador permitir armazenamento local para arquivos.

Para recriar essa distribuição após editar o projeto:

```sh
node scripts/build-offline.mjs
```

A distribuição passou pelo smoke como um único HTML e não realizou requisições de assets. A abertura via `file://` não pôde ser automatizada nesta máquina, pois a política administrativa do Chromium bloqueia esse protocolo.

## Executar (Windows, Linux ou macOS)

Instale Node.js 20 ou superior. No terminal, entre na pasta `NorthVale` e execute:

```sh
npm start
```

Abra o navegador no endereço local da porta 5173 (HTTP). Não abra `index.html` diretamente pelo explorador de arquivos, pois o jogo usa módulos JavaScript. Nenhuma instalação de pacote é necessária para jogar ou executar os testes de lógica. `NORTHVALE_PORT` permite escolher outra porta. `index.html` usa módulos ES e deve ser servido por HTTP; para abrir por duplo clique, use `JOGAR_OFFLINE.html` ou `dist/NorthVale.html`. Os antigos bundles manuais não são mais carregados.

Comece a investigação e assista ao prólogo breve ou pule com Espaço. Entre na delegacia para conversar com Ruth e explorar as salas internas. Na casa dos Miller, encontre a chave na gaveta do armário da cozinha e siga pelo corredor até o quarto de Sarah. Clique em portas ou objetos para Alex se aproximar. Colete documentos e compare as pistas no caderno. O painel **Missões e decisões** acompanha os favores e permite executar decisões específicas em cada local, incluindo resgate nas turbinas e envio de provas pelo trem. Os desfechos têm epílogos textuais; a campanha não inclui novas cutscenes para cada final.

| Tecla | Ação |
|---|---|
| WASD / setas | Mover em relação à tela; dirigir usa W/S para acelerar/ré e A/D para esterçar |
| Shift | Correr |
| E | Conversar, entrar, sair e examinar |
| Clique | Aproximar-se de objetos e portas internas e interagir |
| C / L / T | Quadro de cortiça / isqueiro / relógio |
| O / K | Fechar / trancar ou destrancar uma porta interna próxima |
| X | Missões, favores e decisões do local |
| F | Entrar/sair da viatura quando próximo |
| Espaço | Frear a viatura / pular prólogo |
| J | Caderno, inventário, provas, ligações e espera de 1h |
| M | Mapa físico |
| Esc | Fechar painel / pular prólogo |

Na interface principal, selecione um dos três slots na barra superior para salvar/carregar. Tab abre o caderno, M o mapa, C a cortiça e Escape fecha o modal antes de pausar. O botão Fita K7 exige a fita recolhida. Os controles e botões de gráficos descritos acima continuam disponíveis na interface anterior. O relógio pausa durante painéis. Moradores se deslocam quando seus horários mudam; é possível encontrá-los durante o trajeto e observar sua chegada. As agendas no caderno estão expostas para facilitar validação desta fundação.

## Testes

```sh
npm test
npm run check
npm run test:engine
npm run test:canonical
```

Para o smoke de navegador (servidor precisa estar iniciado em outro terminal):

```sh
npm ci
npx playwright install chromium
npm run test:browser
```

Em máquina com Chromium já instalado, `NORTHVALE_CHROMIUM_PATH` pode indicar seu executável. `NORTHVALE_URL` altera o destino do smoke. Capturas são gravadas em `test-results/`, pasta ignorada pelo Git. O teste usa um contexto isolado do navegador e não altera os saves de seu perfil pessoal.

## Organização e colaboração

Sistemas em módulos ES em `src/`, testes de lógica em `tests/`, smoke em `scripts/`. Não há backend, credenciais, telemetria, serviços externos ou assets de terceiros no jogo. Use o checkout existente; tarefas de nuvem já têm ambiente isolado e não precisam de worktree. Alterações ficam locais para revisão; publicações são feitas quando solicitadas na tarefa.

Prioridades seguintes: ampliar a arte dos interiores, dirigir as cenas dos 14 desfechos e validar o alvo NW.js no desktop. A lista detalhada de recursos ausentes está na auditoria.
