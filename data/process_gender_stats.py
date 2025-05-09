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

    def __repr__(self):
        return f"{self.name}: {self.value} ({self.year})"

class PollData:
    def __init__(self, name, value_type):
        # data -> key: group, value: data
        self.data = {}
        self.value_type = value_type # e.g. % of urban population
        self.name = name

    def add_data(self, group, value, year):
        if group not in self.data or year > self.data[group].year:
            self.data[group] = Data(year, group, value)

    def extend(self, poll):
        # merge the data of the two polls
        for group, data in poll.data.items():
            if group not in self.data or data.year > self.data[group].year:
                self.data[group] = data

    def __repr__(self):
        # get all the poll subgroups and their values
        res = f"== {self.name} {self.value_type} ==\n"
        for group, data in self.data.items():
            res += f"{group}: {data.value} ({data.year})\n"
        return res

class CountryData:
    def __init__(self, code, name):
        self.country_code = code
        self.country_name = name
        self.data = {}

    def add_data(self, year, name, value):
        if name not in self.data or year > self.data[name].year:
            poll = None
            if ":" in name:
                # one indicator of a poll
                poll_name = name.split(":")[0].strip()
                # get a substring between the first colon and the first bracket
                subgroup = name.split(":")[1].split("(")[0].strip()
                # get the value type from between the brackets
                value_type = name[name.find('('):]
                if any(sub in subgroup for sub in ["Q1", "Q2", "Q3", "Q4", "Q5"]):
                    if subgroup == "Q1": subgroup += " (lowest)"
                    elif subgroup == "Q5": subgroup += " (highest)"
                    # means the value type is in the name itself after parentheses in the name
                    value_type = poll_name[poll_name.find('('):poll_name.find(')')+1]
                    # now remove value_type from the name
                    poll_name = poll_name.replace(" " + value_type, "")
                poll = PollData(poll_name, value_type)
                poll.add_data(subgroup, value, year)
            elif ',' in name and (name.find('(') == -1 or name.find(',') < name.find('(')):
                # make sure the comma is not in the brackets
                poll_name = name.split(",")[0].strip()
                # the subgroup is either between the first comma and the first bracket
                # or between the first comma and last comma
                if name.find('(') != -1:
                    # subgroup is between the first comma and the first bracket
                    # there may be commas in the subgroup, so we can't just split by comma
                    subgroup = name[name.find(",") + 1:name.find("(")].strip()
                    value_type = name[name.find('('):]
                    poll = PollData(poll_name, value_type)
                    poll.add_data(subgroup, value, year)
                elif name.count(",") > 1:
                    # subgroup is between the first comma and the last comma
                    # there may be commas in the subgroup, so we can't just split by comma
                    subgroup = name[name.find(",") + 1:name.rfind(",")].strip()
                    value_type = name.split(",")[-1].strip() # the last part is the value type
                    poll = PollData(poll_name, value_type)
                    poll.add_data(subgroup, value, year)
                else: # only one comma (means no value_type type):
                    # the subgroup is after the first comma
                    subgroup = name.split(",")[1].strip()
                    value_type = ""
                    poll = PollData(poll_name, value_type)
                    poll.add_data(subgroup, value, year)
            if poll is not None:
                # check if the poll name + value_type is already in the data
                if poll.name + " " + poll.value_type in self.data:
                    # ok we found it, lets see if it's of type Data or PollData
                    obj = self.data[poll.name + " " + poll.value_type]
                    if isinstance(obj, PollData):
                        # merge the data of the two polls
                        obj.extend(poll)
                    else:
                        self.data[poll.name + " " + poll.value_type] = poll
                        # add the data to the poll
                        poll.add_data("general", obj.value, obj.year)
                else:
                    # add the poll to the data
                    self.data[poll.name + " " + poll.value_type] = poll
            else:
                self.data[name] = Data(year, name, value)

    def __repr__(self):
        res = f"== {self.country_name} ({self.country_code}) ==\n"
        for name, data in self.data.items():
            res += str(data) + "\n"
        return res
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


# get usa and print its data
# usa = country_data["USA"]
# print(usa)

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
            if isinstance(d, Data):
                data_[sname] = f"{d.year}: {d.value}"
            else:
                poll_data = {}
                for group, d in d.data.items():
                    poll_data[group] = f"{d.year}: {d.value}"
                data_[sname] = poll_data
        else:
            data_[sname] = ""

    data[code] = data_

data["series_names"] = series_names
# Save JSON
import json
with open(output_path, "w") as f:
    json.dump(data, f, indent=4)
