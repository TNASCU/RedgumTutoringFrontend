import { useEffect, useRef, useSyncExternalStore } from 'react';
import { createPortal } from 'react-dom';
import { getPendingRequests, subscribeToRequests } from './services/requestActivity.js';

export default function LoadingScreen() {
  const pending = useSyncExternalStore(subscribeToRequests, getPendingRequests, () => 0);
  const loading = pending > 0;
  const dialogRef = useRef(null);
  useEffect(() => {
    const dialog = dialogRef.current;
    // Keep the screen open across the brief gap before dependent requests start.
    // Recheck the live count: a new request may start before React runs cleanup.
    const timer = loading
      ? setTimeout(() => { if (getPendingRequests() > 0 && !dialog.open) dialog.showModal(); }, 150)
      : setTimeout(() => { if (getPendingRequests() === 0) dialog.close(); }, 200);
    return () => clearTimeout(timer);
  }, [loading]);
  return createPortal(
    <dialog ref={dialogRef} className="loading-screen" aria-label="Loading" onCancel={event => event.preventDefault()}>
      <div role="status" aria-live="polite">
        <span className="loading-spinner" aria-hidden="true" />
        <p>Loading, please wait...</p>
      </div>
    </dialog>, document.body,
  );
}
