import random

def compute_estimated_air(avg_temp, avg_wind, avg_humidity):
    pm_proxy = random.gauss(12, 10) + (avg_wind * -0.15) + ((avg_temp - 20) * 0.4) - (avg_humidity * 0.02)
    pm_proxy = max(0, min(200, pm_proxy))
    est_air_score = min(pm_proxy / 25 * 10, 10)
    avg_air = max(0, min(10, est_air_score + random.uniform(-1.5, 1.5)))
    return round(avg_air, 2), round(pm_proxy, 2)

print('Sample estimated air scores (avg_air, pm_proxy µg/m3):')
for i in range(15):
    t = random.uniform(-5, 35)   # avg_temp
    w = random.uniform(0, 60)    # avg_wind
    h = random.uniform(10, 100)  # avg_humidity
    air, pm = compute_estimated_air(t, w, h)
    print(f"temp={t:.1f}C wind={w:.1f}km/h hum={h:.1f}% -> air={air} (pm~{pm})")
