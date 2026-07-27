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
        // (meaning 0 scheduled hours), NOT when they have 0 available hours!
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
