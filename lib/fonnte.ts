export interface FonnteResponse {
  status: boolean;
  message: string;
  detail?: string;
  [key: string]: any;
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
export async function sendMessage(phone: string, message: string, delay?: number, tokens?: string[]): Promise<FonnteResponse> {
  try {
    const formattedPhone = formatPhone(phone);
    let token = process.env.FONNTE_TOKEN;
    
    // Token rotation logic
    if (tokens && tokens.length > 0) {
      const validTokens = tokens.filter(t => t && t.trim() !== '');
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
    
    // Token rotation logic
    if (tokens && tokens.length > 0) {
      const validTokens = tokens.filter(t => t && t.trim() !== '');
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
