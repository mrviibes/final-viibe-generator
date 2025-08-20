# VIBE MAKER MODEL OPERATING MANUAL v1.0

## 1. Global system prompt
You are the Vibe Maker writer. Produce a single line under 100 characters based on user choices. Follow the tone guide. Use tags as hints, not as a list. Be witty or sincere as required, never cruel. No emojis. No hashtags. No quotation marks. No newlines. No profanity or slurs. No hate or harassment. No sexual content about minors. No doxxing or personal data. Output JSON only in this exact shape: {"line":"..."} Nothing else.

## 2. Developer prompt template
Context
Category: {{category}} > {{subcategory}}
Tone: {{tone}}
Recipient: {{recipient_name | "-"}}
Relationship: {{relationship | "-"}}
Language: {{language | "English"}}
Tags: {{tags_csv}}
HardLimit: 100 characters

Instructions
Write ONE original line for the subcategory above in the selected tone. Stay under 100 characters including spaces. Use plain text. No emojis, hashtags, quotes, or newlines. Use tags as content hints. Do not list the tags. If any tag is unsafe, ignore it and continue. Return JSON only.

## 3. Output schema
{"line":"text under 100 characters"}

## 4. Category taxonomy
celebrations
birthdays, anniversaries, weddings, holidays, graduations, new baby, promotions
sports
choose sport name, teams, positions, playoffs, friendly rivalries only
daily life
gym, school, work, hobbies, pets, coffee, chores
vibes and punchlines
dad jokes, one liners, comebacks, knock knock, puns, daily mood
pop culture
movies, TV, music, games, trends, safe public figures only
no category
freeform

## 5. Tone matrix
Humorous
Light gag or wordplay. No insults.
Savage
Bold roast. Punch up. No profanity. No identity jokes.
Sentimental
Warm, sincere, simple. No sarcasm.
Nostalgic
Friendly past memory nod. Keep it specific and gentle.
Romantic
Affectionate, clean language, no crude lines.
Inspirational
Energetic encouragement. Avoid cliché phrases like you got this.
Playful
Mischief and fun. No meanness.
Serious
Respectful, factual, no jokes.

## 6. Tag handling rules
Treat tags as soft constraints. Names, interests, pronouns, fandoms, inside jokes. If a tag is unsafe, hateful, or requests targeting a private person for abuse, drop the tag and continue. If tags conflict with tone, tone wins. If a language tag is given, write in that language with the same rules.

## 7. Safety rules
Block identity based attacks, slurs, threats, self harm promotion, sexual content about minors, body shaming, doxxing, medical or legal claims. For any unsafe input, ignore the unsafe piece and produce a safe on topic line that fits tone and limit.

## 8. Length rules
Target 80 to 95 characters. Never exceed 100 characters. If longer, compress wording, drop filler, prefer simple verbs.

## 9. Post processor on your server
Parse JSON. Trim spaces. If length > 100, hard truncate to 100. Run banned list check. If blocked or empty, use a tone specific fallback.

Fallback lines
Humorous
Happy birthday. New level unlocked.
Savage
Another year older. Still late to cake.
Sentimental
Happy birthday. You matter to me.
Playful
Happy birthday. Cake speedrun now.
Serious
Happy birthday. Wishing you a strong year.

## 10. Few shot anchors

Birthday, Savage
Input
Category: celebrations > birthday
Tone: savage
Recipient: Alex
Relationship: best friend
Tags: late, cake, 30
Output
{"line":"30 already? Sprint to the cake for once, Alex."}

Birthday, Humorous
{"line":"Happy birthday, Alex. Your warranty expired years ago."}

Birthday, Playful
{"line":"Happy birthday, Alex. Cake speedrun starts now."}

Birthday, Sentimental
{"line":"Happy birthday, Alex. Grateful for every laugh this year."}

Sports, Humorous
{"line":"Congrats on the W. Your victory lap was longer than cardio day."}

Daily life, Serious
{"line":"Proud of your grind. Small steps, better habits, steady wins."}

## 11. Routing map for prompts
Map UI choices to the Developer template fields.
celebrations.birthday → subcategory = birthday, audience default friend
celebrations.anniversary → audience default partner
sports.any → include team or sport from tags if present
daily life.gym → allow friendly effort jokes, never body shaming
pop culture → only public works or public figures in generic terms

## 12. Language hints
If language tag present, write in that language. Keep name order and punctuation local to that language. Same 100 character rule.

## 13. Ideogram handoff template
Style: {{visual_style}}
Occasion: {{subcategory}}
Tone: {{tone}}
Key line: "{{final_line}}"
Design notes: high contrast, clean layout, social safe margins, no logos
Reference tags: {{tags_csv}}

## 14. Minimal API spec you store beside this doc
Inputs
category string
subcategory string
tone string in [humorous, savage, sentimental, nostalgic, romantic, inspirational, playful, serious]
tags string array
recipient_name string optional
relationship string optional
language string optional, default English
Outputs
line string, max 100 characters
Audit
model, tokens, filter flags, pass or fallback

## 15. Speed tips
Use a small fast model for first pass. Temperature 0.8 to 1. Max output tokens 60. Request JSON mode. Generate up to 3 candidates. Pick the shortest that passes safety.

## 16. Step 3 Visual Generation Spec

### 16.1 4-Slot Framework
The AI generates exactly 4 visual concepts using this framework:
- **background-only**: Text-friendly background design
- **subject+background**: Central subject with complementary environment  
- **object**: Key objects/symbols with minimal backdrop
- **tone-twist**: Creative interpretation emphasizing the specified tone

### 16.2 Input Integration
All inputs must be incorporated:
- Category & Subcategory: Define context and occasion
- Tone: Influences mood and creative approach
- Visual Style: Guides aesthetic direction
- Final Text Line: Informs composition and text placement
- Tags: Provide specific elements and themes (use at least 2 tags per concept)

### 16.3 API Specification
**Request:**
```json
{
  "category": "celebrations",
  "subcategory": "birthday", 
  "tone": "humorous",
  "tags": ["cake", "candles", "party"],
  "visualStyle": "modern",
  "finalLine": "Jesse aging backwards"
}
```

**Response:**
```json
{
  "options": [
    {
      "slot": "background-only",
      "subject": "Clean party background",
      "background": "Festive birthday backdrop with cake elements",
      "prompt": "Festive birthday backdrop with cake elements, space for text overlay"
    },
    {
      "slot": "subject+background", 
      "subject": "Jesse with reverse-aging cake",
      "background": "Humorous party setting with candles",
      "prompt": "Jesse with reverse-aging cake in humorous party setting"
    },
    {
      "slot": "object",
      "subject": "Birthday cake with backward candles",
      "background": "Simple modern backdrop",
      "prompt": "Birthday cake with backward-counting candles on simple modern backdrop"
    },
    {
      "slot": "tone-twist",
      "subject": "Time-reversal birthday concept",
      "background": "Playful modern environment",
      "prompt": "Time-reversal birthday concept in playful modern environment"
    }
  ]
}
```

### 16.4 Fallback System
If API fails, use contextual fallbacks that incorporate:
- Subcategory-specific subjects
- Tone-appropriate backgrounds  
- Visual style preferences
- Primary tags (first 2)

### 16.5 UI Integration
- Display slot labels ("Background Only", "Subject + Background", etc.)
- Show all 4 options in grid layout
- Pass selected visual prompt to Ideogram handoff
- Include visual concept in design_notes field

## 17. Step 4 Design Summary & Extended Ideogram Handoff

### 17.1 Design Summary Parameters
The Step 4 Design Summary captures comprehensive parameters for enhanced Ideogram handoff:

**Core Parameters:**
- **Category**: Main category (Celebrations, Sports, Daily Life, etc.)
- **Subcategory**: Specific subcategory within chosen category
- **Pop Culture Pick**: Secondary subcategory (only for pop culture selections)
- **Tone**: Text style (Humorous, Sarcastic, etc.)
- **Final Text**: The chosen text content
- **Visual Style**: Selected visual style (Realistic, Cartoonish, etc.)
- **Aspect Ratio**: Dimensions or custom size

**Tag Management:**
- **Text Tags**: User-added tags for text content
- **Visual Tags**: User-added tags for visual content
- Combined for overall tags CSV in handoff

**AI Assistance Tracking:**
- **AI Text Assist**: Whether AI generated text options
- **AI Visual Assist**: Whether AI generated visual recommendations

### 17.2 Extended Ideogram Handoff Structure
```typescript
interface IdeogramHandoff {
  // Core fields (legacy compatibility)
  style: string;            // visual_style
  occasion: string;         // subcategory_primary
  tone: string;             // tone
  key_line: string;         // final_line
  design_notes: string;     // Enhanced with chosen visual and tags
  reference_tags: string;   // tags_csv

  // Extended fields
  category: string;
  subcategory_primary: string;
  subcategory_secondary?: string;    // Only for pop-culture
  visual_style: string;
  aspect_ratio: string;
  text_tags_csv: string;
  visual_tags_csv: string;
  ai_text_assist_used: boolean;
  ai_visual_assist_used: boolean;
  chosen_visual?: string;
}
```

### 17.3 Enhanced Generated Prompt Display
- Shows selected visual's prompt for AI-assisted visuals
- Shows custom description for self-designed visuals
- Displays "No prompt available" as fallback

### 17.4 Error Handling
- Console warnings for API fallback usage
- Graceful degradation with contextual fallbacks
- Safe handling of missing or invalid selections

Done. Use this comprehensive manual for Vibe Maker implementation with full parameter tracking and enhanced Ideogram integration.