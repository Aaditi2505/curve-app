/**
 * CURVE Cloud Sync Utility
 * -----------------------
 * Handles synchronization between browser localStorage and the server JSON database.
 */

const SyncUtil = {
    // Force Clear Data Version - Change this to wipe all clients
    DATA_VERSION: 'RESET_X3D_2026_FINAL_WIPE',

    init() {
        if (localStorage.getItem('DATA_VERSION') !== this.DATA_VERSION) {
            console.warn('Version Mismatch: Clearing Local Data to ensure clean slate.');

            // PRESERVE SESSION KEYS
            const role = localStorage.getItem('role');
            const branch = localStorage.getItem('branch');
            const loggedIn = localStorage.getItem('loggedIn');

            localStorage.clear();

            // RESTORE SESSION KEYS
            if (role) localStorage.setItem('role', role);
            if (branch) localStorage.setItem('branch', branch);
            if (loggedIn) localStorage.setItem('loggedIn', loggedIn);

            localStorage.setItem('DATA_VERSION', this.DATA_VERSION);
            if (!localStorage.getItem('branch')) {
                localStorage.setItem('branch', 'X3D DENTAL');
            }
        }
    },

    // Sync status
    isSyncing: false,

    async fetchConfig() {
        try {
            const res = await fetch('/api/config');
            return await res.json();
        } catch (e) {
            console.error('Failed to fetch config', e);
            return { baseUrl: window.location.origin };
        }
    },

    /**
     * Pushes all local appointments to the server
     */
    async pushAll() {
        if (this.isSyncing) return;
        this.isSyncing = true;
        console.log('Pushing data to cloud...');

        const allLocalData = {};

        // Collect all appointments from all branches in localStorage
        for (let i = 0; i < localStorage.length; i++) {
            const key = localStorage.key(i);
            if (key.startsWith('appointments_')) {
                const data = JSON.parse(localStorage.getItem(key) || '[]');
                data.forEach(appt => {
                    if (appt.bookingId) {
                        allLocalData[appt.bookingId] = appt;
                    }
                });
            }
        }

        if (Object.keys(allLocalData).length === 0) {
            this.isSyncing = false;
            return { success: true, message: 'No local data to sync.' };
        }

        try {
            const response = await fetch('/api/save-all', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(allLocalData)
            });
            const result = await response.json();
            this.isSyncing = false;
            return result;
        } catch (e) {
            this.isSyncing = false;
            console.error('Push failed:', e);
            return { error: 'Connection failed' };
        }
    },

    /**
     * Pulls all shared data from server and merges into local storage
     * NOTE: Updated to ensure local deletions are reflected from cloud
     */
    async pullAll() {
        if (this.isSyncing) return;
        this.isSyncing = true;
        console.log('Pulling data from cloud...');

        try {
            const response = await fetch('/api/patients');
            const cloudData = await response.json();

            // Handle empty cloud data - Reset local if cloud is explicitly empty
            if (!cloudData || typeof cloudData !== 'object' || Object.keys(cloudData).length === 0) {
                this.isSyncing = false;
                console.log('Cloud is empty. Clearing relevant local branches to wrap up reset.');

                // Clear the main branches if cloud is empty
                ['X3D DENTAL', 'LIVIDUS ALIGN'].forEach(branch => {
                    localStorage.removeItem(`appointments_${branch}`);
                });

                return { success: true, count: 0 };
            }

            // Group cloud data by branch
            const cloudBranchGroups = {};
            Object.values(cloudData).forEach(appt => {
                let branch = appt.branch || 'General';
                // Standardize common branch names
                const bUpper = branch.toUpperCase();
                if (bUpper.includes('X3D') || bUpper.includes('CHENNAI') || bUpper.includes('COIMBATORE')) {
                    branch = 'X3D DENTAL';
                } else if (bUpper.includes('LIVIDUS')) {
                    branch = 'LIVIDUS ALIGN';
                }

                const key = `appointments_${branch}`;
                if (!cloudBranchGroups[key]) cloudBranchGroups[key] = [];
                cloudBranchGroups[key].push({ ...appt, branch: branch });
            });

            // Update LocalStorage for EVERY branch (Strict Mirror)
            // Use the branches we care about
            const branchesToSync = ['X3D DENTAL', 'LIVIDUS ALIGN', 'General'];

            branchesToSync.forEach(branch => {
                const key = `appointments_${branch}`;
                const data = cloudBranchGroups[key] || [];
                // Mirror logic: If we have data from cloud for this branch, we update local.
                // If cloud has 0 entries for this branch, this will effectively clear it (set to []), which is what we want.
                localStorage.setItem(key, JSON.stringify(data));
            });

            this.isSyncing = false;
            console.log('Sync complete.');
            return { success: true, count: Object.keys(cloudData).length };
        } catch (e) {
            this.isSyncing = false;
            console.error('Pull failed:', e);
            return { error: 'Connection failed' };
        }
    },

    /**
     * Permanent delete from server
     */
    async deletePatient(bookingId) {
        if (!bookingId) return;
        try {
            const res = await fetch(`/api/patient/${bookingId}`, {
                method: 'DELETE'
            });
            return await res.json();
        } catch (e) {
            console.error('Delete failed:', e);
            return { success: false, error: e.message };
        }
    },

    /**
     * Single patient save to cloud
     */
    async sharePatient(patientData) {
        if (!patientData || !patientData.bookingId) return;
        try {
            const res = await fetch('/api/share', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(patientData)
            });
            return await res.json();
        } catch (e) {
            console.error('Failed to share patient', e);
            return { success: false, error: e.message };
        }
    },

    /**
     * Migrates data from old branch names to X3DENTALS
     */
    migrateData() {
        const branchesToMigrate = ['CHENNAI', 'COIMBATORE', 'X3DENTALS', 'X3DENTAL', 'x3dental'];
        const targetBranch = 'X3D DENTAL';
        const targetKey = `appointments_${targetBranch}`;

        let targetData = JSON.parse(localStorage.getItem(targetKey) || '[]');
        let migratedAny = false;

        branchesToMigrate.forEach(oldBranch => {
            const oldKey = `appointments_${oldBranch}`;
            const oldData = localStorage.getItem(oldKey);

            if (oldData) {
                const parsedOld = JSON.parse(oldData);
                if (parsedOld.length > 0) {
                    console.log(`Migrating ${parsedOld.length} records from ${oldBranch} to ${targetBranch}`);
                    parsedOld.forEach(appt => {
                        // Avoid duplicates if already migrated
                        if (!targetData.find(a => a.bookingId === appt.bookingId)) {
                            targetData.push({ ...appt, branch: targetBranch });
                            migratedAny = true;
                        }
                    });
                }
            }
        });

        if (migratedAny) {
            localStorage.setItem(targetKey, JSON.stringify(targetData));
        }
    },

    /**
     * Resets local data to start fresh (for new branch setup)
     */
    async resetLocal() {
        const branches = ['X3D DENTAL', 'LIVIDUS ALIGN', 'General', 'X3DENTAL', 'BANGALORE', 'BRANCH'];
        branches.forEach(b => {
            localStorage.removeItem(`appointments_${b}`);
        });
        localStorage.removeItem('currentPatient');
        console.log('Local data reset complete.');
        return { success: true };
    },

    /**
     * WINES entire branch data from server (Dangerous - Admin only)
     */
    async resetBranch(branchName) {
        try {
            const res = await fetch(`/api/branch/${encodeURIComponent(branchName)}`, {
                method: 'DELETE'
            });
            return await res.json();
        } catch (e) {
            console.error('Reset branch failed:', e);
            return { success: false, error: e.message };
        }
    }
};

// Auto-Sync and Migration on load
window.addEventListener('load', () => {
    // 0. Check Version & Force Clear if needed (Preserving Session)
    SyncUtil.init();

    // 1. Run local migration & Scrub Ghosts
    SyncUtil.migrateData();
    SyncUtil.scrubGhosts(); // <--- NEW: Client-side killer for Previn/Unni

    // 2. Pull from cloud if on dashboard or other management pages
    const path = window.location.pathname;
    if (path.includes('dashboard.html') ||
        path.includes('check-appointment.html') ||
        path.includes('patient-entry.html') ||
        path.includes('patient-planning-list.html') ||
        path.includes('patient-interaction-list.html') ||
        path.includes('book-appointment.html')) { // added book-appointment to ensure ID sync

        SyncUtil.pullAll().then(() => {
            if (typeof updateStats === 'function') updateStats();
            // Re-run booking ID update if on booking page
            if (typeof updateBookingId === 'function') updateBookingId();
        });
    }
});

/**
 * UTILITY: Scrub specific ghost records client-side
 */
SyncUtil.scrubGhosts = function () {
    const ghosts = ['previn', 'unni', 'unique', 'praveen'];
    let cleaned = false;

    for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key && key.startsWith('appointments_')) {
            let data = JSON.parse(localStorage.getItem(key) || '[]');
            const initialLen = data.length;

            // Filter out ghosts by name (case insensitive)
            data = data.filter(item => {
                const name = (item.name || '').toLowerCase();
                return !ghosts.some(g => name.includes(g));
            });

            if (data.length !== initialLen) {
                console.log(`[GhostBuster] Removed ${initialLen - data.length} records from ${key}`);
                localStorage.setItem(key, JSON.stringify(data));
                cleaned = true;
            }
        }
    }

    if (cleaned) {
        console.log('Ghost records removed from local storage.');
    }
};
