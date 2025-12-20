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

        const branches = ['CHENNAI', 'BANGALORE', 'General', 'BRANCH']; // Common branch keys
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

            // Group by branch
            const branchGroups = {};
            Object.values(cloudData).forEach(appt => {
                const branch = appt.branch || 'General';
                const key = `appointments_${branch}`;
                if (!branchGroups[key]) branchGroups[key] = [];

                // Avoid duplicates in the same pull
                if (!branchGroups[key].find(a => a.bookingId === appt.bookingId)) {
                    branchGroups[key].push(appt);
                }
            });

            // Update LocalStorage
            Object.keys(branchGroups).forEach(key => {
                const local = JSON.parse(localStorage.getItem(key) || '[]');
                const merged = [...local];

                branchGroups[key].forEach(cloudAppt => {
                    const index = merged.findIndex(a => a.bookingId === cloudAppt.bookingId);
                    if (index !== -1) {
                        // Update existing if cloud data is likely newer (simplification)
                        merged[index] = cloudAppt;
                    } else {
                        merged.push(cloudAppt);
                    }
                });

                localStorage.setItem(key, JSON.stringify(merged));
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
     * Resets local data to start fresh (for new branch setup)
     */
    async resetLocal() {
        const branches = ['CHENNAI', 'BANGALORE', 'General', 'BRANCH'];
        branches.forEach(b => {
            localStorage.removeItem(`appointments_${b}`);
        });
        localStorage.removeItem('currentPatient');
        console.log('Local data reset complete.');
        return { success: true };
    }
};

// Auto-Sync on load if on dashboard
if (window.location.pathname.includes('dashboard.html')) {
    window.addEventListener('load', () => {
        SyncUtil.pullAll().then(() => {
            // Refresh counts if they exist on the page
            if (typeof updateStats === 'function') updateStats();
        });
    });
}
