import { fetchJSON, renderProjects } from '../global.js';
import * as d3 from 'https://cdn.jsdelivr.net/npm/d3@7.9.0/+esm';


const projects = await fetchJSON('../lib/projects.json');
const projectsContainer = document.querySelector('.projects');
renderProjects(projects, projectsContainer, 'h2');
const titleEl = document.querySelector(".projects-title");
if (titleEl) {
  titleEl.textContent = `Projects (${projects.length})`;
}
console.log("FETCHED PROJECTS:", projects);

let rolledData = d3.rollups(
  projects,
  (v) => v.length,
  (d) => d.year,
);

let data = rolledData.map(([year, count]) => {
  return { value: count, label: year };
});

let colors = d3.scaleOrdinal(d3.schemeTableau10);

let sliceGenerator = d3.pie().value((d) => d.value);

const arcGenerator = d3.arc()
  .innerRadius(0)
  .outerRadius(50);

let arcData = sliceGenerator(data);
let arcs = arcData.map((d) => arcGenerator(d));

let selectedIndex = -1;

arcs.forEach((arc, idx) => {
  d3.select('#projects-plot')
    .append('path')
    .attr('d', arc)
    .attr('fill', colors(idx))
    .attr('transform', 'translate(50, 50)')
    .attr('class', () => (selectedIndex === idx ? 'selected-wedge' : ''))
    .on('click', function () {
      selectedIndex = selectedIndex === idx ? -1 : idx;

      d3.select('#projects-plot')
        .selectAll('path')
        .attr('class', (_, i) => (selectedIndex === i ? 'selected-wedge' : ''))
        .attr('fill', (_, i) => (selectedIndex === i ? 'maroon' : colors(i)));

      legend
        .selectAll('li')
        .attr('class', (_, i) => (selectedIndex === i ? 'selected' : ''));

      if (selectedIndex === -1) {
        renderProjects(projects, projectsContainer, 'h2');
      } else {
        let filteredProjects = projects.filter((project) =>
          project.year.toString() === data[selectedIndex].label
        );
        projectsContainer.innerHTML = '';
        renderProjects(filteredProjects, projectsContainer, 'h2');
      }
    });
});


let legend = d3.select('.legend');
data.forEach((d, idx) => {
  legend
    .append('li')
    .attr('style', `--color:${colors(idx)}`)
    .attr('class', () => (selectedIndex === idx ? 'selected' : ''))
    .html(`<span class="swatch"></span> ${d.label} <em>(${d.value})</em>`)
    .on('click', () => {
      selectedIndex = selectedIndex === idx ? -1 : idx;

      d3.select('#projects-plot')
        .selectAll('path')
        .attr('class', (_, i) => (selectedIndex === i ? 'selected-wedge' : ''))
        .attr('fill', (_, i) => (selectedIndex === i ? 'maroon' : colors(i)));

      legend
        .selectAll('li')
        .attr('class', (_, i) => (selectedIndex === i ? 'selected' : ''));
    });
});

let query = '';

let searchInput = document.querySelector('.searchBar');

searchInput.addEventListener('input', (event) => {
  query = event.target.value.toLowerCase();

  let filteredProjects = projects.filter((project) =>
    project.title.toLowerCase().includes(query)
  );

  projectsContainer.innerHTML = '';
  renderProjects(filteredProjects, projectsContainer, 'h2');

  let rolledData = d3.rollups(
    filteredProjects,
    (v) => v.length,
    (d) => d.year,
  );

  let data = rolledData.map(([year, count]) => {
    return { value: count, label: year };
  });

  d3.select('#projects-plot').selectAll('*').remove();
  d3.select('.legend').selectAll('*').remove();

  let arcData = sliceGenerator(data);
  let arcs = arcData.map((d) => arcGenerator(d));

  arcs.forEach((arc, idx) => {
    d3.select('#projects-plot')
      .append('path')
      .attr('d', arc)
      .attr('fill', colors(idx))
      .attr('transform', 'translate(50, 50)')
      .attr('class', () => (selectedIndex === idx ? 'selected-wedge' : ''));
  });

  data.forEach((d, idx) => {
    legend
      .append('li')
      .attr('style', `--color:${colors(idx)}`)
      .html(`<span class="swatch"></span> ${d.label} <em>(${d.value})</em>`);
  });
});