const appUrl = process.env.APP_URL || "http://localhost:4321";

export async function sendVerificationEmail(email: string, token: string): Promise<void> {
  const link = `${appUrl}/api/auth/verify-email?token=${token}`;

  if (process.env.RESEND_API_KEY) {
    const { Resend } = await import("resend");
    const resend = new Resend(process.env.RESEND_API_KEY);
    await resend.emails.send({
      from: process.env.EMAIL_FROM || "onboarding@resend.dev",
      to: email,
      subject: "Verify your email",
      html: `<p>Click <a href="${link}">here</a> to verify your email address.</p><p>Or paste this link: ${link}</p>`,
    });
  } else {
    console.log(`[EMAIL] Verification link for ${email}: ${link}`);
  }
}
