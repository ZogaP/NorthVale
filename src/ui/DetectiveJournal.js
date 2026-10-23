import { DocumentViewer } from "../visuals/DocumentViewer.js";
import { getFullCluesRegistry } from "../state.js";

/** Paged data adapter for Gemini's document view; owns no input listeners or loop. */
export class DetectiveJournal {
  constructor(view = new DocumentViewer()) {
    this.view = view;
    this.pages = [];
    this.page = 0;
    this.onClose = null;
  }
  open(state, { npcs = [], onClose = () => {} } = {}) {
    const registry = getFullCluesRegistry(state);
    this.onClose = onClose;
    this.page = 0;
    this.pages = [
      {
        title: "Caderno de Alex Hale",
        text: `Use as setas para mudar de página.\nDia ${state.day}. Provas: ${state.PROOF_WEIGHT}/10. Paranoia: ${state.PARANOIA}.\nItens: ${state.inventory.join(", ")}.\nEncontre a carta no quarto de Sarah. A chave fica no armário da cozinha.`,
      },
      ...state.evidence.map((id) => ({
        title: registry[id]?.title ?? id,
        text: `${registry[id]?.text ?? ""}\nIntegridade: ${state.evidenceIntegrity[id] === false ? "comprometida" : "preservada"}.`,
      })),
      ...Object.values(state.quests ?? {}).map((quest) => ({
        title: quest.title ?? quest.id,
        text: `Estado: ${quest.status}. Etapa: ${quest.currentStage}.`,
      })),
      ...npcs.map((npc) => ({
        title: npc.name,
        text: npc.schedule
          .map(
            (slot) =>
              `${String(Math.floor(slot.start / 60)).padStart(2, "0")}:${String(slot.start % 60).padStart(2, "0")} — ${slot.locationId}: ${slot.activity ?? ""}`,
          )
          .join("\n"),
      })),
    ];
    this.showPage();
  }
  showPage() {
    const page = this.pages[this.page];
    this.view.open(
      {
        front: {
          title: `${page.title} · ${this.page + 1}/${this.pages.length}`,
          text: page.text,
        },
        back: { notes: "← / →: páginas. Tab / Escape: guardar o caderno." },
      },
      () => this.onClose?.(),
    );
  }
  close() {
    this.view.close();
  }
  update(dt) {
    this.view.update(dt);
  }
  render(ctx, width, height) {
    this.view.render(ctx, width, height);
  }
  handleKey(key) {
    if (["ArrowRight", "ArrowLeft"].includes(key)) {
      this.page =
        (this.page + (key === "ArrowRight" ? 1 : -1) + this.pages.length) %
        this.pages.length;
      this.showPage();
      return true;
    }
    return this.view.handleKeyDown(key);
  }
  handleClick(x, y, width, height) {
    return this.view.handleClick({ clientX: x, clientY: y }, width, height);
  }
}
