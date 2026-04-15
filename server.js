const express = require('express');
const fs = require('fs');
const path = require('path');
const app = express();
const PORT = process.env.PORT || 3000; // Render uses process.env.PORT

// Middleware to read the raw CSV text sent by Google Apps Script
app.use(express.text({ limit: '2mb' }));
app.use(express.static('public'));

const CSV_FILE_PATH = path.join(__dirname, 'latest_availability.csv');

const PODS = {
  "Pod Racers": ["Jean Piot", "Danielle Martin", "Nicole De Los Reyes", "Tara Diaz"],
  "Pod Idea Farm": ["Jorge Gomez", "Melanie Barrett", "Sydney Burgese"]
};

// 1. THE RECEIVER: This catches the data from Google Apps Script
app.post('/api/upload-csv', (req, res) => {
    try {
        const csvContent = req.body;
        if (!csvContent || csvContent.length < 10) {
            return res.status(400).send("Invalid CSV data received.");
        }

        fs.writeFileSync(CSV_FILE_PATH, csvContent, 'utf8');
        console.log("CSV Updated from Google Apps Script at:", new Date().toLocaleTimeString());
        res.status(200).send("Dashboard Updated Successfully");
    } catch (err) {
        console.error("Upload Error:", err);
        res.status(500).send("Internal Server Error");
    }
});

// 2. THE PARSER: Logic to handle the specific CSV columns and dates
function parseKantataCSV(data) {
    const lines = data.split(/\r?\n/);
    const results = [];
    
    const today = new Date();
    let dayIndex = today.getDay() - 1; // 0=Mon, 1=Tue, etc.
    if (dayIndex < 0 || dayIndex > 4) dayIndex = 0; // Default to Mon on weekends

    for (let i = 1; i < lines.length; i++) {
        const row = lines[i].split(/,(?=(?:(?:[^"]*"){2})*[^"]*$)/);
        if (row.length < 6) continue;

        let userName = row[0].replace(/"/g, '').trim();
        // Flip "Last, First" to "First Last"
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

// 3. THE API: Feeds the frontend dashboard
app.get('/api/stats', (req, res) => {
    try {
        if (!fs.existsSync(CSV_FILE_PATH)) {
            return res.json({ pulse: "Waiting for first sync...", pods: [] });
        }

        const fileContent = fs.readFileSync(CSV_FILE_PATH, 'utf8');
        const teamData = parseKantataCSV(fileContent);

        const livePods = Object.keys(PODS).map(podName => {
            const members = PODS[podName].map(name => {
                const match = teamData.find(u => u.name.toLowerCase().includes(name.toLowerCase()));
                const availHours = match ? match.available : 0;
                const schedHours = match ? match.scheduled : 0;
                const loadPercent = Math.round((schedHours / 40) * 100);

                return {
                    name: name,
                    hoursLeft: availHours.toFixed(1),
                    avail: loadPercent,
                    isOver: availHours < 0 
                };
            });
            return { name: podName, members };
        });

        res.json({
            projectCount: 14, 
            taskCount: 82,    
            pulse: `STATION ACTIVE: ${new Intl.DateTimeFormat('en-US', {weekday: 'long'}).format(new Date())}`,
            lastUpdate: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
            pods: livePods
        });
    } catch (err) {
        res.status(500).json({ error: "Parse Error" });
    }
});

app.listen(PORT, () => console.log(`SERVER RUNNING ON PORT ${PORT}`));