async function refreshDashboard() {
    // SECURITY CHECK: Look for the key in the URL
    const urlParams = new URLSearchParams(window.location.search);
    const secretKey = urlParams.get('key');

    // CHANGE 'agency2024' to whatever secret password you want
    if (secretKey !== 'agency2024') {
        document.body.innerHTML = `
            <div style="background:#050a0a; color:white; height:100vh; display:flex; 
            flex-direction:column; align-items:center; justify-content:center; font-family:sans-serif;">
                <h1 style="color:#ff4444;">403: Access Denied</h1>
                <p>This dashboard is for internal use only.</p>
            </div>`;
        return;
    }

    try {
        const response = await fetch('/api/stats');
        const data = await response.json();
        
        // ... rest of your existing refreshDashboard code ...
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
                const statusClass = member.isOver ? 'overbooked' : 'normal';
                
                membersHtml += `
                    <div class="member-row ${statusClass}">
                        <div class="member-header">
                            <span class="member-name">${member.name}</span>
                            <span class="member-avail">${member.hoursLeft}H REMAINING THIS WEEK</span>
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
        console.error("Dashboard refresh failed", error);
    }
}

setInterval(refreshDashboard, 30000);
refreshDashboard();