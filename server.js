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

// RECEIVE FROM GOOGLE APPS SCRIPT
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
    
    // Timezone-safe date detection
    const nyTime = new Date().toLocaleString("en-US", {timeZone: "America/New_York"});
    const dateObj = new Date(nyTime);
    let dayIndex = dateObj.getDay() - 1; // 0=Mon, 1=Tue...
    
    // Logic: If it's the weekend, show the full next week (Mon-Fri)
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
        const weeklyScheduled = 40 - allDaysAvail.reduce((a, b) => a + b, 0);
        const remainingAvail = allDaysAvail.slice(dayIndex).reduce((a, b) => a + b, 0);

        results.push({ name: userName, available: remainingAvail, scheduled: weeklyScheduled });
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
                const availHours = match ? match.available : 0;
                const schedHours = match ? match.scheduled : 0;
                
                return {
                    name: name,
                    hoursLeft: availHours.toFixed(1),
                    avail: Math.round((schedHours / 40) * 100),
                    isOver: availHours < 0 
                };
            });
            return { name: podName, members };
        });

        // Current Day for the Header
        const currentDayName = new Intl.DateTimeFormat('en-US', {
            weekday: 'long', 
            timeZone: 'America/New_York'
        }).format(new Date());

        res.json({
            projectCount: 14, 
            taskCount: 82,
            pulse: `RESOURCE AVAILABILITY: ${currentDayName.toUpperCase()}`,
            lastUpdate: new Date().toLocaleTimeString('en-US', { 
                timeZone: 'America/New_York', 
                hour: '2-digit', 
                minute: '2-digit' 
            }),
            pods: livePods
        });
    } catch (err) { res.status(500).json({ error: "Fail" }); }
});

app.listen(PORT, () => console.log(`Ready on ${PORT}`));