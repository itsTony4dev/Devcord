const passwordResetConfirmationEmail = (username) => {
  return `
    <div style="max-width: 600px; margin: 0 auto; padding: 20px; font-family: Arial, sans-serif;">
      <h2>Password Reset Successful</h2>
      <p>Hello ${username},</p>
      <p>Your password has been successfully reset.</p>
      <p>If you did not request this change, please contact our support team immediately as your account may be compromised.</p>
      <p>Thank you,</p>
      <p>Devcord Team</p>
    </div>
  `;
};

export default passwordResetConfirmationEmail;