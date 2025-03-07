const generatePasswordResetRequest = (username, url) => {
  return `
    <div style="max-width: 600px; margin: 0 auto; padding: 20px; font-family: Arial, sans-serif; background-color: #f4f4f4; border-radius: 8px;">
      <div style="background: white; padding: 20px; border-radius: 8px; text-align: center;">
        <h2 style="color: #333;">Password Reset Request</h2>
        <p style="color: #555;">Hello <strong>${username}</strong>,</p>
        <p style="color: #555;">We received a request to reset your password. To proceed, please click the button below:</p>
        
        <a href="${url}" style="display: inline-block; margin-top: 15px; padding: 10px 20px; font-size: 16px; color: white; background-color: #007bff; text-decoration: none; border-radius: 5px;">
          Change My Password
        </a>

        <p style="margin-top: 20px; color: #555;">If you did not request this, please ignore this email. Your password will not be changed.</p>
        
        <p style="margin-top: 20px; color: #777;">Thank you,</p>
        <p style="color: #777;"><strong>Devcord Team</strong></p>
      </div>
    </div>
  `;
};

export default generatePasswordResetRequest;
