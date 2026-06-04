let trendChartInstance = null;

function renderTrendChart(historyData) {
    const canvasElement = document.getElementById('trendChart');
    if (!canvasElement) return;
    
    const ctx = canvasElement.getContext('2d');
    
    // Sort chronologically to guarantee correct trend flow mapping
    const sortedHistory = [...historyData].sort((a, b) => new Date(a.date) - new Date(b.date));
    
    const labels = sortedHistory.map(h => h.date);
    const dataPoints = sortedHistory.map(h => h.overdue);

    // If the chart instance exists, smoothly transition data points to avoid rebuild overhead
    if (trendChartInstance) {
        trendChartInstance.data.labels = labels;
        trendChartInstance.data.datasets[0].data = dataPoints;
        trendChartInstance.update();
        return;
    }

    // Build the structural line chart with color patterns matching the core system layout
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
            plugins: {
                legend: { display: false }
            },
            scales: {
                x: {
                    grid: { color: '#262626' },
                    ticks: { 
                        color: '#8c8c8c', 
                        font: { size: 10, family: 'sans-serif' },
                        maxRotation: 45,
                        minRotation: 45
                    }
                },
                y: {
                    grid: { color: '#262626' },
                    ticks: { 
                        color: '#8c8c8c', 
                        font: { size: 10, family: 'sans-serif' },
                        stepSize: 10 
                    },
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

        // Populate Top Header Metric Counters Globally
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

        // Dynamically build individual Pod Member rows
        data.pods.forEach(pod => {
            const podDiv = document.createElement('div');
            podDiv.className = 'pod-card';
            let html = `<h3>${pod.name}</h3>`;
            
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
            container.appendChild(podDiv);
        });

        // Push historical payload directly to the rendering module
        if (data.history && data.history.length > 0) {
            renderTrendChart(data.history);
        }

    } catch (e) { console.error("Refresh Logic Exception", e); }
}

// Check for updates every 30 seconds
setInterval(refreshDashboard, 30000);
refreshDashboard();