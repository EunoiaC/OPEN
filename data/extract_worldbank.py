import pycountry
import requests

country_codes = [country.alpha_3 for country in pycountry.countries]

for code in country_codes:
    try:
        print(f"Extracting: {code}")
        url = f"https://extdataportal.worldbank.org/content/dam/sites/data/gender-data/data/data-gen/zip/country/{code}-availability.zip"
        response = requests.get(url, stream=True, timeout=10)
        if response.status_code == 200:
            with open(f"{code}.zip", "wb") as file:
                for chunk in response.iter_content(chunk_size=1024):
                    file.write(chunk)
        else:
            print(f"Failed to download {code}: HTTP {response.status_code}")
    except requests.exceptions.RequestException as e:
        print(f"Error with {code}: {e}")