// Endings & Psychometrics System for NorthVale — Sombras de 1989
// 7 Distinct Endings inspired by Disco Elysium and True Detective based on Obsession/Paranoia, Integrity and Evidence.

export const ENDINGS = {
  JUSTICA_INFLEXIVEL: {
    id: 'JUSTICA_INFLEXIVEL',
    number: 1,
    title: 'Final 1: A Justiça Inflexível',
    subtitle: 'The Clean Slate',
    headline: 'PROMOTORIA FEDERAL INTERVÉM EM NORTHVALE: DOSSÊ IRREFUTÁVEL',
    desc: 'Alex Hale se recusou a negociar com o poder local. Munido das provas cabais e gravações incontestáveis colhidas em NorthVale, Alex contornou a xerife Ruth e entregou os autos diretamente ao Departamento de Justiça e aos jornais estaduais. O verdadeiro culpado foi conduzido algemado sob os holofotes da chuva. Hale parte em sua viatura com a alma pesada pelo preço pago, mas com as mãos limpas.'
  },
  PACTO_DO_SILENCIO: {
    id: 'PACTO_DO_SILENCIO',
    number: 2,
    title: 'Final 2: O Pacto do Silêncio',
    subtitle: 'Town’s Shadow',
    headline: 'CASO MILLER ARQUIVADO COMO FUGA VOLUNTÁRIA; DELEGACIA AGRADECE HALE',
    desc: 'O cansaço e a realidade opressiva de 1989 venceram. Alex aceitou o envelope de dinheiro e a garantia de uma transferência prestigiosa para Portland. O relatório oficial assinado por Ruth e referendado por Hale declarou que Sarah Miller simplesmente partiu por vontade própria. Ao olhar pelo retrovisor enquanto deixa a cidade, Alex sabe que agora faz parte do maquinário que devorou NorthVale.'
  },
  ESPIRAL_DA_LOUCURA: {
    id: 'ESPIRAL_DA_LOUCURA',
    number: 3,
    title: 'Final 3: A Espiral da Loucura',
    subtitle: 'Descent into Paranoia',
    headline: 'DETETIVE TRANSFERIDO É ENCONTRADO EM SURTO PSICÓTICO NA REPRESA',
    desc: 'Dias sem dormir, cafeína barata e os sussurros constantes nas fitas magnéticas cobraram seu preço. Com o nível de Obsessão no ápice, Alex Hale começou a enxergar conexões cósmicas entre cada habitante, cada árvore e as águas do Oregon. Acusou a cidade inteira numa transmissão confusa de rádio policial antes de queimar suas anotações. Alex foi recolhido ao sanatório de Salem, onde passa as noites ouvindo o som de gotas d’água batendo no zinco.'
  },
  ACERTO_DE_CONTAS: {
    id: 'ACERTO_DE_CONTAS',
    number: 4,
    title: 'Final 4: O Acerto de Contas',
    subtitle: 'Vigilante Noir',
    headline: 'TIROTEIO NA CALADA DA NOITE: EX-DETETIVE EM FUGA PELAS FLORESTAS DO OREGON',
    desc: 'Sem confiança no sistema legal e sabendo que a corrupção absolveria o assassino, Alex Hale marcou um encontro solitário na tempestade. Sem mandado e sem testemunhas, Alex puxou o gatilho, fazendo a justiça dos homens à queima-roupa. NorthVale acordou com o assassino tombado na lama, e o detetive Alex Hale agora figura como o homem mais caçado do Noroeste Pacífico.'
  },
  ARQUIVO_MORTO: {
    id: 'ARQUIVO_MORTO',
    number: 5,
    title: 'Final 5: O Arquivo Morto',
    subtitle: 'Buried Truth',
    headline: 'INQUÉRITO DE NORTHVALE ENCERRA-SE POR INSUFICIÊNCIA DE PROVAS',
    desc: 'O tempo se esgotou e as pistas foram mal interpretadas. Alex Hale acusou a pessoa errada devido aos álibis falsos armados pelos envolvidos, ou simplesmente não reuniu provas materiais com valor jurídico. O verdadeiro assassino limpou seus rastros e deixou o condado. Helen Miller fecha a porta de casa e apaga as luzes, sabendo que as sombras levaram sua filha para sempre.'
  },
  MARTIR_DE_NORTHVALE: {
    id: 'MARTIR_DE_NORTHVALE',
    number: 6,
    title: 'Final 6: O Mártir de NorthVale',
    subtitle: 'Sacrifice',
    headline: 'TRAGÉDIA NA RODOVIA 9: DETETIVE MORRE EM EMBOSCADA ANTES DE DEPOR',
    desc: 'Alex foi corajoso demais e prudente de menos. Ele reuniu a verdade e tentou levá-la publicamente à praça central. Contudo, os conspiradores foram mais rápidos: uma emboscada na saída da rodovia jogou sua viatura no desfiladeiro da represa. Anos depois, a população ainda fala em sussurros sobre o detetive que quase libertou NorthVale de seus carrascos.'
  },
  SOMBRAS_SOB_A_CHUVA: {
    id: 'SOMBRAS_SOB_A_CHUVA',
    number: 7,
    title: 'Final 7: Sombras Sob a Chuva',
    subtitle: 'True Detective',
    headline: 'NORTHVALE LIBERTA DE DÉCADAS DE SILÊNCIO: A VERDADE COMPLETA DE SARAH',
    desc: 'A conclusão perfeita. Alex Hale decifrou as contradições do quadro de cortiça com maestria cirúrgica, neutralizou os subornos, quebrou as mentiras no interrogatório e recuperou a memória e dignidade de Sarah Miller. Helen finalmente recebe a verdade e um encerramento solene. As águas da represa continuam escuras, mas sob a chuva fria de outubro, a cidade de NorthVale finalmente respira pela primeira vez em décadas.'
  }
};

export class EndingsEvaluator {
  constructor(state) {
    this.state = state;
    this.state.obsession ??= 20; // 0 to 100
    this.state.integrity ??= 75; // 0 to 100
  }

  evaluateEnding(accusedId = null, playerChoice = 'legal') {
    const isCulpritCorrect = Boolean(accusedId && this.state.case && accusedId === this.state.case.culpritId);
    const evidenceCount = (this.state.evidence || []).length;
    const deductionsCount = (this.state.corkboardDeductions || []).length;
    const obsession = this.state.obsession || 0;
    const integrity = this.state.integrity || 50;

    // 1. Extreme Paranoia override
    if (obsession >= 85) {
      return ENDINGS.ESPIRAL_DA_LOUCURA;
    }

    // 2. Moral surrender (Bribe accepted or conspirator deal)
    if (playerChoice === 'bribe' || integrity <= 25) {
      return ENDINGS.PACTO_DO_SILENCIO;
    }

    // 3. Vigilante justice
    if (playerChoice === 'vigilante' && isCulpritCorrect) {
      return ENDINGS.ACERTO_DE_CONTAS;
    }

    // 4. Insufficient proof or wrong accusation
    if (!isCulpritCorrect || evidenceCount < 3) {
      return ENDINGS.ARQUIVO_MORTO;
    }

    // 5. High evidence, correct accusation
    if (isCulpritCorrect && deductionsCount >= 2) {
      if (playerChoice === 'expose_reckless') {
        return ENDINGS.MARTIR_DE_NORTHVALE;
      }
      if (integrity >= 70 && obsession < 60) {
        return ENDINGS.SOMBRAS_SOB_A_CHUVA;
      }
      return ENDINGS.JUSTICA_INFLEXIVEL;
    }

    return ENDINGS.ARQUIVO_MORTO;
  }

  renderEndingScreen(ending, onRestart) {
    const dialog = document.querySelector('#panel');
    const content = document.querySelector('#content');
    if (!dialog || !content) return;

    content.innerHTML = `
      <div class="ending-screen">
        <small class="ending-badge">EPÍLOGO INVESTIGATIVO · 1989</small>
        <h1 class="ending-headline">${ending.headline}</h1>
        <h2 class="ending-title">${ending.title} <em>(${ending.subtitle})</em></h2>
        <div class="ending-newspaper">
          <p class="ending-narrative">${ending.desc}</p>
        </div>
        <div class="ending-stats">
          <div><b>Obsessão de Alex:</b> ${this.state.obsession}%</div>
          <div><b>Integridade Moral:</b> ${this.state.integrity}%</div>
          <div><b>Evidências Reunidas:</b> ${this.state.evidence.length}</div>
          <div><b>Conquistas Desbloqueadas:</b> ${this.state.achievements?.length || 0}</div>
        </div>
        <div class="ending-actions">
          <button id="ending-btn-continue" class="ending-btn">Retornar a NorthVale</button>
        </div>
      </div>
    `;

    dialog.showModal();
    document.querySelector('#ending-btn-continue').onclick = () => {
      dialog.close();
    };
  }
}
