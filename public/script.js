async function refreshDashboard() {
    const urlParams = new URLSearchParams(window.location.search);
    if (urlParams.get('key') !== 'agency2024') {
        document.body.innerHTML = `<div style="color:white;text-align:center;width:100%;margin-top:200px;"><h1>403: ACCESS DENIED</h1></div>`;
        return;
    }

    try {
        const response = await fetch('/api/stats');
        const data = await response.json();

        document.getElementById('project-count').textContent = data.projectCount;
        document.getElementById('task-count').textContent = data.taskCount;
        document.getElementById('last-update').textContent = `SYNC: ${data.lastUpdate}`;
        document.getElementById('pulse-text').textContent = data.pulse;

        const container = document.getElementById('pods-container');
        container.innerHTML = '';

        data.pods.forEach(pod => {
            const podDiv = document.createElement('div');
            podDiv.className = 'pod-card';
            
            let membersHtml = `<h3>${pod.name}</h3>`;
            pod.members.forEach(member => {
                let statusClass = 'status-normal';
                let labelText = `${member.hoursLeft}H LEFT`;
                
                if (member.percent > 85 && member.percent <= 100) {
                    statusClass = 'status-warning';
                    labelText = 'AT CAPACITY';
                } else if (member.percent > 100) {
                    statusClass = 'status-overbooked';
                    labelText = `OVERBOOKED (${member.hoursLeft}H)`;
                }
                
                membersHtml += `
                    <div class="member-row ${statusClass}">
                        <div class="member-header">
                            <span class="member-name">${member.name}</span>
                            <span class="status-label">${labelText}</span>
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
    } catch (e) { console.error("Refresh Error", e); }
}

setInterval(refreshDashboard, 30000);
refreshDashboard();