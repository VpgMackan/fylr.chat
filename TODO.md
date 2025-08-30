## Must do
- [x] Security: Implement robust authorization and ownership checks across all backend services.
- [x] README: Overhaul the main README with architecture, full setup instructions, and dependency info.
- [x] Error Handling: Implement a Dead-Letter Queue (DLQ) strategy in RabbitMQ consumers. Improve frontend error surfacing (e.g., toasts).

## High priority
- [x] UI Feedback: Implement real-time file ingestion feedback in the UI using WebSockets. (UNDERWAY)
- [ ] UI Feedback: Improve chat error/loading/reconnecting states.
- [ ] Functionality: Implement search functionality on all list pages.
- [ ] Ops: Implement structured (JSON) logging across all services.

## Medium priority
- [ ] Testing (Core): Write unit tests for critical backend services (Auth, Pockets) and E2E tests for the auth flow.
- [ ] Testing (Expansion): Expand test coverage (E2E for backend, components for frontend).
- [ ] UI: Make source citations in the chat UI clickable.
- [ ] RAG: Implement a re-ranking step in the chat pipeline.
- [ ] Implement podcast generation (Insperation: [Notebook LM](https://notebooklm.google/))
- [ ] Implement video generation (Insperation: [Notebook LM](https://notebooklm.google/))

## Low priority
- [ ] Features: Add support for more source types (web scraping, etc.).
- [ ] Ops: Integrate a metrics collection system (e.g., Prometheus).
- [ ] DB: Establish and document the prisma migrate workflow.

## Possible
- [ ] Onboarding: Design a simple onboarding flow for new users.
- [ ] CI/CD: Set up a basic CI/CD pipeline for linting, testing, and building Docker images.