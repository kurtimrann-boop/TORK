/**
 * TORK Operational Metrics & Event Telemetry (Sprint 12)
 * 
 * In-memory operational event aggregators and counters for tracking system health,
 * conversion rates, failure rates, and incident detection without storing PII or secrets.
 */

export const METRIC_EVENTS = {
  // Success Events
  LOAD_CREATED: "LOAD_CREATED",
  BID_CREATED: "BID_CREATED",
  BID_ACCEPTED: "BID_ACCEPTED",
  TRANSPORT_CREATED: "TRANSPORT_CREATED",
  TRANSPORT_STARTED: "TRANSPORT_STARTED",
  TRANSPORT_DELIVERED: "TRANSPORT_DELIVERED",
  POD_UPLOADED: "POD_UPLOADED",
  POD_VERIFIED: "POD_VERIFIED",
  SETTLEMENT_READY: "SETTLEMENT_READY",
  SETTLEMENT_APPROVED: "SETTLEMENT_APPROVED",
  SETTLEMENT_PAID: "SETTLEMENT_PAID",
  SETTLEMENT_DISPUTED: "SETTLEMENT_DISPUTED",

  // Failure Events
  LOAD_CREATE_FAILED: "LOAD_CREATE_FAILED",
  BID_CREATE_FAILED: "BID_CREATE_FAILED",
  BID_ACCEPT_FAILED: "BID_ACCEPT_FAILED",
  TRANSPORT_UPDATE_FAILED: "TRANSPORT_UPDATE_FAILED",
  POD_UPLOAD_FAILED: "POD_UPLOAD_FAILED",
  SETTLEMENT_FAILED: "SETTLEMENT_FAILED",
  WALLET_OPERATION_FAILED: "WALLET_OPERATION_FAILED",
};

// Global in-memory metrics store for runtime monitoring
global.__TORK_OPERATIONAL_METRICS__ = global.__TORK_OPERATIONAL_METRICS__ || {
  counters: new Map(),
  recentEvents: [],
  startedAt: new Date().toISOString(),
};

export function recordMetricEvent(eventName, { correlationId = null, actorRole = null, durationMs = null } = {}) {
  if (!METRIC_EVENTS[eventName]) {
    eventName = "CUSTOM_" + eventName;
  }

  const metrics = global.__TORK_OPERATIONAL_METRICS__;
  const currentCount = metrics.counters.get(eventName) || 0;
  metrics.counters.set(eventName, currentCount + 1);

  const eventRecord = {
    eventName,
    correlationId,
    actorRole,
    durationMs,
    timestamp: new Date().toISOString(),
  };

  metrics.recentEvents.push(eventRecord);
  if (metrics.recentEvents.length > 500) {
    metrics.recentEvents.shift();
  }

  return eventRecord;
}

export function getOperationalMetricsSummary() {
  const metrics = global.__TORK_OPERATIONAL_METRICS__;
  const counterObj = {};
  for (const [k, v] of metrics.counters.entries()) {
    counterObj[k] = v;
  }

  return {
    uptimeStartedAt: metrics.startedAt,
    totalEventsRecorded: metrics.recentEvents.length,
    counters: counterObj,
    recentEventsSample: metrics.recentEvents.slice(-20),
  };
}

export function resetOperationalMetrics() {
  global.__TORK_OPERATIONAL_METRICS__.counters.clear();
  global.__TORK_OPERATIONAL_METRICS__.recentEvents = [];
  global.__TORK_OPERATIONAL_METRICS__.startedAt = new Date().toISOString();
}
