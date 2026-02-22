# Sorcery Companion — Revamp Plan

## Current State Audit

### What we have
- 1,104 cards, 3,076 variants, 6 sets synced
- Card grid with search, type/element/rarity filters, pagination
- Card detail page with printings
- Images on Cloudflare R2
- Deployed on Vercel

### What's wrong / missing

#### 🔴 Data Model Issues
1. **No proper Set entity** — `CardSet` is a junction table (card × set), not a standalone set. We have no `Set` model with its own name, release date, icon, card count, description.
2. **Elements stored as comma-separated string** — `"Earth, Fire, Air"` instead of a proper relation or enum. Makes filtering slow and ugly.
3. **SubTypes as a single string** — Same problem. `"Beast, Dragon"` should be separate values.
4. **No keywords model** — Rules text contains keywords (Spellcaster, Airborne, Genesis, etc.) but we don't parse or index them. Can't filter by keyword.
5. **CollectionCard links to Card, not CardVariant** — In Sorcery, collectors care about *which printing* they own (Alpha Standard vs Beta Foil). Should link to variant.

#### 🔴 UI/UX Issues
6. **No element icons** — Using emoji (🔥💧🌬️🌿). Need proper SVG icons matching the game's visual identity.
7. **No set branding** — No set icons, logos, or set browsing page. Users can't browse by set.
8. **No game-appropriate color palette** — Current dark theme is generic shadcn. Should feel like Sorcery (dark fantasy, parchment vibes, gold accents).
9. **Filter UX is flat** — All filters are badge-rows. Element filter should use icons. Set filter doesn't exist. Cost filter should be a range. No subtype/keyword filter.
10. **Card detail page is plain** — No variant image gallery, no set context, no related cards.
11. **No card comparison** — Can't view cards side by side.
12. **Search only by name** — Should also search rules text, artist, flavor text.

#### 🟡 Missing Features (before Phase 2)
13. **Set browsing page** — `/sets` list, `/sets/[slug]` with all cards in that set.
14. **Advanced search** — Filter by cost range, attack/defence range, keywords, artist, subtype.
15. **Sort options** — By name, cost, attack, defence, rarity, set release.
16. **Card count badges on filters** — Show how many cards match each filter option.
17. **URL-shareable state** — Already partially done (query params), but needs all filters.

---

## Revamp Plan

### Phase 1.5: Data & Design Foundation

#### A. Schema Improvements
```
New: Set model (id, name, slug, releasedAt, description, iconUrl, cardCount)
New: Element enum (Air, Earth, Fire, Water)  
New: Keyword model (id, name, description, reminderText)
Update: Card.elements → many-to-many with Element
Update: Card.subTypes → array or separate SubType model
Update: CollectionCard → link to CardVariant instead of Card
```

#### B. Element Icons (SVG)
Create custom SVG icons for each element matching Sorcery's aesthetic:
- 🌬️ Air — stylized wind/swirl
- 🌿 Earth — mountain/stone
- 🔥 Fire — flame
- 💧 Water — wave/droplet
Also need: generic mana/cost icon, attack sword, defence shield, life heart.

#### C. Design System / Theme
- Dark fantasy color palette (deep blacks, aged gold, parchment cream)
- Custom font pairing (serif for headers, clean sans for body)
- Card component redesign with proper stat layout matching the physical cards
- Set-specific accent colors

### Phase 1.6: UI Revamp

#### D. Home Page / Card Browser
- **Set tabs/selector** at the top (browse by set or all)
- **Element icon filters** (clickable icons, not text badges)
- **Cost curve filter** (0-10+ range selector)
- **Advanced filters panel** (expandable: subtype, keyword, artist, finish)
- **Sort dropdown** (name, cost, attack, rarity, set)
- **View toggle** — grid (images) vs list (compact table)
- **Card count per filter** option

#### E. Card Detail Page
- **Variant gallery** — browse all printings with images
- **Set badge** with icon and release date
- **Keyword tooltips** — hover/tap keywords in rules text to see reminder text
- **Related cards** — same subtype, same element, same artist
- **Rules text formatting** — parse and highlight keywords, costs, element symbols

#### F. Set Pages
- `/sets` — grid of all sets with icon, name, release date, card count
- `/sets/[slug]` — all cards in that set, with set-specific filters

#### G. Artist Pages (bonus)
- `/artists` and `/artists/[name]` — browse by artist, see all their cards

---

## Priority Order
1. **Schema migration** (Set model, element normalization) — foundation for everything
2. **Element SVG icons** — high visual impact, reused everywhere
3. **Design system** — colors, fonts, card component
4. **Set pages + set filter** — major missing concept
5. **Card detail revamp** — variant gallery, keywords
6. **Advanced filters** — cost range, subtype, keyword, artist
7. **Sort + view toggle**
8. **Artist pages** (nice to have)

Then → Phase 2 (Auth + Collections with variant-level tracking)
