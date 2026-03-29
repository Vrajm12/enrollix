import twilio from "twilio";
import { env } from "../config.js";

// Initialize Twilio client
const twilioClient = twilio(env.TWILIO_ACCOUNT_SID, env.TWILIO_AUTH_TOKEN);

export const twilioService = {
  /**
   * Send SMS via Twilio
   * @param toPhoneNumber - Recipient phone number in E.164 format
   * @param message - Message body
   * @returns Message SID or null if credentials not configured
   */
  async sendSMS(toPhoneNumber: string, message: string): Promise<string | null> {
    try {
      // If Twilio not configured, return null
      if (!env.TWILIO_ACCOUNT_SID || !env.TWILIO_AUTH_TOKEN || !env.TWILIO_PHONE_NUMBER) {
        console.warn("Twilio credentials not configured");
        return null;
      }

      // Validate phone number format
      const cleanPhone = toPhoneNumber.replace(/\D/g, "");
      if (cleanPhone.length < 10) {
        throw new Error("Invalid phone number format");
      }

      // Ensure phone number is in E.164 format
      let formattedPhone = toPhoneNumber;
      if (!toPhoneNumber.startsWith("+")) {
        if (toPhoneNumber.startsWith("0")) {
          formattedPhone = "+91" + toPhoneNumber.slice(1);
        } else if (cleanPhone.length === 10) {
          formattedPhone = "+91" + cleanPhone;
        } else if (cleanPhone.length === 12 && !toPhoneNumber.startsWith("91")) {
          formattedPhone = "+91" + cleanPhone.slice(2);
        } else {
          formattedPhone = "+" + cleanPhone;
        }
      }

      // Send SMS via Twilio
      const result = await twilioClient.messages.create({
        body: message,
        from: env.TWILIO_PHONE_NUMBER,
        to: formattedPhone
      });

      console.log(`SMS sent successfully to ${formattedPhone}. SID: ${result.sid}`);
      return result.sid;
    } catch (error) {
      console.error("Failed to send SMS via Twilio:", error);
      throw error;
    }
  },

  /**
   * Get SMS message status
   * @param messageSid - Twilio message SID
   * @returns Message status (queued, sending, sent, failed, delivered, etc.)
   */
  async getMessageStatus(messageSid: string): Promise<string | null> {
    try {
      if (!env.TWILIO_ACCOUNT_SID || !env.TWILIO_AUTH_TOKEN) {
        return null;
      }

      const message = await twilioClient.messages(messageSid).fetch();
      return message.status;
    } catch (error) {
      console.error("Failed to fetch message status:", error);
      return null;
    }
  }
};
