// Global API activity monitoring
// Tracks in-flight requests to drive the global loading spinner and
// broadcasts request failures so a global error dialog can be shown.

export interface ApiErrorEvent {
  message: string;
  endpoint: string;
}

class ApiMonitor {
  private activeCount = 0;
  private listeners = new Set<(active: boolean) => void>();
  private errorListeners = new Set<(event: ApiErrorEvent) => void>();

  start() {
    this.activeCount++;
    this.notify();
  }

  finish(success: boolean, error?: ApiErrorEvent) {
    this.activeCount = Math.max(0, this.activeCount - 1);
    if (!success && error) {
      this.emitError(error);
    }
    this.notify();
  }

  isActive() {
    return this.activeCount > 0;
  }

  subscribe(listener: (active: boolean) => void) {
    this.listeners.add(listener);
    listener(this.isActive());
    return () => {
      this.listeners.delete(listener);
    };
  }

  subscribeErrors(listener: (event: ApiErrorEvent) => void) {
    this.errorListeners.add(listener);
    return () => {
      this.errorListeners.delete(listener);
    };
  }

  private notify() {
    const active = this.isActive();
    this.listeners.forEach((listener) => listener(active));
  }

  private emitError(event: ApiErrorEvent) {
    this.errorListeners.forEach((listener) => listener(event));
  }
}

export const apiMonitor = new ApiMonitor();