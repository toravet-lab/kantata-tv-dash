let trendChartInstance = null;

function renderTrendChart(historyData) {
    const canvasElement = document.getElementById('trendChart');
    if (!canvasElement) return;
    
    const ctx = canvasElement.getContext('2d');
    const sortedHistory = [...historyData].sort((a, b) => new Date(a.date) - new Date(b.date));
    
    const labels = sortedHistory.map(h => h.date);
    const dataPoints = sortedHistory.map(h => h.overdue);

    if (trendChartInstance) {
        trendChartInstance.data.labels = labels;
        trendChartInstance.data.datasets[0].data = dataPoints;
        trendChartInstance.update();
        return;
    }

    trendChartInstance = new Chart(ctx, {
        type: 'line',
        data: {
            labels: labels,
            datasets: [{
                label: 'Overdue Count',
                data: dataPoints,
                borderColor: '#e06666', 
                backgroundColor: 'rgba(224, 102, 102, 0.08)',
                borderWidth: 3,
                tension: 0.25,
                pointBackgroundColor: '#ffffff',
                pointBorderColor: '#e06666',
                pointRadius: 4,
                pointHoverRadius: 6
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: { legend: { display: false } },
            scales: {
                x: {
                    grid: { color: '#383c3e' },
                    ticks: { 
                        color: '#8c8c8c', 
                        font: { size: 10 },
                        maxRotation: 45,
                        minRotation: 45
                    }
                },
                y: {
                    grid: { color: '#383c3e' },
                    ticks: { color: '#8c8c8c', stepSize: 10 },
                    beginAtZero: true
                }
            }
        }
    });
}

async function refreshDashboard() {
    const urlParams = new URLSearchParams(window.location.search);
    if (urlParams.get('key') !== 'agency2024') {
        document.body.innerHTML = `<h1 style="color:white;text-align:center;padding-top:50px;">ACCESS DENIED</h1>`;
        return;
    }

    try {
        const response = await fetch('/api/stats');
        const data = await response.json();

        // Populate Top Header Counters Globally
        document.getElementById('project-count').textContent = data.projects;
        document.getElementById('started-count').textContent = data.started;
        document.getElementById('not-started-count').textContent = data.notStarted;
        document.getElementById('overdue-count').textContent = data.overdue;
        document.getElementById('last-update').textContent = `SYNC: ${data.lastUpdate}`;
        document.getElementById('pulse-text').textContent = data.pulse;

        const overdueWrapper = document.getElementById('overdue-wrapper');
        if (data.overdue > 0) overdueWrapper.classList.add('pulse-alert');
        else overdueWrapper.classList.remove('pulse-alert');

        // Clear target configuration drops (matching your index.html IDs)
        const teamAContainer = document.getElementById('team-a-container');
        const teamBContainer = document.getElementById('team-b-container');
        const digitalContainer = document.getElementById('digital-pod-container');
        
        if (teamAContainer) teamAContainer.innerHTML = '';
        if (teamBContainer) teamBContainer.innerHTML = '';
        if (digitalContainer) digitalContainer.innerHTML = '';

        // Dynamically parse data arrays and send to targeted UI blocks
        data.pods.forEach(pod => {
            const podDiv = document.createElement('div');
            podDiv.className = 'pod-card';
            let html = `<h3 style="margin-top: 0; margin-bottom: 20px; font-size: 1.3rem; text-transform: uppercase; color: #fff; letter-spacing: 0.5px; border-bottom: 1px solid #444; padding-bottom: 10px;">${pod.name}</h3>`;
            
            pod.members.forEach(member => {
                let status = 'status-normal';
                let label = `${member.hoursLeft}H LEFT`;
                
                if (member.isOOO) {
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
            
            // 🎯 MASTER DATA DISTRIBUTION GATEWAY
            const podNameLower = pod.name.toLowerCase();
            if (podNameLower.includes("digital")) {
                if (digitalContainer) digitalContainer.appendChild(podDiv);
            } else if (podNameLower.includes("team a")) {
                if (teamAContainer) teamAContainer.appendChild(podDiv);
            } else if (podNameLower.includes("team b")) {
                if (teamBContainer) teamBContainer.appendChild(podDiv);
            }
        });

        // Sync and refresh the graph rendering engine
        if (data.history && data.history.length > 0) {
            renderTrendChart(data.history);
        }

    } catch (e) { console.error("UI Refresh State Loop Failure", e); }
}

setInterval(refreshDashboard, 30000);
refreshDashboard();
