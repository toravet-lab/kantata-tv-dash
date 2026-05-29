async function refreshDashboard() {
    const urlParams = new URLSearchParams(window.location.search);
    if (urlParams.get('key') !== 'agency2024') {
        document.body.innerHTML = `<h1 style="color:white;text-align:center;padding-top:50px;">ACCESS DENIED</h1>`;
        return;
    }

    try {
        const response = await fetch('/api/stats');
        const data = await response.json();

        // Populate Sidebar Globally
        document.getElementById('project-count').textContent = data.projects;
        document.getElementById('started-count').textContent = data.started;
        document.getElementById('not-started-count').textContent = data.notStarted;
        document.getElementById('overdue-count').textContent = data.overdue;
        document.getElementById('last-update').textContent = `SYNC: ${data.lastUpdate}`;
        document.getElementById('pulse-text').textContent = data.pulse;

        const overdueWrapper = document.getElementById('overdue-wrapper');
        if (data.overdue > 0) overdueWrapper.classList.add('pulse-alert');
        else overdueWrapper.classList.remove('pulse-alert');

        const container = document.getElementById('pods-container');
        container.innerHTML = '';

        // Dynamically build Pod Cards
        data.pods.forEach(pod => {
            const podDiv = document.createElement('div');
            podDiv.className = 'pod-card';
            let html = `<h3>${pod.name}</h3>`;
            
            pod.members.forEach(member => {
                let status = 'status-normal';
                let label = `${member.hoursLeft}H LEFT`;
                
                // 🚪 Out of Office Check: 0% and 0 Hours remaining
                if (member.percent === 0 && parseFloat(member.hoursLeft) === 0) {
                    status = 'status-ooo';
                    label = 'OUT OF OFFICE';
                } 
                else if (member.percent > 85 && member.percent <= 100) {
                    status = 'status-warning';
                    label = 'AT CAPACITY';
                } 
                else if (member.percent > 100) {
                    status = 'status-overbooked';
                    label = `OVERBOOKED (${member.hoursLeft}H)`;
                } 
                else if (member.percent === 0) {
                    label = 'READY';
                }

                // Inline task count tracking badges
                let badges = `<span class="badge badge-started">${member.startedTasks} Act</span>`;
                if (member.overdueTasks > 0) {
                    badges += `<span class="badge badge-overdue">${member.overdueTasks} Late</span>`;
                }

                html += `
                    <div class="member-row ${status}">
                        <div class="member-header">
                            <div class="name-badge-group">
                                <span class="member-name">${member.name}</span>
                                <div class="badges-wrapper">${badges}</div>
                            </div>
                            <span class="status-label">${label}</span>
                        </div>
                        <div class="bar-wrapper">
                            <div class="bar-bg"><div class="bar-fill" style="width:${Math.min(member.percent, 100)}%"></div></div>
                            <span class="bar-percent">${member.percent}%</span>
                        </div>
                    </div>`;
            });
            podDiv.innerHTML = html;
            container.appendChild(podDiv);
        });
    } catch (e) { console.error("Refresh Error", e); }
}

// Poll status data every 30 seconds
setInterval(refreshDashboard, 30000);
refreshDashboard();