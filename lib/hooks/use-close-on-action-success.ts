import { useState } from "react";

// Closes a dialog once its Server Action reports success, without a
// useEffect — React's "adjusting state during render" escape hatch: a
// setState call guarded by comparing against the previous render's value is
// safe to run directly in the render body (unlike inside an effect, which
// would cause an extra commit/cascading render).
export function useCloseOnActionSuccess(
  state: { ok?: true },
  setOpen: (open: boolean) => void
) {
  const [prevState, setPrevState] = useState(state);
  if (state !== prevState) {
    setPrevState(state);
    if (state.ok) setOpen(false);
  }
}
