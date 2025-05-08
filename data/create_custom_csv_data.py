import pandas as pd

path = "/Users/aadiyadav/Documents/GitHub/OPEN/data/all_country_data/"

import pycountry
country_codes = [country.alpha_3 for country in pycountry.countries]

my_columns = set()
# first get all possible column names
for country in country_codes:
    csv_file = f"{path}{country}.csv"
    # read the csv file
    try:
        df = pd.read_csv(csv_file)
        # read all rows in 'topic' column and add to my_columns
        my_columns.update(df['Topic'].unique())
    except:
        continue

print(my_columns)

