import nodemailer, { Transporter } from "nodemailer";
import { env } from "../config.js";

let transporter: Transporter | null = null;

const requiredFields = [env.SMTP_HOST, env.SMTP_USER, env.SMTP_PASS, env.SMTP_FROM];

const isConfigured = () => requiredFields.every((value) => Boolean(value && value.trim().length > 0));

const getTransporter = () => {
  if (!isConfigured()) {
    throw new Error("SMTP is not configured. Please set SMTP_HOST, SMTP_USER, SMTP_PASS, and SMTP_FROM.");
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

const verifyConnection = async () => {
  const client = getTransporter();
  await client.verify();
};

const sendLeadEmail = async (params: {
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
    from: env.SMTP_FROM,
    to: params.to,
    subject: rendered.subject,
    text: rendered.text,
    html: rendered.html
  });

  return {
    messageId: result.messageId
  };
};

export const emailService = {
  isConfigured,
  verifyConnection,
  sendLeadEmail,
  renderLeadTemplate
};
