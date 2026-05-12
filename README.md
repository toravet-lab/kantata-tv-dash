# 🚀 Agency Command Center

A real-time "War Room" dashboard designed for TV display, tracking team utilization, project momentum, and automated PTO reporting.

## 📊 Dashboard Overview

The dashboard provides a high-level pulse of the office by aggregating data from **Kantata (Mavenlink)** through automated exports.

* **Active Projects:** Unique count of projects with work occurring this week.
* **Started Tasks:** Momentum indicator for tasks currently in progress.
* **Upcoming Tasks:** A "Focused Pipeline" showing tasks due within the next 7 days.
* **Overdue:** Immediate red-flag alerts for missed deadlines.
* **Team Utilization:** Real-time capacity bars showing hours remaining in the day/week.


## 🛠 Tech Stack

* **Frontend:** HTML5, CSS3 (Grid/Flexbox), JavaScript (ES6)
* **Backend:** Node.js (Express) hosted on Render
* **Automation:** Google Apps Script (GAS)
* **Data Source:** Kantata API & Scheduled CSV Exports
* **Integrations:** Slack (Incoming Webhooks)


## 🛰 Data Flow Architecture

1. **Availability Data:** Kantata emails a CSV to Gmail daily. Google Apps Script (GAS) scrapes the attachment.
2. **Task Data:** A master Google Sheet receives daily task reports. GAS processes the **2nd tab** of this sheet.
3. **Processing:** GAS filters data specifically for Pod members (Racers, Idea Farm, Digital) and applies a "Focus Window" to hide backlog noise.
4. **Sync:** GAS pushes a JSON payload to the Node.js server via a POST request.
5. **Display:** The TV dashboard polls the server every 30 seconds to update the UI.
6. **Reporting:** Every Monday at 8:00 AM, a separate GAS trigger hits the Kantata API and pings **#pmteam** in Slack with a 2-week PTO Impact Report.


## ⚙️ Configuration & Environment Variables

### Google Apps Script Constants

| Variable | Description |
| --- | --- |
| `ACCESS_TOKEN` | Kantata (Mavenlink) Bearer Token |
| `RENDER_URL` | The URL of your hosted Node.js app |
| `TASKS_SHEET_ID` | ID of the master Google Sheet |
| `POD_MEMBERS` | Array of names to include in the tally |


### Slack Integration

* Uses an **Incoming Webhook** to post to `#pmteam`.
* Logic includes automatic **Risk Flags** (e.g., if >50% of a team is out).


## 🎨 UI Logic (CSS Grid)

The dashboard uses a fixed sidebar for global stats and a dynamic grid for Pod Cards.

* **Layout:** 2x2 grid (currently 2 top, 1 bottom) to allow for future pod additions.
* **Color Logic:** * 🔵 **Blue:** Normal / On Track
* 🟡 **Yellow:** At Capacity (>85%)
* 🔴 **Red:** Overbooked or Overdue


## 🚀 Deployment

1. **Server:** Push the repository to GitHub and connect to **Render**.
2. **Scripts:** Create a project at `script.google.com`.
3. **Triggers:** * `syncDashboard`: Set to "Minutes Timer" (every 15 mins).
* `runWeeklyPTOReport`: Set to "Weekly Timer" (Mondays, 8-9am).

## 📝 Maintenance Notes

* **Changing Pods:** Update the `PODS` object in `server.js` and the `POD_MEMBERS` array in the Google Script.
* **Template Detection:** The script automatically flags tasks containing `*Details Needed` in the title as **Started** to ensure PMs see pending setup items.
