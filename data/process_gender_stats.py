import pandas as pd
import pycountry

# Build list of valid country codes and column names
country_codes = [country.alpha_3 for country in pycountry.countries]
data_cols = [f"{year} [YR{year}]" for year in range(2020, 2025)]
path = "/Users/aadiyadav/Documents/GitHub/OPEN/data/2020-2024-gender_stats.csv"
output_path = "/Users/aadiyadav/Documents/GitHub/OPEN/data/processed_gender_stats.json"

# Define data classes
class Data:
    def __init__(self, year, name, value):
        self.year = year
        self.name = name
        self.value = value

class CountryData:
    def __init__(self, code, name):
        self.country_code = code
        self.country_name = name
        self.data = {}

    def add_data(self, year, name, value):
        if name not in self.data or year > self.data[name].year:
            self.data[name] = Data(year, name, value)

# Read CSV
df = pd.read_csv(path)
country_data = {}

# Process each row
for _, row in df.iterrows():
    country_code = row["Country Code"]
    country_name = row["Country Name"]
    series_name = row["Series Name"]

    if not isinstance(series_name, str) or "modeled" in series_name:
        continue

    if country_code not in country_data:
        country_data[country_code] = CountryData(country_code, country_name)

    for col in data_cols:
        value = row[col]
        if pd.notna(value) and str(value).strip() != "..":
            year = int(col.split("[YR")[1].split("]")[0])
            country_data[country_code].add_data(year, series_name, value)

# Get all unique series names
series_names = sorted({sname for c in country_data.values() for sname in c.data})

# Build output data
import math
data = {} # key: code, value: data
for code, country in country_data.items():
    if type(code) == float:
        continue # this is the nan one
    data_ = {
        "Country Code": code,
        "Country Name": country.country_name
    }
    for sname in series_names:
        if sname in country.data:
            d = country.data[sname]
            data_[sname] = f"{d.year}: {d.value}"
        else:
            data_[sname] = ""

    data[code] = data_

data["series_names"] = series_names
# Save JSON
import json
with open(output_path, "w") as f:
    json.dump(data, f, indent=4)
