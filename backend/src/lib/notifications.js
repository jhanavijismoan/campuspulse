'use strict';
const { pool } = require('../db');

/**
 * Create a notification for a single user.
 * @param {number} userId
 * @param {{ title: string, body: string, severity?: string, action_url?: string, related_type?: string, related_id?: number }} opts
 */
async function createNotification(userId, opts) {
  const { title, body, severity = 'info', action_url = null, related_type = null, related_id = null } = opts;
  const { rows } = await pool.query(
    `INSERT INTO notifications (user_id, title, body, severity, action_url, related_type, related_id)
     VALUES ($1, $2, $3, $4, $5, $6, $7)
     RETURNING id`,
    [userId, title, body, severity, action_url, related_type, related_id]
  );
  return rows[0];
}

/**
 * Create notifications for multiple users at once (bulk insert).
 * @param {number[]} userIds
 * @param {{ title: string, body: string, severity?: string, action_url?: string, related_type?: string, related_id?: number }} opts
 */
async function createNotificationBulk(userIds, opts) {
  if (!userIds || userIds.length === 0) return;
  const { title, body, severity = 'info', action_url = null, related_type = null, related_id = null } = opts;
  const values = userIds.map((uid, i) => {
    const base = i * 7;
    return `($${base + 1}, $${base + 2}, $${base + 3}, $${base + 4}, $${base + 5}, $${base + 6}, $${base + 7})`;
  });
  const params = userIds.flatMap(uid => [uid, title, body, severity, action_url, related_type, related_id]);
  await pool.query(
    `INSERT INTO notifications (user_id, title, body, severity, action_url, related_type, related_id)
     VALUES ${values.join(', ')}`,
    params
  );
}

module.exports = { createNotification, createNotificationBulk };
