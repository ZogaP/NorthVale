/**
 * NorthVale: Sombras de 1989
 * DialogueTreeRunner.js - Gerenciador de Árvores de Diálogo dos 32 Personagens
 */

import { NPCDialogueData } from "./NPCDialogueData.js";

export class DialogueTreeRunner {
  constructor(engine = null) {
    this.engine = engine || (typeof window !== 'undefined' ? window.GameEngine : null);
    this.currentNPC = null;
    this.currentNode = null;
    this.currentNodeId = null;
    this.onRender = null;
    this.onClose = null;
  }

  setEngine(engine) {
    this.engine = engine;
  }

  setRenderCallback(callback) {
    this.onRender = callback;
  }

  setCloseCallback(callback) {
    this.onClose = callback;
  }

  checkRequirements(option) {
    const journal = this.engine?.journal;
    const inventory = this.engine?.inventory;

    if (option.requiresClue) {
      const hasClue = journal?.hasClue
        ? journal.hasClue(option.requiresClue)
        : (journal?.clues?.includes?.(option.requiresClue) ?? false);
      if (!hasClue) return false;
    }

    if (option.requiresItem) {
      const hasItem = inventory?.hasItem
        ? inventory.hasItem(option.requiresItem)
        : (inventory?.items?.includes?.(option.requiresItem) ?? false);
      if (!hasItem) return false;
    }

    return true;
  }

  startDialogue(npcId) {
    const npc = NPCDialogueData[npcId];
    if (!npc) {
      console.error(`NPC ${npcId} não encontrado no banco NPCDialogueData.`);
      return false;
    }

    this.currentNPC = npc;
    this.currentNodeId = npc.initialNode;
    this.currentNode = npc.nodes[npc.initialNode];
    this.render();
    return true;
  }

  selectOption(optionIndex) {
    if (!this.currentNode || !this.currentNode.options) return;
    const option = this.currentNode.options[optionIndex];
    if (!option) return;

    // Se a opção possui requisitos e não foi atendida, impede o avanço
    if (!this.checkRequirements(option)) {
      if (this.engine?.notifications) {
        this.engine.notifications.show('Requisito não atendido para esta escolha.');
      }
      return;
    }

    // Processa consequências
    if (option.giveClue && this.engine?.journal) {
      this.engine.journal.addClue(option.giveClue);
    }
    if (option.giveItem && this.engine?.inventory) {
      this.engine.inventory.addItem(option.giveItem);
    }
    if (option.reputationImpact && this.engine?.stats) {
      this.engine.stats.apply(option.reputationImpact);
    }
    if (option.triggerEvent && this.engine?.events) {
      this.engine.events.emit(option.triggerEvent);
    }

    if (option.exit) {
      if (this.engine?.stateMachine) {
        this.engine.stateMachine.popState();
      }
      if (this.onClose) {
        this.onClose();
      }
    } else if (option.nextNode) {
      this.currentNodeId = option.nextNode;
      this.currentNode = this.currentNPC.nodes[option.nextNode];
      this.render();
    }
  }

  render() {
    if (this.onRender) {
      this.onRender({
        npc: this.currentNPC,
        node: this.currentNode,
        nodeId: this.currentNodeId,
        options: this.getEvaluatedOptions()
      });
    }
  }

  getEvaluatedOptions() {
    if (!this.currentNode || !this.currentNode.options) return [];
    return this.currentNode.options.map(opt => ({
      ...opt,
      isAvailable: this.checkRequirements(opt)
    }));
  }
}
