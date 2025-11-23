// Global Config
const margin = { top: 30, right: 30, bottom: 50, left: 60 };
const colors = { male: "#006a6a", female: "#ffb4ab" };
const tooltip = d3.select("#tooltip");

// --- Init Function ---
function init() {
    // Event Listener for Interaction (Day 5)
    d3.select("#yearSelect").on("change", function() {
        updateDashboard(this.value);
    });

    // Initial Render
    drawLineChart(); // Static trend chart
    updateDashboard("2021-2022"); // Default view
}

function updateDashboard(selectedYear) {
    const yearData = educationData.filter(d => d.year === selectedYear);
    
    // Update KPIs
    const total = d3.sum(yearData, d => d.male + d.female);
    const totalFem = d3.sum(yearData, d => d.female);
    const totalMale = d3.sum(yearData, d => d.male);

    d3.select("#totalVal").text(total.toLocaleString());
    d3.select("#femaleVal").text(totalFem.toLocaleString());
    d3.select("#maleVal").text(totalMale.toLocaleString());

    // Female Ratio
    const femaleRatio = ((totalFem / total) * 100).toFixed(1);
    d3.select("#femaleRatio").text(`${femaleRatio}%`);

    // Year-over-Year Change
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

    // Largest Level
    const levelTotals = yearData.map(d => ({
        level: d.level,
        total: d.male + d.female
    }));
    const largest = levelTotals.reduce((max, curr) => curr.total > max.total ? curr : max);
    d3.select("#largestLevel").text(largest.level);

    // Gender Gap (absolute difference)
    const genderGap = Math.abs(totalFem - totalMale);
    const genderGapElement = d3.select("#genderGap");
    if (totalFem > totalMale) {
        genderGapElement.text(`+${genderGap.toLocaleString()} F`).style("color", "#ffb4ab");
    } else {
        genderGapElement.text(`+${genderGap.toLocaleString()} M`).style("color", "#006a6a");
    }

    drawBarChart(yearData);
    drawDonutChart(yearData);
}

// --- CHART 1: Grouped Bar Chart ---
function drawBarChart(data) {
    const container = document.getElementById('barChart');
    container.innerHTML = ""; // Clear for redraw
    const width = container.clientWidth - margin.left - margin.right;
    const height = 350 - margin.top - margin.bottom;

    const svg = d3.select(container).append("svg")
        .attr("width", width + margin.left + margin.right)
        .attr("height", height + margin.top + margin.bottom)
        .append("g")
        .attr("transform", `translate(${margin.left},${margin.top})`);

    // Day 3 Objective: Scales (Band & Linear)
    const x0 = d3.scaleBand()
        .domain(data.map(d => d.level))
        .range([0, width])
        .padding(0.2);

    const x1 = d3.scaleBand()
        .domain(["male", "female"])
        .range([0, x0.bandwidth()])
        .padding(0.05);

    const y = d3.scaleLinear()
        .domain([0, d3.max(data, d => Math.max(d.male, d.female)) * 1.1])
        .range([height, 0]);

    // Axes
    svg.append("g").attr("transform", `translate(0,${height})`).call(d3.axisBottom(x0));
    svg.append("g").call(d3.axisLeft(y));

    // Day 2 Objective: Binding Data
    const levelGroups = svg.selectAll(".level-group")
        .data(data)
        .enter().append("g")
        .attr("transform", d => `translate(${x0(d.level)},0)`);

    // Bars
    levelGroups.selectAll("rect")
        .data(d => [{key: "male", value: d.male}, {key: "female", value: d.female}])
        .enter().append("rect")
        .attr("x", d => x1(d.key))
        .attr("y", height) // Start at bottom for transition
        .attr("width", x1.bandwidth())
        .attr("height", 0)
        .attr("fill", d => colors[d.key])
        // Day 5 Objective: Tooltips & Transitions
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
        .transition().duration(1000) // Animation
        .attr("y", d => y(d.value))
        .attr("height", d => height - y(d.value));
}

// --- CHART 2: Donut Chart ---
function drawDonutChart(data) {
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
    const pieData = [
        {key: "male", value: totalM}, 
        {key: "female", value: totalF}
    ];

    const pie = d3.pie().value(d => d.value).sort(null);
    const arc = d3.arc().innerRadius(radius * 0.5).outerRadius(radius);

    // Day 2: Binding Pie Data
    const path = svg.selectAll("path")
        .data(pie(pieData))
        .enter().append("path")
        .attr("fill", d => colors[d.data.key])
        .attr("stroke", "white")
        .attr("stroke-width", "2px")
        .attr("d", arc)
        // Day 5: Tooltip
        .on("mouseover", (event, d) => {
            tooltip.style("opacity", 1)
                   .html(`${d.data.key.toUpperCase()}: ${d.data.value.toLocaleString()}`)
                   .style("left", (event.pageX + 10) + "px")
                   .style("top", (event.pageY - 10) + "px");
        })
        .on("mouseout", () => tooltip.style("opacity", 0));

    // Day 5: Transition (Tweening)
    path.transition().duration(1000).attrTween("d", function(d) {
        const i = d3.interpolate(d.startAngle+0.1, d.endAngle);
        return function(t) {
            d.endAngle = i(t);
            return arc(d);
        }
    });

    // Center Label
    svg.append("text")
       .attr("text-anchor", "middle")
       .attr("dy", "0.3em")
       .text("Total Ratio")
       .style("font-weight", "bold")
       .style("fill", "#666");
}

// --- CHART 3: Line Chart (Trends) ---
function drawLineChart() {
    const container = document.getElementById('lineChart');
    container.innerHTML = "";
    const width = container.clientWidth - margin.left - margin.right;
    const height = 350 - margin.top - margin.bottom;

    const svg = d3.select(container).append("svg")
        .attr("width", width + margin.left + margin.right)
        .attr("height", height + margin.top + margin.bottom)
        .append("g").attr("transform", `translate(${margin.left},${margin.top})`);

    // Prepare Data: Group by Level
    const levels = ["Primary", "Secondary", "Tertiary"];
    const nestedData = levels.map(lvl => ({
        level: lvl,
        values: educationData.filter(d => d.level === lvl)
    }));

    // Scales
    const uniqueYears = [...new Set(educationData.map(d => d.year))].sort();
    const x = d3.scalePoint()
        .domain(uniqueYears)
        .range([0, width])
        .padding(0.1); // Add padding so points aren't on edge

    const y = d3.scaleLinear()
        .domain([0, 70000])
        .range([height, 0]);

    const colorScale = d3.scaleOrdinal()
        .domain(levels)
        .range(["#006a6a", "#e68a00", "#9c27b0"]); // Distinct colors for lines

    // Axes
    svg.append("g").attr("transform", `translate(0,${height})`).call(d3.axisBottom(x));
    svg.append("g").call(d3.axisLeft(y));

    // Line Generator
    const line = d3.line()
        .x(d => x(d.year))
        .y(d => y(d.male + d.female));

    // Draw Lines
    svg.selectAll(".line")
        .data(nestedData)
        .enter().append("path")
        .attr("fill", "none")
        .attr("stroke", d => colorScale(d.level))
        .attr("stroke-width", 3)
        .attr("d", d => line(d.values));

    // Add Dots
    svg.selectAll(".dot-group")
        .data(nestedData)
        .enter().append("g")
        .selectAll("circle")
        .data(d => d.values.map(v => ({...v, level: d.level}))) // Pass level down
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

    // Legend
    const legend = svg.selectAll(".legend")
        .data(nestedData)
        .enter().append("g")
        .attr("transform", (d, i) => `translate(${i * 120}, ${height + 35})`);

    legend.append("rect").attr("width", 10).attr("height", 10).attr("fill", d => colorScale(d.level));
    legend.append("text").attr("x", 15).attr("y", 10).text(d => d.level).style("font-size", "12px");
}

// Start App
init();

// Responsive Resize
window.addEventListener("resize", () => {
    updateDashboard(document.getElementById("yearSelect").value);
    drawLineChart();
});