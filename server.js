
require('dotenv').config();
// ================= IMPORTS =================
const express = require('express');
const { Pool } = require('pg');
const bcrypt = require('bcrypt');
const fileUpload = require('express-fileupload');
const cors = require('cors');
const bodyParser = require('body-parser');
const { OAuth2Client } = require('google-auth-library');

// ================= INIT APP =================
const app = express();
const fs = require('fs');
const GOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID;
const uploadDir = './public/uploads';
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

// ================= MIDDLEWARE =================
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));
app.use(cors());
app.use(fileUpload());
app.use(express.static('public')); // serve uploaded files

// ================= DATABASE =================
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false },
  connectionTimeoutMillis: 10000,   // wait 10s for connection
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
// ================= REGISTER =================
// ================= REGISTER =================
app.post('/api/register', async (req, res) => {
  try {
    const {
      name, age, senior, gender, status, barangay,
      spouse, sons, daughters, pwd,
      dob, religion, family_members, contact, email, username, address,
      password // for login
    } = req.body;

    if (!name || !username || !password)
      return res.status(400).json({ error: 'Missing required fields' });

    

    const hashedPw = await bcrypt.hash(password, 10);

    // Insert into users table
    await pool.query(
      `INSERT INTO users(username, password, role, name) VALUES($1,$2,'resident',$3)`,
      [username, hashedPw, name]
    );

    // Insert into residents table
    const result = await pool.query(
      `INSERT INTO residents
       (name, age, senior, gender, status, barangay, spouse, sons, daughters, pwd,
        dob, religion, family_members, contact, email, username, address)
       VALUES
       ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,
        $11,$12,$13,$14,$15,$16,$17)
       RETURNING *`,
      [
        name || null,
        age ? parseInt(age) : null,
        senior === 'Yes',                          // boolean true/false
        gender || null,
        status || null,
        barangay || null,
        spouse || null,
        sons ? parseInt(sons) : 0,
        daughters ? parseInt(daughters) : 0,
        pwd === 'Yes',                             // boolean true/false
        dob || null,
        religion || null,
        family_members ? parseInt(family_members) : 0,
        contact || null,
        email || null,
        username || null,
        address || null
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

    // Check users table for credentials
    const result = await pool.query('SELECT * FROM users WHERE username=$1', [username]);
    const user = result.rows[0];
    if (!user) return res.status(401).json({ error: 'Invalid username' });

    const match = await bcrypt.compare(password, user.password);
    if (!match) return res.status(401).json({ error: 'Invalid password' });

    // Fetch resident profile
    const profile = await pool.query('SELECT * FROM residents WHERE username=$1', [username]);
    res.json({ message: 'Login successful', user: user, profile: profile.rows[0] });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ================= GOOGLE LOGIN FIXED =================
app.post('/api/google-login', async (req, res) => {
  try {
    const { credential } = req.body;
    if (!credential) return res.status(400).json({ success: false, message: 'No Google token provided' });

    console.log('GOOGLE_CLIENT_ID in use:', GOOGLE_CLIENT_ID);

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

    // Check if user already exists
    const result = await pool.query('SELECT * FROM users WHERE username=$1', [email]);

    if (result.rows.length > 0) {
      // Existing user → login
      return res.json({ success: true, user: result.rows[0] });
    } else {
      // New user → need password
      return res.json({
        success: true,
        newUser: true,
        user: { email, name }
      });
    }
  } catch (err) {
    console.error('Google login error:', err);
    res.status(401).json({ success: false, message: 'Google login failed' });
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
      `UPDATE document_requests
       SET status='Approved', date=$1, time=$2
       WHERE id=$3`,
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
      `UPDATE document_requests
       SET status='Rejected'
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
      `SELECT username, name, gender, status, age, barangay, address, dob, pwd
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
      name,
      age,
      senior,
      gender,
      status,
      barangay,
      spouse,
      sons,
      daughters,
      pwd,
      dob,
      family_members,
      contact,
      email,
      address,
      religion
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
           contact=$13, email=$14, address=$15, religion=$16
       WHERE username=$17`,
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
        username
      ]
    );

    res.json({ success: true });
  } catch (err) {
    res.json({ success: false, message: err.message });
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
      const toDelete = row.usernames.slice(1); // keep newest (first), delete rest
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
}, 14 * 60 * 1000); // ping every 14 minutes

// ================= HEALTH CHECK =================
app.get('/health', (req, res) => {
  res.json({ status: 'ok', time: new Date() });
});

// ================= START SERVER =================
const PORT = process.env.PORT || 3000;
app.listen(PORT, '0.0.0.0', () => {
  console.log(`Server running on port ${PORT}`);
});
