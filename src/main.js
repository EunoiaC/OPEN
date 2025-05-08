import "path";

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
console.log(countryData);

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

                    let equalities = [];
                    let inequalities = [];

                    // get all the keys in data that have "(1=yes; 0=no)" in them
                    let seriesNames = countryData["series_names"];
                    for (let i = 0; i < seriesNames.length; i++) {
                        if (seriesNames[i].includes("(1=yes; 0=no)")) {
                            let value = data[seriesNames[i]];
                            // value is stored as "year: value", need to separate them
                            let year = value.split(":")[0];
                            value = value.split(":")[1];
                            // convert value to a number
                            value = parseFloat(value);
                            // check if value is 1 or 0
                            if (value === 1) {
                                equalities.push(seriesNames[i]);
                            } else if (value === 0) {
                                inequalities.push(seriesNames[i]);
                            }
                        }
                    }

                    // now render the equalities and inequalities in the panel
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