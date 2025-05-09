async function readJsonFile(path) {
    try {
        const response = await fetch(path);
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        const jsonData = await response.json();
        return jsonData;
    } catch (error) {
        console.error("Could not read JSON file:", error);
    }
}

const countryData = await readJsonFile("processed_gender_stats.json");
const seriesCategories = await readJsonFile("full_categorized_series.json");

const map = L.map('map', {
    center: [20, 0],
    zoom: 2,
    minZoom: 2,
    maxZoom: 5,
    worldCopyJump: true
});

function getRandomColor(name) {
    let hash = 0;
    for (let i = 0; i < name.length; i++) {
        hash = name.charCodeAt(i) + ((hash << 5) - hash);
    }
    return `hsl(${hash % 360}, 70%, 60%)`;
}

function createCountryLayer(data, offset = 0) {
    return L.geoJSON(data, {
        style: feature => ({
            fillColor: getRandomColor(feature.properties.ADMIN || feature.properties.name),
            weight: 1,
            color: 'white',
            fillOpacity: 0.7
        }),
        onEachFeature: (feature, layer) => {
            const name = feature.properties.ADMIN || feature.properties.name;
            layer.bindTooltip(name, {
                sticky: true,
                direction: 'auto'
            });
            layer.on({
                mouseover: () => {
                    layer.setStyle({ fillOpacity: 1 });
                    layer.openTooltip();
                },
                mouseout: () => {
                    layer.setStyle({ fillOpacity: 0.7 });
                    layer.closeTooltip();
                },
                click: () => {
                    // render the content
                    const panel = document.getElementById('panel');
                    panel.classList.add('visible');
                    const countryName = document.getElementById('panel-country-name');
                    const countryCode = document.getElementById('panel-country-code');
                    countryName.innerText = feature.properties.ADMIN;
                    if (feature.properties.ISO_A3 !== "-99")
                        countryCode.innerText = "(" + feature.properties.ISO_A3 + ")";
                    else countryCode.innerText = "";

                    // get the json data for the current country using the code as the key (processed_gender_stats.json)
                    const data = countryData[feature.properties.ISO_A3];
                    if (!data) {
                        countryCode.innerText = "No data";
                        const inequalitiesView = document.getElementById('inequalities');
                        const equalitiesView = document.getElementById('equalities');
                        inequalitiesView.innerHTML = "";
                        equalitiesView.innerHTML = "";
                        return;
                    }

                    console.log(data);

                    let equalities = [];
                    let inequalities = [];

                    // get all the keys in data that have "(1=yes; 0=no)" in them
                    let seriesNames = countryData["series_names"];
                    seriesNames
                        .filter(n => n.includes("(1=yes; 0=no)"))
                        .forEach(name => {
                            const [year, raw] = data[name].split(":");
                            const value = parseFloat(raw);
                            const text = name.replace(" (1=yes; 0=no)", "");
                            if (value === 1) equalities.push({ text, year });
                            else if (value === 0) inequalities.push({ text, year });
                        });

                    // now render the equalities and inequalities in the panel
                    const inequalitiesView = document.getElementById('inequalities');
                    const equalitiesView = document.getElementById('equalities');
                    inequalitiesView.innerHTML = "";
                    equalitiesView.innerHTML = "";

                    equalities.forEach(item => {
                        const div = document.createElement('div');
                        div.className = "item-card equality";
                        div.innerHTML = `
                        <p>
                          <span>${item.text}? <strong>YES</strong></span>
                          <i data-tooltip="Data from ${item.year}" class="bi bi-info-circle"></i>
                        </p>
                        `;
                        equalitiesView.appendChild(div);
                    });

                    inequalities.forEach(item => {
                        const div = document.createElement('div');
                        div.className = "item-card inequality";
                        div.innerHTML = `
                        <p>
                          <span>${item.text}? <strong>NO</strong></span>
                          <i data-tooltip="Data from ${item.year}" class="bi bi-info-circle"></i>
                        </p>
                        `;
                        inequalitiesView.appendChild(div);
                    });

                    // check if equalities and inequalities are empty, and set the text to "no data" for each
                    if (equalities.length === 0 && inequalities.length === 0) {
                        let div = document.createElement('div');
                        div.className = "item-card no-data";
                        div.innerHTML = `
                        <p>
                          <span>No data</span>
                        </p>
                        `;
                        equalitiesView.appendChild(div);
                        div = document.createElement('div');
                        div.className = "item-card no-data";
                        div.innerHTML = `
                        <p>
                          <span>No data</span>
                        </p>
                        `;
                        inequalitiesView.appendChild(div);
                    } else if (equalities.length === 0) {
                        let div = document.createElement('div');
                        div.className = "item-card no-data";
                        div.innerHTML = `
                        <p>
                          <span>None</span>
                        </p>
                        `;
                        equalitiesView.appendChild(div);
                    } else if (inequalities.length === 0) {
                        let div = document.createElement('div');
                        div.className = "item-card no-data";
                        div.innerHTML = `
                        <p>
                          <span>None</span>
                        </p>
                        `;
                        inequalitiesView.appendChild(div);
                    }

                    function formatItemLabel(item) {
                        let count = 0;
                        return item.replace(/\([^)]*\)/g, match => {
                            const cls = count === 0
                                ? 'underline'
                                : count === 1
                                    ? 'highlight'
                                    : '';
                            count++;
                            return `<span class="${cls}">${match}</span>`;
                        });
                    }

                    function renderFromCategory(catName, viewId) {
                        const series = seriesCategories[catName];
                        const view = document.getElementById(viewId);
                        view.innerHTML = "";

                        for (const item of series) {
                            let value = data[item];
                            if (value === "") continue;
                            const unitMatch = item.match(/\(([^)]*)\)/);
                            const unit = unitMatch ? unitMatch[1] : '';
                            const textWithoutUnit = item.replace(/\s*\([^)]*\)/, '');
                            const formattedLabel = textWithoutUnit.replace(/\([^)]*\)/g,
                                match => `<span class="highlight">${match}</span>`
                            );
                            // check if value is a string or object
                            if (typeof value === "string") {

                                let [year, raw] = value.split(':');
                                // if the raw value is a whole number, format it with commas
                                if (Number.isInteger(parseFloat(raw))) {
                                    raw = parseFloat(raw).toLocaleString();
                                }

                                const div = document.createElement('div');
                                div.className = 'item-card';
                                div.innerHTML = `
                                  <span class="stat-label">${formattedLabel}</span>
                                  <span class="unit">${unit}</span>
                                  <div class="stat-content stacked">
                                    <span class="stat-value">${raw}</span>
                                  </div>
                                  <div class="stat-footer">
                                    <i>Data from ${year}</i>
                                  </div>
                                `;
                                view.appendChild(div);
                            } else {
                                const groups = Object.keys(value);
                                if (groups.length < 2) {
                                    // single subgroup — treat like a string
                                    let [year, raw] = Object.values(value)[0].split(':');
                                    // if the raw value is a whole number, format it with commas
                                    if (Number.isInteger(parseFloat(raw))) {
                                        raw = parseFloat(raw).toLocaleString();
                                    }
                                    const div = document.createElement('div');
                                    div.className = 'item-card';
                                    div.innerHTML = `
                                        <span class="stat-label">${textWithoutUnit}</span>
                                        <span class="unit">${unit}</span>
                                        <div class="stat-content stacked">
                                          <span class="stat-value">${raw}</span>
                                        </div>
                                        <div class="stat-footer">
                                            <i>Data from ${year}</i>
                                        </div>
                                      `;
                                    view.appendChild(div);
                                } else {
                                    // multiple — render select
                                    const options = groups
                                        .map(key => `<option value="${key}">${key}</option>`)
                                        .join('');
                                    let [initialYear, initialRaw] = value[groups[0]].split(':');
                                    // if the raw value is a whole number, format it with commas
                                    if (Number.isInteger(parseFloat(initialRaw))) {
                                        initialRaw = parseFloat(initialRaw).toLocaleString();
                                    }
                                    const div = document.createElement('div');
                                    div.className = 'item-card';
                                    div.innerHTML = `
                                      <span class="stat-label">${textWithoutUnit}</span>
                                      <span class="unit">${unit}</span>
                                      <div class="stat-wrapper">
                                        <div class="stat-content stacked">
                                          <span class="stat-value">${initialRaw}</span>
                                        </div>
                                        <select class="poll-group-select">${options}</select>
                                      </div>
                                      <div class="stat-footer">
                                        <i>Data from ${initialYear}</i>
                                      </div>
                                    `;
                                    const select = div.querySelector('.poll-group-select');
                                    const valueEl = div.querySelector('.stat-value');
                                    const tip = div.querySelector('i');
                                    select.addEventListener('change', () => {
                                        let [year, raw] = value[select.value].split(':');
                                        // if the raw value is a whole number, format it with commas
                                        if (Number.isInteger(parseFloat(raw))) {
                                            raw = parseFloat(raw).toLocaleString();
                                        }
                                        valueEl.textContent = raw;
                                        tip.textContent = `Data from ${year}`;
                                    });
                                    view.appendChild(div);
                                }
                            }
                        }
                    }
                    renderFromCategory("Jobs & Work", 'jobsWorkContent');
                    renderFromCategory("Income & Financial Security", 'incomeFinancialContent');
                    renderFromCategory("Health & Well-being", 'healthContent');
                    renderFromCategory("Education", 'educationContent');
                    renderFromCategory("Legal Rights & Gender Equality", 'legalRightsContent');
                    renderFromCategory("Household & Family Dynamics", 'householdContent');
                    renderFromCategory("Attitudes & Beliefs (Polls)", 'attitudesContent');
                    renderFromCategory("Digital Access & Tech Use", 'digitalAccessContent');
                }
            });
        },
        coordsToLatLng: coords => {
            const latlng = L.GeoJSON.coordsToLatLng(coords);
            latlng.lng += offset;
            return latlng;
        }
    });
}

fetch('countries.geojson')
    .then(res => res.json())
    .then(data => {
        const worldWidth = 360;

        // Add original data
        createCountryLayer(data, 0).addTo(map);

        // Add copies to the left and right
        createCountryLayer(data, -worldWidth).addTo(map);
        createCountryLayer(data, worldWidth).addTo(map);
    });

// ui stuff
const tabs = document.querySelectorAll('#panel .tab-btn');
const contents = document.querySelectorAll('#panel .tab-content');

tabs.forEach(btn => {
    btn.addEventListener('click', () => {
        tabs.forEach(b => b.classList.remove('active'));
        contents.forEach(c => c.classList.remove('active'));
        btn.classList.add('active');
        document.getElementById(btn.dataset.tab).classList.add('active');
    });
});