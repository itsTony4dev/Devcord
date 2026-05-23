import { Resend } from "resend";

const resend = new Resend(process.env.RESEND_API_KEY);

/**
 * Send a transactional email via Resend.
 * @param {{ to: string | string[], subject: string, html: string }} options
 */
export async function sendEmail({ to, subject, html }) {
  const from = process.env.EMAIL_FROM;
  if (!from) {
    throw new Error("EMAIL_FROM is not configured");
  }
  if (!process.env.RESEND_API_KEY) {
    throw new Error("RESEND_API_KEY is not configured");
  }

  const { data, error } = await resend.emails.send({
    from,
    to,
    subject,
    html,
  });

  if (error) {
    throw new Error(error.message);
  }

  return data;
}
