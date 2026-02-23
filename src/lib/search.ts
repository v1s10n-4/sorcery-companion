/**
 * Client-side search engine for Sorcery cards.
 *
 * Syntax:
 *   fire dragon              — AND (name, rules, subtypes, keywords)
 *   fire OR dragon           — OR
 *   "fire dragon"            — exact phrase
 *   -avatar                  — exclude
 *   type:minion  t:minion    — multi-select: t:minion,magic
 *   element:fire  e:fire     — multi-select: e:fire,water
 *   rarity:elite  r:elite    — multi-select: r:elite,unique
 *   set:alpha  s:alpha       — multi-select
 *   cost:3  c:>3  c:<=5      — numeric comparison
 *   attack:>4  atk:>4        — numeric comparison
 *   defence:>3  def:>3       — numeric comparison
 *   life:>10  l:>10
 *   keyword:airborne  kw:fly — multi-select: kw:airborne,lethal
 *   subtype:dragon  st:beast — multi-select: st:dragon,demon
 *   tf:>=2  tw:1  ta:>=1     — threshold filters
 */

import type { BrowserCard } from "./types";

// ── Token types ──

export interface TextToken {
  kind: "text";
  value: string;
  negated: boolean;
}

export interface PhraseToken {
  kind: "phrase";
  value: string;
  negated: boolean;
}

export type NumOp = "eq" | "gt" | "gte" | "lt" | "lte";

export interface FieldToken {
  kind: "field";
  field: string;
  value: string;
  numOp?: NumOp;
  numVal?: number;
  negated: boolean;
}

export interface OrToken {
  kind: "or";
}

export type Token = TextToken | PhraseToken | FieldToken | OrToken;

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
  tf: "threshold_fire",
  tw: "threshold_water",
  te: "threshold_earth",
  ta: "threshold_air",
  threshold_fire: "threshold_fire",
  threshold_water: "threshold_water",
  threshold_earth: "threshold_earth",
  threshold_air: "threshold_air",
};

// Short aliases for serialization
const PREFERRED_ALIAS: Record<string, string> = {
  type: "t",
  element: "e",
  rarity: "r",
  set: "s",
  cost: "c",
  attack: "atk",
  defence: "def",
  life: "l",
  keyword: "kw",
  subtype: "st",
  threshold_fire: "tf",
  threshold_water: "tw",
  threshold_earth: "te",
  threshold_air: "ta",
};

const NUMERIC_FIELDS = new Set([
  "cost",
  "attack",
  "defence",
  "life",
  "threshold_fire",
  "threshold_water",
  "threshold_earth",
  "threshold_air",
]);

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

    let negated = false;
    if (q[i] === "-" && i + 1 < q.length && q[i + 1] !== " ") {
      negated = true;
      i++;
    }

    if (q[i] === '"') {
      const end = q.indexOf('"', i + 1);
      if (end !== -1) {
        const val = q.slice(i + 1, end);
        if (val) tokens.push({ kind: "phrase", value: val, negated });
        i = end + 1;
        continue;
      }
    }

    let word = "";
    while (i < q.length && q[i] !== " ") {
      word += q[i];
      i++;
    }

    if (!word) continue;

    if (word.toUpperCase() === "OR" && !negated) {
      tokens.push({ kind: "or" });
      continue;
    }

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

        // For numeric fields, try parsing the first value (or single value)
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

    tokens.push({ kind: "text", value: word, negated });
  }

  return tokens;
}

// ── Serializer ──

export function serializeTokens(tokens: Token[]): string {
  return tokens
    .map((t) => {
      switch (t.kind) {
        case "or":
          return "OR";
        case "text":
          return t.negated ? `-${t.value}` : t.value;
        case "phrase":
          return t.negated ? `-"${t.value}"` : `"${t.value}"`;
        case "field": {
          const alias = PREFERRED_ALIAS[t.field] || t.field;
          return `${t.negated ? "-" : ""}${alias}:${t.value}`;
        }
      }
    })
    .join(" ");
}

// ── Matching ──

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

function numCompare(
  cardVal: number | null | undefined,
  op: NumOp,
  target: number
): boolean {
  if (cardVal == null) return false;
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

function fieldMatchesSingle(card: BrowserCard, field: string, v: string, token: FieldToken): boolean {
  switch (field) {
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
    case "keyword":
      return (card.keywords ?? []).some((k) => k.toLowerCase().includes(v));
    case "subtype":
      return (card.subTypes ?? []).some((s) => s.toLowerCase().includes(v));
    // Numeric fields — use numOp/numVal from token
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
    case "threshold_fire":
      return token.numOp != null && token.numVal != null
        ? numCompare(card.thresholdFire, token.numOp, token.numVal)
        : false;
    case "threshold_water":
      return token.numOp != null && token.numVal != null
        ? numCompare(card.thresholdWater, token.numOp, token.numVal)
        : false;
    case "threshold_earth":
      return token.numOp != null && token.numVal != null
        ? numCompare(card.thresholdEarth, token.numOp, token.numVal)
        : false;
    case "threshold_air":
      return token.numOp != null && token.numVal != null
        ? numCompare(card.thresholdAir, token.numOp, token.numVal)
        : false;
    default:
      return false;
  }
}

function fieldMatches(card: BrowserCard, token: FieldToken): boolean {
  // Multi-select: comma-separated values are OR'd
  if (!NUMERIC_FIELDS.has(token.field) && token.value.includes(",")) {
    const values = token.value.split(",").map((v) => v.trim().toLowerCase());
    return values.some((v) => fieldMatchesSingle(card, token.field, v, token));
  }
  return fieldMatchesSingle(card, token.field, token.value.toLowerCase(), token);
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

export function matchesTokens(card: BrowserCard, tokens: Token[]): boolean {
  if (tokens.length === 0) return true;

  const groups: Exclude<Token, OrToken>[][] = [[]];
  for (const t of tokens) {
    if (t.kind === "or") {
      if (groups[groups.length - 1].length > 0) groups.push([]);
    } else {
      groups[groups.length - 1].push(t);
    }
  }

  const validGroups = groups.filter((g) => g.length > 0);
  if (validGroups.length === 0) return true;

  return validGroups.some((group) =>
    group.every((token) => tokenMatches(card, token))
  );
}

// ── Active filter extraction ──

export interface NumericRange {
  min?: number;
  max?: number;
  exact?: number;
}

export interface ActiveFilters {
  elements: string[];
  types: string[];
  rarities: string[];
  sets: string[];
  subtypes: string[];
  keywords: string[];
  cost: NumericRange | null;
  attack: NumericRange | null;
  defence: NumericRange | null;
  thresholdFire: number | null;
  thresholdWater: number | null;
  thresholdEarth: number | null;
  thresholdAir: number | null;
}

function mergeNumRange(
  existing: NumericRange | null,
  op: NumOp,
  val: number
): NumericRange {
  const r = existing ?? {};
  switch (op) {
    case "eq":
      return { exact: val };
    case "gte":
      return { ...r, min: val };
    case "gt":
      return { ...r, min: val + 1 };
    case "lte":
      return { ...r, max: val };
    case "lt":
      return { ...r, max: val - 1 };
  }
}

export function extractFilters(tokens: Token[]): ActiveFilters {
  const f: ActiveFilters = {
    elements: [],
    types: [],
    rarities: [],
    sets: [],
    subtypes: [],
    keywords: [],
    cost: null,
    attack: null,
    defence: null,
    thresholdFire: null,
    thresholdWater: null,
    thresholdEarth: null,
    thresholdAir: null,
  };

  for (const t of tokens) {
    if (t.kind !== "field" || t.negated) continue;
    const vals = t.value.split(",").map((v) => v.trim().toLowerCase());

    switch (t.field) {
      case "element":
        f.elements.push(...vals);
        break;
      case "type":
        f.types.push(...vals);
        break;
      case "rarity":
        f.rarities.push(...vals);
        break;
      case "set":
        f.sets.push(...vals);
        break;
      case "subtype":
        f.subtypes.push(...vals);
        break;
      case "keyword":
        f.keywords.push(...vals);
        break;
      case "cost":
        if (t.numOp != null && t.numVal != null)
          f.cost = mergeNumRange(f.cost, t.numOp, t.numVal);
        break;
      case "attack":
        if (t.numOp != null && t.numVal != null)
          f.attack = mergeNumRange(f.attack, t.numOp, t.numVal);
        break;
      case "defence":
        if (t.numOp != null && t.numVal != null)
          f.defence = mergeNumRange(f.defence, t.numOp, t.numVal);
        break;
      case "threshold_fire":
        if (t.numVal != null) f.thresholdFire = t.numVal;
        break;
      case "threshold_water":
        if (t.numVal != null) f.thresholdWater = t.numVal;
        break;
      case "threshold_earth":
        if (t.numVal != null) f.thresholdEarth = t.numVal;
        break;
      case "threshold_air":
        if (t.numVal != null) f.thresholdAir = t.numVal;
        break;
    }
  }

  return f;
}

// ── Query manipulation ──

/** Toggle a value in a multi-select field (add or remove) */
export function toggleFieldValue(
  query: string,
  field: string,
  value: string
): string {
  const tokens = tokenize(query);
  const lv = value.toLowerCase();

  // Find existing non-negated field token
  const idx = tokens.findIndex(
    (t) => t.kind === "field" && t.field === field && !t.negated
  );

  if (idx !== -1) {
    const token = tokens[idx] as FieldToken;
    const values = token.value.split(",").map((v) => v.trim());
    const vi = values.findIndex((v) => v.toLowerCase() === lv);

    if (vi !== -1) {
      values.splice(vi, 1);
      if (values.length === 0) {
        tokens.splice(idx, 1);
      } else {
        token.value = values.join(",");
      }
    } else {
      values.push(lv);
      token.value = values.join(",");
    }
  } else {
    tokens.push({
      kind: "field",
      field,
      value: lv,
      negated: false,
    });
  }

  return serializeTokens(tokens);
}

/** Set a numeric range filter. Pass undefined to clear min/max. */
export function setFieldRange(
  query: string,
  field: string,
  min?: number,
  max?: number
): string {
  // Remove all non-negated tokens for this field
  const tokens = tokenize(query).filter(
    (t) => !(t.kind === "field" && t.field === field && !t.negated)
  );

  if (min != null) {
    tokens.push({
      kind: "field",
      field,
      value: `>=${min}`,
      numOp: "gte",
      numVal: min,
      negated: false,
    });
  }
  if (max != null) {
    tokens.push({
      kind: "field",
      field,
      value: `<=${max}`,
      numOp: "lte",
      numVal: max,
      negated: false,
    });
  }

  return serializeTokens(tokens);
}

/** Set a single numeric exact/gte value for a field. null to clear. */
export function setFieldNumeric(
  query: string,
  field: string,
  op: NumOp,
  value: number | null
): string {
  const tokens = tokenize(query).filter(
    (t) => !(t.kind === "field" && t.field === field && !t.negated)
  );

  if (value != null) {
    const prefix =
      op === "gte" ? ">=" : op === "lte" ? "<=" : op === "gt" ? ">" : op === "lt" ? "<" : "";
    tokens.push({
      kind: "field",
      field,
      value: `${prefix}${value}`,
      numOp: op,
      numVal: value,
      negated: false,
    });
  }

  return serializeTokens(tokens);
}

/** Remove all tokens for a field */
export function clearField(query: string, field: string): string {
  const tokens = tokenize(query).filter(
    (t) => !(t.kind === "field" && t.field === field)
  );
  return serializeTokens(tokens);
}

/** Remove all field tokens (keep text/phrases) */
export function clearAllFields(query: string): string {
  const tokens = tokenize(query).filter((t) => t.kind !== "field");
  return serializeTokens(tokens);
}

/** Compute faceted counts excluding tokens for a specific field */
export function countWithout(
  cards: BrowserCard[],
  tokens: Token[],
  excludeField: string
): BrowserCard[] {
  const remaining = tokens.filter(
    (t) => !(t.kind === "field" && t.field === excludeField && !t.negated)
  );
  if (remaining.length === 0) return cards;
  return cards.filter((c) => matchesTokens(c, remaining));
}

// ── Search syntax help ──

export const SEARCH_HELP = [
  { syntax: "fire dragon", desc: "Cards matching fire AND dragon" },
  { syntax: "fire OR dragon", desc: "Cards matching fire OR dragon" },
  { syntax: '"fire dragon"', desc: "Exact phrase match" },
  { syntax: "-avatar", desc: "Exclude cards matching avatar" },
  { syntax: "t:minion,magic", desc: "Type is Minion OR Magic" },
  { syntax: "e:fire,water", desc: "Element includes Fire OR Water" },
  { syntax: "r:elite,unique", desc: "Rarity is Elite OR Unique" },
  { syntax: "s:alpha", desc: "Filter by set" },
  { syntax: "c:3  c:>3  c:<=5", desc: "Filter by mana cost" },
  { syntax: "atk:>4  def:>3", desc: "Filter by attack/defence" },
  { syntax: "kw:airborne,lethal", desc: "Filter by keyword" },
  { syntax: "st:dragon,beast", desc: "Filter by subtype" },
  { syntax: "tf:>=2  tw:>=1", desc: "Threshold (fire/water/earth/air)" },
];
