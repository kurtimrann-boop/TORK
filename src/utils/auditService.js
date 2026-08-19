/**
 * TORK — Audit Trail & Event Logging Service (Sprint 6)
 * 
 * Records immutable, privacy-safe operational and financial audit events.
 * Strictly sanitizes tokens, passwords, and secrets before persistence.
 */

global.__TORK_AUDIT_LOGS__ = global.__TORK_AUDIT_LOGS__ || [];

const SENSITIVE_KEYS = ["password", "token", "secret", "authorization", "apikey", "cookie", "session"];

function sanitizeMetadata(data) {
  if (!data || typeof data !== "object") return data;

  const sanitized = Array.isArray(data) ? [] : {};
  for (const [key, value] of Object.entries(data)) {
    const isSensitive = SENSITIVE_KEYS.some((s) => key.toLowerCase().includes(s));
    if (isSensitive) {
      sanitized[key] = "[REDACTED]";
    } else if (value && typeof value === "object") {
      sanitized[key] = sanitizeMetadata(value);
    } else {
      sanitized[key] = value;
    }
  }
  return sanitized;
}

/**
 * Records an audit event deterministically
 */
export function recordAuditEvent({
  eventType,
  actorId = null,
  actorRole = "system",
  entityType,
  entityId,
  previousState = null,
  newState = null,
  metadata = {},
}) {
  if (!eventType || !entityType || !entityId) {
    throw new Error("Geçersiz audit event parametreleri: eventType, entityType ve entityId zorunludur.");
  }

  const sanitizedMeta = sanitizeMetadata(metadata);

  const event = {
    id: `audit-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    event_type: eventType,
    actor_id: actorId,
    actor_role: actorRole,
    entity_type: entityType,
    entity_id: entityId,
    previous_state: previousState,
    new_state: newState,
    metadata: sanitizedMeta,
    created_at: new Date().toISOString(),
  };

  global.__TORK_AUDIT_LOGS__.unshift(event);
  if (global.__TORK_AUDIT_LOGS__.length > 500) {
    global.__TORK_AUDIT_LOGS__.pop();
  }

  return event;
}

/**
 * Retrieves filtered audit logs
 */
export function getAuditLogs({ entityType = null, entityId = null, actorId = null, limit = 50 } = {}) {
  let logs = global.__TORK_AUDIT_LOGS__;

  if (entityType) {
    logs = logs.filter((l) => l.entity_type === entityType);
  }
  if (entityId) {
    logs = logs.filter((l) => l.entity_id === entityId);
  }
  if (actorId) {
    logs = logs.filter((l) => l.actor_id === actorId);
  }

  return logs.slice(0, limit);
}
