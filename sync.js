/**
 * CURVE Cloud Sync Utility
 * -----------------------
 * Handles synchronization between browser localStorage and the server JSON database.
 */

const SyncUtil = {
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

        const branches = ['X3DENTALS', 'BANGALORE', 'General', 'BRANCH']; // Common branch keys
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

            if (!cloudData || typeof cloudData !== 'object') {
                this.isSyncing = false;
                return;
            }

            // Group cloud data by branch
            const cloudBranchGroups = {};
            Object.values(cloudData).forEach(appt => {
                let branch = appt.branch || 'General';
                // Migration: map old branches to X3DENTALS
                if (branch === 'CHENNAI' || branch === 'COIMBATORE') {
                    branch = 'X3DENTALS';
                }
                const key = `appointments_${branch}`;
                if (!cloudBranchGroups[key]) cloudBranchGroups[key] = [];
                cloudBranchGroups[key].push({ ...appt, branch: branch }); // Ensure appt object also has updated branch
            });

            // Update LocalStorage for EVERY branch that has data in the cloud
            // Any patient NOT in cloud but in local and matching branch should be removed
            // if we want full sync. For now, let's at least ensure cloud is mirror.
            Object.keys(cloudBranchGroups).forEach(key => {
                localStorage.setItem(key, JSON.stringify(cloudBranchGroups[key]));
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
        const branchesToMigrate = ['CHENNAI', 'COIMBATORE'];
        const targetBranch = 'X3DENTALS';
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
                    // Optional: remove old key after migration
                    // localStorage.removeItem(oldKey);
                }
            }
        });

        if (migratedAny) {
            localStorage.setItem(targetKey, JSON.stringify(targetData));
            this.pushAll(); // Save to cloud
        }
    },

    /**
     * Resets local data to start fresh (for new branch setup)
     */
    async resetLocal() {
        const branches = ['X3DENTALS', 'BANGALORE', 'General', 'BRANCH'];
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
