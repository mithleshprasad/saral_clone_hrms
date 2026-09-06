export function loadSettings() {
    const contentArea = document.getElementById('content-area');
    contentArea.innerHTML = `
        <div class="erp-container" style="display:flex; height:100%; flex-direction:column;">
             <div class="erp-toolbar" style="padding:10px; background:#f1f5f9; border-bottom:1px solid #e2e8f0;">
                <h3 style="margin:0; font-size:16px;">⚙️ Application Settings</h3>
             </div>

             <div class="erp-split-view" style="flex:1; overflow:hidden;">
                 <!-- Left: Sidebar -->
                 <div class="erp-list-pane" style="width:200px; background:#f8fafc; border-right:1px solid #e2e8f0;">
                     <div class="settings-nav-item active" onclick="switchSettingTab('general', this)">General</div>
                     <div class="settings-nav-item" onclick="switchSettingTab('branding', this)">Branding</div>
                     <div class="settings-nav-item" onclick="switchSettingTab('notifications', this)">Notifications</div>
                     <div class="settings-nav-item" onclick="switchSettingTab('salary', this)">Salary Components</div>
                     <div class="settings-nav-item" onclick="switchSettingTab('payroll-leave', this)">Payroll & Leave</div>
                     <div class="settings-nav-item" onclick="switchSettingTab('documents-config', this)">Document Config</div>
                     <div class="settings-nav-item" onclick="switchSettingTab('database', this)">Database Maintenance</div>
                     <div class="settings-nav-item" onclick="switchSettingTab('security', this)">Security & Users</div>
                     <div class="settings-nav-item" onclick="switchSettingTab('modules', this)">Module Rights</div>
                 </div>

                 <!-- Right: Content -->
                 <div class="erp-detail-pane" style="padding:20px; overflow-y:auto; background:#fff;">
                     
                     <!-- General Settings -->
                     <div id="set-general" class="setting-tab-content">
                        <h4 style="border-bottom:2px solid #3b82f6; padding-bottom:5px; margin-top:0;">Appearance</h4>
                        <div class="form-row">
                            <label class="form-label" style="width:150px;">Theme</label>
                            <select class="form-control" style="width:200px;">
                                <option value="light">Light (Default)</option>
                                <option value="dark">Dark</option>
                            </select>
                        </div>
                        <div class="form-row">
                            <label class="form-label" style="width:150px;">Date Format</label>
                            <select class="form-control" style="width:200px;">
                                <option value="dd-mm-yyyy">DD-MM-YYYY</option>
                                <option value="mm-dd-yyyy">MM-DD-YYYY</option>
                            </select>
                        </div>
                         <button class="btn-blue" onclick="alert('Settings Saved (Mock)')">Save Preferences</button>
                     </div>

                     <!-- Branding Settings -->
                     <div id="set-branding" class="setting-tab-content" style="display:none;">
                        <h4 style="border-bottom:2px solid #3b82f6; padding-bottom:5px; margin-top:0;">Application Branding</h4>
                        <div class="erp-fieldset">
                            <div class="erp-legend">Identity</div>
                            <div class="form-row">
                                <label class="form-label">Application Name</label>
                                <input type="text" id="brand-app-name" class="form-input" placeholder="e.g. Acme Corp HRMS">
                            </div>
                            <div class="form-row">
                                <label class="form-label">Logo Image</label>
                                <div style="display:flex; gap:10px; flex-direction:column;">
                                    <div style="display:flex; gap:10px; align-items:center;">
                                        <button class="btn-teal" style="font-size:12px; padding:5px 10px;" onclick="document.getElementById('brand-logo-file').click()"><i class="fas fa-upload"></i> Upload Image</button>
                                        <input type="file" id="brand-logo-file" accept="image/*" style="display:none;" onchange="handleLogoUpload(this)">
                                        <span id="brand-logo-name" style="font-size:12px; color:#666;"></span>
                                    </div>
                                    <textarea id="brand-logo" class="form-input" style="height:60px;" placeholder="Base64 Data / URL will appear here..."></textarea>
                                </div>
                            </div>
                            <p style="font-size:11px; color:#888;">Note: Uploaded images are converted to Base64 automatically. Changes apply after restart/reload.</p>
                            <button class="btn-blue" onclick="saveBranding()">Apply Branding</button>
                        </div>
                     </div>

                     <!-- Notifications Settings -->
                     <div id="set-notifications" class="setting-tab-content" style="display:none;">
                        <h4 style="border-bottom:2px solid #3b82f6; padding-bottom:5px; margin-top:0;">Notifications Preferences</h4>
                        <div class="erp-fieldset">
                            <div class="erp-legend">Startup Alerts</div>
                            <div class="form-row">
                                <label style="display:flex; align-items:center; gap:10px; cursor:pointer;">
                                    <input type="checkbox" id="notif-bday" onchange="toggleSetting('notify_birthdays', this)">
                                    <span>Show Employee Birthdays</span>
                                </label>
                            </div>
                            <div class="form-row">
                                <label style="display:flex; align-items:center; gap:10px; cursor:pointer;">
                                    <input type="checkbox" id="notif-anniv" onchange="toggleSetting('notify_anniversaries', this)">
                                    <span>Show Work Anniversaries</span>
                                </label>
                            </div>
                        </div>
                     </div>

                     <!-- Security Setting -->
                     <div id="set-security" class="setting-tab-content" style="display:none;">
                        <h4 style="border-bottom:2px solid #3b82f6; padding-bottom:5px; margin-top:0;">Account Security</h4>
                        
                        <div class="erp-fieldset">
                             <div class="erp-legend">Admin Profile</div>
                             <div class="form-row"><label class="form-label">Username</label><input type="text" id="sec-username" class="form-input" disabled></div>
                             
                             <div style="margin-top:10px; border-top:1px dashed #ccc; padding-top:10px;">
                                <div style="font-weight:bold; margin-bottom:5px;">Change Password</div>
                                <div class="form-row">
                                    <label class="form-label">New Password</label>
                                    <input type="password" id="sec-new-pass" class="form-input" placeholder="Leave empty to keep current">
                                </div>
                                <div class="form-row">
                                    <label class="form-label">Confirm Pass</label>
                                    <input type="password" id="sec-confirm-pass" class="form-input">
                                </div>
                                <button class="btn-blue" onclick="updateAdminProfile()">Update Profile</button>
                             </div>
                        </div>
                     </div>

                     <!-- Salary Heads (Legacy Code) -->
                     <div id="set-salary" class="setting-tab-content" style="display:none;">
                        <h4 style="border-bottom:2px solid #3b82f6; padding-bottom:5px; margin-top:0;">Salary Structure Configuration</h4>
                        <p style="color:#64748b; font-size:13px;">Define Earnings and Deductions available for Global Payroll.</p>
                         <div class="erp-toolbar" style="padding:5px 0;">
                             <button class="erp-btn" onclick="addSalaryHeadRow()"><i class="fas fa-plus"></i> Add Head</button>
                             <button class="erp-btn" onclick="saveSalaryHeads()"><i class="fas fa-save"></i> Save</button>
                         </div>
                         <div style="overflow-x:auto;">
                            <table class="erp-table" style="min-width:800px;">
                                <thead>
                                    <tr>
                                        <th>Name</th>
                                        <th>Code</th>
                                        <th style="width:100px;">Type</th>
                                        <th style="width:80px; text-align:center;">Prop.</th>
                                        <th style="width:80px; text-align:center;">PF</th>
                                        <th style="width:80px; text-align:center;">ESI</th>
                                        <th style="width:60px; text-align:center;">Active</th>
                                        <th style="width:40px;"></th>
                                    </tr>
                                </thead>
                                <tbody id="salary-heads-body">
                                    <!-- Loaded dynamically -->
                                </tbody>
                            </table>
                         </div>
                     </div>

                      <!-- Payroll & Leave Settings -->
                      <div id="set-payroll-leave" class="setting-tab-content" style="display:none;">
                         <h4 style="border-bottom:2px solid #3b82f6; padding-bottom:5px; margin-top:0;">Payroll & Leave Rules</h4>
                         <div class="erp-fieldset">
                             <div class="erp-legend">Payroll Period</div>
                             <div class="form-row">
                                 <label class="form-label">Month Start Day</label>
                                 <input type="number" id="set-payroll-start-day" class="form-input" min="1" max="28" placeholder="1">
                                 <span style="font-size:11px; color:#666; margin-left:10px;">(e.g. 26 means 26th of prev month to 25th of current)</span>
                             </div>
                             <div class="form-row">
                                 <label class="form-label">LOP Calculation Basis</label>
                                 <select id="set-lop-basis" class="form-input">
                                     <option value="ActualDays">Actual Days in Month</option>
                                     <option value="Fixed30">Fixed 30 Days</option>
                                 </select>
                             </div>
                         </div>
                         <div class="erp-fieldset" style="margin-top:20px;">
                             <div class="erp-legend">Overtime</div>
                             <div class="form-row">
                                 <label class="form-label">OT Rate Multiplier</label>
                                 <input type="number" step="0.1" id="set-ot-multiplier" class="form-input" placeholder="2.0">
                                 <span style="font-size:11px; color:#666; margin-left:10px;">(e.g. 2.0 = double the hourly rate)</span>
                             </div>
                         </div>
                         <div class="erp-fieldset" style="margin-top:20px;">
                             <div class="erp-legend">Probation</div>
                             <div class="form-row">
                                 <label class="form-label">Default Probation Days</label>
                                 <input type="number" id="set-probation-days" class="form-input" placeholder="90">
                                 <span style="font-size:11px; color:#666; margin-left:10px;">(used when a designation doesn't specify its own)</span>
                             </div>
                         </div>
                         <div class="erp-fieldset" style="margin-top:20px;">
                             <div class="erp-legend">Labour Welfare Fund (LWF)</div>
                             <div class="form-row">
                                 <label class="form-label">Enabled</label>
                                 <input type="checkbox" id="set-lwf-enabled">
                             </div>
                             <div class="form-row">
                                 <label class="form-label">Employee Contribution</label>
                                 <input type="number" step="0.01" id="set-lwf-employee" class="form-input" placeholder="e.g. 20">
                             </div>
                             <div class="form-row">
                                 <label class="form-label">Employer Contribution</label>
                                 <input type="number" step="0.01" id="set-lwf-employer" class="form-input" placeholder="e.g. 40">
                             </div>
                             <div class="form-row">
                                 <label class="form-label">Frequency</label>
                                 <select id="set-lwf-frequency" class="form-input">
                                     <option value="HalfYearly">Half-Yearly</option>
                                     <option value="Monthly">Monthly</option>
                                     <option value="Yearly">Yearly</option>
                                 </select>
                             </div>
                             <p style="font-size:11px; color:#94a3b8;">LWF rates vary by state and are set by the respective state government — confirm current values with your local labour department before relying on these for statutory filing.</p>
                         </div>
                         <div class="erp-fieldset" style="margin-top:20px;">
                             <div class="erp-legend">Leave Accrual Rules</div>
                             <div class="form-row">
                                 <label class="form-label">Min. Attendance Days</label>
                                 <input type="number" id="set-leave-min-days" class="form-input" min="1" max="31" placeholder="20">
                             </div>
                             <div class="form-row">
                                 <label class="form-label">Monthly PL Credit</label>
                                 <input type="number" step="0.1" id="set-leave-pl-credit" class="form-input" placeholder="1.5">
                             </div>
                             <div class="form-row">
                                 <label class="form-label">Monthly CL Credit</label>
                                 <input type="number" step="0.1" id="set-leave-cl-credit" class="form-input" placeholder="1.0">
                             </div>
                             <div class="form-row">
                                 <label class="form-label">RH Days Allowed / Year</label>
                                 <input type="number" id="set-leave-rh-quota" class="form-input" placeholder="2">
                             </div>
                         </div>
                         <div style="margin-top:20px;">
                             <button class="btn-blue" onclick="savePayrollLeaveSettings()">Save Rules</button>
                         </div>
                      </div>

                      <!-- Database Settings -->
                      <div id="set-database" class="setting-tab-content" style="display:none;">
                         <h4 style="border-bottom:2px solid #3b82f6; padding-bottom:5px; margin-top:0;">Data Management</h4>
                         
                         <div class="erp-fieldset" style="margin-bottom:20px;">
                             <div class="erp-legend">Manual Backup</div>
                             <p style="font-size:13px; color:#64748b;">Create a point-in-time backup of your system.</p>
                             <div style="display:flex; gap:10px; flex-direction:column;">
                                 <div style="display:flex; gap:10px; align-items:center;">
                                     <button class="btn-teal" onclick="performBackup(false)" style="min-width:160px;">Database Only (.sqlite)</button>
                                     <button class="btn-blue" onclick="performBackup(true)" style="min-width:160px;">Full Backup (.zip)</button>
                                 </div>
                                 <div style="margin-top:10px;">
                                     <input type="password" id="backup-pass" class="form-control" placeholder="Optional Encryption Password (DB only)" style="width:330px;">
                                 </div>
                             </div>
                             
                             <div style="margin-top:20px; border-top:1px dashed #eee; padding-top:15px;">
                                 <div style="font-weight:600; margin-bottom:10px;">Auto-Backup Settings</div>
                                 <div class="form-row">
                                     <label style="display:flex; align-items:center; gap:10px; cursor:pointer;">
                                         <input type="checkbox" id="auto-backup-chk" onchange="toggleAutoBackup(this)">
                                         <span>Enable Auto-Backup on Exit</span>
                                     </label>
                                 </div>
                                 <div class="form-row" style="margin-top:10px;">
                                     <label style="display:flex; align-items:center; gap:10px; cursor:pointer;">
                                         <input type="checkbox" id="auto-backup-full-chk" onchange="toggleAutoBackupFull(this)">
                                         <span>Include Uploaded Files in Auto-Backup</span>
                                     </label>
                                 </div>
                                 <div class="form-row" style="margin-top:15px;">
                                     <label class="form-label" style="display:block; margin-bottom:5px;">Backup Storage Location</label>
                                     <div style="display:flex; gap:10px; align-items:center;">
                                         <input type="text" id="auto-backup-path" class="form-input" readonly placeholder="Default: User Data Folder" style="flex:1;">
                                         <button class="btn-gray" onclick="selectBackupFolder()" style="padding:5px 10px; font-size:12px;">Change Folder</button>
                                     </div>
                                     <p style="font-size:11px; color:#888; margin-top:5px;">💡 Strategy: Select a folder synced with Google Drive or OneDrive to secure your data in the cloud.</p>
                                 </div>
                             </div>
                         </div>
 
                         <div class="erp-fieldset">
                             <div class="erp-legend">Restore</div>
                             <p style="font-size:13px; color:red; font-weight:bold;">⚠️ Warning: Restoring will overwrite all current data and uploaded documents.</p>
                             <div style="display:flex; gap:10px; align-items:center; flex-wrap:wrap;">
                                 <button class="btn-gray" onclick="performRestore()">Restore from File (.sqlite / .zip / .enc)</button>
                                 <input type="password" id="restore-pass" class="form-control" placeholder="Decryption Password (if needed)" style="width:250px;">
                             </div>
                         </div>
                      </div>

                       <!-- Documents Config -->
                       <div id="set-documents-config" class="setting-tab-content" style="display:none;">
                          <h4 style="border-bottom:2px solid #3b82f6; padding-bottom:5px; margin-top:0;">Document & Letter Settings</h4>
                          <div class="erp-fieldset">
                              <div class="erp-legend">Reference Number Sequence</div>
                              <div class="form-row">
                                  <label class="form-label">Letter Ref Prefix</label>
                                  <input type="text" id="set-letter-prefix" class="form-input" placeholder="e.g. REF/2026/">
                              </div>
                              <div class="form-row">
                                  <label class="form-label">Next Sequence No</label>
                                  <input type="number" id="set-letter-next-no" class="form-input" min="1" placeholder="1">
                              </div>
                              <p style="font-size:11px; color:#888;">The next document downloaded will use the prefix + sequence number (ex: REF/2026/001). The number increments automatically after each download.</p>
                          </div>
                          <div style="margin-top:20px;">
                              <button class="btn-blue" onclick="saveDocumentSettings()">Save Document Settings</button>
                          </div>
                       </div>

                     <!-- Module Rights Settings -->
                     <div id="set-modules" class="setting-tab-content" style="display:none;">
                        <h4 style="border-bottom:2px solid #3b82f6; padding-bottom:5px; margin-top:0;">Module Visibility (Rights)</h4>
                        <p style="font-size:13px; color:#64748b; margin-bottom:15px;">Enable or disable top-level modules. Changes will apply after application restart or reload.</p>
                        
                        <div class="erp-fieldset">
                             <div class="erp-legend">Active Modules</div>
                             <div class="form-row">
                                <label style="display:flex; align-items:center; gap:10px; cursor:pointer;">
                                    <input type="checkbox" id="mod-masters" class="module-chk" data-key="module_masters">
                                    <span style="font-weight:500;">Masters (Employees, Branches, etc.)</span>
                                </label>
                             </div>
                             <div class="form-row">
                                <label style="display:flex; align-items:center; gap:10px; cursor:pointer;">
                                    <input type="checkbox" id="mod-attendance" class="module-chk" data-key="module_attendance">
                                    <span style="font-weight:500;">Attendance & Leaves</span>
                                </label>
                             </div>
                             <div class="form-row">
                                <label style="display:flex; align-items:center; gap:10px; cursor:pointer;">
                                    <input type="checkbox" id="mod-payroll" class="module-chk" data-key="module_payroll">
                                    <span style="font-weight:500;">Payroll processing</span>
                                </label>
                             </div>
                             <div class="form-row">
                                <label style="display:flex; align-items:center; gap:10px; cursor:pointer;">
                                    <input type="checkbox" id="mod-reports" class="module-chk" data-key="module_reports">
                                    <span style="font-weight:500;">Reports & Analytics</span>
                                </label>
                             </div>
                             <div class="form-row">
                                <label style="display:flex; align-items:center; gap:10px; cursor:pointer;">
                                    <input type="checkbox" id="mod-documents" class="module-chk" data-key="module_documents">
                                    <span style="font-weight:500;">Documents (Letters)</span>
                                </label>
                             </div>
                        </div>
                        <div style="margin-top:20px;">
                            <button class="btn-blue" onclick="saveModuleRights()">Save Module Rights</button>
                        </div>
                     </div>

                 </div>
             </div>
        </div>
        
        <style>
            .settings-nav-item { padding: 10px 15px; cursor: pointer; border-bottom: 1px solid #e2e8f0; font-size: 14px; color: #334155; }
            .settings-nav-item:hover { background: #e0f2fe; }
            .settings-nav-item.active { background: #fff; border-left: 3px solid #3b82f6; font-weight: 600; color: #1e3a8a; }
        </style>
    `;

    // Logic
    window.switchSettingTab = (tab, el) => {
        document.querySelectorAll('.setting-tab-content').forEach(d => d.style.display = 'none');
        document.querySelectorAll('.settings-nav-item').forEach(d => d.classList.remove('active'));
        document.getElementById('set-' + tab).style.display = 'block';
        el.classList.add('active');
        if (tab === 'salary') window.loadSalaryHeads();
    };

    window.performBackup = async (full = false) => {
        const pass = document.getElementById('backup-pass').value;
        try {
            const res = await window.electronAPI.invoke('backup-database', {
                password: pass || null,
                full
            });
            if (res.success) {
                if (window.showToast) window.showToast("Backup saved successfully!");
                else alert(`Backup saved to: ${res.path}`);
            }
            else if (!res.canceled) alert("Backup failed");
        } catch (e) { alert(e.message); }
    };

    window.performRestore = async () => {
        if (!confirm("Are you sure? This will replace all current data and uploaded documents! This action CAUSES DATA LOSS of the current state.")) return;
        const pass = document.getElementById('restore-pass').value;
        try {
            const res = await window.electronAPI.invoke('restore-database', pass || null);
            if (res.success) {
                alert("Database & Files Restored. Application will reload.");
                location.reload();
            } else if (!res.canceled) alert("Restore failed");
        } catch (e) { alert(e.message); }
    };

    window.selectBackupFolder = async () => {
        try {
            const path = await window.electronAPI.invoke('select-backup-folder');
            if (path) {
                await window.electronAPI.invoke('save-setting', { key: 'auto_backup_path', value: path });
                document.getElementById('auto-backup-path').value = path;
                if (window.showToast) window.showToast("Backup location updated");
            }
        } catch (e) { console.error(e); }
    };

    window.toggleAutoBackup = async (el) => {
        try {
            await window.electronAPI.invoke('save-setting', { key: 'auto_backup_enabled', value: el.checked ? 'true' : 'false' });
            if (window.showToast) window.showToast("Auto-Backup setting updated");
        } catch (e) { console.error(e); }
    };

    window.toggleAutoBackupFull = async (el) => {
        try {
            await window.electronAPI.invoke('save-setting', { key: 'auto_backup_full', value: el.checked ? 'true' : 'false' });
            if (window.showToast) window.showToast("Auto-Backup depth updated");
        } catch (e) { console.error(e); }
    };

    window.toggleSetting = async (key, el) => {
        try {
            await window.electronAPI.invoke('save-setting', { key, value: el.checked ? 'true' : 'false' });
        } catch (e) { console.error(e); }
    };

    window.updateAdminProfile = async () => {
        try {
            const currentUser = JSON.parse(localStorage.getItem('currentUser'));
            if (!currentUser) return;

            const pass = document.getElementById('sec-new-pass').value;
            const confirm = document.getElementById('sec-confirm-pass').value;

            if (pass && pass !== confirm) {
                alert("Passwords do not match");
                return;
            }

            await window.electronAPI.invoke('update-admin-profile', {
                id: currentUser.id,
                username: document.getElementById('sec-username').value,
                newPassword: pass || null
            });

            alert("Profile Updated Successfully");
            document.getElementById('sec-new-pass').value = '';
            document.getElementById('sec-confirm-pass').value = '';
        } catch (e) { alert(e.message); }
    };

    window.handleLogoUpload = (input) => {
        if (input.files && input.files[0]) {
            const file = input.files[0];
            document.getElementById('brand-logo-name').textContent = file.name;

            const reader = new FileReader();
            reader.onload = function (e) {
                document.getElementById('brand-logo').value = e.target.result;
            }
            reader.readAsDataURL(file);
        }
    };

    window.saveBranding = async () => {
        try {
            const name = document.getElementById('brand-app-name').value;
            const logo = document.getElementById('brand-logo').value;

            await window.electronAPI.invoke('save-setting', { key: 'company_name', value: name });
            await window.electronAPI.invoke('save-setting', { key: 'company_logo', value: logo });

            alert("Branding Saved. Please restart or reload the app to see changes.");
            // Optional: force reload
            location.reload();
        } catch (e) { alert(e.message); }
    };

    window.saveModuleRights = async () => {
        try {
            const checks = document.querySelectorAll('.module-chk');
            for (const chk of checks) {
                const key = chk.dataset.key;
                const value = chk.checked ? 'true' : 'false';
                await window.electronAPI.invoke('save-setting', { key, value });
            }
            alert("Module Rights Saved. Application will reload to apply changes.");
            location.reload();
        } catch (e) { alert(e.message); }
    };

    window.addSalaryHeadRow = (data = {}) => {
        const tbody = document.getElementById('salary-heads-body');
        if (!tbody) return;
        const tr = document.createElement('tr');
        tr.dataset.id = data.id || '';
        tr.innerHTML = `
            <td><input type="text" class="form-input head-name" value="${data.name || ''}" placeholder="e.g. HRA" style="width:100%;"></td>
            <td><input type="text" class="form-input head-code" value="${data.code || ''}" placeholder="HRA" style="width:100%;"></td>
            <td>
                <select class="form-input head-type" style="width:100%;">
                    <option value="Earning" ${data.type === 'Earning' ? 'selected' : ''}>Earning</option>
                    <option value="Deduction" ${data.type === 'Deduction' ? 'selected' : ''}>Deduction</option>
                </select>
            </td>
            <td style="text-align:center;"><input type="checkbox" class="head-prop" ${data.is_proportionate !== 0 ? 'checked' : ''}></td>
            <td style="text-align:center;"><input type="checkbox" class="head-pf" ${data.consider_for_pf ? 'checked' : ''}></td>
            <td style="text-align:center;"><input type="checkbox" class="head-esi" ${data.consider_for_esi ? 'checked' : ''}></td>
            <td style="text-align:center;"><input type="checkbox" class="head-active" ${data.is_active !== 0 ? 'checked' : ''}></td>
            <td style="text-align:center;"><button class="btn-icon text-red" onclick="this.closest('tr').remove()"><i class="fas fa-times"></i></button></td>
        `;
        tbody.appendChild(tr);
    };

    window.saveSalaryHeads = async () => {
        try {
            const companyId = window.state?.companyId || document.getElementById('ctx-company')?.value;
            if (!companyId) throw new Error("Please select a company first");

            const rows = document.querySelectorAll('#salary-heads-body tr');
            for (const tr of rows) {
                const head = {
                    id: tr.dataset.id || null,
                    company_id: companyId,
                    name: tr.querySelector('.head-name').value,
                    code: tr.querySelector('.head-code').value,
                    type: tr.querySelector('.head-type').value,
                    is_proportionate: tr.querySelector('.head-prop').checked ? 1 : 0,
                    consider_for_pf: tr.querySelector('.head-pf').checked ? 1 : 0,
                    consider_for_esi: tr.querySelector('.head-esi').checked ? 1 : 0,
                    // is_active: tr.querySelector('.head-active').checked ? 1 : 0
                };

                if (!head.name) continue;
                await window.electronAPI.invoke('upsert-salary-head', head);
            }
            if (window.showToast) window.showToast("Salary Components Saved Successfully");
            else alert("Salary Components Saved Successfully");
            window.loadSalaryHeads();
        } catch (e) { alert(e.message); }
    };

    window.loadSalaryHeads = async () => {
        const companyId = window.state?.companyId || document.getElementById('ctx-company')?.value;
        if (!companyId) return;

        try {
            const heads = await window.electronAPI.invoke('get-salary-heads', { companyId });
            const tbody = document.getElementById('salary-heads-body');
            if (!tbody) return;
            tbody.innerHTML = '';

            if (heads.length === 0) {
                const defaults = [
                    { name: 'Basic', code: 'BASIC', type: 'Earning', prop: 1 },
                    { name: 'HRA', code: 'HRA', type: 'Earning', prop: 1 },
                    { name: 'Conveyance', code: 'CONVEYANCE', type: 'Earning', prop: 1 },
                    { name: 'Medical', code: 'MEDICAL', type: 'Earning', prop: 1 },
                    { name: 'Special Allowance', code: 'SPL_ALW', type: 'Earning', prop: 0 }
                ];
                defaults.forEach(d => window.addSalaryHeadRow({ name: d.name, code: d.code, type: d.type, is_proportionate: d.prop }));
            } else {
                heads.forEach(h => window.addSalaryHeadRow(h));
            }
        } catch (e) { console.error(e); }
    };

    // Load initial state
    (async () => {
        try {
            const settings = await window.electronAPI.getSettings();

            // Branding
            const brandName = settings.find(s => s.key === 'company_name');
            const brandLogo = settings.find(s => s.key === 'company_logo');
            if (brandName) setTimeout(() => document.getElementById('brand-app-name').value = brandName.value, 100);
            if (brandLogo) setTimeout(() => document.getElementById('brand-logo').value = brandLogo.value, 100);

            // Auto Backup
            const auto = settings.find(s => s.key === 'auto_backup_enabled');
            const autoPath = settings.find(s => s.key === 'auto_backup_path');
            const autoFull = settings.find(s => s.key === 'auto_backup_full');

            if (auto && auto.value === 'true') {
                setTimeout(() => {
                    const chk = document.getElementById('auto-backup-chk');
                    if (chk) chk.checked = true;
                }, 100);
            }
            if (autoPath) {
                setTimeout(() => {
                    const el = document.getElementById('auto-backup-path');
                    if (el) el.value = autoPath.value;
                }, 100);
            }
            if (autoFull && autoFull.value === 'true') {
                setTimeout(() => {
                    const chk = document.getElementById('auto-backup-full-chk');
                    if (chk) chk.checked = true;
                }, 100);
            }

            // Notifications
            ['notif-bday', 'notif-anniv'].forEach(id => {
                const key = id === 'notif-bday' ? 'notify_birthdays' : 'notify_anniversaries';
                const s = settings.find(x => x.key === key);
                // Default true if not found? Let's assume default false if not set
                if (s && s.value === 'true') {
                    setTimeout(() => {
                        const el = document.getElementById(id);
                        if (el) el.checked = true;
                    }, 100);
                }
            });

            // Modules
            ['masters', 'attendance', 'payroll', 'reports', 'documents'].forEach(m => {
                const s = settings.find(x => x.key === `module_${m}`);
                if (s) {
                    setTimeout(() => {
                        const el = document.getElementById(`mod-${m}`);
                        if (el) el.checked = s.value === 'true';
                    }, 100);
                } else {
                    // Default true if not in DB yet
                    setTimeout(() => {
                        const el = document.getElementById(`mod-${m}`);
                        if (el) el.checked = true;
                    }, 100);
                }
            });

            // Security
            const currentUser = JSON.parse(localStorage.getItem('currentUser'));
            if (currentUser) {
                setTimeout(() => {
                    const el = document.getElementById('sec-username');
                    if (el) el.value = currentUser.username;
                }, 100);
            }

            // Payroll & Leave
            const startDay = settings.find(s => s.key === 'payroll_month_start_day');
            const minDays = settings.find(s => s.key === 'leave_accrual_min_days');
            const plCredit = settings.find(s => s.key === 'leave_credit_pl');
            const clCredit = settings.find(s => s.key === 'leave_credit_cl');
            const rhQuota = settings.find(s => s.key === 'leave_rh_quota');
            const lopBasis = settings.find(s => s.key === 'lop_calculation_basis');
            const otMultiplier = settings.find(s => s.key === 'overtime_rate_multiplier');
            const probationDays = settings.find(s => s.key === 'default_probation_days');
            const lwfEnabled = settings.find(s => s.key === 'lwf_enabled');
            const lwfEmployee = settings.find(s => s.key === 'lwf_employee_amount');
            const lwfEmployer = settings.find(s => s.key === 'lwf_employer_amount');
            const lwfFrequency = settings.find(s => s.key === 'lwf_frequency');

            setTimeout(() => {
                if (startDay) document.getElementById('set-payroll-start-day').value = startDay.value;
                if (minDays) document.getElementById('set-leave-min-days').value = minDays.value;
                if (plCredit) document.getElementById('set-leave-pl-credit').value = plCredit.value;
                if (clCredit) document.getElementById('set-leave-cl-credit').value = clCredit.value;
                if (rhQuota) document.getElementById('set-leave-rh-quota').value = rhQuota.value;
                if (lopBasis) document.getElementById('set-lop-basis').value = lopBasis.value;
                if (otMultiplier) document.getElementById('set-ot-multiplier').value = otMultiplier.value;
                if (probationDays) document.getElementById('set-probation-days').value = probationDays.value;
                if (lwfEnabled) document.getElementById('set-lwf-enabled').checked = lwfEnabled.value === 'true';
                if (lwfEmployee) document.getElementById('set-lwf-employee').value = lwfEmployee.value;
                if (lwfEmployer) document.getElementById('set-lwf-employer').value = lwfEmployer.value;
                if (lwfFrequency) document.getElementById('set-lwf-frequency').value = lwfFrequency.value;

                // Document Settings
                const refPrefix = settings.find(s => s.key === 'letter_ref_prefix');
                const refNextNo = settings.find(s => s.key === 'letter_ref_current_no');
                if (refPrefix) document.getElementById('set-letter-prefix').value = refPrefix.value;
                if (refNextNo) document.getElementById('set-letter-next-no').value = refNextNo.value;
            }, 100);

        } catch (e) { }
    })();
}

window.savePayrollLeaveSettings = async () => {
    try {
        const startDay = document.getElementById('set-payroll-start-day').value || '1';
        const minDays = document.getElementById('set-leave-min-days').value || '20';
        const plCredit = document.getElementById('set-leave-pl-credit').value || '1.5';
        const clCredit = document.getElementById('set-leave-cl-credit').value || '1.0';
        const rhQuota = document.getElementById('set-leave-rh-quota').value || '2';
        const lopBasis = document.getElementById('set-lop-basis').value || 'ActualDays';
        const otMultiplier = document.getElementById('set-ot-multiplier').value || '2.0';
        const probationDays = document.getElementById('set-probation-days').value || '90';
        const lwfEnabled = document.getElementById('set-lwf-enabled').checked ? 'true' : 'false';
        const lwfEmployee = document.getElementById('set-lwf-employee').value || '0';
        const lwfEmployer = document.getElementById('set-lwf-employer').value || '0';
        const lwfFrequency = document.getElementById('set-lwf-frequency').value || 'HalfYearly';

        await window.electronAPI.invoke('save-setting', { key: 'payroll_month_start_day', value: startDay });
        await window.electronAPI.invoke('save-setting', { key: 'leave_accrual_min_days', value: minDays });
        await window.electronAPI.invoke('save-setting', { key: 'leave_credit_pl', value: plCredit });
        await window.electronAPI.invoke('save-setting', { key: 'leave_credit_cl', value: clCredit });
        await window.electronAPI.invoke('save-setting', { key: 'leave_rh_quota', value: rhQuota });
        await window.electronAPI.invoke('save-setting', { key: 'lop_calculation_basis', value: lopBasis });
        await window.electronAPI.invoke('save-setting', { key: 'overtime_rate_multiplier', value: otMultiplier });
        await window.electronAPI.invoke('save-setting', { key: 'default_probation_days', value: probationDays });
        await window.electronAPI.invoke('save-setting', { key: 'lwf_enabled', value: lwfEnabled });
        await window.electronAPI.invoke('save-setting', { key: 'lwf_employee_amount', value: lwfEmployee });
        await window.electronAPI.invoke('save-setting', { key: 'lwf_employer_amount', value: lwfEmployer });
        await window.electronAPI.invoke('save-setting', { key: 'lwf_frequency', value: lwfFrequency });

        alert("Leave & Payroll Settings Saved Successfully");
    } catch (e) { alert("Error: " + e.message); }
};

window.saveDocumentSettings = async () => {
    try {
        const prefix = document.getElementById('set-letter-prefix').value || `REF/${new Date().getFullYear()}/`;
        const nextNo = document.getElementById('set-letter-next-no').value || '1';

        await window.electronAPI.invoke('save-setting', { key: 'letter_ref_prefix', value: prefix });
        await window.electronAPI.invoke('save-setting', { key: 'letter_ref_current_no', value: nextNo });

        alert("Document Settings Saved Successfully");
    } catch (e) { alert("Error: " + e.message); }
};
