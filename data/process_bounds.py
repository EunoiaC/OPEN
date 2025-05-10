def get_bounds(indicator_name):
    name = indicator_name.lower()

    if "unemployment" in name:
        return {"good": {"min": 1, "max": 10}, "ok": {"min": 10, "max": 50}, "bad": {"min": 50, "max": None}}
    elif "mortality" in name or "death rate" in name or "deaths" in name:
        return {"good": {"min": 0, "max": 5}, "ok": {"min": 5, "max": 20}, "bad": {"min": 20, "max": None}}
    elif "life expectancy" in name:
        return {"bad": {"min": 0, "max": 50}, "ok": {"min": 50, "max": 70}, "good": {"min": 70, "max": None}}
    elif "literacy rate" in name:
        return {"bad": {"min": 0, "max": 60}, "ok": {"min": 60, "max": 90}, "good": {"min": 90, "max": None}}
    elif "school enrollment" in name or "education expenditure" in name:
        return {"bad": {"min": 0, "max": 40}, "ok": {"min": 40, "max": 80}, "good": {"min": 80, "max": None}}
    elif "gdp per capita" in name or "income" in name:
        return {"bad": {"min": 0, "max": 2000}, "ok": {"min": 2000, "max": 10000}, "good": {"min": 10000, "max": None}}
    elif "hiv" in name or "malaria" in name or "disease" in name:
        return {"good": {"min": 0, "max": 1}, "ok": {"min": 1, "max": 10}, "bad": {"min": 10, "max": None}}
    elif "pollution" in name or "co2" in name or "carbon" in name or "pm2.5" in name:
        return {"good": {"min": 0, "max": 10}, "ok": {"min": 10, "max": 35}, "bad": {"min": 35, "max": None}}
    elif "%" in indicator_name:
        return {"bad": {"min": 0, "max": 30}, "ok": {"min": 30, "max": 70}, "good": {"min": 70, "max": None}}
    else:
        return {}

import json
input_path = "/Users/aadiyadav/Documents/GitHub/OPEN/data/full_categorized_series.json"
with open(input_path, "r") as f:
    data = json.load(f)

# Reprocess the entire dataset with updated bounds
full_bounded_data = {}
for category, indicators in data.items():
    full_bounded_data[category] = []
    for indicator in indicators:
        bounds = get_bounds(indicator)
        full_bounded_data[category].append({
            "indicator": indicator,
            "bounds": bounds
        })

# Save the comprehensive bounded dataset
final_output_path = "/Users/aadiyadav/Documents/GitHub/OPEN/data/full_bounded_categorized_series.json"
with open(final_output_path, "w") as f:
    json.dump(full_bounded_data, f, indent=2)