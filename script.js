// Global Config
// Margins and shared constants used across chart renderers
const margin = { top: 30, right: 30, bottom: 50, left: 60 };
const colors = { male: "#006a6a", female: "#ffb4ab" };
const tooltip = d3.select("#tooltip")

// --- Init Function ---
function init() {
    // Wire the year selector to re-render the dashboard when selection
    // changes. The selector values match `educationData[].year` entries.
    d3.select("#yearSelect").on("change", function() {
        updateDashboard(this.value);
    });

    // Initial rendering: trends (line chart) use the whole dataset; the
    // dashboard view defaults to a reasonable recent year.
    drawLineChart(); // Static trend chart
    updateDashboard("2021-2022"); // Default view
}

function updateDashboard(selectedYear) {
    // Filter dataset for the requested year and compute several KPIs
    const yearData = educationData.filter(d => d.year === selectedYear);

    // --- KPIs: totals and breakdowns ---
    const total = d3.sum(yearData, d => d.male + d.female);
    const totalFem = d3.sum(yearData, d => d.female);
    const totalMale = d3.sum(yearData, d => d.male);

    d3.select("#totalVal").text(total.toLocaleString());
    d3.select("#femaleVal").text(totalFem.toLocaleString());
    d3.select("#maleVal").text(totalMale.toLocaleString());

    // Female Ratio (displayed as a percentage)
    const femaleRatio = ((totalFem / total) * 100).toFixed(1);
    d3.select("#femaleRatio").text(`${femaleRatio}%`);

    // Year-over-year (YoY) change compared to the previous year in the
    // `years` array. If there's no previous year we show N/A.
    const years = ["2019-2020", "2020-2021", "2021-2022"];
    const currentIndex = years.indexOf(selectedYear);
    if (currentIndex > 0) {
        const prevYear = years[currentIndex - 1];
        const prevYearData = educationData.filter(d => d.year === prevYear);
        const prevTotal = d3.sum(prevYearData, d => d.male + d.female);
        const yoyChange = ((total - prevTotal) / prevTotal * 100).toFixed(1);
        const yoyElement = d3.select("#yoyChange");
        yoyElement.text(`${yoyChange > 0 ? '+' : ''}${yoyChange}%`);
        yoyElement.style("color", yoyChange >= 0 ? "#2e7d32" : "#c62828");
    } else {
        d3.select("#yoyChange").text("N/A").style("color", "#666");
    }

    // Which education level has the largest enrollment this year?
    const levelTotals = yearData.map(d => ({ level: d.level, total: d.male + d.female }));
    const largest = levelTotals.reduce((max, curr) => curr.total > max.total ? curr : max);
    d3.select("#largestLevel").text(largest.level);

    // Gender gap shown as absolute difference with colored label
    const genderGap = Math.abs(totalFem - totalMale);
    const genderGapElement = d3.select("#genderGap");
    if (totalFem > totalMale) {
        genderGapElement.text(`+${genderGap.toLocaleString()} F`).style("color", "#ffb4ab");
    } else {
        genderGapElement.text(`+${genderGap.toLocaleString()} M`).style("color", "#006a6a");
    }

    // Draw the charts using the filtered year data
    drawBarChart(yearData);
    drawDonutChart(yearData);
}

// --- CHART 1: Grouped Bar Chart ---
function drawBarChart(data) {
    // Renders a grouped bar chart for a single year's `data`.
    const container = document.getElementById('barChart');
    container.innerHTML = ""; // Clear for redraw
    const width = container.clientWidth - margin.left - margin.right;
    const height = 350 - margin.top - margin.bottom;

    const svg = d3.select(container).append("svg")
        .attr("width", width + margin.left + margin.right)
        .attr("height", height + margin.top + margin.bottom)
        .append("g")
        .attr("transform", `translate(${margin.left},${margin.top})`);

    // X scales: level groups and inner band for male/female
    const x0 = d3.scaleBand()
        .domain(data.map(d => d.level))
        .range([0, width])
        .padding(0.2);

    const x1 = d3.scaleBand()
        .domain(["male", "female"])
        .range([0, x0.bandwidth()])
        .padding(0.05);

    // Y scale based on the max of male/female values in the data
    const y = d3.scaleLinear()
        .domain([0, d3.max(data, d => Math.max(d.male, d.female)) * 1.1])
        .range([height, 0]);

    // Axes
    svg.append("g").attr("transform", `translate(0,${height})`).call(d3.axisBottom(x0));
    svg.append("g").call(d3.axisLeft(y));

    // Group per level
    const levelGroups = svg.selectAll(".level-group")
        .data(data)
        .enter().append("g")
        .attr("transform", d => `translate(${x0(d.level)},0)`);

    // Bars: two bars per level (male and female)
    levelGroups.selectAll("rect")
        .data(d => [{key: "male", value: d.male}, {key: "female", value: d.female}])
        .enter().append("rect")
        .attr("x", d => x1(d.key))
        .attr("y", height) // Start at bottom for transition
        .attr("width", x1.bandwidth())
        .attr("height", 0)
        .attr("fill", d => colors[d.key])
        // Tooltip shows a simple label + value
        .on("mouseover", function(event, d) {
            d3.select(this).style("opacity", 0.7);
            tooltip.style("opacity", 1)
                   .html(`${d.key.toUpperCase()}: ${d.value.toLocaleString()}`)
                   .style("left", (event.pageX + 10) + "px")
                   .style("top", (event.pageY - 20) + "px");
        })
        .on("mouseout", function() {
            d3.select(this).style("opacity", 1);
            tooltip.style("opacity", 0);
        })
        .transition().duration(1000) // Animate height from 0 to value
        .attr("y", d => y(d.value))
        .attr("height", d => height - y(d.value));
}

// --- CHART 2: Donut Chart ---
function drawDonutChart(data) {
    // Donut chart: sums male/female across provided rows and displays a
    // donut. This is intentionally compact and intended for a single-year
    // breakdown.
    const container = document.getElementById('donutChart');
    container.innerHTML = "";
    const width = container.clientWidth;
    const height = 350;
    const radius = Math.min(width, height) / 2 - 20;

    const svg = d3.select(container).append("svg")
        .attr("width", width)
        .attr("height", height)
        .append("g")
        .attr("transform", `translate(${width/2},${height/2})`);

    const totalM = d3.sum(data, d => d.male);
    const totalF = d3.sum(data, d => d.female);
    const pieData = [ {key: "male", value: totalM}, {key: "female", value: totalF} ];

    const pie = d3.pie().value(d => d.value).sort(null);
    const arc = d3.arc().innerRadius(radius * 0.5).outerRadius(radius);

    // Bind and draw arcs
    const path = svg.selectAll("path")
        .data(pie(pieData))
        .enter().append("path")
        .attr("fill", d => colors[d.data.key])
        .attr("stroke", "white")
        .attr("stroke-width", "2px")
        .attr("d", arc)
        .on("mouseover", (event, d) => {
            tooltip.style("opacity", 1)
                   .html(`${d.data.key.toUpperCase()}: ${d.data.value.toLocaleString()}`)
                   .style("left", (event.pageX + 10) + "px")
                   .style("top", (event.pageY - 10) + "px");
        })
        .on("mouseout", () => tooltip.style("opacity", 0));

    // Animate the arc drawing
    path.transition().duration(1000).attrTween("d", function(d) {
        const i = d3.interpolate(d.startAngle+0.1, d.endAngle);
        return function(t) { d.endAngle = i(t); return arc(d); };
    });

    // Center label
    svg.append("text")
       .attr("text-anchor", "middle")
       .attr("dy", "0.3em")
       .text("Total Ratio")
       .style("font-weight", "bold")
       .style("fill", "#666");
}

// --- CHART 3: Line Chart (Trends) ---
function drawLineChart() {
    // Multi-year line chart: group the global `educationData` by level and
    // plot total enrollment per year for each level.
    const container = document.getElementById('lineChart');
    container.innerHTML = "";
    const width = container.clientWidth - margin.left - margin.right;
    const height = 350 - margin.top - margin.bottom;

    const svg = d3.select(container).append("svg")
        .attr("width", width + margin.left + margin.right)
        .attr("height", height + margin.top + margin.bottom)
        .append("g").attr("transform", `translate(${margin.left},${margin.top})`);

    // Group rows by level
    const levels = ["Primary", "Secondary", "Tertiary"];
    const nestedData = levels.map(lvl => ({ level: lvl, values: educationData.filter(d => d.level === lvl) }));

    // X axis: distinct years
    const uniqueYears = [...new Set(educationData.map(d => d.year))].sort();
    const x = d3.scalePoint().domain(uniqueYears).range([0, width]).padding(0.1);

    // Y axis: fixed domain for simplicity (tune to your data)
    const y = d3.scaleLinear().domain([0, 70000]).range([height, 0]);

    const colorScale = d3.scaleOrdinal().domain(levels).range(["#006a6a", "#e68a00", "#9c27b0"]);

    svg.append("g").attr("transform", `translate(0,${height})`).call(d3.axisBottom(x));
    svg.append("g").call(d3.axisLeft(y));

    const line = d3.line().x(d => x(d.year)).y(d => y(d.male + d.female));

    svg.selectAll(".line").data(nestedData).enter().append("path")
        .attr("fill", "none")
        .attr("stroke", d => colorScale(d.level))
        .attr("stroke-width", 3)
        .attr("d", d => line(d.values));

    // Dots for individual points with tooltip
    svg.selectAll(".dot-group").data(nestedData).enter().append("g")
        .selectAll("circle")
        .data(d => d.values.map(v => ({...v, level: d.level})))
        .enter().append("circle")
        .attr("cx", d => x(d.year))
        .attr("cy", d => y(d.male + d.female))
        .attr("r", 5)
        .attr("fill", d => colorScale(d.level))
        .on("mouseover", (event, d) => {
            tooltip.style("opacity", 1)
                   .html(`${d.level} (${d.year}): ${(d.male+d.female).toLocaleString()}`)
                   .style("left", (event.pageX + 10) + "px")
                   .style("top", (event.pageY - 15) + "px");
        })
        .on("mouseout", () => tooltip.style("opacity", 0));

    const legend = svg.selectAll(".legend").data(nestedData).enter().append("g")
        .attr("transform", (d, i) => `translate(${i * 120}, ${height + 35})`);

    legend.append("rect").attr("width", 10).attr("height", 10).attr("fill", d => colorScale(d.level));
    legend.append("text").attr("x", 15).attr("y", 10).text(d => d.level).style("font-size", "12px");
}

// Start App
init();

// Export: convert SVG inside a chart container to PNG and trigger download
function exportSVGToPNG(containerId, filename = 'chart.png') {
    // Utility: serialize the first <svg> found inside `containerId`, create
    // an Image from that serialized SVG, draw it onto a canvas, optionally
    // render the chart title above the image, and then trigger a download.
    // Note: this works with the SVG elements produced by the chart functions
    // above. If an SVG isn't present (e.g. chart hasn't rendered), we alert.
    const container = document.getElementById(containerId);
    if (!container) {
        console.error('Container not found:', containerId);
        return;
    }
    const svg = container.querySelector('svg');
    if (!svg) {
        alert('No SVG found inside container. Please let the chart render first.');
        return;
    }

    // Compute width/height
    let width = parseInt(svg.getAttribute('width')) || 0;
    let height = parseInt(svg.getAttribute('height')) || 0;
    try {
        const bbox = svg.getBBox();
        if (!width) width = Math.ceil(bbox.width || svg.getBoundingClientRect().width);
        if (!height) height = Math.ceil(bbox.height || svg.getBoundingClientRect().height);
    } catch (e) {
        // getBBox can fail in some cases; fall back to bounding rect
        const rect = svg.getBoundingClientRect();
        if (!width) width = Math.ceil(rect.width);
        if (!height) height = Math.ceil(rect.height);
    }

    if (!width || !height) {
        // Reasonable defaults
        width = 800; height = 600;
    }

    // Try to read an optional chart title from the card header
    const headerEl = container.parentElement ? container.parentElement.querySelector('.card-header h2') : null;
    const titleText = headerEl ? headerEl.textContent.trim() : '';

    const clone = svg.cloneNode(true);
    clone.setAttribute('xmlns', 'http://www.w3.org/2000/svg');
    clone.setAttribute('width', width);
    clone.setAttribute('height', height);

    const serializer = new XMLSerializer();
    let svgString = serializer.serializeToString(clone);

    if (!svgString.match(/^<svg[^>]+xmlns="http:\/\/www.w3.org\/2000\/svg"/)) {
        svgString = svgString.replace(/^<svg/, '<svg xmlns="http://www.w3.org/2000/svg"');
    }

    const img = new Image();
    img.onload = () => {
        // Reserve some top padding for the title if present
        const titlePadding = titleText ? Math.max(32, Math.round(width * 0.05)) : 0;

        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height + titlePadding;
        const ctx = canvas.getContext('2d');

        // White background
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(0, 0, canvas.width, canvas.height);

        // Draw title if available
        if (titleText) {
            // Draw the title using a readable font size relative to width.
            ctx.fillStyle = '#222';
            const fontSize = Math.max(12, Math.round(width * 0.04));
            ctx.font = `bold ${fontSize}px Roboto, sans-serif`;
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            // Position title vertically centered in the padding
            ctx.fillText(titleText, canvas.width / 2, titlePadding / 2 + 2);
        }

        // Draw the chart image below the title area
        ctx.drawImage(img, 0, titlePadding, width, height);

        const png = canvas.toDataURL('image/png');
        const a = document.createElement('a');
        a.href = png;

        // Construct a filename incorporating the sanitized title if present
        if (titleText) {
            const safe = titleText.toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_|_$/g, '');
            a.download = `${safe || containerId}.png`;
        } else {
            a.download = filename || `${containerId}.png`;
        }

        document.body.appendChild(a);
        a.click();
        a.remove();
    };

    img.onerror = (err) => {
        console.error('Failed to create image from SVG', err);
        alert('Export failed — check console for details.');
    };

    img.src = 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(svgString);
}

// Delegated handler for export buttons
document.addEventListener('click', (event) => {
    // Export buttons are placed in the card header and have
    // `data-target` attributes pointing at chart container ids.
    const btn = event.target.closest && event.target.closest('.export-chart');
    if (!btn) return;
    const target = btn.getAttribute('data-target');
    if (!target) return;
    const filename = `${target}.png`;
    exportSVGToPNG(target, filename);
});

window.addEventListener("resize", () => {
    updateDashboard(document.getElementById("yearSelect").value);
    drawLineChart();
});