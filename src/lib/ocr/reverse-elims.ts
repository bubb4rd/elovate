import { WZ_PLAYER_ELIM_SR, WZ_SQUAD_ELIM_SR } from "@/lib/ranked";

export function reverseElimKills(args: {
  yourElimSr?: number;
  squadElimSr?: number;
}): { yourElims: number; squadElims: number } {
  const yourElims =
    args.yourElimSr != null && Number.isFinite(args.yourElimSr)
      ? Math.max(0, Math.round(args.yourElimSr / WZ_PLAYER_ELIM_SR))
      : 0;
  const squadElims =
    args.squadElimSr != null && Number.isFinite(args.squadElimSr)
      ? Math.max(0, Math.round(args.squadElimSr / WZ_SQUAD_ELIM_SR))
      : 0;
  return { yourElims, squadElims };
}
