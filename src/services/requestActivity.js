let pending = 0;
const listeners = new Set();
export const getPendingRequests = () => pending;
export function subscribeToRequests(listener) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}
export function beginRequest() {
  pending++;
  listeners.forEach(listener => listener());
  let finished = false;
  return () => {
    if (finished) return;
    finished = true;
    pending--;
    listeners.forEach(listener => listener());
  };
}
