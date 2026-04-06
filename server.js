require('dotenv').config();
// ================= IMPORTS =================
const express = require('express');
const { Pool } = require('pg');
const bcrypt = require('bcrypt');
const fileUpload = require('express-fileupload');
const cors = require('cors');
const bodyParser = require('body-parser');
const { OAuth2Client } = require('google-auth-library');
const nodemailer = require('nodemailer');  // ← NEW

// ================= INIT APP =================
const app = express();
const fs = require('fs');
const GOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID;
const uploadDir = './public/uploads';
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

// In-memory OTP store: { email: { otp, expires, username } }
const otpStore = {};  // ← NEW

// ================= MIDDLEWARE =================
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));
app.use(cors());
app.use(fileUpload());
app.use(express.static('public'));

// ================= DATABASE =================
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false },
  connectionTimeoutMillis: 10000,
  idleTimeoutMillis: 30000,
  max: 5
});

pool.connect((err, client, release) => {
  if (err) {
    console.error('DB CONNECTION ERROR:', err.message);
  } else {
    console.log('DB connected successfully ✅');
    release();
  }
});

// ================= GOOGLE CLIENT =================
const client = new OAuth2Client(GOOGLE_CLIENT_ID);

// ================= REGISTER =================
app.post('/api/register', async (req, res) => {
  try {
    const {
      name, age, senior, gender, status, barangay,
      spouse, sons, daughters, pwd,
      dob, religion, family_members, contact, email, username, address,
      password
    } = req.body;

    if (!name || !username || !password)
      return res.status(400).json({ error: 'Missing required fields' });

    const hashedPw = await bcrypt.hash(password, 10);

    await pool.query(
      `INSERT INTO users(username, password, role, name) VALUES($1,$2,'resident',$3)`,
      [username, hashedPw, name]
    );

    const result = await pool.query(
      `INSERT INTO residents
       (name, age, senior, gender, status, barangay, spouse, sons, daughters, pwd,
        dob, religion, family_members, contact, email, username, address,
        place_of_birth, blood_type, voter_status, household_role,
        children_names, educational_attainment, emergency_contact_name, emergency_contact_number)
       VALUES
       ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,
        $11,$12,$13,$14,$15,$16,$17,
        $18,$19,$20,$21,$22,$23,$24,$25)
       RETURNING *`,
      [
        name || null,
        age ? parseInt(age) : null,
        senior === 'Yes',
        gender || null,
        status || null,
        barangay || null,
        spouse || null,
        sons ? parseInt(sons) : 0,
        daughters ? parseInt(daughters) : 0,
        pwd === 'Yes',
        dob || null,
        religion || null,
        family_members ? parseInt(family_members) : 0,
        contact || null,
        email || null,
        username || null,
        address || null,
        req.body.place_of_birth || null,
        req.body.blood_type || null,
        req.body.voter_status || null,
        req.body.household_role || null,
        req.body.children_names || null,
        req.body.educational_attainment || null,
        req.body.emergency_contact_name || null,
        req.body.emergency_contact_number || null
      ]
    );

    res.json({ message: 'Resident created', user: result.rows[0] });
  } catch (e) {
    console.error('REGISTER ERROR FULL:', JSON.stringify(e, Object.getOwnPropertyNames(e)));
    if (e.code === '23505') return res.status(400).json({ error: 'Username already exists' });
    res.status(500).json({ error: e.message || e.constructor.name });
  }
});

// ================= LOGIN =================
app.post('/api/login', async (req, res) => {
  try {
    const { username, password } = req.body;

    const result = await pool.query('SELECT * FROM users WHERE username=$1', [username]);
    const user = result.rows[0];
    if (!user) return res.status(401).json({ error: 'Invalid username' });

    const match = await bcrypt.compare(password, user.password);
    if (!match) return res.status(401).json({ error: 'Invalid password' });

    const profile = await pool.query('SELECT * FROM residents WHERE username=$1', [username]);
    res.json({ message: 'Login successful', user: user, profile: profile.rows[0] });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ================= GOOGLE LOGIN =================
app.post('/api/google-login', async (req, res) => {
  try {
    const { credential } = req.body;
    if (!credential) return res.status(400).json({ success: false, message: 'No Google token provided' });

    if (!GOOGLE_CLIENT_ID) {
      return res.status(500).json({ success: false, message: 'Server missing Google Client ID config' });
    }

    const ticket = await client.verifyIdToken({
      idToken: credential,
      audience: GOOGLE_CLIENT_ID
    });

    const payload = ticket.getPayload();
    const email = payload.email;
    const name = payload.name;

    const result = await pool.query('SELECT * FROM users WHERE username=$1', [email]);

    if (result.rows.length > 0) {
      return res.json({ success: true, user: result.rows[0] });
    } else {
      return res.json({ success: true, newUser: true, user: { email, name } });
    }
  } catch (err) {
    console.error('Google login error:', err);
    res.status(401).json({ success: false, message: 'Google login failed' });
  }
});

// ================= SEND OTP =================
app.post('/api/send-otp', async (req, res) => {
  try {
    const { email } = req.body;
    if (!email) return res.json({ success: false, message: 'Email is required.' });

    // Check if email exists in residents table
    const result = await pool.query(
      'SELECT username FROM residents WHERE LOWER(email) = LOWER($1) LIMIT 1',
      [email]
    );

    if (result.rows.length === 0) {
      return res.json({ success: false, message: 'Email not registered in our system.' });
    }

    // Generate 6-digit OTP
    const otp = Math.floor(100000 + Math.random() * 900000).toString();

    // Store OTP with 10-minute expiry
    otpStore[email.toLowerCase()] = {
      otp,
      expires: Date.now() + 10 * 60 * 1000,
      username: result.rows[0].username
    };

    // Send email
    const transporter = nodemailer.createTransport({
      service: 'gmail',
      auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS
      }
    });

    await transporter.sendMail({
      from: `"Barangay Trapiche" <${process.env.EMAIL_USER}>`,
      to: email,
      subject: 'Password Reset OTP - Barangay Trapiche Profiling System',
      html: `
        <div style="font-family:Arial,sans-serif; max-width:480px; margin:0 auto; padding:32px; border:1px solid #e0e0e0; border-radius:12px;">
          <div style="text-align:center; margin-bottom:24px;">
            <h2 style="color:#1a3f6c; margin:0;">Barangay Trapiche</h2>
            <p style="color:#888; font-size:13px; margin:4px 0 0;">Profiling System – Password Reset</p>
          </div>
          <p style="color:#333; font-size:15px;">You requested a password reset. Use the OTP below:</p>
          <div style="text-align:center; margin:28px 0;">
            <span style="font-size:42px; font-weight:bold; letter-spacing:10px; color:#c0392b;">${otp}</span>
          </div>
          <p style="color:#888; font-size:13px; text-align:center;">This OTP expires in <strong>10 minutes</strong>.</p>
          <hr style="border:none; border-top:1px solid #eee; margin:24px 0;">
          <p style="color:#bbb; font-size:12px; text-align:center;">If you did not request this, please ignore this email.</p>
        </div>
      `
    });

    console.log(`OTP sent to ${email}`);
    res.json({ success: true, message: 'OTP sent to your email.' });

  } catch (err) {
    console.error('SEND OTP ERROR:', err);
    res.json({ success: false, message: 'Failed to send OTP. Check EMAIL_USER and EMAIL_PASS in your .env file.' });
  }
});

// ================= VERIFY OTP & RESET PASSWORD =================
app.post('/api/verify-otp', async (req, res) => {
  try {
    const { email, otp, newPassword } = req.body;

    if (!email || !otp || !newPassword) {
      return res.json({ success: false, message: 'All fields are required.' });
    }

    const key = email.toLowerCase();
    const record = otpStore[key];

    if (!record) {
      return res.json({ success: false, message: 'No OTP found for this email. Please request a new one.' });
    }

    if (Date.now() > record.expires) {
      delete otpStore[key];
      return res.json({ success: false, message: 'OTP has expired. Please request a new one.' });
    }

    if (record.otp !== otp.trim()) {
      return res.json({ success: false, message: 'Incorrect OTP. Please try again.' });
    }

    if (newPassword.length < 6) {
      return res.json({ success: false, message: 'New password must be at least 6 characters.' });
    }

    // Hash and update password
    const hashedPw = await bcrypt.hash(newPassword, 10);
    await pool.query(
      'UPDATE users SET password = $1 WHERE username = $2',
      [hashedPw, record.username]
    );

    // Clear used OTP
    delete otpStore[key];

    res.json({ success: true, message: 'Password reset successfully!' });

  } catch (err) {
    console.error('VERIFY OTP ERROR:', err);
    res.json({ success: false, message: 'Server error. Please try again.' });
  }
});

// ================= GET SINGLE RESIDENT PROFILE =================
app.get('/api/residents-profile', async (req, res) => {
  try {
    const username = req.query.username;
    const result = await pool.query(
      'SELECT * FROM residents WHERE username=$1',
      [username]
    );
    res.json({ profile: result.rows[0] || null });
  } catch (err) {
    res.status(500).json({ profile: null });
  }
});

// ================= REQUEST DOCUMENT =================
app.post('/api/request-document', async (req, res) => {
  try {
    const { document_type, purpose, email, username } = req.body;
    const govIdFile = req.files?.gov_id;
    const photoFile = req.files?.photo;

    if (!document_type || !purpose || !email || !username || !govIdFile || !photoFile) {
      return res.json({ success: false, message: 'Missing fields' });
    }

    const govIdPath = `/uploads/${Date.now()}_${govIdFile.name}`;
    const photoPath = `/uploads/${Date.now()}_${photoFile.name}`;
    await govIdFile.mv(`./public${govIdPath}`);
    await photoFile.mv(`./public${photoPath}`);

    await pool.query(
      `INSERT INTO document_requests
       (username, document_type, purpose, email, gov_id, photo, date, time, status, created_at)
       VALUES($1, $2, $3, $4, $5, $6, CURRENT_DATE, CURRENT_TIME, 'Pending', CURRENT_TIMESTAMP)`,
      [username, document_type, purpose, email, govIdPath, photoPath]
    );

    res.json({ success: true });
  } catch (err) {
    console.error('REQUEST DOCUMENT ERROR:', err.message, err.stack);
    res.json({ success: false, message: err.message || 'Failed to save request' });
  }
});

// ================= GET MY REQUESTS =================
app.get('/api/my-requests', async (req, res) => {
  try {
    const username = req.query.username;
    const result = await pool.query(
      `SELECT document_type AS "document_type", purpose, status, date, time, gov_id, photo
       FROM document_requests
       WHERE username=$1
       ORDER BY created_at DESC`,
      [username]
    );
    res.json({ requests: result.rows });
  } catch (err) {
    console.error(err);
    res.status(500).json({ requests: [] });
  }
});

// ================= MANAGER: GET ALL DOCUMENT REQUESTS =================
app.get('/api/document-requests', async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT username, document_type, purpose, email, gov_id, photo, status, date, time, created_at
       FROM document_requests
       ORDER BY created_at DESC`
    );
    res.json({ requests: result.rows });
  } catch (err) {
    console.error(err);
    res.status(500).json({ requests: [] });
  }
});

// ================= MANAGER: APPROVE REQUEST =================
app.post('/api/approve-request', async (req, res) => {
  try {
    const { username, documentType, date, time } = req.body;

    const checkResult = await pool.query(
      `SELECT id, status, purpose, email FROM document_requests 
       WHERE username=$1 AND document_type=$2 AND status='Pending'
       ORDER BY created_at DESC LIMIT 1`,
      [username, documentType]
    );
    const request = checkResult.rows[0];

    if (!request) return res.json({ success: false, message: 'Request not found or already processed' });

    await pool.query(
      `UPDATE document_requests SET status='Approved', date=$1, time=$2 WHERE id=$3`,
      [date, time, request.id]
    );

    res.json({
      success: true,
      email: request.email,
      documentType,
      purpose: request.purpose,
      date,
      time
    });
  } catch (err) {
    console.error(err);
    res.json({ success: false, message: err.message });
  }
});

// ================= MANAGER: REJECT REQUEST =================
app.post('/api/reject-request', async (req, res) => {
  try {
    const { username, documentType } = req.body;
    await pool.query(
      `UPDATE document_requests SET status='Rejected'
       WHERE username=$1 AND document_type=$2 AND status='Pending'`,
      [username, documentType]
    );
    res.json({ success: true });
  } catch (err) {
    console.error(err);
    res.json({ success: false, message: err.message });
  }
});

// ================= DSWD: GET RESIDENTS =================
app.get('/api/residents', async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT username, name, gender, status, age, barangay, address, dob, pwd,
              place_of_birth, blood_type, voter_status, household_role,
              children_names, educational_attainment, emergency_contact_name,
              emergency_contact_number, contact, religion, spouse, sons, daughters,
              family_members, email, senior
       FROM residents
       ORDER BY name`
    );
    res.json({ residents: result.rows });
  } catch (err) {
    res.status(500).json({ residents: [] });
  }
});

// ================= DSWD: UPDATE RESIDENT =================
app.put('/api/update-resident/:username', async (req, res) => {
  try {
    const username = req.params.username;
    const {
      name, age, senior, gender, status, barangay,
      spouse, sons, daughters, pwd, dob, family_members,
      contact, email, address, religion,
      place_of_birth, blood_type, voter_status,
      household_role, children_names, educational_attainment,
      emergency_contact_name, emergency_contact_number
    } = req.body;

    const dupCheck = await pool.query(
      `SELECT username FROM residents
       WHERE username != $1
       AND (
         CASE WHEN LOWER(COALESCE(name,''))    = LOWER($2)       THEN 1 ELSE 0 END +
         CASE WHEN age                          = $3              THEN 1 ELSE 0 END +
         CASE WHEN COALESCE(barangay,'')        = COALESCE($4,'') THEN 1 ELSE 0 END +
         CASE WHEN LOWER(COALESCE(address,''))  = LOWER($5)       THEN 1 ELSE 0 END +
         CASE WHEN dob                          = $6::date        THEN 1 ELSE 0 END
       ) >= 3`,
      [
        username,
        name     || '',
        age      ? parseInt(age) : null,
        barangay || '',
        address  || '',
        dob      || null
      ]
    );

    for (const row of dupCheck.rows) {
      const oldUsername = row.username;
      await pool.query(`DELETE FROM document_requests WHERE username=$1`, [oldUsername]);
      await pool.query(`DELETE FROM residents        WHERE username=$1`, [oldUsername]);
      await pool.query(`DELETE FROM users            WHERE username=$1`, [oldUsername]);
      console.log(`Duplicate removed on profile update: ${oldUsername}`);
    }

    await pool.query(
      `UPDATE residents
       SET name=$1, age=$2, senior=$3, gender=$4, status=$5, barangay=$6,
           spouse=$7, sons=$8, daughters=$9, pwd=$10, dob=$11, family_members=$12,
           contact=$13, email=$14, address=$15, religion=$16,
           place_of_birth=$17, blood_type=$18, voter_status=$19,
           household_role=$20, children_names=$21, educational_attainment=$22,
           emergency_contact_name=$23, emergency_contact_number=$24
       WHERE username=$25`,
      [
        name || null,
        age ? parseInt(age) : null,
        senior || null,
        gender || null,
        status || null,
        barangay || null,
        spouse || null,
        sons ? parseInt(sons) : 0,
        daughters ? parseInt(daughters) : 0,
        pwd || null,
        dob || null,
        family_members ? parseInt(family_members) : 0,
        contact || null,
        email || null,
        address || null,
        religion || null,
        place_of_birth || null,
        blood_type || null,
        voter_status || null,
        household_role || null,
        children_names || null,
        educational_attainment || null,
        emergency_contact_name || null,
        emergency_contact_number || null,
        username
      ]
    );

    res.json({ success: true });
  } catch (err) {
    res.json({ success: false, message: err.message });
  }
});

// ================= CHECK DUPLICATE BEFORE PROFILE UPDATE =================
app.post('/api/check-duplicate-resident', async (req, res) => {
  try {
    const { name, dob, barangay, currentUsername } = req.body;
    if (!name || !dob || !barangay) return res.json({ duplicate: false });

    const result = await pool.query(
      `SELECT username FROM residents
       WHERE LOWER(TRIM(name)) = LOWER(TRIM($1))
         AND dob::date = $2::date
         AND barangay = $3
         AND username != $4`,
      [name, dob, barangay, currentUsername]
    );

    if (result.rows.length > 0) {
      res.json({ duplicate: true, existingUsername: result.rows[0].username });
    } else {
      res.json({ duplicate: false });
    }
  } catch (err) {
    console.error('Duplicate check error:', err);
    res.json({ duplicate: false });
  }
});

// ================= CREATE TEMP ADMINS =================
app.get('/create-admins', async (req, res) => {
  try {
    const managerPw = await bcrypt.hash('1234', 10);
    const dswdPw = await bcrypt.hash('1234', 10);

    await pool.query(`
      INSERT INTO users(username, password, role, name) VALUES
      ('manager',$1,'manager','Manager Account'),
      ('dswd',$2,'dswd','DSWD Account')
      ON CONFLICT (username) DO NOTHING
    `, [managerPw, dswdPw]);

    res.send('Admins created successfully');
  } catch (err) {
    res.status(500).send(err.message);
  }
});

// ================= DELETE RESIDENT =================
app.delete('/api/delete-resident/:username', async (req, res) => {
  try {
    const { username } = req.params;
    await pool.query(`DELETE FROM document_requests WHERE username=$1`, [username]);
    await pool.query(`DELETE FROM residents WHERE username=$1`, [username]);
    await pool.query(`DELETE FROM users WHERE username=$1`, [username]);
    res.json({ success: true });
  } catch (err) {
    console.error(err);
    res.json({ success: false, message: err.message });
  }
});

// ================= AUTO-REMOVE DUPLICATES =================
app.post('/api/auto-remove-duplicates', async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT name, barangay, age, dob, address,
             array_agg(username ORDER BY created_at DESC) AS usernames
      FROM residents
      GROUP BY name, barangay, age, dob, address
      HAVING COUNT(*) > 1
    `);

    let removed = 0;
    for (const row of result.rows) {
      const toDelete = row.usernames.slice(1);
      for (const username of toDelete) {
        await pool.query(`DELETE FROM document_requests WHERE username=$1`, [username]);
        await pool.query(`DELETE FROM residents WHERE username=$1`, [username]);
        await pool.query(`DELETE FROM users WHERE username=$1`, [username]);
        removed++;
      }
    }

    res.json({ success: true, removed });
  } catch (err) {
    console.error(err);
    res.json({ success: false, message: err.message });
  }
});

// ================= KEEP ALIVE =================
const https = require('https');
const RENDER_URL = 'https://profiling-system.onrender.com';
setInterval(() => {
  https.get(RENDER_URL, (res) => {
    console.log(`Keep-alive ping: ${res.statusCode}`);
  }).on('error', (err) => {
    console.error('Keep-alive error:', err.message);
  });
}, 14 * 60 * 1000);

// ================= HEALTH CHECK =================
app.get('/health', (req, res) => {
  res.json({ status: 'ok', time: new Date() });
});

// ================= START SERVER =================
const PORT = process.env.PORT || 3000;
app.listen(PORT, '0.0.0.0', () => {
  console.log(`Server running on port ${PORT}`);
});