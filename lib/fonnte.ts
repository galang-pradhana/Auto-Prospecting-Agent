export interface FonnteResponse {
  status: boolean;
  message: string;
  detail?: string;
  [key: string]: any;
}

export interface FonnteDirectResponse {
  reply: string;
  delay?: number;
  inboxid?: string;
}

import { sanitizeWaNumber } from '@/lib/utils';

export function parseFonnteWebhook(body: any) {
  const sender = (body.sender || body.from || '').toString();
  const device = (body.device || '').toString();
  const message = body.message || '';
  const status = body.status || '';
  const inboxid = body.inboxid || body.inbox_id || '';

  const cleanSender = sanitizeWaNumber(sender) || '';
  const cleanDevice = sanitizeWaNumber(device) || '';

  // is_me: Fonnte does not send this field natively.
  // Detect outgoing messages by explicit flag only - never by sender===device
  // because that comparison is unreliable and causes false positives.
  const isMe = body.is_me === true || body.is_me === 'true' || body.is_me === 1;

  // isStatusUpdate: triggered by status change events (no message body)
  const isStatusUpdate = (
    status === 'connect' || 
    status === 'disconnect' || 
    status === 'reconnect' ||
    (!message && !status)
  );

  return {
    sender: cleanSender,
    device: cleanDevice,
    message,
    isMe,
    isStatusUpdate,
    inboxid
  };
}

function formatPhone(phone: string): string {
  // Strip all non-digit characters
  let digits = phone.replace(/\D/g, '');
  
  // Replace leading '0' with '62' (Indonesia country code)
  if (digits.startsWith('0')) {
    digits = '62' + digits.substring(1);
  }
  
  return digits;
}

/**
 * Sends an immediate message via Fonnte
 * Supports token rotation if an array of tokens is provided
 */
export async function sendMessage(phone: string, message: string, delay?: number, tokens?: string[], inboxid?: string): Promise<FonnteResponse> {
  try {
    const formattedPhone = formatPhone(phone);
    let token = process.env.FONNTE_TOKEN;
    
    // Token rotation logic - strictly filter for non-empty tokens
    if (tokens && tokens.length > 0) {
      const validTokens = tokens.filter(t => t && typeof t === 'string' && t.trim().length > 10);
      if (validTokens.length > 0) {
        const randomIndex = Math.floor(Math.random() * validTokens.length);
        token = validTokens[randomIndex];
      }
    }
    
    if (!token) {
      throw new Error("FONNTE_TOKEN is not configured in environment variables.");
    }

    const formData = new FormData();
    formData.append('target', formattedPhone);
    formData.append('message', message);
    
    if (delay) {
      formData.append('delay', String(delay));
    }

    if (inboxid) {
      formData.append('inboxid', inboxid);
    }

    const response = await fetch('https://api.fonnte.com/send', {
      method: 'POST',
      headers: {
        'Authorization': token
      },
      body: formData
    });

    const data = await response.json();
    return data;
  } catch (error: any) {
    console.error("[Fonnte API] sendMessage error:", error);
    return {
      status: false,
      message: "Internal Server Error or Network Issue",
      detail: error.message
    };
  }
}

/**
 * Schedules a message to be sent via Fonnte at a specific time
 */
export async function scheduleMessage(phone: string, message: string, scheduledAt: Date, tokens?: string[]): Promise<FonnteResponse> {
  try {
    const formattedPhone = formatPhone(phone);
    let token = process.env.FONNTE_TOKEN;
    
    // Token rotation logic - strictly filter for non-empty tokens
    if (tokens && tokens.length > 0) {
      const validTokens = tokens.filter(t => t && typeof t === 'string' && t.trim().length > 10);
      if (validTokens.length > 0) {
        const randomIndex = Math.floor(Math.random() * validTokens.length);
        token = validTokens[randomIndex];
      }
    }
    
    if (!token) {
      throw new Error("FONNTE_TOKEN is not configured in environment variables.");
    }

    // Format schedule to YYYY-MM-DD HH:mm:ss (Local Time)
    const pad = (n: number) => n.toString().padStart(2, '0');
    const year = scheduledAt.getFullYear();
    const month = pad(scheduledAt.getMonth() + 1);
    const day = pad(scheduledAt.getDate());
    const hours = pad(scheduledAt.getHours());
    const minutes = pad(scheduledAt.getMinutes());
    const seconds = pad(scheduledAt.getSeconds());
    const scheduleString = `${year}-${month}-${day} ${hours}:${minutes}:${seconds}`;

    const formData = new FormData();
    formData.append('target', formattedPhone);
    formData.append('message', message);
    formData.append('schedule', scheduleString);

    const response = await fetch('https://api.fonnte.com/send', {
      method: 'POST',
      headers: {
        'Authorization': token
      },
      body: formData
    });

    const data = await response.json();
    return data;
  } catch (error: any) {
    console.error("[Fonnte API] scheduleMessage error:", error);
    return {
      status: false,
      message: "Internal Server Error or Network Issue",
      detail: error.message
    };
  }
}

/**
 * Synchronizes the Webhook URL with Fonnte for a specific token
 */
export async function syncFonnteWebhook(token: string): Promise<FonnteResponse> {
  try {
    const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://auto-prospect.web.id';
    const webhookUrl = `${appUrl}/api/fonnte/webhook`;
    
    console.log(`[Fonnte API] Syncing Webhook for token ${token.substring(0, 8)}... to ${webhookUrl}`);
    
    const formData = new FormData();
    formData.append('webhook', webhookUrl);
    formData.append('webhookstatus', webhookUrl); // Also catch status updates at the same URL
    formData.append('autoread', 'true');
    
    const response = await fetch('https://api.fonnte.com/update-device', {
      method: 'POST',
      headers: {
        'Authorization': token
      },
      body: formData
    });

    const data = await response.json();
    return data;
  } catch (error: any) {
    console.error("[Fonnte API] syncFonnteWebhook error:", error);
    return {
      status: false,
      message: "Failed to sync webhook",
      detail: error.message
    };
  }
}
