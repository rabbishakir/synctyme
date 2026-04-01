/**
 * Placeholder mailer — wire to Resend/SendGrid in production.
 */
export async function sendEmail(params: {
  to: string;
  subject: string;
  text: string;
}): Promise<void> {
  if (process.env.NODE_ENV === "development") {
    console.info("[email]", params.subject, "→", params.to);
  }
}
