/**
 * Client-side search engine for Sorcery cards.
 *
 * Syntax:
 *   fire dragon          — AND: both must match (name, rules, subtypes, keywords)
 *   fire OR dragon       — OR: either matches
 *   "fire dragon"        — exact phrase
 *   -avatar              — exclude
 *   type:minion  t:minion
 *   element:fire  e:fire
 *   rarity:elite  r:elite
 *   set:alpha  s:alpha
 *   cost:3  c:>3  c:>=3  c:<5  c:<=5
 *   attack:>4  atk:>4
 *   defence:>3  def:>3
 *   life:>10  l:>10
 *   keyword:airborne  kw:airborne
 *   subtype:dragon  st:dragon
 */

import type { BrowserCard } from "./types";

// ── Token types ──

interface TextToken {
  kind: "text";
  value: string;
  negated: boolean;
}

interface PhraseToken {
  kind: "phrase";
  value: string;
  negated: boolean;
}

type NumOp = "eq" | "gt" | "gte" | "lt" | "lte";

interface FieldToken {
  kind: "field";
  field: string;
  value: string;
  numOp?: NumOp;
  numVal?: number;
  negated: boolean;
}

interface OrToken {
  kind: "or";
}

type Token = TextToken | PhraseToken | FieldToken | OrToken;

// ── Field aliases ──

const FIELD_ALIAS: Record<string, string> = {
  t: "type",
  type: "type",
  e: "element",
  el: "element",
  element: "element",
  r: "rarity",
  rarity: "rarity",
  s: "set",
  set: "set",
  c: "cost",
  cost: "cost",
  mana: "cost",
  a: "attack",
  atk: "attack",
  attack: "attack",
  pow: "attack",
  power: "attack",
  d: "defence",
  def: "defence",
  defence: "defence",
  defense: "defence",
  l: "life",
  life: "life",
  hp: "life",
  kw: "keyword",
  keyword: "keyword",
  k: "keyword",
  st: "subtype",
  subtype: "subtype",
  sub: "subtype",
  tribe: "subtype",
};

const NUMERIC_FIELDS = new Set(["cost", "attack", "defence", "life"]);

// ── Tokenizer ──

function parseNumeric(raw: string): { op: NumOp; val: number } | null {
  let op: NumOp = "eq";
  let s = raw;

  if (s.startsWith(">=")) {
    op = "gte";
    s = s.slice(2);
  } else if (s.startsWith("<=")) {
    op = "lte";
    s = s.slice(2);
  } else if (s.startsWith(">")) {
    op = "gt";
    s = s.slice(1);
  } else if (s.startsWith("<")) {
    op = "lt";
    s = s.slice(1);
  }

  const val = parseInt(s, 10);
  return isNaN(val) ? null : { op, val };
}

export function tokenize(query: string): Token[] {
  const tokens: Token[] = [];
  const q = query.trim();
  let i = 0;

  while (i < q.length) {
    if (q[i] === " ") {
      i++;
      continue;
    }

    // Negation prefix
    let negated = false;
    if (q[i] === "-" && i + 1 < q.length && q[i + 1] !== " ") {
      negated = true;
      i++;
    }

    // Quoted phrase
    if (q[i] === '"') {
      const end = q.indexOf('"', i + 1);
      if (end !== -1) {
        const val = q.slice(i + 1, end);
        if (val) tokens.push({ kind: "phrase", value: val, negated });
        i = end + 1;
        continue;
      }
    }

    // Read word
    let word = "";
    while (i < q.length && q[i] !== " ") {
      word += q[i];
      i++;
    }

    if (!word) continue;

    // OR keyword
    if (word.toUpperCase() === "OR" && !negated) {
      tokens.push({ kind: "or" });
      continue;
    }

    // Field prefix
    const colon = word.indexOf(":");
    if (colon > 0) {
      const rawField = word.slice(0, colon).toLowerCase();
      const field = FIELD_ALIAS[rawField];
      const rawValue = word.slice(colon + 1);

      if (field && rawValue) {
        const token: FieldToken = {
          kind: "field",
          field,
          value: rawValue,
          negated,
        };

        if (NUMERIC_FIELDS.has(field)) {
          const num = parseNumeric(rawValue);
          if (num) {
            token.numOp = num.op;
            token.numVal = num.val;
          }
        }

        tokens.push(token);
        continue;
      }
    }

    // Plain text
    tokens.push({ kind: "text", value: word, negated });
  }

  return tokens;
}

// ── Matching ──

/** Build a searchable text blob for a card (cached via WeakMap) */
const searchTextCache = new WeakMap<BrowserCard, string>();

function getSearchText(card: BrowserCard): string {
  const cached = searchTextCache.get(card);
  if (cached) return cached;

  const parts = [
    card.name,
    card.rulesText ?? "",
    card.type,
    ...(card.subTypes ?? []),
    ...(card.keywords ?? []),
  ];
  const text = parts.join(" ").toLowerCase();
  searchTextCache.set(card, text);
  return text;
}

function textMatches(card: BrowserCard, value: string): boolean {
  return getSearchText(card).includes(value.toLowerCase());
}

function phraseMatches(card: BrowserCard, phrase: string): boolean {
  return getSearchText(card).includes(phrase.toLowerCase());
}

function numCompare(cardVal: number | null, op: NumOp, target: number): boolean {
  if (cardVal === null || cardVal === undefined) return false;
  switch (op) {
    case "eq":
      return cardVal === target;
    case "gt":
      return cardVal > target;
    case "gte":
      return cardVal >= target;
    case "lt":
      return cardVal < target;
    case "lte":
      return cardVal <= target;
  }
}

function fieldMatches(card: BrowserCard, token: FieldToken): boolean {
  const v = token.value.toLowerCase();

  switch (token.field) {
    case "type":
      return card.type.toLowerCase() === v;
    case "element":
      return card.elements.some((e) => e.toLowerCase() === v);
    case "rarity":
      return (card.rarity ?? "").toLowerCase() === v;
    case "set":
      return card.setSlugs.some(
        (s) => s.toLowerCase() === v || s.toLowerCase().includes(v)
      );
    case "cost":
      return token.numOp != null && token.numVal != null
        ? numCompare(card.cost, token.numOp, token.numVal)
        : false;
    case "attack":
      return token.numOp != null && token.numVal != null
        ? numCompare(card.attack, token.numOp, token.numVal)
        : false;
    case "defence":
      return token.numOp != null && token.numVal != null
        ? numCompare(card.defence, token.numOp, token.numVal)
        : false;
    case "life":
      return token.numOp != null && token.numVal != null
        ? numCompare(card.life, token.numOp, token.numVal)
        : false;
    case "keyword":
      return (card.keywords ?? []).some((k) =>
        k.toLowerCase().includes(v)
      );
    case "subtype":
      return (card.subTypes ?? []).some((s) =>
        s.toLowerCase().includes(v)
      );
    default:
      return false;
  }
}

function tokenMatches(card: BrowserCard, token: Token): boolean {
  if (token.kind === "or") return true;

  let matches: boolean;

  switch (token.kind) {
    case "text":
      matches = textMatches(card, token.value);
      return token.negated ? !matches : matches;
    case "phrase":
      matches = phraseMatches(card, token.value);
      return token.negated ? !matches : matches;
    case "field":
      matches = fieldMatches(card, token);
      return token.negated ? !matches : matches;
  }
}

/**
 * Match a card against parsed tokens.
 * Tokens are AND-ed by default. OR splits into groups.
 * At least one group must fully match.
 */
export function matchesTokens(card: BrowserCard, tokens: Token[]): boolean {
  if (tokens.length === 0) return true;

  // Split into OR-groups
  const groups: Exclude<Token, OrToken>[][] = [[]];
  for (const t of tokens) {
    if (t.kind === "or") {
      if (groups[groups.length - 1].length > 0) {
        groups.push([]);
      }
    } else {
      groups[groups.length - 1].push(t);
    }
  }

  // Filter out empty groups
  const validGroups = groups.filter((g) => g.length > 0);
  if (validGroups.length === 0) return true;

  // At least one group must fully match
  return validGroups.some((group) =>
    group.every((token) => tokenMatches(card, token))
  );
}

// ── Public search function ──

export function searchCards(
  cards: BrowserCard[],
  query: string
): BrowserCard[] {
  const tokens = tokenize(query);
  if (tokens.length === 0) return cards;
  return cards.filter((c) => matchesTokens(c, tokens));
}

// ── Search syntax help ──

export const SEARCH_HELP = [
  { syntax: "fire dragon", desc: "Cards matching fire AND dragon" },
  { syntax: "fire OR dragon", desc: "Cards matching fire OR dragon" },
  { syntax: '"fire dragon"', desc: "Exact phrase match" },
  { syntax: "-avatar", desc: "Exclude cards matching avatar" },
  { syntax: "type:minion  t:minion", desc: "Filter by card type" },
  { syntax: "element:fire  e:fire", desc: "Filter by element" },
  { syntax: "rarity:elite  r:elite", desc: "Filter by rarity" },
  { syntax: "set:alpha  s:alpha", desc: "Filter by set" },
  { syntax: "cost:3  c:>3  c:<=5", desc: "Filter by mana cost" },
  { syntax: "atk:>4  def:>3", desc: "Filter by attack/defence" },
  { syntax: "keyword:airborne  kw:fly", desc: "Filter by keyword" },
  { syntax: "subtype:dragon  st:beast", desc: "Filter by subtype" },
];
