# NorthVale — Sombras de 1989

Jogo investigativo isométrico, versão 0.4, com 15 construções, 42 cômodos e portas internas funcionais. Os interiores carregam plantas JSON exclusivas, com objetos e luzes persistentes. A recepção pintada da delegacia se conecta ao gabinete, arquivo, interrogatório e celas. Veja [arquitetura e manifestos dos interiores](docs/INTERIORS.md).

Veja [pipeline gráfico, shaders e assets](docs/GRAPHICS.md). Durante o jogo, use **Gráficos** para comparar os rostos, canais de material, iluminação, AO e densidade.

Na cidade, Alex e os moradores usam sprites pintados em oito direções. Helen, Elias e Owen têm artes próprias; os passos dos moradores usam dois quadros por direção. As 15 fachadas do jogo têm arquitetura por endereço: torre de relógio na delegacia, varanda de dois pisos no motel, cobertura industrial no depósito, garagem, posto e três casas com telhados diferentes. A arte das fachadas continua sendo desenhada proceduralmente em Canvas, com texturas; o editor de cenários é independente das plantas e fachadas do jogo.

O [Editor de Cenários NorthVale](NorthVale_AssetStudio.html) abre separadamente como um único HTML: coloque e arraste objetos de um catálogo com 77 tipos, edite propriedades, desfaça ações e salve projetos. Inclui fachadas com arquiteturas próprias, interiores e sprites, com exportação PNG/JSON. São 31 presets e 484 objetos iniciais. Veja [uso e formato dos assets](docs/ASSET-STUDIO.md).

## Abrir sem servidor

Baixe o [NorthVale-JOGAR.zip](https://github.com/ZogaP/NorthVale/raw/refs/heads/main/dist/NorthVale-JOGAR.zip), extraia e abra `NorthVale.html` no navegador. A aba **Issues** do GitHub serve para relatar problemas; o jogo está no ZIP.

A versão autocontida está em `dist/NorthVale.html`. Copie ou baixe esse arquivo para seu computador e abra no Chrome, Edge ou Firefox em desktop. Ele inclui código, estilos, os 15 manifestos de interiores e os oito PNGs da delegacia e dos personagens, sem buscar módulos ou imagens externas. A persistência depende de o navegador permitir armazenamento local para arquivos.

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

Abra o navegador no endereço local da porta 5173 (HTTP). Não abra `index.html` diretamente pelo explorador de arquivos, pois o jogo usa módulos JavaScript. Nenhuma instalação de pacote é necessária para jogar ou executar os testes de lógica. `NORTHVALE_PORT` permite escolher outra porta.

Comece a investigação e assista ao prólogo breve ou pule com Espaço. Entre na delegacia para conversar com Ruth e explorar as salas internas. Na casa dos Miller, encontre a chave na gaveta do armário da cozinha e siga pelo corredor até o quarto de Sarah. Clique em portas ou objetos para Alex se aproximar. Colete documentos e compare as pistas no caderno. Esta versão não tem desfecho da campanha.

| Tecla | Ação |
|---|---|
| WASD / setas | Mover em relação à tela; dirigir usa W/S para acelerar/ré e A/D para esterçar |
| Shift | Correr |
| E | Conversar, entrar, sair e examinar |
| Clique | Aproximar-se de objetos e portas internas e interagir |
| C / L | Fechar / trancar ou destrancar uma porta interna próxima |
| F | Entrar/sair da viatura quando próximo |
| Espaço | Frear a viatura / pular prólogo |
| J | Caderno, inventário, provas, ligações e espera de 1h |
| M | Mapa físico |
| Esc | Fechar painel / pular prólogo |

Botões inferiores salvam/carregam um slot no armazenamento do navegador e ativam áudio sintetizado. O relógio pausa durante painéis. Moradores se deslocam quando seus horários mudam; é possível encontrá-los durante o trajeto e observar sua chegada. As agendas no caderno estão expostas para facilitar validação desta fundação.

## Testes

```sh
npm test
npm run check
npm run test:police
```

Para o smoke de navegador (servidor precisa estar iniciado em outro terminal):

```sh
npm ci
npx playwright install chromium
npm run test:browser
```

Em máquina com Chromium já instalado, `NORTHVALE_CHROMIUM_PATH` pode indicar seu executável. `NORTHVALE_URL` altera o destino do smoke. Capturas são gravadas em `test-results/`, pasta ignorada pelo Git. O teste usa um contexto isolado do navegador e não altera os saves de seu perfil pessoal.

## Organização e colaboração

Sistemas em módulos ES em `src/`, testes de lógica em `tests/`, smoke em `scripts/`. Não há backend, credenciais, telemetria, serviços externos ou assets de terceiros no jogo. Use o checkout existente; tarefas de nuvem já têm ambiente isolado e não precisam de worktree. Alterações ficam locais para revisão; nenhum commit ou envio remoto é feito automaticamente.

Prioridades seguintes: aplicar o mesmo tratamento pintado aos demais interiores, ampliar as animações narrativas, dirigir o prólogo e concluir o mistério. A lista detalhada de recursos ausentes está na auditoria.
