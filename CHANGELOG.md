# Changelog

## [Unreleased] — 2026-06-01

### Added
- **Context tags on tasks** — `context text[]` column added to the `tasks` table. Tags can be added/removed from the new Context Tags section on the task detail page (`/tasks/:id`) and from the Context tab in the task modal. Tags also appear as `@tag` chips in the task list rows.
- **Theme switcher** — Catppuccin Mocha (default) and GitHub Dark themes. Toggle in Settings → Appearance. Choice persists to `localStorage`.

### Changed
- **Sidebar layout** — user avatar and email moved to the top of the sidebar; "Celerity" label and Sign Out button moved to the bottom.
- **Context tags UX** — dropdown combobox shows all tags used across your tasks as toggleable chips; free-text input for adding new tags. Tags save immediately on the full task page, and with the form on the modal.

---

## Prior to changelog

See git log for history before 2026-06-01.
