# Custom edits (vs upstream JTs-Hud)

Fork of [JohnTimmermann/JTs-Hud](https://github.com/JohnTimmermann/JTs-Hud). These changes fix side switching on servers whose GSI **team names do not change after half**, and make BO1/BO3/BO5 pistol sides explicit.

HUD convention is unchanged: `reverseSide === false` means the **left** org is CT this half; `true` means the left org is T. Left/right orgs in the match are never swapped.

---

## 1. Switch by player roster

**Problem:** Upstream auto-switch only flips `reverseSide` on GSI `intermissionEnd`. The overlay then maps left/right orgs using **server team names**. After a side swap our servers keep the same names, so the HUD stays wrong.

**Change:** New setting `autoSwitchSidesByPlayers` (default **off**).

When **on**:

- Every ~2.5s during live/freezetime, match GSI SteamIDs to DB players (skip coaches).
- Count how many **left** vs **right** org players are currently CT vs T.
- Need at least 3 mapped left-org players and a clear majority. If the right org also has 3+ mapped players, they must be on the **opposite** faction (otherwise no change).
- Set `reverseSide` so it matches live factions. **GSI team names are ignored.**
- Upstream half-time flip is **skipped** so the two modes cannot double-flip.

When **off:** original “Auto Switch Sides” (flip on `intermissionEnd`, skip OT period starts at 24/30/36) still runs.

Players must have a SteamID and a team assigned, or roster switch will not decide.

**Also fixed:** the Settings checkboxes now actually save. Upstream never called `saveSettings`.

### Files

- `src/main/server/integrations/sideLogic.ts` (new)
- `src/main/server/integrations/gsi.ts`
- `src/main/server/domains/settings/settings.routes.ts`
- `src/main/server/database/sqlite.ts`
- `src/renderer/src/features/settings/composables/useSettings.ts`
- `src/renderer/src/components/base/SettingsModal.vue`

---

## 2. Explicit “who starts CT” on veto slots

**Problem:** Veto `side` was a raw CT/T/NO next to the **picker** (`teamId`). In CS veto, the other team usually chooses starting side, so the UI was ambiguous.

**Change:** Pick and decider slots ask **which named team starts CT** (left name / right name / Not set). Bans hide this control.

Stored as `startingCtTeamId` (source of truth). For HUD compatibility, `side` is still set to the **picker’s** starting faction (`CT` if the picker is the CT starter, else `T`; `NO` if unset or no picker).

The veto list shows e.g. `NaVi CT`, not a lone `CT` badge on the picker.

### Files

- `src/main/server/domains/matches/match.types.ts`
- `src/renderer/src/views/MatchFormView.vue`

---

## 3. Auto-apply pistol side when that map goes live

**Problem:** Filling a veto starting side did nothing when the server loaded that map.

**Change:** On GSI **map name change**, if:

- there is a **current** match,
- the map is a **pick or decider** in the veto (not `mapEnd`),
- `startingCtTeamId` is set,
- first half only (`CT + T score < 12`),

then set `reverseSide` to `(startingCtTeamId !== match.left.id)` if it differs.

Works the same for BO1 / BO3 / BO5: whichever picked map GSI is on. Map 2/3 is a new map name, not a series state machine.

After half, roster switch (if on) or upstream intermission flip (if off) owns further changes.

### Files

- `src/main/server/integrations/sideLogic.ts` (`desiredReverseSideFromVeto`)
- `src/main/server/integrations/gsi.ts` (map-change handler)

---

## How to use

1. Settings → optionally enable **Switch by player roster**.
2. Create/edit the match: left/right orgs, veto picks/deciders, **Who starts CT** by team name.
3. Set the match as current.
4. Players in the DB: SteamID + team.
5. When CS2 is on a picked map, pistol orientation is applied; if roster switch is on, halves follow player factions.

---

## Build

Windows installer from this tree:

`dist/jts-hud-7.13.26-setup.exe`

Unpacked app:

`dist/win-unpacked/JTs Hud Manager.exe`

From source: `npm install` then `npm run dev` or `npm run build:win`.
