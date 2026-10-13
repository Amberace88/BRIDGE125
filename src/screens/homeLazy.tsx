import type { ComponentProps } from 'react';
import { lazySlot } from '../lazy';
import { useApp } from '../store';
import type * as Rewards from './Rewards';

/**
 * Home's secondary pieces, loaded after the first paint so the progress / quest / achievement stores and their strings
 * stay out of the initial bundle. Same props as the originals.
 *  - DailyRewardButton / LevelBadge render nothing for guests (and until progress loads), so guests never fetch them.
 *  - QuestTracker keeps its box while its chunk loads (no layout shift in the play card).
 *  - RulesPanel lives below the fold: fetched once the page is idle.
 */
const DailyLazy = lazySlot(() => import('./Rewards').then(m => m.DailyRewardButton));
const LevelLazy = lazySlot(() => import('./Rewards').then(m => m.LevelBadge));
export function DailyRewardButton(p: ComponentProps<typeof Rewards.DailyRewardButton>) { return useApp().session ? <DailyLazy {...p} /> : null; }
export function LevelBadge(p: ComponentProps<typeof Rewards.LevelBadge>) { return useApp().session ? <LevelLazy {...p} /> : null; }

export const QuestTracker = lazySlot(() => import('../campaign/QuestTracker').then(m => m.QuestTracker),
  <div className="qtrack h5-quests qtrack-ph" aria-hidden />);
export const RulesPanel = lazySlot(() => import('../components/RulesPanel').then(m => m.RulesPanel),
  <div className="rp-ph" aria-hidden />, 1500);
