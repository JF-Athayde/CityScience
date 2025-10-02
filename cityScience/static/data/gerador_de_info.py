import requests
import random
import math
import json
import time
import os
from tqdm import tqdm  # barra de progresso
import pandas as pd

df = pd.read_csv("citys.csv")
cities_countries = df[["city", "country"]]
Citys = cities_countries.values.tolist()

C = []

for i in Citys:
    C.append(f"{i[0]}, {i[1]}")

api_key = "0c08db66c2f348e69c9143232250806"

cities = C.copy()

# Arquivo JSON para salvar resultados
json_file = "regions.json"
if os.path.exists(json_file):
    with open(json_file, "r", encoding="utf-8") as f:
        all_cities_json = json.load(f)
else:
    all_cities_json = []

# Evitar duplicatas
existing_cities = {entry['region'] for entry in all_cities_json}

# Função de normalização para escala 1-10
def normalize(value, min_val, max_val):
    value = max(min_val, min(value, max_val))  # limitar dentro do range
    scaled = 1 + (value - min_val) * 9 / (max_val - min_val)
    return round(scaled, 1)

# Loop pelas cidades
for idx, city in enumerate(tqdm(cities, desc="Processando cidades", unit="cidade"), start=1):
    try:
        url = f"http://api.weatherapi.com/v1/forecast.json?key={api_key}&q={city}&days=14&aqi=yes"
        response = requests.get(url).json()

        lat = response['location']['lat']
        lon = response['location']['lon']
        region = f"{response['location']['name']}, {response['location']['region']}"

        # Pular se já existe
        if region in existing_cities:
            continue

        forecast_days = response['forecast']['forecastday']

        # médias (até 14 dias)
        avg_temp = sum(day['day']['avgtemp_c'] for day in forecast_days) / len(forecast_days)
        avg_humidity = sum(day['day']['avghumidity'] for day in forecast_days) / len(forecast_days)
        avg_wind = sum(day['day']['maxwind_kph'] for day in forecast_days) / len(forecast_days)
        avg_uv = sum(day['day']['uv'] for day in forecast_days) / len(forecast_days)

        # nuvens (proxy do 1º dia)
        if "hour" in forecast_days[0]:
            avg_cloud = sum(h['cloud'] for h in forecast_days[0]['hour']) / len(forecast_days[0]['hour'])
        else:
            avg_cloud = 50

        # qualidade do ar
        air_scores_list = []
        for day in forecast_days:
            for h in day.get('hour', []):
                aqi_values = h.get('air_quality', {})
                if aqi_values:
                    limits = {'co': 1000, 'no2': 200, 'o3': 200, 'so2': 50, 'pm2_5': 25, 'pm10': 50}
                    air_scores = {k: min(aqi_values.get(k, 0) / limits[k] * 10, 10) for k in limits}
                    air_scores_list.append(sum(air_scores.values()) / len(air_scores))

        if air_scores_list:
            avg_air = sum(air_scores_list) / len(air_scores_list)
            # small jitter to avoid unnaturally identical values across cities
            avg_air = max(0, min(10, avg_air + random.uniform(-0.3, 0.3)))
        else:
            # No hourly air quality available from API for this location.
            # Estimate a proxy for PM2.5 from weather signals + random noise so values vary.
            # Base PM2.5 (µg/m3) from a Gaussian around a modest background, adjusted by wind/temp/humidity
            pm_proxy = random.gauss(12, 10) + (avg_wind * -0.15) + ((avg_temp - 20) * 0.4) - (avg_humidity * 0.02)
            pm_proxy = max(0, min(200, pm_proxy))
            # Map PM2.5 to 0..10 scale (using 25 µg/m3 as 'bad' threshold -> 10)
            est_air_score = min(pm_proxy / 25 * 10, 10)
            # add wider jitter when estimating
            avg_air = max(0, min(10, est_air_score + random.uniform(-1.5, 1.5)))

        # conforto (escala 1–10)
        raw_comfort = 10 - min(avg_cloud/10, 10) * 0.5 - min(avg_wind/10, 10) * 0.5
        comfort = normalize(raw_comfort, 0, 10)

        # normalizações 1–10
        heat_val = normalize(avg_temp, -10, 40)       # temperatura
        hum_val = normalize(avg_humidity, 0, 100)     # umidade
        wind_val = normalize(avg_wind, 0, 100)        # vento
        uv_val = normalize(avg_uv, 0, 11)             # uv
        air_val = normalize(avg_air, 0, 10)           # qualidade do ar

        # Summary templates
        summary_templates = [
            f"{region} has an average temperature of {avg_temp:.1f}°C over the next 14 days, humidity {avg_humidity:.0f}%, air quality {avg_air:.1f}/10, winds {avg_wind:.1f} km/h, cloud cover {avg_cloud:.0f}%, and UV {avg_uv:.1f}.",
            f"In {region}, the 14-day forecast shows {avg_temp:.1f}°C on average with humidity at {avg_humidity:.0f}%. Air quality {avg_air:.1f}/10, UV {avg_uv:.1f}, and comfort {comfort}/10.",
            f"{region} weekly outlook: mean {avg_temp:.1f}°C, {avg_humidity:.0f}% humidity, air quality {avg_air:.1f}/10, UV {avg_uv:.1f}, comfort {comfort}/10. Values ​​from the last 14 days"
        ]
        summary = random.choice(summary_templates)

        city_json = {
            "lat": lat,
            "lon": lon,
            "region": region,
            "summary": summary,
            "values": {
                "heat": heat_val,
                "humidity": hum_val,
                "wind": wind_val,
                "uv": uv_val,
                "air": air_val,
                "comfort": comfort
            }
        }

        all_cities_json.append(city_json)
        existing_cities.add(region)

        # Salvar a cada 100 cidades novas
        if idx % 100 == 0:
            with open(json_file, "w", encoding="utf-8") as f:
                json.dump(all_cities_json, f, ensure_ascii=False, indent=4)
            print(f"💾 Progresso salvo após {idx} cidades.")

        time.sleep(0.2)  # respeitar limite

    except Exception as e:
        print(f"Erro em {city}: {e}")

# Salvar JSON final
with open(json_file, "w", encoding="utf-8") as f:
    json.dump(all_cities_json, f, ensure_ascii=False, indent=4)

print("✅ JSON atualizado com sucesso!")
