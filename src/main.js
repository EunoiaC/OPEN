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

const countryData = await readJsonFile("processed_stats.json");
const seriesCategories = await readJsonFile("full_categorized_series.json");
const seriesBounds = await readJsonFile("full_bounded_categorized_series.json");

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

                    // get the json data for the current country using the code as the key
                    const data = countryData[feature.properties.ISO_A3];
                    if (!data) {
                        countryCode.innerText = "No data";
                        const inequalitiesView = document.getElementById('inequalities');
                        const equalitiesView = document.getElementById('equalities');
                        inequalitiesView.innerHTML = "";
                        equalitiesView.innerHTML = "";
                    } else {

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
                                if (value === 1) equalities.push({text, year});
                                else if (value === 0) inequalities.push({text, year});
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

                    function getStatusFromBounds(catName, item, value) {
                        const items = seriesBounds[catName];
                        for (const i of items) {
                            if (i.indicator === item) {
                                let bounds = i.bounds;
                                // check if bounds is empty brackets
                                if (Object.keys(bounds).length === 0) return "stat-none";
                                let good = bounds.good;
                                let bad = bounds.bad;
                                let ok = bounds.ok;
                                if (good.max === null) {
                                    // higher values mean better
                                    if (value > good.min) {
                                        return "stat-good";
                                    } else if (value > ok.min) {
                                        return "stat-ok";
                                    } else {
                                        return "stat-bad";
                                    }
                                } else {
                                    // lower values mean better
                                    if (value > bad.min) {
                                        return "stat-bad";
                                    } else if (value > ok.min) {
                                        return "stat-ok";
                                    } else {
                                        return "stat-good";
                                    }
                                }
                            }
                        }
                        return "stat-none";
                    }

                    function renderHeatMap(catName, pollGroup) {
                        // pollGroup = 1 means only one group
                        // pollGroup = "..." means a specific group
                        // pollGroup = null means regular data
                        // get the values for each country
                        const values = {};
                        for (const [key, value] of Object.entries(countryData)) {
                            if (key === "series_names") continue;
                            if (pollGroup === 1) {
                                let poll = value[catName];
                                if (poll==="") continue;
                                // get the only kv pair in the object
                                const [group, val] = Object.entries(poll)[0];
                                // remove the year from the value
                                const [year, raw] = val.split(':');
                                values[key] = parseFloat(raw);
                            } else if (pollGroup !== null) { // specific group
                                let poll = value[catName];
                                if (poll==="") continue;
                                let val = poll[pollGroup];
                                if (val==="") continue;
                                const [year, raw] = val.split(':');
                                values[key] = parseFloat(raw);
                            } else { // regular data
                                if (value[catName] === "") continue;
                                const [year, raw] = value[catName].split(':');
                                values[key] = parseFloat(raw);
                            }
                        }

                        const allValues = Object.values(values);
                        if (allValues.length === 0) return;

                        const min = Math.min(...allValues);
                        const max = Math.max(...allValues);

                        let legendTitle = catName;
                        if (pollGroup !== null && pollGroup !== 1) {
                            legendTitle += `(${pollGroup})`;
                        }

                        const legend = document.getElementById('legend');
                        legend.innerHTML = `<b>${legendTitle}</b><br>`;

                        const steps = 6;
                        for (let i = 0; i <= steps; i++) {
                            const norm = i / steps;
                            const val = min + norm * (max - min);
                            const color = getHeatColor(norm);
                            legend.innerHTML += `
                                <div style="display: flex; align-items: center; margin-bottom: 4px;">
                                    <div style="width: 20px; height: 12px; background: ${color}; margin-right: 5px;"></div>
                                    ${val.toFixed(1)}
                                </div>
                            `;
                        }

                        function getHeatColor(norm) {
                            // norm ∈ [0,1], map 0→blue (240°) to 1→red (0°)
                            const hue = 240 - 240 * norm;
                            return `hsl(${hue}, 70%, 50%)`;
                        }

                        map.eachLayer(layer => {
                            if (!layer.feature) return;
                            const code = layer.feature.properties.ISO_A3;
                            const name = layer.feature.properties.ADMIN || layer.feature.properties.name;
                            const val = values[code];
                            if (val == null) {
                                layer.setStyle({ fillColor: '#ccc' });
                                // on hover show name and "No data"
                                layer.bindTooltip(name + ": No data", {
                                    sticky: true,
                                    direction: 'auto'
                                });
                            } else {
                                const norm = (val - min) / (max - min);
                                layer.setStyle({
                                    fillColor: getHeatColor(norm),
                                    weight: 1,
                                    color: 'white',
                                    fillOpacity: 0.7
                                });
                                // on hover show name and value
                                layer.bindTooltip(name + ": " + val.toFixed(1), {
                                    sticky: true,
                                    direction: 'auto'
                                });
                            }
                        });
                    }

                    function renderFromCategory(catName, viewId) {
                        const series = seriesCategories[catName];
                        const view = document.getElementById(viewId);
                        view.innerHTML = "";
                        if (!data) return; // just clear the views

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
                            let div = document.createElement('div');
                            // add onclick event to div
                            if (typeof value === "string") {
                                let [year, raw] = value.split(':');
                                // if the raw value is a whole number, format it with commas
                                raw = parseFloat(raw);
                                // check where the raw lies in the bounds
                                let valueStatus = getStatusFromBounds(catName, item, raw);
                                if (Number.isInteger(raw)) {
                                    raw = raw.toLocaleString();
                                }

                                div.className = 'item-card';
                                div.innerHTML = `
                                  <span class="stat-label">${formattedLabel}</span>
                                  <span class="unit">${unit}</span>
                                  <div class="stat-content stacked ${valueStatus}">
                                    <span class="stat-value">${raw}</span>
                                  </div>
                                  <div class="stat-footer">
                                    <i>Data from ${year}</i>
                                    <i class="bi bi-map"></i>
                                  </div>
                                `;
                                // add onclick to the map
                                const mapIcon = div.querySelector('i.bi-map');
                                mapIcon.onclick = function () {
                                    renderHeatMap(item, null);
                                }
                                view.appendChild(div);
                            } else {
                                const groups = Object.keys(value);
                                if (groups.length < 2) {
                                    // single subgroup — treat like a string
                                    let [year, raw] = Object.values(value)[0].split(':');
                                    // if the raw value is a whole number, format it with commas
                                    raw = parseFloat(raw);
                                    // check where the raw lies in the bounds
                                    let valueStatus = getStatusFromBounds(catName, item, raw);
                                    if (Number.isInteger(raw)) {
                                        raw = raw.toLocaleString();
                                    }
                                    div.className = 'item-card';
                                    div.innerHTML = `
                                        <span class="stat-label">${formattedLabel}</span>
                                        <span class="unit">${unit}</span>
                                        <div class="stat-content stacked ${valueStatus}">
                                          <span class="stat-value">${raw}</span>
                                        </div>
                                        <div class="stat-footer">
                                            <i>Data from ${year}</i>
                                            <i class="bi bi-map"></i>
                                        </div>
                                      `;
                                    // add onclick to the map
                                    const mapIcon = div.querySelector('i.bi-map');
                                    mapIcon.onclick = function () {
                                        renderHeatMap(item, 1);
                                    }
                                    view.appendChild(div);
                                } else {
                                    // multiple — render select
                                    const options = groups
                                        .map(key => `<option value="${key}">${key}</option>`)
                                        .join('');
                                    let [initialYear, initialRaw] = value[groups[0]].split(':');
                                    // if the raw value is a whole number, format it with commas
                                    initialRaw = parseFloat(initialRaw);
                                    // check where the raw lies in the bounds
                                    let valueStatus = getStatusFromBounds(catName, item, initialRaw);
                                    if (Number.isInteger(initialRaw)) {
                                        initialRaw = initialRaw.toLocaleString();
                                    }
                                    div.className = 'item-card';
                                    div.innerHTML = `
                                      <span class="stat-label">${formattedLabel}</span>
                                      <span class="unit">${unit}</span>
                                      <div class="stat-wrapper">
                                        <div class="stat-content stacked ${valueStatus}">
                                          <span class="stat-value">${initialRaw}</span>
                                        </div>
                                        <select class="poll-group-select">${options}</select>
                                      </div>
                                      <div class="stat-footer">
                                        <i>Data from ${initialYear}</i>
                                        <i class="bi bi-map"></i>
                                      </div>
                                    `;
                                    const select = div.querySelector('.poll-group-select');
                                    const valueEl = div.querySelector('.stat-value');
                                    const contentEl = div.querySelector('.stat-content');
                                    const tip = div.querySelector('i');
                                    const mapIcon = div.querySelector('.bi-map');
                                    select.addEventListener('change', () => {
                                        let [year, raw] = value[select.value].split(':');
                                        // if the raw value is a whole number, format it with commas
                                        raw = parseFloat(raw);
                                        // make sure stat-content only has stat-content and stacked
                                        contentEl.className = "stat-content stacked";
                                        // check where the raw lies in the bounds
                                        let valueStatus = getStatusFromBounds(catName, item, raw);
                                        contentEl.classList.add(valueStatus);
                                        if (Number.isInteger(raw)) {
                                            raw = raw.toLocaleString();
                                        }
                                        valueEl.textContent = raw;
                                        tip.textContent = `Data from ${year}`;

                                    });
                                    mapIcon.onclick = function () {
                                        // get the selected option value
                                        const selectedValue = select.value;
                                        renderHeatMap(item, selectedValue);
                                    }
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