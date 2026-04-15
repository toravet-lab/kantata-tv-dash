async function refreshDashboard() {
    try {
        const response = await fetch('/api/stats');
        const data = await response.json();

        document.getElementById('project-count').textContent = data.projectCount;
        document.getElementById('task-count').textContent = data.taskCount;
        document.getElementById('last-update').textContent = `Last Sync: ${data.lastUpdate}`;

        const container = document.getElementById('pods-container');
        container.innerHTML = '';

        data.pods.forEach(pod => {
            const podDiv = document.createElement('div');
            podDiv.className = 'pod-card';
            
            let membersHtml = `<h3>${pod.name}</h3>`;
            
            pod.members.forEach(member => {
                const statusClass = member.isOver ? 'overbooked' : 'normal';
                
                membersHtml += `
                    <div class="member-row ${statusClass}">
                        <div class="member-header">
                            <span class="member-name">${member.name}</span>
                            <span class="member-avail">${member.hoursLeft}H AVAILABLE THIS WEEK</span>
                        </div>
                        <div class="bar-wrapper">
                            <div class="bar-bg">
                                <div class="bar-fill" style="width: ${Math.min(member.avail, 100)}%"></div>
                            </div>
                            <span class="bar-percent">${member.avail}%</span>
                        </div>
                    </div>
                `;
            });

            podDiv.innerHTML = membersHtml;
            container.innerHTML += podDiv.outerHTML;
        });

    } catch (error) {
        console.error("Sync failed", error);
    }
}

setInterval(refreshDashboard, 30000);
refreshDashboard();