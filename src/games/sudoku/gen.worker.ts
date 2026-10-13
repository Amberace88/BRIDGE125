/// <reference lib="webworker" />
import { generate } from './core/generator';
import type { Level } from './core/grid';

declare const self: DedicatedWorkerGlobalScope;

// Puzzle generation off the main thread: { id, level, seed } → { id, puzzle } | { id, error }.
self.onmessage = (e: MessageEvent<{ id: number; level: Level; seed: number }>) => {
  const { id, level, seed } = e.data;
  try { self.postMessage({ id, puzzle: generate(level, seed) }); }
  catch (err) { self.postMessage({ id, error: String(err) }); }
};
