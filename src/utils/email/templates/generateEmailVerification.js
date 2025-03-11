const generateEmailVerification = (username, verificationLink) => {
  return `
    <!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>Email Verification</title>
    <style>
      body {
        font-family: Arial, sans-serif;
        margin: 0;
        padding: 0;
        background-color: #f4f4f9;
        color: #333;
        line-height: 1.6;
      }
      .container {
        max-width: 600px;
        margin: 50px auto;
        background: #ffffff;
        border: 1px solid #e6e6e6;
        border-radius: 8px;
        overflow: hidden;
      }
      .header {
        background-color: #3b82f6;
        color: #ffffff;
        text-align: center;
        padding: 20px;
      }
      .header h1 {
        margin: 0;
      }
      .content {
        padding: 20px;
      }
      .content p {
        margin: 20px 0;
      }
      .verify-btn {
        display: block;
        text-align: center;
        margin: 30px 0;
      }
      .verify-btn a {
        background-color: #3b82f6;
        color: #ffffff;
        padding: 10px 20px;
        text-decoration: none;
        border-radius: 5px;
        font-weight: bold;
      }
      .verify-btn a:hover {
        background-color: #2563eb;
      }
      .footer {
        background-color: #f4f4f9;
        color: #888888;
        text-align: center;
        padding: 10px;
        font-size: 12px;
      }
    </style>
  </head>
  <body>
    <div class="container">
      <div class="header">
        <h1>Welcome to DevCord!</h1>
      </div>
      <div class="content">
        <p>Hi ${username},</p>
        <p>
          Thank you for signing up for DevCord! To complete your registration
          and start exploring our platform, please verify your email address.
        </p>
        <div class="verify-btn">
          <a href="${verificationLink}" target="_blank">Verify Your Email</a>
        </div>
        <p>If you didn’t sign up for DevCord, please ignore this email.</p>
        <p>Best regards,</p>
        <p>The DevCord Team</p>
      </div>
      <div class="footer">
        <p>&copy; 2025 DevCord. All rights reserved.</p>
        <p>
          If you have any questions, contact us at
          <a href="mailto:support@devcord.com">support@devcord.com</a>.
        </p>
      </div>
    </div>
  </body>
</html>

  
  `;
};

export default generateEmailVerification
