/**
 * CURVE Cloud Sync Utility
 * -----------------------
 * Handles synchronization between browser localStorage and the server JSON database.
 */

const SyncUtil = {
    // Force Clear Data Version - Change this to wipe all clients
    DATA_VERSION: 'STABILIZE_2026_01_19_FIX',

    init() {
        if (localStorage.getItem('DATA_VERSION') !== this.DATA_VERSION) {
            console.warn('Version Mismatch: Clearing Local Data to ensure clean slate.');
            // Only clear if absolutely necessary. For now, let's just update version to avoid data loss.
            // localStorage.clear(); 
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

            if (!cloudData || typeof cloudData !== 'object' || Object.keys(cloudData).length === 0) {
                this.isSyncing = false;
                console.log('Cloud is empty or invalid. Keeping local data.');
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
                // We only do this if we actually received data for this branch or if we want to confirm it's empty.
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
    }
};

// Auto-Sync and Migration on load
window.addEventListener('load', () => {
    // 0. Check Version & Force Clear if needed
    SyncUtil.init();

    // 1. Run local migration
    SyncUtil.migrateData();

    // 2. Pull from cloud if on dashboard or other management pages
    const path = window.location.pathname;
    if (path.includes('dashboard.html') ||
        path.includes('check-appointment.html') ||
        path.includes('patient-entry.html') ||
        path.includes('patient-planning-list.html') ||
        path.includes('patient-interaction-list.html')) {

        SyncUtil.pullAll().then(() => {
            if (typeof updateStats === 'function') updateStats();
        });
    }
});
