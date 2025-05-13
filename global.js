console.log("IT'S ALIVE!");

function $$(selector, context = document) {
  return Array.from(context.querySelectorAll(selector));
}
const BASE_PATH =
  location.hostname === "localhost" || location.hostname === "127.0.0.1"
    ? "/"
    : "/portfolio/"; 

const pages = [
  { url: "", title: "Home" },
  { url: "projects/", title: "Projects" },
  { url: "resume/", title: "Resume" },
  { url: "contact/", title: "Contact" },
  { url: "https://github.com/vdhanda4", title: "GitHub" },
];

let nav = document.createElement("nav");
document.body.prepend(nav);

for (let p of pages) {
  let url = p.url;
  let title = p.title;
  if (!url.startsWith("http")) {
    url = BASE_PATH + url;
  }
  let a = document.createElement('a');
a.href = url;
a.textContent = title;


if (a.host === location.host && a.pathname === location.pathname) {
  a.classList.add('current');
}
if (a.host !== location.host) {
  a.target = "_blank";
}


nav.append(a)
}
document.body.insertAdjacentHTML(
    "afterbegin",
    `
    <label class="color-scheme">
      Theme:
      <select id="theme-select">
        <option value="light dark">Automatic</option>
        <option value="light">Light</option>
        <option value="dark">Dark</option>
      </select>
    </label>
  `
  );
  let select = document.querySelector("#theme-select");


if ("colorScheme" in localStorage) {
  let saved = localStorage.colorScheme;
  document.documentElement.style.setProperty("color-scheme", saved);
  select.value = saved; 
}
select.addEventListener("input", function (event) {
  document.documentElement.style.setProperty("color-scheme", event.target.value);
  localStorage.colorScheme = event.target.value;
});
  

export async function fetchJSON(url) {
  try {
    const response = await fetch(url);

    if (!response.ok) {
      throw new Error(`Failed to fetch projects: ${response.statusText}`);
    }

    const data = await response.json();
    return data;

  } catch (error) {
    console.error('Error fetching or parsing JSON data:', error);
  }
}
export function renderProjects(projects, containerElement, headingLevel = 'h2') {
  if (!containerElement) return;

  const validHeadings = ['h1', 'h2', 'h3', 'h4', 'h5', 'h6'];
  const headingTag = validHeadings.includes(headingLevel) ? headingLevel : 'h2';

  containerElement.innerHTML = '';

  if (!projects || projects.length === 0) {
    containerElement.innerHTML = '<p>No projects found.</p>';
    return;
  }

  for (const project of projects) {
    const article = document.createElement('article');
    article.innerHTML = `
      <${headingTag}>${project.title || 'Untitled'}</${headingTag}>
      <img src="${project.image || ''}" alt="${project.title || 'Project image'}">
      <div class="project-details">
        <p class="project-description">${project.description || 'No description available.'}</p>
        <p class="project-year">Year: ${project.year || '2024'}</p>
      </div>
    `;
    containerElement.appendChild(article);
  }
}




export async function fetchGitHubData(username) {
  return fetchJSON(`https://api.github.com/users/${username}`);
}

