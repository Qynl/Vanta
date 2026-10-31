# VANTA — Master Development Plan

**Version:** 1.7 — M5 combat foundation, HUD v1 and Proving Grounds
**Last updated:** 2026-10-31
**Source of truth for:** architecture, milestones, implementation status, decisions, known issues, next actions.

This document is the permanent control file for VANTA. A fresh development session must be able to read this file and continue without the original brief. Do not restart the project or redo completed work.

---

## 0. Document control

### 0.1 Status legend

| Status | Meaning |
|---|---|
| NOT STARTED | No implementation work has begun. |
| IN PROGRESS | Implementation is underway; not yet through acceptance criteria. |
| BLOCKED | Cannot proceed without a dependency, credential, decision or external capability. Document the blocker. |
| TESTING | Implementation exists and is being verified against acceptance criteria. |
| COMPLETED | Implemented, integrated, tested and documented. Evidence is recorded in §11. |

### 0.2 Milestone completion rules

A milestone may only be marked COMPLETED when:

1. Every listed feature is implemented (not stubbed, mocked or decorative).
2. Acceptance criteria are met and evidence is recorded.
3. `bun tsc -b --noEmit` passes for touched TypeScript. No backend codegen is required.
4. Relevant unit/integration tests pass, or the absence of a test is explicitly justified.
5. The change is integrated into the playable game, not an isolated demo.
6. `plan.md` progress, next action and any new bugs/decisions are updated.

### 0.3 How to resume ("continue")

1. Read this file completely, especially §11 (progress), §12 (rules) and §16 (session protocol).
2. Inspect `git status`, the project tree and the files named by the current task.
3. Pick the current task marked IN PROGRESS, or the first NOT STARTED task whose dependencies are COMPLETED. Do not skip dependencies.
4. Implement one coherent, testable portion. If it is too large, split it into tracked subtasks here first.
5. Verify, fix regressions, update this file, then produce the VANTA DEVELOPMENT REPORT in §16.
6. Stop. Do not start the following milestone in the same turn unless it is trivial and explicitly tracked.

---

## 1. Project overview

### 1.1 Vision

VANTA is a high-speed competitive arena FPS for the browser. It combines momentum-based movement (FLOW), large explorable maps, a 60-weapon pickup arsenal, backend-free direct multiplayer, credible bot opponents, and long-term progression/mastery. It must feel like a complete competitive FPS, not a shooting demo.

### 1.2 Gameplay pillars

1. **FLOW** — movement is a skill: sprint, slide, jump/double jump, wall-run, wall-jump, air-dash, momentum conservation, air control, crouch. FLOW is a visible mastery meter that rewards movement with movement feedback and movement-only benefits (never damage/health buffs).
2. **MASSIVE MAPS** — approximately 500×500 m playable spaces (SECTOR 09 ≈ 700×700 m), dense with interior routes, rooftops, underground passages, verticality and landmarks. Large but purposeful; no empty sprawl.
3. **ARSENAL** — exactly 60 mechanically distinct weapons in 10 categories, discovered through fixed map pickups with predictable spawns and tiered respawn timers.
4. **COMPETITIVE COMBAT** — responsive hitscan/projectile/melee combat, readable HUD, host-authoritative hit validation with lag compensation, four modes.
5. **REPLAYABILITY** — real bots with personalities/difficulties, online play, XP/levels/ranks, weapon mastery, challenges, leaderboards, cosmetic unlocks.

### 1.3 Target platform

- Desktop browser (Chrome/Edge/Firefox recent), WebGL2, keyboard + mouse, pointer lock.
- 1080p, 60 FPS target on a mid-range gaming PC (GTX 1060 / RX 580 class); 30 FPS minimum on integrated graphics at Low.
- Gamepad support is an unresolved decision (§11.5); not required for launch baseline.
- No native builds, no mobile touch controls at launch.

### 1.4 Technology stack (decided)

| Layer | Choice | Notes |
|---|---|---|
| UI shell | React + Vite + TypeScript | Existing Freebuff target environment; app shell, menus, HUD overlays. |
| 3D rendering | Three.js (WebGL2) | Imperative gameplay renderer. React Three Fiber only for menu/loadout previews where appropriate. |
| Physics | Rapier 3D (`@dimforge/rapier3d-compat`) | Shared by the local client, direct-session host and predicting joiner; WASM works headlessly for tests. |
| Simulation | Pure TypeScript, fixed timestep 60 Hz | No DOM/Three imports. Solo and direct-session hosts run the same authoritative sim. |
| Local persistence | IndexedDB/localStorage (settings, offline profile cache) | Guest play works offline. |
| Accounts/persistence | Local-first (IndexedDB/localStorage) | No account or backend is required to play. Optional cloud profile sync is deferred unless explicitly requested. |
| Online gameplay | WebRTC data channels + manual offer/answer exchange | No game backend, no matchmaking service and no relay by default. The host browser runs the authoritative sim; joiners predict locally. |
| Styling | Tailwind CSS + shadcn/ui primitives | Preserve Freebuff styling conventions when the template exists. |
| Tests | Vitest + headless Node sim harness | Unit + integration; Playwright smoke optional later. |
| Package manager | Bun | Freebuff default. |

### 1.5 Current project status (inspection of 2026-10-30)

| Item | Finding |
|---|---|
| Repository | Git repository; **1 tracked file**: `README.md` (a short placeholder note). |
| Framework/app | None. No `package.json`, lockfile, Vite config, `index.html`, `src/`, or Tailwind setup. |
| Game code | None. No renderer, physics, controller, weapons, maps, AI or networking. |
| Backend | None. Direct sessions use browser WebRTC; no backend is required. |
| Assets | None. No models, textures, audio or fonts. |
| Tests/build | None. No test config, no build command, no CI. |
| Documentation | Only the placeholder README. |
| Conclusion | **Greenfield build inside an existing repository.** This is not a rewrite. Preserve `README.md`; add project documentation without destroying existing user content. |

The repository was inspected before planning. No feature is assumed to work because a file exists; no files exist. The first implementation milestone is therefore scaffolding, followed by a playable vertical slice.

### 1.6 Non-goals for the initial release

- Battle royale, vehicles, campaign/story mode, mobile port, console port, user-generated maps, marketplace, real-money purchases.
- Pay-to-win of any kind. Cosmetics never alter hitboxes, visibility, stats or weapon behaviour.
- 900×900 m "mega arena" at launch (reserved as a post-launch format; the map framework must support it).

---

## 2. Technical architecture

### 2.1 Architectural principles

1. **Simulation is headless and authoritative on the host.** `src/game/sim/**` is pure TypeScript: no Three.js, React, DOM, audio or browser APIs. It runs identically in solo and as the host of a direct session, and can run headless in tests.
2. **Render reads; it never mutates sim state.** The renderer consumes snapshots/events and interpolates. Input goes in; events come out.
3. **Fixed timestep.** 60 Hz simulation; variable-rate rendering with interpolation. No gameplay logic in `requestAnimationFrame` deltas.
4. **Data-driven content.** Weapons, maps, modes, bot profiles and progression tables are typed data + registered behaviour handlers, not giant switch statements in player code.
5. **One authoritative code path for solo and online.** Solo uses `LocalSimHost`; a direct session uses the same sim on the host, with joiner prediction/reconciliation. Gameplay never branches into a separate "singleplayer implementation".
6. **Host authority for outcomes.** Damage, eliminations, pickups, ammo, cooldowns and match state are validated by the host sim. Client effects are cosmetic. P2P host authority is trusted, not independently anti-cheat verified.
7. **Modularity and budgets.** Each subsystem has an owner module and explicit performance budget. No single giant component or file.
8. **Procedural-first assets.** Original procedural geometry, textures and synthesized audio avoid licensing risk and keep the repo light. Any external asset must be original or explicitly licensed (CC0) and recorded in §11.
9. **Determinism where it matters.** Fixed-step sim with seeded RNG and command ordering. Do not claim cross-platform bit-determinism; the session host is authoritative instead, with prediction on joining clients.
10. **Progressive enhancement.** Low preset must remain playable; visual quality scales with hardware.

### 2.2 Layer diagram

```
React UI (menus, HUD overlays, settings)
        │ intents / snapshots via useSyncExternalStore
        ▼
Client runtime
  ├─ InputManager ──► InputCommand
  ├─ LocalSimHost / DirectSessionClient ──► host snapshots + events
  ├─ Prediction + reconciliation (joiner)
  ├─ GameRenderer (Three.js) ── reads interpolated view state
  ├─ AudioEngine (Web Audio) ── consumes sim events
  └─ HUD store ── consumes sim events
        │
        ▼
Shared simulation (pure TS, 60 Hz)
  world · movement · flow · weapons · projectiles · damage · pickups · modes · bots · nav
        │
        ▼
Rapier physics (solo / host / predicting joiner)
```

### 2.3 Rendering architecture

- **Gameplay canvas:** one `<canvas>`, owned by a `GameRenderer` class; not a React scene graph. React mounts/unmounts it and overlays HUD/menus. No React state updates per frame.
- **Pipeline:** WebGLRenderer (antialias per quality), sRGB output, ACES tone mapping, fog for depth/culling, one directional sun with a tight shadow cascade around the player or baked/vertex lighting depending on map, plus a small dynamic light budget for muzzle flashes and hero props.
- **Scene structure:** static map batches (merged by material) → instanced props → dynamic entities (players, projectiles, pickups) → transparent FX → viewmodel (separate scene + camera to avoid clipping) → post FX.
- **Lighting plan:** time-of-day baked into map data; vertex-color ambient occlusion and emissive trims; one real shadow-casting light; cheap contact/blob shadows under players; fog + sky shader for atmosphere. No expensive realtime GI.
- **Materials/textures:** procedural canvas textures (concrete, metal, panels, decals) with shared material cache; vertex colors for district variation; emissive masks for neon. Target < 120 unique materials visible.
- **Post FX:** SMAA/FXAA, subtle bloom (threshold high), vignette, damage/low-health treatment, FLOW speed effects. Motion blur and chromatic aberration off by default. Maximum three full-screen passes at High, one at Low.
- **LOD/culling:** per-object LOD for props and weapon pickups, instancing for repeated kit pieces and debris, zone-based visibility groups, frustum culling, fog culling, occlusion via authored zone portals where beneficial. No expensive per-frame nav/occlusion recomputation.
- **Camera:** base FOV 90 (settings 70–110), sprint/dash FOV kick (+8 max), ADS FOV per weapon, recoil kick layered over aim, landing dip, FLOW camera lean; all smoothed and clamped, with accessibility scaling.
- **Viewmodel:** separate scene/camera, procedural weapon rig, sway/bob/recoil springs, reload choreography driven by timelines, muzzle flash quads and pooled light, shell ejection particles. Never blocks gameplay input beyond weapon-specific timings.
- **Failure handling:** WebGL context-loss recovery (pause sim, recreate renderer assets), error boundary, quality auto-downgrade after sustained frame-time overruns.
- **Files:** `src/client/render/GameRenderer.ts`, `render/scene/*`, `render/materials/*`, `render/fx/*`, `render/viewmodel/*`, `render/debug/*`, `src/ui/*`.

### 2.4 Physics architecture

- Rapier 3D compatibility build, **one world per match**, version pinned and shared by the host and joining clients for prediction.
- Fixed 60 Hz step with accumulator; maximum 5 catch-up steps per render frame; the host steps on a monotonic timer and pauses when the host tab is hidden. Joiners predict locally and never own match state.
- **Layers:** static world, player capsules, projectiles, pickup triggers, hit volumes, camera obstruction. Players collide with static geometry and other players (soft separation), not with pickup triggers as solids.
- **Player collider:** capsule radius 0.35 m, height 1.8 m standing / 1.2 m crouched; kinematic character controller with slope limit 50°, autostep 0.35 m, snap-to-ground 0.3 m, CCD for fast movement.
- **Collision geometry:** built from authored collider primitives (boxes, ramps, cylinders) via the map kit — never from full visual meshes. This keeps host load and memory predictable. Thin cover uses simplified boxes.
- **Projectiles:** analytic ray/sphere casts and lightweight custom ballistic integration; only grenades/slow specials use dynamic rigid bodies, pooled and capped.
- **Hit detection:** capsule/sphere hit volumes (head, torso, legs) attached to the sim entity, host-resolved with lag compensation. No mesh-accurate per-triangle hit tests.
- **Dynamic props:** minimal; debris is cosmetic and instanced, never gameplay-critical. Physics bodies sleep aggressively.
- **Debug:** wireframe collider view, contact normals, step timing and query counters behind a developer flag.
- **Files:** `src/game/sim/physics/*`, `src/client/render/debug/PhysicsDebug.ts`, map collider builders in `src/game/data/maps/*`.

### 2.5 Player controller, movement and FLOW

**Controller states:** grounded, airborne, sliding, wall-running, wall-jumping (brief), dashing, crouched, dead, spectating. State machine is explicit and unit-tested; no animation locking of movement input.

**Input contract:** `InputCommand { seq, tick, moveX, moveY, lookYaw, lookPitch, jumpPressed, jumpHeld, crouchHeld, sprintHeld, fireHeld, adsHeld, reloadPressed, dashPressed, slotPressed, interactHeld, altFireHeld }`. Joiners send commands every sim tick (redundant last 3 for packet loss). The host applies them in order with validation.

**Movement targets (initial tuning, subject to playtest):**

| Property | Value |
|---|---|
| Walk / sprint | 6.0 / 9.5 m/s |
| Ground accel / friction | 55 m/s² / 60 m/s² |
| Air accel / air control | 14 m/s², 0.45 control factor |
| Gravity | 22 m/s² |
| Jump velocity | 8.2 m/s; double jump 7.0 m/s |
| Slide | entry ≥ 9 m/s, initial 13.5 m/s decaying to 7 m/s over 0.9 s |
| Wall-run | up to 1.2 s, 10.5 m/s along wall, gentle gravity |
| Wall-jump | 8.8 m/s up + 4.5 m/s away from wall |
| Air dash | 22 m/s horizontal, 0.18 s, 1 charge, cooldown 1.6 s, refreshed on landing/wall-run |
| Coyote time / jump buffer | 0.10 s / 0.12 s |
| Soft speed cap | 30 m/s (momentum preserved, not hard-clamped) |

**Momentum rules:** landing preserves horizontal momentum with a small friction penalty; slide-jump converts slide speed into jump impulse; wall-jump and dash add to existing velocity rather than replacing it; no arbitrary "speed reset" on landing. Movement abilities have no ammo cost, but dash/wall-run have authored cooldowns shown in HUD.

**FLOW meter:** 0–100, four tiers (0–24, 25–49, 50–74, 75–100) plus "Overdrive" at 100.

- Gains: sustained sprint speed, slide-jump chains, wall-run distance, wall-jump chains, air-dash chains, long airtime, clean landings at speed, and traversal of authored FLOW routes.
- Decay: 4/s after 1.2 s without a qualifying movement action; faster on standing still; **no combat penalty**.
- Rewards: HUD ring/pulse, speed lines, trail intensity, wind/impact audio, camera lean, XP/score contribution, and at Overdrive a modest dash cooldown reduction (1.6 s → 1.3 s). **Never** damage, health, accuracy or damage-resistance bonuses.
- Sim owns the meter and tier; client only renders events/state. The host validates the movement envelope within prediction tolerance.

**Camera/input feel:** raw mouse input with optional smoothing; separate hipfire/ADS sensitivity and zoom scaling; no acceleration by default; pointer-lock onboarding; FOV and shake accessibility options; viewmodel bob is cosmetic.

**Files:** `src/game/sim/player/*`, `movement/*`, `flow/*`, `src/client/input/*`, `src/client/render/camera/*`.

### 2.6 Weapon architecture

- **Definition data** (`src/game/data/weapons/*.ts`) is serializable and validated at startup: identity, category, slot, tier, model parameters, audio profile, fire specs (primary/secondary), damage curves, ammo, timings, recoil pattern, spread, movement modifiers, mechanic ids.
- **Runtime controller** (`src/game/sim/weapons/WeaponRuntime.ts`) is a state machine: `idle → equipping → firing/charging → cycling → reloading → overheating → holstering`. It owns ammo, heat, cooldowns and burst state.
- **Fire spec types:** `hitscan`, `ballistic`, `beam`, `melee`, `special`. Each has a handler registered by id; weapon data never contains executable functions.
- **Firing pipeline:** validate (alive, state, ammo, cooldown, host authority) → consume ammo/heat → compute seeded spread/recoil → emit projectile(s) or hit query → resolve damage/impacts → emit events → apply recoil/feedback.
- **Recoil:** per-weapon deterministic pattern + small seeded horizontal component; visual camera kick is separate from aim recoil; recovery rates per weapon; ADS reduces both. Patterns authored as sequences, not random noise only.
- **Spread/accuracy:** min/max cone, bloom per shot, movement/air penalty, recovery; crosshair reflects current cone; first-shot accuracy where authored.
- **Ammo:** magazine + reserve, per-category ammo pools for pickups, infinite reserve for the starter pistol (low DPS), no ammo for melee. Reload can be cancelled by swap; empty-reload auto-trigger option.
- **Alternate fire:** optional per definition (e.g., M4X underbarrel grenade, Charge Cannon charge, Katana lunge, Crossbow detonate). Input `altFireHeld`.
- **Unique mechanics:** `mechanicId` → handler module (`weapons/mechanics/*`) with hooks: `onFire`, `onProjectileTick`, `onHit`, `onKill`, `onEquip`, `onReload`, `modifyDamage`. Examples: heat, chain lightning, gravity field, ricochet, bounce, burn, EMP, pierce, charge, self-knockback.
- **Damage:** per-weapon base, falloff curve by range, hit-zone multipliers, pellet count, splash curve, penetration count, armor/shield interaction. All resolved by the session host; the joiner may predict tracers but not outcomes.
- **Validation:** the host enforces fire-rate ceilings, ammo, reload completion, charge time, slot ownership, dash/ability cooldowns and movement speed envelope within tolerance. Host authority is trusted in direct sessions; it is not independent anti-cheat.
- **Files:** `src/game/data/weapons/`, `src/game/sim/weapons/`, `projectiles/`, `mechanics/`, `src/client/render/viewmodel/`, `src/client/audio/weapons/`.

### 2.7 Combat and damage system

- **Health model:** 100 health + up to 100 regenerating shield. Shield absorbs damage first; after 5 s without damage it regenerates at 20/s. Health does not regenerate; it is restored by health pickups (+25/+50) and mode rules. Fights stay readable and disengaging is useful without full-heal passivity.
- **Hit zones:** head, torso, legs, represented by capsule/sphere volumes. Multipliers are per weapon (head typically 1.5–2.5×, legs 0.8×, torso 1.0×); shotguns use pellet-level resolution.
- **Damage pipeline:** validated shot → seeded spread → hit query → zone/falloff/splash/penetration modifiers → shield/health application → damage events → eliminations (health ≤ 0) → assists (damage within 5 s) → kill credit.
- **Falloff:** each weapon has a range curve (`start`, `end`, `minMultiplier`); snipers/marksman are near-flat, SMGs fall off sharply, shotguns use pellet spread plus distance falloff.
- **Splash and penetration:** radial damage with falloff and line-of-sight checks; penetration supports wall thickness limits and player counts (Widow, Railgun, Photon, Particle Accelerator).
- **Friendly fire:** off by default; configurable per match. Self-damage is enabled for explosive/knockback weapons at a reduced rate.
- **Feedback:** directional damage indicators, shield-break flash, hitmarkers (normal/headshot/elimination), low-health treatment, elimination cards, killfeed, damage numbers optional. All driven by sim events, never invented by UI.
- **Respawning:** mode-configurable delay (default 4 s) with safe spawn selection; spawn protection 1.5 s or until the player fires.
- **Files:** `src/game/sim/combat/*`, `damage.ts`, `hitbox.ts`, `spawn.ts`, `src/ui/hud/*`.

### 2.8 Pickups and inventory

- **Slots:** primary, secondary (pistols), melee. Starter kit: `pistol_burst` (infinite reserve, low DPS) + `melee_knife`. Players always retain a functioning weapon set.
- **Pickup nodes:** authored per map with fixed weapon assignment, tier, respawn time and a safe/valid placement; mirrored copies for team symmetry where needed. Pickups are host-owned entities with deterministic respawn timers.
- **Interaction:** instant pickup into an empty slot; hold interact (0.25 s) to replace an occupied slot. The replaced weapon is discarded in v1 (no dynamic drop entity) to control clutter and network cost; revisit after playtests.
- **Availability tiers:** Common 20 s, Uncommon 30 s, Rare 45 s, Power 60 s. Tier expresses availability, not automatic superiority. Power pickups are announced and placed in contested/strategic locations.
- **Ammo economy:** per-category pools (light, shells, precision, energy, heavy). Ammo crates refill reserve; weapon pickups grant one full magazine plus a partial reserve. Melee needs no ammo. Starter pistol always usable.
- **World presentation:** pedestal + holographic icon + rotating blockout model, tier color, respawn ring/timer visible when aiming at it, distance/compass indicator within 40 m, audio cue for Power spawns.
- **HUD:** slots, ammo, reserve, reload/heat state, pickup prompt, low-ammo warning. Values come from sim state only.
- **Files:** `src/game/sim/pickups/*`, `inventory.ts`, `src/game/data/maps/*/pickups.ts`, `src/client/render/pickups/*`, `src/ui/hud/WeaponHud.tsx`.

### 2.9 Map architecture

- **World scale:** 1 unit = 1 metre. Maps authored around an origin, with explicit playable bounds and vertical extents. Approximate footprint targets: VERTEX 500×500, REACTOR 500×500, BREACH 500×500 (platforms over void), SECTOR 09 700×700.
- **Blockout-first modular kit:** ramps, catwalks, walls, floors, stairs, pipes, doors, rooftop modules, tunnel modules and hero landmarks. Visual meshes and collider primitives are generated from the same layout data so collision never drifts from geometry.
- **Zones:** each map is divided into named zones with bounds, occlusion/visibility groups, audio reverb settings, ambient palette and spawn/pickup ownership. Zone streaming toggles render groups and LOD; sim collision stays loaded (host and joiner share the full collider data).
- **Routes:** every major zone pair must have at least two routes (one ground, one vertical/flow) and at least one loop. Authored FLOW routes include wall-run surfaces, dash gaps, slide tunnels and momentum chains.
- **Landmarks:** each map has 3–5 recognizable hero structures used for orientation and callouts; distinct silhouettes and palettes, not lighting swaps.
- **Hazards/bounds:** kill volumes (falls, coolant), out-of-bounds reset with safe reposition, no invisible walls inside intended play space.
- **Placement data:** spawn points (≥40 per map, directional/safe), pickup nodes (32–40), health/ammo nodes, bot navigation graph, objective anchors, camera-blocking volumes, audio zones.
- **Files:** `src/game/data/maps/<map>/{layout,colliders,spawns,pickups,nav,zones}.ts`, `src/client/render/maps/<map>/*`, `mapKit/*`.

### 2.10 Bot AI architecture

- **Same rules as players:** bots emit `InputCommand`s into the same movement, weapon and pickup systems. They have no hidden information, no aimbot, no wallhack and no stat multipliers by difficulty. Difficulty changes reaction time, aim error, decision quality, perception discipline and movement competence.
- **Navigation:** authored waypoint graph per map (nodes, edges and traversal types: walk, jump, drop, wall-run, dash-gap) plus A* with traversal costs, local steering and Rapier shapecasts for obstacle avoidance. Waypoints are validated for reachability and pickup access by an automated script.
- **Perception:** FOV (~120°), line-of-sight raycasts, hearing radius for gunfire/footsteps, short memory of last-known positions with decay. Bots do not peek through geometry; target information is only what a player could perceive.
- **Combat FSM:** Acquire → Engage → Reposition/Strafe → Retreat (low HP) → Collect (weapon/ammo/health) → Hunt (last-known) → Recover (stuck/out of bounds). Weapon-specific behaviour uses range bands and the weapon's fire mode/mechanics.
- **Personalities:** Rusher, Tracker, Sniper, Trickster, Duelist — parameterized aggression, preferred range, reaction, movement flair, pickup priority, retreat threshold and route preference. Personalities are data, not separate codebranches.
- **Difficulty presets:** Recruit / Regular / Veteran / Elite / Vanta. Reaction 450/300/200/140/100 ms; aim error cones, tracking smoothing and decision cadence scale. No accuracy or health cheats.
- **Movement:** bots sprint, slide, wall-run, dash and jump using the same abilities and cooldowns; authored nav links teach reasonable routes, and 'Trickster' uses riskier FLOW links more often.
- **Pickups:** bots evaluate weapon tier fit, ammo state and route risk; they contest Power weapons but never teleport or know respawns they could not observe (timer knowledge is allowed as public map knowledge).
- **Performance:** AI perception/decisions at 10–15 Hz with staggered updates; pathfinding cached/incremental; max 9 bots in solo, up to 8 in a hosted session; no per-tick allocations in hot paths.
- **Files:** `src/game/sim/bots/*`, `ai/nav/*`, `ai/perception.ts`, `ai/combat.ts`, `ai/personalities.ts`, `src/game/data/botProfiles.ts`, map `nav.ts`.

### 2.11 Multiplayer architecture — backend-free direct sessions

- **Topology:** one host browser owns the authoritative VANTA sim; one to seven joiners connect directly over WebRTC data channels in a host-star session. The host runs the shared pure-TS sim at 60 Hz with 30 Hz snapshots; joiners predict locally and render interpolated remote state. Maximum eight players, matching the launch modes. The host tab must stay open; there is no dedicated server and no host migration at launch.
- **Signaling without a backend:** manual offer/answer exchange. The host creates an invite code/link (URL fragment, so the static file host never receives it), the joiner returns an answer code, and the host confirms. No VANTA server, account, room registry or third-party lobby exists. This is deliberately less convenient than a server-backed quickplay queue.
- **NAT discovery:** the invite config may use public STUN servers only for address discovery; STUN never carries gameplay and is not operated by VANTA. No TURN relay is included at launch, so symmetric/strict NATs can fail to connect; the UI must diagnose that honestly. LAN sessions work without STUN. An optional user-provided relay can be considered later but is not required for the core direct-session path.
- **Transport:** two `RTCDataChannel`s per joiner: reliable-ordered control (handshake, roster, keyframes, match events) and unreliable-unordered input/snapshot traffic (`maxRetransmits: 0`). Versioned binary messages via `DataView`; snapshot deltas with reliable keyframe baselines; input batches repeat the last three commands. Quantized positions/rotations. Downstream target ≤ 24 KB/s per joiner; upstream target ≤ 6 KB/s; session max 8. Message-size caps, sequence validation and per-peer rate limits are mandatory.
- **Host simulation:** the host runs the same fixed 60 Hz sim as solo, owns health, ammo, pickups, cooldowns, scores, spawns and bots. Host match lifecycle is authoritative. No client can grant damage, ammo, XP or pickups.
- **Joiner responsiveness (priority):** local input is applied immediately through prediction using shared movement code, sent at 60 Hz with redundancy, and reconciled against host snapshots carrying `ackSeq` and host tick. Rewind to the authoritative state, replay unacked commands, smooth small corrections in render space, snap only on large error or teleport. Remote players use a 60–120 ms adaptive interpolation buffer with extrapolation capped at 80 ms. Clock sync uses ping/pong on the reliable channel. Character movement must feel local even at 120 ms RTT.
- **Joiner fairness:** the host keeps 250 ms of hitbox history at 15–30 Hz and validates joiner shots at the shooter's view tick, capped at 200 ms rewind after rate/ammo/state checks. The host's own shots use the same history policy against remote targets. Host zero-latency advantage is disclosed; M23 evaluates an optional 0–80 ms host fairness delay for Duel without making movement feel delayed for joiners.
- **Resilience:** WebRTC ICE/session failure surfaces a clear error. A manual answer-code exchange can re-establish a link; a host loss ends the session (no migration). Reliable control messages use sequence checks, keyframe fallback and a bounded disconnect grace period. Input/snapshot floods are dropped; no unbounded buffering.
- **Privacy/security:** SDP contains peer IP addresses and is traded by the players, never uploaded by VANTA. Host authority is trusted and direct sessions are **unranked**: there is no independent anti-cheat, verified leaderboard or ranked MMR from host-run matches. Client-side validation and rate limits reduce accidental abuse, not host cheating. Do not claim competitive integrity that the topology cannot provide.
- **Deployment:** the client is static hosting only; no WebSocket server, Dockerfile, game-server secret or server region. Public STUN reachability is the only external connectivity dependency; document it and the strict-NAT limitation.
- **Files:** `src/game/shared/protocol/*`, `src/game/sim/net/*`, `src/client/net/direct/*`, `src/ui/pages/PlayOnline.tsx`, `docs/direct-sessions.md`.

### 2.12 UI, HUD and product shell

- **React shell:** title/main menu, Play hub (solo/direct/practice), Arsenal browser, Progression/Profile, Settings, About/Credits. The `/` route is a cinematic VANTA title experience whose primary CTAs enter the game (solo or direct). Profiles are local by default; no auth gate is required for play. If optional cloud accounts are ever added, guarded routes must preserve `/auth?returnTo=…` and never default to the public title.
- **In-match HUD:** crosshair with spread, hitmarkers, health/shield, ammo/reserve, weapon slots, FLOW meter/tier, killfeed, score/clock, respawn timer, damage direction, interaction prompts, teammate markers/compass, low-ammo/low-health states, scoreboard on hold.
- **Menus:** readable industrial-futurist identity; keyboard/mouse first; no fake buttons. Every control is wired; unavailable features are labelled and disabled, not silently broken.
- **State:** UI reads a small external store updated at most 10–15 Hz from sim events/snapshots via `useSyncExternalStore`; no React render per frame. Menus use React state normally.
- **Accessibility:** FOV slider, sensitivity + ADS multiplier, invert Y, toggle/hold sprint/crouch/ADS, screen-shake scale, reduced flashes, colorblind palettes (protan/deutan/tritan), UI scale, subtitles/captions for announcer cues, motion-blur off by default.
- **Screens:** loading with real progress, error/reconnect states, pause/settings in match, match summary with actual stats, empty states, confirmation for leaving a match.
- **Files:** `src/App.tsx`, `src/ui/pages/*`, `src/ui/components/*`, `src/ui/hud/*`, `src/client/state/*`.

### 2.13 Audio architecture

- **Engine:** Web Audio API graph with buses (master → music/SFX/UI/announcer), compressor/limiter, ducking, spatial `PannerNode`s and distance attenuation. Suspend on tab hide; unlock on first gesture.
- **Procedural SFX:** weapon sounds synthesized from layered noise/transients/oscillators with per-weapon profiles (body, crack, tail, pitch, distortion, suppressor). This avoids unlicensed audio and keeps the repository light; generated buffers are cached per profile/variant.
- **Environment:** map reverb zones (street, interior, tunnel, open sky), occlusion low-pass via periodic raycasts, footstep surface sets (concrete, metal, grate, grass), distant ambience loops synthesized/generated, shell/impact/ricochet variants.
- **Feedback:** FLOW wind/chain sounds, dash/wall-run cues, hit confirms, shield break, elimination stingers, pickup and Power-spawn cues, low-health heartbeat, directional damage audio.
- **Music:** restrained industrial/ambient bed for menus and matches; intensity layers tied to match state (not to hidden enemy info). Announcer is text + musical stingers at launch; voice-over is a later optional decision.
- **Mix targets:** gunfire intelligible over music, footstep cues audible but not overpowering, limiter prevents clipping, master volume defaults safe.
- **Files:** `src/client/audio/*`, `audio/synth/*`, `audio/profiles/*`, `src/game/data/audio.ts`.

### 2.14 Progression and persistence

- **Identity:** a local operator callsign persisted in the browser. No account, auth backend or cloud dependency is required to play or to host/join direct sessions.
- **Player progression:** XP → levels 1–100 (curve `XP_needed(n) = 800 + 200·(n−1)`, cumulative); XP from match completion, eliminations, assists, objectives, wins and capped FLOW/movement contributions. Cosmetic unlocks at levels; no stat unlocks. Direct-session XP is local and clearly unranked.
- **Ranks:** no global MMR or ranked ladder at launch. Host-authoritative P2P cannot produce independently verifiable competitive ratings. A local operator level and cosmetic mastery progression are allowed; any future ranked system requires an explicitly approved authority and must not reuse host-reported results.
- **Weapon mastery:** per-weapon XP from damage/eliminations/usage; 20 mastery levels; cosmetic weapon finishes, charms, reticles and mastery badges at 5/10/15/20. Never gameplay bonuses.
- **Stats:** local career and per-weapon stats (shots, hits, accuracy, headshots, damage, eliminations, deaths, assists, longest kill, matches, wins, time played, best FLOW). Clearly labelled as device-local.
- **Challenges:** 3 daily + 5 weekly with deterministic rotation seeded by date. Progress is local; the user can edit browser storage, so it is not anti-cheat protected and must never feed public rankings.
- **Leaderboards:** local personal bests at launch. Global/per-weapon leaderboards are deferred until a trusted authority exists. Do not show a fake global rank.
- **Profiles:** local player card, banner, level, favorite weapon, mastery showcase, recent matches and career totals. No public profile visibility without a backend.
- **Cosmetics:** colorways, weapon finishes, reticles, player cards, trails, elimination effects. Earned only (level/mastery/challenges) at launch; no paid advantage. Any future purchase is cosmetic-only and separately reviewed.
- **Persistence:** versioned localStorage for settings/operator/progression initially; move high-volume history to IndexedDB when needed. Local export/import can be evaluated later; no Convex schema, auth deployment or signed match reports are part of this build.
- **Files:** `src/game/progression/*`, `src/client/profile/*`, `src/client/state/*`.

### 2.15 Asset management

- **Policy:** procedural/original assets first. No copyrighted models, textures, sounds or fonts. External CC0 assets must be recorded with source/licence in §11. Do not download assets at runtime.
- **Weapon models:** procedural rig from a shared kit (receiver, barrel, stock, magazine, sight, accent panels) with per-weapon silhouette parameters, 3 LODs, shared material variants, emissive trims. World pickup model reuses the same rig at low LOD.
- **Map assets:** modular kit geometry + procedural canvas textures + vertex colors + shader skies; hero props built from primitives/extrusions. Static batches merged by material; repeated props instanced.
- **Fonts:** bundled open-licence fonts via packages (display condensed sans + mono for data), with system fallbacks; no runtime font CDN dependency.
- **Loading:** manifest of maps/weapon rigs/audio profiles; lazy-load per match; show real progress; cache in memory; no huge base64 blobs in JS.
- **Files:** `src/game/data/assets.ts`, `src/client/assets/*`, `public/` (small files only), `docs/assets.md`.

### 2.16 Performance strategy and budgets

**Frame budgets (1080p, 60 FPS):** simulation ≤ 4 ms, render ≤ 10 ms, UI ≤ 1 ms, audio ≤ 1 ms, networking ≤ 1 ms, headroom ≥ 3 ms.

| Metric | Target (High) | Low preset |
|---|---|---|
| Visible draw calls | ≤ 700 | ≤ 350 |
| Visible triangles | ≤ 1.5 M | ≤ 600 K |
| Unique materials | ≤ 120 | ≤ 60 |
| Dynamic shadow-casting lights | 1 (sun) | 0 |
| Post-processing passes | ≤ 3 | 1 |
| Particle budget | 4,000 | 1,200 |
| Physics active bodies | ≤ 60 (excluding players) | same |
| Memory | ≤ 900 MB | ≤ 600 MB |
| Map load | ≤ 10 s broadband | ≤ 10 s |

- **Techniques:** merged static geometry, instancing, LODs, zone visibility groups, fog culling, texture/material caches, object pools for projectiles/FX/decals, no per-frame allocations in sim hot paths, sleeping physics bodies, staggered bot perception, capped particles, adaptive resolution scaling only above 60 FPS target and only if it does not blur HUD.
- **Monitoring:** in-game perf overlay (frame time, draw calls, tris, entity counts, sim/network timings), automated headless benchmark scene, capture baselines at milestones M2, M14–M17, M27.
- **Host budgets:** 60 Hz sim tick ≤ 12 ms for up to 8 players plus hosted bots; snapshot serialization ≤ 3 ms; host upstream ≤ 168 KB/s at seven joiners (eight players); no synchronous asset work after a session starts. Joiner networking/prediction overhead must stay within the 1 ms frame allotment on the target hardware.
- **Files:** `src/client/perf/*`, `scripts/bench.ts`, `docs/performance.md`.

### 2.17 Planned project structure

```
/
├─ README.md                 existing placeholder, preserved
├─ plan.md                   this document
├─ package.json · vite.config.ts · tsconfig*.json · index.html
├─ docs/                     architecture notes, direct-session guide, asset licences
├─ public/                   small static assets only
├─ src/
│  ├─ main.tsx · App.tsx · index.css
│  ├─ ui/                    pages, components, HUD overlays, state bridge
│  ├─ client/                renderer, input, audio, direct net client, prediction, perf
│  ├─ game/
│  │  ├─ shared/             protocol, constants, types, math, rng
│  │  ├─ sim/                pure authoritative simulation (no DOM/Three)
│  │  │  ├─ world · player · movement · flow · weapons · projectiles
│  │  │  ├─ combat · pickups · modes · bots · nav · match
│  │  ├─ data/               weapons, maps, modes, bot profiles, progression
│  │  └─ progression/        formulas and shared progression types
│  └─ test/                  vitest unit + headless integration
└─ scripts/                  headless soak, balance sim, map/nav validation, network harness
```

**Dependency rule:** `ui → client → game/shared`; `client/net → game/shared + game/sim`; `game/sim` imports only `game/shared` and `game/data`. Never import Three/React/DOM from `game/`. Enforced by review and an import-boundary test. There is no server package; the host browser is the authority.

### 2.18 Core data contracts (shape only)

```ts
// shared
interface InputCommand { seq: number; tick: number; moveX: number; moveY: number;
  yaw: number; pitch: number; buttons: number; }
interface EntitySnapshot { id: number; kind: 'player'|'bot'|'projectile'|'pickup';
  pos: [number,number,number]; vel: [number,number,number]; yaw: number; pitch: number;
  flags: number; health: number; shield: number; weaponId?: string; }
interface SimEvent { type: string; tick: number; actor?: number; target?: number; data?: unknown; }
interface Snapshot { tick: number; ackSeq: number; entities: EntitySnapshot[];
  pickups: PickupSnapshot[]; match: MatchSnapshot; events: SimEvent[]; }

// weapons
interface WeaponDefinition { id: string; name: string; category: WeaponCategory;
  slot: 'primary'|'secondary'|'melee'; tier: AvailabilityTier; fire: FireSpec;
  altFire?: FireSpec; ammo: AmmoSpec; recoil: RecoilPattern; spread: SpreadSpec;
  damage: DamageSpec; movement: MovementModifiers; mechanicIds: string[];
  model: WeaponModelSpec; audio: WeaponAudioProfile; }

// maps
interface MapDefinition { id: string; name: string; bounds: Bounds; zones: ZoneDef[];
  colliders: ColliderDef[]; spawns: SpawnDef[]; pickupNodes: PickupNodeDef[];
  nav: NavGraph; flowRoutes: FlowRoute[]; audioZones: AudioZoneDef[]; }
```

Exact fields evolve with implementation; keep definitions serializable and validated at load. Prefer stable numeric ids for networked content; content hashes/version gate incompatible clients.

### 2.19 Security, validation and anti-cheat baseline

- The session host validates command rate/sequence, movement envelope (speed/acceleration/teleport), fire cooldown/ammo/reload/charge, slot ownership, pickup proximity/availability, ability cooldowns, match state transitions and score increments.
- Lag compensation is limited to 200 ms rewind; shots outside the hitbox-history window are rejected or clipped.
- Joiner clients never send raw damage, health, kills, XP or pickup grants. UI predictions never override host results.
- Message caps, sequence checks, peer-count limits, rate limits and bounded interpolation buffers defend the host against malformed traffic and accidental floods.
- Direct sessions are explicitly **unranked**. The host can see all state and modify its own client, so there is no trustworthy anti-cheat or verified match report. No fake HMAC/server attestation is claimed. Competitive rankings require an independently operated authority and are out of scope unless separately approved.
- This is proportionate robustness for a browser game, not a claim of cheat-proofing. Document limitations; do not overstate.

## 3. Arsenal specification — 60 weapons

### 3.1 Arsenal design rules

1. Exactly **6 weapons × 10 categories = 60**. IDs are unique and stable; display names may repeat across categories (notably **Hammer** in Shotguns and Melee), so UI always shows the category.
2. Every weapon must have a recognizable gameplay identity — not a reskin. At minimum it differs in firing behaviour, damage profile, handling, recoil/spread, ammo economy, movement feel, or a registered unique mechanic.
3. All 60 are implemented as real systems usable in matches. No decorative entries, fake stats or unreachable weapons.
4. Every weapon is discoverable through fixed map pickups. All 60 must appear on at least two of the four launch maps (coverage validated by script). The Proving Grounds/test range exposes all 60 for practice and verification.
5. Slots: AR/SMG/Shotgun/Sniper/Marksman/Energy/Heavy/Experimental → primary; Pistols → secondary; Melee → melee.
6. Damage values in data are starting points for tuning, not promises. Final balance happens after maps and bots exist (M28), with changes recorded.

### 3.2 Weapon data requirements

Each definition must specify: `id`, `name`, `category`, `slot`, `tier`, `description`, `fire` mode, optional `altFire`, damage (base, falloff curve, head/leg multipliers, pellets, splash, penetration), RPM/cycle time, magazine, reserve, reload (tactical/empty), equip/holster times, spread (min/max/bloom/recovery/movement penalties), recoil (vertical/horizontal pattern, recovery, ADS multiplier), projectile data where applicable, range, ADS zoom/time, movement modifiers, crosshair config, model parameters, audio profile, mechanic ids, and bot usage hints (preferred range).

### 3.3 The 60-weapon table

| ID | Name | Category | Slot | Gameplay identity / unique mechanic |
|---|---|---|---|---|
| `ar_viper` | Viper | Assault rifle | Primary | Versatile 600 RPM auto rifle; baseline recoil, 30-round mag, strong all-rounder. |
| `ar_havoc` | Havoc | Assault rifle | Primary | Slow 450 RPM hard-hitter; strong vertical recoil, 25-round mag. |
| `ar_sentinel` | Sentinel | Assault rifle | Primary | 3-round burst; first-shot precision, defensive mid-range. |
| `ar_pulse` | Pulse | Assault rifle | Primary | Fire rate ramps 500→800 RPM while held; accuracy degrades as it accelerates. |
| `ar_axiom` | Axiom | Assault rifle | Primary | 2× optic precision auto; first-shot perfect accuracy, fast recoil recovery. |
| `ar_m4x` | M4X | Assault rifle | Primary | Modern auto rifle; underbarrel 40 mm frag on alt fire (25 s cooldown). |
| `smg_spectre` | Spectre | SMG | Primary | Suppressed 780 RPM; no muzzle flash or tracer, low per-shot damage. |
| `smg_vector` | Vector | SMG | Primary | 1200 RPM, 24-round mag; best close TTK, heavy spread. |
| `smg_tempest` | Tempest | SMG | Primary | Gains fire rate and accuracy while airborne or sliding; mobile duelist. |
| `smg_raptor` | Raptor | SMG | Primary | 4-round burst; fastest strafe speed while equipped. |
| `smg_lynx` | Lynx | SMG | Primary | 620 RPM precision SMG; low spread, 1.6× headshot. |
| `smg_scorpion` | Scorpion | SMG | Primary | Venom rounds: reduced direct damage, stacking damage-over-time. |
| `sg_reaper` | Reaper | Shotgun | Primary | Pump 10-pellet close-range devastator; one-shot potential at point blank. |
| `sg_breacher` | Breacher | Shotgun | Primary | Semi-auto breacher; +75% shield damage and strong knockback. |
| `sg_scatter` | Scatter | Shotgun | Primary | Double barrel, 2 shells; enormous burst, slow 2.6 s reload. |
| `sg_doom` | Doom | Shotgun | Primary | Full-auto drum shotgun; sustained pressure, −10% move speed while firing. |
| `sg_jackal` | Jackal | Shotgun | Primary | Single high-damage slug; effective to ~30 m, 1.4× headshot. |
| `sg_hammer` | Hammer | Shotgun | Primary | Heavy punt gun; 30° cone, 2 shells, self-knockback. |
| `sr_longshot` | Longshot | Sniper rifle | Primary | Bolt-action 100 body / 2.2× head; 3.2 s cycle. |
| `sr_eclipse` | Eclipse | Sniper rifle | Primary | Suppressed precision sniper; no tracer, faster follow-up, lower body damage. |
| `sr_widow` | Widow | Sniper rifle | Primary | Anti-materiel; pierces players, 4.5 s cycle, heavy movement penalty. |
| `sr_railgun` | Railgun | Sniper rifle | Primary | Hold 1.1 s to charge; penetrating beam, 150 damage, loud pre-fire whine. |
| `sr_ghost` | Ghost | Sniper rifle | Primary | Agile quick-scope; 200 ms ADS, lower body damage, fast strafe. |
| `sr_horizon` | Horizon | Sniper rifle | Primary | Variable 2×–8× optic; range finder and hold-breath steady. |
| `mr_ranger` | Ranger | Marksman rifle | Primary | Semi-auto DMR; consistent two-tap body, moderate recoil. |
| `mr_dmr9` | DMR-9 | Marksman rifle | Primary | 10-round low-recoil precision rifle; slower follow-up. |
| `mr_falcon` | Falcon | Marksman rifle | Primary | 3-round burst marksman; long-range burst control. |
| `mr_kestrel` | Kestrel | Marksman rifle | Primary | Lightweight, fast follow-up; best moving accuracy. |
| `mr_crossfire` | Crossfire | Marksman rifle | Primary | Ballistic projectile marksman; must lead targets, strong headshot. |
| `mr_nomad` | Nomad | Marksman rifle | Primary | Scout rifle 4×; fast reload, iron-sight alt mode. |
| `pistol_burst` | Burst | Pistol | Secondary | Starter 3-round burst sidearm; infinite reserve, reliable. |
| `pistol_heavy` | Heavy | Pistol | Secondary | 6-shot high-damage revolver; slow cycle, strong flinch. |
| `pistol_machine` | Machine | Pistol | Secondary | 18-round full-auto machine pistol; high spread. |
| `pistol_dual` | Dual | Pistol | Secondary | Akimbo alternating fire; hip-fire only, high close DPS. |
| `pistol_energy` | Energy | Pistol | Secondary | Plasma projectile sidearm; small splash, 12 shots. |
| `pistol_hand_cannon` | Hand Cannon | Pistol | Secondary | Single massive shot; 1.6× headshot, loud, slow. |
| `ew_volt` | Volt | Energy weapon | Primary | Heat rifle: continuous fire builds heat; overheat locks the weapon for 2 s. |
| `ew_arc` | Arc | Energy weapon | Primary | Chain lightning arcs to 2 nearby enemies at 45% damage. |
| `ew_nova` | Nova | Energy weapon | Primary | Plasma orb; 3 m area detonation. |
| `ew_disruptor` | Disruptor | Energy weapon | Primary | EMP: strips shields, disables enemy dash/wall-run for 1.5 s. |
| `ew_beam` | Beam | Energy weapon | Primary | Continuous beam; damage ramps 25→60/s, builds heat. |
| `ew_photon` | Photon | Energy weapon | Primary | 3-round burst of accelerating light projectiles; pierces one player. |
| `hw_ravager` | Ravager | Heavy weapon | Primary | 100-round LMG; 0.4 s spin-up, suppressive fire. |
| `hw_titan` | Titan | Heavy weapon | Primary | Minigun; 0.8 s spin-up, 200 rounds, −25% movement while spun up. |
| `hw_devastator` | Devastator | Heavy weapon | Primary | Rocket launcher; 90 direct + 70 splash, single-rocket reload. |
| `hw_cyclone` | Cyclone | Heavy weapon | Primary | Rotary grenade launcher; 6 bouncing grenades. |
| `hw_anvil` | Anvil | Heavy weapon | Primary | Shoulder cannon; 130 slug, heavy knockback, 2 shells. |
| `hw_meteor` | Meteor | Heavy weapon | Primary | Arcing mortar shell; large 6 m splash, 2 shells. |
| `xw_gravity_cannon` | Gravity Cannon | Experimental | Primary | Projectile creates a 3 s gravity well pulling entities toward it. |
| `xw_crossbow` | Crossbow | Experimental | Primary | Silent bolt sticks then detonates; alt fire triggers early. |
| `xw_flamethrower` | Flamethrower | Experimental | Primary | 8 m cone; direct burn plus damage-over-time, fuel tank. |
| `xw_ricochet` | Ricochet | Experimental | Primary | Projectiles bounce off surfaces up to 3 times without damage loss. |
| `xw_charge_cannon` | Charge Cannon | Experimental | Primary | Hold 0.9 s then release a heavy slug with self-knockback (rocket-jump). |
| `xw_particle_accelerator` | Particle Accelerator | Experimental | Primary | Continuous piercing beam; ramps damage, overheats. |
| `melee_knife` | Knife | Melee | Melee | Starter. Fast 45-damage slash; 2× backstab. |
| `melee_katana` | Katana | Melee | Melee | Longer reach; alt-fire 5 m lunge slash. |
| `melee_energy_blade` | Energy Blade | Melee | Melee | High damage, slower; partially bypasses shields. |
| `melee_dual_blades` | Dual Blades | Melee | Melee | Two-hit alternating combo; wide arc. |
| `melee_hammer` | Hammer | Melee | Melee | Slow 90-damage slam; 2.5 m AoE plus knockback. |
| `melee_shock_baton` | Shock Baton | Melee | Melee | Low damage; 0.8 s stun and movement slow. |

**Count check:** 6 per category × 10 categories = 60. IDs are unique; duplicate display names are category-qualified.

### 3.4 Availability tiers and pickup rules

| Tier | Respawn | Placement rule |
|---|---|---|
| Common | 20 s | Laneways, side rooms, first-contest areas; reliable early weapons. |
| Uncommon | 30 s | Mid-map and secondary objectives; meaningful upgrades. |
| Rare | 45 s | Contested zones with exposure; strong specialists. |
| Power | 60 s | Central/risky landmark positions, announced on spawn; game-changing but counterable. |

- Fixed weapon-node assignments per map preserve predictability and map knowledge. There is no random weapon rotation in ranked/standard modes. A custom-match option may enable chaos rotation post-launch.
- Team modes mirror key nodes for symmetry where the layout allows; asymmetric maps compensate with route/cover design, validated in playtests.
- Initial weapon state appears no earlier than 5 s after the live countdown, staggered by tier, so nobody starts with a Power weapon uncontested.
- Ammo nodes respawn at 25 s; health nodes at 30 s (+25) and 45 s (+50).
- Pickups are disabled while a match is not live; timers pause in warmup/end states.

### 3.5 Starting loadout and slots

Starter kit: **Burst** pistol (`pistol_burst`) with infinite reserve + **Knife** (`melee_knife`). The pistol is deliberately weak but reliable, ensuring no player is ever fully disarmed. Players start with no primary; the first pickup is a meaningful early decision. Picking a pistol replaces the secondary; picking a melee replaces the melee. The previous weapon is discarded in v1. No loadout selection before a match: map discovery is the acquisition system.

### 3.6 Weapon production pipeline (per category and per weapon)

1. Define data + mechanic handler, validate schema and add to the arsenal registry.
2. Implement runtime behaviour and host validation; add unit tests for fire/ammo/cooldown/mechanic.
3. Build functional blockout viewmodel and world model from the procedural kit with a distinct silhouette.
4. Add crosshair, recoil/spread tuning, muzzle/impact/tracer FX, synthesized audio profile.
5. Add to Proving Grounds and a test station; verify damage, falloff, TTK readout and bot usability.
6. Production art pass: detailed parts, materials, 3 LODs, reload/equip choreography, world pickup hologram.
7. Map placement, tier assignment, bot hints, balance notes.

### 3.7 Arsenal acceptance criteria

- Automated validation test passes: exactly 60 definitions, 6 per category, unique IDs, all required fields, mechanic ids resolve, slots/tiers valid, no unreachable weapon.
- Each weapon fires/attacks, consumes ammo/heat, reloads/cycles, and its mechanic works in the Proving Grounds.
- All 60 appear on ≥2 launch maps; pickup coverage report generated.
- No placeholder visuals remain after M12; all weapons have distinct silhouettes and audio.
- All weapons are usable by bots through the generic AI (special mechanics handled by shared handlers).
- Balance data is exported for the final pass; no weapon is objectively dead or universally dominant within its intended range.

## 4. Map specification

### 4.1 Shared map standards

- 1 unit = 1 m; authored collider primitives and nav graph; 40+ spawn points; 32–40 pickup nodes; 3–5 landmark structures; ≥2 routes between major zones and one full loop; at least one authored FLOW chain per district.
- Traversable floor area must be purposeful: every room/rooftop/corridor connects to a combat or traversal purpose. No decorative-only spaces larger than 15 m across.
- Playable boundary is communicated physically (walls, cliffs, energy barriers) rather than invisible walls in open areas.
- Each map has distinct palette, silhouette, ambient audio, hazards and callout names.
- Performance: map visual budget within §2.16; collision simplified; occlusion by zones; maps stream district visuals but load colliders/nav once.
- Nav validation: scripts check all pickup nodes/health nodes/spawns reachable, major zones connected, no orphan nav islands, no spawn inside geometry.

### 4.2 VERTEX — futuristic megacity

- **Footprint:** 500×500 m; vertical range −40 m to +160 m.
- **Theme:** rain-slick concrete, dark glass, teal/cyan neon, sodium amber street lights, distant skyline impostors, light fog. Day-night: night.
- **Zones:** Plaza (ground zero), Spire Rooftops (multi-level skyline), Transit Undercity (tunnels/metro), Construction Site (vertical traversal), Skybridge Loop (elevated connector), Corporate Atrium (interior multi-floor).
- **Landmarks:** the Needle (tall central spire), maglev loop, giant holographic ad, collapsed skybridge, metro entrance.
- **Routes:** street level → metro tunnels; plaza → construction scaffolds → rooftops; rooftop wall-run chains around the Needle; interior atrium stairs/elevator shafts (climbable ledges) → skybridge.
- **FLOW:** long wall-run walls along the Spire, slide tunnels in Transit, dash gaps between rooftops, descending momentum chain from Needle to plaza.
- **Combat ranges:** 250 m+ sniper lanes across the plaza and skybridge; close-quarters metro and atrium; mid-range streets.
- **Hazards:** open elevator shafts, traffic lanes with periodic maglev (telegraphed), fall from rooftops (respawn, not elimination unless mode says otherwise).
- **Pickup identity:** snipers on rooftops, shotguns/SMGs in metro, Power weapon in the Needle observation deck.

### 4.3 REACTOR — industrial complex

- **Footprint:** 500×500 m; vertical range −80 m to +100 m.
- **Theme:** rusted steel, amber emergency lighting, steam, concrete, coolant blue accents. Overcast dusk.
- **Zones:** Reactor Core (multi-ring chamber), Cooling Tunnels (underground), Foundry (open hall with catwalks), Rail Yard (long sightlines), Admin Block (interior offices), Cooling Towers (exterior verticality).
- **Landmarks:** the glowing reactor column, two cooling towers, gantry crane, molten metal channel.
- **Routes:** core catwalk rings → cooling tunnels → foundry; rail yard → crane gantries → admin roof; exterior ladders/scaffolds → tower tops; maintenance shafts connect all floors.
- **FLOW:** wall-run around the reactor ring, slide under closing coolant vents, dash across foundry gaps, vertical shaft wall-jump chain.
- **Combat ranges:** close foundry corners, mid rail yard, long core sightlines; heavy vertical play around the reactor.
- **Hazards:** coolant vent jets (telegraphed, damage + push), molten channel (damage/kill), fall into core sump (kill).
- **Pickup identity:** heavies in core/foundry, shotguns in tunnels, snipers on tower catwalks, Power in the reactor control room.

### 4.4 BREACH — floating facility over a void

- **Footprint:** 500×500 m platform spread; vertical range +20 m to +140 m; open void below.
- **Theme:** white/cold-blue composite panels, exposed trusses, cloud sea, harsh sunlight, warning stripes, red emergency accents.
- **Zones:** Dock Ring (spawn platforms), Broken Skybridge, Turbine Platforms, Hangar Island, Maintenance Shafts, Observation Deck.
- **Landmarks:** the broken ring, giant turbine, tilted hangar, beacon tower.
- **Routes:** bridges and ring walkways; dash-gap shortcuts between platforms; wall-run along hull edges; maintenance shafts with vertical drops; aerial routes via updraft pads (telegraphed, push upward).
- **FLOW:** the most demanding map — long dash gaps, wall-run chains around the ring, drop-and-catch routes, updraft launches.
- **Combat ranges:** mid-to-long across gaps, tight interior hangar, vertical duels; fall risk creates risk/reward positioning.
- **Hazards:** void falls (elimination in all modes; 3 s respawn), turbine blades (telegraphed kill), strong winds affecting projectiles slightly in marked zones (optional post-launch; not at launch to preserve predictability).
- **Pickup identity:** snipers on observation deck, Power on isolated central platform reachable by dash chain, shotguns in hangar, mobility-friendly weapons on outer ring.

### 4.5 SECTOR 09 — research campus

- **Footprint:** 700×700 m; vertical range −60 m to +90 m. The large-arena launch map.
- **Theme:** clinical white/green labs, overgrown courtyards, solar glass, underground concrete, warning green accents. Clear morning light.
- **Zones:** Central Courtyard, Laboratories (multi-floor interiors), Hangars (large roofs), Admin Spire, Sublevel Warrens (underground labs), Test Range (outdoor), Solar Field (open sightlines).
- **Landmarks:** the tilted admin spire, giant satellite dish, glass skywalk, containment silo.
- **Routes:** courtyard → labs → skywalk → spire; hangar roofs → solar field; sublevel tunnels connect labs, hangars and silo; exterior maintenance ladders; hidden lab passage behind destructible/vent cover (non-gameplay cosmetic breach optional; route always open).
- **FLOW:** long skywalk wall-runs, slide through lab corridors, dash across solar panel arrays, vertical silo wall-jump chain, rooftop-to-courtyard descent.
- **Combat ranges:** 300 m solar field sightlines, tight lab fights, multi-level courtyard, hangar mid-range.
- **Hazards:** containment silo drop, electrified test grids (telegraphed), fall from skywalk.
- **Pickup identity:** marksman/snipers in solar field and spire, heavies in hangars, energy in labs, Power in the containment silo.

### 4.6 Map weapon coverage and placement

- Each map has 32–40 nodes including mirrored duplicates for team modes; each node has a fixed weapon and tier.
- Across VERTEX, REACTOR, BREACH and SECTOR 09, every one of the 60 weapons appears at least twice. Coverage is generated and asserted in tests; the table lives in `docs/arsenal-coverage.md` once maps exist.
- Power weapons sit in highly contested, exposed or traversal-gated locations with 60 s respawns. Common weapons support immediate fights near spawns.
- Placement avoids spawn-camping: no Power node visible/within 35 m of a default spawn without cover; no pickup inside a spawn safe zone.

### 4.7 Map acceptance criteria

- Playable bounds and collision match; no holes, stuck spots, or unintended out-of-bounds access found by automated sweep + manual traversal.
- At least two routes between every adjacent major zone; one full loop; all FLOW routes traversable by a competent player and by Trickster bots.
- All spawns/pickups/health/ammo reachable by nav graph; no spawn has line of sight to an enemy spawn closer than 40 m.
- Performance within §2.16 on the High preset at 1080p; load ≤10 s.
- Distinct identity verified by side-by-side screenshots and callout map; no lighting-only variants.
- Minimap/compass data and audio zones match actual geometry.

## 5. Game modes

| Mode | Teams | Win condition | Respawn | Notes |
|---|---|---|---|---|
| **Duel** | 1v1 | First to 7 rounds; 90 s per round | No respawn in round; 5 s between rounds | Round-based, single life; pickups reset each round; MMR-rated. |
| **Team Clash** | 4v4 | First to 50 eliminations or highest score at 10:00 | 4 s | Team spawns, assists, team scoreboard; MMR-rated. |
| **Free For All** | 8 solo | First to 25 eliminations or highest at 10:00 | 4 s | Individual spawns, no teams; MMR-rated. |
| **Bot Arena** | 1v1–5v5 | Configurable score/time; endless practice option | Configurable (default 3 s) | Practice only; reduced/capped XP, no ranked/leaderboards. |

- **Match state machine:** loading → warmup (pickups disabled) → countdown → live → overtime/sudden death if tied → post-match → results. Pause only in local/Bot Arena; online matches do not pause.
- **Spawn system:** evaluate candidates by enemy distance, line-of-sight, recent death location, objective pressure; respawn safety, then spawn protection 1.5 s or until firing. Duel rounds use fixed opposing start points.
- **Team balancing:** Team Clash auto-balances between rounds/warmup; no mid-match switch in ranked; party support is post-launch unless needed for launch.
- **Custom matches:** map, mode, score/time limits, bot fill (0–8), bot difficulty, friendly fire, pickup chaos toggle (unranked). Room codes for online custom games.
- **Progression eligibility:** ranked modes and FFA/Clash grant full XP; Bot Arena grants a reduced cap; leaving early counts as a loss/abandon for ranked, with reconnect grace.
- **Spectating:** eliminated players see teammate cameras in Team Clash and a free/death camera in FFA; no enemy-only information leaks in ranked.

## 6. Bot AI specification

### 6.1 Fairness contract

Bots use the same `InputCommand` interface, cooldowns, movement speeds, ammo, pickup rules and hit volumes as humans. Their only advantages are reaction consistency and path knowledge of public map routes. No wallhacks, no perfect tracking, no damage/health multipliers, no hidden pickup timers beyond public map knowledge. Difficulty changes competence, not rules.

### 6.2 Personalities

| Personality | Preferred range | Behaviour traits |
|---|---|---|
| Rusher | 0–12 m | High aggression, sprint/slide entries, SMG/shotgun priority, low retreat threshold. |
| Tracker | 10–30 m | Follows sound/last-known positions, cuts routes, AR/marksman, strong map movement. |
| Sniper | 35 m+ | Holds sightlines, repositions after shots, sniper/marksman priority, weak close range. |
| Trickster | Any | Uses wall-runs/dashes and unexpected vertical routes, flanks, experimental weapons. |
| Duelist | 15–30 m | Adaptive range, strafes, baits, uses cover and off-angles, balanced weapons. |

### 6.3 Difficulty presets

| Preset | Reaction | Aim error | Tracking | Decision cadence | Movement skill |
|---|---|---|---|---|---|
| Recruit | 450 ms | Wide, slow settle | Low | 400 ms | Basic, occasional dash |
| Regular | 300 ms | Moderate | Medium | 250 ms | Competent slide/jump |
| Veteran | 200 ms | Narrow, faster settle | Good | 150 ms | Wall-run/dash routes |
| Elite | 140 ms | Tight | High | 100 ms | Strong FLOW chains |
| Vanta | 100 ms | Very tight, human-like overshoot | Very high | 75 ms | Near-optimal routes |

Aim error is applied as a seeded cone with smoothing and target switching delays; bots do not instantly snap after losing line of sight. All presets obey fire-rate/recoil and cannot shoot through smoke/fog beyond perception rules.

### 6.4 Required bot capabilities and validation

- Navigate every launch map, including vertical and underground routes; never fall into hazards unless knocked back; recover from stuck states within 2 s.
- Collect weapons and ammo, swap intelligently, manage reloads and retreat to heal.
- Use cover, strafe, jump/slide/dash, wall-run where the nav graph allows.
- Fight at appropriate ranges with each weapon category; use alt fires (e.g., Charge Cannon jump, Katana lunge) at least situationally.
- Respect team modes: focus fire, avoid friendly fire, regroup loosely.
- **Soak test:** 30 simulated minutes per map/mode with 8 bots; assert no NaNs, no permanently stuck bot, no invalid state, no runaway memory; log path coverage and combat stats.
- Bots must be beatable by an average player at Regular and challenging at Elite/Vanta without feeling unfair.

## 7. Progression and mastery details

- **Level curve:** requirement for level n→n+1 = `800 + 200·(n−1)` XP; level 100 cap at launch. XP sources: match completion 150, win 500, elimination 100, assist 40, objective/round win 150, FLOW performance bonus up to 100 per match (capped), first win of day 250. Bot Arena XP capped at 40% and disabled for challenges marked ranked-only.
- **Weapon mastery:** weapon XP = 25 per elimination + 0.25 per damage + 10 per match with ≥1 elimination; 20 levels with increasing thresholds; cosmetic unlocks at 5/10/15/20. Mastery is per weapon, persisted, visible on profile.
- **Ranks:** placement 10 rated matches; Elo K=24 with mode-specific rating; tiers: Bronze (<1000), Silver (1000–1199), Gold (1200–1399), Platinum (1400–1599), Diamond (1600–1799), Ascendant (1800–1999), Vanta (2000+). Display current tier + division progress. No rank decay at launch.
- **Challenges:** 3 daily + 5 weekly from a curated pool, seeded by date, progress from eligible matches only. Rewards: XP and cosmetic tokens; no stat advantages.
- **Leaderboards:** top 100 global by rating, wins, eliminations, and per-weapon mastery; filters by mode and season. Season 0 begins at launch; season length 8 weeks.
- **Cosmetics:** weapon finishes/colorways, reticles, charms, player cards, banners, trails, elimination effects. Purely visual; hitboxes and visibility unchanged (no pay-to-win, no invisible-camo style advantages).
- **Profile:** level, rank, career stats, per-weapon stats, mastery showcase, favorite weapon, recent matches, achievements. Public/private toggle.

## 8. Visual and audio direction

### 8.1 Brand and palette

Industrial futurism: graphite/near-black surfaces, warm signal amber primary accent, cold cyan secondary, off-white type. Avoid purple/pink gradient clichés. Each map has a distinct palette and landmark silhouette (VERTEX teal night, REACTOR amber rust, BREACH cold blue/white, SECTOR 09 clinical green). UI uses condensed technical display type + mono numerals, strong grid alignment, restrained motion.

### 8.2 In-game visual priorities

- Readable enemy silhouettes against every map palette; team/enemy color separation with colorblind palettes; no excessive bloom/fog over player models.
- Weapon viewmodels with distinct silhouettes, believable proportions, animated hands (procedural), material contrast between metal/polymer/emissive parts.
- Muzzle flash, tracers, impact sparks/decals, shell casings, projectile trails, charge/heat indicators, shield-break effects, elimination dissolve/ragdoll-free feedback, FLOW speed lines/trails.
- Clean HUD hierarchy, minimal clutter, scaling, safe areas, no fake bars.
- Menus: cinematic 3D background (menu-only R3F scene), clear CTAs, keyboard navigation, no stock template look.

### 8.3 Audio priorities

- Punchy, distinct weapon reports; suppressed variants; distance layers and indoor tails; footsteps by surface; FLOW wind and chain cues; shield/health feedback; directional damage; pickup and Power-spawn cues; restrained industrial music with intensity layers.
- Synthesis-first; no unlicensed samples. Audio must remain informative under load; limiter and ducking prevent clipping.

## 9. Controls and settings (defaults)

| Action | Default |
|---|---|
| Move | W A S D |
| Look | Mouse (pointer lock) |
| Jump / double jump / wall-jump | Space |
| Sprint | Shift (hold; toggle option) |
| Crouch / slide | Ctrl (hold; toggle option) |
| Fire / alt fire | Left mouse / right mouse |
| Aim (ADS) | Right mouse hold (weapons with ADS) |
| Reload | R |
| Air dash | Q (also mouse side button option) |
| Interact / swap pickup | E (hold when occupied) |
| Weapon slots | 1 primary, 2 secondary, 3 melee, mouse wheel cycle |
| Scoreboard | Tab |
| Pause / settings | Esc |
| Push-to-talk / chat | T / Y (text chat only at launch) |

Settings: sensitivity + ADS multiplier, invert Y, FOV 70–110, separate volumes, quality preset + individual toggles, shake scale, reduced flashes, colorblind mode, UI scale, crosshair customization, toggle/hold options, master volume, subtitles/captions. Keybind remapping with conflict detection and reset. Settings persist locally and (online) per profile.

## 10. Milestone roadmap

Phases group related workstreams; milestones are ordered by dependency, not by phase number. Some milestones (noted) span phases.

### 10.1 Phase → milestone map

| Phase | Milestones |
|---|---|
| 1 — Inspection and architecture | M0 |
| 2 — Playable FPS foundation | M1, M2, M3, M4, M5 |
| 3 — FLOW movement | M6 |
| 4 — Combat foundation | M5, M20 |
| 5 — Modular weapon architecture | M7, M8 |
| 6 — Complete 60-weapon arsenal | M9, M10, M11, M12 |
| 7 — Large map architecture | M13 |
| 8 — Four launch maps | M14, M15, M16, M17 |
| 9 — Bot AI | M18, M19 |
| 10 — Multiplayer | M21, M22, M23 |
| 11 — Game modes | M20 |
| 12 — Progression and customization | M24 |
| 13 — Visual, audio and gameplay polish | M25, M26 |
| 14 — Performance optimization and testing | M27 |
| 15 — Final integration and release readiness | M28 |

### 10.2 Roadmap summary

| ID | Milestone | Phase | Size | Status | Depends on |
|---|---|---|---|---|---|
| M0 | Repository inspection and master plan | 1 | S | **COMPLETED** | — |
| M1 | Workspace scaffolding and toolchain | 2 | M | **COMPLETED** | M0 |
| M2 | Rendering core and scene framework | 2 | L | **IN PROGRESS** | M1 |
| M3 | Physics world and collider pipeline | 2 | L | **IN PROGRESS** (headless verified) | M1, M2 |
| M4 | Player controller, camera and input | 2 | L | **IN PROGRESS** (implemented, browser QA pending) | M2, M3 |
| M5 | Combat foundation, HUD v1 and Proving Grounds | 2/4 | L | **IN PROGRESS** (implemented, browser QA pending) | M3, M4 |
| M6 | FLOW movement suite | 3 | L | NOT STARTED | M3, M4 |
| M7 | Modular weapon framework | 5 | L | NOT STARTED | M5 |
| M8 | Pickups, inventory and ammo economy | 5 | M | NOT STARTED | M7 |
| M9 | Arsenal Wave A — AR, SMG, Shotgun (18) | 6 | L | NOT STARTED | M7 |
| M10 | Arsenal Wave B — Sniper, Marksman, Pistol (18) | 6 | L | NOT STARTED | M7 |
| M11 | Arsenal Wave C — Energy, Heavy, Experimental, Melee (24) | 6 | XL | NOT STARTED | M7 |
| M12 | Arsenal production pass — models, animation, audio, validation | 6 | XL | NOT STARTED | M9–M11 |
| M13 | Map framework, modular kit and navigation data | 7 | XL | NOT STARTED | M2, M3, M7 |
| M14 | VERTEX | 8 | XL | NOT STARTED | M13, M8, M12 |
| M15 | REACTOR | 8 | XL | NOT STARTED | M13, M8, M12 |
| M16 | BREACH | 8 | XL | NOT STARTED | M13, M8, M12 |
| M17 | SECTOR 09 | 8 | XL | NOT STARTED | M13, M8, M12 |
| M18 | Bot AI foundation — nav, perception, fairness | 9 | L | NOT STARTED | M6, M13, M14 |
| M19 | Bot combat, personalities and difficulty | 9 | L | NOT STARTED | M9–M12, M18 |
| M20 | Match framework and game modes | 11 | L | NOT STARTED | M8, M19 |
| M21 | Direct-session transport and host simulation | 10 | XL | NOT STARTED | M20 |
| M22 | Joiner prediction, interpolation and lag compensation | 10 | XL | NOT STARTED | M21 |
| M23 | Direct-link UX, resilience and network testing | 10 | L | NOT STARTED | M22 |
| M24 | Local progression, profiles and records | 12 | L | NOT STARTED | M20, M23 |
| M25 | Menus, settings, HUD v2 and accessibility | 13 | M | NOT STARTED | M5, M20 |
| M26 | Visual, audio and gameplay polish | 13 | L | NOT STARTED | M12, M14–M17, M25 |
| M27 | Performance optimization and QA hardening | 14 | L | NOT STARTED | M26 |
| M28 | Final integration, balance and release readiness | 15 | L | NOT STARTED | M27, all |

**Total:** 29 milestones (M0–M28); 2 COMPLETED, 4 IN PROGRESS (M2–M5), 23 NOT STARTED. XL milestones must be split into tracked subtasks before implementation and may span multiple "continue" sessions.

### 10.3 Milestone details

#### M0 — Repository inspection and master plan
- **Status:** COMPLETED (2026-10-30). **Size:** S.
- **Objective:** Inspect the repository, identify constraints, decide the architecture, and produce this plan.
- **Features:** Full tree/git/README inspection; stack decision; system architecture; 60-weapon specification; map/mode/AI/multiplayer/progression specifications; dependency-ordered roadmap.
- **Files:** `plan.md` (created); `README.md` (read, preserved).
- **Dependencies:** none.
- **Acceptance:** Plan covers every required system; 60 weapons present and counted; 4 maps specified; 29 milestones with acceptance/testing/DoD; fresh session can resume.
- **Testing:** Verified repository findings against `git ls-files` and directory listing; file saved and read back. No code checks applicable (no code exists).
- **DoD:** Plan saved; nothing else implemented, per instruction.

#### M1 — Workspace scaffolding and toolchain
- **Status:** COMPLETED (2026-10-30). **Size:** M.
- **Objective:** Create a runnable React + Vite + TypeScript application shell with the chosen dependencies, tests, linting, and Freebuff preview/build commands.
- **Features:** Bun project init; `package.json` scripts (`dev`, `build`, `typecheck`, `test`, `lint`); Vite config bound to 0.0.0.0 with HMR disabled per Freebuff; TypeScript strict config; index.html + main.tsx + App.tsx; Tailwind + base theme tokens; error boundary; routing for `/`, `/play`, `/arsenal`, `/settings`, `/profile`; lazy loading; Vitest + jsdom setup; ESLint; `.gitignore`; install Three, Rapier, React Router, Zustand, Tailwind, test deps; save `freebuff-preview` install/dev/build commands.
- **Files:** root configs, `src/main.tsx`, `src/App.tsx`, `src/index.css`, `src/ui/shell/*`, `src/test/setup.ts`.
- **Dependencies:** M0.
- **Acceptance:** App renders a branded VANTA shell (title/menu placeholder with real navigation, not fake buttons); no template leftovers; typecheck/test/lint pass; production `vite build` succeeds when run at the gate; preview readiness succeeds with no console errors; commands saved.
- **Testing (2026-10-30):** `bun install` — PASS; `bun tsc -b --noEmit` — PASS; `bun run test` — PASS (19/19); `bun run lint` — PASS; `freebuff-preview start` — READY (HTTP 200); all five application routes returned 200; preview install/dev/build commands saved. Production `vite build` was **not run** because Freebuff policy requires an explicit user request for a full production build; the command is registered for the milestone/deploy gate. A Playwright screenshot attempt was blocked by missing Chromium system libraries (`libglib-2.0.so.0`), so no pixel-level visual claim is made.
- **DoD:** Shell is the foundation for M2–M5; settings store and route guard patterns ready for later auth.

#### M2 — Rendering core and scene framework
- **Status:** IN PROGRESS (M2.1/M2.2 complete; M2.3 implemented with automated checks passing, browser runtime acceptance pending — 2026-10-30). **Size:** L.
- **Objective:** Establish the Three.js renderer, quality presets, camera stack, procedural material library and a greybox scene to prove performance and structure.
- **Features:** `GameRenderer` lifecycle; separate menu R3F canvas (later) vs gameplay canvas; renderer settings (sRGB, tonemapping, antialias); quality presets Low/Medium/High/Ultra with DPI scaling; camera controller hooks; sky/fog; procedural texture/material cache; asset manifest/loading screen; object pools; perf overlay; resize handling; WebGL context-loss recovery; debug developer flags; greybox test scene.
- **Files:** `src/client/render/**`, `src/client/perf/**`, `src/game/data/assets.ts`, `src/ui/pages/PlayPage.tsx` (mount point only).
- **Dependencies:** M1.
- **Progress:**
  - **M2.1 — COMPLETED (2026-10-30):** `GameRenderer` lifecycle, attached `#game-viewport` on `/play`, WebGL2 failure fallback, start/stop/dispose, frame loop, ResizeObserver + DPR scaling, renderer settings (sRGB, ACES tone mapping, antialias), Low/Medium/High/Ultra quality presets (pixel ratio, shadows, shadow resolution, fog range), persisted quality selection, reduced-motion pause, and a procedural Sector 09 staging scene.
  - **M2.2 — COMPLETED (2026-10-30):** FOV-aware `CameraRig` with viewport/projection, additive FOV kick, lean and shake hooks; seven-surface procedural `DataTexture` catalogue and shared `MeshStandardMaterial` cache (no canvas/DOM generation); shader sky dome with sun disc/halo and horizon/zenith blend; matched fog pass and instanced distant skyline; staged async renderer loader tied to actual material jobs plus scene assembly and shader prewarm; real percentage/stage loading surface on `/play`; setting-driven FOV propagated into the renderer.
  - **M2.3 — IMPLEMENTED, BROWSER QA PENDING (2026-10-30):** canvas `webglcontextlost` handling prevents the default teardown, pauses RAF, resets stale performance samples and surfaces a recovery state; `webglcontextrestored` resizes the new drawing buffer, invalidates shadow maps, recompiles/renders the retained scene and restarts the loop without a reload. A bounded `RendererPerformanceMonitor` samples rolling 2 s FPS/frame/p95/worst plus draw calls, triangles, textures, geometries, programs, buffer/DPR, quality and recovery count, publishing at 4 Hz so React never updates per frame. `/play` has a live perf overlay and F3 toggle. The greybox now includes a two-level catwalk with stairs and railings, cargo bank, floodlight masts, service pipes, perimeter cover and representative verticality. Automated tests cover sampler math/cadence/reset/stall handling, context listener semantics and greybox triangle budget.
- **Acceptance:** Greybox scene renders at target frame budget on High; presets change measurable settings; context loss recovers without a reload; no React re-render per frame; loading screen progress is real; no memory growth over 5 minutes idle.
- **Testing (M2.3):** `bun tsc -b --noEmit` PASS; `bun run lint` PASS; `bun run test` PASS (15 files / 45 tests), including rolling FPS/p95 math, 36,000-frame sample-window bound, subscriber cadence, suspended-tab gap handling, reset, context-loss prevention/recovery count/detach and expanded greybox zone/triangle checks; `freebuff-preview start` READY and `/`, `/play`, `/settings`, the perf monitor, context recovery, overlay, renderer, canvas and scene modules all returned HTTP 200 with clean Vite logs. **Real WebGL context loss/restore, 5-minute idle memory growth and the 1080p High frame baseline are NOT RUN** because Chromium still cannot launch in this sandbox (`libglib-2.0.so.0` missing). The overlay has not been visually inspected. No recovery, FPS or memory claim is made.
- **Testing (M2.1):** `bun tsc -b --noEmit` PASS; `bun run lint` PASS; `bun run test` PASS (29/29) covering quality math, scene construction/quality/disposal, unavailable-WebGL failure path, canvas mount and persisted quality; preview restart READY and renderer modules compiled (HTTP 200, Three optimized). Pixel-level WebGL verification remains blocked in this sandbox because Chromium cannot launch (`libglib-2.0.so.0` missing); no visual-pass claim is made yet.
- **Testing (M2.2):** `bun tsc -b --noEmit` PASS; `bun run lint` PASS; `bun run test` PASS (13 files / 36 tests) including camera clamping/pose/shake, deterministic surface maps/cache/disposal, scene sky/texture/anisotropy checks and unavailable-WebGL loader refusal; `freebuff-preview start` READY; `/`, `/play`, `/arsenal`, `/settings`, `/profile` and all new render modules returned 200 with no Vite errors. Real WebGL pixels remain unverified in this environment; no visual-pass claim is made.
- **DoD:** Renderer API documented enough for M3/M14 integration; M2.2 and M2.3 must close before M2 is complete. M3 may proceed against the stable renderer API while TD-01 browser QA remains release-blocking; this does not make M2 complete.

#### M3 — Physics world and collider pipeline
- **Status:** IN PROGRESS (headless implementation verified; manual preview traversal pending — 2026-10-30). **Size:** L.
- **Objective:** Integrate Rapier with a fixed-step loop, shared physics utilities and a data-driven static collider builder.
- **Features:** Rapier world wrapper; layer/filter constants; 60 Hz accumulator and catch-up cap; kinematic character controller wrapper; slope/step/snap tuning; collider kit builders (box, ramp, cylinder, stairs); static collider compilation from layout data; query API (ray, shapecast); CCD for fast bodies; debug wireframes; headless physics step harness.
- **Files:** `src/game/sim/physics/*`, `src/game/data/maps/kit/colliders.ts`, `src/client/render/debug/PhysicsDebug.ts`, `src/test/physics/*`.
- **Dependencies:** M1, M2.
- **Progress:**
  - **M3 — HEADLESS IMPLEMENTED, MANUAL PREVIEW PENDING (2026-10-30):** Rapier `0.21.0` now runs behind a single-init `PhysicsWorld` with a fixed 1/60 s timestep, two CCD substeps and a dynamic-sphere harness. `FixedStepClock` deterministically accumulates render deltas, publishes interpolation alpha and caps catch-up at five steps while discarding suspended-tab backlog. Collision layers pack membership/filter bits for world, player, enemy, projectile, pickup, trigger and debris; query helpers provide layer-filtered raycasts and ball/capsule shapecasts. A serializable map-kit schema compiles boxes, solid triangular ramps, cylinders and expanded autostep stairs into one fixed body with stable per-shape ids and full cleanup. `KinematicCharacter` wraps Rapier's capsule controller with 0.32 m autostep, 0.22 m ground snap, 48° climb / 38° slide limits and explicit caller-owned world stepping. `PhysicsDebugWireframes` consumes Rapier's live debug buffers so the Three.js overlay is generated from the actual collider set rather than a parallel approximation. A 60 Hz headless qualification lane traverses flat ground, a ramp, a 2 m gap, a landing deck and five stairs; the manual browser traversal is deferred because M4 owns player input and Chromium remains unavailable.
- **Acceptance:** Test course traverses ramps/stairs/gaps without jitter or tunneling; deterministic step count for fixed input; debug view matches colliders; headless test runs without a browser; no leaked physics handles after world reset.
- **Testing (M3):** `bun tsc -b --noEmit` PASS; `bun run lint` PASS; `bun run test` PASS (20 files / 63 tests). New tests cover 60-step cadence, catch-up cap/reset, collision-group symmetry, collider-kit geometry and stair expansion, Rapier-backed debug bounds, headless ramp→gap-jump→stairs traversal with flat-surface stability assertions, layer-filtered ray and shapecast hits, CCD against thin ground, and three clean create/dispose cycles with zero remaining bodies, colliders or controllers. `freebuff-preview start` READY; `/`, `/play`, `/settings`, `/profile` and all new physics/debug modules returned HTTP 200. **Manual preview traversal and visual collider inspection were NOT RUN:** the playable controller arrives in M4, and Chromium still cannot launch (`libglib-2.0.so.0` missing). No visual or game-feel claim is made.
- **DoD:** Physics layer stable for controller and map work. Headless acceptance is closed; only manual preview traversal remains before M3 is marked complete, carried into M4 integration.

#### M4 — Player controller, camera and input
- **Status:** IN PROGRESS (implementation and headless acceptance pass; browser playtest pending — 2026-10-31). **Size:** L.
- **Objective:** Deliver a responsive first-person controller with pointer lock, mouse look and core ground/air movement.
- **Features:** Input action map + rebinding foundation; raw mouse/pointer lock; sensitivity/ADS settings; WASD accel/friction; sprint; crouch; jump with gravity; coyote/buffer foundation; camera hierarchy; FOV transitions; view bob/landing dip; pause/unlock handling; settings persistence; local player entity and sim loop glue; debug readouts (speed, grounded, state).
- **Files:** `src/client/input/*`, `src/client/render/camera/*`, `src/game/sim/player/*`, `movement/*`, `src/ui/pages/PlayPage.tsx`, `src/client/state/settings.ts`.
- **Dependencies:** M2, M3 (headless physics API stable; close M3's manual course acceptance during this milestone).
- **Progress:**
  - **M4 — IMPLEMENTED, BROWSER PLAYTEST PENDING (2026-10-31):** A deterministic `PlayerMotor` now owns velocity, acceleration/deceleration, sprint, crouch speed, jump, coyote time, jump buffering and landing impact with no DOM/Three/Physics dependency. `LocalPlayerSimulation` runs the exact 60 Hz fixed step against the real M3 course, includes a fall/respawn guard, and resizes the actual Rapier capsule for crouch; standing is refused when the expanded crown would intersect a ceiling, and modified collider positions are propagated before the next character query. `InputBindingMap` supplies conflict-checked rebinding foundation, while `InputController` converts pointer-locked mouse/keyboard events into one frame sample with raw look deltas, jump edges, toggle/hold sprint and full held-input clearing on unlock/blur. `FirstPersonCamera` adds sensitivity-aware YXZ look, pitch clamp, crouch eye smoothing, grounded head bob, landing dip, sprint/crouch FOV transitions and reduced-motion suppression. `PlayablePlayer` interpolates fixed-step positions, pauses on unlock, publishes bounded 4 Hz telemetry and builds its visible ramp/gap/stairs lane from the same collider layout the sim compiles. `GameRenderer` now accepts a frame controller; `/play` exposes a pointer-lock entry surface, crosshair, live speed/state/tick HUD and pause notice. ADS sensitivity remains deferred to M7 because no aim state exists yet; no unused/fake ADS toggle was added.
- **Acceptance:** Movement feels immediate (no artificial acceleration delay); pointer lock enters/exits cleanly; jump/land stable at 60 Hz with render interpolation; settings persist across reload; no camera clipping into geometry in the test course; headless movement tests pass.
- **Testing (M4):** `bun tsc -b --noEmit` PASS; `bun run lint` PASS; `bun run test` PASS (26 files / 86 tests). New tests cover first-tick acceleration, speed/friction/sprint/crouch limits, coyote/buffer jumps, deterministic movement sequences, crouch capsule resizing and blocked standing under a low ceiling, full ramp→2 m gap→stairs traversal through the controller sim, fall respawn, input remapping/pointer lock/jump edges/unlock clearing, camera pitch/invert/bob/landing/FOV behavior, collider-derived course geometry, and player pause/interpolation/disposal. `freebuff-preview start` READY; `/`, `/play`, `/settings`, `/profile` and all new player/input/camera/course modules returned HTTP 200 with clean Vite logs. **Real pointer lock, mouse look, browser movement feel, camera clipping and the M3 manual course traversal were NOT RUN:** no browser executable is available in the sandbox (`libglib-2.0.so.0` missing). No feel, visual or M3/M4 completion claim is made.
- **DoD:** Controller ready for FLOW expansion (M6) and weapon mounting (M7). M4 remains IN PROGRESS until the browser pointer-lock/feel pass and M3's carried manual traversal are executed.

#### M5 — Combat foundation, HUD v1 and Proving Grounds
- **Status:** IN PROGRESS (implementation and headless acceptance pass; browser combat/visual QA pending — 2026-10-31). **Size:** L.
- **Objective:** First playable combat loop: shooting, damage, elimination, respawn, functional HUD, and a dedicated testing ground.
- **Features:** Prototype hitscan rifle; hitbox volumes; health/shield; damage events; headshot/leg multipliers; elimination/respawn; target dummies + damage readout; Proving Grounds greybox (wall-run lane, dash gap, slide tunnel, target range, pickups hook); crosshair with spread; hitmarkers; health/shield/ammo HUD; killfeed; damage direction; respawn prompt; sim event bus; minimal match state for solo testing.
- **Files:** `src/game/sim/combat/*`, `src/game/sim/events/*`, `src/game/sim/match/*`, `src/game/data/maps/provingGrounds/*`, `src/client/render/combat/*`, `src/client/player/*`, `src/ui/hud/*`, tests.
- **Dependencies:** M3, M4 (headless APIs stable; browser acceptance carried).
- **Progress:**
  - **M5 — IMPLEMENTED, BROWSER COMBAT/VISUAL QA PENDING (2026-10-31):** A new `PROVING_GROUNDS` layout joins the existing movement qualification with a target gallery, wall-run corridor, 3.5 m traversal gap, low slide roof and reserved M8 pickup anchors. `LocalCombatSimulation` runs at the fixed 60 Hz tick and owns player vitals (100 health / 100 regenerating shield), the VK-7 prototype rifle (30-round magazine, 210 reserve, 1.4 s reload, 0.105 s cadence), deterministic spread, falloff, typed events, a training damage hazard, three target dummies with 100/50 vitals and four-second respawns, and solo-match elimination/respawn stats. Real head/torso/two-leg hitbox volumes are resolved geometrically, while world-ray occluders prevent shooting through geometry. `SimEventBus` is bounded and typed; damage, elimination, respawn and shot outcomes flow from the sim to the HUD. Target dummies, health bars, hazard pulse, tracers, impact sparks and muzzle flash are generated from the same data/hitbox landmarks. HUD v1 reads only live snapshots/events for shield/health, ammo/reserve/reload, target telemetry, dynamic spread crosshair, hitmarkers, killfeed, damage direction and the responsive respawn prompt. A training hazard is the real damage source used to verify the death loop; no fake enemy fire was added. M6 movement geometry is present but slide/wall-run/dash mechanics remain M6 work and are not claimed.
- **Acceptance:** Player can shoot dummies, see correct damage/headshots, die, respawn and see accurate HUD; no fake values; events are typed; headless elimination scenario passes; FPS budget maintained.
- **Testing (M5):** `bun tsc -b --noEmit` PASS; `bun run lint` PASS; `bun run test` PASS (34 files / 111 tests). New tests cover shield-first damage/overflow/lethal resets, shield restoration, head/torso/leg and rotated capsules, rifle cadence/ammo/reload/falloff/spread, bounded typed events, target and player elimination/respawn, shield regeneration, world occlusion, full camera-input→rifle→target elimination telemetry, proving-grounds layout/target distances/anchors, and the HUD mounted against a real `PlayablePlayer`. `freebuff-preview start` READY; `/`, `/play`, `/settings`, `/profile`, HUD/combat/render/map/player modules all returned HTTP 200 with clean Vite logs. **Real rifle feel, HUD pixel/layout, target visuals, pointer-lock firing, damage-direction legibility, hazard death/respawn and frame budget were NOT RUN:** no browser executable is available (`libglib-2.0.so.0` missing). No visual, feel or browser HUD claim is made.
- **DoD:** A complete, honest playable slice exists in headless tests; weapon work can proceed after browser acceptance or with visual/perf debt explicitly carried. M5 remains IN PROGRESS until TD-03 closes.

#### M6 — FLOW movement suite
- **Status:** NOT STARTED. **Size:** L.
- **Objective:** Implement the full movement kit and the FLOW meter with responsive feedback, without combat advantages.
- **Features:** Slide (entry/decay/steering), slide-jump momentum, double jump, wall detection/wall-run (limit, camera lean), wall-jump, air dash with charge/cooldown/refund, coyote/buffer completion, air control, crouch-slide transitions, landing compression; FLOW accrual/decay/tiers/Overdrive; movement-only reward (dash cooldown); HUD meter/tiers; speed lines/trails/wind audio; tutorial prompts in Proving Grounds; authored flow route test lanes.
- **Files:** `src/game/sim/movement/*`, `flow/*`, `src/ui/hud/FlowMeter.tsx`, `src/client/render/fx/FlowFx.ts`, `src/client/audio/flow.ts`, tests.
- **Dependencies:** M3, M4.
- **Acceptance:** Every mechanic works with documented tuning; deterministic input-sequence tests assert speeds/heights/distances within tolerance; FLOW rises/decays from specified actions and never changes damage/health; no state soft-locks; wall-run/dash usable in the Proving Grounds lanes; accessibility scaling works.
- **Testing:** Unit tests for each state and flow math; scenario tests for chains; manual feel pass; perf check.
- **DoD:** Movement pillar functional and measurable; FLOW routes can be authored for maps.

#### M7 — Modular weapon framework
- **Status:** NOT STARTED. **Size:** L.
- **Objective:** Build the data-driven weapon/runtime architecture that will host all 60 weapons.
- **Features:** Weapon definition schema + validator; arsenal registry; slot/inventory model; runtime state machine; hitscan/ballistic/beam/melee handlers; ammo/reload/charge/heat; spread, recoil pattern, ADS; alt fire; mechanic handler registry; damage/falloff/splash/penetration; host-validatable fire intents; procedural viewmodel rig + blockout models; muzzle/tracer/impact FX; weapon audio profiles; three prototype weapons (Viper, Crossfire or Nova, Knife) proving each path; tests.
- **Files:** `src/game/data/weapons/*`, `src/game/sim/weapons/**`, `projectiles/**`, `src/client/render/viewmodel/**`, `src/client/audio/weapons/**`, tests.
- **Dependencies:** M5.
- **Acceptance:** Three prototypes behave distinctly; state machine covers empty/reload/swap/charge/overheat; no weapon-specific branching in player code; definitions validate and reject bad data; host fire validation has tests; headless weapon harness passes; HUD reads ammo/heat from sim.
- **Testing:** Unit tests for state machine, ammo, cooldowns, effects; headless firing scenarios; preview.
- **DoD:** Arsenal waves can be added without architectural changes (extensions via handlers only).

#### M8 — Pickups, inventory and ammo economy
- **Status:** NOT STARTED. **Size:** M.
- **Objective:** Implement map weapon pickups, slot swapping, respawn timers and ammo/health economy.
- **Features:** Pickup node schema/compiler; host-owned pickup entities; fixed weapon assignment; tier timers; start-of-match stagger; world pedestal/hologram/placeholder model; prompt UI; instant free-slot pickup, hold-to-swap; dropped-weapon policy (discard v1); ammo pools/crates; health pickups; infinite starter pistol reserve; pickup announcements; Proving Grounds pickup layout; event/HUD integration; respawn and match-state gating.
- **Files:** `src/game/sim/pickups/*`, `inventory.ts`, `src/game/data/maps/*/pickups.ts`, `src/client/render/pickups/*`, `src/ui/hud/InteractionPrompt.tsx`, tests.
- **Dependencies:** M7.
- **Acceptance:** Full spawn→pickup→timer→respawn cycle works; slots swap correctly with tier/starter rules; ammo refills match pools; timers pause outside live state; no double-pickup exploit; validator catches duplicate/overlapping nodes; all pickup rules headless-tested.
- **Testing:** Headless pickup/respawn tests; inventory tests; manual Proving Grounds pass.
- **DoD:** Map placement can begin once maps exist; system is netcode-ready (state/events separated).

#### M9 — Arsenal Wave A: Assault rifles, SMGs, Shotguns (18)
- **Status:** NOT STARTED. **Size:** L.
- **Objective:** Implement the 6 ARs, 6 SMGs and 6 shotguns with distinct mechanics.
- **Features:** Viper, Havoc, Sentinel, Pulse, Axiom, M4X; Spectre, Vector, Tempest, Raptor, Lynx, Scorpion; Reaper, Breacher, Scatter, Doom, Jackal, Hammer. Includes burst/ramp/underbarrel, airborne accuracy, DoT venom, pellet/slug/knockback shotgun behaviour. Functional blockout viewmodels, crosshairs, audio profiles, Proving Grounds stations, bot hints.
- **Files:** `src/game/data/weapons/{ar,smg,shotgun}/`, mechanics handlers, weapon tests, viewmodel parameter data.
- **Dependencies:** M7.
- **Acceptance:** 18 definitions validate + 18 mechanics verified in Proving Grounds; fire/reload/ammo tests per weapon; distinct identity documented; all usable by the generic weapon runtime; no placeholder audio (procedural profiles count as functional).
- **Testing:** Per-weapon unit tests; headless TTK/falloff suite; manual firing range.
- **DoD:** Wave A accepted; balance notes recorded (final tuning deferred).

#### M10 — Arsenal Wave B: Sniper rifles, Marksman rifles, Pistols (18)
- **Status:** NOT STARTED. **Size:** L.
- **Objective:** Implement the 6 snipers, 6 marksman rifles and 6 pistols.
- **Features:** Longshot, Eclipse, Widow, Railgun, Ghost, Horizon; Ranger, DMR-9, Falcon, Kestrel, Crossfire, Nomad; Burst, Heavy, Machine, Dual, Energy, Hand Cannon. Includes charge-pierce, variable zoom, quick-scope, ballistic leading, akimbo, plasma splash and infinite-reserve starter rules; scope overlays/optics; slow movement modifiers.
- **Files:** categories above, scope rendering (`src/client/render/viewmodel/optics/*`), projectile handlers.
- **Dependencies:** M7, M8 (starter pistol integration).
- **Acceptance:** 18 definitions validate; scopes render functionally with accurate zoom/FOV; charge/penetration/lag-friendly projectiles tested; starter pistol remains always usable; distinct identities.
- **Testing:** Per-weapon tests; headless penetration/falloff; scope visual check; manual range.
- **DoD:** Wave B accepted.

#### M11 — Arsenal Wave C: Energy, Heavy, Experimental, Melee (24)
- **Status:** NOT STARTED. **Size:** XL (split into four tracked category subtasks).
- **Objective:** Implement the 6 energy weapons, 6 heavy weapons, 6 experimental weapons and 6 melee weapons, including all unique mechanics.
- **Features:** Volt, Arc, Nova, Disruptor, Beam, Photon; Ravager, Titan, Devastator, Cyclone, Anvil, Meteor; Gravity Cannon, Crossbow, Flamethrower, Ricochet, Charge Cannon, Particle Accelerator; Knife, Katana, Energy Blade, Dual Blades, Hammer, Shock Baton. Heat/chain/AoE/EMP/beam ramps; spin-ups, rockets, bouncing grenades, arcing mortar; gravity field, sticky detonation, cone burn, ricochet, self-knockback, piercing beam; melee combo/lunge/backstab/stun/AoE.
- **Files:** category data + mechanics handlers, projectiles/special entities, melee runtime, status effects, tests.
- **Dependencies:** M7, M8.
- **Acceptance:** 24 definitions validate; all 60 total now present; each unique mechanic verified in isolation and in a live bot skirmish; status effects (burn, slow, stun, EMP) have clear HUD feedback and host validation; no untested weapon at wave completion.
- **Testing:** Per-weapon tests; status-effect stacking rules; headless special-mechanic scenarios; manual range.
- **DoD:** Full arsenal mechanically complete; M12 production pass remains.

#### M12 — Arsenal production pass: models, animation, audio, validation
- **Status:** NOT STARTED. **Size:** XL (multiple sessions).
- **Objective:** Replace all functional blockouts with final-looking procedural models, animations and audio; validate the complete arsenal.
- **Features:** Final part-based models for 60 weapons with distinct silhouettes and 3 LODs; materials/emissive trims; world pickup models; equipping/holstering, fire recoil, reload/charge/overheat choreography, melee swings, inspect animation; first-person hands; muzzle flash/shell/tracer profiles; synthesized audio final pass; crosshair/reticle pass; all weapon stations complete in Proving Grounds; generated arsenal coverage report.
- **Files:** `src/client/render/viewmodel/**`, `src/client/audio/**`, `src/game/data/weapons/model/*`, `docs/arsenal-coverage.md` (after maps), tests.
- **Dependencies:** M9, M10, M11.
- **Acceptance:** All 60 have non-placeholder silhouettes, animation, SFX and distinct feel; no missing LOD/world model; validation test asserts exactly 60 and mechanics registered; frame budget holds with viewmodel; no placeholder references remain (`TODO`, `blockout` tags audited).
- **Testing:** Automated asset/definition audit; visual contact sheet; per-category animation review; perf check.
- **DoD:** Arsenal is shippable visually and mechanically, pending final balance.

#### M13 — Map framework, modular kit and navigation data
- **Status:** NOT STARTED. **Size:** XL.
- **Objective:** Build the reusable map pipeline: kit geometry, collider compiler, zones/occlusion, spawn/pickup/nav data, streaming and validation tooling.
- **Features:** MapDefinition schema; modular kit (floors, walls, ramps, stairs, catwalks, tunnels, roofs, pipes, doors, windows, hero-prop builders); procedural materials; collider compiler from layout; nav graph authoring + A* consumer; pickup/spawn compiler; zone streaming/visibility groups; audio zones; kill/out-of-bounds volumes; map validator CLI; minimap/compass data generation; greybox district to prove the kit.
- **Files:** `src/game/data/maps/kit/*`, `src/client/render/maps/kit/*`, `src/game/sim/nav/*`, `scripts/validate-map.ts`, `docs/map-authoring.md`.
- **Dependencies:** M2, M3, M7.
- **Acceptance:** One greybox district built end-to-end through data → render → collider → nav; validator catches unreachable pickups/spawns, overlaps, missing zones; nav pathfinder works; zone toggling measurable; docs allow adding a map without engine changes.
- **Testing:** Kit renderer/collider tests; validator fixture tests; pathfinding tests; perf budget for district.
- **DoD:** Four maps can be authored in parallel with confidence.

#### M14 — Map: VERTEX
- **Status:** NOT STARTED. **Size:** XL (blockout, flow pass, art pass, gameplay pass).
- **Objective:** Build the 500×500 m futuristic megacity map to launch quality.
- **Features:** Plaza, Spire Rooftops, Transit Undercity, Construction, Skybridge Loop, Corporate Atrium; Needle and maglev landmarks; sniper lanes; wall-run/dash/slide routes; 40+ spawns; 32–40 fixed pickup nodes; hazards; audio zones; skyline; minimap/callouts.
- **Files:** `src/game/data/maps/vertex/**`, `src/client/render/maps/vertex/**`, pickups/nav/spawns/zones.
- **Dependencies:** M13, M8, M12.
- **Acceptance:** Meets §4.2 and §4.7; nav validation passes; playable traversal/combat verified with bots (once M19 available) and manual; perf within budget; all intended weapons placed including ≥2 of each covered globally later.
- **Testing:** Map validator, nav soak, manual traversal/sightline review, perf benchmark, screenshots.
- **DoD:** VERTEX playable in all modes.

#### M15 — Map: REACTOR
- **Status:** NOT STARTED. **Size:** XL.
- **Objective:** Build the 500×500 m industrial reactor complex.
- **Features:** Reactor Core rings, Cooling Tunnels, Foundry, Rail Yard, Admin Block, Cooling Towers; vertical catwalks; coolant/molten hazards; heavy weapon zones; interior/exterior contrast; landmark reactor column; flow routes around core; spawns/pickups/nav/audio.
- **Files:** `src/game/data/maps/reactor/**`, render map modules.
- **Dependencies:** M13, M8, M12.
- **Acceptance:** Meets §4.3 and §4.7; hazard behaviour correct and telegraphed; nav + perf pass; distinct identity from VERTEX.
- **Testing:** Validator, hazard tests, manual/perf/bot traversal.
- **DoD:** REACTOR playable.

#### M16 — Map: BREACH
- **Status:** NOT STARTED. **Size:** XL.
- **Objective:** Build the 500×500 m floating facility with high-risk vertical traversal.
- **Features:** Dock Ring, Broken Skybridge, Turbine Platforms, Hangar Island, Maintenance Shafts, Observation Deck; updraft pads; void falls; dash-gap chains; wall-run hull edges; Power island; wind-free launch tuning for predictability; spawns/pickups/nav/audio.
- **Files:** `src/game/data/maps/breach/**`, render map modules.
- **Dependencies:** M13, M8, M12.
- **Acceptance:** Meets §4.4 and §4.7; fall/kill volumes reliable; all gaps crossable by intended movement; bots avoid suicide paths; perf pass; visually distinct.
- **Testing:** Validator, fall-volume tests, traversal difficulty audit, perf/bot soak.
- **DoD:** BREACH playable.

#### M17 — Map: SECTOR 09
- **Status:** NOT STARTED. **Size:** XL.
- **Objective:** Build the 700×700 m research campus, the large-arena launch map.
- **Features:** Central Courtyard, Laboratories, Hangars, Admin Spire, Sublevel Warrens, Test Range, Solar Field; satellite dish and silo landmarks; multi-floor interiors; long sightlines; hidden passages; all combat distances; spawns/pickups/nav/audio; large-map streaming correctness.
- **Files:** `src/game/data/maps/sector09/**`, render map modules.
- **Dependencies:** M13, M8, M12.
- **Acceptance:** Meets §4.5 and §4.7 at 700×700; streaming/perf holds; nav covers all floors; no empty sprawl (density audit); all 60-weapon coverage matrix complete across four maps.
- **Testing:** Validator, multi-floor nav soak, perf benchmark, coverage script, manual review.
- **DoD:** All four launch maps complete; bot navigation work can consume them.

#### M18 — Bot AI foundation: navigation, perception, fairness
- **Status:** NOT STARTED. **Size:** L.
- **Objective:** Bots navigate maps and perceive the world only through player-legal information.
- **Features:** NavGraph + A*; walk/jump/drop/wall-run/dash link types; path smoothing and local avoidance; bot entity driven by `InputCommand`; perception (FOV, LOS raycasts, hearing, memory decay); stuck detection/recovery; spawn/nav validation on VERTEX; debug overlays (path, perception, state); headless soak harness.
- **Files:** `src/game/sim/bots/*`, `ai/nav/*`, `ai/perception.ts`, `scripts/bot-soak.ts`, map nav data.
- **Dependencies:** M6, M13, M14.
- **Acceptance:** 8 bots traverse VERTEX for 10 minutes without permanent stuck states; no impossible knowledge (tests assert perception gating); pathfinding budget within tick; nav coverage report; no falls into hazards while pathing normally.
- **Testing:** Pathfinding unit tests; perception tests; headless soak; debug visual review.
- **DoD:** Bots are credible navigators; combat layer can be added.

#### M19 — Bot combat, personalities and difficulty
- **Status:** NOT STARTED. **Size:** L.
- **Objective:** Turn navigating bots into real opponents across all personalities and difficulties.
- **Features:** Combat FSM; aim/tracking model with reaction and error; weapon range-band behaviour and alt-fire use; pickup/ammo/health decisions; retreat/cover; movement abilities/flow routes; five personalities; five difficulty presets; team behaviour; human-like fire discipline; bot stats/debug; full soak across modes/maps.
- **Files:** `src/game/sim/bots/ai/*`, `personalities.ts`, `src/game/data/botProfiles.ts`, tests.
- **Dependencies:** M9–M12, M18.
- **Acceptance:** Each personality plays recognizably; each difficulty is measurably different in reaction/aim without rule cheats; bots collect/swap weapons, reload, retreat, use cover and movement abilities; 30-minute soak per map passes; fairness audit confirms no hidden information or stat cheats; Regular is beatable by an average player.
- **Testing:** Deterministic AI scenario tests; fairness assertions; soak statistics; manual matches against each personality.
- **DoD:** Bot Arena and solo modes have real opponents.

#### M20 — Match framework and game modes
- **Status:** NOT STARTED. **Size:** L.
- **Objective:** Implement match rules, spawning, scoring and the four launch modes on top of the combat/bot systems.
- **Features:** MatchConfig/state machine (loading→warmup→countdown→live→overtime→post); scoring, timers, team assignment; spawn selection + protection; Duel (rounds, no in-round respawn), Team Clash (4v4, 50 kills/10 min), FFA (8, 25 kills/10 min), Bot Arena (1v1–5v5 configurable); results screen with real stats; rematch; leave/abandon handling; custom settings; mode HUD elements; bot fill.
- **Files:** `src/game/sim/match/*`, `modes/*`, `src/game/data/modes.ts`, `src/ui/pages/MatchResults.tsx`, HUD score/clock.
- **Dependencies:** M8, M19.
- **Acceptance:** All four modes start, score, end and restart correctly with bots and local player; Duel round rules correct; teams/spawns balanced; no soft-lock after elimination; results reflect actual match state; automated mode-rule tests pass.
- **Testing:** Headless mode simulations; edge cases (tie, disconnect/abandon, overtime); manual matches per mode.
- **DoD:** Complete offline game loop exists before networking.

#### M21 — Direct-session transport and host simulation
- **Status:** NOT STARTED. **Size:** XL (split into M21.1 signaling/protocol, M21.2 host session/sim, M21.3 connection harness before coding).
- **Objective:** Deliver real backend-free direct sessions: a host browser runs the authoritative sim and up to seven joiners connect over WebRTC.
- **Features:** Import-boundary cleanup (sim has zero DOM/Three); versioned binary protocol; compact manual offer/answer codec (URL-fragment invite + answer code); reliable control and unreliable input/snapshot channels; host create/join/leave lifecycle; host 60 Hz sim and 30 Hz snapshots; command buffering and validation; host bots; match lifecycle; connection diagnostics; no server, account or relay.
- **Files:** `src/game/shared/protocol/**`, `src/game/sim/net/**`, `src/client/net/direct/**`, `docs/direct-sessions.md`.
- **Dependencies:** M20.
- **Acceptance:** Two browsers on the same network connect through copy/paste signaling with no backend and play a complete host-run match; host snapshots drive joiner state; host rejects invalid commands; protocol codec round-trips and rejects version/hash mismatches; host tick stays within budget with seven joiners plus bots in a headless harness; no game data reaches a third-party server; strict-NAT failure produces a clear diagnostic rather than a hang.
- **Testing:** Protocol/encode/decode unit tests; signaling codec tests; headless host + simulated-peer integration; two-browser LAN session; host tick/memory soak. Browser-level WebRTC validation may be limited by the sandbox browser dependency; record it honestly.
- **DoD:** Real host-authoritative direct transport works; joiner prediction/responsiveness is next.

#### M22 — Joiner prediction, interpolation and lag compensation
- **Status:** NOT STARTED. **Size:** XL.
- **Objective:** Make the joining player's movement feel local and combat fair despite round-trip latency to the host.
- **Features:** Input at 60 Hz with last-three redundancy; local prediction; host `ackSeq`/tick reconciliation; render-space correction smoothing; large-error snap; adaptive remote interpolation 60–120 ms; clock sync; snapshot deltas/keyframes; predicted cosmetic weapon FX; host-authoritative hits with 250 ms hitbox history and 200 ms rewind cap; events → FX/audio/HUD with deduplication; RTT/jitter/loss readout; bandwidth instrumentation.
- **Files:** `src/client/net/direct/**`, `src/game/sim/prediction/**`, `src/game/sim/net/lagCompensation.ts`, `src/ui/components/ConnectionStatus.tsx`, protocol handlers.
- **Dependencies:** M21.
- **Acceptance:** With 80 ms RTT and 3% loss, joiner movement input has no visible local delay and corrections do not rubber-band; 95th-percentile correction is bounded and visually smoothed; remote players interpolate without teleporting; joiner hits register against the host's lag-compensated history; joiner cannot fabricate damage/pickups; bandwidth within budget; no duplicate event effects.
- **Testing:** Deterministic prediction/reconciliation unit tests; simulated latency/jitter/loss harness; headless host + predicting-client scenarios; two-browser session if the environment permits; bandwidth/perf traces.
- **DoD:** Direct-session joiners are responsive and playable; session UX/resilience next.

#### M23 — Direct-link UX, resilience and network testing
- **Status:** NOT STARTED. **Size:** L.
- **Objective:** Make backend-free direct sessions usable, diagnosable and stable for real players.
- **Features:** Create/join flow; compressed invite link/answer code with copy/paste; explicit SDP/IP privacy warning; roster, ready check and host start; connection quality (RTT/jitter/loss/host); clear NAT/firewall diagnostics; manual re-link flow; host-leave/session-end handling; optional host fairness-delay evaluation; message caps/rate limits; no host migration; 60-minute soak with simulated peers; browser/network matrix; direct-sessions guide. No quickplay, matchmaking queue, region registry, global leaderboard or ranked mode without a trusted backend.
- **Files:** `src/client/net/direct/**`, `src/ui/pages/PlayOnline.tsx`, `src/ui/components/ConnectionStatus.tsx`, `docs/direct-sessions.md`, tests.
- **Dependencies:** M22.
- **Acceptance:** A first-time host and joiner complete the two-code exchange and enter a match without a backend; strict-NAT failures show actionable diagnostics; seven-joiner sessions with hosted bots remain stable for 60 minutes in the harness; disconnects/host loss cannot crash or soft-lock the client; rate/oversize input tests pass; session is clearly labelled unranked; no fake matchmaking UI.
- **Testing:** Headless simulated-peer soak, chaos disconnect tests, malformed-message fuzz cases, browser sessions where available, manual network matrix.
- **DoD:** Backend-free direct multiplayer is operationally usable and honestly labelled; local progression next.

#### M24 — Local progression, profiles and records
- **Status:** NOT STARTED. **Size:** L.
- **Objective:** Persist an operator profile, real match stats, XP and cosmetic mastery locally with no backend or account.
- **Features:** Local operator profile with callsign; XP/levels; weapon mastery; career/per-weapon stats from actual completed matches; daily/weekly challenge rotation; personal bests; cosmetic inventory/unlocks; profile card; recent matches; export/import and reset with confirmation; schema/version migration; clearly labelled device-local and unranked. No global leaderboards, public profiles, ranked MMR or signed reports until a trusted authority is separately approved.
- **Files:** `src/game/progression/**`, `src/client/profile/**`, `src/client/state/*`, `src/ui/pages/{Profile,Progression,Arsenal}.tsx`, tests.
- **Dependencies:** M20, M23.
- **Acceptance:** Completed solo and direct matches award XP/mastery only from actual sim results; stats survive reload; level/unlock rules match formulas; challenges rotate deterministically; export/import round-trips; reset requires confirmation; no backend/account required; no fake global rank or leaderboard; device-local limitations are visible.
- **Testing:** Formula/profile-store unit tests; match-result integration tests; migration/export tests; local persistence tests.
- **DoD:** Honest local progression loop verified end-to-end.

#### M25 — Menus, settings, HUD v2 and accessibility
- **Status:** NOT STARTED. **Size:** M.
- **Objective:** Deliver the complete product shell and accessible, readable in-game UI.
- **Features:** Cinematic title/landing experience tied to real play CTAs; Play hub (solo/direct/Bot Arena/practice); mode/map selection; Arsenal browser with real stats and 3D preview; local progression/profile pages; settings (video, audio, controls, accessibility); key rebinding/conflict detection; pause menu; match results; loading/error/direct-link states; HUD v2 (dynamic crosshair, compass, flow, killfeed, scoreboard); responsive desktop layouts.
- **Files:** `src/ui/**`, `src/index.css`, `src/App.tsx`, `src/client/state/*`.
- **Dependencies:** M5, M20 (real data); profile state from M24.
- **Acceptance:** Every button works; no dead links; play CTAs enter the correct solo/direct flow; settings affect the game and persist; HUD accurate in all modes; accessibility options verified; title/menu visually distinctive (not template); direct-link privacy/limitations visible.
- **Testing:** Typecheck; component tests; manual navigation matrix; preview visual review; keyboard-only pass.
- **DoD:** Product shell is launch-quality; polish pass can focus on the game.

#### M26 — Visual, audio and gameplay polish
- **Status:** NOT STARTED. **Size:** L.
- **Objective:** Raise the game from functional to polished across feel, feedback and presentation.
- **Features:** Lighting/atmosphere per map; hero-prop detail; weapon impact/VFX refinement; FLOW feedback; death/elimination feedback; HUD motion restraint; menu ambience; audio mix and spatial pass; hit/kill confirmation clarity; animation timing; onboarding/tutorial for movement and pickups; callouts/tutorial tips; performance-aware particle cleanup; bug-fix pass from playtests.
- **Files:** render FX/lighting, audio mix, UI components, tutorial data, tests.
- **Dependencies:** M12, M14–M17, M25.
- **Acceptance:** Side-by-side review against visual bar; no unreadable encounters from FX/fog/bloom; audio cues clear in busy fights; tutorial teaches every movement mechanic; no fake or broken controls; performance still within budget.
- **Testing:** Visual checklist per map, audio listening pass, tutorial completion test, regression checks.
- **DoD:** Presentation quality consistent across all maps/modes.

#### M27 — Performance optimization and QA hardening
- **Status:** NOT STARTED. **Size:** L.
- **Objective:** Meet frame and host budgets on target hardware and eliminate release-blocking defects.
- **Features:** Profiling and optimization (draw calls, materials, physics, AI, GC); LOD/culling fixes; map load time; memory leak hunt; host/joiner network CPU and bandwidth; quality presets; browser compatibility pass (Chrome/Edge/Firefox); automated smoke/regression tests; map sweep/stuck tests; bot soak; full bug backlog triage.
- **Files:** renderer, sim hot paths, `scripts/bench.ts`, tests, `docs/performance.md`.
- **Dependencies:** M26.
- **Acceptance:** 60 FPS at 1080p High on target mid-range GPU in representative fights; host 60 Hz within 12 ms with seven joiners plus bots; joiner prediction/network budget on target hardware; no leaks over 60-minute sessions; zero TypeScript errors; no critical/high bugs open; browser matrix passes.
- **Testing:** Benchmarks before/after with measurements; soak tests; browser matrix; map sweeps.
- **DoD:** Performance and stability targets evidenced, not assumed.

#### M28 — Final integration, balance and release readiness
- **Status:** NOT STARTED. **Size:** L.
- **Objective:** Ship a coherent, balanced, documented launch build.
- **Features:** Weapon/map balance pass using telemetry/playtests; spawn/pickup tuning; mode rules tuning; final progression values; complete docs (README update, controls, architecture, direct-session limitations, credits/licences); release checklist; known-issues list; final regression; version tag; static client deployment.
- **Files:** balance data, docs, README, release notes, deploy config.
- **Dependencies:** M27 and all prior milestones.
- **Acceptance:** All launch acceptance criteria met; no placeholder systems; all 60 weapons and 4 maps reachable and functional; solo + backend-free direct multiplayer complete; no game server required; direct sessions unranked and clearly labelled; docs accurate; known issues documented; user sign-off on any remaining non-blocking gaps.
- **Testing:** Full regression suite, multiplayer validation, final manual playtest, clean-install/build/preview verification.
- **DoD:** VANTA launch-ready.

## 11. Progress tracking

### 11.1 Overall status

| Field | Value |
|---|---|
| Current milestone | **M5 — Combat foundation, HUD v1 and Proving Grounds** (IN PROGRESS) |
| Current task | **M5 — browser combat/visual QA plus carried M3/M4 traversal; M6 FLOW is the next implementation** |
| Current status | M2.1/M2.2 COMPLETE; M2.3 automated PASS with browser QA PENDING; M3 headless implementation VERIFIED, manual browser traversal PENDING; M4 implementation/headless tests VERIFIED, browser pointer-lock/feel PENDING; M5 implementation/headless tests VERIFIED, browser combat/visual QA PENDING |
| Next action | Close TD-02 and TD-03 in a WebGL-capable browser: traverse the movement wing, verify pointer lock/Esc, mouse feel, jump/crouch/camera; then fire the VK-7 at all three dummies, verify hit zones/damage/headshots/kills/respawns, stand on the hazard through shield/health/death/respawn, inspect HUD/crosshair/killfeed/damage direction and measure the High-preset frame budget. If implementation continues before that environment exists, build **M6 — FLOW movement suite** on the stable M4 movement API; do not claim M3/M4/M5 completion. TD-01 context-loss/perf/memory QA and M2.3 validation still require the same browser. Direct-session transport remains gated behind M20. |
| Completed milestones | M0, M1 |
| Completed tasks | Repository inspection; constraint analysis; architecture; arsenal/map/mode/AI/MP/progression specifications; roadmap; this plan. M1: Bun/Vite/React/TS scaffold; dependency install; strict TypeScript/ESLint/Vitest configs; branded responsive shell; six lazy routes; canvas mount; error boundary; auth-ready route guard; persisted settings and local operator stores; Tailwind theme and motion system; Freebuff command registration. M2.1: GameRenderer lifecycle; live WebGL2 staging scene; quality/DPI presets; resize handling; reduced-motion pause; WebGL fallback; persisted quality control; renderer/scene tests. M2.2: camera rig; procedural surface/material cache; shader sky/fog production pass; instanced skyline; staged real-progress loader; loading UI; FOV integration; tests. M2.3 implementation: context-loss recovery state machine, RAF suspension/resume, 4 Hz bounded performance monitor, live overlay/F3 toggle, expanded greybox, unit tests. M3 headless implementation: Rapier world/fixed step, collision layers, collider kit and map compiler, kinematic capsule controller, ray/shapecast queries, CCD, Rapier-backed debug wireframes, qualification course and headless harness. M4 implementation: deterministic movement motor, local player simulation, real crouch capsule with headroom refusal, pointer-lock input/binding foundation, first-person camera with bob/landing/FOV, collider-derived playable course, renderer frame-controller integration, live movement HUD and pointer-lock overlay. M5 implementation: proving-grounds campus and M6 greybox lanes, VK-7 prototype rifle, geometric head/torso/leg hit volumes, 100/100 regenerating player shields, target dummies and respawn timers, training hazard, typed shot/damage/elimination/respawn events, solo match stats, target/impact/tracer visuals and HUD v1 with live ammo, vitals, target health, spread crosshair, hitmarkers, killfeed, damage direction and respawn. Multiplayer architecture revised to backend-free WebRTC direct sessions with host authority and joiner-first prediction. |
| Known bugs | No functional bug verified in the tested layers. Production build gate has not been run (see M1 evidence); pixel-level WebGL QA remains blocked by the sandbox browser dependency gap. M2.3 context restoration, 5-minute idle memory growth and measured High-preset frame budget are unverified (TD-01). M3 manual course traversal and visual collider inspection are unexecuted; M4 pointer lock, mouse feel, camera clipping and browser jump/landing are also unexecuted (TD-02). M5 browser firing feel, HUD layout/legibility, target/hazard visuals, damage-direction readability, hazard death/respawn and FPS budget are unexecuted (TD-03). Headless physics/movement/combat are verified. WebRTC transport and two-browser sessions are not started or verified. |
| Build status | Version 0.7.0. `bun tsc -b --noEmit` PASS; `bun run lint` PASS; Vite dev/preview compile PASS. Production build **not run** — requires an explicit user request under Freebuff policy. |
| Test status | `bun run test` PASS — 34 files, 111 tests; `bun run lint` PASS. |

### 11.2 Verification evidence log

| Date | Milestone | Evidence | Result |
|---|---|---|---|
| 2026-10-30 | M0 | `git ls-files` → 1 file (`README.md`); directory listing → no package/config/source; README read and preserved; plan written and read back; component counts validated. | PASS |
| 2026-10-30 | M1 | Toolchain: Bun 1.4.2; React 19.3.1; Vite 8.3.5; TypeScript 5.9.3; Tailwind 4.3.3; Vitest 5.0.5. | PASS |
| 2026-10-30 | M1 | `bun tsc -b --noEmit` → no diagnostics. | PASS |
| 2026-10-30 | M1 | `bun run test` → 7 files / 19 tests passed (routes, canvas mount, settings persistence, operator validation, arsenal count, error recovery, guarded-route redirects). | PASS |
| 2026-10-30 | M1 | `bun run lint` → no findings. | PASS |
| 2026-10-30 | M1 | `freebuff-preview start` → READY on port 5173; `/`, `/play`, `/arsenal`, `/settings`, `/profile`, and unknown routes returned HTTP 200 through Vite history fallback; compiled stylesheet and bundled font/favicon probes returned 200. | PASS |
| 2026-10-30 | M1 | Production `vite build` not executed under Freebuff's no-full-build policy. Playwright pixel screenshot blocked: Chromium missing `libglib-2.0.so.0`. | DEFERRED / BLOCKED |
| 2026-10-30 | M2.1 | `bun tsc -b --noEmit` → no diagnostics; `bun run lint` → no findings. | PASS |
| 2026-10-30 | M2.1 | `bun run test` → 10 files / 29 tests passed, including quality preset math/DPI caps, staging scene construction/quality/disposal, WebGL2 refusal, canvas mount and persisted quality selection. | PASS |
| 2026-10-30 | M2.1 | `freebuff-preview restart` → READY; `/` and `/play` 200; renderer modules (`GameRenderer.ts`, `quality.ts`, `StagingScene.ts`, `ArenaCanvasMount.tsx`) transformed 200; Vite optimized Three; no server errors. | PASS |
| 2026-10-30 | M2.1 | Real WebGL pixel output not machine-verified: jsdom has no WebGL2 and Chromium still lacks `libglib-2.0.so.0`. Fallback path is tested; visual/manual browser check deferred. | BLOCKED / DEFERRED |
| 2026-10-30 | M2.2 | `bun tsc -b --noEmit` → no diagnostics; `bun run lint` → no findings. | PASS |
| 2026-10-30 | M2.2 | `bun run test` → 13 files / 36 tests passed, including camera FOV/viewport/shake, deterministic procedural textures and cache disposal, sky/texture/anisotropy scene checks and loader WebGL refusal. | PASS |
| 2026-10-30 | M2.2 | `freebuff-preview start` → READY; `/`, `/play`, `/arsenal`, `/settings`, `/profile`, camera/material/sky/loader/scene/canvas modules and stylesheet all HTTP 200; Vite log clean. | PASS |
| 2026-10-30 | M2.2 | Real WebGL pixels/loading animation not visually verified due to the same browser dependency gap; no screenshot or visual-pass claim. | BLOCKED / DEFERRED |
| 2026-10-30 | M2.3 | `bun tsc -b --noEmit` → no diagnostics; `bun run lint` → no findings; `bun run test` → 15 files / 45 tests passed. New tests cover rolling FPS/p95, bounded sample window, 4 Hz subscriber cadence, stall discard, reset, context `preventDefault`/single-loss/recovery-count/detach, and the expanded greybox zone list + triangle budget. | PASS |
| 2026-10-30 | M2.3 | `freebuff-preview start` → READY; `/`, `/play`, `/settings` and the perf/context/overlay/renderer/canvas/scene modules returned HTTP 200; Vite log clean. | PASS |
| 2026-10-30 | M2.3 | Actual browser WebGL context loss/restore, 5-minute idle memory growth and 1080p High frame baseline not executed: Chromium cannot launch because `libglib-2.0.so.0` is missing. Perf overlay not visually inspected. | BLOCKED / DEFERRED |
| 2026-10-30 | M3 | `bun tsc -b --noEmit` → no diagnostics; `bun run lint` → no findings; `bun run test` → 20 files / 63 tests passed. | PASS |
| 2026-10-30 | M3 | Headless 60 Hz course traversed ramp → 2 m gap jump → landing → five autostep stairs with final deck height/grounding asserted; flat and landing height spread stayed below 3.5 cm / 5 cm; layer-filtered rays and shapecasts hit the expected colliders; 120 m/s CCD sphere did not tunnel; three create/dispose cycles ended with 0 bodies, 0 colliders and 0 controllers. | PASS |
| 2026-10-30 | M3 | `freebuff-preview start` → READY; `/`, `/play`, `/settings`, `/profile` and physics/world/compiler/controller/query/debug/course modules returned HTTP 200. | PASS |
| 2026-10-30 | M3 | Manual preview traversal and visual debug-wireframe inspection not executed: no playable M4 controller yet; Chromium cannot launch because `libglib-2.0.so.0` is missing. | BLOCKED / DEFERRED |
| 2026-10-31 | M4 | `bun tsc -b --noEmit` → no diagnostics; `bun run lint` → no findings; `bun run test` → 26 files / 86 tests passed. | PASS |
| 2026-10-31 | M4 | Headless controller traversed ramp → 2 m gap → five stairs to the high deck at 60 Hz with zero respawns; crouch changed the real Rapier capsule and standing was refused until headroom cleared; fall recovery reset to spawn; deterministic input sequences matched exactly. | PASS |
| 2026-10-31 | M4 | `freebuff-preview start` → READY; `/`, `/play`, `/settings`, `/profile` and player/input/camera/course/loader modules returned HTTP 200; Vite log clean. | PASS |
| 2026-10-31 | M4 | Real pointer lock, mouse-look feel, keyboard traversal, camera clipping and landing/bob visuals not executed: no browser executable is available in the sandbox. M3 manual course traversal remains in the same blocked pass. | BLOCKED / DEFERRED |
| 2026-10-31 | M5 | `bun tsc -b --noEmit` → no diagnostics; `bun run lint` → no findings; `bun run test` → 34 files / 111 tests passed. | PASS |
| 2026-10-31 | M5 | Headless combat: first-shot head hits, shield-first damage, falloff/zone multipliers, world occlusion, target elimination and four-second respawn, hazard death with 150-tick respawn, 100/100 shield regeneration after a four-second delay, and typed event-bus outcomes all asserted. | PASS |
| 2026-10-31 | M5 | Full camera-input integration: a real `PlayablePlayer` turned toward T-01, held primary fire through fixed steps, recorded hits/elimination in combat telemetry, and disposed combat/target/rifle visual groups cleanly. HUD rendered live 100 health / 100 shield / 30-round ammo against the real player. | PASS |
| 2026-10-31 | M5 | `freebuff-preview start` then final `restart` → READY; `/`, `/play`, `/settings`, `/profile`, HUD/combat/render/map/player modules returned HTTP 200; transformed HUD contains the intended combat controls; Vite log clean. | PASS |
| 2026-10-31 | M5 | Real browser firing feel, pointer-lock mouse aim, HUD pixel layout, hitmarker/crosshair feedback, target/hazard visuals, damage direction, hazard death/respawn and 1080p High frame budget not executed. No browser executable is available. | BLOCKED / DEFERRED |

### 11.3 Known bugs

_None yet._ When adding bugs, record: ID, severity, map/mode, reproduction steps, suspected system, status (OPEN/FIXING/FIXED/VERIFIED), and related milestone.

### 11.4 Technical debt

| ID | Debt | Reason accepted | Impact | Target |
|---|---|---|---|---|
| TD-01 | M2.3 browser runtime acceptance is unexecuted: real context-loss recovery, 5-minute idle memory growth and a measured 1080p High frame baseline. | The sandbox has no launchable Chromium (`libglib-2.0.so.0` missing); jsdom cannot create WebGL2. | Renderer recovery and performance are unit-tested but not proven on a real GPU. The perf overlay has not been visually inspected. | Before M2 is marked complete; no later than M13 map performance gate. |
| TD-02 | M3 manual course traversal and M4 browser pointer-lock/feel acceptance are unexecuted: real mouse look, Esc unlock, keyboard traversal, jump/landing feel, crouch/headroom, camera clipping and collider-debug alignment. | M4 has a playable controller, but the sandbox has no browser executable (`libglib-2.0.so.0` missing). Headless Rapier and input/camera tests cover logic, not human feel or pixels. | M3 and M4 cannot be marked complete. No feel, visual or browser-input claim is made, and TD-01 shares the same WebGL gap. | Before M3/M4 completion; first available WebGL-capable browser environment. |
| TD-03 | M5 browser combat/visual acceptance is unexecuted: live firing feel, pointer-lock aim, HUD layout/legibility, crosshair spread, hitmarkers, target health visuals, damage direction, hazard death/respawn and measured frame budget. | The combat loop is headless-verified against `PlayablePlayer`, but no browser executable is available. jsdom cannot render WebGL or validate layout, feel or frame time. | M5 cannot be marked complete. No visual, feel, HUD or FPS claim is made. | Before M5 completion; first available WebGL-capable browser environment. |

Record debt with the reason it was accepted, impact, and a target milestone for repayment. Do not use debt to hide missing features.

### 11.5 Unresolved decisions

| ID | Decision | Current default | Needed by |
|---|---|---|---|
| UD-01 | How to handle networks that cannot establish direct WebRTC connectivity (symmetric/strict NAT). | No TURN relay at launch; public STUN discovery only, LAN supported, clear failure diagnostics. A user-supplied relay is a separate opt-in decision. | M23 |
| UD-02 | Optional cloud accounts/profile sync. | Not required; local-only profile and progression. Deferred unless explicitly requested; must never be required for direct play. | Post-launch |
| UD-03 | Gamepad support. | Out of launch scope; architecture keeps input abstracted. | Post-launch |
| UD-04 | Voice chat. | Out of scope; text chat only. | Post-launch |
| UD-05 | Weapon drop-on-swap (dynamic dropped weapons). | Discard in v1; revisit after playtests. | M8 review |
| UD-06 | Ranked season resets/decay. | No decay; Season 0 launch, review post-launch. | M24 |
| UD-07 | Fall damage vs. fall elimination. | VERTEX/REACTOR/SECTOR falls = damage + reposition; BREACH void = elimination. | M14–M17 |
| UD-08 | Host fairness delay in direct sessions. | Evaluate a 0–80 ms optional delay for Duel only after joiner prediction is stable; default off until measured. Joiner movement responsiveness remains the priority. | M23 |
| UD-09 | Optional external CC0 assets. | Procedural-first; any external asset requires licence record. | Any |
| UD-10 | Match spectator depth. | Basic death/teammate camera only at launch. | M20 |

### 11.6 Architectural decision records (ADRs)

| ID | Decision | Rationale / consequence |
|---|---|---|
| ADR-001 | Greenfield scaffold inside the existing repository; preserve README. | Repo has no usable code. This is not a rewrite of user work. |
| ADR-002 | React/Vite/TS + Three.js; R3F only for menus/previews. | Gameplay needs imperative per-frame control; React shell remains idiomatic. |
| ADR-003 | Pure-TS shared sim, 60 Hz fixed step, no DOM/Three imports. | Enables host reuse, joiner prediction and headless tests; prevents client-only mechanics. |
| ADR-004 | Backend-free direct multiplayer: WebRTC host-star sessions with host authority and joiner prediction. | No game server to deploy or operate, matching the requested topology; consequences are manual signaling, no host migration, trusted host and unranked matches. |
| ADR-005 | Rapier 3D with capsule controller and authored collider primitives. | Predictable traversal, low host cost, no mesh-accurate physics. |
| ADR-006 | Procedural weapon/map/audio assets, original only. | No licensing risk or missing binary assets; distinct VANTA identity. |
| ADR-007 | Data-driven weapons with mechanic handler registry. | 60 weapons maintainable; no player-code branching; serializable definitions. |
| ADR-008 | Fixed map pickup assignments, tiered respawns; no random rotation in standard modes. | Map knowledge and strategy must matter. |
| ADR-009 | Starter Burst pistol (infinite reserve) + Knife; no pre-match loadout. | Prevents full disarm and preserves pickup discovery. |
| ADR-010 | 100 HP + regenerating 100 shield; health pickups only. | Readable fights, meaningful disengage, no full-heal passivity. |
| ADR-011 | FLOW grants movement-only rewards; no damage/health/accuracy advantages. | Skill expression without unfair combat power. |
| ADR-012 | Bots emit the same InputCommands and obey the same rules. | Credible opponents; difficulty is competence, not cheating. |
| ADR-013 | Zone-streamed visuals; full collision/nav loaded once. | Large maps without duplicated host/joiner complexity or traversal bugs. |
| ADR-014 | No pay-to-win; cosmetics only, no visibility/hitbox advantages. | Competitive integrity. |
| ADR-015 | Freebuff conventions: Bun, managed preview, no manual dev server, no `.env` edits, platform typecheck. | Keeps workspace and verification workflow reliable. |
| ADR-016 | Signaling is manual offer/answer exchange with no VANTA backend; invite links use URL fragments. | Preserves backend-free play and keeps SDP off static hosts; trade-off is a two-code handshake and no quickplay. |
| ADR-017 | Direct sessions are unranked; local progression only until a trusted authority exists. | Host authority cannot independently verify results; avoids fake competitive integrity or leaderboard claims. |

### 11.7 Asset and licence register

| Asset | Source | Licence | Added | Used by |
|---|---|---|---|---|
| _None yet — procedural/original assets only._ | — | — | — | — |

Any external asset must be added here with its source URL and licence before it ships. Do not add unlicensed content.

## 12. Implementation rules (binding for all sessions)

1. **Inspect before modifying.** Read the relevant files and current status; never assume a feature works because a file exists.
2. **Plan first, then one coherent slice.** Work the current milestone subtask; do not start five incomplete systems. Split oversized tasks here before coding.
3. **Never fake systems.** No mock gameplay, fake buttons, decorative HUD values, stubbed damage/AI/netcode presented as done. Prototypes must be labelled and tracked; final milestones require real implementations.
4. **Preserve user work.** Check `git status` before edits. Do not revert unrelated changes. The existing README is preserved. Do not use destructive git commands; do not commit/push unless explicitly asked (Freebuff Changes panel owns delivery).
5. **Respect module boundaries.** `game/sim` has no React/Three/DOM imports. Direct-session networking imports sim/data only. UI never drives authoritative state directly.
6. **No React state per frame.** Use refs/external stores; HUD updates ≤15 Hz; renderer owns its loop.
7. **Data over hardcoding.** Weapon/map/mode/bot/progression values live in typed data with validation. Tuning constants are named and documented.
8. **Host-authoritative outcomes.** Damage, ammo, pickups, cooldowns and scores are validated by the direct-session host; client effects are cosmetic. Direct sessions are unranked, and no test or UI may imply independent anti-cheat.
9. **Keep performance budgets.** Measure before/after optimization; no unmeasured speedup claims. Pool allocations in hot paths.
10. **Accessibility and readability are requirements,** not polish: colorblind separation, FOV/sensitivity/shake options, no FX that obscure enemies.
11. **Honest testing.** Fix causes, don't skip tests/weaken assertions/swallow errors. Report failed or unrun checks as limitations. Never claim browser verification you did not perform.
12. **Freebuff constraints.** Use Bun; keep `vite.config.ts` host `0.0.0.0` and HMR disabled as required; never start/stop dev servers manually; use `freebuff-preview`; never read/print/edit `.env` secrets; request missing keys through Settings → Environment.
13. **Update this plan in the same turn** as implementation: statuses, evidence, bugs, decisions, next action, changelog. The plan is the source of truth across sessions.
14. **Preserve working systems.** Improve rather than rewrite unless the rewrite is justified and recorded in an ADR.

## 13. Testing and quality control

### 13.1 Standard gates per implementation turn

1. `bun tsc -b --noEmit` (or the project's configured typecheck) — required.
2. Focused unit/integration tests for changed logic — required.
3. `bun run test` for the affected suite when practical; full suite at milestone gates.
4. Preview verification for user-visible changes: `freebuff-preview start`/`restart`, readiness must succeed; inspect logs/console for runtime errors.
5. Production build (`bun run build`) at milestone acceptance gates and when explicitly requested. Never launch a production build casually; never start the dev server manually.
6. Update `plan.md` with evidence.

### 13.2 Test layers

- **Unit (Vitest):** movement math/state transitions, FLOW accrual, damage/falloff, weapon state machines, ammo/inventory, pickup timers, nav/A*, progression formulas, protocol encode/decode, validation rules.
- **Headless integration:** full sim with scripted inputs — elimination/respawn, match rules, bot navigation/combat, pickup cycles, 30-minute bot soaks, host/joiner sessions with simulated latency, jitter, loss and malformed messages.
- **Browser smoke:** app boots, routes navigate, matches start/end, pointer lock, HUD values, no console errors, connection/reconnect states.
- **Performance:** automated benchmark scenes + in-game overlay, recorded baselines.
- **Manual playtest:** feel, fairness, readability, audio mix; documented checklist per milestone.

### 13.3 Bug rules

Every bug gets an ID and severity. Release blockers: crashes, soft-locks, invalid authoritative state, impossible-to-use weapons, broken navigation/spawns, memory leaks, security bypasses. A fix requires a regression test where feasible; otherwise document why. Never mark VERIFIED without reproducing the original scenario.

### 13.4 Definition of Done (universal)

- Feature is implemented for real and reachable by a player (or by the direct-session host/joiner, where applicable).
- Acceptance criteria met; no placeholder language remains in shipped paths.
- Typecheck/tests/preview pass for the change; failed checks documented.
- Performance and accessibility considered.
- `plan.md` updated with status, evidence, issues, next action.
- No unrequested scope added.

## 14. Risks and mitigations

| Risk | Impact | Mitigation |
|---|---|---|
| 60 weapons is a large content/quality risk. | Reskins, bugs, long tail. | Mechanic registry + waves + automated validation + distinct silhouettes; complete one category at a time; M12 production gate. |
| Large 500–700 m maps hurt browser performance. | Low FPS, empty-feeling spaces. | Zone streaming, merged/instanced geometry, LOD/fog, authored density, collider primitives, perf gates from M13 onward. |
| Real multiplayer adds sync/cheat complexity. | Broken online launch. | Build offline loop first; shared sim + host authority; prediction/lag compensation with harness; soak/chaos testing; honest direct-session docs. |
| WebRTC fails behind symmetric/strict NAT without TURN. | Some players cannot connect. | LAN/no-STUN path, public STUN discovery, clear diagnostics; optional relay only if explicitly approved. Never fake a successful connection. |
| Host authority can be cheated and host leaves end the session. | No trustworthy ranked play; disruption. | Keep direct sessions unranked, local stats only, label host authority; no host migration at launch; test disconnect handling. |
| Manual invite/answer exchange is friction-heavy. | Players may not complete a session. | Compressed copy/paste codes, inline validation, privacy warning, clear two-step instructions; no fake quickplay. |
| Procedural art can look samey. | Poor visual identity. | Strong kit parameterization, per-map palettes/landmarks, material detail passes, side-by-side review. |
| Scope exceeds available sessions. | Incomplete launch. | Dependency order; vertical slice early; each continue delivers a coherent tested increment; no parallel unfinished epics. |
| Browser input/pointer-lock quirks. | Poor aim feel. | Raw input, explicit pointer-lock UX, sensitivity settings, Firefox/Chrome testing. |
| Audio unlicensed asset risk. | Legal/repo issues. | Synthesis-first; CC0 only with recorded licence. |
| Balance without players. | Dominant/dead weapons. | Telemetry, bot-vs-bot sims, test range TTK, final pass M28; avoid premature precision. |

## 15. External dependencies, credentials and deployment

| Dependency | Needed for | Status | User action |
|---|---|---|---|
| Bun + Node | Build, dev and headless test harness | Available in environment (Bun 1.4.2, Node 22) | None. |
| Three.js, Rapier, React/Vite, Vitest | Core | Installed as implementation milestones require them | None. |
| Browser WebRTC (`RTCPeerConnection` + data channels) | Backend-free direct play | Browser API; no server or credential | None for LAN; internet sessions need usable NAT traversal. |
| Public STUN server(s) | Internet candidate discovery | Not configured in code yet; no account | None; may be unreachable on restrictive networks. Not used for gameplay data. |
| TURN relay | Guaranteed connectivity on strict/symmetric NAT | NOT INCLUDED | Deliberate limitation; revisit only with explicit approval. |
| Fonts | UI identity | Bundled open-licence packages in M1/M25 | None. |

**Freebuff operational notes:** dev server port is managed; preview via `freebuff-preview`; HMR disabled; no manual server start/stop; terminal commands sync and time-bounded; production build only at gates. There are no backend secrets or Convex credentials. Do not claim WebRTC connectivity or two-browser play was verified unless it actually was.

## 16. Session protocol and reporting

### 16.1 On "continue"

1. Read this plan, especially §11, and inspect `git status`/tree.
2. Select the current IN PROGRESS task or next dependency-ready NOT STARTED task.
3. Re-read the relevant source before editing; check whether the plan's assumptions still match.
4. Implement one coherent slice; split it if too large, updating this plan first.
5. Integrate with the existing game (no isolated demos), then verify using §13 gates.
6. Fix errors caused by the change; do not weaken checks.
7. Update statuses, evidence log, bugs, debt, decisions, next action and changelog here.
8. Report concisely and stop. Do not ask which milestone is next if this file answers it.

**Never:** restart the project, redo completed work, skip dependencies, invent credentials, claim untested features work, or wait for the user to restate the brief.

### 16.2 Report format (every "continue")

```
VANTA DEVELOPMENT REPORT
- Milestone:
- Task:
- Implemented:
- Files changed:
- Tests performed:
- Build status:
- Remaining issues:
- Next task:
```

For the initial planning session, also report: plan confirmation, architecture summary, milestone count, first implementation milestone, and discovered constraints.

## 17. Change log

| Date | Version | Change |
|---|---|---|
| 2026-10-30 | 1.0 | Initial repository inspection; greenfield architecture; full 60-weapon, map, mode, AI, multiplayer and progression specification; 29-milestone roadmap; progress template. No game code implemented, per instruction. |
| 2026-10-30 | 1.1 | M1 completed: Bun/Vite/React/TS scaffold, branded responsive shell, six lazy routes, canvas mount, error recovery, persisted settings/local operator, Vitest/ESLint, Freebuff preview registration. Production build deferred by host policy; pixel screenshot unavailable due sandbox libraries. |
| 2026-10-30 | 1.2 | M2.1 completed: Three.js GameRenderer lifecycle, live staging scene on `/play`, quality/DPI presets, resize and reduced-motion handling, WebGL2 fallback, persisted quality controls, and renderer/scene tests. Version bumped to 0.2.0. |
| 2026-10-30 | 1.3 | M2.2 completed: camera rig, procedural surface/material cache, shader sky/fog, instanced skyline, staged real-progress loader and FOV wiring. Multiplayer architecture changed to backend-free WebRTC host-star sessions with manual signaling, host authority, joiner prediction and local-only/unranked progression; removed dedicated game server/Convex launch dependencies. Version bumped to 0.3.0. |
| 2026-10-30 | 1.4 | M2.3 implemented: canvas context-loss/restore lifecycle, RAF suspension and recovery, 4 Hz bounded performance monitor and live overlay with F3 toggle, expanded two-level greybox with cargo/floodlights/pipes/catwalk, automated recovery/performance/scene tests. Browser WebGL recovery, 5-minute memory and measured frame-budget acceptance remain blocked and are tracked as TD-01. Version bumped to 0.4.0. |
| 2026-10-30 | 1.5 | M3 headless implementation: Rapier world/fixed-step runtime, collision layers, box/ramp/cylinder/stairs collider kit and compiler, kinematic capsule controller, ray/shapecast queries, CCD, Rapier-backed debug wireframes, headless qualification course. Automated checks pass (20 files / 63 tests). Manual preview traversal and visual collider inspection remain blocked by the absent M4 controller and sandbox Chromium, tracked as TD-02. Version bumped to 0.5.0. |
| 2026-10-31 | 1.6 | M4 implementation: deterministic movement motor, local player simulation, real crouch capsule with headroom refusal and collider-position propagation, pointer-lock action/binding layer, first-person look/bob/landing/FOV camera, collider-derived playable qualification course, renderer frame-controller integration, pointer-lock entry/pause UI and live player telemetry. Automated checks pass (26 files / 86 tests). Browser pointer lock, mouse feel, camera clipping and the carried M3 traversal remain blocked by the absent sandbox browser, tracked as TD-02. Version bumped to 0.6.0. |
| 2026-10-31 | 1.7 | M5 implementation: proving-grounds campus, VK-7 prototype hit-scan rifle, geometric head/torso/leg hitboxes, 100/100 regenerating player shield, target dummies with four-second respawns, training damage hazard, typed simulation event bus, solo match elimination/respawn stats, target/tracer/muzzle visuals, and HUD v1 with live vitals, ammo, target health, spread crosshair, hitmarkers, killfeed, damage direction and respawn prompt. Automated checks pass (34 files / 111 tests). Browser combat/visual QA and frame budget remain blocked by the absent sandbox browser, tracked as TD-03. Version bumped to 0.7.0. |

## 18. Immediate next action

M5's combat slice is implementation-complete and headless-verified, but M3, M4 and M5 remain IN PROGRESS until a human can run them in a real browser. Close TD-02 and TD-03 in a WebGL-capable environment: enter/exit pointer lock, verify sensitivity/invert/toggle sprint, traverse flat ground/ramp/gap/stairs and the movement wing, test jump buffering/coyote time, crouch and blocked standing, fall reset, camera clipping and collider-debug alignment; then fire the VK-7 at all three dummies, verify head/torso/leg damage, shield/health, ammo/reload, kills and four-second respawns, stand on the damage-calibration pad through death and respawn, inspect HUD/crosshair/hitmarker/killfeed/damage-direction layout and measure the High-preset frame budget. Also run the separate M2.3 browser checks for context recovery, a 1080p High frame trace and 5-minute idle memory growth (TD-01). If implementation continues before that environment exists, build **M6 — FLOW movement suite** on the stable M4 movement API; do not claim M3/M4/M5 completion. The multiplayer direction remains locked: backend-free WebRTC direct sessions, host authority, joiner prediction first, no matchmaking server, no TURN by default and no ranked claims. Do not fake a lobby, network connection, visual pass or browser validation.

---_End of plan.md. This document supersedes memory of previous sessions._
