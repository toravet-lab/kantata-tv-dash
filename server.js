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
    
    // Ensure we are calculating based on NY Time
    const nyTime = new Date().toLocaleString("en-US", {timeZone: "America/New_York"});
    const dateObj = new Date(nyTime);
    let dayIndex = dateObj.getDay() - 1; // 0=Mon, 1=Tue...
    if (dayIndex < 0 || dayIndex > 4) dayIndex = 0; 

    for (let i = 1; i < lines.length; i++) {
        const row = lines[i].split(/,(?=(?:(?:[^"]*"){2})*[^"]*$)/);
        if (row.length < 6) continue;

        let userName = row[0].replace(/"/g, '').trim();
        if (userName.includes(',')) {
            const parts = userName.split(',');
            userName = `${parts[1].trim()} ${parts[0].trim()}`;
        }

        const allDaysAvail = row.slice(1, 6).map(val => parseFloat(val.replace(/"/g, '')) || 0);
        
        // MATH: Kantata Utilization %
        // Total Scheduled = 40h standard - Sum of all availability in the CSV
        const totalAvailRemaining = allDaysAvail.slice(dayIndex).reduce((a, b) => a + b, 0);
        const totalWeeklyScheduled = 40 - allDaysAvail.reduce((a, b) => a + b, 0);
        
        // This allows percentages > 100% (e.g., Sydney at 112%)
        const utilPercent = Math.round((totalWeeklyScheduled / 40) * 100);

        results.push({ 
            name: userName, 
            available: totalAvailRemaining, 
            percent: utilPercent 
        });
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
                    isOver: match ? (match.available < 0 || match.percent > 100) : false 
                };
            });
            return { name: podName, members };
        });

        const currentDay = new Intl.DateTimeFormat('en-US', {weekday: 'long', timeZone: 'America/New_York'}).format(new Date());

        res.json({
            projectCount: 14, 
            taskCount: 82,
            pulse: `RESOURCE AVAILABILITY: ${currentDay.toUpperCase()}`,
            lastUpdate: new Date().toLocaleTimeString('en-US', { 
                timeZone: 'America/New_York', 
                hour: '2-digit', 
                minute: '2-digit' 
            }),
            pods: livePods
        });
    } catch (err) { res.status(500).json({ error: "Fail" }); }
});

app.listen(PORT, () => console.log(`Dashboard Online on ${PORT}`));