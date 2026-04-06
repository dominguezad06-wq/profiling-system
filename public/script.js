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
  const cleanDate = dateStr.split('T')[0];
  const date = new Date(cleanDate + 'T00:00:00');
  return date.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  });
}

// Show Forms
function showResidentForm(){ document.getElementById('login-page').style.display='none'; document.getElementById('resident-form').style.display='flex'; }
function showLogin(){
  document.getElementById('login-page').style.display='flex';
  document.getElementById('resident-form').style.display='none';
  document.getElementById('forgot-page').style.display='none';
  const f = document.getElementById('site-footer');
  if(f) f.style.display='none';
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

  if (!name || !username || !password || !email) {
    alert("Please fill required fields.");
    return;
  }

  const data = {
    name, username, password, email, contact, gender, age,
    address, barangay, status, sons, daughters, pwd, spouse,
    family_members, senior: age >= 60 ? "Yes" : "No"
  };

  console.log("Register Data:", data);

  fetch(`${API_BASE}/api/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data)
  })
  .then(res => res.json())
  .then(response => {
    console.log("Server Response:", response);
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

  if (!username || !password) {
    alert('Please enter username and password.');
    return;
  }

  fetch(`${API_BASE}/api/login`, {
    method: 'POST',
    headers: { 'Content-Type':'application/json' },
    body: JSON.stringify({ username, password })
  })
  .then(res => res.json())
  .then(data => {
    if(data.message === 'Login successful'){
      loggedInUser = data.user;
      currentRole = data.user.role;
      localStorage.setItem("user", JSON.stringify(data.user));
      if (data.user.role === 'dswd') {
        openDSWDPage();
      } else if (data.user.role === 'manager') {
        openManagerPage();
      } else {
        showDashboard();
        renderResidentWelcome();
      }
    } else {
      const errBox = document.getElementById('login-error');
      errBox.innerText = data.error || 'Invalid username or password!';
      errBox.style.display = 'block';
    }
  })
  .catch(() => alert('Server connection error.'));
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

  body.innerHTML = `
    <div style="max-width:520px; margin:0 auto; padding:24px;">

      <div style="background:#fff; border-radius:16px; box-shadow:0 8px 24px rgba(0,0,0,0.1); overflow:hidden; border-top:5px solid #c0392b;">

        <div style="background:#8B0000; padding:32px; text-align:center;">
          <div style="position:relative; display:inline-block;">
            <img id="profile-pic-preview"
              src="${picUrl || 'https://ui-avatars.com/api/?name=' + encodeURIComponent(loggedInUser.name || 'User') + '&background=ffffff&color=c0392b&size=128'}"
              style="width:100px; height:100px; border-radius:50%; border:4px solid white; object-fit:cover;">
            <label for="profile-pic-input" style="position:absolute; bottom:0; right:0; background:#fff; border-radius:50%; width:30px; height:30px; display:flex; align-items:center; justify-content:center; cursor:pointer; box-shadow:0 2px 6px rgba(0,0,0,0.2);">
              <span style="font-size:14px;">✏️</span>
            </label>
            <input type="file" id="profile-pic-input" accept="image/*" style="display:none;" onchange="previewProfilePic(this)">
          </div>
          <div style="margin-top:12px; color:white;">
            <div style="font-size:18px; font-weight:600;">${loggedInUser.name || 'User'}</div>
            <div style="font-size:13px; opacity:0.85; margin-top:4px; text-transform:capitalize;">${currentRole} Account</div>
            <div style="font-size:12px; opacity:0.7; margin-top:2px;">@${loggedInUser.username}</div>
          </div>
        </div>

        <div style="padding:28px;">

          <div style="margin-bottom:18px;">
            <label style="font-size:13px; font-weight:600; color:#555; display:block; margin-bottom:6px;">Full Name</label>
            <input type="text" id="account-name" value="${loggedInUser.name || ''}"
              style="width:100%; padding:11px 14px; border-radius:8px; border:1px solid #ddd; font-size:14px; margin:0;">
          </div>

          <div style="margin-bottom:18px;">
            <label style="font-size:13px; font-weight:600; color:#555; display:block; margin-bottom:6px;">Username</label>
            <input type="text" value="${loggedInUser.username}" disabled
              style="width:100%; padding:11px 14px; border-radius:8px; border:1px solid #eee; font-size:14px; margin:0; background:#f8f8f8; color:#aaa;">
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
      if (data.profilePicUrl) loggedInUser.profile_pic = data.profilePicUrl;
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
}

function renderDashboardHeader(title){
  return `
    <div class="page-header">
      <img src="trapiche.png" alt="Barangay Logo" style="height:60px;">
      <div>
        <h2>Barangay Digital Profiling System</h2>
        <small>${title}</small><br>
        <small>Barangay Trapiche, Tanauan City, Batangas</small>
      </div>
    </div>
    <hr>
  `;
}

// Dashboard 
function showDashboard(){
  const f = document.getElementById('site-footer');
  if(f) f.style.display='block';
  const lf = document.getElementById('login-footer');
  if(lf) lf.style.display='none';
  console.log("Dashboard user:", loggedInUser);
  document.getElementById('login-page').style.display='none';
  document.getElementById('resident-form').style.display='none';
  document.getElementById('forgot-page').style.display='none';
  document.getElementById('dswd-page').style.display='none';
  document.getElementById('dashboard-page').style.display='block';

  const title =
    currentRole === 'resident' ? 'Resident Dashboard' :
    currentRole === 'manager' ? 'Manager Dashboard' :
    'DSWD Dashboard';

  document.getElementById('dashboard-title').innerText = title;
  document.getElementById('dashboard-content').innerHTML = `
    ${renderDashboardHeader(title)}
    <div id="dashboard-body"></div>
  `;

  if(currentRole === 'resident'){
    renderResidentWelcome();
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
  showDSWDStats();
  updateHeaderUI();
  startHeaderClock();
}

function showAgeStats() {
  const body = document.getElementById('dashboard-body');
  const n = dswdResidents.length;
  const pct = (a, b) => b ? Math.round(a / b * 100) : 0;

  const groups = {
    '0_10':  { label: '0–10',   residents: dswdResidents.filter(r => r.age <= 10) },
    '11_14': { label: '11–14',  residents: dswdResidents.filter(r => r.age >= 11 && r.age <= 14) },
    '15_30': { label: '15–30',  residents: dswdResidents.filter(r => r.age >= 15 && r.age <= 30) },
    '31_59': { label: '31–59',  residents: dswdResidents.filter(r => r.age >= 31 && r.age <= 59) },
    '60':    { label: '60+',    residents: dswdResidents.filter(r => r.age >= 60) },
  };

  const ageRows = Object.keys(groups).map(group => {
    const { label, residents } = groups[group];
    const count = residents.length;
    const totalPct = pct(count, n);
    const male = residents.filter(r => r.gender === 'Male').length;
    const female = residents.filter(r => r.gender === 'Female').length;
    const mPct = pct(male, count);
    const fPct = count ? (100 - mPct) : 0;

    return `
      <tr>
        <td colspan="5" style="padding:0; border-bottom:0.5px solid #f0f0f0;">
          <div onclick="selectAgeGroup('${group}')" id="row-age-${group}"
            style="display:flex; align-items:center; padding:18px 22px; cursor:pointer; gap:20px; background:#fff; transition:background 0.15s;"
            onmouseover="this.style.background='#f4f7ff'" onmouseout="document.getElementById('row-age-${group}').style.background = window._selectedAge === '${group}' ? '#EBF4FF' : '#fff'">
            <div style="min-width:100px;">
              <span style="font-size:17px; font-weight:500; color:#1a1a1a;">Age ${label}</span>
            </div>
            <div style="min-width:80px;">
              <span style="color:#378ADD; font-weight:500; font-size:20px;">${count}</span>
            </div>
            <div style="flex:1; display:flex; align-items:center; gap:10px;">
              <span style="background:#E6F1FB; color:#0C447C; font-size:13px; font-weight:500; padding:5px 14px; border-radius:99px; min-width:38px; text-align:center;">${male}</span>
              <div style="flex:1; height:7px; background:#eee; border-radius:99px; overflow:hidden;">
                <div style="width:${mPct}%; height:100%; background:#378ADD; border-radius:99px;"></div>
              </div>
              <span style="font-size:13px; color:#bbb; min-width:38px; text-align:right;">${mPct}%</span>
            </div>
            <div style="flex:1; display:flex; align-items:center; gap:10px;">
              <span style="background:#FBEAF0; color:#72243E; font-size:13px; font-weight:500; padding:5px 14px; border-radius:99px; min-width:38px; text-align:center;">${female}</span>
              <div style="flex:1; height:7px; background:#eee; border-radius:99px; overflow:hidden;">
                <div style="width:${fPct}%; height:100%; background:#D4537E; border-radius:99px;"></div>
              </div>
              <span style="font-size:13px; color:#bbb; min-width:38px; text-align:right;">${fPct}%</span>
            </div>
            <div style="display:flex; align-items:center; gap:10px; min-width:140px;">
              <div style="width:80px; height:7px; background:#eee; border-radius:99px; overflow:hidden;">
                <div style="width:${totalPct}%; height:100%; background:#c0392b; border-radius:99px;"></div>
              </div>
              <span style="font-size:13px; color:#bbb; min-width:38px;">${totalPct}%</span>
            </div>
          </div>
        </td>
      </tr>
    `;
  }).join('');

  body.innerHTML = `
    <div style="padding:24px; background:#f5f6fa; min-height:100%; display:flex; flex-direction:column; gap:20px;">
      <div style="display:grid; grid-template-columns:repeat(3,minmax(0,1fr)); gap:12px;">
        <div style="background:#fff; border-radius:10px; padding:18px 20px; border:0.5px solid #e0e0e0;">
          <div style="font-size:14px; color:#888; margin-bottom:8px;">Total residents</div>
          <div style="font-size:32px; font-weight:500; color:#1a1a1a;">${n}</div>
          <div style="font-size:13px; color:#aaa; margin-top:6px;">all age groups</div>
        </div>
        <div style="background:#fff; border-radius:10px; padding:18px 20px; border:0.5px solid #e0e0e0;">
          <div style="font-size:14px; color:#3B6D11; margin-bottom:8px;">Seniors (60+)</div>
          <div style="font-size:32px; font-weight:500; color:#3B6D11;">${groups['60'].residents.length}</div>
          <div style="font-size:13px; color:#3B6D11; margin-top:6px; opacity:0.8;">${pct(groups['60'].residents.length, n)}% of total</div>
        </div>
        <div style="background:#fff; border-radius:10px; padding:18px 20px; border:0.5px solid #e0e0e0;">
          <div style="font-size:14px; color:#185FA5; margin-bottom:8px;">Children (0–14)</div>
          <div style="font-size:32px; font-weight:500; color:#185FA5;">${groups['0_10'].residents.length + groups['11_14'].residents.length}</div>
          <div style="font-size:13px; color:#185FA5; margin-top:6px; opacity:0.8;">${pct(groups['0_10'].residents.length + groups['11_14'].residents.length, n)}% of total</div>
        </div>
      </div>
      <div style="display:flex; gap:20px; align-items:flex-start;">
        <div style="flex:1.2; background:#fff; border-radius:12px; border:0.5px solid #e0e0e0; overflow:hidden;">
          <div style="display:flex; align-items:center; justify-content:space-between; padding:18px 22px; border-bottom:0.5px solid #eee;">
            <span style="font-size:17px; font-weight:500; color:#1a1a1a;">Age group breakdown</span>
            <span style="font-size:13px; color:#aaa;">Select a row to view residents</span>
          </div>
          <div style="display:flex; gap:20px; padding:12px 22px; border-bottom:0.5px solid #f0f0f0;">
            <span style="display:flex; align-items:center; gap:6px; font-size:14px; color:#666;">
              <span style="width:12px; height:12px; border-radius:2px; background:#378ADD; display:inline-block;"></span> Male
            </span>
            <span style="display:flex; align-items:center; gap:6px; font-size:14px; color:#666;">
              <span style="width:12px; height:12px; border-radius:2px; background:#D4537E; display:inline-block;"></span> Female
            </span>
          </div>
          <div style="display:flex; align-items:center; padding:12px 22px; gap:20px; background:#f8f9fa; border-bottom:0.5px solid #eee;">
            <div style="min-width:100px; font-size:14px; font-weight:500; color:#888;">Age group</div>
            <div style="min-width:80px; font-size:14px; font-weight:500; color:#888;">Total</div>
            <div style="flex:1; font-size:14px; font-weight:500; color:#888;">Male</div>
            <div style="flex:1; font-size:14px; font-weight:500; color:#888;">Female</div>
            <div style="min-width:140px; font-size:14px; font-weight:500; color:#888;">% of total</div>
          </div>
          <table style="width:100%; border-collapse:collapse;">
            <tbody>${ageRows}</tbody>
          </table>
        </div>
        <div id="age-resident-panel" style="flex:1; background:#fff; border-radius:12px; border:0.5px solid #e0e0e0; overflow:hidden; min-height:300px;">
          <div style="padding:60px 20px; text-align:center; color:#bbb;">
            <div style="font-size:40px; margin-bottom:12px;">👆</div>
            <div style="font-size:15px; font-weight:500; color:#aaa;">Select an age group</div>
            <div style="font-size:13px; color:#ccc; margin-top:6px;">Residents Name</div>
          </div>
        </div>
      </div>
    </div>
  `;
  window._selectedAge = null;
}

function selectAgeGroup(group) {
  const groups = {
    '0_10':  { label: '0–10',  residents: dswdResidents.filter(r => r.age <= 10) },
    '11_14': { label: '11–14', residents: dswdResidents.filter(r => r.age >= 11 && r.age <= 14) },
    '15_30': { label: '15–30', residents: dswdResidents.filter(r => r.age >= 15 && r.age <= 30) },
    '31_59': { label: '31–59', residents: dswdResidents.filter(r => r.age >= 31 && r.age <= 59) },
    '60':    { label: '60+',   residents: dswdResidents.filter(r => r.age >= 60) },
  };
  Object.keys(groups).forEach(g => {
    const row = document.getElementById(`row-age-${g}`);
    if (row) row.style.background = '#fff';
  });
  const selectedRow = document.getElementById(`row-age-${group}`);
  if (selectedRow) selectedRow.style.background = '#EBF4FF';
  window._selectedAge = group;
  window._ageGroupData = groups[group].residents;

  const { label, residents } = groups[group];
  const panel = document.getElementById('age-resident-panel');
  panel.innerHTML = `
    <div style="display:flex; align-items:center; justify-content:space-between; padding:16px 22px; border-bottom:0.5px solid #eee; background:#f8f9fa;">
      <div>
        <span style="font-size:16px; font-weight:500; color:#1a1a1a;">Age ${label}</span>
        <span style="margin-left:10px; background:#E6F1FB; color:#0C447C; font-size:13px; font-weight:500; padding:4px 14px; border-radius:99px;">${residents.length} resident${residents.length !== 1 ? 's' : ''}</span>
      </div>
    </div>
    <div style="padding:12px 22px; border-bottom:0.5px solid #f0f0f0;">
      <input type="text" placeholder="Search residents..."
        oninput="filterAgeResidents(this)"
        style="padding:8px 14px; border-radius:8px; border:0.5px solid #ddd; font-size:14px; width:100%; margin:0;">
    </div>
    <div id="age-resident-list" style="padding:14px 22px; display:flex; flex-direction:column; gap:6px; max-height:500px; overflow-y:auto;">
      ${residents.length === 0
        ? `<p style="color:#aaa; font-size:14px; text-align:center; padding:30px 0;">No residents in this age group.</p>`
        : residents.map(r => ageResidentCard(r)).join('')}
    </div>
  `;
}

function ageResidentCard(r) {
  return `
    <div onclick="openDSWDResidentDetail('${r.username}')"
      style="display:flex; align-items:center; justify-content:space-between; padding:12px 16px; border-radius:10px; border:0.5px solid #eee; cursor:pointer; background:#fff;"
      onmouseover="this.style.background='#f4f7ff'" onmouseout="this.style.background='#fff'">
      <div>
        <div style="font-size:15px; font-weight:500; color:#1a1a1a;">${r.name}</div>
        <div style="font-size:13px; color:#888; margin-top:3px;">Age ${r.age} &nbsp;·&nbsp; ${r.gender} &nbsp;·&nbsp; ${r.barangay}</div>
      </div>
      <div style="display:flex; gap:8px; align-items:center;">
        ${r.pwd === 'Yes' ? `<span style="background:#FAECE7; color:#712B13; font-size:12px; font-weight:500; padding:4px 12px; border-radius:99px;">PWD</span>` : ''}
        ${r.age >= 60 ? `<span style="background:#EAF3DE; color:#27500A; font-size:12px; font-weight:500; padding:4px 12px; border-radius:99px;">Senior</span>` : ''}
        <span style="font-size:13px; color:#bbb;">View →</span>
      </div>
    </div>
  `;
}

function filterAgeResidents(input) {
  const keyword = input.value.toLowerCase();
  const filtered = (window._ageGroupData || []).filter(r => r.name.toLowerCase().includes(keyword));
  document.getElementById('age-resident-list').innerHTML = filtered.length === 0
    ? `<p style="color:#aaa; font-size:14px; text-align:center; padding:30px 0;">No residents match your search.</p>`
    : filtered.map(r => ageResidentCard(r)).join('');
}

function showBarangayStats() {
  const body = document.getElementById('dashboard-body');
  const trapiches = ['Trapiche 1', 'Trapiche 2', 'Trapiche 3', 'Trapiche 4'];
  const pct = (a, b) => b ? Math.round(a / b * 100) : 0;
  const n = dswdResidents.length;

  const bgyRows = trapiches.map(t => {
    const residents = dswdResidents.filter(r => r.barangay === t);
    const total = residents.length;
    const male = residents.filter(r => r.gender === 'Male').length;
    const female = residents.filter(r => r.gender === 'Female').length;
    const pwd = residents.filter(r => r.pwd === 'Yes').length;
    const senior = residents.filter(r => r.age >= 60).length;
    const mPct = pct(male, total);
    const fPct = total ? (100 - mPct) : 0;
    const safeId = t.replace(' ', '-');

    return `
      <tr>
        <td colspan="6" style="padding:0; border-bottom:0.5px solid #f0f0f0;">
          <div onclick="selectBarangayGroup('${t}')" id="row-bgy-${safeId}"
            style="display:flex; align-items:center; padding:18px 22px; cursor:pointer; gap:20px; background:#fff; transition:background 0.15s;"
            onmouseover="this.style.background='#f4f7ff'" onmouseout="document.getElementById('row-bgy-${safeId}').style.background = window._selectedBgy === '${t}' ? '#EBF4FF' : '#fff'">
            <div style="min-width:120px;">
              <span style="font-size:17px; font-weight:500; color:#1a1a1a;">${t}</span>
            </div>
            <div style="min-width:70px;">
              <span style="color:#378ADD; font-weight:500; font-size:20px;">${total}</span>
            </div>
            <div style="flex:1; display:flex; align-items:center; gap:10px;">
              <span style="background:#E6F1FB; color:#0C447C; font-size:13px; font-weight:500; padding:5px 14px; border-radius:99px; min-width:38px; text-align:center;">${male}</span>
              <div style="flex:1; height:7px; background:#eee; border-radius:99px; overflow:hidden;">
                <div style="width:${mPct}%; height:100%; background:#378ADD; border-radius:99px;"></div>
              </div>
              <span style="font-size:13px; color:#bbb; min-width:38px; text-align:right;">${mPct}%</span>
            </div>
            <div style="flex:1; display:flex; align-items:center; gap:10px;">
              <span style="background:#FBEAF0; color:#72243E; font-size:13px; font-weight:500; padding:5px 14px; border-radius:99px; min-width:38px; text-align:center;">${female}</span>
              <div style="flex:1; height:7px; background:#eee; border-radius:99px; overflow:hidden;">
                <div style="width:${fPct}%; height:100%; background:#D4537E; border-radius:99px;"></div>
              </div>
              <span style="font-size:13px; color:#bbb; min-width:38px; text-align:right;">${fPct}%</span>
            </div>
            <div style="min-width:80px; text-align:center;">
              <span style="background:#FAECE7; color:#712B13; font-size:13px; font-weight:500; padding:5px 16px; border-radius:99px;">${pwd}</span>
            </div>
            <div style="min-width:80px; text-align:center;">
              <span style="background:#EAF3DE; color:#27500A; font-size:13px; font-weight:500; padding:5px 16px; border-radius:99px;">${senior}</span>
            </div>
          </div>
        </td>
      </tr>
    `;
  }).join('');

  body.innerHTML = `
    <div style="padding:24px; background:#f5f6fa; min-height:100%; display:flex; flex-direction:column; gap:20px;">
      <div style="display:grid; grid-template-columns:repeat(4,minmax(0,1fr)); gap:12px;">
        ${trapiches.map(t => {
          const total = dswdResidents.filter(r => r.barangay === t).length;
          return `
            <div style="background:#fff; border-radius:10px; padding:18px 20px; border:0.5px solid #e0e0e0;">
              <div style="font-size:14px; color:#888; margin-bottom:8px;">${t}</div>
              <div style="font-size:32px; font-weight:500; color:#1a1a1a;">${total}</div>
              <div style="font-size:13px; color:#aaa; margin-top:6px;">${pct(total, n)}% of total</div>
            </div>
          `;
        }).join('')}
      </div>
      <div style="display:flex; gap:20px; align-items:flex-start;">
        <div style="flex:1.4; background:#fff; border-radius:12px; border:0.5px solid #e0e0e0; overflow:hidden;">
          <div style="display:flex; align-items:center; justify-content:space-between; padding:18px 22px; border-bottom:0.5px solid #eee;">
            <span style="font-size:17px; font-weight:500; color:#1a1a1a;">Barangay breakdown</span>
            <span style="font-size:13px; color:#aaa;">Select a row to view residents</span>
          </div>
          <div style="display:flex; gap:20px; padding:12px 22px; border-bottom:0.5px solid #f0f0f0;">
            <span style="display:flex; align-items:center; gap:6px; font-size:14px; color:#666;">
              <span style="width:12px; height:12px; border-radius:2px; background:#378ADD; display:inline-block;"></span> Male
            </span>
            <span style="display:flex; align-items:center; gap:6px; font-size:14px; color:#666;">
              <span style="width:12px; height:12px; border-radius:2px; background:#D4537E; display:inline-block;"></span> Female
            </span>
          </div>
          <div style="display:flex; align-items:center; padding:12px 22px; gap:20px; background:#f8f9fa; border-bottom:0.5px solid #eee;">
            <div style="min-width:120px; font-size:14px; font-weight:500; color:#888;">Barangay</div>
            <div style="min-width:70px; font-size:14px; font-weight:500; color:#888;">Total</div>
            <div style="flex:1; font-size:14px; font-weight:500; color:#888;">Male</div>
            <div style="flex:1; font-size:14px; font-weight:500; color:#888;">Female</div>
            <div style="min-width:80px; font-size:14px; font-weight:500; color:#888; text-align:center;">PWD</div>
            <div style="min-width:80px; font-size:14px; font-weight:500; color:#888; text-align:center;">Senior</div>
          </div>
          <table style="width:100%; border-collapse:collapse;">
            <tbody>${bgyRows}</tbody>
          </table>
        </div>
        <div id="bgy-resident-panel" style="flex:1; background:#fff; border-radius:12px; border:0.5px solid #e0e0e0; overflow:hidden; min-height:300px;">
          <div style="padding:60px 20px; text-align:center; color:#bbb;">
            <div style="font-size:40px; margin-bottom:12px;">👆</div>
            <div style="font-size:15px; font-weight:500; color:#aaa;">Select a barangay</div>
            <div style="font-size:13px; color:#ccc; margin-top:6px;">Residents Name</div>
          </div>
        </div>
      </div>
    </div>
  `;
  window._selectedBgy = null;
}

function selectBarangayGroup(barangay) {
  const trapiches = ['Trapiche 1', 'Trapiche 2', 'Trapiche 3', 'Trapiche 4'];
  trapiches.forEach(t => {
    const row = document.getElementById(`row-bgy-${t.replace(' ', '-')}`);
    if (row) row.style.background = '#fff';
  });
  const safeId = barangay.replace(' ', '-');
  const selectedRow = document.getElementById(`row-bgy-${safeId}`);
  if (selectedRow) selectedRow.style.background = '#EBF4FF';
  window._selectedBgy = barangay;

  const residents = dswdResidents.filter(r => r.barangay === barangay);
  window._bgyGroupData = residents;

  const panel = document.getElementById('bgy-resident-panel');
  panel.innerHTML = `
    <div style="display:flex; align-items:center; justify-content:space-between; padding:16px 22px; border-bottom:0.5px solid #eee; background:#f8f9fa;">
      <div>
        <span style="font-size:16px; font-weight:500; color:#1a1a1a;">${barangay}</span>
        <span style="margin-left:10px; background:#E6F1FB; color:#0C447C; font-size:13px; font-weight:500; padding:4px 14px; border-radius:99px;">${residents.length} resident${residents.length !== 1 ? 's' : ''}</span>
      </div>
    </div>
    <div style="padding:12px 22px; border-bottom:0.5px solid #f0f0f0;">
      <input type="text" placeholder="Search residents..."
        oninput="filterBgyResidents(this)"
        style="padding:8px 14px; border-radius:8px; border:0.5px solid #ddd; font-size:14px; width:100%; margin:0;">
    </div>
    <div id="bgy-resident-list" style="padding:14px 22px; display:flex; flex-direction:column; gap:6px; max-height:500px; overflow-y:auto;">
      ${residents.length === 0
        ? `<p style="color:#aaa; font-size:14px; text-align:center; padding:30px 0;">No residents in this barangay.</p>`
        : residents.map(r => bgyResidentCard(r)).join('')}
    </div>
  `;
}

function bgyResidentCard(r) {
  return `
    <div onclick="openDSWDResidentDetail('${r.username}')"
      style="display:flex; align-items:center; justify-content:space-between; padding:12px 16px; border-radius:10px; border:0.5px solid #eee; cursor:pointer; background:#fff;"
      onmouseover="this.style.background='#f4f7ff'" onmouseout="this.style.background='#fff'">
      <div>
        <div style="font-size:15px; font-weight:500; color:#1a1a1a;">${r.name}</div>
        <div style="font-size:13px; color:#888; margin-top:3px;">Age ${r.age} &nbsp;·&nbsp; ${r.gender} &nbsp;·&nbsp; ${r.barangay}</div>
      </div>
      <div style="display:flex; gap:8px; align-items:center;">
        ${r.pwd === 'Yes' ? `<span style="background:#FAECE7; color:#712B13; font-size:12px; font-weight:500; padding:4px 12px; border-radius:99px;">PWD</span>` : ''}
        ${r.age >= 60 ? `<span style="background:#EAF3DE; color:#27500A; font-size:12px; font-weight:500; padding:4px 12px; border-radius:99px;">Senior</span>` : ''}
        <span style="font-size:13px; color:#bbb;">View →</span>
      </div>
    </div>
  `;
}

function filterBgyResidents(input) {
  const keyword = input.value.toLowerCase();
  const filtered = (window._bgyGroupData || []).filter(r => r.name.toLowerCase().includes(keyword));
  document.getElementById('bgy-resident-list').innerHTML = filtered.length === 0
    ? `<p style="color:#aaa; font-size:14px; text-align:center; padding:30px 0;">No residents match your search.</p>`
    : filtered.map(r => bgyResidentCard(r)).join('');
}

function renderResidentWelcome() {
  const body = document.getElementById('dashboard-body');
  const u = loggedInUser;

  let children = [];
  try { children = JSON.parse(u.children_names || '[]'); } catch(e) { children = []; }
  if (!Array.isArray(children)) children = [];

  body.innerHTML = `
    <div style="padding:28px; background:#f5f6fa; min-height:100%;">

      <!-- Hero Banner -->
      <div style="background:#8B0000; border-radius:16px; padding:32px 36px; margin-bottom:24px; position:relative; overflow:hidden; box-shadow:0 8px 32px rgba(139,0,0,0.25);">
        <div style="position:absolute;top:-30px;right:-30px;width:180px;height:180px;background:rgba(255,255,255,0.07);border-radius:50%;"></div>
        <div style="position:absolute;bottom:-50px;right:60px;width:120px;height:120px;background:rgba(255,255,255,0.05);border-radius:50%;"></div>
        <div style="position:relative; z-index:1;">
          <div style="font-size:13px; color:rgba(255,255,255,0.75); font-weight:500; letter-spacing:0.5px; margin-bottom:6px; text-transform:uppercase;">Welcome back</div>
          <div style="font-size:28px; font-weight:700; color:#fff; margin-bottom:4px;">${u.name || 'Resident'}</div>
          <div style="font-size:13px; color:rgba(255,255,255,0.7);">Barangay ${u.barangay || 'Trapiche'} &nbsp;·&nbsp; Tanauan City, Batangas</div>
        </div>
      </div>

      <!-- Stat Cards -->
      <div style="display:grid; grid-template-columns:repeat(auto-fit,minmax(150px,1fr)); gap:14px; margin-bottom:24px;">
        ${[
          { label:'Age', value: u.age || '—', icon:'🎂', color:'#1a3f6c' },
          { label:'Gender', value: u.gender || '—', icon:'👤', color:'#2c5aa0' },
          { label:'Civil Status', value: u.status || '—', icon:'💍', color:'#c0392b' },
          { label:'PWD', value: u.pwd === 'Yes' ? 'Yes' : 'No', icon:'♿', color:'#e67e22' },
          { label:'Senior', value: (u.age >= 60) ? 'Yes' : 'No', icon:'⭐', color:'#27ae60' },
        ].map(card => `
          <div style="background:#fff; border-radius:12px; padding:18px 20px; border:1px solid #ebebeb; box-shadow:0 2px 8px rgba(0,0,0,0.04);"
            onmouseover="this.style.boxShadow='0 6px 20px rgba(0,0,0,0.1)'" onmouseout="this.style.boxShadow='0 2px 8px rgba(0,0,0,0.04)'">
            <div style="font-size:22px; margin-bottom:10px;">${card.icon}</div>
            <div style="font-size:18px; font-weight:700; color:${card.color}; margin-bottom:2px;">${card.value}</div>
            <div style="font-size:12px; color:#999; font-weight:500; text-transform:uppercase; letter-spacing:0.4px;">${card.label}</div>
          </div>
        `).join('')}
      </div>

      <!-- Profile Detail Cards -->
      <div style="display:grid; grid-template-columns:1fr 1fr; gap:16px; margin-bottom:24px;">

        <!-- Personal Information -->
        <div style="background:#fff; border-radius:16px; border:1px solid #ebebeb; overflow:hidden; box-shadow:0 2px 8px rgba(0,0,0,0.04);">
          <div style="padding:16px 22px; border-bottom:1px solid #f0f0f0; background:#fafafa;">
            <div style="font-size:14px; font-weight:700; color:#c0392b;">🧍 Personal Information</div>
          </div>
          <div style="padding:18px 22px; display:flex; flex-direction:column; gap:12px;">
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
          <div style="padding:16px 22px; border-bottom:1px solid #f0f0f0; background:#fafafa;">
            <div style="font-size:14px; font-weight:700; color:#1a3f6c;">👨‍👩‍👧‍👦 Family Information</div>
          </div>
          <div style="padding:18px 22px; display:flex; flex-direction:column; gap:12px;">
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
          <div style="padding:16px 22px; border-bottom:1px solid #f0f0f0; background:#fafafa;">
            <div style="font-size:14px; font-weight:700; color:#e67e22;">📞 Contact & Education</div>
          </div>
          <div style="padding:18px 22px; display:flex; flex-direction:column; gap:12px;">
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
          <div style="padding:16px 22px; border-bottom:1px solid #f0f0f0; background:#fafafa;">
            <div style="font-size:14px; font-weight:700; color:#c0392b;">🚨 Emergency Contact</div>
          </div>
          <div style="padding:18px 22px; display:flex; flex-direction:column; gap:12px;">
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
        <div style="display:flex; align-items:center; justify-content:space-between; padding:20px 24px; border-bottom:1px solid #f0f0f0;">
          <div>
            <div style="font-size:16px; font-weight:700; color:#1a1a1a;">Recent Requests</div>
            <div style="font-size:12px; color:#999; margin-top:2px;">Your latest document requests</div>
          </div>
          <button onclick="showMyRequests()"
            style="padding:8px 16px; background:#1a3f6c; color:white; border:none; border-radius:8px; font-size:13px; font-weight:600; cursor:pointer;">
            View All
          </button>
        </div>
        <div id="recent-requests-container" style="padding:20px 24px;">
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
        <input type="file" id="request-photo" style="width:100%; margin-bottom:15px;">
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
      <div style="margin-top:20px; text-align:right;">
        <div id="profile-message" style="font-size:13px; margin-bottom:10px; text-align:center;"></div>
        <button onclick="updateProfile()"
          style="padding:12px 40px; background:#8B0000; color:white; font-weight:bold; border:none; border-radius:8px; font-size:14px; cursor:pointer;">
          Save Profile
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
      if (msg) { msg.innerText = 'Profile saved successfully!'; msg.style.color = 'green'; }
      Object.assign(loggedInUser, updatedData);
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

  if (!type || !purpose || !email || !govIdFile || !photoFile) {
    alert('Please fill all required fields.');
    return;
  }

  const formData = new FormData();
  formData.append("username", loggedInUser.username);
  formData.append("document_type", type);
  formData.append("purpose", purpose);
  formData.append("email", email);
  formData.append("gov_id", govIdFile);
  formData.append("photo", photoFile);

  fetch(`${API_BASE}/api/request-document`, {
    method: 'POST',
    body: formData
  })
  .then(res => res.json())
  .then(data => {
    alert(data.message);
    loadMyRequests(); 
  })
  .catch(err => {
    console.error(err);
    alert("Error sending request.");
  });
}

console.log("Logged Resident:", loggedInUser);

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
  fetch(`${API_BASE}/api/document-requests`)
    .then(res => res.json())
    .then(data => {
      window.allRequests = data.requests || [];
      renderManagerRequests(window.allRequests, 'pending');
    })
    .catch(err => alert('Failed to load requests'));
}

function renderManagerRequests(allRequests, filter = 'all') {
  const body = document.getElementById('manager-table');
  if (allRequests.length === 0) {
    body.innerHTML = '<h2>Document Requests</h2><p>No document requests yet.</p>';
    return;
  }

  let filteredRequests = allRequests;
  if (filter === 'pending') {
    filteredRequests = allRequests.filter(r => r.status === 'Pending');
  } else if (filter === 'approved') {
    filteredRequests = allRequests.filter(r => r.status === 'Approved');
  } else if (filter === 'rejected') {
    filteredRequests = allRequests.filter(r => r.status === 'Rejected');
  }

  let tableHTML = `
    <h2 style="margin-bottom:12px;">Document Requests</h2>
    <div style="width:100%; overflow-x:auto;">
    <table style="width:100%; min-width:900px; border-collapse:collapse;">
      <thead>
        <tr>
          <th style="white-space:nowrap;">Resident</th>
          <th style="white-space:nowrap;">Document Type</th>
          <th style="white-space:nowrap;">Purpose</th>
          <th style="white-space:nowrap;">Status</th>
          <th style="white-space:nowrap;">Gov ID</th>
          <th style="white-space:nowrap;">2x2 Photo</th>
          <th style="white-space:nowrap;">Date</th>
          <th style="white-space:nowrap;">Time</th>
          <th style="white-space:nowrap;">Actions</th>
        </tr>
      </thead>
      <tbody>
        ${filteredRequests.map((r, i) => `
          <tr style="background-color:${r.status==='Approved'?'#d4edda':r.status==='Rejected'?'#f8d7da':'#fff'}">
           <td>${r.username}</td>
           <td>${r.document_type}</td>
           <td>${r.purpose}</td>
           <td>${r.status}</td>
           <td>${r.gov_id ? `
             <a href="${r.gov_id}" target="_blank">
               <img src="${r.gov_id}"
                 style="width:60px; height:60px; object-fit:cover; border-radius:6px; border:1px solid #ddd; cursor:pointer;"
                 onerror="this.style.display='none'; this.nextElementSibling.style.display='inline';">
               <span style="display:none; font-size:12px; color:#c0392b;">View</span>
             </a>` : '<span style="color:#bbb; font-size:12px;">None</span>'}
           </td>
           <td>${r.photo ? `
             <a href="${r.photo}" target="_blank">
               <img src="${r.photo}"
                 style="width:60px; height:60px; object-fit:cover; border-radius:6px; border:1px solid #ddd; cursor:pointer;"
                 onerror="this.style.display='none'; this.nextElementSibling.style.display='inline';">
               <span style="display:none; font-size:12px; color:#c0392b;">View</span>
             </a>` : '<span style="color:#bbb; font-size:12px;">None</span>'}
           </td>
           <td><input type="date" id="date-${i}" value="${r.date || ''}" ${r.status!=='Pending'?'readonly':''}></td>
           <td><input type="time" id="time-${i}" value="${r.time || ''}" ${r.status!=='Pending'?'readonly':''}></td>
           <td>
             ${r.status === 'Pending' ? `
               <button class="approve-btn" data-username="${r.username}" data-doc="${r.document_type}" data-index="${i}">Approve</button>
               <button class="reject-btn" data-username="${r.username}" data-doc="${r.document_type}">Reject</button>
             ` : ''}
           </td>
          </tr>
        `).join('')}
      </tbody>
    </table>
  `;
  tableHTML += `</table></div>`;
  body.innerHTML = tableHTML;

  document.querySelectorAll('.approve-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const username = btn.getAttribute('data-username');
      const docType = btn.getAttribute('data-doc');
      const index = btn.getAttribute('data-index');
      approveRequest(username, docType, index);
    });
  });

  document.querySelectorAll('.reject-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const username = btn.getAttribute('data-username');
      const docType = btn.getAttribute('data-doc');
      rejectRequest(username, docType);
    });
  });
}

function sendApprovalEmail(residentEmail, documentType, purpose, date, time) {
  emailjs.send("service_9m8vyrc", "template_tro0oll", {
    to_email: residentEmail,       
    document_type: documentType,   
    purpose: purpose,              
    date: date,                    
    time: formatTime12Hour(time)   
  }, "Ndd7_r9gTrjDBG9-K")
  .then(() => {
    console.log("Email sent successfully!");
  })
  .catch((error) => {
    console.error("Error sending email:", error);
  });
}

function approveRequest(username, documentType, index) {
  const pickUpDate = document.getElementById(`date-${index}`).value;
  const pickUpTime = document.getElementById(`time-${index}`).value;

  if (!pickUpDate || !pickUpTime) {
    alert('Please set both pick-up date and time before approving.');
    return;
  }

  fetch(`${API_BASE}/api/approve-request`, {
    method: 'POST',
    headers: { 'Content-Type':'application/json' },
    body: JSON.stringify({ username, documentType, date: pickUpDate, time: pickUpTime })
  })
  .then(res => res.json())
  .then(data => {
    if (data.success) {
      const residentEmail = data.email;
      const purpose = data.purpose || "General Requirement";
      sendApprovalEmail(residentEmail, documentType, purpose, pickUpDate, pickUpTime);
      alert(`Request approved and email sent to ${residentEmail}!`);
      showDocRequests();
    } else {
      alert(data.message || 'Failed to approve request.');
    }
  })
  .catch(() => alert('Server error while approving request.'));
}

function rejectRequest(username, documentType) {
  if (!confirm('Are you sure you want to reject this request?')) return;

  fetch(`${API_BASE}/api/reject-request`, {
    method: 'POST',
    headers: {'Content-Type':'application/json'},
    body: JSON.stringify({ username, documentType })
  })
  .then(res => res.json())
  .then(data => {
    if (data.success) {
      alert(`Request rejected for ${username}`);
      showDocRequests();
    } else {
      alert(data.message || 'Failed to reject request.');
    }
  })
  .catch(() => alert('Server error while rejecting request.'));
}

// DSWD Dashboard
// FIX #3: Removed the duplicate showDSWDStats that was nested inside renderDSWDStats
// This is now the only definition of showDSWDStats
function showDSWDStats(){
  fetch(`${API_BASE}/api/residents`)
    .then(res => res.json())
    .then(data => {
      dswdResidents = data.residents || [];
      renderDSWDStats(dswdResidents);
    })
    .catch(err => alert('Failed to load resident data from server.'));
}

// FIX #4: renderDSWDStats now properly closed — no nested functions inside it
function renderDSWDStats(residents){
  const body = document.getElementById('dashboard-body');
  const trapiches=['Trapiche 1','Trapiche 2','Trapiche 3','Trapiche 4'];

  let totalMale=0, totalFemale=0, totalPWD=0, totalSenior=0;

  const ageCounts = {
    '0_10':  { male:0, female:0 },
    '11_14': { male:0, female:0 },
    '15_30': { male:0, female:0 },
    '31_59': { male:0, female:0 },
    '60':    { male:0, female:0 }
  };

  let trapicheTotals = {};
  trapiches.forEach(t => {
    trapicheTotals[t] = { male:0, female:0, total:0, pwd:0, senior:0, residents:[] };
  });

  residents.forEach(r => {
    if(r.gender==='Male') totalMale++; else totalFemale++;
    if(r.pwd==='Yes') totalPWD++;
    if(r.age>=60) totalSenior++;

    if(trapicheTotals[r.barangay]){
      trapicheTotals[r.barangay][r.gender==='Male'?'male':'female']++;
      trapicheTotals[r.barangay].total++;
      if(r.pwd==='Yes') trapicheTotals[r.barangay].pwd++;
      if(r.age>=60) trapicheTotals[r.barangay].senior++;
      trapicheTotals[r.barangay].residents.push(r);
    }

    if(r.age<=10)      ageCounts['0_10'][r.gender==='Male'?'male':'female']++;
    else if(r.age<=14) ageCounts['11_14'][r.gender==='Male'?'male':'female']++;
    else if(r.age<=30) ageCounts['15_30'][r.gender==='Male'?'male':'female']++;
    else if(r.age<=59) ageCounts['31_59'][r.gender==='Male'?'male':'female']++;
    else               ageCounts['60'][r.gender==='Male'?'male':'female']++;
  });

  const n = residents.length;
  const pct = (a, b) => b ? Math.round(a / b * 100) : 0;

  const thStyle = `padding:14px 22px; text-align:left; font-size:14px; font-weight:500; color:#888; border-bottom:0.5px solid #eee; background:#f8f9fa; white-space:nowrap;`;

  const barCell = (count, barPct, color, pillBg, pillColor, onclick) => `
    <div style="display:flex; align-items:center; gap:10px;">
      <span onclick="${onclick}"
        style="background:${pillBg}; color:${pillColor}; font-size:13px; font-weight:500;
               padding:5px 14px; border-radius:99px; min-width:40px; text-align:center; cursor:pointer;">
        ${count}
      </span>
      <div style="flex:1; height:7px; background:#eee; border-radius:99px; overflow:hidden; min-width:80px;">
        <div style="width:${barPct}%; height:100%; background:${color}; border-radius:99px;"></div>
      </div>
      <span style="font-size:13px; color:#bbb; min-width:40px; text-align:right;">${barPct}%</span>
    </div>
  `;

  const legend = `
    <div style="display:flex; gap:20px; padding:14px 22px; border-bottom:0.5px solid #f0f0f0;">
      <span style="display:flex; align-items:center; gap:6px; font-size:14px; color:#666;">
        <span style="width:12px; height:12px; border-radius:2px; background:#378ADD; display:inline-block;"></span> Male
      </span>
      <span style="display:flex; align-items:center; gap:6px; font-size:14px; color:#666;">
        <span style="width:12px; height:12px; border-radius:2px; background:#D4537E; display:inline-block;"></span> Female
      </span>
    </div>
  `;

  const metricCards = `
    <div style="display:grid; grid-template-columns:repeat(5,minmax(0,1fr)); gap:12px; margin-bottom:24px;">
      <div style="background:#fff; border-radius:10px; padding:18px 20px; border:0.5px solid #e0e0e0;">
        <div style="font-size:14px; color:#888; margin-bottom:8px;">Total residents</div>
        <div style="font-size:32px; font-weight:500; color:#1a1a1a;">${n}</div>
        <div style="font-size:13px; color:#aaa; margin-top:6px;">all barangays</div>
      </div>
      <div style="background:#fff; border-radius:10px; padding:18px 20px; border:0.5px solid #e0e0e0;">
        <div style="font-size:14px; color:#185FA5; margin-bottom:8px;">Male</div>
        <div style="font-size:32px; font-weight:500; color:#185FA5;">${totalMale}</div>
        <div style="font-size:13px; color:#185FA5; margin-top:6px; opacity:0.8;">${pct(totalMale,n)}% of total</div>
      </div>
      <div style="background:#fff; border-radius:10px; padding:18px 20px; border:0.5px solid #e0e0e0;">
        <div style="font-size:14px; color:#993556; margin-bottom:8px;">Female</div>
        <div style="font-size:32px; font-weight:500; color:#993556;">${totalFemale}</div>
        <div style="font-size:13px; color:#993556; margin-top:6px; opacity:0.8;">${pct(totalFemale,n)}% of total</div>
      </div>
      <div style="background:#fff; border-radius:10px; padding:18px 20px; border:0.5px solid #e0e0e0;">
        <div style="font-size:14px; color:#3B6D11; margin-bottom:8px;">Senior (60+)</div>
        <div style="font-size:32px; font-weight:500; color:#3B6D11;">${totalSenior}</div>
        <div style="font-size:13px; color:#3B6D11; margin-top:6px; opacity:0.8;">${pct(totalSenior,n)}% of total</div>
      </div>
      <div style="background:#fff; border-radius:10px; padding:18px 20px; border:0.5px solid #e0e0e0;">
        <div style="font-size:14px; color:#712B13; margin-bottom:8px;">PWD</div>
        <div style="font-size:32px; font-weight:500; color:#712B13;">${totalPWD}</div>
        <div style="font-size:13px; color:#712B13; margin-top:6px; opacity:0.8;">${pct(totalPWD,n)}% of total</div>
      </div>
    </div>
  `;

  const ageLabels = { '0_10':'0–10', '11_14':'11–14', '15_30':'15–30', '31_59':'31–59', '60':'60+' };

  const ageRows = Object.keys(ageCounts).map(group => {
    const m = ageCounts[group].male;
    const f = ageCounts[group].female;
    const rt = m + f;
    const totalPct = pct(rt, n);
    const mPct = pct(m, rt);
    const fPct = rt ? (100 - mPct) : 0;
    return `
      <tr onmouseover="this.style.background='#fafafa'" onmouseout="this.style.background=''">
        <td style="padding:16px 22px; font-weight:500; font-size:16px; color:#1a1a1a;">${ageLabels[group]}</td>
        <td style="padding:16px 22px; text-align:right;">
          <span onclick="openAgeGroupFolder('${group}')" style="color:#378ADD; font-weight:500; font-size:18px; cursor:pointer;">${rt}</span>
        </td>
        <td style="padding:16px 22px;">
          ${barCell(m, mPct, '#378ADD', '#E6F1FB', '#0C447C', `openAgeGroupFolder('${group}','Male')`)}
        </td>
        <td style="padding:16px 22px;">
          ${barCell(f, fPct, '#D4537E', '#FBEAF0', '#72243E', `openAgeGroupFolder('${group}','Female')`)}
        </td>
        <td style="padding:16px 22px; text-align:right;">
          <div style="display:flex; align-items:center; justify-content:flex-end; gap:8px;">
            <div style="width:80px; height:7px; background:#eee; border-radius:99px; overflow:hidden;">
              <div style="width:${totalPct}%; height:100%; background:#c0392b; border-radius:99px;"></div>
            </div>
            <span style="font-size:13px; color:#bbb; min-width:40px;">${totalPct}%</span>
          </div>
        </td>
      </tr>
    `;
  }).join('');

  const bgyRows = trapiches.map(t => {
    const d = trapicheTotals[t];
    const mPct = pct(d.male, d.total);
    const fPct = d.total ? (100 - mPct) : 0;
    return `
      <tr onmouseover="this.style.background='#fafafa'" onmouseout="this.style.background=''">
        <td style="padding:16px 22px; font-weight:500; font-size:16px; color:#1a1a1a;">${t}</td>
        <td style="padding:16px 22px; text-align:right;">
          <span onclick="openTrapicheCategory('total','${t}')" style="color:#378ADD; font-weight:500; font-size:18px; cursor:pointer;">${d.total}</span>
        </td>
        <td style="padding:16px 22px;">
          ${barCell(d.male, mPct, '#378ADD', '#E6F1FB', '#0C447C', `openTrapicheCategory('male','${t}')`)}
        </td>
        <td style="padding:16px 22px;">
          ${barCell(d.female, fPct, '#D4537E', '#FBEAF0', '#72243E', `openTrapicheCategory('female','${t}')`)}
        </td>
        <td style="padding:16px 22px; text-align:center;">
          <span onclick="openTrapicheCategory('pwd','${t}')"
            style="background:#FAECE7; color:#712B13; font-size:14px; font-weight:500; padding:6px 16px; border-radius:99px; cursor:pointer;">${d.pwd}</span>
        </td>
        <td style="padding:16px 22px; text-align:center;">
          <span onclick="openTrapicheCategory('senior','${t}')"
            style="background:#EAF3DE; color:#27500A; font-size:14px; font-weight:500; padding:6px 16px; border-radius:99px; cursor:pointer;">${d.senior}</span>
        </td>
      </tr>
    `;
  }).join('');

  body.innerHTML = `
    <div style="padding:24px; background:#f5f6fa; min-height:100%;">
      ${metricCards}
      <div style="background:#fff; border-radius:12px; border:0.5px solid #e0e0e0; overflow:hidden; margin-bottom:24px;">
        <div style="display:flex; align-items:center; justify-content:space-between; padding:18px 22px; border-bottom:0.5px solid #e0e0e0;">
          <span style="font-size:17px; font-weight:500; color:#1a1a1a;">Age group breakdown</span>
          <span style="font-size:13px; color:#aaa;">${n} residents total</span>
        </div>
        ${legend}
        <table style="width:100%; border-collapse:collapse;">
          <thead>
            <tr>
              <th style="${thStyle} width:140px;">Age group</th>
              <th style="${thStyle} text-align:right; width:100px;">Total</th>
              <th style="${thStyle} width:280px;">Male</th>
              <th style="${thStyle} width:280px;">Female</th>
              <th style="${thStyle} text-align:right; width:160px;">% of total</th>
            </tr>
          </thead>
          <tbody>${ageRows}</tbody>
        </table>
      </div>
      <div style="background:#fff; border-radius:12px; border:0.5px solid #e0e0e0; overflow:hidden; margin-bottom:24px;">
        <div style="display:flex; align-items:center; justify-content:space-between; padding:18px 22px; border-bottom:0.5px solid #e0e0e0;">
          <span style="font-size:17px; font-weight:500; color:#1a1a1a;">Barangay breakdown</span>
          <span style="font-size:13px; color:#aaa;">4 zones</span>
        </div>
        ${legend}
        <table style="width:100%; border-collapse:collapse;">
          <thead>
            <tr>
              <th style="${thStyle} width:160px;">Barangay</th>
              <th style="${thStyle} text-align:right; width:100px;">Total</th>
              <th style="${thStyle} width:250px;">Male</th>
              <th style="${thStyle} width:250px;">Female</th>
              <th style="${thStyle} text-align:center; width:120px;">PWD</th>
              <th style="${thStyle} text-align:center; width:120px;">Senior</th>
            </tr>
          </thead>
          <tbody>${bgyRows}</tbody>
        </table>
      </div>
    </div>
  `;
} // <-- renderDSWDStats ends HERE (properly closed)

// These functions are now OUTSIDE renderDSWDStats (fixed)
function selectDSWDResident(element, username){
  document.querySelectorAll('#dswd-resident-list .folder-item')
    .forEach(el => el.classList.remove('active'));
  element.classList.add('active');
  const user = dswdResidents.find(r => r.username === username);
  if(!user) return;
  element.innerHTML = `
    <input type="text" value="${user.name}" id="edit-name-${username}" style="width:150px;">
    <select id="edit-gender-${username}">
      <option value="Male" ${user.gender==='Male'?'selected':''}>Male</option>
      <option value="Female" ${user.gender==='Female'?'selected':''}>Female</option>
    </select>
    <input type="number" value="${user.age}" id="edit-age-${username}" min="1" style="width:60px;">
    <input type="text" value="${user.barangay}" id="edit-barangay-${username}" style="width:100px;">
    <select id="edit-pwd-${username}">
      <option value="No" ${user.pwd==='No'?'selected':''}>No</option>
      <option value="Yes" ${user.pwd==='Yes'?'selected':''}>Yes</option>
    </select>
    <button onclick="saveDSWDResidentInline('${username}')">Save</button>
  `;
}

function saveDSWDResidentInline(username){
  const updatedData = {
    name: document.getElementById(`edit-name-${username}`).value,
    gender: document.getElementById(`edit-gender-${username}`).value,
    age: parseInt(document.getElementById(`edit-age-${username}`).value),
    barangay: document.getElementById(`edit-barangay-${username}`).value,
    pwd: document.getElementById(`edit-pwd-${username}`).value
  };
  fetch(`${API_BASE}/api/update-resident/${username}`, {
    method: 'PUT',
    headers: { 'Content-Type':'application/json' },
    body: JSON.stringify(updatedData)
  })
  .then(res => res.json())
  .then(data => {
    if(data.success){
      alert('Resident updated successfully!');
      showDSWDStats();
    } else {
      alert('Update failed.');
    }
  })
  .catch(() => alert('Server error.'));
}

function openTrapicheCategory(category, trapiche = null) {
  const body = document.getElementById('dashboard-body');
  let filtered = dswdResidents.filter(r => {
    if (trapiche && r.barangay !== trapiche) return false;
    switch(category){
      case 'total': return true;
      case 'male': return r.gender === 'Male';
      case 'female': return r.gender === 'Female';
      case 'pwd': return r.pwd === 'Yes';
      case 'senior': return r.age >= 60;
      default: return true;
    }
  });
  const title = trapiche ? `${trapiche} - ${category.toUpperCase()} Residents` : `${category.toUpperCase()} Residents (All Barangays)`;
  body.innerHTML = `
    <button onclick="showDSWDStats()" style="margin-bottom:15px;">Back</button>
    <h3>${title}</h3>
    <input type="text" placeholder="Search resident name..." oninput="filterCategoryResidents(this)">
    <div id="category-resident-list">
      ${filtered.length === 0 ? '<p>No residents found.</p>' :
        filtered.map(r => `<p onclick="openDSWDResidentDetail('${r.username}')">${r.name} (${r.age}, ${r.gender}, PWD:${r.pwd}, ${r.barangay})</p>`).join('')}
    </div>
  `;
}

function filterCategoryResidents(input){
  const keyword = input.value.toLowerCase();
  document.querySelectorAll("#category-resident-list p").forEach(p=>{
    p.style.display = p.innerText.toLowerCase().includes(keyword) ? "block" : "none";
  });
}

function filterDSWDResidents(input){
  const keyword = input.value.toLowerCase();
  document.querySelectorAll("#dswd-resident-list p").forEach(p=>{
    p.style.display = p.innerText.toLowerCase().includes(keyword) ? "block" : "none";
  });
}

function openDSWDResidentDetail(username){
  const user = dswdResidents.find(r => r.username === username);
  if(!user) return;
  const body = document.getElementById('dashboard-body');
  body.innerHTML = `
    <button onclick="showDSWDStats()" style="margin-bottom:15px;">⬅ Back to DSWD Dashboard</button>
    <h3>Edit Resident: ${user.name}</h3>
    <label>Name:</label>
    <input type="text" id="dswd-name" value="${user.name}">
    <label>Gender:</label>
    <select id="dswd-gender">
      <option value="Male" ${user.gender==='Male'?'selected':''}>Male</option>
      <option value="Female" ${user.gender==='Female'?'selected':''}>Female</option>
    </select>
    <label>Age:</label>
    <input type="number" id="dswd-age" value="${user.age}" min="1">
    <label>Address:</label>
    <input type="text" id="dswd-address" value="${user.address || ''}">
    <label>Barangay:</label>
    <select id="dswd-barangay">
      <option value="Trapiche 1" ${user.barangay==='Trapiche 1'?'selected':''}>Trapiche 1</option>
      <option value="Trapiche 2" ${user.barangay==='Trapiche 2'?'selected':''}>Trapiche 2</option>
      <option value="Trapiche 3" ${user.barangay==='Trapiche 3'?'selected':''}>Trapiche 3</option>
      <option value="Trapiche 4" ${user.barangay==='Trapiche 4'?'selected':''}>Trapiche 4</option>
    </select>
    <label>PWD:</label>
    <select id="dswd-pwd">
      <option value="No" ${user.pwd==='No'?'selected':''}>No</option>
      <option value="Yes" ${user.pwd==='Yes'?'selected':''}>Yes</option>
    </select>
    <button onclick="saveDSWDResident('${user.username}')">Save Changes</button>
  `;
}

function saveDSWDResident(username){
  const updatedData = {
    name: document.getElementById('dswd-name').value,
    gender: document.getElementById('dswd-gender').value,
    age: parseInt(document.getElementById('dswd-age').value),
    address: document.getElementById('dswd-address').value,
    barangay: document.getElementById('dswd-barangay').value,
    pwd: document.getElementById('dswd-pwd').value
  };
  fetch(`${API_BASE}/api/update-resident/${username}`, {
    method: 'PUT',
    headers: { 'Content-Type':'application/json' },
    body: JSON.stringify(updatedData)
  })
  .then(res => res.json())
  .then(data => {
    if(data.success){
      alert('Resident updated successfully!');
      showDSWDStats();
    } else {
      alert('Update failed.');
    }
  })
  .catch(() => alert('Server error.'));
}

function toggleResidentsByAgeGroup(row,group){
  row.classList.toggle('expanded');
  if(row.nextElementSibling && row.nextElementSibling.classList.contains('age-residents')){
    row.nextElementSibling.remove();
    return;
  }
  const residentsList = dswdResidents.filter(r=>{
    if(group==='0_10') return r.age<=10;
    if(group==='11_14') return r.age>=11&&r.age<=14;
    if(group==='15_30') return r.age>=15&&r.age<=30;
    if(group==='31_59') return r.age>=31&&r.age<=59;
    return r.age>=60;
  });
  const tr=document.createElement('tr');
  tr.classList.add('age-residents');
  const td=document.createElement('td');
  td.colSpan=6;
  td.innerHTML=residentsList.map(r=>`<p>${r.name} (${r.age}, ${r.gender}, ${r.barangay})</p>`).join('');
  tr.appendChild(td);
  row.parentNode.insertBefore(tr,row.nextSibling);
}

function toggleResidentsByTrapiche(row, trapiche) {
  row.classList.toggle('expanded');
  if (row.nextElementSibling && row.nextElementSibling.classList.contains('trapiche-residents')) {
    row.nextElementSibling.remove();
    return;
  }
  const residentsList = dswdResidents.filter(r => r.barangay === trapiche);
  const tr = document.createElement('tr');
  tr.classList.add('trapiche-residents');
  const td = document.createElement('td');
  td.colSpan = 6;
  td.innerHTML = `<div class="folder-contents">${residentsList.map(r => `<p>${r.name} (${r.age}, ${r.gender}, PWD:${r.pwd})</p>`).join('')}</div>`;
  tr.appendChild(td);
  row.parentNode.insertBefore(tr, row.nextSibling);
}

function filterTrapicheResidents(input){
  const keyword = input.value.toLowerCase();
  document.querySelectorAll(".trapiche-residents p").forEach(p=>{
    p.style.display = p.innerText.toLowerCase().includes(keyword) ? "block" : "none";
  });
}

function openTrapicheFolder(trapiche) {
  const body = document.getElementById('dashboard-body');
  const residentsList = dswdResidents.filter(r => r.barangay === trapiche);
  body.innerHTML = `
    <button onclick="showDSWDStats()" style="margin-bottom:15px;">⬅ Back to Barangay Statistics</button>
    <h3>${trapiche} Residents</h3>
    <input type="text" class="search-box" placeholder="Search resident name..." oninput="filterFolderResidents(this)">
    <div id="folder-residents">
      ${residentsList.length === 0
        ? '<p>No residents found.</p>'
        : residentsList.map(r => `
            <p class="folder-item" data-username="${r.username}" onclick="selectTrapicheResident(this, '${r.username}')">
              ${r.name} (${r.age}, ${r.gender}, PWD: ${r.pwd})
            </p>
          `).join('')
      }
    </div>
  `;
}

function selectTrapicheResident(element, username) {
  document.querySelectorAll('#folder-residents .folder-item').forEach(el => el.classList.remove('active'));
  element.classList.add('active');
  openDSWDResidentDetail(username);
}

function filterFolderResidents(input) {
  const keyword = input.value.toLowerCase();
  document.querySelectorAll("#folder-residents p").forEach(p => {
    p.style.display = p.innerText.toLowerCase().includes(keyword) ? "block" : "none";
  });
}

function openAgeGroupFolder(group, gender = null) {
  const body = document.getElementById('dashboard-body');
  const residentsList = dswdResidents.filter(r => {
    let inGroup = false;
    if (group === '0_10') inGroup = r.age <= 10;
    else if (group === '11_14') inGroup = r.age >= 11 && r.age <= 14;
    else if (group === '15_30') inGroup = r.age >= 15 && r.age <= 30;
    else if (group === '31_59') inGroup = r.age >= 31 && r.age <= 59;
    else if (group === '60') inGroup = r.age >= 60;
    if (gender) return inGroup && r.gender === gender;
    return inGroup;
  });
  const groupNames = { '0_10': '0–10', '11_14': '11–14', '15_30': '15–30', '31_59': '31–59', '60': '60+' };
  body.innerHTML = `
    <button onclick="showDSWDStats()" style="margin-bottom:15px;">Back</button>
    <h3>Age Group: ${groupNames[group]}${gender ? ' - ' + gender : ''}</h3>
    <input type="text" class="search-box" placeholder="Search resident name..." oninput="filterAgeFolderResidents(this)">
    ${residentsList.length === 0
      ? '<p>No residents found.</p>'
      : `
        <table class="resident-table">
          <thead>
            <tr>
              <th>Name</th><th>Age</th><th>Gender</th><th>Barangay</th><th>PWD</th><th>Actions</th>
            </tr>
          </thead>
          <tbody>
            ${residentsList.map(r => `
              <tr>
                <td><input type="text" value="${r.name}" style="width:150px;" readonly></td>
                <td><input type="number" value="${r.age}" min="1" style="width:60px;" readonly></td>
                <td>
                  <select disabled>
                    <option value="Male" ${r.gender==='Male'?'selected':''}>Male</option>
                    <option value="Female" ${r.gender==='Female'?'selected':''}>Female</option>
                  </select>
                </td>
                <td><input type="text" value="${r.barangay}" style="width:100px;" readonly></td>
                <td>
                  <select disabled>
                    <option value="No" ${r.pwd==='No'?'selected':''}>No</option>
                    <option value="Yes" ${r.pwd==='Yes'?'selected':''}>Yes</option>
                  </select>
                </td>
                <td><button onclick="openDSWDResidentDetail('${r.username}')">Edit</button></td>
              </tr>
            `).join('')}
          </tbody>
        </table>
      `
    }
  `;
}

function selectAgeResident(element, username) {
  document.querySelectorAll('#age-folder-residents .folder-item').forEach(el => el.classList.remove('active'));
  element.classList.add('active');
  openDSWDResidentDetail(username);
}

function filterAgeFolderResidents(input) {
  const keyword = input.value.toLowerCase();
  document.querySelectorAll("#age-folder-residents p").forEach(p => {
    p.style.display = p.innerText.toLowerCase().includes(keyword) ? "block" : "none";
  });
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
  console.log("Encoded JWT ID token: " + response.credential);
  fetch(`${API_BASE}/api/google-login`, {
    method: 'POST',
    headers: { 'Content-Type':'application/json' },
    body: JSON.stringify({ credential: response.credential })
  })
  .then(res => res.json())
  .then(data => {
    if (data.success) {
      loggedInUser = data.user;
      currentRole = data.user.role;
      localStorage.setItem("user", JSON.stringify(data.user));
      console.log("Logged in user:", loggedInUser);
      showDashboard();
    } else {
      const errBox = document.getElementById('login-error');
      if (errBox) {
        errBox.innerText = data.message || 'Google login failed';
        errBox.style.display = 'block';
      }
    }
  })
  .catch(err => {
    console.error("Google login error:", err);
    const errBox = document.getElementById('login-error');
    if (errBox) {
      errBox.innerText = 'Google login failed: ' + (err.message || 'Server error');
      errBox.style.display = 'block';
    }
  });
}

const savedUser = localStorage.getItem("user");
if (savedUser) {
  loggedInUser = JSON.parse(savedUser);
  currentRole = loggedInUser.role;
  console.log("Restored user:", loggedInUser);
  if (currentRole === 'dswd') {
    openDSWDPage();
  } else if (currentRole === 'manager') {
    openManagerPage();
  } else if (currentRole === 'resident') {
    showDashboard();
    renderResidentWelcome();
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
  const name = loggedInUser.name || loggedInUser.username || 'User';
  const pic = loggedInUser.profile_pic ||
    `https://ui-avatars.com/api/?name=${encodeURIComponent(name)}&background=ffffff&color=c0392b&size=64`;

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
