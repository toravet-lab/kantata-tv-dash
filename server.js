const express = require('express');
const fs = require('fs');
const path = require('path');
const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.text({ limit: '2mb' }));
app.use(express.static('public'));

const CSV_FILE_PATH = path.join(__dirname, 'latest_availability.csv');

const PODS = {
  "Pod Racers": ["Jean Piot", "Danielle Martin", "Nicole De Los Reyes", "Tara Diaz"],
  "Pod Idea Farm": ["Jorge Gomez", "Melanie Barrett", "Sydney Burgese"]
};

app.post('/api/upload-csv', (req, res) => {
    try {
        if (!req.body) return res.status(400).send("No data");
        fs.writeFileSync(CSV_FILE_PATH, req.body, 'utf8');
        res.status(200).send("Dashboard Updated Successfully");
    } catch (err) { res.status(500).send("Server Error"); }
});

function parseKantataCSV(data) {
    const lines = data.split(/\r?\n/);
    const results = [];
    const nyTime = new Date().toLocaleString("en-US", {timeZone: "America/New_York"});
    const dateObj = new Date(nyTime);
    let dayIndex = dateObj.getDay() - 1; 
    if (dayIndex < 0 || dayIndex > 4) dayIndex = 0; 

    for (let i = 1; i < lines.length; i++) {
        const row = lines[i].split(/,(?=(?:(?:[^"]*"){2})*[^"]*$)/);
        if (row.length < 6) continue;

        let userName = row[0].replace(/"/g, '').trim();
        if (userName.includes(',')) {
            const parts = userName.split(',');
            userName = `${parts[1].trim()} ${parts[0].trim()}`;
        }

        const m = parseFloat(row[1].replace(/"/g, '')) || 0;
        const t = parseFloat(row[2].replace(/"/g, '')) || 0;
        const w = parseFloat(row[3].replace(/"/g, '')) || 0;
        const th = parseFloat(row[4].replace(/"/g, '')) || 0;
        const f = parseFloat(row[5].replace(/"/g, '')) || 0;
        const week = [m, t, w, th, f];

        // UTILIZATION MATH: (40h capacity - sum of availability) / 40h
        const totalWeeklyAvail = m + t + w + th + f;
        const totalWeeklyScheduled = 40 - totalWeeklyAvail;
        const utilPercent = Math.round((totalWeeklyScheduled / 40) * 100);

        // REMAINING HOURS: Only today through Friday
        const remainingAvail = week.slice(dayIndex).reduce((a, b) => a + b, 0);

        results.push({ name: userName, available: remainingAvail, percent: utilPercent });
    }
    return results;
}

app.get('/api/stats', (req, res) => {
    try {
        if (!fs.existsSync(CSV_FILE_PATH)) return res.json({ pulse: "Waiting...", pods: [] });
        const teamData = parseKantataCSV(fs.readFileSync(CSV_FILE_PATH, 'utf8'));

        const livePods = Object.keys(PODS).map(podName => {
            const members = PODS[podName].map(name => {
                const match = teamData.find(u => u.name.toLowerCase().includes(name.toLowerCase()));
                return {
                    name: name,
                    hoursLeft: match ? match.available.toFixed(1) : "0.0",
                    percent: match ? match.percent : 0,
                    isOver: match ? (match.percent > 100) : false 
                };
            });
            return { name: podName, members };
        });

        const currentDay = new Intl.DateTimeFormat('en-US', {weekday: 'long', timeZone: 'America/New_York'}).format(new Date());

        res.json({
            projectCount: 14, 
            taskCount: 82,
            pulse: `RESOURCE AVAILABILITY: ${currentDay.toUpperCase()}`,
            lastUpdate: new Date().toLocaleTimeString('en-US', { timeZone: 'America/New_York', hour: '2-digit', minute: '2-digit' }),
            pods: livePods
        });
    } catch (err) { res.status(500).json({ error: "Fail" }); }
});

app.listen(PORT, () => console.log(`Command Center Live` ));