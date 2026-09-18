# Platform progress

Keep implementation checkpoints here, alongside the platform plans. Each record
captures the scope delivered, verification evidence, remaining limits and the
gate before the next workstream.

| Date | Checkpoint | Status |
| --- | --- | --- |
| 2026-09-17 | [Monorepo migration](migration.md) | Implemented; formatting, typechecks, builds and scoped browser/native verification pass; dragging confirmed by the user |
| 2026-09-17 | [Stage 2 runtime contract, review of revision 1](contract-review-1.md) | Changes requested: 5 accepted, 9 changed, amendment groups R1–R5 |
| 2026-09-17 | [Stage 2 runtime contract, revision 2](contract.md) | Accepted for implementation, including the permissions amendment and subsequent launch-generation clarification. Implementation evidence is in the stage 2 checkpoint |
| 2026-09-18 | [Stage 2 implementation](stage-2.md) | Revised MVP review gate: independent app, isolation, visible fold behavior and installation into an unchanged simulator; optional paths retained or disabled explicitly |
| 2026-09-18 | [Stage 3 developer workflow](stage-3.md) | External packaged CLI, isolated preview, install/restart and explicit update recovery verified in Chromium |
| 2026-09-18 | [Stage 4 UI-kit harvest](stage-4.md) | Kit 0.1.0, 39 app surfaces at both widths, public API/CI checks and external package consumption verified |
| 2026-09-18 | [Stage 5 audit](stage-5.md) | Final browser/native verification, pinned development HTML and local review artifacts |

The [scope amendment](../stage-2-mvp.md) controls stage 2 completion. Stages
3–5 followed on 2026-09-18 without a review pause; the website stayed out of
scope. Historical plans remain available; broader roadmap work does not block
the revised gate.
