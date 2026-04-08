let activeUser = null;
let currentRole = null; 

// 1. CLOCK LOGIC
setInterval(() => {
    const clockElement = document.getElementById('portal-clock');
    if(clockElement) clockElement.innerText = new Date().toLocaleTimeString();
}, 1000);

// 2. PASSWORD VALIDATION
function isStrongPassword(pw) {
    return pw.length >= 10 && 
           /[A-Z]/.test(pw) && 
           /[a-z]/.test(pw) && 
           /[0-9]/.test(pw) && 
           /[^A-Za-z0-9]/.test(pw);
}

// 3. SCREEN NAVIGATION
function showScreen(id) {
    document.querySelectorAll('.glass-panel').forEach(p => p.classList.add('hidden'));
    const target = document.getElementById(id);
    if(target) target.classList.remove('hidden');
    
    if(id === 'teacher-dashboard') renderTeacherList();
    if(id === 'edit-profile-screen') loadEditFields();
}

function checkGroup(val) {
    const note = document.getElementById('group-note');
    if(note) {
        note.innerText = (val === "CADET CORPSE") ? "TRAINING IS INTENSE & PERSONNEL MUST BE DISCIPLINED" : "";
    }
}

// --- TEACHER PORTAL LOGIC ---

function loginTeacher() {
    const pass = document.getElementById('t-pass-only').value;
    const masterKey = localStorage.getItem('afiasec_admin_key') || "Admin@12345";
    if(pass === masterKey) {
        currentRole = 'teacher';
        showScreen('teacher-dashboard');
    } else {
        alert("WRONG ACCESS KEY");
    }
}

function renderTeacherList() {
    const students = JSON.parse(localStorage.getItem('afiasec_students') || "[]");
    const container = document.getElementById('student-grid');
    if(!container) return;
    
    container.innerHTML = "";

    // Stats Update
    const totalEl = document.getElementById('stat-total');
    const activeEl = document.getElementById('stat-active');
    if(totalEl) totalEl.innerText = students.length;
    if(activeEl) activeEl.innerText = students.filter(s => s.status === 'ACTIVE').length;

    if(students.length === 0) {
        container.innerHTML = "<p style='grid-column: 1/-1;'>NO RECORDS FOUND.</p>";
        return;
    }

    students.forEach(s => {
        const card = document.createElement('div');
        card.className = "student-avatar-card";
        card.onclick = () => manageStudent(s.id); 
        card.innerHTML = `
            <img src="${s.photo}" class="avatar-circle">
            <span class="avatar-name">${s.name}</span>
            <span class="avatar-id">${s.id}</span>
        `;
        container.appendChild(card);
    });
}

function manageStudent(sid) {
    const students = JSON.parse(localStorage.getItem('afiasec_students') || "[]");
    const student = students.find(s => s.id === sid);
    
    const action = prompt(`MANAGE: ${student.name}\n1: VIEW FULL ID\n2: CHANGE STATUS\n3: DELETE RECORD`, "1");

    if (action === "1") {
        renderIDCard(student);
    } else if (action === "2") {
        const newStatus = prompt("ENTER NEW STATUS (ACTIVE, EXEAT, SUSPENDED, GRADUATED):", student.status);
        if (newStatus) {
            const reason = prompt("REASON FOR STATUS CHANGE:", student.statusReason || "None");
            const idx = students.findIndex(s => s.id === sid);
            students[idx].status = newStatus.toUpperCase();
            students[idx].statusReason = reason || "N/A";
            localStorage.setItem('afiasec_students', JSON.stringify(students));
            renderTeacherList();
            alert("STATUS UPDATED");
        }
    } else if (action === "3") {
        if(confirm("PERMANENTLY DELETE THIS STUDENT?")) {
            const filtered = students.filter(s => s.id !== sid);
            localStorage.setItem('afiasec_students', JSON.stringify(filtered));
            renderTeacherList();
        }
    }
}

function filterStudents() {
    const query = document.getElementById('student-search').value.toUpperCase();
    document.querySelectorAll('.student-avatar-card').forEach(card => {
        card.style.display = card.innerText.toUpperCase().includes(query) ? "block" : "none";
    });
}

function wipeAllStudentData() {
    if (confirm("CRITICAL: Delete ALL registered students?")) {
        if (confirm("FINAL WARNING: This cannot be undone!")) {
            localStorage.setItem('afiasec_students', JSON.stringify([]));
            alert("SYSTEM RESET COMPLETE.");
            renderTeacherList();
        }
    }
}

// --- STUDENT PORTAL LOGIC ---

function handleRegister() {
    const name = document.getElementById('reg-name').value.trim().toUpperCase();
    const pass = document.getElementById('reg-pass').value;
    const photoInput = document.getElementById('reg-photo').files[0];
    const students = JSON.parse(localStorage.getItem('afiasec_students') || "[]");

    if(students.find(s => s.name === name)) return alert("NAME ALREADY REGISTERED.");
    if(!isStrongPassword(pass)) return alert("PASSWORD TOO WEAK!");
    if(!name || !photoInput) return alert("MISSING NAME OR PHOTO!");

    const reader = new FileReader();
    reader.onload = function(e) {
        const yr = document.getElementById('reg-year').value;
        let months = (yr === "1") ? 30 : (yr === "2") ? 18 : 6;
        let expiry = new Date();
        expiry.setMonth(expiry.getMonth() + months);

        const s = {
            id: "AA-" + Math.floor(100000 + Math.random() * 900000),
            name: name,
            pass: pass,
            year: yr,
            home: document.getElementById('reg-home').value.toUpperCase(),
            parent: document.getElementById('reg-parent').value,
            group: document.getElementById('reg-group').value.toUpperCase(),
            photo: e.target.result,
            status: "ACTIVE",
            statusReason: "NONE",
            expiry: expiry.getTime()
        };
        students.push(s);
        localStorage.setItem('afiasec_students', JSON.stringify(students));
        alert("REGISTERED! YOUR ID IS: " + s.id);
        showScreen('student-auth');
    };
    reader.readAsDataURL(photoInput);
}

function loginStudent() {
    const id = document.getElementById('s-id').value;
    const pass = document.getElementById('s-pass').value;
    const students = JSON.parse(localStorage.getItem('afiasec_students') || "[]");
    const user = students.find(s => s.id === id && s.pass === pass);

    if(user) {
        if(Date.now() > user.expiry) return alert("ACCOUNT EXPIRED!");
        activeUser = user;
        currentRole = 'student';
        document.getElementById('greet-user').innerText = "HI " + user.name.split(' ')[0];
        showScreen('student-dashboard');
    } else alert("INVALID ID OR PASSWORD");
}

function loadEditFields() {
    if (!activeUser) return;
    document.getElementById('edit-home').value = activeUser.home;
    document.getElementById('edit-parent').value = activeUser.parent;
}

function saveProfileChanges() {
    let students = JSON.parse(localStorage.getItem('afiasec_students'));
    let idx = students.findIndex(s => s.id === activeUser.id);

    const newHome = document.getElementById('edit-home').value.trim().toUpperCase();
    const newParent = document.getElementById('edit-parent').value.trim();
    const photoFile = document.getElementById('edit-photo').files[0];

    const updateData = (photoData = null) => {
        students[idx].home = newHome;
        students[idx].parent = newParent;
        if (photoData) students[idx].photo = photoData;
        localStorage.setItem('afiasec_students', JSON.stringify(students));
        activeUser = students[idx];
        alert("PROFILE UPDATED");
        showScreen('student-dashboard');
    };

    if (photoFile) {
        const r = new FileReader();
        r.onload = (e) => updateData(e.target.result);
        r.readAsDataURL(photoFile);
    } else updateData();
}

// --- SHARED ID & BIOMETRICS ---

function renderIDCard(targetUser = null) {
    const target = targetUser || activeUser;
    if(!target) return;

    document.getElementById('id-img').src = target.photo;
    document.getElementById('id-name-display').innerText = target.name;
    document.getElementById('id-num-display').innerText = target.id;
    document.getElementById('id-home').innerText = target.home;
    document.getElementById('id-parent').innerText = target.parent;
    document.getElementById('id-group').innerText = target.group;
    document.getElementById('id-status').innerText = target.status;
    document.getElementById('id-exeat-reason').innerText = target.statusReason;

    const qrContainer = document.getElementById("qrcode");
    qrContainer.innerHTML = ""; 
    const studentInfo = `AFIASEC ID: ${target.id}\nNAME: ${target.name}\nSTATUS: ${target.status}`;
    
    new QRCode(qrContainer, {
        text: studentInfo,
        width: 50,
        height: 50,
        correctLevel : QRCode.CorrectLevel.H
    });
    
    showScreen('id-view');
}

async function enrollFingerprint() {
    const statusLabel = document.getElementById('bio-status');
    if (window.PublicKeyCredential) {
        statusLabel.innerText = "WAITING FOR SCAN...";
        setTimeout(() => {
            statusLabel.innerText = "✅ BIOMETRIC LINKED";
            statusLabel.style.color = "var(--glow)";
            localStorage.setItem('bio_' + activeUser.id, "enabled");
        }, 2000);
    } else {
        statusLabel.innerText = "❌ HARDWARE NOT SUPPORTED";
    }
}

function closeIDView() {
    showScreen(currentRole === 'teacher' ? 'teacher-dashboard' : 'student-dashboard');
}

function logout() { location.reload(); }

// --- DYNAMIC BACKGROUND SLIDESHOW ---
const bgImages = [
    'images/bhim1.jpg', // The School Crest
    'images/bhim3.jpg', // The Main Entrance
    'images/bhim2.jpg', // Students on Campus
    'images/bhim4.jpg', // Cadet Corps
    'images/bhim6.JPG',  // School Event
	'images/bhim7.JPG',
	'images/bhim8.JPG',
	'images/bhim9.JPG',
	'images/bhim10.JPG'
];

let currentBgIndex = 0;

function startSlideshow() {
    const bgContainer = document.getElementById('bg-slideshow');
    if (!bgContainer) return;

    // Create two layers for smooth cross-fading
    bgContainer.innerHTML = `
        <div id="bg-layer-1" class="bg-layer"></div>
        <div id="bg-layer-2" class="bg-layer" style="opacity:0;"></div>
    `;

    const layer1 = document.getElementById('bg-layer-1');
    const layer2 = document.getElementById('bg-layer-2');
    
    layer1.style.backgroundImage = `url(${bgImages[0]})`;

    setInterval(() => {
        currentBgIndex = (currentBgIndex + 1) % bgImages.length;
        const nextImg = bgImages[currentBgIndex];

        // Fade in the back layer, then swap
        layer2.style.backgroundImage = `url(${nextImg})`;
        layer2.style.opacity = 1;

        setTimeout(() => {
            layer1.style.backgroundImage = `url(${nextImg})`;
            layer2.style.opacity = 0;
        }, 1000); // 1 second fade duration
    }, 5000); // 5 second stay duration
}

// Initialize slideshow when the page loads
window.addEventListener('DOMContentLoaded', startSlideshow);