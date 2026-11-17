# Project memory

## Product intent & audience

- Vite + React app with AI-assisted testing features (AI test case generation, AI agent test execution).
- Developer/internal-tool audience using a backend that exposes authenticated async AI run endpoints.

## Brand personality & voice

- Engineering-focused, clear and concise UI copy.
- UI feedback emphasizes real status over demos: labels like “Running…”, explicit red error messages, no simulation artifacts.

## Visual design & UX direction

- Tailwind CSS for styling; Lucide React for icons (no other UI/icon packages).
- Production-quality, non-cookie-cutter layouts per explicit global instructions (see `.bolt/prompt`).
- Running states: disable form controls, swap primary button label to “Running…” with spinner in progress/steps card.
- Failure states: surface `error_message` in red; distinguish submission errors, status-check errors, and timeouts; offer retry for status checks without restarting the run.
- `data-mipqa` attributes used for element identification (e.g. `signin-title`, `login-confirm-button`); convention is `<name>-<element type>`.

## Decisions, constraints & rationale

- Tech stack: JSX + React hooks + Tailwind + Lucide React only; avoid extra packages unless requested.
- File strategy: write more, smaller files rather than repeatedly editing one; keep hook/page changes scoped.
- Data fetching via `@tanstack/react-query`; central request function is `apiService.authenticatedRequest` from `src/services/api.ts`.
- New hooks modeled on existing hooks (e.g. `useAiExecuteRun` modeled on `src/hooks/useAiTestGeneration.ts`).
- Async run lifecycle: `createRun` → `startRun` → poll `getRun` until terminal status or timeout (POLL_INTERVAL ~5s, POLL_TIMEOUT ~15m).
- Query isolation: wrap page/drawer content in its own `QueryClientProvider` (same pattern as `AiTestCaseDrawer`).
- Hook API contract: expose `run`, `isRunning`, `timedOut`, `error`, `start(input)`, `retryPoll()`.
- Must avoid duplicate submissions and isolate results when `projectId` changes; cancel outstanding requests on unmount.
- Never use a credit card icon as an edit button; use classic edit buttons.
- History version titles must reflect what was edited.

## Open questions & assumptions

- Exact backend request paths/verbs for createRun/startRun/getRun not yet documented here; assumed available via `apiService` methods.
- Terminal status values returned by `getRun` not yet enumerated in project context.
- `error_message` field name assumed consistent across create/start/poll failures.