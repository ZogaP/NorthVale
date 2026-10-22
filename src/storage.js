import {deserialize,serialize} from './state.js';
export const SAVE_KEY='northvale-save';
// Compatibility only: keep a user's previous local save after the title change.
const LEGACY_KEY='mercy-pines-save';
export function readSave(storage){const current=storage.getItem(SAVE_KEY);if(current)return deserialize(current);const previous=storage.getItem(LEGACY_KEY);if(!previous)throw Error('Nenhum salvamento encontrado');const state=deserialize(previous);storage.setItem(SAVE_KEY,serialize(state));return state;}
