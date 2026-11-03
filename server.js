const express = require('express');
const fs = require('fs');
const path = require('path');
const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json({ limit: '5mb' }));
app.use(express.static('public'));

const CSV_FILE_PATH = path.join(__dirname, 'latest_availability.csv');
const COUNTS_FILE_PATH = path.join(__dirname, 'counts.json');

// 📊 Hardcoded historical backfill based on your tracking log snapshot
const historicalSeedData = [
    { date: "2026-05-25", overdue: 27 },
    { date: "2026-06-03", overdue: 36 },
    { date: "2026-06-04", overdue: 13 }
];

let liveCounts = { 
    projects: 0, 
    started: 0, 
    notStarted: 0, 
    overdue: 13, 
    memberCounts: {},
    history: historicalSeedData 
};

// Load existing persistent storage if available
if (fs.existsSync(COUNTS_FILE_PATH)) {
    try {
        const fileData = JSON.parse(fs.readFileSync(COUNTS_FILE_PATH, 'utf8'));
        liveCounts = { ...liveCounts, ...fileData };
        if (!liveCounts.history || liveCounts.history.length === 0) {
            liveCounts.history = historicalSeedData;
        }
    } catch (e) { console.log("Initializing persistent memory storage."); }
} else {
    fs.writeFileSync(COUNTS_FILE_PATH, JSON.stringify(liveCounts), 'utf8');
}

const PODS = {
  "Design Pod 1": [""],
  "Design Pod 2": [""],
  "Design Pod 3": [""]
};

app.post('/api/upload-csv', (req, res) => {
    try {
        const { csv, projectCount, startedCount, notStartedCount, overdueCount, memberCounts } = req.body;
        if (csv) fs.writeFileSync(CSV_FILE_PATH, csv, 'utf8');
        
        const todayStr = new Date().toLocaleString("en-US", {timeZone: "America/New_York"}).split(',')[0];
        const [m, d, y] = todayStr.split('/');
        const formattedDate = `${y}-${m.padStart(2, '0')}-${d.padStart(2, '0')}`;

        let currentHistory = liveCounts.history || historicalSeedData;
        const existingDayIndex = currentHistory.findIndex(h => h.date === formattedDate);

        if (existingDayIndex !== -1) {
            currentHistory[existingDayIndex].overdue = overdueCount || 0;
        } else {
            currentHistory.push({ date: formattedDate, overdue: overdueCount || 0 });
        }

        // Maintain strict sliding 10-day log window limit
        if (currentHistory.length > 10) {
            currentHistory = currentHistory.slice(-10);
        }

        liveCounts = {
            projects: projectCount || 0,
            started: startedCount || 0,
            notStarted: notStartedCount || 0,
            overdue: overdueCount || 0,
            memberCounts: memberCounts || {},
            history: currentHistory
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
        
        // 🚪 ACCURATE OOO DETECTION:
        // A user is on Vacation if they have 40.0 available hours across the week 
        // (0 scheduled hours), NOT when they have 0 available hours (which means 100% booked)!
        const isVacationData = totalAvailable === 40 && percent === 0;

        results.push({ 
            name, 
            available: currentAvail.toFixed(1), 
            percent,
            isVacationData 
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
                const personalData = liveCounts.memberCounts[mName.toLowerCase()] || { started: 0, overdue: 0 };
                
                return {
                    name: mName,
                    hoursLeft: match ? match.available : "0.0",
                    percent: match ? match.percent : 0,
                    startedTasks: personalData.started || 0,
                    overdueTasks: personalData.overdue || 0,
                    isOOO: match ? match.isVacationData : false
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
