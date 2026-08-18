import { Match } from '../domains/matches/match.types'
import { Player } from '../domains/players/player.types'

export function stripMapName(fullName: string): string {
  return fullName.substring(fullName.lastIndexOf('/') + 1)
}

/** reverseSide true means the left org is T this half. */
export function desiredReverseSideFromVeto(
  match: Match,
  mapName: string,
  ctScore: number,
  tScore: number,
  regulationMR = 12
): boolean | null {
  if (ctScore + tScore >= regulationMR) return null

  const veto = match.vetos?.find(
    (v) =>
      v.mapName === mapName &&
      (v.type === 'pick' || v.type === 'decider') &&
      !v.mapEnd &&
      v.startingCtTeamId
  )
  if (!veto?.startingCtTeamId || !match.left.id) return null

  return veto.startingCtTeamId !== match.left.id
}

export function desiredReverseSideFromPlayers(
  match: Match,
  allplayers: Record<string, { team?: string }> | undefined,
  dbPlayers: Player[]
): boolean | null {
  if (!allplayers || !match.left.id || !match.right.id) return null

  const teamBySteam = new Map<string, string>()
  for (const p of dbPlayers) {
    if (!p.steamid || !p.team || p.isCoach) continue
    teamBySteam.set(p.steamid, p.team)
  }

  let leftCt = 0
  let leftT = 0
  let rightCt = 0
  let rightT = 0

  for (const [steamid, player] of Object.entries(allplayers)) {
    const teamId = teamBySteam.get(steamid)
    if (!teamId) continue
    const faction = player.team
    if (faction !== 'CT' && faction !== 'T') continue

    if (teamId === match.left.id) {
      if (faction === 'CT') leftCt++
      else leftT++
    } else if (teamId === match.right.id) {
      if (faction === 'CT') rightCt++
      else rightT++
    }
  }

  const leftTotal = leftCt + leftT
  if (leftTotal < 3 || leftCt === leftT) return null

  const leftIsT = leftT > leftCt

  const rightTotal = rightCt + rightT
  if (rightTotal >= 3) {
    if (rightCt === rightT) return null
    const rightIsT = rightT > rightCt
    if (rightIsT === leftIsT) return null
  }

  return leftIsT
}

export function currentVetoReverseSide(match: Match, mapName: string): boolean {
  return !!match.vetos?.some((v) => v.mapName === mapName && v.reverseSide)
}

export function setVetoReverseSide(match: Match, mapName: string, reverseSide: boolean): Match['vetos'] {
  return (match.vetos ?? []).map((veto) => (veto.mapName === mapName ? { ...veto, reverseSide } : veto))
}
