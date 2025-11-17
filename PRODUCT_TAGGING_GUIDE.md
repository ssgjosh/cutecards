# Product Tagging Guide for Recommendations

This guide explains how to tag products in Shopify to power the intelligent recommendation rail in the modal.

## Overview

The recommendation system uses product tags to find similar cards. Tags follow a simple `category:value` format and help match cards by theme, occasion, recipient, and style.

---

## Tag Categories

### 1. Interest (What's on the card?)
**Format**: `interest:{topic}`

The main subject or theme of the artwork.

**Examples**:
- `interest:frogs`
- `interest:dogs`
- `interest:cats`
- `interest:unicorns`
- `interest:dinosaurs`
- `interest:flowers`
- `interest:beer`
- `interest:coffee`
- `interest:stars`
- `interest:rainbows`

**Guidelines**:
- Use the most prominent theme/character
- Keep it singular (`interest:frog` not `interest:frogs`) for consistency
- Multiple interests? Add multiple tags: `interest:dogs, interest:flowers`
- Be specific but not too niche (use `interest:dogs` not `interest:golden-retrievers`)

---

### 2. Occasion (When would you send this?)
**Format**: `occasion:{event}`

When or why someone would send this card.

**Examples**:
- `occasion:birthday`
- `occasion:thank-you`
- `occasion:anniversary`
- `occasion:graduation`
- `occasion:new-baby`
- `occasion:wedding`
- `occasion:congratulations`
- `occasion:sympathy`
- `occasion:get-well`
- `occasion:valentines`
- `occasion:christmas`
- `occasion:mothers-day`
- `occasion:fathers-day`
- `occasion:just-because`

**Guidelines**:
- Most cards fit multiple occasions – that's okay! Add 2-3 occasion tags
- Use consistent spelling: `mothers-day` not `mother's-day`
- Generic cards should use `occasion:just-because` or `occasion:any`

---

### 3. Recipient (Who's it for?)
**Format**: `recipient:{person}`

Who might receive this card.

**Examples**:
- `recipient:dad`
- `recipient:mum`
- `recipient:friend`
- `recipient:partner`
- `recipient:wife`
- `recipient:husband`
- `recipient:son`
- `recipient:daughter`
- `recipient:grandparent`
- `recipient:colleague`
- `recipient:teacher`
- `recipient:anyone`

**Guidelines**:
- Think about who'd most likely receive this
- Generic cards should include `recipient:anyone` or `recipient:friend`
- It's okay to have multiple recipient tags

---

### 4. Style (What's the vibe?)
**Format**: `style:{aesthetic}`

The visual style or mood of the card.

**Examples**:
- `style:cute`
- `style:minimal`
- `style:bold`
- `style:vintage`
- `style:modern`
- `style:whimsical`
- `style:elegant`
- `style:playful`
- `style:quirky`
- `style:watercolor`
- `style:illustrated`
- `style:photographic`

**Guidelines**:
- Choose 1-2 styles that best describe the design
- Think about the visual aesthetic, not the message
- Use consistent terms across similar designs

---

### 5. Humour (How funny is it?)
**Format**: `humour:{level}`

How funny or cheeky the card is. Use a simple 0-3 scale:

**Scale**:
- `humour:0` – Serious, heartfelt, no jokes
- `humour:1` – Light-hearted but not jokey (most "cute" cards)
- `humour:2` – Funny, punny, witty
- `humour:3` – Very funny, cheeky, potentially edgy

**Examples**:
- Sympathy card → `humour:0`
- "Happy Birthday!" with cute illustration → `humour:1`
- "You're not old, you're vintage!" → `humour:2`
- Rude/cheeky birthday card → `humour:3`

**Guidelines**:
- Be honest about the humour level
- When in doubt, lean conservative (it's easier to surprise with more humour than less)
- Most "cute" cards are `humour:1`

---

## Complete Examples

### Example 1: Funny Frog Birthday Card
```
interest:frogs
occasion:birthday
recipient:anyone
style:cute
style:illustrated
humour:2
```

### Example 2: Elegant Floral Thank You Card
```
interest:flowers
occasion:thank-you
recipient:anyone
style:elegant
style:watercolor
humour:0
```

### Example 3: Cheeky Beer Card for Dad
```
interest:beer
occasion:birthday
occasion:fathers-day
recipient:dad
style:bold
humour:2
```

### Example 4: Cute Dog "Thinking of You" Card
```
interest:dogs
occasion:just-because
occasion:sympathy
recipient:friend
recipient:anyone
style:cute
style:whimsical
humour:1
```

---

## How to Tag Products in Shopify

1. **In Shopify Admin**, go to **Products**
2. Click on a product to edit
3. Scroll to the **Tags** section (right sidebar under "Organization")
4. Add tags separated by commas:
   ```
   interest:frogs, occasion:birthday, recipient:anyone, style:cute, humour:2
   ```
5. Click **Save**

---

## Best Practices

### DO:
✅ Tag every product with at least:
   - 1 interest tag
   - 1-2 occasion tags
   - 1-2 recipient tags
   - 1-2 style tags
   - 1 humour tag

✅ Use consistent spelling and formatting
✅ Review similar products to keep tags consistent
✅ Add multiple tags when appropriate (e.g., a card can be for multiple occasions)
✅ Update tags if you notice recommendations aren't working well

### DON'T:
❌ Use spaces in tag values (`interest:cute dogs` → use `interest:dogs` + `style:cute`)
❌ Use capital letters (`Interest:Frogs` → use `interest:frogs`)
❌ Create one-off tags (`interest:golden-retriever-in-a-hat` → use `interest:dogs`)
❌ Skip categories (every card needs all 5 categories)
❌ Use punctuation (`occasion:mother's-day` → use `occasion:mothers-day`)

---

## Recommendation Algorithm

The system scores products based on tag overlap:

**Weights**:
- **Interest**: 3x (most important)
- **Occasion**: 2x
- **Recipient**: 2x
- **Style**: 1x
- **Humour**: 0.5x

**Example**:
If viewing a card tagged `interest:frogs, occasion:birthday, recipient:dad, style:cute, humour:2`, the system will prioritize:
1. Other frog cards (highest weight)
2. Birthday cards
3. Cards for dads
4. Cute-style cards
5. Similar humour level

The system also ensures diversity – it won't show 6 identical frog cards. It'll mix in related interests and occasions.

---

## Pivot Chips

When users click the pivot chips above the rail, they see different recommendations:

- **"More like this"** – Full matching (all tag categories)
- **"More frogs"** (or whatever interest) – Match interest only
- **"More birthday"** (or whatever occasion) – Match occasion only

This is why having accurate tags in all categories is important!

---

## Testing Your Tags

After tagging 30-50 products:

1. Open a card's modal
2. Scroll to the recommendation rail at the bottom
3. Check if the 6 recommended cards make sense
4. Try the pivot chips – do they change the recommendations appropriately?
5. If recommendations seem off, review the tags on those products

---

## Questions?

If you're unsure how to tag a product:
1. Look at similar products and their tags
2. Think about what customers would search for
3. Ask yourself: "If I liked this card, what else would I like?"
4. When in doubt, add more tags (multiple occasions, interests, etc.)

---

## Tag Quick Reference

| Category | Format | Example Values |
|----------|--------|----------------|
| **Interest** | `interest:{topic}` | frogs, dogs, cats, flowers, beer, coffee |
| **Occasion** | `occasion:{event}` | birthday, thank-you, anniversary, christmas |
| **Recipient** | `recipient:{person}` | dad, mum, friend, partner, anyone |
| **Style** | `style:{aesthetic}` | cute, minimal, bold, elegant, quirky |
| **Humour** | `humour:{0-3}` | 0 (serious), 1 (light), 2 (funny), 3 (very funny) |

---

**Version**: 1.0
**Last Updated**: November 2025
**System**: Client-Side Tag-Based Recommendations
