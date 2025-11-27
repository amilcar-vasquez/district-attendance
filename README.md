# Belize Education Analytics — District Attendance

This small single-page site visualizes SIB (Statistical Institute of Belize) education data (enrollment by level and sex) and provides an export-to-PNG feature for each chart.

**Quick overview**
- **`index.html`**: page structure and chart containers. Buttons to export charts are placed in each chart card header.
- **`style.css`**: visual styling for the dashboard and the export button.
- **`data.js`**: the dataset as a JavaScript array `educationData`.
- **`script.js`**: D3-based rendering of the bar chart, donut chart, and line chart; dashboard updates; and PNG export logic.

**How data is connected**

1. `data.js` exposes an array called `educationData`. Each item represents a level/year with counts, for example:

```javascript
// data.js (example)
const educationData = [
  { year: '2019-2020', level: 'Primary', male: 30000, female: 32000 },
  { year: '2019-2020', level: 'Secondary', male: 20000, female: 21000 },
  { year: '2021-2022', level: 'Tertiary', male: 5000, female: 6200 },
  // ...more rows
];
```

2. `script.js` reads this array and filters by the selected year to build charts and KPIs. Example snippet from `script.js`:

```javascript
// get the rows for the selected year
const yearData = educationData.filter(d => d.year === selectedYear);

// compute totals used in KPI cards
const total = d3.sum(yearData, d => d.male + d.female);
const totalFem = d3.sum(yearData, d => d.female);

// render charts with the filtered `yearData`
drawBarChart(yearData);
drawDonutChart(yearData);
```

3. The line chart uses `educationData` across years grouped by `level` to show trends.

Here's the initialization and event wiring that ties the year selector to the dashboard (also from `script.js`):

```javascript
function init() {
  // Re-render when the year selection changes
  d3.select('#yearSelect').on('change', function() {
    updateDashboard(this.value);
  });

  // Initial render
  drawLineChart();
  updateDashboard('2021-2022');
}

// call once to start the app
init();
```

**Export-to-PNG feature**

- Each chart card header contains a button with class `export-chart` and a `data-target` attribute pointing to the chart container id (for example `barChart`).
- Clicking the button runs code that:
  - serializes the chart SVG,
  - rasterizes it into a canvas,
  - optionally puts the chart title at the top of the PNG,
  - triggers a download with a sanitized filename based on the chart title.

Snippet showing how the export button is wired (in `script.js`):

```javascript
// delegated handler: buttons have data-target="barChart" | "donutChart" | "lineChart"
document.addEventListener('click', (event) => {
  const btn = event.target.closest && event.target.closest('.export-chart');
  if (!btn) return;
  const target = btn.getAttribute('data-target');
  exportSVGToPNG(target, `${target}.png`);
});
```

And `exportSVGToPNG` will look for an `svg` inside the target container, serialize it, draw it to a canvas, and include the card `h2` title at top if present.