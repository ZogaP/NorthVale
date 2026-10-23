const named = Object.freeze({
  alex: "alex_hale",
  helen: "helen_miller",
  ruth: "ruth_mercer",
  elias: "elias_ward",
  owen: "owen_briggs",
  viktor: "viktor_sloane",
  clara: "clara_young",
  bobby: "bobby_miller",
  sam: "sam_mechanic",
});
const storySprites = Object.freeze({
  alex: ["alex", 0],
  ruth: ["ruth", 0],
  helen: ["citizens", 0],
  elias: ["citizens", 2],
  owen: ["citizens", 4],
  viktor: ["officials", 0],
  clara: ["officials", 2],
  bobby: ["officials", 4],
  sam: ["officials", 6],
});
const templates = [
  ["citizens", 0],
  ["citizens", 2],
  ["citizens", 4],
  ["officials", 0],
  ["officials", 2],
  ["officials", 4],
  ["officials", 6],
];

export function characterIdFor(npc) {
  return (
    npc.characterId ??
    named[npc.id] ??
    (npc.name ?? npc.id)
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "_")
      .replace(/^_|_$/g, "")
  );
}
export function characterAppearance(npc) {
  const characterId = characterIdFor(npc),
    hash = [...characterId].reduce(
      (sum, c) => (Math.imul(sum, 31) + c.charCodeAt(0)) >>> 0,
      0,
    );
  const [atlas, baseRow] =
    storySprites[npc.id] ?? templates[hash % templates.length];
  return {
    characterId,
    atlas,
    baseRow,
    hue: storySprites[npc.id] ? 0 : (hash % 100) - 50,
    saturation: storySprites[npc.id] ? 1 : 0.7 + (hash % 4) * 0.1,
    phaseOffset: (hash % 13) / 13,
  };
}
