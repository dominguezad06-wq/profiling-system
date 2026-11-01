let loggedInUser = null;
let currentRole = null;
let dswdResidents = [];
emailjs.init('Ndd7_r9gTrjDBG9-K')
const API_BASE = "https://profiling-system.onrender.com";

// 
function formatTime12Hour(time24){
  if(!time24) return '';
  let [hour, min] = time24.split(':').map(Number);
  const ampm = hour >= 12 ? 'PM' : 'AM';
  hour = hour % 12;
  if(hour === 0) hour = 12;
  return `${hour}:${min.toString().padStart(2,'0')} ${ampm}`;
}

function formatDate(dateStr) {
  if (!dateStr) return '';
  const cleanDate = String(dateStr).split('T')[0];
  const date = new Date(cleanDate + 'T00:00:00');
  return date.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  });
}

// Show the BHW name instead of DSWD (the login username "dswd" stays the same)
function bhwName(name) {
  return currentRole === 'dswd' ? String(name || '').replace(/dswd/gi, 'BHW') : name;
}

// Show Forms
function showResidentForm(){ document.getElementById('login-page').style.display='none'; document.getElementById('resident-form').style.display='flex'; }
function showLogin(){
  document.getElementById('login-page').style.display='flex';
  document.getElementById('resident-form').style.display='none';
  document.getElementById('forgot-page').style.display='none';
  const f = document.getElementById('site-footer');
  if(f) f.style.display='none';
  // Clear all login fields and errors
  const uField = document.getElementById('login-username');
  const pField = document.getElementById('login-password');
  if (uField) uField.value = '';
  if (pField) pField.value = '';
  const errBox = document.getElementById('login-error');
  if (errBox) { errBox.style.display = 'none'; errBox.innerText = ''; }
  if (typeof grecaptcha !== 'undefined') {
    try { grecaptcha.reset(); } catch(e) {}
  }
}
function showForgotPassword(){ document.getElementById('login-page').style.display='none'; document.getElementById('forgot-page').style.display='flex'; }
function sendOTP() {
  const email = document.getElementById('forgot-email').value;
  fetch(`${API_BASE}/api/send-otp`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email })
  })
  .then(res => res.json())
  .then(data => {
    const msg = document.getElementById('otp-message');
    if (data.success) {
      generatedOTP = data.otp;
      otpUserEmail = email;

      emailjs.send("service_9m8vyrc", "template_y8zmwtz", {
        to_email: email,
        name: email,
        otp_code: data.otp
      })
      .then(() => {
        msg.innerText = "OTP sent to your email!";
        msg.style.color = "green";
        document.getElementById('otp-section').style.display = "block";
      })
      .catch(() => {
        msg.innerText = "Failed to send OTP email.";
        msg.style.color = "red";
      });

    } else {
      msg.innerText = data.message || "Email not registered!";
      msg.style.color = "red";
    }
  })
  .catch(() => {
    const msg = document.getElementById('otp-message');
    msg.innerText = "Server error.";
    msg.style.color = "red";
  });
}

function verifyOTP() {
  const enteredOTP = document.getElementById('otp-input').value;
  const newPassword = document.getElementById('new-password').value;
  fetch(`${API_BASE}/api/verify-otp`, {
    method: 'POST',
    headers: { 'Content-Type':'application/json' },
    body: JSON.stringify({ email: otpUserEmail, otp: enteredOTP, newPassword })
  })
  .then(res => res.json())
  .then(data => {
    const msg = document.getElementById('otp-message');
    if(data.success){
      generatedOTP = null;
      otpUserEmail = null;
      msg.innerText = "Password successfully reset!";
      msg.style.color = "green";
      setTimeout(showLogin, 1500);
    } else {
      msg.innerText = data.message || "Invalid OTP!";
      msg.style.color = "red";
    }
  })
  .catch(() => {
    const msg = document.getElementById('otp-message');
    msg.innerText = "Server error.";
    msg.style.color = "red";
  });
}

// Create Resident
function createResident() {
  const getVal = id => document.getElementById(id)?.value || '';
  const getInt = id => parseInt(document.getElementById(id)?.value) || 0;
  const getChecked = id => document.getElementById(id)?.checked ? 'Yes' : 'No';

  const name = getVal('res-name').trim();
  const username = getVal('res-username').trim();
  const password = getVal('res-password').trim();
  const email = getVal('res-email').trim();

  const age = getInt('res-age');
  const gender = getVal('res-gender');
  const barangay = getVal('res-barangay');
  const address = getVal('res-address');
  const status = getVal('res-status');

  const sons = getInt('res-sons');
  const daughters = getInt('res-daughters');
  const pwd = getChecked('res-pwd');
  const contact = getVal('res-contact');

  const spouse = '';
  const family_members = 0;

  const confirmPassword = document.getElementById('res-confirm-password')?.value.trim();

  if (!name || !username || !password || !email || !document.getElementById('res-dob')?.value) {
    const errBox = document.getElementById('register-error');
    errBox.style.display = 'block';
    errBox.innerText = 'Please fill in all required fields.';
    return;
  }
  if (password !== confirmPassword) {
    const errBox = document.getElementById('register-error');
    errBox.style.display = 'block';
    errBox.innerText = 'Passwords do not match. Please try again.';
    return;
  }
  if (password.length < 6) {
    const errBox = document.getElementById('register-error');
    errBox.style.display = 'block';
    errBox.innerText = 'Password must be at least 6 characters.';
    return;
  }

  const dob = document.getElementById('res-dob')?.value || '';

  const data = {
    name, username, password, email, contact, gender, age,
    address, barangay, status, sons, daughters, pwd, spouse,
    family_members, senior: age >= 60 ? "Yes" : "No", dob
  };


  fetch(`${API_BASE}/api/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data)
  })
  .then(res => res.json())
  .then(response => {
    const errBox = document.getElementById('register-error');
    const successBox = document.getElementById('register-success');
    if (response.user) {
      errBox.style.display = 'none';
      successBox.style.display = 'block';
      successBox.innerText = 'Account created successfully! Redirecting to login...';
      setTimeout(() => showLogin(), 1800);
    } else {
      successBox.style.display = 'none';
      errBox.style.display = 'block';
      errBox.innerText = response.error === 'Username already exists'
        ? 'That username is already taken. Please choose another.'
        : (response.error || 'Something went wrong. Please try again.');
    }
  })
  .catch(err => {
    console.error(err);
    const errBox = document.getElementById('register-error');
    errBox.style.display = 'block';
    errBox.innerText = 'Could not connect to server. Please try again.';
  });
}

// Login 
function login() {
  const username = document.getElementById('login-username').value.trim();
  const password = document.getElementById('login-password').value.trim();

  if (!username) {
    document.getElementById('login-username').focus();
    document.getElementById('login-username').reportValidity();
    return;
  }
  if (!password) {
    document.getElementById('login-password').focus();
    document.getElementById('login-password').reportValidity();
    return;
  }

  const captchaResponse = grecaptcha.getResponse();
  if (!captchaResponse) {
    const errBox = document.getElementById('login-error');
    errBox.innerText = 'Please complete the CAPTCHA verification.';
    errBox.style.display = 'block';
    return;
  }

  fetch(`${API_BASE}/api/login`, {
    method: 'POST',
    headers: { 'Content-Type':'application/json' },
    body: JSON.stringify({ username, password, captchaToken: captchaResponse })
  })
  .then(res => res.json())
  .then(data => {
    if(data.message === 'Login successful'){
      loggedInUser = data.profile ? Object.assign({}, data.user, data.profile) : data.user;
      currentRole = data.user.role;
      localStorage.setItem("user", JSON.stringify(loggedInUser));
      if (data.user.role === 'dswd') {
        openDSWDPage();
      } else if (data.user.role === 'manager') {
        openManagerPage();
      } else {
        fetchFullProfileThenRender();
      }
    } else {
      const errBox = document.getElementById('login-error');
      errBox.innerText = data.error || 'Invalid username or password!';
      errBox.style.display = 'block';
      grecaptcha.reset();
    }
  })
  .catch(() => alert('Server connection error.'));
}

function fetchFullProfileThenRender() {
  // Always start from what we have in localStorage (most up-to-date after saves)
  const cached = localStorage.getItem("user");
  if (cached) {
    try {
      const parsed = JSON.parse(cached);
      if (parsed && parsed.username === loggedInUser.username) {
        loggedInUser = parsed;
      }
    } catch(e) {}
  }

  fetch(`${API_BASE}/api/resident/${loggedInUser.username}`)
    .then(res => res.json())
    .then(data => {
      if (data.user) {
        // Only overwrite fields if server actually has a real value
        Object.keys(data.user).forEach(key => {
          const serverVal = data.user[key];
          if (serverVal !== undefined && serverVal !== null && serverVal !== '' && serverVal !== 'undefined') {
            loggedInUser[key] = serverVal;
          }
        });
        localStorage.setItem("user", JSON.stringify(loggedInUser));
      }
    })
    .catch(err => console.warn('Could not fetch full profile, using cached data:', err))
    .finally(() => {
      showDashboard();
      renderResidentWelcome();
    });
}

function openManagerPage(){
  const f = document.getElementById('site-footer');
  if(f) f.style.display='block';
  const lf = document.getElementById('login-footer');
  if(lf) lf.style.display='none';
  document.getElementById('login-page').style.display = 'none';
  document.getElementById('dashboard-page').style.display = 'none';
  document.getElementById('dswd-page').style.display = 'none';
  document.getElementById('manager-page').style.display = 'flex';
  showDocRequests();
  updateHeaderUI();
  startHeaderClock();
}

function showMyAccount() {
  const isManager = currentRole === 'manager';
  const isDSWD = currentRole === 'dswd';
  const isResident = currentRole === 'resident';

  let body;
  if (isManager) {
    body = document.getElementById('manager-table');
  } else if (isDSWD) {
    body = document.getElementById('dashboard-body');
  } else {
    body = document.getElementById('dashboard-body');
  }

  const picUrl = loggedInUser.profile_pic || null;
  const shownName = bhwName(loggedInUser.name) || '';
  const roleLabel = isDSWD ? 'BHW' : currentRole;

  body.innerHTML = `
    <div style="max-width:520px; margin:0 auto; padding:24px;">

      <div style="background:#fff; border-radius:16px; box-shadow:0 8px 24px rgba(0,0,0,0.1); overflow:hidden; border-top:5px solid #c0392b;">

        <div style="background:#8B0000; padding:32px; text-align:center;">
          <div style="position:relative; display:inline-block;">
            <img id="profile-pic-preview"
              src="${picUrl || 'https://ui-avatars.com/api/?name=' + encodeURIComponent(shownName || 'User') + '&background=ffffff&color=c0392b&size=128'}"
              style="width:100px; height:100px; border-radius:50%; border:4px solid white; object-fit:cover;">
            <label for="profile-pic-input" style="position:absolute; bottom:0; right:0; background:#fff; border-radius:50%; width:30px; height:30px; display:flex; align-items:center; justify-content:center; cursor:pointer; box-shadow:0 2px 6px rgba(0,0,0,0.2);">
              <span style="font-size:14px;">✏️</span>
            </label>
            <input type="file" id="profile-pic-input" accept="image/*" style="display:none;" onchange="previewProfilePic(this)">
          </div>
          <div style="margin-top:12px; color:white;">
            <div style="font-size:18px; font-weight:600;">${shownName || 'User'}</div>
            <div style="font-size:13px; opacity:0.85; margin-top:4px; text-transform:capitalize;">${roleLabel} Account</div>
            <div style="font-size:12px; opacity:0.7; margin-top:2px;">@${loggedInUser.username}</div>
          </div>
        </div>

        <div style="padding:28px;">

          <div style="margin-bottom:18px;">
            <label style="font-size:13px; font-weight:600; color:#555; display:block; margin-bottom:6px;">Full Name</label>
            <input type="text" id="account-name" value="${shownName}"
              style="width:100%; padding:11px 14px; border-radius:8px; border:1px solid #ddd; font-size:14px; margin:0;">
          </div>

          <div style="margin-bottom:18px;">
            <label style="font-size:13px; font-weight:600; color:#555; display:block; margin-bottom:6px;">Username</label>
            <input type="text" value="${loggedInUser.username}" disabled
              style="width:100%; padding:11px 14px; border-radius:8px; border:1px solid #eee; font-size:14px; margin:0; background:#f8f8f8; color:#aaa;">
          </div>

          <div style="margin-bottom:18px;">
            <label style="font-size:13px; font-weight:600; color:#555; display:block; margin-bottom:6px;">Email Address</label>
            <input type="email" id="account-email" value="${loggedInUser.email || ''}" placeholder="your@gmail.com"
              style="width:100%; padding:11px 14px; border-radius:8px; border:1px solid #ddd; font-size:14px; margin:0;">
          </div>

          <hr style="border:none; border-top:1px solid #eee; margin:20px 0;">
          <div style="font-size:14px; font-weight:600; color:#333; margin-bottom:16px;">Change Password <span style="font-size:12px; color:#aaa; font-weight:400;">(leave blank to keep current)</span></div>

          <div style="margin-bottom:14px;">
            <label style="font-size:13px; font-weight:600; color:#555; display:block; margin-bottom:6px;">Old Password</label>
            <input type="password" id="account-old-password" placeholder="Enter current password"
              style="width:100%; padding:11px 14px; border-radius:8px; border:1px solid #ddd; font-size:14px; margin:0;">
          </div>

          <div style="margin-bottom:14px;">
            <label style="font-size:13px; font-weight:600; color:#555; display:block; margin-bottom:6px;">New Password</label>
            <input type="password" id="account-new-password" placeholder="Enter new password"
              style="width:100%; padding:11px 14px; border-radius:8px; border:1px solid #ddd; font-size:14px; margin:0;">
          </div>

          <div style="margin-bottom:24px;">
            <label style="font-size:13px; font-weight:600; color:#555; display:block; margin-bottom:6px;">Confirm New Password</label>
            <input type="password" id="account-confirm-password" placeholder="Confirm new password"
              style="width:100%; padding:11px 14px; border-radius:8px; border:1px solid #ddd; font-size:14px; margin:0;">
          </div>

          <div id="account-message" style="margin-bottom:14px; font-size:13px; text-align:center;"></div>

          <button onclick="saveMyAccount()"
            style="width:100%; padding:13px; background:#8B0000; color:white; font-weight:bold; border:none; border-radius:8px; font-size:14px; cursor:pointer;">
            Save Changes
          </button>

        </div>
      </div>
    </div>
  `;
}

function previewProfilePic(input) {
  const file = input.files[0];
  if (!file) return;
  const reader = new FileReader();
  reader.onload = e => {
    document.getElementById('profile-pic-preview').src = e.target.result;
  };
  reader.readAsDataURL(file);
}

function saveMyAccount() {
  const name = document.getElementById('account-name').value.trim();
  const oldPassword = document.getElementById('account-old-password').value;
  const newPassword = document.getElementById('account-new-password').value;
  const confirmPassword = document.getElementById('account-confirm-password').value;
  const profilePicFile = document.getElementById('profile-pic-input').files[0];
  const msg = document.getElementById('account-message');

  if (!name) {
    msg.innerText = 'Name cannot be empty.';
    msg.style.color = 'red';
    return;
  }

  if (newPassword && newPassword !== confirmPassword) {
    msg.innerText = 'New passwords do not match.';
    msg.style.color = 'red';
    return;
  }

  if (newPassword && newPassword.length < 6) {
    msg.innerText = 'New password must be at least 6 characters.';
    msg.style.color = 'red';
    return;
  }

  if (newPassword && !oldPassword) {
    msg.innerText = 'Please enter your old password.';
    msg.style.color = 'red';
    return;
  }

  const formData = new FormData();
  formData.append('username', loggedInUser.username);
  formData.append('name', name);
  formData.append('email', document.getElementById('account-email').value.trim());
  if (newPassword) {
    formData.append('oldPassword', oldPassword);
    formData.append('newPassword', newPassword);
  }
  if (profilePicFile) {
    formData.append('profile_pic', profilePicFile);
  }

  msg.innerText = 'Saving...';
  msg.style.color = '#888';

  fetch(`${API_BASE}/api/update-account`, {
    method: 'POST',
    body: formData
  })
  .then(res => res.json())
  .then(data => {
    if (data.success) {
      loggedInUser.name = name;
      loggedInUser.email = document.getElementById('account-email').value.trim();
      if (data.profilePicUrl) loggedInUser.profile_pic = data.profilePicUrl;
      localStorage.setItem("user", JSON.stringify(loggedInUser));
      updateHeaderUI();
      msg.innerText = 'Account updated successfully!';
      msg.style.color = 'green';
      setTimeout(() => showMyAccount(), 1000);
    } else {
      msg.innerText = data.message || 'Failed to update.';
      msg.style.color = 'red';
    }
  })
  .catch(() => {
    msg.innerText = 'Server error.';
    msg.style.color = 'red';
  });
}

function logout(){ 
  loggedInUser = null; 
  currentRole = null;
  const f = document.getElementById('site-footer');
  if(f) f.style.display='none';
  const lf = document.getElementById('login-footer');
  if(lf) lf.style.display='block';
  localStorage.removeItem("user");
  document.getElementById('login-page').style.display = "flex";
  document.getElementById('dashboard-page').style.display = 'none';
  document.getElementById('manager-page').style.display = 'none';
  document.getElementById('dswd-page').style.display = 'none';
  if (document.getElementById('dashboard-content')) {
    document.getElementById('dashboard-content').innerHTML = '';
  }
  if (document.getElementById('manager-table')) {
    document.getElementById('manager-table').innerHTML = '';
  }
  if (document.getElementById('dashboard-body')) {
    document.getElementById('dashboard-body').innerHTML = '';
  }
  // Clear fields and error
  const uField = document.getElementById('login-username');
  const pField = document.getElementById('login-password');
  if (uField) uField.value = '';
  if (pField) pField.value = '';
  const errBox = document.getElementById('login-error');
  if (errBox) { errBox.style.display = 'none'; errBox.innerText = ''; }
  // Reset captcha after login page is visible
  setTimeout(() => {
    if (typeof grecaptcha !== 'undefined') {
      try {
        grecaptcha.reset();
      } catch(e) {
        const captchaDiv = document.querySelector('.g-recaptcha');
        if (captchaDiv) {
          captchaDiv.innerHTML = '';
          grecaptcha.render(captchaDiv, {
            sitekey: '6LfFlaosAAAAAHH5pJgm5lmeQfkTyoaxR2E8OyPE'
          });
        }
      }
    }
  }, 300);
}

function renderDashboardHeader(title){
  return `
    <div class="page-header" style="padding:10px 16px; margin-bottom:0;">
      <img src="trapiche.png" alt="Barangay Logo" style="height:40px;">
      <div>
        <h2 style="font-size:16px; margin:0;">Barangay Digital Profiling System</h2>
        <small>${title}</small><br>
        <small>Barangay Trapiche, Tanauan City, Batangas</small>
      </div>
    </div>
    <hr style="margin:6px 0;">
  `;
}

// Dashboard 
function showDashboard(){
  const f = document.getElementById('site-footer');
  if(f) f.style.display='block';
  const lf = document.getElementById('login-footer');
  if(lf) lf.style.display='none';
  document.getElementById('login-page').style.display='none';
  document.getElementById('resident-form').style.display='none';
  document.getElementById('forgot-page').style.display='none';
  document.getElementById('dswd-page').style.display='none';
  document.getElementById('dashboard-page').style.display='block';

  const title =
    currentRole === 'resident' ? 'Resident Dashboard' :
    currentRole === 'manager' ? 'Manager Dashboard' :
    currentRole === 'dswd' ? 'BHW Dashboard' :
    'Dashboard';

  document.getElementById('dashboard-title').innerText = title;
  document.getElementById('dashboard-content').innerHTML = `
    ${renderDashboardHeader(title)}
    <div id="dashboard-body"></div>
  `;

  if(currentRole === 'resident'){
    renderResidentWelcome();
    loadMyRequestsPreview();
  }
  updateHeaderUI();
  startHeaderClock();
}

function openDSWDPage(){
  const f = document.getElementById('site-footer');
  if(f) f.style.display='block';
  const lf = document.getElementById('login-footer');
  if(lf) lf.style.display='none';
  document.getElementById('login-page').style.display = 'none';
  document.getElementById('dashboard-page').style.display = 'none';
  document.getElementById('dswd-page').style.display = 'flex';

  // Relabel the static "DSWD" / "Health Center" texts in the header and sidebar as BHW
  document.querySelectorAll('#dswd-page div, #dswd-page span').forEach(el => {
    if (el.children.length === 0) {
      const t = el.textContent.trim();
      if (t === 'DSWD' || t === 'Health Center') el.textContent = 'BHW';
    }
  });

  showDSWDStats();
  updateHeaderUI();
  startHeaderClock();
}

function renderResidentWelcome() {
  const body = document.getElementById('dashboard-body');
  const u = loggedInUser;

  let children = [];
  try { children = JSON.parse(u.children_names || '[]'); } catch(e) { children = []; }
  if (!Array.isArray(children)) children = [];

  body.innerHTML = `
    <div style="padding:16px; background:#f5f6fa; height:100%; box-sizing:border-box;">

      <!-- Hero Banner -->
      <div style="background:#8B0000; border-radius:16px; padding:16px 24px; margin-bottom:14px; position:relative; overflow:hidden; box-shadow:0 8px 32px rgba(139,0,0,0.25);">
        <div style="position:absolute;top:-30px;right:-30px;width:180px;height:180px;background:rgba(255,255,255,0.07);border-radius:50%;"></div>
        <div style="position:absolute;bottom:-50px;right:60px;width:120px;height:120px;background:rgba(255,255,255,0.05);border-radius:50%;"></div>
        <div style="position:relative; z-index:1;">
          <div style="font-size:13px; color:rgba(255,255,255,0.75); font-weight:500; letter-spacing:0.5px; margin-bottom:6px; text-transform:uppercase;">Welcome back</div>
          <div style="font-size:28px; font-weight:700; color:#fff; margin-bottom:4px;">${u.name || 'Resident'}</div>
          <div style="font-size:13px; color:rgba(255,255,255,0.7);">Barangay ${u.barangay || 'Trapiche'} &nbsp;·&nbsp; Tanauan City, Batangas</div>
        </div>
      </div>

      <!-- Stat Cards -->
      <div style="display:grid; grid-template-columns:repeat(auto-fit,minmax(130px,1fr)); gap:10px; margin-bottom:14px;">
        ${[
          { label:'Age', value: u.age || '—', icon:'🎂', color:'#1a3f6c' },
          { label:'Gender', value: u.gender || '—', icon:'👤', color:'#2c5aa0' },
          { label:'Civil Status', value: u.status || '—', icon:'💍', color:'#c0392b' },
          { label:'PWD', value: u.pwd === 'Yes' ? 'Yes' : 'No', icon:'♿', color:'#e67e22' },
          { label:'Senior', value: (u.age >= 60) ? 'Yes' : 'No', icon:'⭐', color:'#27ae60' },
        ].map(card => `
          <div style="background:#fff; border-radius:10px; padding:10px 14px; border:1px solid #ebebeb; box-shadow:0 2px 8px rgba(0,0,0,0.04); display:flex; align-items:center; gap:10px;"
            onmouseover="this.style.boxShadow='0 6px 20px rgba(0,0,0,0.1)'" onmouseout="this.style.boxShadow='0 2px 8px rgba(0,0,0,0.04)'">
            <div style="font-size:18px;">${card.icon}</div>
            <div>
              <div style="font-size:15px; font-weight:700; color:${card.color};">${card.value}</div>
              <div style="font-size:11px; color:#999; font-weight:500; text-transform:uppercase; letter-spacing:0.4px;">${card.label}</div>
            </div>
          </div>
        `).join('')}
      </div>

      <!-- Profile Detail Cards -->
      <div style="display:grid; grid-template-columns:1fr 1fr; gap:10px; margin-bottom:14px;">

        <!-- Personal Information -->
        <div style="background:#fff; border-radius:16px; border:1px solid #ebebeb; overflow:hidden; box-shadow:0 2px 8px rgba(0,0,0,0.04);">
          <div style="padding:10px 16px; border-bottom:1px solid #f0f0f0; background:#fafafa;">
            <div style="font-size:13px; font-weight:700; color:#c0392b;">🧍 Personal Information</div>
          </div>
          <div style="padding:10px 16px; display:flex; flex-direction:column; gap:7px;">
            ${[
              { label:'Date of Birth', value: u.dob ? formatDate(u.dob) : '—' },
              { label:'Place of Birth', value: u.place_of_birth || '—' },
              { label:'Blood Type', value: u.blood_type || '—' },
              { label:'Religion', value: u.religion || '—' },
              { label:'Barangay', value: u.barangay || '—' },
              { label:'Address', value: u.address || '—' },
            ].map(row => `
              <div style="display:flex; justify-content:space-between; align-items:flex-start; gap:10px;">
                <span style="font-size:12px; color:#999; font-weight:500; text-transform:uppercase; letter-spacing:0.4px; min-width:130px; padding-top:1px;">${row.label}</span>
                <span style="font-size:13px; color:#1a1a1a; font-weight:500; text-align:right;">${row.value}</span>
              </div>
            `).join('')}
          </div>
        </div>

        <!-- Family Information -->
        <div style="background:#fff; border-radius:16px; border:1px solid #ebebeb; overflow:hidden; box-shadow:0 2px 8px rgba(0,0,0,0.04);">
          <div style="padding:10px 16px; border-bottom:1px solid #f0f0f0; background:#fafafa;">
            <div style="font-size:13px; font-weight:700; color:#1a3f6c;">👨‍👩‍👧‍👦 Family Information</div>
          </div>
          <div style="padding:10px 16px; display:flex; flex-direction:column; gap:7px;">
            ${[
              { label:'Spouse', value: (u.spouse && u.spouse !== 'N/A') ? u.spouse : '—' },
              { label:'Household Role', value: u.household_role || '—' },
              { label:'Voter Status', value: u.voter_status || '—' },
            ].map(row => `
              <div style="display:flex; justify-content:space-between; align-items:flex-start; gap:10px;">
                <span style="font-size:12px; color:#999; font-weight:500; text-transform:uppercase; letter-spacing:0.4px; min-width:130px; padding-top:1px;">${row.label}</span>
                <span style="font-size:13px; color:#1a1a1a; font-weight:500; text-align:right;">${row.value}</span>
              </div>
            `).join('')}
          </div>
        </div>

        <!-- Contact & Education -->
        <div style="background:#fff; border-radius:16px; border:1px solid #ebebeb; overflow:hidden; box-shadow:0 2px 8px rgba(0,0,0,0.04);">
          <div style="padding:10px 16px; border-bottom:1px solid #f0f0f0; background:#fafafa;">
            <div style="font-size:13px; font-weight:700; color:#e67e22;">📞 Contact & Education</div>
          </div>
          <div style="padding:10px 16px; display:flex; flex-direction:column; gap:7px;">
            ${[
              { label:'Contact No.', value: u.contact || '—' },
              { label:'Email', value: u.email || '—' },
              { label:'Educational Attainment', value: u.educational_attainment || '—' },
            ].map(row => `
              <div style="display:flex; justify-content:space-between; align-items:flex-start; gap:10px;">
                <span style="font-size:12px; color:#999; font-weight:500; text-transform:uppercase; letter-spacing:0.4px; min-width:130px; padding-top:1px;">${row.label}</span>
                <span style="font-size:13px; color:#1a1a1a; font-weight:500; text-align:right; word-break:break-all;">${row.value}</span>
              </div>
            `).join('')}
          </div>
        </div>

        <!-- Emergency Contact -->
        <div style="background:#fff; border-radius:16px; border:1px solid #ebebeb; overflow:hidden; box-shadow:0 2px 8px rgba(0,0,0,0.04);">
          <div style="padding:10px 16px; border-bottom:1px solid #f0f0f0; background:#fafafa;">
            <div style="font-size:13px; font-weight:700; color:#c0392b;">🚨 Emergency Contact</div>
          </div>
          <div style="padding:10px 16px; display:flex; flex-direction:column; gap:7px;">
            ${[
              { label:'Name', value: u.emergency_contact_name || '—' },
              { label:'Number', value: u.emergency_contact_number || '—' },
            ].map(row => `
              <div style="display:flex; justify-content:space-between; align-items:flex-start; gap:10px;">
                <span style="font-size:12px; color:#999; font-weight:500; text-transform:uppercase; letter-spacing:0.4px; min-width:130px; padding-top:1px;">${row.label}</span>
                <span style="font-size:13px; color:#1a1a1a; font-weight:500; text-align:right;">${row.value}</span>
              </div>
            `).join('')}
          </div>
        </div>

      </div>

      <!-- Children -->
      ${children.length > 0 ? `
        <div style="background:#fff; border-radius:16px; border:1px solid #ebebeb; overflow:hidden; box-shadow:0 2px 8px rgba(0,0,0,0.04); margin-bottom:24px;">
          <div style="padding:16px 22px; border-bottom:1px solid #f0f0f0; background:#fafafa;">
            <div style="font-size:14px; font-weight:700; color:#e67e22;">👶 Children (${children.length})</div>
          </div>
          <div style="padding:18px 22px; display:flex; flex-wrap:wrap; gap:10px;">
            ${children.map(c => `
              <div style="background:#fff8f0; border:1px solid #fde8c8; border-radius:10px; padding:10px 16px; display:flex; align-items:center; gap:10px;">
                <span style="font-size:18px;">${c.gender === 'Female' ? '👧' : '👦'}</span>
                <div>
                  <div style="font-size:13px; font-weight:600; color:#1a1a1a;">${c.name}</div>
                  <div style="font-size:12px; color:#999;">Age ${c.age} · ${c.gender}</div>
                </div>
              </div>
            `).join('')}
          </div>
        </div>
      ` : ''}

      <!-- Recent Requests -->
      <div style="background:#fff; border-radius:16px; border:1px solid #ebebeb; overflow:hidden; box-shadow:0 2px 8px rgba(0,0,0,0.04);">
        <div style="display:flex; align-items:center; justify-content:space-between; padding:10px 16px; border-bottom:1px solid #f0f0f0;">
          <div>
            <div style="font-size:14px; font-weight:700; color:#1a1a1a;">Recent Requests</div>
            <div style="font-size:11px; color:#999; margin-top:2px;">Your latest document requests</div>
          </div>
          <button onclick="showMyRequests()"
            style="padding:6px 12px; background:#1a3f6c; color:white; border:none; border-radius:8px; font-size:12px; font-weight:600; cursor:pointer;">
            View All
          </button>
        </div>
        <div id="recent-requests-container" style="padding:10px 16px;">
          <div style="display:flex; align-items:center; gap:10px; color:#bbb; font-size:14px;">
            <div style="width:16px;height:16px;border:2px solid #ddd;border-top-color:#c0392b;border-radius:50%;animation:spin 0.8s linear infinite;"></div>
            Loading your requests...
          </div>
        </div>
      </div>

    </div>
    <style>@keyframes spin { to { transform:rotate(360deg); } }</style>
  `;
  loadMyRequestsPreview();
}

function loadMyRequestsPreview() {
  if (!loggedInUser || !loggedInUser.username) return;

  fetch(`${API_BASE}/api/my-requests?username=${loggedInUser.username}`)
    .then(res => res.json())
    .then(data => {
      loggedInUser.requests = data.requests || [];
      const container = document.getElementById('recent-requests-container');
      if (!container) return;

      if (loggedInUser.requests.length === 0) {
        container.innerHTML = `
          <div style="text-align:center; padding:32px 0;">
            <div style="font-size:36px; margin-bottom:12px;">📄</div>
            <div style="font-size:15px; font-weight:500; color:#aaa;">No requests yet</div>
            <div style="font-size:13px; color:#ccc; margin-top:4px;">Click "My Requests" in the sidebar to file one</div>
          </div>
        `;
        return;
      }

      const statusConfig = {
        'Approved': { bg:'#f0fdf4', border:'#86efac', badge:'#16a34a', badgeBg:'#dcfce7', dot:'#22c55e' },
        'Rejected':  { bg:'#fff5f5', border:'#fca5a5', badge:'#dc2626', badgeBg:'#fee2e2', dot:'#ef4444' },
        'Pending':   { bg:'#fffbeb', border:'#fcd34d', badge:'#d97706', badgeBg:'#fef3c7', dot:'#f59e0b' },
      };

      container.innerHTML = `
        <div style="display:flex; flex-direction:column; gap:12px;">
          ${loggedInUser.requests.slice(0, 3).map(r => {
            const cfg = statusConfig[r.status] || statusConfig['Pending'];
            return `
              <div style="background:${cfg.bg}; border:1px solid ${cfg.border}; border-radius:12px; padding:16px 20px; display:flex; align-items:center; justify-content:space-between; gap:16px;">
                <div style="display:flex; align-items:center; gap:14px;">
                  <div style="width:10px;height:10px;border-radius:50%;background:${cfg.dot};flex-shrink:0;box-shadow:0 0 0 3px ${cfg.badgeBg};"></div>
                  <div>
                    <div style="font-size:14px; font-weight:600; color:#1a1a1a;">${r.document_type}</div>
                    ${r.status === 'Approved' && r.date && r.time
                      ? `<div style="font-size:12px; color:#555; margin-top:2px;">Pick-up: ${formatDate(r.date)} at ${formatTime12Hour(r.time)}</div>`
                      : `<div style="font-size:12px; color:#888; margin-top:2px;">Status updated recently</div>`
                    }
                  </div>
                </div>
                <span style="background:${cfg.badgeBg}; color:${cfg.badge}; font-size:12px; font-weight:600; padding:4px 12px; border-radius:99px; white-space:nowrap;">${r.status}</span>
              </div>
            `;
          }).join('')}
        </div>
      `;
    })
    .catch(err => console.error('Failed to load requests', err));
}

function showMyRequests() {
  const body = document.getElementById('dashboard-body');
  const userRequests = loggedInUser.requests || [];

  body.innerHTML = `
    <button onclick="renderResidentWelcome()" 
      style="display:inline-block; width:fit-content; padding:8px 16px; margin-bottom:10px; font-size:12px; border:none; border-radius:6px; background:#1a3f6c; color:white; cursor:pointer;">
      ← Back
    </button>
    <h2>My Requests</h2>
    <div style="display:flex; gap:20px; height:calc(100vh - 140px); align-items:stretch;">
      <div style="flex:1; max-width:450px; background:#f4f7ff; padding:20px; border-radius:10px; display:flex; flex-direction:column; height:100%; box-sizing:border-box;">
        <h3>Request Document</h3>
        <label>Document Type:</label>
        <select id="document-type" style="width:100%; padding:8px; margin-bottom:10px;">
          <option value="Barangay Clearance">Barangay Clearance</option>
          <option value="Barangay Residency">Barangay Residency</option>
          <option value="Barangay Indigency">Barangay Indigency</option>
        </select>
        <label>Purpose:</label>
        <input type="text" id="document-purpose" placeholder="Enter purpose" style="width:100%; padding:8px; margin-bottom:10px;">
        <label>Gmail:</label>
        <input type="email" id="request-email" placeholder="example@gmail.com" required style="width:100%; padding:8px; margin-bottom:10px;">
        <label>Upload Government ID:</label>
        <input type="file" id="request-gov-id" style="width:100%; margin-bottom:10px;">
        <label>Upload 2x2 Picture:</label>
        <input type="file" id="request-photo" style="width:100%; margin-bottom:10px;">
        <label>Preferred Pick-up Date:</label>
        <input type="date" id="request-date" style="width:100%; padding:8px; margin-bottom:10px;" min="${new Date().toISOString().split('T')[0]}">
        <label>Preferred Pick-up Time:</label>
        <input type="time" id="request-time" style="width:100%; padding:8px; margin-bottom:15px;">
        <button onclick="requestDocument()" style="width:100%; padding:10px; background:#1a3f6c; color:white; border:none; border-radius:8px; cursor:pointer;">
          Request
        </button>
      </div>
      <div style="flex:2; background:#fdfdfd; padding:20px; border-radius:10px; display:flex; flex-direction:column; height:100%; box-sizing:border-box; overflow:hidden;">
        <h3>My Requests</h3>
        ${userRequests.length === 0
          ? '<p>No requests yet.</p>'
          : userRequests.map((r, index) => {
              let bgColor = r.status === 'Approved' ? '#d4edda' :
                            r.status === 'Rejected' ? '#f8d7da' : '#fff3cd';
              return `
                <div onclick="showRequestDetail(${index})" 
                     style="border:1px solid #ccc; border-radius:8px; padding:12px; margin-bottom:10px; background:${bgColor}; cursor:pointer;">
                  <h4 style="margin:0 0 5px 0;">${r.document_type}</h4>
                  <p style="margin:0;"><strong>Status:</strong> ${r.status}</p>
                  ${r.status === 'Approved' && r.date && r.time
                    ? `<p>Pick-up Date: ${formatDate(r.date)}</p>
                       <p>Pick-up Time: ${formatTime12Hour(r.time)}</p>`
                    : ''}
                  ${r.status === 'Rejected' ? `<p style="color:red; margin:0;">Your request was rejected.</p>` : ''}
                </div>
              `;
            }).join('')}
      </div>
    </div>
  `;
}

function showMyProfile() {
  const body = document.getElementById('dashboard-body');
  const u = loggedInUser;

  // Parse children names JSON if stored
  let children = [];
  try { children = JSON.parse(u.children_names || '[]'); } catch(e) { children = []; }
  if (!Array.isArray(children)) children = [];

  const inputStyle = `width:100%; padding:9px 12px; border-radius:8px; border:1px solid #ddd; font-size:13px; margin:0; box-sizing:border-box;`;
  const labelStyle = `font-size:13px; color:#555; font-weight:600; display:block; margin-bottom:4px;`;
  const fieldDiv = (label, input) => `
    <div style="margin-bottom:14px;">
      <label style="${labelStyle}">${label}</label>
      ${input}
    </div>
  `;

  const sel = (id, options, val) => `
    <select id="${id}" style="${inputStyle}">
      ${options.map(o => `<option value="${o}" ${val===o?'selected':''}>${o}</option>`).join('')}
    </select>
  `;

  body.innerHTML = `
    <div style="max-width:900px; margin:0 auto; padding:20px;">
      <button onclick="renderResidentWelcome()"
        style="margin-bottom:16px; padding:8px 16px; background:#1a3f6c; color:white; border:none; border-radius:6px; font-size:13px; cursor:pointer;">
        ← Back
      </button>
      <h2 style="margin:0 0 20px; color:#1a1a1a; font-size:20px;">My Profile</h2>

      <div style="display:grid; grid-template-columns:1fr 1fr; gap:20px;">

        <!-- PERSONAL INFO -->
        <div style="background:#fff; padding:20px; border-radius:12px; box-shadow:0 2px 8px rgba(0,0,0,0.08); border-top:4px solid #c0392b;">
          <h3 style="margin:0 0 16px; font-size:15px; color:#c0392b;">Personal Information</h3>
          ${fieldDiv('Full Name', `<input type="text" id="profile-name" value="${u.name||''}" style="${inputStyle}">`)}
          ${fieldDiv('Date of Birth', `<input type="date" id="profile-dob" value="${(u.dob||'').split('T')[0]}" onchange="calcProfileAge()" style="${inputStyle}">`)}
          ${fieldDiv('Age', `<input type="number" id="profile-age" value="${u.age||''}" style="${inputStyle}">`)}
          ${fieldDiv('Sex', sel('profile-gender', ['Male','Female'], u.gender))}
          ${fieldDiv('Civil Status', sel('profile-status', ['Single','Married','Widowed','Separated'], u.status))}
          ${fieldDiv('Religion', `<input type="text" id="profile-religion" value="${u.religion||''}" style="${inputStyle}">`)}
          ${fieldDiv('Place of Birth', `<input type="text" id="profile-place-of-birth" value="${u.place_of_birth||''}" style="${inputStyle}">`)}
          ${fieldDiv('Blood Type', sel('profile-blood-type', ['Unknown','A+','A-','B+','B-','AB+','AB-','O+','O-'], u.blood_type||'Unknown'))}
          ${fieldDiv('Barangay', sel('profile-barangay', ['Trapiche 1','Trapiche 2','Trapiche 3','Trapiche 4'], u.barangay))}
          ${fieldDiv('House No. / Street / Address', `<input type="text" id="profile-address" value="${u.address||''}" placeholder="e.g. 123 Mabini St." style="${inputStyle}">`)}
        </div>

        <!-- FAMILY & OTHER INFO -->
        <div style="background:#fff; padding:20px; border-radius:12px; box-shadow:0 2px 8px rgba(0,0,0,0.08); border-top:4px solid #1a3f6c;">
          <h3 style="margin:0 0 16px; font-size:15px; color:#1a3f6c;">Family & Other Info</h3>
          ${fieldDiv('Voter Status', sel('profile-voter-status', ['Not Registered','Registered Voter'], u.voter_status||'Not Registered'))}
          ${fieldDiv('Household Role', sel('profile-household-role', ['Select Household Role','Head','Spouse','Child','Sibling','Grandparent','Grandchild','Relative'], u.household_role||'Select Household Role'))}
          ${fieldDiv('Educational Attainment', sel('profile-educational-attainment', ['Select Educational Attainment','Elementary Level','Elementary Graduate','High School Level','High School Graduate','Vocational','College Level','College Graduate','Post Graduate'], u.educational_attainment||'Select Educational Attainment'))}
          ${fieldDiv('PWD', sel('profile-pwd', ['No','Yes'], u.pwd==='Yes'?'Yes':'No'))}

          <!-- SPOUSE -->
          <div style="margin-bottom:14px;">
            <label style="${labelStyle}">Spouse</label>
            <div style="display:flex; gap:8px; align-items:center;">
              <select id="profile-spouse-toggle" onchange="toggleSpouseInput()" style="width:120px; padding:9px 12px; border-radius:8px; border:1px solid #ddd; font-size:13px;">
                <option value="N/A" ${(!u.spouse||u.spouse==='N/A')?'selected':''}>N/A</option>
                <option value="named" ${(u.spouse&&u.spouse!=='N/A')?'selected':''}>Enter Name</option>
              </select>
              <input type="text" id="profile-spouse-name" value="${(u.spouse&&u.spouse!=='N/A')?u.spouse:''}"
                placeholder="Spouse name"
                style="${inputStyle} flex:1; display:${(u.spouse&&u.spouse!=='N/A')?'block':'none'};">
            </div>
          </div>

          ${fieldDiv('Contact Number', `<input type="tel" id="profile-contact" value="${u.contact||''}" placeholder="09XXXXXXXXX" oninput="this.value=this.value.replace(/[^0-9]/g,'')" maxlength="11" style="${inputStyle}">`)}
          ${fieldDiv('Email Address', `<input type="email" id="profile-email" value="${u.email||''}" style="${inputStyle}">`)}
          ${fieldDiv('Emergency Contact Name', `<input type="text" id="profile-emergency-name" value="${u.emergency_contact_name||''}" style="${inputStyle}">`)}
          ${fieldDiv('Emergency Contact Number', `<input type="tel" id="profile-emergency-number" value="${u.emergency_contact_number||''}" placeholder="09XXXXXXXXX" oninput="this.value=this.value.replace(/[^0-9]/g,'')" maxlength="11" style="${inputStyle}">`)}
        </div>

      </div>

      <!-- CHILDREN SECTION -->
      <div style="background:#fff; padding:20px; border-radius:12px; box-shadow:0 2px 8px rgba(0,0,0,0.08); border-top:4px solid #e67e22; margin-top:20px;">
        <div style="display:flex; align-items:center; justify-content:space-between; margin-bottom:16px;">
          <h3 style="margin:0; font-size:15px; color:#e67e22;">Children</h3>
          <button onclick="addChildRow()" style="padding:7px 16px; background:#e67e22; color:white; border:none; border-radius:6px; font-size:13px; cursor:pointer;">+ Add Child</button>
        </div>
        <div id="children-list" style="display:flex; flex-direction:column; gap:10px;">
          ${children.length === 0
            ? `<p style="color:#aaa; font-size:13px; text-align:center; padding:20px 0;">No children added yet. Click "+ Add Child" to add one.</p>`
            : children.map((c, i) => childRow(c.name, c.age, c.gender, i)).join('')
          }
        </div>
      </div>

      <!-- SAVE BUTTON -->
      <div style="margin-top:20px; margin-bottom:60px; text-align:right;">
        <div id="profile-message" style="font-size:13px; margin-bottom:10px; text-align:center;"></div>
        <button onclick="updateProfile()"
          style="padding:12px 40px; background:#8B0000; color:white; font-weight:bold; border:none; border-radius:8px; font-size:14px; cursor:pointer;">
          💾 Save Profile
        </button>
      </div>
    </div>
  `;
}

function childRow(name='', age='', gender='Male', index) {
  return `
    <div id="child-row-${index}" style="display:flex; gap:10px; align-items:center; background:#f8f9fa; padding:10px 14px; border-radius:8px; border:1px solid #eee;">
      <input type="text" placeholder="Child's name" value="${name}"
        style="flex:2; padding:8px 12px; border-radius:6px; border:1px solid #ddd; font-size:13px; margin:0;"
        id="child-name-${index}">
      <input type="number" placeholder="Age" value="${age}" min="0"
        style="width:70px; padding:8px 12px; border-radius:6px; border:1px solid #ddd; font-size:13px; margin:0;"
        id="child-age-${index}">
      <select id="child-gender-${index}" style="padding:8px 12px; border-radius:6px; border:1px solid #ddd; font-size:13px; margin:0;">
        <option value="Male" ${gender==='Male'?'selected':''}>Male</option>
        <option value="Female" ${gender==='Female'?'selected':''}>Female</option>
      </select>
      <button onclick="removeChildRow(${index})" style="padding:6px 12px; background:#f8d7da; color:#c0392b; border:none; border-radius:6px; font-size:13px; cursor:pointer;">✕</button>
    </div>
  `;
}

function addChildRow() {
  const list = document.getElementById('children-list');
  const index = Date.now();
  const p = list.querySelector('p');
  if (p) p.remove();
  const div = document.createElement('div');
  div.innerHTML = childRow('', '', 'Male', index);
  list.appendChild(div.firstElementChild);
}

function removeChildRow(index) {
  const row = document.getElementById(`child-row-${index}`);
  if (row) row.remove();
  const list = document.getElementById('children-list');
  if (list.children.length === 0) {
    list.innerHTML = `<p style="color:#aaa; font-size:13px; text-align:center; padding:20px 0;">No children added yet. Click "+ Add Child" to add one.</p>`;
  }
}

function toggleSpouseInput() {
  const toggle = document.getElementById('profile-spouse-toggle').value;
  const input = document.getElementById('profile-spouse-name');
  input.style.display = toggle === 'named' ? 'block' : 'none';
  if (toggle === 'N/A') input.value = '';
}

function calcResAge() {
  const dob = document.getElementById('res-dob').value;
  if (!dob) return;
  const age = Math.floor((new Date() - new Date(dob)) / (365.25 * 24 * 60 * 60 * 1000));
  document.getElementById('res-age').value = age;
}

function calcProfileAge() {
  const dob = document.getElementById('profile-dob').value;
  if (!dob) return;
  const age = Math.floor((new Date() - new Date(dob)) / (365.25 * 24 * 60 * 60 * 1000));
  document.getElementById('profile-age').value = age;
}

function updateProfile(){
  // Collect children
  const childRows = document.querySelectorAll('#children-list [id^="child-row-"]');
  const children = [];
  childRows.forEach(row => {
    const id = row.id.replace('child-row-', '');
    const name = document.getElementById(`child-name-${id}`)?.value.trim();
    const age = document.getElementById(`child-age-${id}`)?.value;
    const gender = document.getElementById(`child-gender-${id}`)?.value;
    if (name) children.push({ name, age: parseInt(age)||0, gender });
  });

  // Spouse
  const spouseToggle = document.getElementById('profile-spouse-toggle')?.value;
  const spouseName = document.getElementById('profile-spouse-name')?.value.trim();
  const spouse = spouseToggle === 'named' && spouseName ? spouseName : 'N/A';

  const age = parseInt(document.getElementById('profile-age').value) || 0;

  const updatedData = {
    name: document.getElementById('profile-name').value,
    age,
    senior: age >= 60 ? 'Yes' : 'No',
    gender: document.getElementById('profile-gender').value,
    status: document.getElementById('profile-status').value,
    barangay: document.getElementById('profile-barangay').value,
    address: document.getElementById('profile-address')?.value || '',
    dob: document.getElementById('profile-dob').value,
    religion: document.getElementById('profile-religion').value,
    place_of_birth: document.getElementById('profile-place-of-birth')?.value || '',
    blood_type: document.getElementById('profile-blood-type')?.value || '',
    voter_status: document.getElementById('profile-voter-status')?.value || '',
    household_role: document.getElementById('profile-household-role')?.value || '',
    educational_attainment: document.getElementById('profile-educational-attainment')?.value || '',
    spouse,
    sons: loggedInUser.sons || 0,
    daughters: loggedInUser.daughters || 0,
    pwd: document.getElementById('profile-pwd').value,
    family_members: loggedInUser.family_members || 0,
    contact: document.getElementById('profile-contact').value,
    email: document.getElementById('profile-email').value,
    emergency_contact_name: document.getElementById('profile-emergency-name')?.value || '',
    emergency_contact_number: document.getElementById('profile-emergency-number')?.value || '',
    children_names: JSON.stringify(children)
  };

  const msg = document.getElementById('profile-message');
  if (msg) { msg.innerText = 'Saving...'; msg.style.color = '#888'; }

  fetch(`${API_BASE}/api/update-resident/${loggedInUser.username}`, {
    method: 'PUT',
    headers: { 'Content-Type':'application/json' },
    body: JSON.stringify(updatedData)
  })
  .then(res => res.json())
  .then(data => {
    if(data.success){
      Object.assign(loggedInUser, updatedData);
      // Force full save of every field so nothing is lost on logout
      const toSave = Object.assign({}, loggedInUser);
      localStorage.setItem("user", JSON.stringify(toSave));
      if (msg) { msg.innerText = 'Profile saved successfully!'; msg.style.color = 'green'; }
      updateHeaderUI();
    } else {
      if (msg) { msg.innerText = 'Failed: ' + (data.message || 'Unknown error'); msg.style.color = 'red'; }
    }
  })
  .catch(() => {
    if (msg) { msg.innerText = 'Server error.'; msg.style.color = 'red'; }
  });
}

function requestDocument() {
  const type = document.getElementById('document-type').value;
  const purpose = document.getElementById('document-purpose').value.trim();
  const email = document.getElementById('request-email').value.trim();
  const govIdFile = document.getElementById('request-gov-id').files[0];
  const photoFile = document.getElementById('request-photo').files[0];

  const date = document.getElementById('request-date').value;
  const time = document.getElementById('request-time').value;

  if (!type || !purpose || !email || !govIdFile || !photoFile || !date || !time) {
    alert('Please fill all required fields including pick-up date and time.');
    return;
  }

  const formData = new FormData();
  formData.append("username", loggedInUser.username);
  formData.append("document_type", type);
  formData.append("purpose", purpose);
  formData.append("email", email);
  formData.append("gov_id", govIdFile);
  formData.append("photo", photoFile);
  formData.append("date", date);
  formData.append("time", time);

  const btn = document.querySelector('button[onclick="requestDocument()"]');
  if (btn) { btn.disabled = true; btn.innerText = 'Submitting...'; }

  fetch(`${API_BASE}/api/request-document`, {
    method: 'POST',
    body: formData
  })
  .then(res => res.json())
  .then(data => {
    if (btn) { btn.disabled = false; btn.innerText = 'Request'; }
    const successBox = document.getElementById('request-result');
    if (successBox) {
      successBox.style.display = 'block';
      successBox.style.background = '#f0fdf4';
      successBox.style.border = '1px solid #86efac';
      successBox.style.color = '#16a34a';
      successBox.style.padding = '14px 18px';
      successBox.style.borderRadius = '10px';
      successBox.style.fontSize = '14px';
      successBox.style.fontWeight = '500';
      successBox.style.marginTop = '12px';
      successBox.innerText = '✅ Your request has been submitted successfully! The barangay will review it and notify you by email.';
      setTimeout(() => { successBox.style.display = 'none'; }, 5000);
    }
    fetch(`${API_BASE}/api/my-requests?username=${loggedInUser.username}`)
      .then(r => r.json())
      .then(d => {
        loggedInUser.requests = d.requests || [];
        const listDiv = document.querySelector('#dashboard-body .flex-2, #dashboard-body div[style*="flex:2"]');
        if (listDiv) showMyRequests();
      });
  })
  .catch(() => {
    if (btn) { btn.disabled = false; btn.innerText = 'Request'; }
    const successBox = document.getElementById('request-result');
    if (successBox) {
      successBox.style.display = 'block';
      successBox.style.background = '#fff5f5';
      successBox.style.border = '1px solid #fca5a5';
      successBox.style.color = '#dc2626';
      successBox.style.padding = '14px 18px';
      successBox.style.borderRadius = '10px';
      successBox.style.fontSize = '14px';
      successBox.style.fontWeight = '500';
      successBox.style.marginTop = '12px';
      successBox.innerText = '❌ Could not connect to the server. Please check your connection and try again.';
    }
  });
}


// FIX #2: was username (undefined), now loggedInUser.username
function loadMyRequests() {
  if (!loggedInUser || !loggedInUser.username) return;

  fetch(`${API_BASE}/api/my-requests?username=${loggedInUser.username}`)
    .then(res => res.json())
    .then(data => {
      loggedInUser.requests = data.requests || [];
      const previewDiv = document.getElementById('resident-requests-preview');
      if (!previewDiv) return;
      if (loggedInUser.requests.length === 0) {
        previewDiv.innerHTML = '<p>No requests yet.</p>';
      } else {
        previewDiv.innerHTML = `
          <ul>
            ${loggedInUser.requests.slice(-3).map(r => `
              <li>${r.document_type} - <strong>${r.status}</strong></li>
            `).join('')}
          </ul>
        `;
      }
    })
    .catch(err => console.error('Failed to load requests', err));
}

// Manager Functions 
function showDocRequests() {
  Promise.all([
    fetch(`${API_BASE}/api/document-requests`).then(res => res.json()),
    fetch(`${API_BASE}/api/residents`).then(res => res.json())
  ])
  .then(([requestsData, residentsData]) => {
    window.allRequests = requestsData.requests || [];
    window.allResidents = residentsData.residents || [];
    renderManagerRequests(window.allRequests, 'pending');
  })
  .catch(err => alert('Failed to load requests'));
}

function renderManagerRequests(allRequests, filter = 'all') {
  const body = document.getElementById('manager-table');

  let filteredRequests = allRequests;
  if (filter === 'pending')  filteredRequests = allRequests.filter(r => r.status === 'Pending');
  else if (filter === 'approved') filteredRequests = allRequests.filter(r => r.status === 'Approved');
  else if (filter === 'rejected') filteredRequests = allRequests.filter(r => r.status === 'Rejected');

  const pending  = allRequests.filter(r => r.status === 'Pending').length;
  const approved = allRequests.filter(r => r.status === 'Approved').length;
  const rejected = allRequests.filter(r => r.status === 'Rejected').length;

  const statusCfg = {
    'Pending':  { bar:'#8B0000', badgeBg:'#fef3c7', badgeColor:'#92400e', dot:'#f59e0b', accentLine:'#f59e0b' },
    'Approved': { bar:'#8B0000', badgeBg:'#dcfce7', badgeColor:'#14532d', dot:'#22c55e', accentLine:'#22c55e' },
    'Rejected': { bar:'#8B0000', badgeBg:'#fee2e2', badgeColor:'#7f1d1d', dot:'#ef4444', accentLine:'#ef4444' },
  };

  const tabBtn = (label, value, count, active) => `
    <button onclick="renderManagerRequests(window.allRequests, '${value}')"
      style="display:inline-flex; align-items:center; gap:8px; padding:9px 20px; border-radius:8px; font-size:13px; font-weight:600; cursor:pointer; border:1.5px solid ${active ? '#8B0000' : '#e5e7eb'}; background:${active ? '#8B0000' : '#fff'}; color:${active ? '#fff' : '#6b7280'}; transition:all 0.15s;">
      ${label}
      <span style="background:${active ? 'rgba(255,255,255,0.25)' : '#f3f4f6'}; color:${active ? '#fff' : '#374151'}; font-size:11px; font-weight:700; padding:2px 8px; border-radius:99px;">${count}</span>
    </button>
  `;

  const filterLabel = filter === 'pending' ? 'Pending' : filter === 'approved' ? 'Approved' : 'Rejected';

  const headerSection = `
    <div style="background:#fff; border-bottom:1px solid #f0f0f0; padding:24px 32px 20px;">
      <div style="display:flex; align-items:flex-start; justify-content:space-between; margin-bottom:20px;">
        <div>
          <div style="font-size:11px; font-weight:700; color:#8B0000; letter-spacing:1px; text-transform:uppercase; margin-bottom:4px;">Barangay Trapiche</div>
          <h2 style="margin:0; font-size:22px; font-weight:700; color:#1a1a1a;">Document Requests</h2>
          <p style="margin:4px 0 0; font-size:13px; color:#9ca3af;">${allRequests.length} total request${allRequests.length !== 1 ? 's' : ''}</p>
        </div>
        <button onclick="showDocRequests()" style="display:inline-flex; align-items:center; gap:6px; padding:9px 16px; background:#f8f9fb; border:1px solid #e5e7eb; border-radius:8px; font-size:13px; font-weight:600; color:#374151; cursor:pointer;">
          ↻ Refresh
        </button>
      </div>
      <div style="display:flex; gap:8px;">
        ${tabBtn('Pending', 'pending', pending, filter === 'pending')}
        ${tabBtn('Approved', 'approved', approved, filter === 'approved')}
        ${tabBtn('Rejected', 'rejected', rejected, filter === 'rejected')}
      </div>
    </div>
  `;

  if (filteredRequests.length === 0) {
    body.innerHTML = `
      ${headerSection}
      <div style="padding:32px;">
        <div style="text-align:center; padding:80px 0; background:#fff; border-radius:16px; border:1px solid #f0f0f0;">
          <div style="width:56px; height:56px; background:#f5f5f5; border-radius:50%; display:flex; align-items:center; justify-content:center; margin:0 auto 16px; font-size:24px;">📭</div>
          <div style="font-size:16px; font-weight:600; color:#aaa;">No ${filterLabel.toLowerCase()} requests</div>
          <div style="font-size:13px; color:#ccc; margin-top:6px;">Check back later or switch tabs above</div>
        </div>
      </div>
    `;
    return;
  }

  const cards = filteredRequests.map(r => {
    const cfg = statusCfg[r.status] || statusCfg['Pending'];
    const residentMatch = (window.allResidents || []).find(res => res.username === r.username);
    const displayName = (residentMatch && residentMatch.name) ? residentMatch.name : r.username;
    const initials = displayName.charAt(0).toUpperCase();

    return `
      <div style="background:#fff; border-radius:16px; border:1px solid #eaecf0; overflow:hidden; transition:box-shadow 0.2s;"
        onmouseover="this.style.boxShadow='0 8px 30px rgba(0,0,0,0.08)'"
        onmouseout="this.style.boxShadow='none'">

        <div style="height:3px; background:${cfg.accentLine};"></div>

        <div style="display:grid; grid-template-columns:1fr 180px 1fr; min-height:220px;">

          <!-- LEFT: Resident + request info -->
          <div style="padding:22px 24px; border-right:1px solid #f3f4f6;">

            <div style="display:flex; align-items:center; gap:12px; margin-bottom:18px;">
              <div style="width:46px; height:46px; border-radius:50%; background:#8B0000; display:flex; align-items:center; justify-content:center; color:#fff; font-weight:700; font-size:18px; flex-shrink:0;">
                ${initials}
              </div>
              <div style="flex:1; min-width:0;">
                <div style="font-size:15px; font-weight:700; color:#111827; white-space:nowrap; overflow:hidden; text-overflow:ellipsis;">${displayName}</div>
                <div style="font-size:12px; color:#9ca3af; margin-top:2px; white-space:nowrap; overflow:hidden; text-overflow:ellipsis;">@${r.username}</div>
              </div>
              <span style="flex-shrink:0; display:inline-flex; align-items:center; gap:5px; background:${cfg.badgeBg}; color:${cfg.badgeColor}; font-size:11px; font-weight:700; padding:4px 10px; border-radius:99px; letter-spacing:0.3px;">
                <span style="width:5px; height:5px; border-radius:50%; background:${cfg.dot}; display:inline-block;"></span>
                ${r.status}
              </span>
            </div>

            <div style="display:flex; flex-direction:column; gap:0;">
              <div style="display:flex; justify-content:space-between; align-items:center; padding:10px 0; border-bottom:1px solid #f9fafb;">
                <span style="font-size:11px; font-weight:600; color:#9ca3af; text-transform:uppercase; letter-spacing:0.5px;">Document type</span>
                <span style="font-size:13px; font-weight:600; color:#111827; text-align:right; max-width:180px;">${r.document_type}</span>
              </div>
              <div style="display:flex; justify-content:space-between; align-items:center; padding:10px 0; border-bottom:1px solid #f9fafb;">
                <span style="font-size:11px; font-weight:600; color:#9ca3af; text-transform:uppercase; letter-spacing:0.5px;">Purpose</span>
                <span style="font-size:13px; color:#374151; text-align:right; max-width:180px;">${r.purpose}</span>
              </div>
              <div style="display:flex; justify-content:space-between; align-items:center; padding:10px 0; border-bottom:1px solid #f9fafb;">
                <span style="font-size:11px; font-weight:600; color:#9ca3af; text-transform:uppercase; letter-spacing:0.5px;">Pick-up date</span>
                <span style="font-size:13px; color:#374151;">${r.date ? formatDate(r.date) : '<span style="color:#d1d5db;">Not set</span>'}</span>
              </div>
              <div style="display:flex; justify-content:space-between; align-items:center; padding:10px 0;">
                <span style="font-size:11px; font-weight:600; color:#9ca3af; text-transform:uppercase; letter-spacing:0.5px;">Pick-up time</span>
                <span style="font-size:13px; color:#374151;">${r.time ? formatTime12Hour(r.time) : '<span style="color:#d1d5db;">Not set</span>'}</span>
              </div>
            </div>

          </div>

          <!-- CENTER: Attachments + Gmail -->
          <div style="padding:22px 16px; display:flex; flex-direction:column; align-items:center; justify-content:space-between; border-right:1px solid #f3f4f6; background:#fafafa;">

            <!-- Attachments top -->
            <div style="width:100%; display:flex; flex-direction:column; align-items:center; gap:10px;">
              <div style="font-size:10px; font-weight:700; color:#9ca3af; text-transform:uppercase; letter-spacing:0.6px;">Attachments</div>
              <div style="display:flex; flex-direction:column; gap:10px; width:100%;">
                <div style="text-align:center;">
                  <div style="font-size:10px; color:#9ca3af; font-weight:600; margin-bottom:6px; text-transform:uppercase; letter-spacing:0.4px;">Gov ID</div>
                  ${r.gov_id ? `
                    <a href="${r.gov_id}" target="_blank" style="display:inline-block;">
                      <img src="${r.gov_id}" style="width:80px; height:64px; object-fit:cover; border-radius:8px; border:1.5px solid #e5e7eb; transition:transform 0.2s; display:block;"
                        onmouseover="this.style.transform='scale(1.05)'" onmouseout="this.style.transform='scale(1)'"
                        onerror="this.style.display='none';">
                    </a>` : `
                    <div style="width:80px; height:64px; background:#f3f4f6; border-radius:8px; border:1.5px dashed #d1d5db; display:inline-flex; align-items:center; justify-content:center; font-size:11px; color:#9ca3af;">None</div>`}
                </div>
                <div style="text-align:center;">
                  <div style="font-size:10px; color:#9ca3af; font-weight:600; margin-bottom:6px; text-transform:uppercase; letter-spacing:0.4px;">2×2 Photo</div>
                  ${r.photo ? `
                    <a href="${r.photo}" target="_blank" style="display:inline-block;">
                      <img src="${r.photo}" style="width:80px; height:64px; object-fit:cover; border-radius:8px; border:1.5px solid #e5e7eb; transition:transform 0.2s; display:block;"
                        onmouseover="this.style.transform='scale(1.05)'" onmouseout="this.style.transform='scale(1)'"
                        onerror="this.style.display='none';">
                    </a>` : `
                    <div style="width:80px; height:64px; background:#f3f4f6; border-radius:8px; border:1.5px dashed #d1d5db; display:inline-flex; align-items:center; justify-content:center; font-size:11px; color:#9ca3af;">None</div>`}
                </div>
              </div>
            </div>

            <!-- Gmail button perfectly centered -->
            <div style="display:flex; flex-direction:column; align-items:center; justify-content:center; flex:1; width:100%; padding:16px 0;">
              <div style="font-size:10px; font-weight:700; color:#9ca3af; text-transform:uppercase; letter-spacing:0.6px; margin-bottom:10px;">Notify resident</div>
              <a href="mailto:${r.email}"
                style="display:inline-flex; align-items:center; justify-content:center; gap:7px; padding:10px 18px; background:#fff; border:1.5px solid #e5e7eb; border-radius:10px; font-size:12px; font-weight:700; color:#374151; text-decoration:none; transition:all 0.15s; width:100%; box-sizing:border-box;"
                onmouseover="this.style.background='#fff8f8'; this.style.borderColor='#8B0000'; this.style.color='#8B0000';"
                onmouseout="this.style.background='#fff'; this.style.borderColor='#e5e7eb'; this.style.color='#374151';">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" style="flex-shrink:0;">
                  <rect x="2" y="4" width="20" height="16" rx="2"/><path d="m2 7 10 7 10-7"/>
                </svg>
                Send Gmail
              </a>
              <div style="font-size:10px; color:#d1d5db; margin-top:6px; text-align:center;">${r.email || 'No email on file'}</div>
            </div>

          </div>

          <!-- RIGHT: Actions -->
          <div style="padding:22px 24px; display:flex; flex-direction:column; justify-content:center; gap:12px;">

            ${r.status === 'Pending' ? `
              <div style="margin-bottom:4px;">
                <div style="font-size:11px; font-weight:700; color:#9ca3af; text-transform:uppercase; letter-spacing:0.6px; margin-bottom:12px;">Actions</div>

                <button class="approve-btn"
                  data-username="${r.username}" data-doc="${r.document_type}"
                  data-date="${r.date || ''}" data-time="${r.time || ''}"
                  data-id="${r.id || ''}"
                  style="width:100%; padding:12px 18px; background:#8B0000; color:#fff; border:none; border-radius:10px; font-size:13px; font-weight:700; cursor:pointer; margin-bottom:8px; transition:all 0.15s; letter-spacing:0.3px;"
                  onmouseover="this.style.background='#6f0000'; this.style.transform='translateY(-1px)'"
                  onmouseout="this.style.background='#8B0000'; this.style.transform='translateY(0)'">
                  ✓ Approve Request
                </button>

                <button class="reject-btn"
                  data-username="${r.username}" data-doc="${r.document_type}"
                  data-id="${r.id || ''}"
                  style="width:100%; padding:12px 18px; background:#fff; color:#dc2626; border:1.5px solid #fca5a5; border-radius:10px; font-size:13px; font-weight:700; cursor:pointer; transition:all 0.15s; letter-spacing:0.3px;"
                  onmouseover="this.style.background='#fff5f5'; this.style.borderColor='#ef4444'; this.style.transform='translateY(-1px)'"
                  onmouseout="this.style.background='#fff'; this.style.borderColor='#fca5a5'; this.style.transform='translateY(0)'">
                  ✕ Reject Request
                </button>
              </div>

              <div style="background:#f8f9fb; border-radius:10px; padding:12px 14px;">
                <div style="font-size:11px; font-weight:700; color:#9ca3af; text-transform:uppercase; letter-spacing:0.5px; margin-bottom:8px;">Resident info</div>
                <div style="font-size:12px; color:#374151; display:flex; flex-direction:column; gap:5px;">
                  <div style="display:flex; justify-content:space-between;">
                    <span style="color:#9ca3af;">Username</span>
                    <span style="font-weight:600;">${r.username}</span>
                  </div>
                  <div style="display:flex; justify-content:space-between; gap:8px;">
                    <span style="color:#9ca3af; flex-shrink:0;">Email</span>
                    <span style="font-weight:600; word-break:break-all; text-align:right;">${r.email || '—'}</span>
                  </div>
                </div>
              </div>
            ` : `
              <div style="text-align:center; padding:20px 0;">
                <div style="width:48px; height:48px; border-radius:50%; background:${cfg.badgeBg}; display:flex; align-items:center; justify-content:center; margin:0 auto 10px; font-size:20px;">
                  ${r.status === 'Approved' ? '✓' : '✕'}
                </div>
                <div style="font-size:14px; font-weight:700; color:${cfg.badgeColor};">
                  Request ${r.status}
                </div>
                <div style="font-size:12px; color:#9ca3af; margin-top:4px;">No further action needed</div>
              </div>

              <div style="background:#f8f9fb; border-radius:10px; padding:12px 14px;">
                <div style="font-size:11px; font-weight:700; color:#9ca3af; text-transform:uppercase; letter-spacing:0.5px; margin-bottom:8px;">Resident info</div>
                <div style="font-size:12px; color:#374151; display:flex; flex-direction:column; gap:5px;">
                  <div style="display:flex; justify-content:space-between;">
                    <span style="color:#9ca3af;">Username</span>
                    <span style="font-weight:600;">${r.username}</span>
                  </div>
                  <div style="display:flex; justify-content:space-between; gap:8px;">
                    <span style="color:#9ca3af; flex-shrink:0;">Email</span>
                    <span style="font-weight:600; word-break:break-all; text-align:right;">${r.email || '—'}</span>
                  </div>
                </div>
              </div>
            `}

          </div>

        </div>
      </div>
    `;
  }).join('');

  body.innerHTML = `
    ${headerSection}
    <div style="padding:24px 32px; background:#f5f6fa; min-height:calc(100vh - 160px);">
      <div style="display:flex; flex-direction:column; gap:16px;">
        ${cards}
      </div>
    </div>
  `;

  document.querySelectorAll('.approve-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const username = btn.getAttribute('data-username');
      const docType  = btn.getAttribute('data-doc');
      const date     = btn.getAttribute('data-date');
      const time     = btn.getAttribute('data-time');

      btn.disabled = true;
      btn.innerText = 'Approving...';
      btn.style.background = '#aaa';
      btn.style.transform = 'none';

      const reqId = btn.getAttribute('data-id');
      fetch(`${API_BASE}/api/approve-request`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, documentType: docType, date, time, requestId: reqId })
      })
      .then(res => res.json())
      .then(data => {
        if (data.success) {
          sendApprovalEmail(data.email, docType, data.purpose || 'General Requirement', data.date || date, data.time || time);
          showToast(`Approved — notification sent to ${data.email}`, 'success');
          showDocRequests();
        } else {
          showToast(data.message || 'Failed to approve request.', 'error');
          btn.disabled = false;
          btn.innerText = '✓ Approve Request';
          btn.style.background = '#8B0000';
        }
      })
      .catch(() => {
        showToast('Server error while approving request.', 'error');
        btn.disabled = false;
        btn.innerText = '✓ Approve Request';
        btn.style.background = '#8B0000';
      });
    });
  });

  document.querySelectorAll('.reject-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const username  = btn.getAttribute('data-username');
      const docType   = btn.getAttribute('data-doc');
      const requestId = btn.getAttribute('data-id');
      rejectRequest(username, docType, requestId);
    });
  });
}

function sendApprovalEmail(residentEmail, documentType, purpose, date, time) {
  emailjs.send("service_9m8vyrc", "template_tro0oll", {
    to_email: residentEmail,
    document_type: documentType,
    purpose: purpose,
    date: formatDate(date),
    time: formatTime12Hour(time)
  }, "Ndd7_r9gTrjDBG9-K")
  .then(() => {
    console.log("Email sent successfully!");
  })
  .catch((error) => {
    console.error("Error sending email:", error);
  });
}

function sendRejectionEmail(residentEmail, documentType, purpose) {
  emailjs.send("service_9m8vyrc", "template_rejection", {
    to_email: residentEmail,
    document_type: documentType,
    purpose: purpose
  }, "Ndd7_r9gTrjDBG9-K")
  .then(() => {
    console.log("Rejection email sent successfully!");
  })
  .catch((error) => {
    console.error("Error sending rejection email:", error);
  });
}

function showToast(message, type = 'success') {
  const existingOverlay = document.getElementById('toast-overlay');
  if (existingOverlay) existingOverlay.remove();

  const colors = {
    success: { bg: '#f0fdf4', border: '#86efac', text: '#16a34a', iconBg: '#dcfce7', icon: '✓' },
    error:   { bg: '#fff5f5', border: '#fca5a5', text: '#dc2626', iconBg: '#fee2e2', icon: '✕' },
    info:    { bg: '#eff6ff', border: '#93c5fd', text: '#1d4ed8', iconBg: '#dbeafe', icon: 'i' },
  };
  const c = colors[type] || colors.info;

  const overlay = document.createElement('div');
  overlay.id = 'toast-overlay';
  overlay.style.cssText = `
    position: fixed; inset: 0; z-index: 99999;
    background: rgba(0,0,0,0.45);
    display: flex; align-items: center; justify-content: center;
    animation: toastFadeIn 0.2s ease;
  `;

  overlay.innerHTML = `
    <div style="
      background: #fff; border-radius: 20px; padding: 36px 40px;
      max-width: 420px; width: 90%; text-align: center;
      box-shadow: 0 24px 60px rgba(0,0,0,0.2);
      animation: toastPopIn 0.25s cubic-bezier(0.34,1.56,0.64,1);
      border-top: 4px solid ${c.border};
    ">
      <div style="
        width: 60px; height: 60px; border-radius: 50%;
        background: ${c.iconBg}; color: ${c.text};
        font-size: 26px; font-weight: 700;
        display: flex; align-items: center; justify-content: center;
        margin: 0 auto 18px;
        border: 2px solid ${c.border};
      ">${c.icon}</div>
      <div style="font-size: 18px; font-weight: 700; color: #1a1a1a; margin-bottom: 8px;">
        ${type === 'success' ? 'Request Approved' : type === 'error' ? 'Request Rejected' : 'Notice'}
      </div>
      <div style="font-size: 14px; color: #555; line-height: 1.6; margin-bottom: 24px;">
        ${message}
      </div>
      <button onclick="document.getElementById('toast-overlay').remove()"
        style="
          padding: 11px 32px; border-radius: 10px; border: none;
          background: ${type === 'success' ? '#8B0000' : type === 'error' ? '#dc2626' : '#1d4ed8'};
          color: #fff; font-size: 14px; font-weight: 700; cursor: pointer;
          transition: opacity 0.15s;
        "
        onmouseover="this.style.opacity='0.85'"
        onmouseout="this.style.opacity='1'">
        OK
      </button>
    </div>
  `;

  const style = document.createElement('style');
  style.innerText = `
    @keyframes toastFadeIn { from { opacity:0; } to { opacity:1; } }
    @keyframes toastPopIn { from { opacity:0; transform:scale(0.85); } to { opacity:1; transform:scale(1); } }
  `;
  document.head.appendChild(style);
  document.body.appendChild(overlay);

  overlay.addEventListener('click', function(e) {
    if (e.target === overlay) overlay.remove();
  });

  setTimeout(() => { if (overlay.parentNode) overlay.remove(); }, 6000);
}

function approveRequest(username, documentType, date, time) {
  if (!date || !time) {
    showToast('This request has no pick-up date or time set by the resident. Cannot approve.', 'error');
    return;
  }

  fetch(`${API_BASE}/api/approve-request`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username, documentType, date, time })
  })
  .then(res => res.json())
  .then(data => {
    if (data.success) {
      const residentEmail = data.email;
      const purpose = data.purpose || 'General Requirement';
      const finalDate = data.date || date;
      const finalTime = data.time || time;
      sendApprovalEmail(residentEmail, documentType, purpose, finalDate, finalTime);
      showToast(`Approved — notification sent to ${residentEmail}`, 'success');
      showDocRequests();
    } else {
      showToast(data.message || 'Failed to approve request.', 'error');
    }
  })
  .catch(() => showToast('Server error while approving request.', 'error'));
}

function rejectRequest(username, documentType, requestId) {
  showToast('Are you sure you want to reject this request?', 'info');

  setTimeout(() => {
    const overlay = document.getElementById('toast-overlay');
    if (!overlay) return;

    const btnRow = document.createElement('div');
    btnRow.style.cssText = 'display:flex; gap:10px; justify-content:center; margin-top:8px;';
    btnRow.innerHTML = `
      <button id="confirm-reject-btn"
        style="padding:11px 28px; border-radius:10px; border:none; background:#dc2626; color:#fff; font-size:14px; font-weight:700; cursor:pointer;">
        Yes, Reject
      </button>
      <button onclick="document.getElementById('toast-overlay').remove()"
        style="padding:11px 28px; border-radius:10px; border:1.5px solid #e5e7eb; background:#fff; color:#374151; font-size:14px; font-weight:700; cursor:pointer;">
        Cancel
      </button>
    `;

    const okBtn = overlay.querySelector('button');
    if (okBtn) okBtn.style.display = 'none';
    overlay.querySelector('div > div').appendChild(btnRow);

    document.getElementById('confirm-reject-btn').addEventListener('click', () => {
      overlay.remove();

      fetch(`${API_BASE}/api/reject-request`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, documentType, requestId })
      })
      .then(res => res.json())
      .then(data => {
        if (data.success) {
          showToast(`Rejected — notification sent to ${data.email}`, 'error');
          showDocRequests();
        } else {
          showToast(data.message || 'Failed to reject request.', 'error');
        }
      })
      .catch(() => showToast('Server error while rejecting request.', 'error'));
    });
  }, 50);
}

/* =======================================================================
   BHW DASHBOARD (formerly DSWD)
   - Statistics / Age Statistics / Barangay Statistics pages
   - Every group dropdown shows 10 residents per page (First/Prev/Next/Last)
   - Clicking a resident opens a full details page
   - Back returns to the same open group, page, search and scroll position
======================================================================= */

const DSWD_PAGE_SIZE = 10;

// Resident list for each expandable row, keyed like "age-60" or "bgy-Trapiche-1"
window.dswdGroupData = window.dswdGroupData || {};

// Remembers what the BHW had open so Back can restore it
window.dswdUI = { mode: 'all', open: {}, page: {}, search: {}, range: null, scroll: 0, inDetail: false };

function dswdEsc(s) {
  return String(s === undefined || s === null ? '' : s)
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}
function dswdAge(r) { return Number(r.age) || 0; }
function dswdYes(v) { return v === true || v === 'Yes' || v === 'yes' || v === 'true' || v === 't'; }
function dswdIsSenior(r) { return dswdYes(r.senior) || dswdAge(r) >= 60; }
// Phone-uploaded residents share the same username, so identify residents by id when available
function dswdKey(r) {
  return (r.id !== undefined && r.id !== null)
    ? 'id_' + r.id
    : 'u_' + encodeURIComponent(r.username || '').replace(/'/g, '%27');
}

// Build a CSV string from an array of resident objects
function residentsToCSV(residents) {
  const headers = ['Name','Age','Gender','Barangay','Civil Status','PWD','Senior','Contact','Email','Address'];
  const escapeCell = (val) => `"${String(val ?? '').replace(/"/g, '""')}"`;
  const lines = [headers.map(escapeCell).join(',')];
  residents.forEach(r => {
    lines.push([
      r.name, r.age, r.gender, r.barangay, r.status || '',
      dswdYes(r.pwd) ? 'Yes' : 'No',
      dswdIsSenior(r) ? 'Yes' : 'No',
      r.contact || '', r.email || '', r.address || ''
    ].map(escapeCell).join(','));
  });
  return lines.join('\n');
}

// Trigger a client-side CSV download for a given resident list
function downloadResidentsCSV(key, filename) {
  const residents = window.dswdGroupData[key] || [];
  if (residents.length === 0) {
    showToast('There are no residents in this selection to download.', 'error');
    return;
  }
  const csv = residentsToCSV(residents);
  const blob = new Blob(["\uFEFF" + csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename.endsWith('.csv') ? filename : `${filename}.csv`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

// Open / close a dropdown row and remember it
function toggleDSWDGroupRow(key) {
  const detail = document.getElementById(`dswd-detail-${key}`);
  const chevron = document.getElementById(`dswd-chevron-${key}`);
  if (!detail) return;
  const isOpen = detail.style.display !== 'none';
  detail.style.display = isOpen ? 'none' : 'block';
  if (chevron) chevron.style.transform = isOpen ? 'rotate(0deg)' : 'rotate(90deg)';
  window.dswdUI.open[key] = !isOpen;
}

// One resident row inside a dropdown
function dswdResidentCard(r) {
  return `
    <div onclick="openResidentDetail('${dswdKey(r)}')"
      style="display:flex; align-items:center; justify-content:space-between; padding:11px 16px; border-radius:9px; border:0.5px solid #eee; cursor:pointer; background:#fff;"
      onmouseover="this.style.background='#f4f7ff'" onmouseout="this.style.background='#fff'">
      <div>
        <div style="font-size:15px; font-weight:600; color:#1a1a1a;">${dswdEsc(r.name || r.username)}</div>
        <div style="font-size:13px; color:#888; margin-top:2px;">Age ${dswdEsc(r.age ?? '—')} &nbsp;·&nbsp; ${dswdEsc(r.gender || '—')} &nbsp;·&nbsp; ${dswdEsc(r.barangay || '—')}</div>
      </div>
      <div style="display:flex; gap:8px; align-items:center;">
        ${dswdYes(r.pwd) ? `<span style="background:#FAECE7; color:#712B13; font-size:12px; font-weight:600; padding:4px 12px; border-radius:99px;">PWD</span>` : ''}
        ${dswdIsSenior(r) ? `<span style="background:#EAF3DE; color:#27500A; font-size:12px; font-weight:600; padding:4px 12px; border-radius:99px;">Senior</span>` : ''}
        <span style="font-size:13px; color:#bbb;">View →</span>
      </div>
    </div>
  `;
}

// HTML for one page of a group's resident list (search applies to ALL residents in the group)
function dswdGroupListHTML(key) {
  const all = window.dswdGroupData[key] || [];
  const kw = (window.dswdUI.search[key] || '').toLowerCase().trim();
  const data = kw
    ? all.filter(r => ((r.name || '') + ' ' + (r.address || '')).toLowerCase().includes(kw))
    : all;

  if (data.length === 0) {
    return `<p style="color:#aaa; font-size:14px; text-align:center; padding:18px 0;">${kw ? 'No residents match your search.' : 'No residents found.'}</p>`;
  }

  const total = data.length;
  const pages = Math.max(1, Math.ceil(total / DSWD_PAGE_SIZE));
  let page = Math.min(Math.max(1, window.dswdUI.page[key] || 1), pages);
  window.dswdUI.page[key] = page;

  const start = (page - 1) * DSWD_PAGE_SIZE;
  const slice = data.slice(start, start + DSWD_PAGE_SIZE);

  const btn = (label, target, disabled) => `
    <button ${disabled ? 'disabled' : ''} onclick="event.stopPropagation(); gotoDSWDPage('${key}', ${target})"
      style="padding:7px 14px; border-radius:8px; border:1px solid #ddd; background:${disabled ? '#f3f4f6' : '#fff'}; color:${disabled ? '#bbb' : '#374151'}; font-size:13px; font-weight:600; cursor:${disabled ? 'default' : 'pointer'};">
      ${label}
    </button>`;

  return `
    <div style="display:flex; flex-direction:column; gap:6px;">
      ${slice.map(dswdResidentCard).join('')}
    </div>
    <div style="display:flex; align-items:center; justify-content:space-between; gap:10px; flex-wrap:wrap; margin-top:14px;">
      <span style="font-size:13px; color:#888;">Showing ${(start + 1).toLocaleString()}–${(start + slice.length).toLocaleString()} of ${total.toLocaleString()}</span>
      <div style="display:flex; align-items:center; gap:6px;">
        ${btn('« First', 1, page === 1)}
        ${btn('‹ Prev', page - 1, page === 1)}
        <span style="font-size:13px; color:#555; padding:0 8px;">Page ${page} of ${pages}</span>
        ${btn('Next ›', page + 1, page === pages)}
        ${btn('Last »', pages, page === pages)}
      </div>
    </div>
  `;
}

function refreshDSWDGroupList(key) {
  const el = document.getElementById(`dswd-list-${key}`);
  if (el) el.innerHTML = dswdGroupListHTML(key);
}

function gotoDSWDPage(key, page) {
  window.dswdUI.page[key] = page;
  refreshDSWDGroupList(key);
}

function filterDSWDGroupResidents(input, key) {
  window.dswdUI.search[key] = input.value;
  window.dswdUI.page[key] = 1;
  refreshDSWDGroupList(key);
}

// Compute a resident's exact age in months (supports infants from 1 month old).
function computeAgeInMonths(resident) {
  if (resident && resident.dob) {
    const cleanDob = String(resident.dob).split('T')[0];
    const dob = new Date(cleanDob + 'T00:00:00');
    if (!isNaN(dob.getTime())) {
      const now = new Date();
      let months = (now.getFullYear() - dob.getFullYear()) * 12 + (now.getMonth() - dob.getMonth());
      if (now.getDate() < dob.getDate()) months--;
      return Math.max(0, months);
    }
  }
  return Math.max(0, (resident && resident.age ? resident.age : 0) * 12);
}

// Filter by a custom age range (months or years)
function applyDSWDAgeRangeFilter(keepPage) {
  const minInput = document.getElementById('age-range-min-value');
  const maxInput = document.getElementById('age-range-max-value');
  const minUnit = document.getElementById('age-range-min-unit')?.value || 'years';
  const maxUnit = document.getElementById('age-range-max-unit')?.value || 'years';

  window.dswdUI.range = {
    minV: minInput ? minInput.value : '0', minU: minUnit,
    maxV: maxInput ? maxInput.value : '120', maxU: maxUnit
  };

  const minRaw = parseFloat(minInput?.value);
  const maxRaw = parseFloat(maxInput?.value);
  const minMonths = isNaN(minRaw) ? 0 : (minUnit === 'months' ? minRaw : minRaw * 12);
  // "To 22 years" includes everyone who is 22 (up to 22 years 11 months); months are counted exactly
  const maxMonths = isNaN(maxRaw) || maxRaw <= 0 ? Infinity : (maxUnit === 'months' ? maxRaw : (maxRaw + 1) * 12 - 1);

  const bothYears = minUnit === 'years' && maxUnit === 'years';
  const minYears = isNaN(minRaw) ? 0 : minRaw;
  const maxYears = isNaN(maxRaw) || maxRaw <= 0 ? Infinity : maxRaw;

  const filtered = dswdResidents.filter(r => {
    // Years on both ends: use the same age number that is shown in the resident list
    if (bothYears && r.age !== undefined && r.age !== null && r.age !== '') {
      const a = dswdAge(r);
      return a >= minYears && a <= maxYears;
    }
    // Months involved (or no saved age): use the exact date of birth
    const months = computeAgeInMonths(r);
    return months >= minMonths && months <= maxMonths;
  });

  window.dswdGroupData['age-custom'] = filtered;
  if (!keepPage) {
    window.dswdUI.page['age-custom'] = 1;
    window.dswdUI.search['age-custom'] = '';
    const searchBox = document.getElementById('age-range-search');
    if (searchBox) searchBox.value = '';
  }

  const male = filtered.filter(r => r.gender === 'Male').length;
  const female = filtered.filter(r => r.gender === 'Female').length;

  const summary = document.getElementById('age-range-summary');
  if (summary) {
    summary.innerHTML = `
      <span style="font-size:18px; font-weight:700; color:#1a1a1a;">${filtered.length.toLocaleString()}</span>
      <span style="font-size:14px; color:#888;">resident${filtered.length !== 1 ? 's' : ''} in this range</span>
      <span style="margin-left:14px; background:#E6F1FB; color:#0C447C; font-size:13px; font-weight:600; padding:4px 12px; border-radius:99px;">${male} male</span>
      <span style="background:#FBEAF0; color:#72243E; font-size:13px; font-weight:600; padding:4px 12px; border-radius:99px;">${female} female</span>
    `;
  }

  const results = document.getElementById('age-range-results');
  if (results) results.style.display = 'block';
  refreshDSWDGroupList('age-custom');
}

// Clean "number on top, percentage underneath" stat block
function dswdStatBlock(count, pctVal, color, minWidth = 70) {
  return `
    <div style="display:flex; flex-direction:column; align-items:flex-start; min-width:${minWidth}px;">
      <span style="font-size:21px; font-weight:700; color:${color}; line-height:1.1;">${count}</span>
      <span style="font-size:13px; color:#a4a4a4; font-weight:600; margin-top:2px;">${pctVal}%</span>
    </div>
  `;
}

// One expandable row (used for age groups and Trapiche zones)
function dswdGroupRowHTML(o) {
  const ui = window.dswdUI;
  const isOpen = !!ui.open[o.key];
  const searchVal = dswdEsc(ui.search[o.key] || '');
  return `
    <div style="border-bottom:0.5px solid #f0f0f0;">
      <div id="dswd-row-${o.key}" onclick="toggleDSWDGroupRow('${o.key}')"
        style="display:flex; align-items:center; padding:18px 22px; cursor:pointer; gap:22px; background:#fff; transition:background 0.15s;"
        onmouseover="this.style.background='#fafcff'" onmouseout="this.style.background='#fff'">
        <span id="dswd-chevron-${o.key}" style="display:inline-block; width:13px; font-size:13px; color:#bbb; transition:transform 0.2s; transform:rotate(${isOpen ? 90 : 0}deg);">▶</span>
        <div style="min-width:${o.labelWidth}px;">
          <span style="font-size:18px; font-weight:600; color:#1a1a1a;">${o.label}</span>
        </div>
        ${dswdStatBlock(o.total, o.totalPct, '#c0392b', o.statWidth)}
        ${dswdStatBlock(o.male, o.mPct, '#378ADD', o.statWidth)}
        ${dswdStatBlock(o.female, o.fPct, '#D4537E', o.statWidth)}
        ${o.extra || ''}
      </div>
      <div id="dswd-detail-${o.key}" style="display:${isOpen ? 'block' : 'none'}; background:#fafbfc; border-top:1px solid #eee; padding:16px 22px 20px;">
        <div style="display:flex; align-items:center; gap:10px; margin-bottom:12px; flex-wrap:wrap;">
          <input type="text" placeholder="${dswdEsc(o.placeholder)}" value="${searchVal}"
            oninput="filterDSWDGroupResidents(this, '${o.key}')"
            onclick="event.stopPropagation()"
            style="flex:1; min-width:220px; padding:9px 14px; border-radius:8px; border:1px solid #ddd; font-size:14px; margin:0;">
          <button onclick="event.stopPropagation(); downloadResidentsCSV('${o.key}', '${o.filename}')"
            style="padding:9px 18px; background:#8B0000; color:#fff; border:none; border-radius:8px; font-size:14px; font-weight:700; cursor:pointer; white-space:nowrap;">
            ⬇ Download CSV
          </button>
        </div>
        <div id="dswd-list-${o.key}">${dswdGroupListHTML(o.key)}</div>
      </div>
    </div>
  `;
}

// Load residents from the server, then draw the page.
// mode: 'all' (Statistics), 'age' (Age Statistics), 'bgy' (Barangay Statistics)
function showDSWDStats(mode) {
  window.dswdUI = { mode: (typeof mode === 'string') ? mode : 'all', open: {}, page: {}, search: {}, range: null, scroll: 0, inDetail: false };
  fetch(`${API_BASE}/api/residents`)
    .then(res => res.json())
    .then(data => {
      dswdResidents = data.residents || [];
      renderDSWDStats(dswdResidents, window.dswdUI.mode);
    })
    .catch(err => alert('Failed to load resident data from server.'));
}
function showAgeStats() { showDSWDStats('age'); }
function showBarangayStats() { showDSWDStats('bgy'); }

function renderDSWDStats(residents, mode) {
  mode = mode || window.dswdUI.mode || 'all';
  window.dswdUI.mode = mode;

  const body = document.getElementById('dashboard-body');
  const trapiches = ['Trapiche 1', 'Trapiche 2', 'Trapiche 3', 'Trapiche 4'];
  const n = residents.length;
  const pct = (a, b) => b ? Math.round(a / b * 100) : 0;

  let totalMale = 0, totalFemale = 0, totalPWD = 0, totalSenior = 0;
  const ageGroups = [
    { k: '0_10',  label: '0–10',  test: a => a <= 10 },
    { k: '11_14', label: '11–14', test: a => a >= 11 && a <= 14 },
    { k: '15_30', label: '15–30', test: a => a >= 15 && a <= 30 },
    { k: '31_59', label: '31–59', test: a => a >= 31 && a <= 59 },
    { k: '60',    label: '60+',   test: a => a >= 60 }
  ];
  ageGroups.forEach(g => { g.residents = []; g.male = 0; g.female = 0; });

  const bgy = {};
  trapiches.forEach(t => { bgy[t] = { male: 0, female: 0, total: 0, pwd: 0, senior: 0, residents: [] }; });

  residents.forEach(r => {
    const isMale = r.gender === 'Male';
    const a = dswdAge(r);
    if (isMale) totalMale++; else totalFemale++;
    if (dswdYes(r.pwd)) totalPWD++;
    if (dswdIsSenior(r)) totalSenior++;

    if (bgy[r.barangay]) {
      const b = bgy[r.barangay];
      b[isMale ? 'male' : 'female']++;
      b.total++;
      if (dswdYes(r.pwd)) b.pwd++;
      if (dswdIsSenior(r)) b.senior++;
      b.residents.push(r);
    }

    const g = ageGroups.find(x => x.test(a)) || ageGroups[0];
    g.residents.push(r);
    g[isMale ? 'male' : 'female']++;
  });

  ageGroups.forEach(g => { window.dswdGroupData[`age-${g.k}`] = g.residents; });
  trapiches.forEach(t => { window.dswdGroupData[`bgy-${t.replace(/\s+/g, '-')}`] = bgy[t].residents; });

  const metricCard = (label, value, sub, color, labelColor) => `
    <div style="background:#fff; border-radius:10px; padding:18px 20px; border:0.5px solid #e0e0e0;">
      <div style="font-size:15px; color:${labelColor || '#888'}; margin-bottom:8px;">${label}</div>
      <div style="font-size:34px; font-weight:700; color:${color};">${value}</div>
      <div style="font-size:14px; color:${labelColor || '#aaa'}; margin-top:6px; ${labelColor ? 'opacity:0.8;' : ''}">${sub}</div>
    </div>`;

  const metricCards = `
    <div style="display:grid; grid-template-columns:repeat(5,minmax(0,1fr)); gap:12px; margin-bottom:24px;">
      ${metricCard('Total residents', n.toLocaleString(), 'all barangays', '#1a1a1a')}
      ${metricCard('Male', totalMale.toLocaleString(), pct(totalMale, n) + '% of total', '#185FA5', '#185FA5')}
      ${metricCard('Female', totalFemale.toLocaleString(), pct(totalFemale, n) + '% of total', '#993556', '#993556')}
      ${metricCard('Senior (60+)', totalSenior.toLocaleString(), pct(totalSenior, n) + '% of total', '#3B6D11', '#3B6D11')}
      ${metricCard('PWD', totalPWD.toLocaleString(), pct(totalPWD, n) + '% of total', '#712B13', '#712B13')}
    </div>
  `;

  const legend = `
    <div style="display:flex; gap:20px; padding:14px 22px; border-bottom:0.5px solid #f0f0f0;">
      <span style="display:flex; align-items:center; gap:6px; font-size:15px; color:#666;">
        <span style="width:12px; height:12px; border-radius:2px; background:#378ADD; display:inline-block;"></span> Male
      </span>
      <span style="display:flex; align-items:center; gap:6px; font-size:15px; color:#666;">
        <span style="width:12px; height:12px; border-radius:2px; background:#D4537E; display:inline-block;"></span> Female
      </span>
      <span style="margin-left:auto; font-size:13px; color:#bbb;">Click a row to expand residents &amp; download</span>
    </div>
  `;

  const headCell = (t, w, center) => `<div style="min-width:${w}px; font-size:14px; font-weight:600; color:#888; ${center ? 'text-align:center;' : ''}">${t}</div>`;

  // ---- Age group section ----
  const ageRows = ageGroups.map(g => {
    const rt = g.male + g.female;
    const mPct = pct(g.male, rt);
    return dswdGroupRowHTML({
      key: `age-${g.k}`, label: g.label, labelWidth: 110, statWidth: 90,
      total: rt, totalPct: pct(rt, n), male: g.male, mPct, female: g.female, fPct: rt ? 100 - mPct : 0,
      placeholder: 'Search residents in this age group...',
      filename: `Residents_Age_${g.label.replace(/[^0-9A-Za-z]+/g, '_')}`
    });
  }).join('');

  const ageSection = `
    <div style="background:#fff; border-radius:12px; border:0.5px solid #e0e0e0; overflow:hidden; margin-bottom:24px;">
      <div style="display:flex; align-items:center; justify-content:space-between; padding:18px 22px; border-bottom:0.5px solid #e0e0e0;">
        <span style="font-size:18px; font-weight:600; color:#1a1a1a;">Age group breakdown</span>
        <span style="font-size:14px; color:#aaa;">5 groups</span>
      </div>
      ${legend}
      <div style="display:flex; align-items:center; padding:12px 22px; gap:22px; background:#f8f9fa; border-bottom:0.5px solid #eee;">
        <span style="width:13px;"></span>
        ${headCell('Age', 110)}${headCell('Total', 90)}${headCell('Male', 90)}${headCell('Female', 90)}
      </div>
      ${ageRows}
    </div>
  `;

  // ---- Age range filter section ----
  const rg = window.dswdUI.range || { minV: '0', minU: 'years', maxV: '120', maxU: 'years' };
  const unitOpts = (sel) => `
    <option value="months" ${sel === 'months' ? 'selected' : ''}>Months</option>
    <option value="years" ${sel === 'years' ? 'selected' : ''}>Years</option>`;
  const rangeSection = `
    <div style="background:#fff; border-radius:12px; border:0.5px solid #e0e0e0; overflow:hidden; margin-bottom:24px;">
      <div style="display:flex; align-items:center; justify-content:space-between; padding:18px 22px; border-bottom:0.5px solid #e0e0e0;">
        <span style="font-size:18px; font-weight:600; color:#1a1a1a;">Age range filter</span>
        <span style="font-size:14px; color:#aaa;">From 1 month old up to any age</span>
      </div>
      <div style="padding:18px 22px; display:flex; align-items:flex-end; gap:16px; flex-wrap:wrap; border-bottom:0.5px solid #f0f0f0; background:#fafbfc;">
        <div>
          <label style="display:block; font-size:12px; font-weight:600; color:#888; margin-bottom:6px;">From</label>
          <div style="display:flex; gap:6px;">
            <input type="number" id="age-range-min-value" min="0" step="1" value="${dswdEsc(rg.minV)}"
              style="width:80px; padding:9px 10px; border-radius:8px; border:1px solid #ddd; font-size:14px; margin:0;">
            <select id="age-range-min-unit" style="padding:9px 10px; border-radius:8px; border:1px solid #ddd; font-size:14px;">${unitOpts(rg.minU)}</select>
          </div>
        </div>
        <div>
          <label style="display:block; font-size:12px; font-weight:600; color:#888; margin-bottom:6px;">To</label>
          <div style="display:flex; gap:6px;">
            <input type="number" id="age-range-max-value" min="0" step="1" value="${dswdEsc(rg.maxV)}"
              style="width:80px; padding:9px 10px; border-radius:8px; border:1px solid #ddd; font-size:14px; margin:0;">
            <select id="age-range-max-unit" style="padding:9px 10px; border-radius:8px; border:1px solid #ddd; font-size:14px;">${unitOpts(rg.maxU)}</select>
          </div>
        </div>
        <button onclick="applyDSWDAgeRangeFilter()"
          style="padding:11px 24px; background:#8B0000; color:#fff; border:none; border-radius:8px; font-size:14px; font-weight:700; cursor:pointer; white-space:nowrap;">
          Show Residents
        </button>
      </div>
      <div id="age-range-summary" style="padding:16px 22px; display:flex; align-items:center; gap:10px; flex-wrap:wrap; border-bottom:0.5px solid #f0f0f0;">
        <span style="font-size:14px; color:#aaa;">Set a range above and click "Show Residents".</span>
      </div>
      <div id="age-range-results" style="display:none; padding:16px 22px 20px;">
        <div style="display:flex; align-items:center; gap:10px; margin-bottom:12px; flex-wrap:wrap;">
          <input type="text" id="age-range-search" placeholder="Search residents in this range..."
            value="${dswdEsc(window.dswdUI.search['age-custom'] || '')}"
            oninput="filterDSWDGroupResidents(this, 'age-custom')"
            style="flex:1; min-width:220px; padding:9px 14px; border-radius:8px; border:1px solid #ddd; font-size:14px; margin:0;">
          <button onclick="downloadResidentsCSV('age-custom', 'Residents_Age_Range')"
            style="padding:9px 18px; background:#8B0000; color:#fff; border:none; border-radius:8px; font-size:14px; font-weight:700; cursor:pointer; white-space:nowrap;">
            ⬇ Download CSV
          </button>
        </div>
        <div id="dswd-list-age-custom"></div>
      </div>
    </div>
  `;

  // ---- Barangay section ----
  const badge = (v, bg, color) => `
    <div style="min-width:70px; text-align:center;">
      <span style="background:${bg}; color:${color}; font-size:15px; font-weight:700; padding:6px 16px; border-radius:99px;">${v}</span>
    </div>`;

  const bgyRows = trapiches.map(t => {
    const d = bgy[t];
    const mPct = pct(d.male, d.total);
    const safeId = t.replace(/\s+/g, '-');
    return dswdGroupRowHTML({
      key: `bgy-${safeId}`, label: t, labelWidth: 130, statWidth: 80,
      total: d.total, totalPct: pct(d.total, n), male: d.male, mPct, female: d.female, fPct: d.total ? 100 - mPct : 0,
      extra: badge(d.pwd, '#FAECE7', '#712B13') + badge(d.senior, '#EAF3DE', '#27500A'),
      placeholder: `Search residents in ${t}...`,
      filename: `Residents_${safeId}`
    });
  }).join('');

  const bgySection = `
    <div style="background:#fff; border-radius:12px; border:0.5px solid #e0e0e0; overflow:hidden; margin-bottom:24px;">
      <div style="display:flex; align-items:center; justify-content:space-between; padding:18px 22px; border-bottom:0.5px solid #e0e0e0;">
        <span style="font-size:18px; font-weight:600; color:#1a1a1a;">Barangay breakdown</span>
        <span style="font-size:14px; color:#aaa;">4 zones</span>
      </div>
      ${legend}
      <div style="display:flex; align-items:center; padding:12px 22px; gap:22px; background:#f8f9fa; border-bottom:0.5px solid #eee;">
        <span style="width:13px;"></span>
        ${headCell('Barangay', 130)}${headCell('Total', 80)}${headCell('Male', 80)}${headCell('Female', 80)}${headCell('PWD', 70, true)}${headCell('Senior', 70, true)}
      </div>
      ${bgyRows}
    </div>
  `;

  const sections =
    mode === 'age' ? ageSection + rangeSection :
    mode === 'bgy' ? bgySection :
    rangeSection + bgySection;

  body.innerHTML = `
    <div style="padding:24px; background:#f5f6fa; min-height:100%;">
      ${metricCards}
      ${sections}
    </div>
  `;

  // Re-apply a previously chosen custom age range (e.g. after coming back from a resident page)
  if (window.dswdUI.range && document.getElementById('age-range-min-value') && mode !== 'bgy') {
    applyDSWDAgeRangeFilter(true);
  }
}

/* ----------------------- Resident details page ----------------------- */

function openResidentDetail(key) {
  const r = dswdResidents.find(x => dswdKey(x) === key);
  if (!r) return;
  const body = document.getElementById('dashboard-body');
  if (!window.dswdUI.inDetail) {
    window.dswdUI.scroll = body.scrollTop;
    window.dswdUI.inDetail = true;
  }

  const val = v => (v === undefined || v === null || String(v).trim() === '') ? '—' : dswdEsc(v);
  const fullName = r.name || [r.first_name, r.middle_name, r.last_name].filter(Boolean).join(' ') || r.username || 'Resident';
  const isHead = r.is_head === true || r.is_head === 'Yes' || r.is_head === 'true' || r.is_head === 't';

  // children list (JSON array or plain text)
  let childrenHTML = '—';
  if (r.children_names) {
    let kids = null;
    try { kids = JSON.parse(r.children_names); } catch (e) { kids = null; }
    if (Array.isArray(kids) && kids.length) {
      childrenHTML = kids.map(c => typeof c === 'object'
        ? `${dswdEsc(c.name)} <span style="color:#999;">(Age ${dswdEsc(c.age ?? '—')}, ${dswdEsc(c.gender || '—')})</span>`
        : dswdEsc(c)).join('<br>');
    } else if (Array.isArray(kids)) {
      childrenHTML = '—';
    } else {
      childrenHTML = dswdEsc(r.children_names);
    }
  }

  const sections = [
    { title: '🧍 Personal Information', color: '#c0392b', rows: [
      ['Full Name', val(fullName)],
      ['First Name', val(r.first_name)],
      ['Middle Name', val(r.middle_name)],
      ['Last Name', val(r.last_name)],
      ['Sex', val(r.gender)],
      ['Civil Status', val(r.status)],
      ['Date of Birth', r.dob ? dswdEsc(formatDate(r.dob)) : '—'],
      ['Age', val(r.age)],
      ['Place of Birth', val(r.place_of_birth)],
      ['Religion', val(r.religion)],
      ['Blood Type', val(r.blood_type)],
      ['Voter Status', val(r.voter_status)],
      ['Barangay', val(r.barangay)],
      ['Address', val(r.address)]
    ]},
    { title: '👨‍👩‍👧‍👦 Family Information', color: '#1a3f6c', rows: [
      ['Family Code', val(r.family_code)],
      ['Head of Family', r.is_head === undefined || r.is_head === null ? '—' : (isHead ? 'Yes' : 'No')],
      ['Household Role', val(r.household_role)],
      ['Spouse', (r.spouse && r.spouse !== 'N/A') ? dswdEsc(r.spouse) : '—'],
      ['Sons', val(r.sons)],
      ['Daughters', val(r.daughters)],
      ['Family Members', val(r.family_members)],
      ['Children', childrenHTML]
    ]},
    { title: '📞 Contact & Emergency', color: '#e67e22', rows: [
      ['Contact No.', val(r.contact)],
      ['Email', val(r.email)],
      ['Emergency Contact', val(r.emergency_contact_name)],
      ['Emergency Number', val(r.emergency_contact_number)]
    ]},
    { title: '🎓 Education', color: '#2c5aa0', rows: [
      ['Educational Attainment', val(r.educational_attainment)],
      ['School Name', val(r.school_name)],
      ['Year Level', val(r.year_level)],
      ['Out-of-School Youth', val(r.out_of_school_youth)]
    ]},
    { title: '🩺 Health & Status', color: '#27ae60', rows: [
      ['PhilHealth Number', val(r.philhealth_number)],
      ['Medical History', val(r.medical_history)],
      ['Maintenance Medicine', val(r.maintenance_medicine)],
      ['PWD', dswdYes(r.pwd) ? 'Yes' : 'No'],
      ['Senior Citizen', dswdIsSenior(r) ? 'Yes' : 'No']
    ]}
  ];

  // Any other saved information (PhilHealth, etc.) is shown automatically
  const shown = new Set(['id','username','password','name','first_name','middle_name','last_name','gender','status','dob','age',
    'place_of_birth','religion','blood_type','voter_status','barangay','address','family_code','is_head','household_role',
    'spouse','sons','daughters','family_members','children_names','contact','email','emergency_contact_name',
    'emergency_contact_number','educational_attainment','school_name','year_level','pwd','senior',
    'out_of_school_youth','philhealth_number','medical_history','maintenance_medicine','fingerprint_id','photo_path','has_photo']);
  const photoKeys = ['photo','photo_url','picture','profile_pic','image','avatar'];
  const extraRows = [];
  Object.keys(r).forEach(k => {
    if (shown.has(k) || photoKeys.includes(k)) return;
    let v = r[k];
    if (v === undefined || v === null || v === '') return;
    if (typeof v === 'object') v = JSON.stringify(v);
    if (typeof v === 'boolean') v = v ? 'Yes' : 'No';
    if (String(v).length > 300) return;
    if (/(_at|date)$/i.test(k) && /^\d{4}-\d{2}-\d{2}/.test(String(v))) v = formatDate(v);
    const label = k.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase()).replace(/Philhealth/i, 'PhilHealth').replace(/^Created At$/, 'Date Added');
    extraRows.push([label, dswdEsc(v)]);
  });
  if (extraRows.length) sections.push({ title: '📋 Other Details (PhilHealth & more)', color: '#6b7280', rows: extraRows });

  const sectionHTML = s => `
    <div style="background:#fff; border-radius:16px; border:1px solid #ebebeb; overflow:hidden; box-shadow:0 2px 8px rgba(0,0,0,0.04);">
      <div style="padding:12px 18px; border-bottom:1px solid #f0f0f0; background:#fafafa;">
        <div style="font-size:14px; font-weight:700; color:${s.color};">${s.title}</div>
      </div>
      <div style="padding:12px 18px; display:flex; flex-direction:column; gap:9px;">
        ${s.rows.map(row => `
          <div style="display:flex; justify-content:space-between; align-items:flex-start; gap:12px;">
            <span style="font-size:12px; color:#999; font-weight:500; text-transform:uppercase; letter-spacing:0.4px; min-width:130px; padding-top:1px;">${row[0]}</span>
            <span style="font-size:14px; color:#1a1a1a; font-weight:500; text-align:right; word-break:break-word;">${row[1]}</span>
          </div>`).join('')}
      </div>
    </div>`;

  // photo: loaded separately by id (photos are not in the list to keep it fast); initials until it arrives
  const initialAvatar = `<div style="width:84px; height:84px; border-radius:50%; background:#fff; color:#8B0000; display:flex; align-items:center; justify-content:center; font-size:34px; font-weight:700;">${dswdEsc(String(fullName).charAt(0).toUpperCase())}</div>`;
  const photoImg = src => `<img src="${dswdEsc(src)}" style="width:84px; height:84px; border-radius:50%; object-fit:cover; border:3px solid #fff;">`;
  window.dswdPhotoCache = window.dswdPhotoCache || {};
  const cachedPhoto = (r.id !== undefined && r.id !== null) ? window.dswdPhotoCache[r.id] : null;
  const avatar = `<div id="dswd-detail-avatar">${cachedPhoto ? photoImg(cachedPhoto) : initialAvatar}</div>`;

  // other members of the same family
  let familyHTML = '';
  if (r.family_code) {
    const mates = dswdResidents.filter(x => x.family_code && x.family_code === r.family_code && dswdKey(x) !== key);
    if (mates.length) {
      familyHTML = `
        <div style="background:#fff; border-radius:16px; border:1px solid #ebebeb; overflow:hidden; box-shadow:0 2px 8px rgba(0,0,0,0.04); margin-top:14px;">
          <div style="padding:12px 18px; border-bottom:1px solid #f0f0f0; background:#fafafa;">
            <div style="font-size:14px; font-weight:700; color:#1a3f6c;">👪 Other Family Members (${mates.length})</div>
          </div>
          <div style="padding:14px 18px; display:flex; flex-direction:column; gap:6px;">
            ${mates.map(m => `
              <div onclick="openResidentDetail('${dswdKey(m)}')"
                style="display:flex; align-items:center; justify-content:space-between; padding:10px 14px; border-radius:9px; border:0.5px solid #eee; cursor:pointer; background:#fff;"
                onmouseover="this.style.background='#f4f7ff'" onmouseout="this.style.background='#fff'">
                <div>
                  <div style="font-size:14px; font-weight:600; color:#1a1a1a;">${dswdEsc(m.name || m.username)}</div>
                  <div style="font-size:12px; color:#888; margin-top:2px;">${dswdEsc(m.household_role || '—')} &nbsp;·&nbsp; Age ${dswdEsc(m.age ?? '—')} &nbsp;·&nbsp; ${dswdEsc(m.gender || '—')}</div>
                </div>
                <span style="font-size:13px; color:#bbb;">View →</span>
              </div>`).join('')}
          </div>
        </div>`;
    }
  }

  body.innerHTML = `
    <div style="padding:24px; background:#f5f6fa; min-height:100%; box-sizing:border-box;">
      <button onclick="backToDSWDList()"
        style="margin-bottom:16px; padding:9px 18px; background:#1a3f6c; color:#fff; border:none; border-radius:8px; font-size:13px; font-weight:600; cursor:pointer;">
        ← Back
      </button>

      <div style="background:#8B0000; border-radius:16px; padding:22px 26px; margin-bottom:16px; display:flex; align-items:center; gap:20px; box-shadow:0 8px 32px rgba(139,0,0,0.2);">
        ${avatar}
        <div style="color:#fff; min-width:0;">
          <div style="font-size:24px; font-weight:700; word-break:break-word;">${dswdEsc(fullName)}</div>
          <div style="font-size:13px; color:rgba(255,255,255,0.8); margin-top:4px;">
            ${dswdEsc(r.barangay || '—')} &nbsp;·&nbsp; Age ${dswdEsc(r.age ?? '—')} &nbsp;·&nbsp; ${dswdEsc(r.gender || '—')}
          </div>
          <div style="margin-top:10px; display:flex; gap:8px;">
            ${dswdYes(r.pwd) ? `<span style="background:#FAECE7; color:#712B13; font-size:12px; font-weight:600; padding:4px 12px; border-radius:99px;">PWD</span>` : ''}
            ${dswdIsSenior(r) ? `<span style="background:#EAF3DE; color:#27500A; font-size:12px; font-weight:600; padding:4px 12px; border-radius:99px;">Senior</span>` : ''}
          </div>
        </div>
      </div>

      <div style="display:grid; grid-template-columns:repeat(auto-fit,minmax(340px,1fr)); gap:14px; align-items:start;">
        ${sections.map(sectionHTML).join('')}
      </div>
      ${familyHTML}
    </div>
  `;
  body.scrollTop = 0;

  if (!cachedPhoto && r.has_photo && r.id !== undefined && r.id !== null) {
    fetch(`${API_BASE}/api/resident-photo/${r.id}`)
      .then(res => res.json())
      .then(d => {
        if (d.photo && /^(data:image|https?:)/.test(d.photo)) {
          window.dswdPhotoCache[r.id] = d.photo;
          const el = document.getElementById('dswd-detail-avatar');
          if (el) el.innerHTML = photoImg(d.photo);
        }
      })
      .catch(() => {});
  }
}

// Back from a resident page: same open group, same page, same scroll position
function backToDSWDList() {
  window.dswdUI.inDetail = false;
  renderDSWDStats(dswdResidents, window.dswdUI.mode);
  const body = document.getElementById('dashboard-body');
  if (body) body.scrollTop = window.dswdUI.scroll || 0;
}

function generateRandomPassword(length = 10){
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  let pw = '';
  for(let i=0;i<length;i++){
    pw += chars.charAt(Math.floor(Math.random()*chars.length));
  }
  return pw;
}

// FIX #3: callback changed from handleGoogleLogin → handleCredentialResponse
window.onload = function () {
  if (document.getElementById('google-signin-btn')) {
    google.accounts.id.initialize({
      client_id: '306495383550-a78829rjufomiidmq5h79677uemjoj4g.apps.googleusercontent.com',
      callback: handleCredentialResponse  // ← FIXED (was handleGoogleLogin)
    });
    google.accounts.id.renderButton(
      document.getElementById('google-signin-btn'),
      { theme: 'outline', size: 'large' }
    );
  }
};

function handleCredentialResponse(response) {
  fetch(`${API_BASE}/api/google-login`, {
    method: 'POST',
    headers: { 'Content-Type':'application/json' },
    body: JSON.stringify({ credential: response.credential })
  })
  .then(res => res.json())
  .then(data => {
    if (!data.success) {
      const errBox = document.getElementById('login-error');
      if (errBox) { errBox.innerText = data.message || 'Google login failed'; errBox.style.display = 'block'; }
      return;
    }

    if (data.newUser) {
      const email = data.user.email;
      const name  = data.user.name;

      fetch(`${API_BASE}/api/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name, username: email, email,
          password: Math.random().toString(36).slice(-8) + 'Gg1!',
          gender: '', age: '', barangay: '', address: '',
          status: '', sons: 0, daughters: 0, pwd: 'No',
          contact: '', spouse: '', family_members: 0,
          senior: 'No', dob: null
        })
      })
      .then(r => r.json())
      .then(regData => {
        if (!regData.user && !regData.message) {
          throw new Error(regData.error || 'Registration failed');
        }
        return fetch(`${API_BASE}/api/google-login`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ credential: response.credential })
        }).then(r => r.json());
      })
      .then(loginData => {
        if (!loginData.success || loginData.newUser) {
          throw new Error('Could not complete Google sign-in after registration.');
        }
        loggedInUser = loginData.user;
        currentRole  = loginData.user.role || 'resident';
        localStorage.setItem("user", JSON.stringify(loggedInUser));
        fetchFullProfileThenRender();
      })
      .catch(err => {
        const errBox = document.getElementById('login-error');
        if (errBox) { errBox.innerText = 'Google sign-up failed: ' + (err.message || 'Server error'); errBox.style.display = 'block'; }
      });

    } else {
      loggedInUser = data.user;
      currentRole  = data.user.role || 'resident';
      localStorage.setItem("user", JSON.stringify(loggedInUser));

      if (currentRole === 'dswd')         openDSWDPage();
      else if (currentRole === 'manager') openManagerPage();
      else                                fetchFullProfileThenRender();
    }
  })
  .catch(err => {
    console.error("Google login error:", err);
    const errBox = document.getElementById('login-error');
    if (errBox) { errBox.innerText = 'Google login failed: ' + (err.message || 'Server error'); errBox.style.display = 'block'; }
  });
}

const savedUser = localStorage.getItem("user");
if (savedUser) {
  try {
    loggedInUser = JSON.parse(savedUser);
    currentRole = loggedInUser.role;
    if (!currentRole) {
      localStorage.removeItem("user");
      loggedInUser = null;
      throw new Error("No role found, clearing session.");
    }
    const lf = document.getElementById('login-footer');
    if (lf) lf.style.display = 'none';
    document.getElementById('login-page').style.display = 'none';
    if (currentRole === 'dswd') {
      openDSWDPage();
    } else if (currentRole === 'manager') {
      openManagerPage();
    } else if (currentRole === 'resident') {
      // Render immediately with cached data so nothing looks blank,
      // then silently refresh from server in background
      showDashboard();
      renderResidentWelcome();
      // Background sync — only update fields the server actually has
      fetch(`${API_BASE}/api/resident/${loggedInUser.username}`)
        .then(res => res.json())
        .then(data => {
          if (data.user) {
            Object.keys(data.user).forEach(key => {
              const serverVal = data.user[key];
              if (serverVal !== undefined && serverVal !== null && serverVal !== '' && serverVal !== 'undefined') {
                loggedInUser[key] = serverVal;
              }
            });
            localStorage.setItem("user", JSON.stringify(loggedInUser));
            renderResidentWelcome(); // re-render with any server-side updates
          }
        })
        .catch(err => console.warn('Background sync failed, showing cached profile:', err));
    }
  } catch(e) {
    localStorage.removeItem("user");
  }
}

function toggleAccountMenu() {
  const d = document.getElementById('account-dropdown');
  d.style.display = d.style.display === 'none' ? 'block' : 'none';
}

function toggleManagerAccountMenu() {
  const d = document.getElementById('manager-account-dropdown');
  d.style.display = d.style.display === 'none' ? 'block' : 'none';
}

function toggleDSWDAccountMenu() {
  const d = document.getElementById('dswd-account-dropdown');
  d.style.display = d.style.display === 'none' ? 'block' : 'none';
}

function updateHeaderUI() {
  if (!loggedInUser) return;
  const rawName = (loggedInUser.name && loggedInUser.name !== 'undefined' && loggedInUser.name.trim() !== '')
    ? loggedInUser.name
    : (loggedInUser.username || 'User');
  const name = bhwName(rawName);
  const pic = (loggedInUser.profile_pic && loggedInUser.profile_pic !== 'undefined')
    ? loggedInUser.profile_pic
    : `https://ui-avatars.com/api/?name=${encodeURIComponent(name)}&background=ffffff&color=c0392b&size=64`;

  ['header-name','manager-header-name','dswd-header-name'].forEach(id => {
    const el = document.getElementById(id);
    if (el) el.innerText = name;
  });

  ['header-profile-pic','manager-header-profile-pic','dswd-header-profile-pic'].forEach(id => {
    const el = document.getElementById(id);
    if (el) el.src = pic;
  });
}

function startHeaderClock() {
  function tick() {
    const now = new Date();
    const str = now.toLocaleDateString('en-US', { weekday:'short', month:'long', day:'numeric', year:'numeric' })
      + ' ' + now.toLocaleTimeString('en-US', { hour:'2-digit', minute:'2-digit', second:'2-digit' });
    ['header-datetime','manager-header-datetime','dswd-header-datetime'].forEach(id => {
      const el = document.getElementById(id);
      if (el) el.innerText = str;
    });
  }
  tick();
  setInterval(tick, 1000);
}

// Close dropdown when clicking outside
document.addEventListener('click', function(e) {
  ['account-dropdown','manager-account-dropdown','dswd-account-dropdown'].forEach(id => {
    const el = document.getElementById(id);
    if (el && !el.contains(e.target) && !e.target.closest('[onclick*="toggleAccountMenu"], [onclick*="toggleManagerAccountMenu"], [onclick*="toggleDSWDAccountMenu"]')) {
      el.style.display = 'none';
    }
  });
});

function confirmGooglePassword(){
  const user = window.tempGoogleUser;
  if (!user) return;
  const customPw = document.getElementById('custom-password').value.trim();
  if (customPw.length >= 6) {
    user.password = customPw;
  }
  residents.push(user);
  loggedInUser = user;
  currentRole = 'resident';
  window.tempGoogleUser = null;
  document.getElementById('password-modal').style.display = 'none';
  alert('Google account linked successfully.');
  showDashboard();
}
