async function refreshDashboard() {
    const urlParams = new URLSearchParams(window.location.search);
    const secretKey = urlParams.get('key');

    if (secretKey !== 'agency2024') {
        document.body.innerHTML = `
            <div style="background:#050a0a; color:white; height:100vh; display:flex; flex-direction:column; align-items:center; justify-content:center; font-family:sans-serif;">
                <h1 style="color:#ff4444; font-size:3rem;">ACCESS DENIED</h1>
                <p style="color:#5fb394;">This dashboard is for internal agency use only.</p>
            </div>`;
        return;
    }

    try {
        const response = await fetch('/api/stats');
        const data = await response.json();

        document.getElementById('project-count').textContent = data.projectCount;
        document.getElementById('task-count').textContent = data.taskCount;
        document.getElementById('last-update').textContent = `Last Sync: ${data.lastUpdate}`;
        document.getElementById('pulse-text').textContent = data.pulse;

        const container = document.getElementById('pods-container');
        container.innerHTML = '';

        data.pods.forEach(pod => {
            const podDiv = document.createElement('div');
            podDiv.className = 'pod-card';
            
            let membersHtml = `<h3>${pod.name}</h3>`;
            pod.members.forEach(member => {
    // Determine color status based on your new palette
    let statusClass = 'status-normal';
    if (member.percent > 80 && member.percent <= 100) statusClass = 'status-warning';
    if (member.percent > 100) statusClass = 'status-overbooked';
    
    membersHtml += `
        <div class="member-row ${statusClass}">
            <div class="member-header">
                <span class="member-name">${member.name}</span>
                <span class="member-avail">${member.hoursLeft}H REMAINING</span>
            </div>
            <div class="bar-wrapper">
                <div class="bar-bg">
                    <div class="bar-fill" style="width: ${Math.min(member.percent, 100)}%"></div>
                </div>
                <span class="bar-percent">${member.percent}%</span>
            </div>
        </div>`;
});
            podDiv.innerHTML = membersHtml;
            container.innerHTML += podDiv.outerHTML;
        });

    } catch (error) { console.error("Refresh Failed", error); }
}

setInterval(refreshDashboard, 30000);
refreshDashboard();