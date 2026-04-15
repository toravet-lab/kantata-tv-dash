const express = require('express');
const fs = require('fs');
const path = require('path');
const app = express();
const PORT = 3000;

// Add this at the top with your other requires
app.use(express.text({ type: 'text/csv', limit: '2mb' }));
app.use(express.urlencoded({ extended: true }));

// ADD THIS ENDPOINT so Zapier has a place to send the data
app.post('/api/upload-csv', (req, res) => {
    try {
        const newCsvData = req.body.csvData || req.body;
        
        // Save the data received from Zapier to the local file
        fs.writeFileSync(CSV_FILE_PATH, newCsvData, 'utf8');
        
        console.log("CSV Updated via Zapier at:", new Date().toLocaleTimeString());
        res.status(200).send("Dashboard Updated");
    } catch (err) {
        console.error("Zapier Upload Error:", err);
        res.status(500).send("Upload Failed");
    }
});

const CSV_FILE_PATH = path.join(__dirname, 'latest_availability.csv');

const PODS = {
  "Pod Racers": ["Jean Piot", "Danielle Martin", "Nicole De Los Reyes", "Tara Diaz"],
  "Pod Idea Farm": ["Jorge Gomez", "Melanie Barrett", "Sydney Burgese"]
};

app.use(express.static('public'));

function parseKantataCSV(data) {
    const lines = data.split(/\r?\n/);
    const results = [];
    
    // Determine current day index (0=Mon, 1=Tue, 2=Wed, 3=Thu, 4=Fri)
    const today = new Date();
    let dayIndex = today.getDay() - 1; // getDay() returns 1 for Monday
    if (dayIndex < 0 || dayIndex > 4) dayIndex = 0; // Default to Monday if weekend

    for (let i = 1; i < lines.length; i++) {
        const row = lines[i].split(/,(?=(?:(?:[^"]*"){2})*[^"]*$)/);
        if (row.length < 6) continue;

        let userName = row[0].replace(/"/g, '').trim();
        if (userName.includes(',')) {
            const parts = userName.split(',');
            userName = `${parts[1].trim()} ${parts[0].trim()}`;
        }

        // dailyAvail columns: [1]=Mon, [2]=Tue, [3]=Wed, [4]=Thu, [5]=Fri
        const allDaysAvail = row.slice(1, 6).map(val => parseFloat(val.replace(/"/g, '')) || 0);
        
        // MATH 1: Weekly Scheduled (Total load for the whole week)
        const weeklyScheduled = 40 - allDaysAvail.reduce((a, b) => a + b, 0);
        
        // MATH 2: Remaining Availability (Today + Remaining Days)
        // If it's Wednesday (Index 2), we sum indices 2, 3, and 4.
        const remainingAvail = allDaysAvail.slice(dayIndex).reduce((a, b) => a + b, 0);

        results.push({ 
            name: userName, 
            available: remainingAvail, 
            scheduled: weeklyScheduled 
        });
    }
    return results;
}

app.get('/api/stats', (req, res) => {
    try {
        if (!fs.existsSync(CSV_FILE_PATH)) return res.json({ pulse: "Waiting...", pods: [] });

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
            pulse: `WEEK PROGRESS: ${new Intl.DateTimeFormat('en-US', {weekday: 'long'}).format(new Date())}`,
            lastUpdate: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
            pods: livePods
        });
    } catch (err) {
        res.status(500).json({ error: "Parse Error" });
    }
});

app.listen(PORT, () => console.log(`DASHBOARD READY: http://localhost:${PORT}`));