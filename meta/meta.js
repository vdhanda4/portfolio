import * as d3 from 'https://cdn.jsdelivr.net/npm/d3@7.9.0/+esm';
import scrollama from 'https://cdn.jsdelivr.net/npm/scrollama@3.2.0/+esm';

let xScale, yScale;
async function loadData() {
  const data = await d3.csv('loc.csv', (row) => ({
    ...row,
    line: Number(row.line),
    depth: Number(row.depth),
    length: Number(row.length),
    date: new Date(row.date + 'T00:00' + row.timezone),
    datetime: new Date(row.datetime),
    type: row.type,
  }));

  return data;
}
//console.log(data);

function renderCommitInfo(data, commits) {
  
    const statsBox = d3.select('#meta-stats .stats-row');
    statsBox.selectAll('*').remove(); 
  
    const stats = [
      { label: 'Total LOC', value: data.length },
      { label: 'Total commits', value: commits.length },
      { label: 'Number of files', value: d3.groups(data, d => d.file).length },
      { label: 'Maximum file length', value: d3.max(d3.rollups(data, v => d3.max(v, d => d.line), d => d.file), d => d[1]) },
      { label: 'Average line length', value: d3.mean(data, d => d.length).toFixed(2) },
      { label: 'Most active time period', value: d3.greatest(d3.rollups(data, v => v.length, d => new Date(d.datetime).toLocaleString('en', { dayPeriod: 'short' })), d => d[1])?.[0] }
    ];
  
    stats.forEach(stat => {
      const statItem = statsBox.append('div').attr('class', 'stat-item');
      statItem.html(`${stat.label}: ${stat.value}`);
    });
  }

  function updateFileDisplay(filteredCommits) {
    let colors = d3.scaleOrdinal(d3.schemeTableau10);
    const lines = filteredCommits.flatMap(d => d.lines);
  
    const files = d3
      .groups(lines, d => d.file)
      .map(([name, lines]) => ({ name, lines }))
      .sort((a, b) => b.lines.length - a.lines.length);
  
    const filesContainer = d3.select('#files')
      .selectAll('div')
      .data(files, d => d.name)
      .join(
        enter => enter.append('div').call(div => {
          div.append('dt').append('code');
          div.append('dd');
        })
      );
  
      filesContainer.select('dt > code')
        .html(d => `${d.name}<small>${d.lines.length} lines</small>`);

      filesContainer.select('dd')
        .selectAll('div')
        .data(d => d.lines)
        .join('div')
        .attr('class', 'loc')
        .attr('style', d => `--color: ${colors(d.type)}`);

  }
  
  

function processCommits(data) {
  return d3
    .groups(data, (d) => d.commit)
    .map(([commit, lines]) => {
      let first = lines[0];
      let { author, date, time, timezone, datetime } = first;
      let ret = {
        id: commit,
        url: 'https://github.com/YOUR_REPO/commit/' + commit,
        author,
        date,
        time,
        timezone,
        datetime,
        hourFrac: datetime.getHours() + datetime.getMinutes() / 60,
        totalLines: lines.length,
      };

      Object.defineProperty(ret, 'lines', {
        value: lines,
        writable: false,
        enumerable: false,
        configurable: true,
      });

      return ret;
    })
    .sort((a, b) => a.datetime - b.datetime); 
}
  
  
  function renderScatterPlot(data, commits) {
    const width = 1000;
    const height = 600;

    const svg = d3.select('#chart')
        .append('svg')
        .attr('viewBox', `0 0 ${width} ${height}`)
        .style('overflow', 'visible');

    createBrushSelector(svg);

    // Set global xScale and yScale
    xScale = d3.scaleTime()
        .domain(d3.extent(commits, d => d.datetime))
        .range([0, width])
        .nice();

    yScale = d3.scaleLinear()
        .domain([0, 24])
        .range([height, 0]);

    const [minLines, maxLines] = d3.extent(commits, d => d.totalLines);

    const rScale = d3.scaleSqrt()
        .domain([minLines, maxLines])
        .range([2, 30]);

    const xAxis = d3.axisBottom(xScale);
    const yAxis = d3.axisLeft(yScale)
        .tickFormat(d => String(d % 24).padStart(2, '0') + ':00');

    const gridlines = svg.append('g').attr('class', 'gridlines');
    gridlines.selectAll('line')
        .data(yScale.ticks(24))
        .join('line')
        .attr('x1', 0)
        .attr('x2', width)
        .attr('y1', d => yScale(d))
        .attr('y2', d => yScale(d))
        .attr('stroke', d => (d >= 6 && d <= 18) ? '#e76f51' : '#1d3557')
        .attr('stroke-width', 1)
        .attr('opacity', 0.6);

    svg.append('g').attr('transform', `translate(0, ${height})`).attr('class', 'x-axis').call(xAxis);
    svg.append('g').attr('class', 'y-axis').call(yAxis);

    const sortedCommits = commits.slice().sort((a, b) => b.totalLines - a.totalLines);

    const dots = svg.append('g').attr('class', 'dots');
    dots.selectAll('circle')
        .data(sortedCommits, (d) => d.id) 
        .join('circle')
        .attr('cx', (d) => xScale(d.datetime))
        .attr('cy', (d) => yScale(d.hourFrac))
        .attr('r', (d) => rScale(d.totalLines))
        .attr('fill', 'steelblue')
        .style('fill-opacity', 0.7)
        .style('--r', (d) => rScale(d.totalLines))
        .on('mouseenter', function (event, commit) {
          d3.select(this)
            .transition()
            .duration(150)
            .style('fill-opacity', 1);
      
          renderTooltipContent(commit);
          updateTooltipVisibility(true);
          updateTooltipPosition(event);
      })
      .on('mousemove', function (event) {
          updateTooltipPosition(event); // keeps tooltip in sync with cursor
      })
      .on('mouseleave', function () {
          d3.select(this)
            .transition()
            .duration(150)
            .style('fill-opacity', 0.7);
      
          updateTooltipVisibility(false);
      });
}

function updateScatterPlot(data, commits) {
  const width = 1000;
  const height = 600;
  const margin = { top: 10, right: 10, bottom: 30, left: 20 };
  const usableArea = {
    top: margin.top,
    right: width - margin.right,
    bottom: height - margin.bottom,
    left: margin.left,
    width: width - margin.left - margin.right,
    height: height - margin.top - margin.bottom,
  };

  const svg = d3.select('#chart').select('svg');

  xScale = xScale.domain(d3.extent(commits, (d) => d.datetime));

  const [minLines, maxLines] = d3.extent(commits, (d) => d.totalLines);
  const rScale = d3.scaleSqrt().domain([minLines, maxLines]).range([2, 30]);

  const xAxis = d3.axisBottom(xScale);
  const xAxisGroup = svg.select('g.x-axis');
  xAxisGroup.selectAll('*').remove();  // clear old axis
  xAxisGroup.call(xAxis);             // redraw axis

  const dots = svg.select('g.dots');
  const sortedCommits = d3.sort(commits, (d) => -d.totalLines);

  dots
    .selectAll('circle')
    .data(sortedCommits, (d) => d.id)
    .join('circle')
    .attr('cx', (d) => xScale(d.datetime))
    .attr('cy', (d) => yScale(d.hourFrac))
    .attr('r', (d) => rScale(d.totalLines))
    .attr('fill', 'steelblue')
    .style('fill-opacity', 0.7)
    .style('--r', (d) => rScale(d.totalLines))
    .on('mouseenter', function (event, commit) {
      d3.select(this)
        .transition()
        .duration(150)
        .style('fill-opacity', 1);
  
      renderTooltipContent(commit);
      updateTooltipVisibility(true);
      updateTooltipPosition(event);
  })
  .on('mousemove', function (event) {
      updateTooltipPosition(event); // keeps tooltip in sync with cursor
  })
  .on('mouseleave', function () {
      d3.select(this)
        .transition()
        .duration(150)
        .style('fill-opacity', 0.7);
  
      updateTooltipVisibility(false);
  });
}



function renderTooltipContent(commit) {
    const link = document.getElementById('commit-link');
    const date = document.getElementById('commit-date');
    const time = document.getElementById('commit-time');
    const author = document.getElementById('commit-author');
    const lines = document.getElementById('commit-lines');

    if (Object.keys(commit).length === 0) return;

    link.href = commit.url;
    link.textContent = commit.id;
    date.textContent = commit.datetime?.toLocaleString('en', { dateStyle: 'full' });
    time.textContent = commit.datetime?.toLocaleTimeString('en', { timeStyle: 'short' });
    author.textContent = commit.author;
    lines.textContent = commit.totalLines;
}

function updateTooltipVisibility(isVisible) {
    const tooltip = document.getElementById('commit-tooltip');
    tooltip.style.opacity = isVisible ? '1' : '0';
    tooltip.style.visibility = isVisible ? 'visible' : 'hidden';
  }
  function updateTooltipPosition(event) {
    const tooltip = document.getElementById('commit-tooltip');
    const offsetX = 100; // Adjust to keep tooltip away from the cursor
    const offsetY = 50;
  
    tooltip.style.left = `${event.clientX + offsetX}px`;
    tooltip.style.top = `${event.clientY + offsetY}px`;
  }

  function createBrushSelector(svg) {
    const brush = d3.brush()
        .extent([[0, 0], [1000, 600]]) // Setting brush area
        .on('start brush end', brushed);

    svg.call(brush);
    svg.selectAll('.dots, .overlay ~ *').raise();
}

function brushed(event) {
    const selection = event.selection;
    d3.selectAll('circle').classed('selected', (d) =>
      isCommitSelected(selection, d),
    );
    renderSelectionCount(selection);
    renderLanguageBreakdown(selection);
  }

function isCommitSelected(selection, commit) {
    if (!selection) return false;
    const [x0, x1] = selection.map(d => d[0]);
    const [y0, y1] = selection.map(d => d[1]);
    const x = xScale(commit.datetime);
    const y = yScale(commit.hourFrac);
    return x >= x0 && x <= x1 && y >= y0 && y <= y1;
}
function renderLanguageBreakdown(selection) {
    const selectedCommits = selection
      ? commits.filter((d) => isCommitSelected(selection, d))
      : [];
    const container = document.getElementById('language-breakdown');
  
    if (selectedCommits.length === 0) {
      container.innerHTML = '';
      return;
    }
    const requiredCommits = selectedCommits.length ? selectedCommits : commits;
    const lines = requiredCommits.flatMap((d) => d.lines);
  
    // Use d3.rollup to count lines per language
    const breakdown = d3.rollup(
      lines,
      (v) => v.length,
      (d) => d.type,
    );
  
    // Update DOM with breakdown
    container.innerHTML = '';
  
    for (const [language, count] of breakdown) {
      const proportion = count / lines.length;
      const formatted = d3.format('.1~%')(proportion);
  
      container.innerHTML += `
              <dt>${language}</dt>
              <dd>${count} lines (${formatted})</dd>
          `;
    }
  }
  

let data = await loadData();
let commits = processCommits(data);

let filteredCommits = commits;
let commitProgress = 100;

let timeScale = d3.scaleTime()
  .domain([
    d3.min(commits, (d) => d.datetime),
    d3.max(commits, (d) => d.datetime),
  ])
  .range([0, 100]);

let commitMaxTime = timeScale.invert(commitProgress);
const timeSlider = document.getElementById('commit-progress');
const commitTimeDisplay = document.getElementById('commit-time');

function onTimeSliderChange() {
  commitProgress = Number(timeSlider.value);
  commitMaxTime = timeScale.invert(commitProgress);
  commitTimeDisplay.textContent = commitMaxTime.toLocaleString(undefined, {
    dateStyle: 'long',
    timeStyle: 'short'
  });

  // Filter commits
  filteredCommits = commits.filter((d) => d.datetime <= commitMaxTime);

  // Update the scatter plot
  renderCommitInfo(data, filteredCommits);

  updateFileDisplay(filteredCommits);
}


timeSlider.addEventListener('input', onTimeSliderChange);
renderCommitInfo(data, commits);
renderScatterPlot(data, commits); 
onTimeSliderChange();

d3.select('#scatter-story')
  .selectAll('.step')
  .data(commits)
  .join('div')
  .attr('class', 'step')
  .html((d, i) => `
    On ${d.datetime.toLocaleString('en', {
      dateStyle: 'full',
      timeStyle: 'short',
    })}, I made 
    <a href="${d.url}" target="_blank">
      ${i > 0 ? 'another glorious commit' : 'my first commit, and it was glorious'}
    </a>.
    I edited ${d.totalLines} lines across ${
      d3.rollups(d.lines, D => D.length, d => d.file).length
    } files.
    Then I looked over all I had made, and I saw that it was very good.
  `);

  function onStepEnter(response) {
    const stepCommit = response.element.__data__; // commit object
    const commitTime = stepCommit.datetime;
  
    // Filter commits up to the current one in scroll
    filteredCommits = commits.filter((d) => d.datetime <= commitTime);
  
    // Update visuals
    renderCommitInfo(data, filteredCommits);
    updateScatterPlot(data, filteredCommits);
    updateFileDisplay(filteredCommits);
  }

  const scroller = scrollama();
  scroller
    .setup({
      container: '#scrolly-1',
      step: '#scrolly-1 .step',
    })
    .onStepEnter(onStepEnter);


  
  
