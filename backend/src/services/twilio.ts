import twilio from "twilio";
import { env } from "../config.js";

// Initialize Twilio client
const twilioClient = twilio(env.TWILIO_ACCOUNT_SID, env.TWILIO_AUTH_TOKEN);
const isTestEnv = process.env.NODE_ENV === "test";

const getTwilioCredentials = () => ({
  accountSid: process.env.TWILIO_ACCOUNT_SID ?? env.TWILIO_ACCOUNT_SID,
  authToken: process.env.TWILIO_AUTH_TOKEN ?? env.TWILIO_AUTH_TOKEN,
  phoneNumber: process.env.TWILIO_PHONE_NUMBER ?? env.TWILIO_PHONE_NUMBER,
});

export const twilioService = {
  /**
   * Send SMS via Twilio
   * @param toPhoneNumber - Recipient phone number in E.164 format
   * @param message - Message body
   * @returns Message SID or null if credentials not configured
   */
  async sendSMS(toPhoneNumber: string, message: string): Promise<string | null> {
    try {
      const credentials = getTwilioCredentials();

      // If Twilio not configured, return null
      if (!credentials.accountSid || !credentials.authToken || !credentials.phoneNumber) {
        console.warn("Twilio credentials not configured");
        return null;
      }

      if (message.length > 1600) {
        throw new Error("Message exceeds 1600 character limit");
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

      // Avoid real outbound SMS in automated tests.
      if (isTestEnv) {
        return "SM_TEST_MESSAGE_SID";
      }

      // Send SMS via Twilio
      const result = await twilioClient.messages.create({
        body: message,
        from: credentials.phoneNumber,
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
      const credentials = getTwilioCredentials();

      if (!credentials.accountSid || !credentials.authToken) {
        return null;
      }

      if (!/^SM[0-9a-fA-F]{16,}$/.test(messageSid)) {
        return null;
      }

      if (isTestEnv) {
        return "delivered";
      }

      const message = await twilioClient.messages(messageSid).fetch();
      return message.status;
    } catch (error) {
      console.error("Failed to fetch message status:", error);
      return null;
    }
  }
};
