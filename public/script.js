async function refreshDashboard() {
    try {
        const response = await fetch('/api/stats');
        const data = await response.json();

        document.getElementById('project-count').textContent = data.projectCount;
        document.getElementById('task-count').textContent = data.taskCount;
        document.getElementById('last-sync-time').textContent = `Last Sync: ${data.lastUpdate}`;

        const container = document.getElementById('pods-container');
        container.innerHTML = '';

        data.pods.forEach(pod => {
            const podHtml = `
                <div class="pod-card">
                    <h3>${pod.name}</h3>
                    ${pod.members.map(member => `
                        <div class="member-row ${member.isOver ? 'overbooked' : ''}">
                            <div class="member-header">
                                <span class="member-name">${member.name}</span>
                                <span class="member-avail">${member.hoursLeft}H AVAILABLE THIS WEEK</span>
                            </div>
                            <div class="bar-container">
                                <div class="bar-bg">
                                    <div class="bar-fill" style="width: ${Math.min(member.avail, 100)}%"></div>
                                </div>
                                <span class="percent-label">${member.avail}%</span>
                            </div>
                        </div>
                    `).join('')}
                </div>
            `;
            container.innerHTML += podHtml;
        });

    } catch (e) { console.error("Sync Failed", e); }
}

setInterval(refreshDashboard, 30000);
refreshDashboard();