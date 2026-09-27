---
name: duo-issue-triage
description: Investigate user-visible bugs in this Duo repository and draft or file reproducible GitHub issues with visual evidence. Use for website, simulator, and desktop bug reports in this project.
---

# Duo issue triage

Make the failure reproducible and leave enough evidence for another agent to investigate it. A screenshot is a lead; establish the starting state and the action that produced it.

## Evidence rule

Do not guess. Every factual claim in an issue must trace to a screenshot, recorded interaction, observed state, relevant log or network result, or a clearly attributed user report. Record what each piece of evidence proves. If evidence is missing, name the unknown and obtain the next observation before concluding. Never turn a suspected cause into a root-cause claim.

## Set up the investigation

- Read [debugging](../../../docs/debug.md). Read [design](../../../DESIGN.md) when judging visual behavior. For the simulator, load [duo-shell-testing](../duo-shell-testing/SKILL.md).
- Use `agent-browser` for web checks and load `agent-browser skills get core` first. Inspect state and rendered pixels. Use the visible Tauri app for native, window, WebKit, or GPU-specific reports. Record which runtime was tested; Chromium is not native parity.
- If the user identifies an open tab, capture its current state before reloading or changing controls. Keep the user's data and permissions intact. Use an isolated session when a clean start or destructive reset is necessary.
- Respect the requested scope. If the user asks for browser-only troubleshooting, do not read source or change code.

## Troubleshoot

1. **State the claim.** Write down the observed symptom and expected behavior separately. Record the URL, date, runtime and version if available, viewport, device pose, visible display, app, permission state, and relevant saved state. Mark facts supplied by the user separately from facts you observed.
2. **Reproduce the shortest path.** Start from a reachable state, name each visible control, and include meaningful waits such as loading, unlock, or route completion. Capture the state before the action and immediately after the failure. Retry an intermittent report and record the actual success/failure count; do not describe it as consistent after one attempt.
3. **Check state and pixels together.** A DOM or accessibility node can exist while its icon is not painted. A screenshot can show a wrong map view while the underlying location is correct. Inspect the app state, screenshot, and relevant console or network errors before deciding which failed.
4. **Change one condition at a time.** Compare reload versus no reload, fresh versus resumed state, active versus inactive route, and embedded versus full-size simulator when relevant. Check another runtime only when it narrows the question; name each result separately.
5. **Conclude at the evidence boundary.** A captured failure confirms the symptom, not its implementation cause. If it does not recur, report the attempts and preserve the user's original evidence. Mark user-reported behavior separately from agent-verified behavior. Ask for the missing observation when the evidence cannot distinguish explanations.

### Common Duo checks

| Symptom | Checks that separate causes |
| --- | --- |
| Wrong location | Permission granted, position request succeeded, position age/accuracy, blue marker position, route origin, and map camera center are different facts. Compare the displayed area with a user-supplied reference area before claiming the coordinates are wrong. |
| Missing icons or blank screen | Check boot/loading, lock screen, selected display, app readiness, asset requests, and whether icons exist in state but fail to paint. Wait for compositing before calling a transient frame a defect. |
| Button appears inert | Confirm the control was hit, its state changed, and the expected visible effect occurred. On the 3D display, use the interaction guidance in `duo-shell-testing`; a selector click can miss a CSS3D panel. |
| Intermittent after reload | Note each reload's starting state and timing, successful versus failed attempts, permission result, network failures, and whether a prior app session was restored. |

## Capture evidence

- For a visual bug, capture the failing screen with enough surrounding UI to identify where it happened. Add a before screenshot when the change matters. Use a short video for timing, gestures, or intermittent transitions.
- Tie each image to a reproduction step or specific claim. Preserve the original capture; annotations can point to the defect but should not hide context.
- Attach screenshots to the GitHub issue or link an artifact accessible to other agents. A local file path alone is not issue evidence. If attachment is unavailable, say so and provide the capture in the user reply.
- Redact precise location and other private data before public posting unless the user authorized sharing it. Include only relevant errors; do not paste credentials or full private logs.

## Draft and file an issue

Search open and closed issues before creating a duplicate. A good issue contains:

1. **Title and impact:** the affected feature and visible failure, in plain words.
2. **Setup:** URL, runtime/version, required permissions, pose, app state, and other prerequisites.
3. **Steps to reproduce:** numbered actions from that setup, ending at the failure. Put an alternate route in its own subsection.
4. **Expected and actual:** direct comparison, occurrence count if intermittent, and linked screenshots or video.
5. **Investigation:** each check and its result, relevant errors, and a technical cause only if directly verified. If the cause remains unknown, say so instead of adding a theory.

Try the written steps before filing. If only the user's capture shows the failure, state that reproduction is not independently verified and include the attempts made. If neither a failure nor clear user evidence exists, request the missing evidence instead of filing a confirmed bug. When filing is requested, confirm the repository with `gh repo view`, search for duplicates, create or edit with `gh issue create --body-file` or `gh issue edit --body-file`, then verify the posted body with `gh issue view`. Return the issue link. If the user requested a draft, stop before posting.
