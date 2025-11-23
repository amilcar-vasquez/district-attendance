// Global Dimensions
const margin = { top: 20, right: 30, bottom: 40, left: 60 };
const colors = ["#006a6a", "#4a6363", "#ffb4ab", "#ba1a1a"]; // Material palette

// Selectors
const containerBar = document.getElementById('barChart');
const containerDonut = document.getElementById('donutChart');
const containerLine = document.getElementById('lineChart');
const tooltip = d3.select("#tooltip");

// --- Initialization ---
function init() {
    // Populate dropdown with event listener
    d3.select("#yearSelect").on("change", function() {
        updateDashboard(this.value);
    });

    // Draw Static Line Chart (Trends don't change with dropdown)
    drawLineChart();

    // Draw Initial Dynamic Charts
    updateDashboard("2023");
}

// --- Update Function ---
function updateDashboard(selectedYear) {
    const yearData = educationData.filter(d => d.year == selectedYear);
    
    // Update Metrics
    const total = d3.sum(yearData, d => d.male + d.female);
    const primary = yearData.find(d => d.level === "Primary");
    const secondary = yearData.find(d => d.level === "Secondary");

    d3.select("#totalEnrollment").text(total.toLocaleString());
    d3.select("#primaryEnrollment").text((primary.male + primary.female).toLocaleString());
    d3.select("#secondaryEnrollment").text((secondary.male + secondary.female).toLocaleString());

    // Update Charts
    drawBarChart(yearData);
    drawDonutChart(yearData);
}

// --- Chart 1: Grouped Bar Chart (Levels by Sex) ---
function drawBarChart(data) {
    containerBar.innerHTML = ""; // Clear previous
    const width = containerBar.clientWidth - margin.left - margin.right;
    const height = 300 - margin.top - margin.bottom;

    const svg = d3.select(containerBar).append("svg")
        .attr("width", width + margin.left + margin.right)
        .attr("height", height + margin.top + margin.bottom)
        .append("g")
        .attr("transform", `translate(${margin.left},${margin.top})`);

    // X Axis (Levels)
    const x0 = d3.scaleBand().domain(data.map(d => d.level)).range([0, width]).padding(0.2);
    const x1 = d3.scaleBand().domain(["male", "female"]).range([0, x0.bandwidth()]).padding(0.05);
    
    // Y Axis (Count)
    const y = d3.scaleLinear().domain([0, d3.max(data, d => Math.max(d.male, d.female))]).nice().range([height, 0]);
    const color = d3.scaleOrdinal().domain(["male", "female"]).range(["#006a6a", "#ffb4ab"]);

    svg.append("g").attr("transform", `translate(0,${height})`).call(d3.axisBottom(x0));
    svg.append("g").call(d3.axisLeft(y));

    // Bars
    const levels = svg.selectAll(".level").data(data).enter().append("g")
        .attr("transform", d => `translate(${x0(d.level)},0)`);

    levels.selectAll("rect")
        .data(d => [{key: "male", value: d.male}, {key: "female", value: d.female}])
        .enter().append("rect")
        .attr("x", d => x1(d.key))
        .attr("y", height) // Start at bottom for animation
        .attr("width", x1.bandwidth())
        .attr("height", 0) // Start height 0
        .attr("fill", d => color(d.key))
        .on("mouseover", (event, d) => showTooltip(event, `${d.key}: ${d.value}`))
        .on("mouseout", hideTooltip)
        .transition().duration(800)
        .attr("y", d => y(d.value))
        .attr("height", d => height - y(d.value));
}

// --- Chart 2: Donut Chart (Overall Sex Ratio) ---
function drawDonutChart(data) {
    containerDonut.innerHTML = "";
    const width = containerDonut.clientWidth;
    const height = 300;
    const radius = Math.min(width, height) / 2 - 20;

    const svg = d3.select(containerDonut).append("svg")
        .attr("width", width)
        .attr("height", height)
        .append("g")
        .attr("transform", `translate(${width/2},${height/2})`);

    const totalMale = d3.sum(data, d => d.male);
    const totalFemale = d3.sum(data, d => d.female);
    const pieData = [{key: "Male", value: totalMale}, {key: "Female", value: totalFemale}];

    const pie = d3.pie().value(d => d.value).sort(null);
    const arc = d3.arc().innerRadius(radius * 0.6).outerRadius(radius);
    const color = d3.scaleOrdinal().domain(["Male", "Female"]).range(["#006a6a", "#ffb4ab"]);

    svg.selectAll("path")
        .data(pie(pieData))
        .enter().append("path")
        .attr("d", arc)
        .attr("fill", d => color(d.data.key))
        .attr("stroke", "white")
        .style("stroke-width", "2px")
        .on("mouseover", (event, d) => showTooltip(event, `${d.data.key}: ${d.data.value.toLocaleString()}`))
        .on("mouseout", hideTooltip)
        .transition().duration(800).attrTween("d", function(d) {
            const i = d3.interpolate(d.startAngle+0.1, d.endAngle);
            return function(t) {
                d.endAngle = i(t);
                return arc(d);
            }
        });
        
    // Center Text
    svg.append("text").text("Ratio").attr("text-anchor", "middle").style("font-weight", "bold");
}

// --- Chart 3: Line Chart (Trends) ---
function drawLineChart() {
    containerLine.innerHTML = "";
    const width = containerLine.clientWidth - margin.left - margin.right;
    const height = 300 - margin.top - margin.bottom;

    const svg = d3.select(containerLine).append("svg")
        .attr("width", width + margin.left + margin.right)
        .attr("height", height + margin.top + margin.bottom)
        .append("g").attr("transform", `translate(${margin.left},${margin.top})`);

    // Group data by level for lines
    const levels = ["Primary", "Secondary"];
    const nestedData = levels.map(level => {
        return {
            level: level,
            values: educationData.filter(d => d.level === level)
        };
    });

    const x = d3.scaleLinear().domain([2021, 2023]).range([0, width]);
    const y = d3.scaleLinear().domain([10000, 40000]).range([height, 0]); // Adjust domain based on data
    const color = d3.scaleOrdinal().range(["#006a6a", "#ffb4ab"]);

    svg.append("g").attr("transform", `translate(0,${height})`).call(d3.axisBottom(x).ticks(3).tickFormat(d3.format("d")));
    svg.append("g").call(d3.axisLeft(y));

    const line = d3.line()
        .x(d => x(d.year))
        .y(d => y(d.male + d.female));

    svg.selectAll(".line")
        .data(nestedData)
        .enter().append("path")
        .attr("fill", "none")
        .attr("stroke", d => color(d.level))
        .attr("stroke-width", 3)
        .attr("d", d => line(d.values));
        
    // Legend
    svg.selectAll(".legend")
        .data(nestedData).enter().append("text")
        .attr("x", width - 50)
        .attr("y", (d, i) => i * 20 + 20)
        .text(d => d.level)
        .style("fill", d => color(d.level));
}

// --- Tooltip Utils ---
function showTooltip(event, text) {
    tooltip.classed("visible", true)
        .html(text)
        .style("left", (event.pageX + 10) + "px")
        .style("top", (event.pageY - 10) + "px");
}
function hideTooltip() {
    tooltip.classed("visible", false);
}

// Run
init();

// Handle Window Resize (Redraw charts)
window.addEventListener("resize", () => {
    updateDashboard(document.getElementById("yearSelect").value);
    drawLineChart();
});