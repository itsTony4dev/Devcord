const workspaceInviteEmail = ({ username, workspaceName, inviteCode, baseUrl, workspaceId }) => {
  return `
    <!DOCTYPE html>
    <html lang="en">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Invitation to Join ${workspaceName}</title>
      <style>
        body {
          font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
          line-height: 1.6;
          color: #333;
          background-color: #f9f9f9;
          margin: 0;
          padding: 0;
        }
        .container {
          max-width: 600px;
          margin: 0 auto;
          padding: 20px;
          background-color: #ffffff;
          border-radius: 8px;
          box-shadow: 0 2px 10px rgba(0,0,0,0.1);
        }
        .header {
          text-align: center;
          padding: 20px 0;
          border-bottom: 1px solid #eaeaea;
        }
        .logo {
          max-width: 150px;
          margin-bottom: 15px;
        }
        .content {
          padding: 30px 20px;
          text-align: center;
        }
        .workspace-name {
          font-size: 22px;
          font-weight: bold;
          color: #4a6ee0;
          margin: 15px 0;
        }
        .button {
          display: inline-block;
          background-color: #4a6ee0;
          color: white;
          text-decoration: none;
          padding: 12px 25px;
          border-radius: 5px;
          font-weight: bold;
          margin: 25px 0;
          transition: background-color 0.3s;
        }
        .button:hover {
          background-color: #3953a4;
        }
        .note {
          font-size: 14px;
          color: #666;
          margin: 20px 0;
        }
        .footer {
          text-align: center;
          padding: 20px 0;
          color: #888;
          font-size: 12px;
          border-top: 1px solid #eaeaea;
        }
        .code-display {
          background-color: #f2f4f8;
          padding: 10px 15px;
          border-radius: 4px;
          font-family: monospace;
          margin: 15px 0;
          display: inline-block;
        }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1>Workspace Invitation</h1>
        </div>
        <div class="content">
          <p>Hello <strong>${username}</strong>,</p>
          <p>You've been invited to join a workspace on Devcord!</p>
          <div class="workspace-name">${workspaceName}</div>
          <p>Click the button below to join the workspace and start collaborating with the team.</p>
          <a href="${baseUrl}/api/workspaces/${workspaceId}/join/${inviteCode}" class="button">Join Workspace</a>
          <p class="note">If the button doesn't work, you can also join by entering this invite code on the Devcord app:</p>
          <div class="code-display">${inviteCode}</div>
          <p class="note">This invitation will expire in 7 days.</p>
        </div>
        <div class="footer">
          <p>© ${new Date().getFullYear()} Devcord. All rights reserved.</p>
          <p>If you didn't request this invitation, please ignore this email.</p>
        </div>
      </div>
    </body>
    </html>
  `;
};

export default workspaceInviteEmail;
