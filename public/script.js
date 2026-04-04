let loggedInUser = null;
let currentRole = null;
let dswdResidents = [];
emailjs.init('Ndd7_r9gTrjDBG9-K')
const API_BASE = "https://profiling-system.onrender.com";
// Wake up Render on page load
fetch(`${API_BASE}/health`).catch(() => {});

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
function showLogin(){ document.getElementById('login-page').style.display='flex'; document.getElementById('resident-form').style.display='none'; document.getElementById('forgot-page').style.display='none'; }
function showForgotPassword(){ document.getElementById('login-page').style.display='none'; document.getElementById('forgot-page').style.display='block'; }

function sendOTP() {
  const email = document.getElementById('forgot-email').value;
  fetch(`${API_BASE}/api/send-otp`, {
    method: 'POST',
    headers: { 'Content-Type':'application/json' },
    body: JSON.stringify({ email })
  })
  .then(res => res.json())
  .then(data => {
    const msg = document.getElementById('otp-message');
    if(data.success){
      generatedOTP = data.otp; 
      otpUserEmail = email;
      msg.innerText = "OTP sent to your Gmail.";
      msg.style.color = "green";
      document.getElementById('otp-section').style.display = "block";
    } else {
      msg.innerText = data.message || "Email not registered!";
      msg.style.color = "red";
    }
  })
  .catch(() => {
    const msg = document.getElementById('otp-message');
    msg.innerText = "Failed to send OTP.";
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
    if (response.user) {
      alert('Resident account created successfully!');
      showLogin();
    } else {
      alert('Error: ' + (response.error || 'Unknown error'));
    }
  })
  .catch(err => {
    console.error(err);
    alert("Server connection error");
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
      loggedInUser = { ...data.user, ...(data.profile || {}) };
      currentRole = data.user.role;
      localStorage.setItem("user", JSON.stringify(loggedInUser));
      if (data.user.role === 'dswd') {
        openDSWDPage();
      } else if (data.user.role === 'manager') {
        openManagerPage();
      } else {
        showDashboard();
        showMyProfile();
      }
    } else {
      showLoginError('Please check Username and Password!');
    }
  })
  .catch(() => alert('Server connection error.'));
}

function openManagerPage(){
  document.getElementById('login-page').style.display = 'none';
  document.getElementById('dashboard-page').style.display = 'none';
  document.getElementById('dswd-page').style.display = 'none';
  document.getElementById('manager-page').style.display = 'flex';
  showDocRequests();
}

function showLoginError(message) {
  const existing = document.getElementById('login-error-banner');
  if (existing) existing.remove();

  const banner = document.createElement('div');
  banner.id = 'login-error-banner';
  banner.style.cssText = `
    display: flex;
    align-items: center;
    gap: 10px;
    background: #fdecea;
    border: 1px solid #f5c6c6;
    color: #c0392b;
    padding: 10px 14px;
    border-radius: 8px;
    font-size: 13px;
    font-weight: 500;
    margin-bottom: 12px;
    animation: fadeIn 0.2s ease;
  `;

  banner.innerHTML = `
    <span style="
      width: 20px; height: 20px;
      border-radius: 50%;
      border: 2px solid #c0392b;
      display: flex; align-items: center; justify-content: center;
      font-weight: bold; font-size: 12px; flex-shrink: 0;
    ">!</span>
    <span style="flex: 1;">${message}</span>
    <span onclick="this.parentElement.remove()" style="
      cursor: pointer; font-size: 16px; line-height: 1;
      color: #c0392b; opacity: 0.7; padding: 0 2px;
    ">&times;</span>
  `;

  const loginBox = document.querySelector('.login-box');
  const firstInput = loginBox.querySelector('input');
  loginBox.insertBefore(banner, firstInput);
}

function logout(){ 
  loggedInUser = null; 
  currentRole = null;
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
  console.log("Dashboard user:", loggedInUser);
  document.getElementById('login-page').style.display='none';
  document.getElementById('resident-form').style.display='none';
  document.getElementById('forgot-page').style.display='none';
  document.getElementById('dswd-page').style.display='none';
  document.getElementById('dashboard-page').style.display='flex';

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
    loadMyRequests(); 
  } else {
    updateDashboard(currentRole);
  }
}

function openDSWDPage(){
  document.getElementById('login-page').style.display = 'none';
  document.getElementById('dashboard-page').style.display = 'none';
  document.getElementById('dswd-page').style.display = 'flex';
  showDSWDStats();
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
  body.innerHTML = `
    <div style="display:flex; flex-wrap:wrap; gap:20px;">
      <div style="flex:1; min-width:300px; background:#f0f8ff; padding:20px; border-radius:12px; box-shadow:0 2px 6px rgba(0,0,0,0.1);">
        <h3>Welcome, ${loggedInUser.name || 'Resident'}!</h3>
        <p>Here's a quick summary of your profile:</p>
        <ul>
          <li>Age: ${loggedInUser.age || 'N/A'}</li>
          <li>Barangay: ${loggedInUser.barangay || 'N/A'}</li>
          <li>Status: ${loggedInUser.status || 'N/A'}</li>
          <li>PWD: ${loggedInUser.pwd || 'No'}</li>
        </ul>
      </div>
      <div style="flex:1; min-width:300px; background:#fff0f5; padding:20px; border-radius:12px; box-shadow:0 2px 6px rgba(0,0,0,0.1);">
        <h3>Quick Actions</h3>
        <button onclick="showMyProfile()" style="width:100%; padding:10px; margin-bottom:10px; border-radius:8px; background:#1a3f6c; color:white; border:none; cursor:pointer;">My Profile</button>
        <button onclick="showMyRequests()" style="width:100%; padding:10px; border-radius:8px; background:#1a3f6c; color:white; border:none; cursor:pointer;">My Requests</button>
      </div>
    </div>
    <div id="resident-requests-preview" style="margin-top:20px;">
      <h3>Recent Requests</h3>
      <div id="recent-requests-container">Loading your requests...</div>
    </div>
  `;
  loadMyRequestsPreview();
}

// FIX #1: was username (undefined), now loggedInUser.username
function loadMyRequestsPreview() {
  if(!loggedInUser || !loggedInUser.username) return;

  fetch(`${API_BASE}/api/my-requests?username=${loggedInUser.username}`)
    .then(res => res.json())
    .then(data => {
      loggedInUser.requests = data.requests || [];
      const container = document.getElementById('recent-requests-container');
      if(!container) return;
      if(loggedInUser.requests.length === 0) {
        container.innerHTML = '<p>No requests yet.</p>';
      } else {
        container.innerHTML = `
          ${loggedInUser.requests.slice(-3).map(r => {
            let bgColor = '#fff3cd';
            if(r.status === 'Approved') bgColor = '#d4edda';
            else if(r.status === 'Rejected') bgColor = '#f8d7da';
            return `
              <div class="request-card" style="background:${bgColor}">
                <h4>${r.document_type}</h4>
                <p><strong>Status:</strong> ${r.status}</p>
                ${r.status === 'Approved' && r.date && r.time
                  ? `<p>Pick-up Date: ${formatDate(r.date)}</p>
                     <p>Pick-up Time: ${formatTime12Hour(r.time)}</p>`
                  : ''}
                ${r.status === 'Rejected'
                  ? `<p style="color:red;">Your request was rejected.</p>`
                  : ''}
              </div>
            `;
          }).join('')}
        `;
      }
    })
    .catch(err => console.error('Failed to load requests', err));
}

function showMyRequests() {
  const body = document.getElementById('dashboard-body');
  const userRequests = loggedInUser.requests || [];

  body.innerHTML = `
    <button onclick="renderResidentWelcome()" 
      style="display:inline-block; width:fit-content; padding:6px 10px; margin-bottom:15px; font-size:12px; border:none; border-radius:4px; background:#1a3f6c; color:white; cursor:pointer;">
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
  body.innerHTML = `
    <button onclick="renderResidentWelcome()" 
      style="display:inline-block; width:fit-content; padding:6px 10px; margin-bottom:15px; font-size:12px; background:#1a3f6c; color:white; border:none; border-radius:4px;">
      ← Back
    </button>
    <h2 style="margin:5px 0; text-align:center;">My Profile</h2>
    <div style="display:flex; flex-wrap:wrap; justify-content:center; align-items:flex-start; gap:16px; padding:8px; width:100%; margin:0 auto; box-sizing:border-box;">
      <div style="background:#f4f7ff; padding:12px; border-radius:10px; box-shadow:0 2px 6px rgba(0,0,0,0.1); flex:1; min-width:240px; max-width:600px; box-sizing:border-box; width:100%;">
        <h3>Personal Info</h3>
        <table style="width:100%; border-collapse:collapse;">
          <tr><td>Name:</td><td><input type="text" id="profile-name" value="${loggedInUser.name || ''}" style="width:100%; padding:4px;"></td></tr>
          <tr><td>Birth:</td><td><input type="date" id="profile-dob" value="${loggedInUser.dob || ''}" onchange="calculateAge()" style="width:100%; padding:4px;"></td></tr>
          <tr><td>Age:</td><td><input type="number" id="profile-age" value="${loggedInUser.age || ''}" style="width:100%; padding:4px;"></td></tr>
          <tr><td>Sex:</td><td>
            <select id="profile-gender" style="width:100%; padding:4px;">
              <option ${loggedInUser.gender==='Male'?'selected':''}>Male</option>
              <option ${loggedInUser.gender==='Female'?'selected':''}>Female</option>
            </select>
          </td></tr>
          <tr><td>Status:</td><td>
            <select id="profile-status" style="width:100%; padding:4px;">
              <option ${loggedInUser.status==='Single'?'selected':''}>Single</option>
              <option ${loggedInUser.status==='Married'?'selected':''}>Married</option>
              <option ${loggedInUser.status==='Widowed'?'selected':''}>Widowed</option>
              <option ${loggedInUser.status==='Separated'?'selected':''}>Separated</option>
            </select>
          </td></tr>
          <tr><td>Religion:</td><td><input type="text" id="profile-religion" value="${loggedInUser.religion || ''}" style="width:100%; padding:4px;"></td></tr>
          <tr><td>House Address:</td><td><input type="text" id="profile-address" value="${loggedInUser.address || ''}" style="width:100%; padding:4px;"></td></tr>
          <tr><td>Barangay:</td><td>
            <select id="profile-barangay" style="width:100%; padding:4px;">
              <option value="Trapiche 1" ${loggedInUser.barangay==='Trapiche 1'?'selected':''}>Trapiche 1</option>
              <option value="Trapiche 2" ${loggedInUser.barangay==='Trapiche 2'?'selected':''}>Trapiche 2</option>
              <option value="Trapiche 3" ${loggedInUser.barangay==='Trapiche 3'?'selected':''}>Trapiche 3</option>
              <option value="Trapiche 4" ${loggedInUser.barangay==='Trapiche 4'?'selected':''}>Trapiche 4</option>
            </select>
          </td></tr>
        </table>
      </div>
      <div style="background:#f4f7ff; padding:12px; border-radius:10px; box-shadow:0 2px 6px rgba(0,0,0,0.1); flex:1; min-width:240px; max-width:600px; box-sizing:border-box; width:100%;">
        <h3>Family & Contact</h3>
<table style="width:100%; border-collapse:collapse;">
  <tr>
    <td>PWD:</td>
    <td>
      <select id="profile-pwd" style="width:100%; padding:4px;">
        <option ${loggedInUser.pwd === 'No' ? 'selected' : ''}>No</option>
        <option ${loggedInUser.pwd === 'Yes' ? 'selected' : ''}>Yes</option>
      </select>
    </td>
  </tr>
  <tr>
    <td>Contact:</td>
    <td>
      <input type="text" id="profile-contact" value="${loggedInUser.contact || ''}" style="width:100%; padding:4px;">
    </td>
  </tr>
  <tr>
    <td>Email:</td>
    <td>
      <input type="email" id="profile-email" value="${loggedInUser.email || ''}" style="width:100%; padding:4px;">
    </td>
  </tr>
</table>

<button onclick="updateProfile()" 
  style="margin-top:10px; width:100%; padding:8px; background:#1a3f6c; color:white; border:none; border-radius:6px;">
  Update Profile
</button>
      </div>
    </div>
  `;
}

function updateProfile(){
  const name    = document.getElementById('profile-name')?.value?.trim();
  const age     = document.getElementById('profile-age')?.value?.trim();
  const gender  = document.getElementById('profile-gender')?.value;
  const status  = document.getElementById('profile-status')?.value;
  const barangay= document.getElementById('profile-barangay')?.value;
  const contact = document.getElementById('profile-contact')?.value?.trim();
  const email   = document.getElementById('profile-email')?.value?.trim();
  const dob     = document.getElementById('profile-dob')?.value || null;
  const pwd     = document.getElementById('profile-pwd')?.value || 'No';
  const religion= document.getElementById('profile-religion')?.value?.trim() || null;
  const address = document.getElementById('profile-address')?.value?.trim() || null;

  const missing = [];
  if (!name)     missing.push('Name');
  if (!age)      missing.push('Age');
  if (!gender)   missing.push('Sex');
  if (!status)   missing.push('Status');
  if (!barangay) missing.push('Barangay');
  if (!contact)  missing.push('Contact Number');
  if (!email)    missing.push('Email');
  if (!dob)      missing.push('Birth Date');
  if (!religion) missing.push('Religion');
  if (!address)  missing.push('House Address');

  if (missing.length > 0) {
    showProfileBanner('error', 'Please fill in the following field/s: ' + missing.join(', '));
    return;
  }

  const updatedData = {
    name, religion, pwd, dob, address,
    age: parseInt(age),
    senior: parseInt(age) >= 60 ? 'Yes' : 'No',
    gender, status, barangay, contact, email,
    spouse: '', sons: 0, daughters: 0, family_members: 0
  };

  const sanitized = {};
  Object.keys(updatedData).forEach(key => {
    const val = updatedData[key];
    sanitized[key] = (val === '' || val === undefined) ? null : val;
  });

  fetch(`${API_BASE}/api/update-resident/${loggedInUser.username}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(sanitized)
  })
  .then(res => res.json())
  .then(data => {
    if (data.success) {
      loggedInUser = { ...loggedInUser, ...sanitized };
      localStorage.setItem("user", JSON.stringify(loggedInUser));
      showProfileBanner('success', 'Profile updated successfully!');
    } else {
      showProfileBanner('error', data.message || 'Update failed. Please try again.');
    }
  })
  .catch(() => showProfileBanner('error', 'Could not connect to server. Please try again.'));
}

function showProfileBanner(type, message) {
  const existing = document.getElementById('profile-banner');
  if (existing) existing.remove();

  const isSuccess = type === 'success';
  const banner = document.createElement('div');
  banner.id = 'profile-banner';
  banner.style.cssText = `
    display: flex;
    align-items: center;
    gap: 10px;
    padding: 10px 14px;
    border-radius: 8px;
    font-size: 13px;
    font-weight: 500;
    margin-top: 10px;
    animation: fadeIn 0.25s ease;
    background: ${isSuccess ? '#eaf6ec' : '#fdecea'};
    border: 1px solid ${isSuccess ? '#a8d5b0' : '#f5c6c6'};
    color: ${isSuccess ? '#1e6b30' : '#c0392b'};
  `;

  banner.innerHTML = `
    <span style="
      width: 20px; height: 20px; border-radius: 50%;
      border: 2px solid ${isSuccess ? '#1e6b30' : '#c0392b'};
      display: flex; align-items: center; justify-content: center;
      font-size: 11px; font-weight: bold; flex-shrink: 0;
    ">${isSuccess ? '✓' : '!'}</span>
    <span style="flex: 1;">${message}</span>
    <span onclick="this.parentElement.remove()" style="
      cursor: pointer; font-size: 16px; color: inherit; opacity: 0.6; padding: 0 2px;
    ">&times;</span>
  `;

  const updateBtn = document.querySelector('[onclick="updateProfile()"]');
  if (updateBtn) {
    updateBtn.parentNode.insertBefore(banner, updateBtn);
  }

  setTimeout(() => { if (banner.parentNode) banner.remove(); }, 4000);
}

function requestDocument() {
  if (!loggedInUser || !loggedInUser.username) {
    alert('You must be logged in to request a document.');
    return;
  }
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
    if (data.success) {
      alert('Document request submitted successfully!');
      loadMyRequests();
    } else {
      alert('Failed: ' + (data.message || 'Unknown error'));
    }
  })
  .catch(err => {
    console.error('Full error:', err);
    alert("Error: " + err.message);
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
    <h2>Document Requests</h2>
    <table>
      <thead>
        <tr>
          <th>Resident</th>
          <th>Document Type</th>
          <th>Purpose</th>
          <th>Status</th>
          <th>Gov ID</th>
          <th>2x2 Picture</th>
          <th>Set Date</th>
          <th>Set Time</th>
          <th>Actions</th>
        </tr>
      </thead>
      <tbody>
        ${filteredRequests.map((r, i) => `
          <tr style="background-color:${r.status==='Approved'?'#d4edda':r.status==='Rejected'?'#f8d7da':'#fff'}">
           <td>${r.username}</td>
           <td>${r.document_type}</td>
           <td>${r.purpose}</td>
           <td>${r.status}</td>
           <td>${r.gov_id ? `<a href="${r.gov_id}" target="_blank">View</a>` : ''}</td>
           <td>${r.photo ? `<a href="${r.photo}" download="photo-${r.username}.png">Download</a>` : ''}</td>
           <td><input type="date" id="date-${i}" value="${r.date || ''}" ${r.status!=='Pending'?'readonly':''}></td>
           <td><input type="time" id="time-${i}" value="${r.time || ''}" ${r.status!=='Pending'?'readonly':''}></td>
           <td>
             ${r.status === 'Pending' ? `
               <button class="approve-btn" data-username="${r.username}" data-doc="${r.document_type}" data-index="${i}" data-status="${r.status}">Approve</button>
               <button class="reject-btn" data-username="${r.username}" data-doc="${r.document_type}" data-status="${r.status}">Reject</button>
             ` : ''}
           </td>
          </tr>
        `).join('')}
      </tbody>
    </table>
  `;
  body.innerHTML = tableHTML;

  document.querySelectorAll('.approve-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const username = btn.getAttribute('data-username');
      const docType = btn.getAttribute('data-doc');
      const index = btn.getAttribute('data-index');
      const status = btn.getAttribute('data-status');
      if (status !== 'Pending') {
        alert('This request is already ' + status);
        return;
      }
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
      // Fetch resident profile after Google login
      fetch(`${API_BASE}/api/residents-profile?username=${data.user.username || data.user.email}`)
        .then(r => r.json())
        .then(profileData => {
          loggedInUser = { ...data.user, ...(profileData.profile || {}) };
          currentRole = loggedInUser.role || 'resident';
          localStorage.setItem("user", JSON.stringify(loggedInUser));
          showDashboard();
        })
        .catch(() => {
          loggedInUser = data.user;
          currentRole = data.user.role || 'resident';
          localStorage.setItem("user", JSON.stringify(loggedInUser));
          showDashboard();
        });
    } else {
      alert(data.message || "Google login failed");
    }
  })
  .catch(err => {
    console.error("Google login error:", err);
    alert("Server error during Google login");
  });
}

window.addEventListener('load', () => {
  const savedUser = localStorage.getItem("user");
  if (savedUser) {
    try {
      loggedInUser = JSON.parse(savedUser);
      currentRole = loggedInUser.role;
      console.log("Restored user:", loggedInUser);

      if (currentRole === 'manager') {
        openManagerPage();
      } else if (currentRole === 'dswd') {
        openDSWDPage();
      } else if (currentRole === 'resident') {
        // Re-fetch fresh profile from server to make sure username is correct
        fetch(`${API_BASE}/api/residents-profile?username=${loggedInUser.username}`)
          .then(r => r.json())
          .then(profileData => {
            if (profileData.profile) {
              loggedInUser = { ...loggedInUser, ...profileData.profile };
              localStorage.setItem("user", JSON.stringify(loggedInUser));
            }
            showDashboard();
            renderResidentWelcome();
          })
          .catch(() => {
            showDashboard();
            renderResidentWelcome();
          });
      }
    } catch (e) {
      localStorage.removeItem("user");
    }
  }
});

function showAllResidents() {
  const body = document.getElementById('dashboard-body');
  body.innerHTML = `<div style="padding:24px;"><p style="color:#888;">Loading residents...</p></div>`;

  fetch(`${API_BASE}/api/residents`)
    .then(res => res.json())
    .then(data => {
      const residents = data.residents || [];
      window._allResidentsData = residents;
      body.innerHTML = `
        <div style="padding:24px; background:#f5f6fa; min-height:100%;">
          <div style="background:#fff; border-radius:12px; border:0.5px solid #e0e0e0; overflow:hidden;">
            <div style="display:flex; align-items:center; justify-content:space-between; padding:18px 22px; border-bottom:0.5px solid #eee;">
              <span style="font-size:17px; font-weight:500; color:#1a1a1a;">All Residents</span>
              <span style="font-size:13px; color:#aaa;">${residents.length} total</span>
            </div>
            <div style="padding:12px 22px; border-bottom:0.5px solid #f0f0f0; display:flex; gap:10px; align-items:center;">
              <input type="text" placeholder="Search by name, barangay, gender..."
                oninput="filterAllResidents(this)"
                style="padding:8px 14px; border-radius:8px; border:0.5px solid #ddd; font-size:14px; flex:1; margin:0;">
              <button onclick="showDuplicateResidents()"
                style="padding:8px 18px; background:#c0392b; color:white; border:none; border-radius:8px; font-size:13px; cursor:pointer; white-space:nowrap;">
                🔍 Check Duplicates
              </button>
            </div>
            <div style="overflow-x:auto;">
              <table style="width:100%; border-collapse:collapse;">
                <thead>
                  <tr style="background:#f8f9fa;">
                    <th style="padding:12px 18px; text-align:left; font-size:13px; color:#888; font-weight:500; border-bottom:0.5px solid #eee;">#</th>
                    <th style="padding:12px 18px; text-align:left; font-size:13px; color:#888; font-weight:500; border-bottom:0.5px solid #eee;">Name</th>
                    <th style="padding:12px 18px; text-align:left; font-size:13px; color:#888; font-weight:500; border-bottom:0.5px solid #eee;">Age</th>
                    <th style="padding:12px 18px; text-align:left; font-size:13px; color:#888; font-weight:500; border-bottom:0.5px solid #eee;">Gender</th>
                    <th style="padding:12px 18px; text-align:left; font-size:13px; color:#888; font-weight:500; border-bottom:0.5px solid #eee;">Barangay</th>
                    <th style="padding:12px 18px; text-align:left; font-size:13px; color:#888; font-weight:500; border-bottom:0.5px solid #eee;">Status</th>
                    <th style="padding:12px 18px; text-align:left; font-size:13px; color:#888; font-weight:500; border-bottom:0.5px solid #eee;">House Address</th>
                    <th style="padding:12px 18px; text-align:left; font-size:13px; color:#888; font-weight:500; border-bottom:0.5px solid #eee;">Tags</th>
                    <th style="padding:12px 18px; text-align:left; font-size:13px; color:#888; font-weight:500; border-bottom:0.5px solid #eee;">Action</th>
                  </tr>
                </thead>
                <tbody id="all-residents-tbody">
                  ${residents.map((r, i) => allResidentRow(r, i)).join('')}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      `;
    })
    .catch(() => {
      body.innerHTML = `<div style="padding:24px;"><p style="color:red;">Failed to load residents.</p></div>`;
    });
}

function allResidentRow(r, i) {
  return `
    <tr onmouseover="this.style.background='#f4f7ff'" onmouseout="this.style.background=''"
      style="border-bottom:0.5px solid #f0f0f0;">
      <td style="padding:12px 18px; font-size:13px; color:#aaa;">${i + 1}</td>
      <td style="padding:12px 18px; font-size:14px; font-weight:500; color:#1a1a1a;">${r.name}</td>
      <td style="padding:12px 18px; font-size:13px; color:#555;">${r.age || 'N/A'}</td>
      <td style="padding:12px 18px; font-size:13px; color:#555;">${r.gender || 'N/A'}</td>
      <td style="padding:12px 18px; font-size:13px; color:#555;">${r.barangay || 'N/A'}</td>
      <td style="padding:12px 18px; font-size:13px; color:#555;">${r.status || 'N/A'}</td>
      <td style="padding:12px 18px; font-size:13px; color:#555;">${r.address || '—'}</td>
      <td style="padding:12px 18px;">
        <div style="display:flex; gap:6px; flex-wrap:wrap;">
          ${r.age >= 60 ? `<span style="background:#EAF3DE; color:#27500A; font-size:11px; font-weight:500; padding:3px 10px; border-radius:99px;">Senior</span>` : ''}
          ${r.pwd === 'Yes' ? `<span style="background:#FAECE7; color:#712B13; font-size:11px; font-weight:500; padding:3px 10px; border-radius:99px;">PWD</span>` : ''}
        </div>
      </td>
      <td style="padding:12px 18px;">
        <button onclick="openDSWDResidentDetail('${r.username}')"
          style="padding:6px 14px; background:#1a3f6c; color:white; border:none; border-radius:6px; font-size:12px; cursor:pointer;">
          Edit
        </button>
      </td>
    </tr>
  `;
}

function filterAllResidents(input) {
  const keyword = input.value.toLowerCase();
  const filtered = (window._allResidentsData || []).filter(r =>
    (r.name || '').toLowerCase().includes(keyword) ||
    (r.barangay || '').toLowerCase().includes(keyword) ||
    (r.gender || '').toLowerCase().includes(keyword) ||
    (r.status || '').toLowerCase().includes(keyword) ||
    (r.address || '').toLowerCase().includes(keyword)
  );
  document.getElementById('all-residents-tbody').innerHTML =
    filtered.length === 0
      ? `<tr><td colspan="9" style="padding:30px; text-align:center; color:#aaa;">No residents match your search.</td></tr>`
      : filtered.map((r, i) => allResidentRow(r, i)).join('');
}

function showDuplicateResidents() {
  const residents = window._allResidentsData || [];
  const seen = {};

  residents.forEach(r => {
    const dobClean = r.dob ? r.dob.split('T')[0] : 'nodob';
    const addressClean = r.address ? r.address.toLowerCase().trim() : 'noaddress';
    const key = `${r.name?.toLowerCase()}|${r.barangay}|${r.age}|${dobClean}|${addressClean}`;
    if (!seen[key]) seen[key] = [];
    seen[key].push(r);
  });

  const duplicates = Object.keys(seen)
    .filter(key => seen[key].length > 1)
    .map(key => ({
      key,
      name: seen[key][0].name,
      barangay: seen[key][0].barangay,
      age: seen[key][0].age,
      residents: seen[key]
    }));

  if (duplicates.length === 0) {
    alert('✅ No duplicate residents found!');
    return;
  }

  const body = document.getElementById('dashboard-body');
  body.innerHTML = `
    <div style="padding:24px; background:#f5f6fa; min-height:100%;">
      <button onclick="showAllResidents()" style="margin-bottom:16px; padding:8px 16px; background:#1a3f6c; color:white; border:none; border-radius:8px; cursor:pointer;">← Back to All Residents</button>
      <div style="background:#fff; border-radius:12px; border:0.5px solid #e0e0e0; overflow:hidden;">
        <div style="padding:18px 22px; border-bottom:0.5px solid #eee; background:#fff3f3; display:flex; align-items:center; justify-content:space-between;">
          <span style="font-size:17px; font-weight:500; color:#c0392b;">⚠️ Duplicate Residents Found: ${duplicates.length} group${duplicates.length > 1 ? 's' : ''}</span>
          <button onclick="autoRemoveAllDuplicates()"
            style="padding:8px 18px; background:#c0392b; color:white; border:none; border-radius:8px; font-size:13px; cursor:pointer;">
            🗑 Remove All Duplicates
          </button>
        </div>
        ${duplicates.map(d => `
          <div style="padding:18px 22px; border-bottom:0.5px solid #f0f0f0;">
            <div style="font-size:14px; font-weight:600; color:#1a1a1a; margin-bottom:10px;">
              ${d.name} — Age ${d.age} — ${d.barangay}
              <span style="margin-left:8px; background:#FAECE7; color:#712B13; font-size:12px; padding:3px 10px; border-radius:99px;">${d.residents.length} duplicates</span>
            </div>
            <table style="width:100%; border-collapse:collapse; font-size:13px;">
              <thead>
                <tr style="background:#f8f9fa;">
                  <th style="padding:8px 12px; text-align:left; color:#888;">Username</th>
                  <th style="padding:8px 12px; text-align:left; color:#888;">Gender</th>
                  <th style="padding:8px 12px; text-align:left; color:#888;">Status</th>
                  <th style="padding:8px 12px; text-align:left; color:#888;">Address</th>
                  <th style="padding:8px 12px; text-align:left; color:#888;">Action</th>
                </tr>
              </thead>
              <tbody>
                ${d.residents.map((r, i) => `
                  <tr style="border-bottom:0.5px solid #f0f0f0; background:${i === 0 ? '#f0fff4' : '#fff'}">
                    <td style="padding:8px 12px;">${r.username} ${i === 0 ? '<span style="background:#d4edda; color:#27500A; font-size:11px; padding:2px 8px; border-radius:99px;">Keep</span>' : ''}</td>
                    <td style="padding:8px 12px;">${r.gender || 'N/A'}</td>
                    <td style="padding:8px 12px;">${r.status || 'N/A'}</td>
                    <td style="padding:8px 12px;">${r.address || 'N/A'}</td>
                    <td style="padding:8px 12px;">
                      ${i !== 0 ? `
                        <button onclick="deleteDuplicateResident('${r.username}')"
                          style="padding:5px 12px; background:#c0392b; color:white; border:none; border-radius:6px; font-size:12px; cursor:pointer;">
                          Delete
                        </button>
                      ` : '<span style="color:#aaa; font-size:12px;">Original</span>'}
                    </td>
                  </tr>
                `).join('')}
              </tbody>
            </table>
          </div>
        `).join('')}
      </div>
    </div>
  `;
}

async function deleteDuplicateResident(username) {
  if (!confirm(`Delete duplicate account: ${username}? This cannot be undone.`)) return;
  try {
    const res = await fetch(`${API_BASE}/api/delete-resident/${username}`, { method: 'DELETE' });
    const data = await res.json();
    if (data.success) {
      showProfileBanner('success', `Duplicate account "${username}" removed successfully.`);
      showAllResidents();
    } else {
      showProfileBanner('error', 'Failed to delete: ' + (data.message || 'Unknown error'));
    }
  } catch (err) {
    showProfileBanner('error', 'Server error: ' + err.message);
  }
}

async function autoRemoveAllDuplicates() {
  if (!confirm('This will automatically keep the newest account and delete all older duplicates. Continue?')) return;
  try {
    const res = await fetch(`${API_BASE}/api/auto-remove-duplicates`, { method: 'POST' });
    const data = await res.json();
    if (data.success) {
      alert(`✅ Done! ${data.removed} duplicate account(s) removed.`);
      showAllResidents();
    } else {
      alert('Failed: ' + (data.message || 'Unknown error'));
    }
  } catch (err) {
    alert('Server error: ' + err.message);
  }
}

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
