async function refreshDashboard() {
    const urlParams = new URLSearchParams(window.location.search);
    if (urlParams.get('key') !== 'agency2024') {
        document.body.innerHTML = `<h1 style="color:white;text-align:center;padding-top:50px;">ACCESS DENIED</h1>`;
        return;
    }

    try {
        const response = await fetch('/api/stats');
        const data = await response.json();

        document.getElementById('project-count').textContent = data.projectCount;
        document.getElementById('started-count').textContent = data.startedCount;
        document.getElementById('not-started-count').textContent = data.notStartedCount;
        document.getElementById('overdue-count').textContent = data.overdueCount;
        document.getElementById('last-update').textContent = `SYNC: ${data.lastUpdate}`;
        document.getElementById('pulse-text').textContent = data.pulse;

        const overdueWrapper = document.getElementById('overdue-wrapper');
        if (data.overdueCount > 0) overdueWrapper.classList.add('pulse-alert');
        else overdueWrapper.classList.remove('pulse-alert');

        const container = document.getElementById('pods-container');
        container.innerHTML = '';

        data.pods.forEach(pod => {
            const podDiv = document.createElement('div');
            podDiv.className = 'pod-card';
            let html = `<h3>${pod.name}</h3>`;
            pod.members.forEach(member => {
                let status = 'status-normal';
                let label = `${member.hoursLeft}H LEFT`;
                if (member.percent > 85 && member.percent <= 100) status = 'status-warning', label = 'AT CAPACITY';
                if (member.percent > 100) status = 'status-overbooked', label = `OVERBOOKED (${member.hoursLeft}H)`;
                
                html += `
                    <div class="member-row ${status}">
                        <div class="member-header">
                            <span class="member-name">${member.name}</span>
                            <span class="status-label">${label}</span>
                        </div>
                        <div class="bar-wrapper">
                            <div class="bar-bg"><div class="bar-fill" style="width:${Math.min(member.percent, 100)}%"></div></div>
                            <span class="bar-percent">${member.percent}%</span>
                        </div>
                    </div>`;
            });
            podDiv.innerHTML = html;
            container.innerHTML += podDiv.outerHTML;
        });
    } catch (e) { console.error("Refresh Error", e); }
}
setInterval(refreshDashboard, 30000);
refreshDashboard();