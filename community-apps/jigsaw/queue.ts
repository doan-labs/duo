// Serial mutation queue shared by the game's write paths: each step runs only
// after the previous one settles, and the same step handles both the resolved
// and rejected arm, so a step that throws can never poison the chain - the
// next enqueued write still runs. Without that, one failed write silently
// deadlocks every later mutation on this display.
export function enqueue(queue: { current: Promise<unknown> }, step: () => Promise<void>): Promise<void> {
  queue.current = queue.current.then(step, step)
  queue.current.catch(() => {})
  // Callers get THIS step's outcome to observe failure (a rejected read drops
  // the intent loudly); the queue itself keeps the swallowed-catch branch so
  // the chain still survives for the next write.
  return queue.current as Promise<void>
}
