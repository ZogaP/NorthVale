import { residents, residentPosition, routine } from "../simulation.js";
import { ENDING_DESCRIPTIONS } from "../systems/EndingManager.js";
/** UI adapter. Engine/state machines remain usable without DOM or Canvas. */
export class CampaignPanel {
  constructor({
    getCampaign,
    show,
    close,
    save,
    toast,
    input,
    onEnding,
    interrogate,
  }) {
    Object.assign(this, {
      getCampaign,
      show,
      close,
      save,
      toast,
      input,
      onEnding,
      interrogate,
    });
  }
  render(html) {
    this.show(html);
    document.querySelector("#panel").classList.add("canonical-panel");
  }
  open(message = "") {
    const campaign = this.getCampaign(),
      s = campaign.state;
    if (s.ending) {
      this.ending(s.ending);
      return;
    }
    const present = residents.filter((n) =>
      s.interior
        ? residentPosition(n, s.minute).inside &&
          routine(n, s.minute).place === s.interior
        : !residentPosition(n, s.minute).inside &&
          Math.hypot(
            residentPosition(n, s.minute).x - s.player.x,
            residentPosition(n, s.minute).y - s.player.y,
          ) < 80,
    );
    const actions = {
      depot: [["train", "Despachar provas pelo trem"]],
      dam: [
        ["rescue", "Abrir a câmara e resgatar Sarah"],
        ["execute", "Executar Bobby no vertedouro"],
        ["ambush", "Confrontar a vigilância na comporta"],
        ["unsafe", "Invadir sem equipamento"],
        [
          "unprotected_crossing",
          "Atravessar sem proteger os documentos da chuva",
        ],
      ],
      police: [
        ["press", "Avisar a imprensa · aumenta vigilância"],
        ["bribe", "Aceitar o suborno"],
        ["deal", "Assinar acordo de sigilo com Ruth"],
        ["barricade", "Barricar a delegacia para proteger Sarah"],
      ],
      diner: [
        ["publish", "Expor o caso publicamente"],
        ["arm_helen", "Entregar uma arma a Helen"],
      ],
      pharmacy: [
        ["custody", "Manter Bobby sob custódia"],
        ["destabilize", "Pressionar Bobby até o colapso"],
      ],
      registry: [
        ["blame_clara", "Responsabilizar Clara publicamente"],
        ["panic", "Deixar o pânico de Bobby sem contenção"],
      ],
      gasstation: [["flee_money", "Fugir com a mala de US$ 75.000"]],
      motel: [
        ["abandon", "Abandonar NorthVale"],
        ["psychiatric", "Submeter o dossiê sem provas ao exame da chefia"],
      ],
    };
    this.render(
      `<small>CAMPANHA / NORTHVALE</small><h2>Missões e decisões</h2><p>Paranoia ${s.PARANOIA} · Vigilância ${s.SCRUTINY} · Reputação ${s.REPUTATION} · Provas intactas ${s.PROOF_WEIGHT}/10</p><p>Sarah: ${s.SARAH_OUTCOME_KNOWN ? (s.SARAH_STATUS === 1 ? "resgatada viva" : s.SARAH_STATUS === 0 ? "morta por hipotermia" : "silenciada") : "desaparecida"} · Estabilidade de Bobby: ${s.BOBBY_STABILITY}</p><p id="campaign-message" role="status">${message}</p><h3>Missões</h3>${Object.values(
        s.quests,
      )
        .map(
          (q) =>
            `<div class="entry"><strong>${q.title}</strong><p>${q.currentStage}/${q.maxStages} · ${{ ACTIVE: "Em andamento", LOCKED: "Indisponível", COMPLETED: "Concluída", FAILED: "Falhou" }[q.status]}</p></div>`,
        )
        .join(
          "",
        )}<h3>Pessoas neste local</h3>${present.map((n) => `<div class="entry"><strong>${n.name}</strong><button data-favor="${n.id}">Conversar sobre o favor</button><button data-interrogate="${n.id}">Confrontar com provas</button></div>`).join("") || "<p>Consulte as rotinas no caderno para encontrar os moradores.</p>"}<h3>Decisões no local</h3><p>Os desfechos são definitivos nesta partida. Cada decisão exige condições, provas ou equipamento; se elas não forem satisfeitas, o caso continua.</p>${(actions[s.interior] || []).map(([id, label]) => `<button data-campaign-action="${id}">${label}</button>`).join("") || "<p>Entre em um dos locais da investigação para tomar decisões.</p>"}<button id="campaign-controls">Configurar controles</button>`,
    );
    document.querySelectorAll("[data-favor]").forEach(
      (b) =>
        (b.onclick = () => {
          const ok = campaign.favor(b.dataset.favor);
          this.save();
          this.open(
            ok
              ? "Favor concluído. Recompensa e progresso registrados."
              : "Primeiro encontre a evidência solicitada e avance a investigação.",
          );
        }),
    );
    document.querySelectorAll("[data-interrogate]").forEach(
      (b) =>
        (b.onclick = () => {
          this.close();
          this.interrogate(
            residents.find((n) => n.id === b.dataset.interrogate),
          );
        }),
    );
    document.querySelectorAll("[data-campaign-action]").forEach(
      (b) =>
        (b.onclick = () => {
          const result = campaign.act(b.dataset.campaignAction),
            ending = result.ending || campaign.endings.evaluateEnding();
          if (ending) {
            campaign.endings.lockEnding(ending.endingId);
            this.save();
            this.onEnding(s.ending);
          } else {
            this.save();
            this.open(result.message);
          }
        }),
    );
    document.querySelector("#campaign-controls").onclick = () =>
      this.controls();
  }
  ending(result) {
    this.render(
      `<small>NORTHVALE / FINAL ${String(result.endingId).padStart(2, "0")} DE 14</small><h2>${result.title}</h2><p>${ENDING_DESCRIPTIONS[result.endingId - 1]}</p><p>As decisões desta investigação conduziram a este desfecho. O mundo foi encerrado e o relatório permanece salvo para consulta.</p><p>Paranoia: ${this.getCampaign().state.PARANOIA} · Vigilância: ${this.getCampaign().state.SCRUTINY} · Provas: ${this.getCampaign().state.PROOF_WEIGHT}/10.</p><button id="new-canonical-game">Começar outra investigação</button>`,
    );
    document.querySelector("#new-canonical-game").onclick = () =>
      location.reload();
  }
  controls(message = "") {
    this.render(
      `<small>ENTRADAS / REMAPEAMENTO</small><h2>Controles</h2><p>Selecione um campo e pressione a tecla desejada, ou escolha um botão do mouse. Um vínculo duplicado é removido da outra ação. Escape permanece reservado.</p><p role="status">${message}</p>${Object.entries(
        this.input.bindings,
      )
        .map(
          ([action, b]) =>
            `<div class="entry"><strong>${action}</strong>${["primary", "secondary"].map((slot) => `<label>${slot} <input data-bind-action="${action}" data-slot="${slot}" readonly value="${b[slot] || "Sem vínculo"}" ${action === "PAUSE_MENU" ? "disabled" : ""}><select data-mouse-action="${action}" data-slot="${slot}" ${action === "PAUSE_MENU" ? "disabled" : ""}><option value="">Mouse…</option><option>Mouse0</option><option>Mouse1</option><option>Mouse2</option></select></label>`).join("")}</div>`,
        )
        .join("")}`,
    );
    document.querySelectorAll("[data-bind-action]").forEach(
      (el) =>
        (el.onkeydown = (e) => {
          e.preventDefault();
          e.stopPropagation();
          if (e.code === "Escape") {
            this.close();
            return;
          }
          try {
            this.input.rebind(el.dataset.bindAction, el.dataset.slot, e.code);
            this.controls("Vínculo salvo.");
          } catch (error) {
            this.controls(error.message);
          }
        }),
    );
    document.querySelectorAll("[data-mouse-action]").forEach(
      (el) =>
        (el.onchange = () => {
          if (!el.value) return;
          try {
            this.input.rebind(
              el.dataset.mouseAction,
              el.dataset.slot,
              el.value,
            );
            this.controls("Vínculo salvo.");
          } catch (error) {
            this.controls(error.message);
          }
        }),
    );
  }
}
