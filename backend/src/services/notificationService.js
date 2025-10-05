const { pool } = require('../config/database');
const nodemailer = require('nodemailer');

const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST || 'smtp.gmail.com',
  port: process.env.SMTP_PORT || 587,
  secure: false,
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS
  }
});

const sendEmail = async (to, subject, message) => {
  try {
    if (!process.env.SMTP_USER) {
      console.log('Email notification (SMTP not configured):', { to, subject });
      return false;
    }

    await transporter.sendMail({
      from: process.env.SMTP_FROM || process.env.SMTP_USER,
      to,
      subject,
      html: message
    });

    await pool.query(`
      INSERT INTO notifications (type, recipient_email, subject, message, sent, sent_at)
      VALUES ($1, $2, $3, $4, $5, CURRENT_TIMESTAMP)
    `, ['email', to, subject, message, true]);

    console.log(`Email sent to ${to}: ${subject}`);
    return true;
  } catch (err) {
    console.error('Error sending email:', err);
    
    await pool.query(`
      INSERT INTO notifications (type, recipient_email, subject, message, sent)
      VALUES ($1, $2, $3, $4, $5)
    `, ['email', to, subject, message, false]);
    
    return false;
  }
};

const checkCampaignExpiry = async () => {
  try {
    const expiringPlacementsResult = await pool.query(`
      SELECT 
        p.*,
        c.name as client_name,
        c.contact_email
      FROM placements p
      LEFT JOIN clients c ON p.client_id = c.id
      WHERE p.status = 'active'
        AND p.end_date BETWEEN CURRENT_DATE AND CURRENT_DATE + INTERVAL '7 days'
    `);

    for (const placement of expiringPlacementsResult.rows) {
      const daysRemaining = Math.ceil(
        (new Date(placement.end_date) - new Date()) / (1000 * 60 * 60 * 24)
      );

      const adminEmailsResult = await pool.query(
        "SELECT email FROM users WHERE role = 'admin'"
      );

      const emailContent = `
        <h2>Campaign Expiring Soon</h2>
        <p><strong>Campaign:</strong> ${placement.campaign_name}</p>
        <p><strong>Client:</strong> ${placement.client_name || 'Unknown'}</p>
        <p><strong>Placement Ref:</strong> ${placement.placement_ref}</p>
        <p><strong>End Date:</strong> ${placement.end_date}</p>
        <p><strong>Days Remaining:</strong> ${daysRemaining}</p>
        <p><strong>Format:</strong> ${placement.format}</p>
        <p><strong>Location:</strong> ${placement.location || 'Not specified'}</p>
        <br>
        <p>Please take action to renew or replace this campaign.</p>
      `;

      for (const admin of adminEmailsResult.rows) {
        await sendEmail(
          admin.email,
          `Campaign Expiring: ${placement.campaign_name} (${daysRemaining} days)`,
          emailContent
        );
      }

      if (placement.contact_email) {
        await sendEmail(
          placement.contact_email,
          `Your Campaign "${placement.campaign_name}" is Expiring Soon`,
          emailContent
        );
      }
    }

    console.log(`Checked ${expiringPlacementsResult.rows.length} expiring campaigns`);
  } catch (err) {
    console.error('Error checking campaign expiry:', err);
  }
};

const sendWeeklyReport = async () => {
  try {
    const statsResult = await pool.query(`
      SELECT 
        COUNT(DISTINCT c.id) as total_clients,
        COUNT(DISTINCT p.id) FILTER (WHERE p.status = 'active') as active_placements,
        COUNT(DISTINCT s.id) FILTER (WHERE s.online = true) as online_screens,
        COALESCE(SUM(p.price) FILTER (WHERE p.status = 'active'), 0) as monthly_revenue
      FROM clients c
      LEFT JOIN placements p ON c.id = p.client_id
      CROSS JOIN screens s
    `);

    const stats = statsResult.rows[0];

    const adminEmailsResult = await pool.query(
      "SELECT email FROM users WHERE role = 'admin' OR role = 'staff'"
    );

    const emailContent = `
      <h2>Weekly Levet CMS Report</h2>
      <h3>System Overview</h3>
      <ul>
        <li><strong>Active Clients:</strong> ${stats.total_clients}</li>
        <li><strong>Active Placements:</strong> ${stats.active_placements}</li>
        <li><strong>Online Screens:</strong> ${stats.online_screens}</li>
        <li><strong>Monthly Revenue:</strong> £${parseFloat(stats.monthly_revenue).toFixed(2)}</li>
      </ul>
      <br>
      <p>Generated on ${new Date().toLocaleDateString()}</p>
    `;

    for (const user of adminEmailsResult.rows) {
      await sendEmail(
        user.email,
        `Weekly Levet CMS Report - ${new Date().toLocaleDateString()}`,
        emailContent
      );
    }

    console.log('Weekly report sent successfully');
  } catch (err) {
    console.error('Error sending weekly report:', err);
  }
};

module.exports = {
  sendEmail,
  checkCampaignExpiry,
  sendWeeklyReport
};
