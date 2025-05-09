# Rebuilding categories without including any "1=yes; 0=no" series
# And extending to cover all categories we can find in the data

# Helper to check if a series is a legal yes/no field
def is_yes_no(series):
    return "(1=yes; 0=no)" in series

import json
input_path = "/Users/aadiyadav/Documents/GitHub/OPEN/public/processed_gender_stats.json"
with open(input_path, "r") as f:
    data = json.load(f)
    series_names = data["series_names"]

# Define extended categories
extended_categories = {
    "Jobs & Work": [],
    "Income & Financial Security": [],
    "Health & Well-being": [],
    "Education": [],
    "Legal Rights & Gender Equality": [],
    "Household & Family Dynamics": [],
    "Attitudes & Beliefs (Polls)": [],
    "Digital Access & Tech Use": []
}

# Classify each series name (excluding yes/no series)
for series in series_names:
    if is_yes_no(series):
        continue  # Skip structural yes/no indicators

    name_lower = series.lower()

    if any(keyword in name_lower for keyword in ["labor force", "employment", "unemployment", "work", "job", "manager", "firm", "occupation", "paid leave", "wage", "salary", "pension", "senior", "part time"]):
        extended_categories["Jobs & Work"].append(series)
    elif any(keyword in name_lower for keyword in ["income", "gdp", "gni", "account", "money", "borrow", "save", "financial", "debit", "credit", "expense", "pay", "salary"]):
        extended_categories["Income & Financial Security"].append(series)
    elif any(keyword in name_lower for keyword in ["health", "maternal", "fertility", "contraceptive", "hiv", "aids", "immunization", "life expectancy", "death", "mortality", "birth", "care", "menstrual", "teenage mother", "childbirth", "malaria", "nutrition", "stunting", "wasting"]):
        extended_categories["Health & Well-being"].append(series)
    elif any(keyword in name_lower for keyword in ["school", "education", "literacy", "enrollment", "graduation", "attainment", "learning", "students"]):
        extended_categories["Education"].append(series)
    elif any(keyword in name_lower for keyword in ["decision", "household", "married", "spouse", "partner", "land", "own", "ownership", "marriage", "childcare", "family", "fertility planning"]):
        extended_categories["Household & Family Dynamics"].append(series)
    elif any(keyword in name_lower for keyword in ["worried", "belief", "justified", "attitude", "fgm", "religion", "violence", "hardship", "poll", "perception"]):
        extended_categories["Attitudes & Beliefs (Polls)"].append(series)
    elif any(keyword in name_lower for keyword in ["internet", "mobile", "digital", "online", "tech", "technology", "phone", "device"]):
        extended_categories["Digital Access & Tech Use"].append(series)
    elif any(keyword in name_lower for keyword in ["wbl", "business and the law", "index score"]):
        extended_categories["Legal Rights & Gender Equality"].append(series)

# Filter only categories that have at least one series
final_categories = {k: v for k, v in extended_categories.items() if v}

# Save the completed categorization
final_output_path = "/Users/aadiyadav/Documents/GitHub/OPEN/public/full_categorized_series.json"
with open(final_output_path, "w") as f:
    json.dump(final_categories, f, indent=2)

final_output_path
