// Load datasets
d3.promiseAll = function(promises) {
  return Promise.all(promises);
};

d3.promiseAll([
  d3.csv("data/attendance_by_district_recent.csv"),
  d3.csv("data/attendance_trends.csv")
]).then(([districtData, trendData]) => {
  districtData.forEach(d => d.attendance_rate = +d.attendance_rate);
  trendData.forEach(d => {
    d.year = +d.year;
    d.attendance_rate = +d.attendance_rate;
  });

  initDashboard(districtData, trendData);
});

function initDashboard(districtData, trendData) {
  drawBarChart(districtData, trendData);

  const topDistrict = districtData.sort((a,b)=>b.attendance_rate - a.attendance_rate)[0].district;
  drawLineChart(topDistrict, trendData);
}

function drawBarChart(data, trendData) {
  const container = d3.select('#barChart');
  container.selectAll('*').remove();

  const svg = container.append('svg');
  const width = 400, height = 350;
  svg.attr('viewBox', `0 0 ${width} ${height}`);

  const x = d3.scaleBand()
    .domain(data.map(d => d.district))
    .range([50, width - 20])
    .padding(0.2);

  const y = d3.scaleLinear()
    .domain([0, d3.max(data, d => d.attendance_rate)])
    .range([height - 40, 20]);

  svg.append('g')
    .attr('transform', `translate(0, ${height - 40})`)
    .call(d3.axisBottom(x));

  svg.append('g')
    .attr('transform', 'translate(50,0)')
    .call(d3.axisLeft(y));

  const maxVal = d3.max(data, d => d.attendance_rate);
  const minVal = d3.min(data, d => d.attendance_rate);

  svg.selectAll('rect')
    .data(data)
    .enter()
    .append('rect')
      .attr('x', d => x(d.district))
      .attr('y', d => y(d.attendance_rate))
      .attr('width', x.bandwidth())
      .attr('height', d => height - 40 - y(d.attendance_rate))
      .attr('fill', d => d.attendance_rate === maxVal ? 'green' : d.attendance_rate === minVal ? 'red' : 'steelblue')
      .style('cursor', 'pointer')
      .on('click', (e, d) => drawLineChart(d.district, trendData));
}

function drawLineChart(district, trendData) {
  const container = d3.select('#lineChart');
  container.selectAll('*').remove();

  const svg = container.append('svg');
  const width = 400, height = 350;
  svg.attr('viewBox', `0 0 ${width} ${height}`);

  const filtered = trendData.filter(d => d.district === district);

  const x = d3.scaleLinear()
    .domain(d3.extent(filtered, d => d.year))
    .range([50, width - 20]);

  const y = d3.scaleLinear()
    .domain([0, d3.max(filtered, d => d.attendance_rate)])
    .range([height - 40, 20]);

  svg.append('g')
    .attr('transform', `translate(0, ${height - 40})`)
    .call(d3.axisBottom(x).tickFormat(d3.format("d")));

  svg.append('g')
    .attr('transform', 'translate(50,0)')
    .call(d3.axisLeft(y));

  const line = d3.line()
    .x(d => x(d.year))
    .y(d => y(d.attendance_rate));

  svg.append('path')
    .datum(filtered)
    .attr('fill', 'none')
    .attr('stroke', '#2196F3')
    .attr('stroke-width', 3)
    .attr('d', line);

  svg.append('text')
    .attr('x', width / 2)
    .attr('y', 20)
    .attr('text-anchor', 'middle')
    .style('font-size', '16px')
    .text(`Attendance Trend: ${district}`);
}
