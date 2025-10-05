import pandas as pd

df = pd.read_csv("citys.csv")
cities_countries = df[["city", "country"]]
Citys = cities_countries.values.tolist()

for c, i in enumerate(Citys): # 582
    if c == 582:
        print(i)
    if i[0] == 'Cacuaco':
        print(c)
        break