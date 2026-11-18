import { Notification } from "../models/Notification.js";
import { emitNotification } from "../sockets/socketManager.js";
import { ROLES, RISK_LEVELS } from "../utils/constants.js";
import { maskIp } from "../utils/ipMask.js";
import { env } from "../config/env.js";
import { logger } from "../utils/logger.js";

// Rate limiting cooldown for external email alerts (5 minutes)
export const EMAIL_ALERT_COOLDOWN_MS = 5 * 60 * 1000;
let lastEmailSentTimestamp = 0;

/**
 * Sends an email alert via Resend API.
 *
 * @param {object} params
 * @param {string} params.apiKey
 * @param {string} params.to
 * @param {string} params.subject
 * @param {string} params.html
 * @returns {Promise<boolean>}
 */
async function sendResendEmail({ apiKey, to, subject, html }) {
  try {
    const res = await globalThis.fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`
      },
      body: JSON.stringify({
        from: "AI CyberShield <alerts@threatlens.io>",
        to: [to],
        subject,
        html
      })
    });

    if (!res.ok) {
      const errBody = await res.text();
      logger.warn({ msg: "Resend email dispatch failed", status: res.status, errBody });
      return false;
    }

    return true;
  } catch (err) {
    logger.warn({ msg: "Resend email delivery exception", error: err.message });
    return false;
  }
}

/**
 * Sends an email alert via Brevo (Sendinblue) API.
 *
 * @param {object} params
 * @param {string} params.apiKey
 * @param {string} params.to
 * @param {string} params.subject
 * @param {string} params.html
 * @returns {Promise<boolean>}
 */
async function sendBrevoEmail({ apiKey, to, subject, html }) {
  try {
    const res = await globalThis.fetch("https://api.brevo.com/v3/smtp/email", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "api-key": apiKey
      },
      body: JSON.stringify({
        sender: { name: "AI CyberShield Alerts", email: "alerts@threatlens.io" },
        to: [{ email: to }],
        subject,
        htmlContent: html
      })
    });

    if (!res.ok) {
      const errBody = await res.text();
      logger.warn({ msg: "Brevo email dispatch failed", status: res.status, errBody });
      return false;
    }

    return true;
  } catch (err) {
    logger.warn({ msg: "Brevo email delivery exception", error: err.message });
    return false;
  }
}

/**
 * Dispatches an external email notification for a critical incident if configured.
 *
 * @param {object} incident
 * @returns {Promise<void>}
 */
export async function dispatchEmailAlertIfConfigured(incident) {
  const apiKey = env.RESEND_API_KEY || env.BREVO_API_KEY;
  const recipient = env.ALERT_EMAIL_TO || env.ADMIN_EMAIL;

  if (!apiKey || !recipient) {
    return; // Email integration not configured
  }

  const now = Date.now();
  if (now - lastEmailSentTimestamp < EMAIL_ALERT_COOLDOWN_MS) {
    logger.info({
      msg: "Critical alert email suppressed by cooldown rate limiter",
      cooldownRemainingSec: Math.round(
        (EMAIL_ALERT_COOLDOWN_MS - (now - lastEmailSentTimestamp)) / 1000
      )
    });
    return;
  }

  const subject = `[CRITICAL ALERT] ${incident.mlClass} Detected - Threat Score ${incident.score}/100`;
  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #dc2626; border-radius: 8px;">
      <h2 style="color: #dc2626; margin-top: 0;">AI CyberShield: Critical Threat Detected</h2>
      <p>A critical severity security incident has been flagged by the automated threat detection pipeline.</p>
      <table style="width: 100%; border-collapse: collapse; margin-top: 15px;">
        <tr><td style="padding: 8px; font-weight: bold; border-bottom: 1px solid #e5e7eb;">Incident ID:</td><td style="padding: 8px; border-bottom: 1px solid #e5e7eb;">${incident._id}</td></tr>
        <tr><td style="padding: 8px; font-weight: bold; border-bottom: 1px solid #e5e7eb;">Attack Class:</td><td style="padding: 8px; border-bottom: 1px solid #e5e7eb; color: #dc2626; font-weight: bold;">${incident.mlClass}</td></tr>
        <tr><td style="padding: 8px; font-weight: bold; border-bottom: 1px solid #e5e7eb;">Threat Score:</td><td style="padding: 8px; border-bottom: 1px solid #e5e7eb; font-weight: bold;">${incident.score} / 100</td></tr>
        <tr><td style="padding: 8px; font-weight: bold; border-bottom: 1px solid #e5e7eb;">Risk Level:</td><td style="padding: 8px; border-bottom: 1px solid #e5e7eb;">Critical</td></tr>
        <tr><td style="padding: 8px; font-weight: bold; border-bottom: 1px solid #e5e7eb;">Model Confidence:</td><td style="padding: 8px; border-bottom: 1px solid #e5e7eb;">${(incident.confidence * 100).toFixed(1)}%</td></tr>
        <tr><td style="padding: 8px; font-weight: bold; border-bottom: 1px solid #e5e7eb;">Target Destination:</td><td style="padding: 8px; border-bottom: 1px solid #e5e7eb;">${maskIp(incident.destination)}</td></tr>
        <tr><td style="padding: 8px; font-weight: bold; border-bottom: 1px solid #e5e7eb;">Protocol:</td><td style="padding: 8px; border-bottom: 1px solid #e5e7eb;">${incident.protocol || "TCP"}</td></tr>
        <tr><td style="padding: 8px; font-weight: bold;">Timestamp:</td><td style="padding: 8px;">${incident.detectedAt || new Date().toISOString()}</td></tr>
      </table>
      <p style="margin-top: 20px; font-size: 13px; color: #6b7280;">This is an automated operational alert generated by AI CyberShield. Sensitive internal data has been redacted.</p>
    </div>
  `;

  let sent = false;
  if (env.RESEND_API_KEY) {
    sent = await sendResendEmail({ apiKey: env.RESEND_API_KEY, to: recipient, subject, html });
  } else if (env.BREVO_API_KEY) {
    sent = await sendBrevoEmail({ apiKey: env.BREVO_API_KEY, to: recipient, subject, html });
  }

  if (sent) {
    lastEmailSentTimestamp = now;
    logger.info({
      msg: "Dispatched critical alert email",
      to: recipient,
      incidentId: incident._id
    });
  }
}

/**
 * Creates in-app notifications and initiates external alerting for Critical incidents.
 *
 * @param {object} params
 * @param {object} params.incident
 * @param {import("socket.io").Server} [params.io]
 * @param {string} [params.datasetId]
 * @returns {Promise<Notification|null>}
 */
export async function checkAndTriggerAlert({ incident, io = null, datasetId = null }) {
  if (!incident || incident.riskLevel !== RISK_LEVELS.CRITICAL) {
    return null;
  }

  try {
    const notification = await Notification.create({
      title: `Critical Threat Alert: ${incident.mlClass}`,
      message: `Critical threat detected (${incident.mlClass}) with score ${incident.score}/100. Target: ${maskIp(incident.destination)}.`,
      severity: "Critical",
      incidentId: incident._id,
      datasetId: datasetId || incident.datasetId || null,
      targetRoles: [ROLES.ADMIN, ROLES.ANALYST]
    });

    if (io) {
      emitNotification(io, notification);
    }

    // Attempt optional email alert in background
    dispatchEmailAlertIfConfigured(incident).catch((err) => {
      logger.error({ msg: "Background alert email failed", error: err.message });
    });

    return notification;
  } catch (err) {
    logger.error({ msg: "Failed to create critical threat notification", error: err.message });
    return null;
  }
}
