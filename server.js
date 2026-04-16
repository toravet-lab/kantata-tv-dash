const express = require('express');
const fs = require('fs');
const path = require('path');
const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json({ limit: '5mb' }));
app.use(express.static('public'));

const CSV_FILE_PATH = path.join(__dirname, 'latest_availability.csv');
const COUNTS_FILE_PATH = path.join(__dirname, 'counts.json');

// LOAD EXISTING COUNTS ON RESTART
let liveCounts = { projects: 0, started: 0, notStarted: 0, overdue: 0 };
if (fs.existsSync(COUNTS_FILE_PATH)) {
    try {
        liveCounts = JSON.parse(fs.readFileSync(COUNTS_FILE_PATH, 'utf8'));
    } catch (e) { console.log("Error loading saved counts"); }
}

const PODS = {
  "Pod Racers": ["Jean Piot", "Danielle Martin", "Nicole De Los Reyes", "Tara Diaz"],
  "Pod Idea Farm": ["Jorge Gomez", "Melanie Barrett", "Sydney Burgese"]
};

app.post('/api/upload-csv', (req, res) => {
    try {
        const { csv, projectCount, startedCount, notStartedCount, overdueCount } = req.body;
        if (csv) fs.writeFileSync(CSV_FILE_PATH, csv, 'utf8');
        
        // Update local memory
        liveCounts.projects = projectCount || 0;
        liveCounts.started = startedCount || 0;
        liveCounts.notStarted = notStartedCount || 0;
        liveCounts.overdue = overdueCount || 0;

        // PERSIST TO DISK (Prevents the "0" issue)
        fs.writeFileSync(COUNTS_FILE_PATH, JSON.stringify(liveCounts), 'utf8');

        res.status(200).send("Sync Successful");
    } catch (err) { res.status(500).send("Error"); }
});

function parseKantataCSV(data) {
    const lines = data.split(/\r?\n/);
    const results = [];
    const dateObj = new Date(new Date().toLocaleString("en-US", {timeZone: "America/New_York"}));
    let dayIndex = dateObj.getDay() - 1; 
    if (dayIndex < 0 || dayIndex > 4) dayIndex = 0; 

    for (let i = 1; i < lines.length; i++) {
        const row = lines[i].split(/,(?=(?:(?:[^"]*"){2})*[^"]*$)/);
        if (row.length < 6) continue;
        let name = row[0].replace(/"/g, '').trim();
        if (name.includes(',')) {
            const p = name.split(',');
            name = `${p[1].trim()} ${p[0].trim()}`;
        }
        const hrs = row.slice(1, 6).map(v => parseFloat(v.replace(/"/g, '')) || 0);
        const totalSched = 40 - hrs.reduce((a, b) => a + b, 0);
        results.push({ 
            name, 
            available: hrs.slice(dayIndex).reduce((a, b) => a + b, 0), 
            percent: Math.round((totalSched / 40) * 100) 
        });
    }
    return results;
}

app.get('/api/stats', (req, res) => {
    try {
        let teamData = [];
        if (fs.existsSync(CSV_FILE_PATH)) teamData = parseKantataCSV(fs.readFileSync(CSV_FILE_PATH, 'utf8'));
        const pods = Object.keys(PODS).map(podName => ({
            name: podName,
            members: PODS[podName].map(mName => {
                const match = teamData.find(u => u.name.toLowerCase().includes(mName.toLowerCase()));
                return {
                    name: mName,
                    hoursLeft: match ? match.available.toFixed(1) : "0.0",
                    percent: match ? match.percent : 0,
                };
            })
        }));
        res.json({
            projectCount: liveCounts.projects, 
            startedCount: liveCounts.started,
            notStartedCount: liveCounts.notStarted,
            overdueCount: liveCounts.overdue,
            pulse: `RESOURCE MANAGEMENT: ${new Intl.DateTimeFormat('en-US', {weekday: 'long', timeZone: 'America/New_York'}).format(new Date()).toUpperCase()}`,
            lastUpdate: new Date().toLocaleTimeString('en-US', { timeZone: 'America/New_York', hour: '2-digit', minute: '2-digit' }),
            pods
        });
    } catch (err) { res.status(500).json({ error: "Fail" }); }
});

app.listen(PORT, () => console.log("Station Active with Persistence"));