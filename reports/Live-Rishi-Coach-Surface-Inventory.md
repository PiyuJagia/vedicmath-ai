# Live Rishi Coach — Frontend Surface Inventory (updated)

**Branch:** `feature/live-rishi-coach`  
**Date:** 2026-11-15  
**Status after Phase 2–4 wiring:** Live ADK is the default conversational path.

## Classification legend

| Class | Meaning |
|---|---|
| **1 — Agent-generated conversational** | Goes through `LiveCoachProvider` → `/coach/chat` |
| **2 — Deterministic mathematical / lesson content** | Engine / lesson frames / hint ladder — keep scripted |
| **3 — Static UI instructions** | Labels, chrome, unlock copy — keep |

## Gate

- **Default ON:** `isLiveCoachEnabled()` returns true
- **Emergency kill:** `VITE_COACH_LIVE=false` (or legacy `VITE_COACH_HANDOFF=false`)

## Surface summary

| Surface | Conversational (1) | Deterministic (2) | Static (3) |
|---|---|---|---|
| Onboarding | Live welcome | — | Form labels |
| Explore | Live Hummingbird (non-sample) | — | Journey chrome |
| Theory | Live start / explain / why + Ask Rishi | Frame narration | Buttons |
| Learn More | Ask Rishi | `frame.rabbit`, `frame.state` | Tabs / controls |
| Practice | Live feedback / rabbit / complete + Ask | Hint ladder text, prompts | Hint note |
| Play | Live Hummingbird | — | Unlock copy |
| Rocket | Live coach visit | Engine fact template / birdLine | UI |
| Progress | Live Hummingbird (non-sample) | Rings / mastery from local store | Badges chrome |
| Coach handoff | Live chat harness | Calculations / animations | Dev copy |

`demoCoach` remains in `services/coach.ts` for offline unit tests only — product pages use `useLiveCoach`.
