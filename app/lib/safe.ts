// Screens call decision functions through tryStudent(). While a function is still a stub it throws
// "TODO(implementation)", and the screen shows a small "Not built yet" label instead of crashing.
export type Tried<T> = { ok: true; value: T } | { ok: false; notBuilt: boolean; error: unknown };

export function tryStudent<T>(fn: () => T): Tried<T> {
  try {
    return { ok: true, value: fn() };
  } catch (error) {
    const notBuilt = error instanceof Error && error.message.includes('TODO(implementation)');
    return { ok: false, notBuilt, error };
  }
}
