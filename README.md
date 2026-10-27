# OPEN

**Our Portal for Equality & Navigation** is a browser-based data explorer for comparing gender-related indicators across countries. It combines country-level statistics with an interactive world map so visitors can inspect legal equality indicators and browse broader social and economic measures.

## Run locally

Install the dependencies and start the Vite development server:

```sh
npm install
npm run dev
```

Open the local URL printed by Vite. To create a production build or serve that build locally:

```sh
npm run build
npm run preview
```

The app is a static front end; it does not require a server-side API or database. The map and UI use Leaflet, Bootstrap, Bootstrap Icons, and Google Fonts loaded from CDNs, so those resources need network access.

## How the app works

1. `index.html` defines the map, country details panel, tabs, and expandable indicator categories.
2. `src/main.js` loads the prepared JSON files and `countries.geojson` from `public/`. Leaflet draws the map and adds neighboring map copies so it can wrap horizontally.
3. Hovering over a country shows its name. Clicking it opens a panel with available legal equality indicators and country statistics. Binary indicators (`1=yes; 0=no`) appear in the **Equalities** and **Inequalities** tabs; other measures are grouped into Jobs & Work, Income & Financial Security, Health & Well-being, Education, Legal Rights & Gender Equality, Household & Family Dynamics, Attitudes & Beliefs, and Digital Access & Tech Use.
4. Indicator cards show the latest available value and its year in the prepared data. Poll-style indicators with subgroups provide a selector. A card's map icon colors countries by that indicator, shows a value legend, and reports values or missing data on hover. Card status colors, where available, use the indicator bounds described below.

## Data and processing

The bundled source tables in `data/` contain country-level series and yearly columns for 2020–2024:

- `2020-2024-gender_stats.csv` contains binary legal-equality questions and related gender statistics.
- `2020-2024-world_development_indicators.csv` contains wider development measures. Rows are keyed by series name/code and country name/ISO alpha-3 code.
- `public/countries.geojson` supplies the country shapes and map properties, including ISO alpha-3 codes used to join shapes to statistics.

The browser does not parse the source CSVs. The preprocessing scripts in `data/` create JSON that the app can load directly:

- `process_stats.py` combines the two CSV tables, skips missing values (`..` and blank/NaN cells), and retains the most recent non-missing observation from 2020–2024 for each country and series. It structures poll-like series as subgroup values and writes `processed_stats.json`.
- `create_categories.py` groups series into the app's display categories using keyword rules applied to their names. It excludes the binary yes/no legal indicators, which are shown separately in the Equalities/Inequalities tabs, and writes `full_categorized_series.json`.
- `process_bounds.py` assigns heuristic good/okay/bad value ranges based on indicator names and units. These ranges affect card status colors; they are not used to calculate the map's color scale. It writes `full_bounded_categorized_series.json`.

The app serves the prepared JSON from `public/`: `processed_stats.json`, `full_categorized_series.json`, and `full_bounded_categorized_series.json`. Matching generated files are also kept in `data/`. The preprocessing scripts currently contain machine-specific absolute paths; update those paths to your checkout before rerunning them, then copy the generated JSON into `public/` so the app uses the refreshed data. `create_custom_csv_data.py` is an exploratory helper for inspecting per-country CSV topics and is not part of the app's runtime pipeline.

## Project layout

```text
data/       Source CSVs, preprocessing scripts, and generated JSON
public/     Static GeoJSON and prepared JSON served to the browser
src/        Application logic and styles
index.html  App document and UI structure
```

## Notes on interpretation

Values are shown with the year of their latest available observation, which can differ between countries and indicators. The category assignments and good/okay/bad ranges are rule-based heuristics, not an analytical classification or a statement of causation. The choropleth rescales the selected indicator from its minimum to maximum among countries with data, so colors compare countries for that selection rather than across different indicators.
