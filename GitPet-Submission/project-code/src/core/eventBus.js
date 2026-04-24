// ============================================================
// eventBus.js — Tiny publish / subscribe event bus
// ============================================================
// Every module communicates through this bus rather than
// importing each other directly. This means:
//   • Zero circular-dependency risk
//   • Easy to add new listeners without touching emitters
//   • Simple to unit-test (just watch emitted events)
//
// Usage:
//   import bus from './eventBus.js';
//
//   // Subscribe
//   const off = bus.on('xp:gained', ({ amount }) => { ... });
//   off(); // unsubscribe
//
//   // Publish
//   bus.emit('xp:gained', { amount: 20 });
//
// Recognised events (convention — not enforced):
//   pet:mood-changed   { mood }
//   pet:leveled-up     { level }
//   pet:hp-changed     { hp }
//   xp:gained          { amount, reason }
//   action:feed        {}
//   action:play        { trick }
//   action:commit      { message }
//   focus:start        { duration }
//   focus:tick         { remaining }
//   focus:end          { completed }
//   achievement:unlock { id }
//   git:scanned        { health }
//   ui:render          {}
//   app:exit           {}
//   app:reset          {}

class EventBus {
  constructor() {
    /** @type {Map<string, Set<Function>>} */
    this._listeners = new Map();
  }

  /**
   * Subscribe to an event.
   * @param {string}   event   - Event name
   * @param {Function} handler - Called with the payload object
   * @returns {Function}  Unsubscribe function
   */
  on(event, handler) {
    if (!this._listeners.has(event)) {
      this._listeners.set(event, new Set());
    }
    this._listeners.get(event).add(handler);

    // Return an "off" function for easy cleanup
    return () => this.off(event, handler);
  }

  /**
   * Subscribe to an event exactly once.
   * @param {string}   event
   * @param {Function} handler
   */
  once(event, handler) {
    const wrapper = (payload) => {
      handler(payload);
      this.off(event, wrapper);
    };
    this.on(event, wrapper);
  }

  /**
   * Unsubscribe a specific handler.
   * @param {string}   event
   * @param {Function} handler
   */
  off(event, handler) {
    this._listeners.get(event)?.delete(handler);
  }

  /**
   * Publish an event with an optional payload.
   * All handlers are called synchronously.
   * @param {string} event
   * @param {*}      [payload={}]
   */
  emit(event, payload = {}) {
    const handlers = this._listeners.get(event);
    if (handlers) {
      for (const h of handlers) {
        try {
          h(payload);
        } catch (err) {
          // Log but don't let one broken handler kill the rest
          console.error(`[EventBus] Error in handler for "${event}":`, err);
        }
      }
    }
  }

  /**
   * Remove ALL listeners for an event (or all events if omitted).
   * Useful for teardown / tests.
   * @param {string} [event]
   */
  clear(event) {
    if (event) {
      this._listeners.delete(event);
    } else {
      this._listeners.clear();
    }
  }

  /**
   * Returns the number of registered listeners for an event.
   * Useful for debugging / tests.
   * @param {string} event
   * @returns {number}
   */
  listenerCount(event) {
    return this._listeners.get(event)?.size ?? 0;
  }
}

// Export a singleton so every import gets the same bus
const bus = new EventBus();
export default bus;