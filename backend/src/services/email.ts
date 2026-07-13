import axios from "axios";
import nodemailer, { Transporter } from "nodemailer";
import { env } from "../config.js";

let transporter: Transporter | null = null;

type EmailProvider = "smtp" | "brevo_api";

const getProvider = (): EmailProvider => env.EMAIL_PROVIDER ?? (env.BREVO_API_KEY ? "brevo_api" : "smtp");

const getFromAddress = () => env.EMAIL_FROM ?? env.SMTP_FROM;

const isNonEmpty = (value?: string) => Boolean(value && value.trim().length > 0);

const isConfigured = () => {
  const from = getFromAddress();
  if (getProvider() === "brevo_api") {
    return isNonEmpty(env.BREVO_API_KEY) && isNonEmpty(from);
  }

  return [env.SMTP_HOST, env.SMTP_USER, env.SMTP_PASS, from].every(isNonEmpty);
};

const parseAddress = (value: string) => {
  const trimmed = value.trim();
  const match = trimmed.match(/^(?:"?(.+?)"?\s*)?<([^<>\s]+@[^<>\s]+)>$/);
  if (!match) {
    return { email: trimmed };
  }

  const name = match[1]?.trim().replace(/^"|"$/g, "");
  return {
    email: match[2].trim(),
    ...(name ? { name } : {})
  };
};

const getTransporter = () => {
  if (!isConfigured()) {
    throw new Error("SMTP is not configured. Please set SMTP_HOST, SMTP_USER, SMTP_PASS, and SMTP_FROM or EMAIL_FROM.");
  }

  if (!transporter) {
    transporter = nodemailer.createTransport({
      host: env.SMTP_HOST,
      port: env.SMTP_PORT,
      secure: env.SMTP_SECURE,
      connectionTimeout: env.SMTP_CONNECTION_TIMEOUT_MS,
      greetingTimeout: env.SMTP_CONNECTION_TIMEOUT_MS,
      socketTimeout: env.SMTP_SOCKET_TIMEOUT_MS,
      auth: {
        user: env.SMTP_USER,
        pass: env.SMTP_PASS
      },
      pool: true
    });
  }

  return transporter;
};

export type LeadEmailData = {
  name: string;
  course?: string | null;
  phone: string;
  email: string;
  district?: string | null;
  locality?: string | null;
  state?: string | null;
  pincode?: string | null;
};

const applyTemplate = (template: string, lead: LeadEmailData) => {
  const replacements: Record<string, string> = {
    name: lead.name,
    course: lead.course ?? "",
    phone: lead.phone,
    email: lead.email,
    district: lead.district ?? "",
    locality: lead.locality ?? "",
    state: lead.state ?? "",
    pincode: lead.pincode ?? ""
  };

  return template.replace(/\{\{\s*([a-zA-Z0-9_]+)\s*\}\}/g, (_match, key: string) => {
    return replacements[key] ?? "";
  });
};

const renderLeadTemplate = (params: { subject: string; message: string; lead: LeadEmailData }) => {
  const subject = applyTemplate(params.subject, params.lead);
  const text = applyTemplate(params.message, params.lead);
  const html = text.replace(/\n/g, "<br/>");

  return { subject, text, html };
};

const formatBrevoError = (error: unknown) => {
  if (!axios.isAxiosError(error)) {
    return error instanceof Error ? error.message : "Unknown Brevo API error";
  }

  const status = error.response?.status;
  const data = error.response?.data as { message?: unknown; code?: unknown } | string | undefined;
  const apiMessage =
    typeof data === "string"
      ? data
      : typeof data?.message === "string"
        ? data.message
        : error.message;
  const code = typeof data !== "string" && typeof data?.code === "string" ? ` (${data.code})` : "";
  return status ? `Brevo API ${status}${code}: ${apiMessage}` : error.message;
};

const getBrevoHeaders = () => ({
  accept: "application/json",
  "api-key": env.BREVO_API_KEY!,
  "content-type": "application/json"
});

const verifyBrevoApi = async () => {
  if (!isConfigured()) {
    throw new Error("Brevo API is not configured. Set BREVO_API_KEY and EMAIL_FROM or SMTP_FROM.");
  }

  try {
    await axios.get("https://api.brevo.com/v3/account", {
      headers: getBrevoHeaders(),
      timeout: env.BREVO_API_TIMEOUT_MS
    });
  } catch (error) {
    throw new Error(formatBrevoError(error));
  }
};

const verifyConnection = async () => {
  if (getProvider() === "brevo_api") {
    await verifyBrevoApi();
    return;
  }

  const client = getTransporter();
  await client.verify();
};

const sendLeadEmailViaSmtp = async (params: {
  to: string;
  subject: string;
  message: string;
  lead: LeadEmailData;
}) => {
  const client = getTransporter();
  const rendered = renderLeadTemplate({
    subject: params.subject,
    message: params.message,
    lead: params.lead
  });

  const result = await client.sendMail({
    from: getFromAddress(),
    to: params.to,
    subject: rendered.subject,
    text: rendered.text,
    html: rendered.html
  });

  return {
    messageId: result.messageId
  };
};

const sendLeadEmailViaBrevoApi = async (params: {
  to: string;
  subject: string;
  message: string;
  lead: LeadEmailData;
}) => {
  if (!isConfigured()) {
    throw new Error("Brevo API is not configured. Set BREVO_API_KEY and EMAIL_FROM or SMTP_FROM.");
  }

  const rendered = renderLeadTemplate({
    subject: params.subject,
    message: params.message,
    lead: params.lead
  });
  const sender = parseAddress(getFromAddress()!);

  try {
    const result = await axios.post(
      env.BREVO_API_URL,
      {
        sender,
        to: [{ email: params.to, name: params.lead.name }],
        subject: rendered.subject,
        textContent: rendered.text,
        htmlContent: rendered.html
      },
      {
        headers: getBrevoHeaders(),
        timeout: env.BREVO_API_TIMEOUT_MS
      }
    );

    return {
      messageId: typeof result.data?.messageId === "string" ? result.data.messageId : "brevo-api"
    };
  } catch (error) {
    throw new Error(formatBrevoError(error));
  }
};

const sendLeadEmail = async (params: {
  to: string;
  subject: string;
  message: string;
  lead: LeadEmailData;
}) => {
  if (getProvider() === "brevo_api") {
    return sendLeadEmailViaBrevoApi(params);
  }

  return sendLeadEmailViaSmtp(params);
};

export const emailService = {
  isConfigured,
  verifyConnection,
  sendLeadEmail,
  renderLeadTemplate
};