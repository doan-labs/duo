// Serial mutation queue shared by the game's write paths: each step runs only
// after the previous one settles, and the same step handles both the resolved
// and rejected arm, so a step that throws can never poison the chain - the
// next enqueued write still runs. Without that, one failed write silently
// deadlocks every later mutation on this display.
export function enqueue(queue: { current: Promise<unknown> }, step: () => Promise<void>) {
  queue.current = queue.current.then(step, step)
  queue.current.catch(() => {})
}
