// // test-smtp.js
// import nodemailer from 'nodemailer';
// import dotenv from 'dotenv';

// dotenv.config();

// async function testSMTP() {
//   console.log("📨 Testing Gmail SMTP configuration...");

//   const { SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS, SMTP_FROM } = process.env;

//   if (!SMTP_HOST || !SMTP_USER || !SMTP_PASS) {
//     console.error("❌ Missing SMTP environment variables. Please check your .env file.");
//     return;
//   }

//   // Create the transporter
//   const transporter = nodemailer.createTransport({
//     host: SMTP_HOST,
//     port: SMTP_PORT,
//     secure: false, // true for port 465, false for 587
//     auth: {
//       user: SMTP_USER,
//       pass: SMTP_PASS
//     }
//   });

//   try {
//     // Verify connection
//     await transporter.verify();
//     console.log("✅ SMTP connection successful!");

//     // Send a test email
//     const info = await transporter.sendMail({
//       from: SMTP_FROM || `"DENFiT Support" <${SMTP_USER}>`,
//       to: "denfitdatabase@gmail.com", // send to yourself for testing
//       subject: "✅ DENFiT SMTP Test Successful",
//       text: "If you received this email, your SMTP setup works perfectly!",
//       html: `<h2>🎉 DENFiT SMTP Test Successful</h2>
//              <p>If you're seeing this, your Gmail SMTP credentials are working fine.</p>`
//     });

//     console.log("📩 Test email sent!");
//     console.log("Message ID:", info.messageId);
//   } catch (error) {
//     console.error("❌ SMTP Test Failed:", error.message);
//   }
// }

// testSMTP();
