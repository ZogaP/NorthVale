# Auditoria de recuperação — NorthVale

Este relatório registra a inspeção e a fundação 0.1. A atualização gráfica 0.2 está descrita em [GRAPHICS.md](GRAPHICS.md) e substitui as observações abaixo sobre densidade, materiais, retratos e iluminação. A campanha e as demais limitações narrativas permanecem.

Inspeção realizada em 22/10/2026, antes de criar os arquivos desta versão.

- `/workspace/NorthVale` continha somente `.git`, sem arquivos de trabalho, arquivos rastreados ou ignorados, commits ou assets.
- A branch local `work` era não nascida. A consulta de leitura `git ls-remote --symref origin` terminou com sucesso, sem referências remotas. Não havia `main` disponível.
- Não foram encontrados código da prévia, retratos, sprites, mapas, modelos, áudio, manifestos, documentação ou instruções `AGENTS.md` no projeto.
- Não havia framework ou linguagem de aplicação identificável. Node 24, npm 11 e Python 3.12 estavam disponíveis na máquina.
- As versões 0.4–0.7 são referências do documento fornecido pelo usuário, não funcionalidades recuperadas. Não há evidência de arquivos executáveis dessas versões no ambiente acessível. Conversas e prévias anteriores não foram acessadas.
- O texto anexado foi lido como especificação. Nenhum recurso anterior foi sobrescrito. Os arquivos atuais são uma implementação nova.

## Escolha técnica

JavaScript modular com Canvas 2D isométrico. Não exige GPU dedicada, ferramentas nativas nem bibliotecas no runtime do jogo. Node serve os módulos e executa testes; o cliente funciona em navegador moderno no Windows. Playwright é dependência apenas de desenvolvimento. Renderização procedural é provisória, não arte comercial de alta fidelidade.

## Inventário da implementação nova

- `src/world.js`: geometria, vias, dez edifícios, portas, horários comerciais, colisão e objetos internos.
- `src/simulation.js`: quatro moradores, agendas de 24h, trajetos A* em grade com cache, posições calculadas por horário inclusive fora da tela e condução arcade.
- `src/render.js`: projeção isométrica, ordenação por profundidade, fachadas, pisos, telhados, chuva, luzes e personagens procedurais.
- `src/state.js`: estado versionado, cinco pistas, coleta idempotente, serialização e validação básica de salvamentos.
- `src/audio.js`: ruído sintetizado para chuva e tons de interação, sem assets externos.
- `src/main.js`: loop, entrada, aceleração a pé, colisões internas, câmera, prólogo simplificado, diálogos, mapa, caderno, ligações manuais e localStorage.
- `server.js`, `tests/`, `scripts/`: execução local, testes de lógica e smoke de navegador.

## Limitações explícitas

Esta entrega cobre uma fundação jogável da etapa 1 com primeiros sistemas das etapas seguintes. Não equivale à versão 0.7 nem ao jogo completo.

- Dez construções e dez salas acessíveis; salas compartilham planta e mobiliário. Não são 31 interiores personalizados e não há 211 objetos únicos.
- Personagens, materiais, mobiliário e veículos são formas procedurais simples. Não há retratos recuperados, texturas PBR, animações contextuais completas ou assets finais.
- Prólogo tem deslocamento de Alex, legendas, câmera de acompanhamento e opção de pular com entrega da chave. Ainda não é a cena cinematográfica completa solicitada: Helen/Ruth não têm atuação e enquadramentos dirigidos completos, nem vozes.
- Quatro rotinas funcionam por horário, com deslocamentos calculados e navegação. Não há tráfego de NPCs, relações sociais simuladas, reação à chuva, perseguição furtiva ou mudanças de agenda por paranoia.
- Viatura tem aceleração, ré, esterçamento proporcional à velocidade, freio, faróis visuais e colisão simplificada circular. Falta física de aderência dependente da chuva, motor sonoro, danos e manobras detalhadas.
- Investigação contém cinco pistas fixas, conversas e ligações manuais em lista. Não há gerador de assassino, quadro de cortiça arrastável, testes de atributos, finais ou campanha solucionável completa.
- Salvamento local manual de um único slot, sem sincronização e sem migração entre versões. Limpar armazenamento do navegador remove a partida. O estado de rádios é registrado, mas não há emissão sonora por aparelho.
- Culling simples de desenho e cache de caminhos; não há streaming por regiões nem medições de grande escala. Relógio varia rotinas e horários de portas; iluminação e clima ainda são constantes.
- Interface para teclado em desktop; acessibilidade de leitor de tela para a cena e controles touch ainda não implementados.

## Validação

Sete testes Node passam: ocupação urbana/portas, colisões, horários comerciais, rotinas fora da tela, trajetos ao longo de 24h, física básica do veículo e persistência.

Smoke Chromium passou com ausência de `pageerror`: pular prólogo entrega chave, movimento por teclado altera posição, porta abre interior, interação registra K7, caderno exibe prova, salvar/carregar preserva estado, viatura acelera, mapa abre e áudio ativa. O smoke injeta salvamentos válidos para posicionar Alex nas cenas; não comprova percurso integral da campanha. Capturas de tela foram inspecionadas. Não foi realizado teste nativo no Windows nem validação auditiva por pessoa.
