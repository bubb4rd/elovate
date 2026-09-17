-- Season rank reset runbook — WZ-18 / issue #109. Service-role only, run
-- manually after a season's ranked reset happens in-game (once per season —
-- see the issue's Follow-up for the planned /season rank-reset Discord
-- command that will eventually replace this manual step).

-- 1. SNAPSHOT before running — this is the rollback path. Nothing else backs
--    up profiles.current_sr, so take one here. Drop it once you're confident
--    the run is good (a few days out).
create table if not exists public.profiles_pre_rank_reset_backup as
  select id, current_sr, sr_reset_season_id, now() as snapshotted_at
  from public.profiles;

-- 2. PREVIEW — how many profiles per division would be touched. Read-only.
select
  case
    when current_sr >= 7500 then 'crimson_or_above'
    when current_sr >= 5400 then 'diamond'
    when current_sr >= 3600 then 'platinum'
    when current_sr >= 2100 then 'gold'
    when current_sr >= 900  then 'silver'
    else 'bronze'
  end as division,
  count(*) as profiles
from public.profiles
group by 1
order by 1;

-- 3. RUN — pick the season id the reset is FOR (the one that just started).
select * from public.apply_season_rank_reset('s6');

-- 4. CONFIRM — division counts should have shifted down; profiles_touched
--    above should roughly match everyone who wasn't already at a floor.
select
  case
    when current_sr >= 7500 then 'crimson_or_above'
    when current_sr >= 5400 then 'diamond'
    when current_sr >= 3600 then 'platinum'
    when current_sr >= 2100 then 'gold'
    when current_sr >= 900  then 'silver'
    else 'bronze'
  end as division,
  count(*) as profiles
from public.profiles
group by 1
order by 1;

-- 5. ROLLBACK, if needed — restore from the snapshot table above, then
--    remove it. Uncomment and run as one block.
-- update public.profiles p
-- set current_sr = b.current_sr, sr_reset_season_id = b.sr_reset_season_id
-- from public.profiles_pre_rank_reset_backup b
-- where p.id = b.id;
-- drop table public.profiles_pre_rank_reset_backup;
