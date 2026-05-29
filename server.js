const express = require('express');
const fs = require('fs');
const path = require('path');
const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json({ limit: '5mb' }));
app.use(express.static('public'));

const CSV_FILE_PATH = path.join(__dirname, 'latest_availability.csv');
const COUNTS_FILE_PATH = path.join(__dirname, 'counts.json');

// Initialize with memberCounts tracking
let liveCounts = { projects: 0, started: 0, notStarted: 0, overdue: 0, memberCounts: {} };

if (fs.existsSync(COUNTS_FILE_PATH)) {
    try {
        liveCounts = JSON.parse(fs.readFileSync(COUNTS_FILE_PATH, 'utf8'));
    } catch (e) { console.log("Persistence loaded."); }
}

const PODS = {
  "Pod Racers": ["Jean Piot", "Danielle Martin", "Nicole De Los Reyes", "Tara Diaz"],
  "Pod Idea Farm": ["Jorge Gomez", "Melanie Barrett", "Sydney Burgese"],
  "Digital Team": ["Chris Campbell", "Katrina Alber"]
};

app.post('/api/upload-csv', (req, res) => {
    try {
        const { csv, projectCount, startedCount, notStartedCount, overdueCount, memberCounts } = req.body;
        if (csv) fs.writeFileSync(CSV_FILE_PATH, csv, 'utf8');
        
        liveCounts = {
            projects: projectCount || 0,
            started: startedCount || 0,
            notStarted: notStartedCount || 0,
            overdue: overdueCount || 0,
            memberCounts: memberCounts || {}
        };

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
        const availValues = row.slice(1, 6).map(v => parseFloat(v.replace(/"/g, '')) || 0);
        const totalAvailable = availValues.reduce((a, b) => a + b, 0);
        const scheduled = 40 - totalAvailable;
        const percent = Math.round((scheduled / 40) * 100);
        const currentAvail = availValues.slice(dayIndex).reduce((a, b) => a + b, 0);
        results.push({ name, available: currentAvail.toFixed(1), percent });
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
                
                // Fetch personal data tallies from saved state
                const personalData = liveCounts.memberCounts[mName.toLowerCase()] || { started: 0, overdue: 0 };
                
                return {
                    name: mName,
                    hoursLeft: match ? match.available : "0.0",
                    percent: match ? match.percent : 0,
                    startedTasks: personalData.started || 0,
                    overdueTasks: personalData.overdue || 0
                };
            })
        }));
        
        res.json({
            ...liveCounts,
            pulse: `PIPELINE ACTIVE: ${new Intl.DateTimeFormat('en-US', {weekday: 'long', timeZone: 'America/New_York'}).format(new Date()).toUpperCase()}`,
            lastUpdate: new Date().toLocaleTimeString('en-US', { timeZone: 'America/New_York', hour: '2-digit', minute: '2-digit' }),
            pods
        });
    } catch (err) { res.status(500).json({ error: "Fail" }); }
});

app.listen(PORT, () => console.log("Station Active"));