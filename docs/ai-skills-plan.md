# AI Skills Layer — Planning Document

> Status: **Draft / Planning**
> Last updated: May 2026
> Related pages: Daily Review, Daily page (Agenda section)

---

## Vision

Add a lightweight AI layer to the GTD Manager that can generate, summarise, and suggest — without locking the app to any specific AI provider. The system is built around reusable **skills**: discrete, self-contained units of AI-assisted work that know what data to gather, what to ask, and how to write the result back into the app.

The goal is not to make the app "AI-powered." The goal is to eliminate the low-value cognitive work that happens at the edges of a GTD workflow — specifically the daily planning and weekly review process — so that energy goes into doing, not organising.

---

## Core Design Principles

1. **Brand agnostic** — no skill should know or care which AI is running it. Swap providers in settings without touching skill logic.
2. **Context-aware** — skills pull live data from Supabase. The AI always sees your actual state, not a static template.
3. **Human in the loop** — AI output is always presented as a draft for review before anything is written to the database. No silent writes.
4. **Additive, not disruptive** — the existing app works identically without the AI layer. Skills are an optional enhancement.
5. **Plain English prompts** — prompt logic lives in skill files, not in UI components. Prompts should be readable, editable, and portable.

---

## The Brand-Agnostic Strategy

### Why it works

Virtually every major AI provider either natively uses or exposes a compatibility endpoint for the OpenAI chat completions message format:

```json
[
  { "role": "system",  "content": "Instructions for the AI..." },
  { "role": "user",    "content": "Here is the data and request..." }
]
```

This means the core HTTP call is the same regardless of provider. The only things that change are the base URL, the auth header, and the model name.

### Provider reference table

| Provider       | Base URL                                                        | Auth header              | Notes                                    |
| -------------- | --------------------------------------------------------------- | ------------------------ | ---------------------------------------- |
| OpenAI         | `https://api.openai.com/v1`                                     | `Authorization: Bearer`  | Native format                            |
| Anthropic      | `https://api.anthropic.com/v1`                                  | `x-api-key`              | Slightly different shape — needs adapter |
| Google Gemini  | `https://generativelanguage.googleapis.com/v1beta/openai`       | `Authorization: Bearer`  | OpenAI-compatible endpoint               |
| Groq           | `https://api.groq.com/openai/v1`                                | `Authorization: Bearer`  | Fast inference, OpenAI-compatible        |
| Mistral        | `https://api.mistral.ai/v1`                                     | `Authorization: Bearer`  | OpenAI-compatible                        |
| Together AI    | `https://api.together.xyz/v1`                                   | `Authorization: Bearer`  | OpenAI-compatible, many open models      |
| Ollama (local) | `http://localhost:11434/v1`                                      | None required            | Run models locally, fully offline        |
| Custom         | User-defined                                                    | User-defined             | Any OpenAI-compatible endpoint           |

### Anthropic note

Anthropic's API is the one outlier — it uses `x-api-key` for auth and a slightly different request body structure. A small adapter (~15 lines) normalises it so skill code never has to branch on provider. All other providers listed above are direct drop-in swaps.

---

## What a Skill Is

A skill is a self-contained module with four parts:

```
┌─────────────────────────────────────────────────────────┐
│  SKILL                                                  │
│                                                         │
│  1. Context Builder   — what data to pull from the app  │
│  2. System Prompt     — standing instructions for the AI│
│  3. User Prompt       — the specific request + data     │
│  4. Response Parser   — how to use the AI's output      │
└─────────────────────────────────────────────────────────┘
```

Skills do not know which AI they are talking to. They receive a `callAI(messages)` function from the client layer and use it as a black box.

---

## File Structure

```
src/lib/ai/
  config.js                  # Read/write AI provider settings
  client.js                  # The brand-agnostic HTTP adapter
  adapters/
    openai.js                # Default — handles most providers
    anthropic.js             # Anthropic-specific normalisation
  skills/
    generateAgenda.js        # Draft tomorrow's agenda (first skill to build)
    weeklyReview.js          # Draft weekly review content        [future]
    projectBrief.js          # Summarise a project + suggest actions [future]
    stalePeopleNudge.js      # Draft outreach for stale contacts  [future]

src/hooks/
  useAI.js                   # React hook — exposes runSkill(), loading, error

src/pages/
  Settings.jsx               # New page: provider, key, model, test connection

src/components/ai/
  SkillOutput.jsx            # Reusable draft preview + accept/edit/discard UI
```

---

## The Client Layer (`client.js`)

This is the only file that makes HTTP calls. Everything above it is pure logic.

```js
// Pseudocode — actual implementation will expand this

export async function callAI(messages) {
  const { provider, apiKey, model, baseUrl } = getConfig()

  // Anthropic needs a different adapter
  if (provider === 'anthropic') {
    return anthropicAdapter(messages, { apiKey, model })
  }

  // All other providers: standard OpenAI format
  const res = await fetch(`${baseUrl}/chat/completions`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${apiKey}`,
    },
    body: JSON.stringify({ model, messages, temperature: 0.4 }),
  })

  const json = await res.json()
  return json.choices[0].message.content
}
```

`temperature: 0.4` is a reasonable default for planning tasks — creative enough to be useful, consistent enough to be reliable. Skills can override this.

---

## Config Layer (`config.js`)

User settings are stored in **Supabase `auth.users.raw_user_meta_data`** — they stay with the user, never in source code, and survive browser clears.

Fields stored:
```json
{
  "ai_provider": "openai",
  "ai_model":    "gpt-4o",
  "ai_base_url": "https://api.openai.com/v1",
  "ai_api_key":  "sk-..."
}
```

> **Security note:** API keys stored in Supabase user metadata are readable by the authenticated user but not exposed in the source bundle. For higher security, move key storage to a Supabase Edge Function that proxies all AI calls. This can be added later without changing skill logic.

---

## Skill #1 — Generate Tomorrow's Agenda

This is the first skill to build, and the one with the clearest payoff. It runs inside the Daily Review page.

### What it pulls from Supabase

```
- Tasks:    status in (inbox, next_action, queued), due_date, priority, area
- Projects: status in (in_progress, planning), title, end_date
- Tasks:    due_date = tomorrow
- People:   tasks linked to person (waiting on someone)
- Habits:   today's completion record (context for tomorrow's intentions)
```

### System prompt (brand agnostic)

```
You are a GTD planning assistant helping to prepare a daily agenda.
Your job is to suggest a realistic, focused plan for tomorrow based on
the user's current tasks, projects, and priorities.

Rules:
- Return ONLY a valid JSON array. No explanation, no markdown, no preamble.
- Maximum 7 agenda items. Fewer is better.
- Group into morning / afternoon / evening where time is relevant.
- Prefer high-priority and due-soon tasks.
- If a task belongs to a project, note the project name in the notes field.
- Format: [{ "time": "09:00", "title": "...", "notes": "..." }]
- Use null for time if the item has no specific time.
```

### User prompt template (data injected at runtime)

```
Tomorrow is [DATE].

OPEN TASKS (next actions and inbox):
[list of task titles with priority and due date]

ACTIVE PROJECTS:
[list of project titles with status]

DUE TOMORROW:
[tasks with due_date = tomorrow]

WAITING ON:
[tasks linked to people, where task status = waiting]

TODAY'S HABITS COMPLETED:
[list of habit names that were checked today]

Please draft a suggested agenda for tomorrow.
```

### Response parser

The AI returns a JSON array. The parser:
1. Strips any accidental markdown fences (` ```json `)
2. `JSON.parse()`s the result
3. Validates each item has at least `title`
4. Returns the array for preview — **does not write to DB yet**

### Where it surfaces in the UI

In the **Daily Review page**, a new section at the top:

```
┌─────────────────────────────────────────────────┐
│  Draft Tomorrow's Agenda           [Generate]   │
│                                                 │
│  [Output appears here after generation]         │
│  — editable before saving                       │
│                                                 │
│  [Save to Tomorrow's Note]  [Discard]           │
└─────────────────────────────────────────────────┘
```

Clicking **Generate** calls the skill, shows a loading state, then renders the draft. User can edit inline before saving. Clicking **Save** calls `updateAgenda(tomorrowNoteId, items)` — the API function already exists.

### Data flow end to end

```
User clicks "Generate"
  → generateAgenda skill: context builder queries Supabase
  → skill builds system prompt + user prompt with live data
  → callAI(messages) sends to configured provider
  → provider returns agenda JSON string
  → response parser validates and returns array
  → SkillOutput component renders draft for review
User clicks "Save to Tomorrow's Note"
  → ensureTodayNote() for tomorrow's date (already exists)
  → updateAgenda(noteId, items) writes to daily_notes.agenda
  → success toast, section collapses
```

---

## Settings Page

A new `/settings` route, linked from the sidebar (gear icon at the bottom).

### Fields

| Field | Type | Description |
|---|---|---|
| Provider | Select | OpenAI / Anthropic / Gemini / Groq / Mistral / Ollama / Custom |
| Base URL | Text | Auto-filled when provider selected, editable for Custom |
| API Key | Password | Stored in Supabase user_metadata |
| Model | Text | e.g. `gpt-4o`, `claude-opus-4-5`, `gemma3:12b` |
| Test Connection | Button | Sends a minimal "reply with OK" message to verify config |

### Provider presets

When the user selects a provider from the dropdown, Base URL and a suggested model auto-fill. They can override both. This makes switching a 30-second operation.

---

## The `SkillOutput` Component

Reusable across all current and future skills. Handles:
- Loading state (spinner + "Thinking…" message)
- Error state (error message + retry button)
- Draft output (editable, formatted for the skill type)
- Accept / Discard actions
- Optional: "Regenerate" button

---

## Future Skills Roadmap

These are natural extensions once the client layer exists. Each is a new file in `skills/` — nothing else changes.

### Weekly Review Summariser
Pulls the week's completed tasks and projects. Drafts the narrative sections of the weekly review. Surfaces in the Weekly Review page.

### Project Brief Generator
Given a project, writes a description, identifies the current bottleneck, and suggests the two most valuable next actions. Surfaces on the Project detail page.

### Stale Contact Nudge
Scans people marked stale. For each, drafts a short outreach message based on their contact history and linked tasks. Surfaces on the People page.

### Daily Reflection Prompt
At end of day, surfaces three questions tailored to what was and wasn't done. Writes answers back to the daily note. Could trigger from the Daily Review.

### Inbox Processing
Given a list of inbox tasks, suggests status (next action vs. someday vs. delete), area, and project assignment for each. Surfaces as a batch-process mode on the Tasks page.

---

## Open Questions / Decisions Needed

These are things to resolve before or during implementation:

- [ ] **Where to store API keys** — Supabase user_metadata (simple) vs. Edge Function proxy (more secure). The proxy approach adds latency and complexity but means the key never touches the browser.
- [ ] **Should skills be server-side or client-side?** — Client-side (browser calls AI directly) is simpler but exposes the key in network traffic. Edge Function proxy keeps the key server-side entirely.
- [ ] **How to handle AI errors gracefully** — rate limits, invalid key, model unavailable. What does the UI show? Is there a fallback?
- [ ] **Token / cost awareness** — context builders could send a lot of data. Should there be a limit on how many tasks/projects are included? Add a truncation strategy.
- [ ] **Streaming responses** — for longer outputs (weekly review), streaming makes the UX feel faster. Worth adding to `client.js` from the start or retrofit later?
- [ ] **Prompt versioning** — as skills evolve, old prompts may produce different results. Worth keeping prompts in a separate file or even in the database so they can be tweaked without a deploy.
- [ ] **Offline / no-key graceful degradation** — if no AI is configured, the buttons should not appear or should show a "Set up AI in Settings" prompt rather than erroring.

---

## Build Order (when ready)

1. **`src/lib/ai/config.js`** — read/write settings to Supabase user_metadata
2. **`src/pages/Settings.jsx`** + sidebar link — UI to configure provider/key/model
3. **`src/lib/ai/client.js`** — the HTTP adapter with test-connection support
4. **`src/lib/ai/adapters/anthropic.js`** — Anthropic normalisation
5. **`src/components/ai/SkillOutput.jsx`** — reusable draft preview UI
6. **`src/lib/ai/skills/generateAgenda.js`** — first skill: context builder + prompts + parser
7. **`src/hooks/useAI.js`** — React hook wrapping skill execution
8. **Daily Review page** — "Draft Tomorrow's Agenda" section wired to the skill
9. **Test across at least two providers** before considering it done

---

## Notes / Scratch Space

> Use this section to capture thoughts, links, and decisions as the plan evolves.

- The agenda JSON shape (`{ time, title, notes }`) matches the existing `AgendaSection` component's expected format — no schema changes needed.
- `ensureTodayNote()` in `daily.js` already handles creating tomorrow's note if it doesn't exist.
- `updateAgenda()` in `daily.js` already exists and writes to `daily_notes.agenda`.
- The Daily Review page (`src/pages/Reviews.jsx`) will need a new section added — it currently has `content` and `suggestions` jsonb fields; the agenda generation is separate from those.
