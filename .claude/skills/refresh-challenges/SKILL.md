---
name: refresh-challenges
description: Refill the Focus Flow code-challenge bank with new basic Python refresher questions. Use when the Daily page's Challenge section says the bank is empty, when the user says they've run out of challenges, or asks to refresh/refill/top up the coding challenge bank.
---

# Refresh the Code Challenge Bank

The Daily page shows one small Python challenge at a time, pulled from the
`code_challenges` table in Supabase. Completing a challenge **deletes** it (one
and done), so the bank drains over time. This skill refills it.

**Supabase project ID:** `egxbhglczkslnskxorlf` (Focus Flow). Use the Supabase
MCP tools (`execute_sql`) against this project.

## Table shape

```
code_challenges (
  id         uuid primary key default gen_random_uuid(),
  prompt     text not null,   -- what the user has to write
  answer     text not null,   -- a clean reference solution (Python)
  difficulty text default 'easy',
  created_at timestamptz default now()
)
```

## Steps

1. **Read what's already there** so you don't create duplicates:
   ```sql
   select prompt from public.code_challenges;
   ```
   Also check the size: `select count(*) from public.code_challenges;`

2. **Generate 25 new challenges.** Rules:
   - **Basic Python refreshers** — the kind of warm-up you'd do to knock the
     rust off: strings, lists, dicts, loops, simple math, comprehensions, basic
     functions. Nothing requiring external libraries, files, or networking.
   - Each is a single self-contained function (or short script like FizzBuzz).
   - Keep the `prompt` to one or two plain sentences describing what to write.
   - Keep the `answer` a short, idiomatic, correct Python reference solution.
   - **Do not repeat any `prompt` already in the table** (from step 1). Aim for
     fresh variety — pick different operations than what's already there.

3. **Insert them** in one statement, using dollar-quoting (`$ch$…$ch$`) so the
   Python code in prompts/answers doesn't collide with SQL quoting:
   ```sql
   insert into public.code_challenges (prompt, answer, difficulty) values
   ($ch$<prompt>$ch$, $ch$<answer>$ch$, 'easy'),
   ... (25 rows) ;
   ```
   If any answer could contain the literal `$ch$`, use a different tag like
   `$q$…$q$`.

4. **Confirm** the new count and report it back to the user:
   `select count(*) from public.code_challenges;`

That's it — the Daily Challenge section will start serving the new questions on
the next pick/skip.
