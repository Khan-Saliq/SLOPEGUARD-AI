"""
Historical Landslide Dataset Generator & Feature Builder for North Eastern Region (NER)
Based on Geological Survey of India (GSI) and NASA Landslide Hazard Assessment methodology.
"""

import numpy as np
import pandas as pd
import os

# Known high-risk and baseline geographic clusters across NER and sensitive hill ranges
NER_CLUSTERS = [
    {"name": "Cherrapunji/Sohra", "lat": 25.27, "lng": 91.73, "base_elev": 1430, "base_slope": 48, "hist_freq": 0.92, "state": "Meghalaya"},
    {"name": "Upper Shillong", "lat": 25.54, "lng": 91.87, "base_elev": 1961, "base_slope": 42, "hist_freq": 0.85, "state": "Meghalaya"},
    {"name": "Gangtok Ridge", "lat": 27.33, "lng": 88.61, "base_elev": 1650, "base_slope": 52, "hist_freq": 0.89, "state": "Sikkim"},
    {"name": "Guwahati Hills", "lat": 26.14, "lng": 91.73, "base_elev": 120, "base_slope": 35, "hist_freq": 0.70, "state": "Assam"},
    {"name": "Kohima Pass", "lat": 25.67, "lng": 94.10, "base_elev": 1444, "base_slope": 46, "hist_freq": 0.78, "state": "Nagaland"},
    {"name": "Champhai Pass", "lat": 23.47, "lng": 93.32, "base_elev": 1678, "base_slope": 44, "hist_freq": 0.72, "state": "Mizoram"},
    {"name": "Itanagar Hills", "lat": 27.10, "lng": 93.62, "base_elev": 750, "base_slope": 36, "hist_freq": 0.58, "state": "Arunachal Pradesh"},
    {"name": "Imphal Valley Edge", "lat": 24.81, "lng": 93.93, "base_elev": 786, "base_slope": 41, "hist_freq": 0.82, "state": "Manipur"},
    {"name": "Darjeeling Toy Train Cut", "lat": 27.04, "lng": 88.26, "base_elev": 2042, "base_slope": 45, "hist_freq": 0.80, "state": "West Bengal"},
    {"name": "Wayanad Western Ghats", "lat": 11.68, "lng": 76.13, "base_elev": 950, "base_slope": 49, "hist_freq": 0.94, "state": "Kerala"},
    {"name": "Kedarnath Pass", "lat": 30.73, "lng": 79.06, "base_elev": 3583, "base_slope": 56, "hist_freq": 0.95, "state": "Uttarakhand"},
    {"name": "Shimla Kinnaur NH", "lat": 31.10, "lng": 77.17, "base_elev": 2276, "base_slope": 51, "hist_freq": 0.90, "state": "Himachal Pradesh"},
]

def generate_landslide_dataset(n_samples=5000, random_state=42):
    np.random.seed(random_state)
    records = []

    samples_per_cluster = n_samples // len(NER_CLUSTERS)

    for cluster in NER_CLUSTERS:
        for _ in range(samples_per_cluster):
            # Spatial jitter around cluster center
            lat = cluster["lat"] + np.random.normal(0, 0.08)
            lng = cluster["lng"] + np.random.normal(0, 0.08)
            elevation = max(50, cluster["base_elev"] + np.random.normal(0, 150))
            slope = np.clip(cluster["base_slope"] + np.random.normal(0, 8), 5, 75)
            historical_risk = np.clip(cluster["hist_freq"] * 100 + np.random.normal(0, 8), 10, 100)

            # Weather and environmental conditions distribution (mixture of dry, moderate, heavy monsoon scenarios)
            weather_scenario = np.random.choice(["dry", "moderate", "monsoon", "extreme_cyclonic"], p=[0.3, 0.35, 0.25, 0.1])

            if weather_scenario == "dry":
                rainfall_24h = np.random.exponential(scale=10)
                rainfall_72h = rainfall_24h + np.random.exponential(scale=15)
                rainfall_intensity = rainfall_24h / np.random.uniform(12, 24)
                soil_moisture = np.clip(np.random.normal(30, 10), 10, 50)
                satellite_indicator = np.clip(np.random.normal(25, 8), 5, 45)
            elif weather_scenario == "moderate":
                rainfall_24h = np.random.normal(45, 15)
                rainfall_72h = rainfall_24h + np.random.normal(60, 20)
                rainfall_intensity = rainfall_24h / np.random.uniform(6, 16)
                soil_moisture = np.clip(np.random.normal(55, 12), 35, 75)
                satellite_indicator = np.clip(np.random.normal(50, 10), 30, 70)
            elif weather_scenario == "monsoon":
                rainfall_24h = np.random.normal(120, 30)
                rainfall_72h = rainfall_24h + np.random.normal(180, 40)
                rainfall_intensity = rainfall_24h / np.random.uniform(4, 10)
                soil_moisture = np.clip(np.random.normal(80, 8), 65, 95)
                satellite_indicator = np.clip(np.random.normal(75, 10), 55, 90)
            else:  # extreme_cyclonic / cloudburst
                rainfall_24h = np.random.normal(220, 45)
                rainfall_72h = rainfall_24h + np.random.normal(320, 60)
                rainfall_intensity = rainfall_24h / np.random.uniform(2, 6)
                soil_moisture = np.clip(np.random.normal(92, 5), 82, 99)
                satellite_indicator = np.clip(np.random.normal(88, 7), 75, 98)

            rainfall_24h = max(0.0, float(rainfall_24h))
            rainfall_72h = max(rainfall_24h, float(rainfall_72h))
            rainfall_intensity = max(0.0, float(rainfall_intensity))

            # Physical Landslide Susceptibility Index (Caine & GSI Empirical pore-pressure & slope equation)
            # Factor of safety proxy:
            # F_s decreases as slope and pore pressure (soil moisture + cumulative rainfall) increase
            slope_factor = (slope / 45.0) ** 1.8
            moisture_factor = (soil_moisture / 70.0) ** 1.5
            rain_factor = (rainfall_24h / 100.0) * 0.4 + (rainfall_72h / 200.0) * 0.4 + (rainfall_intensity / 15.0) * 0.2
            hist_factor = historical_risk / 100.0
            sat_factor = satellite_indicator / 100.0

            # Combined latent vulnerability index (0 to 100 scale)
            raw_risk = (
                0.28 * rain_factor * 100 +
                0.24 * moisture_factor * 60 +
                0.22 * slope_factor * 60 +
                0.14 * hist_factor * 80 +
                0.12 * sat_factor * 70 +
                np.random.normal(0, 3) # Natural stochastic noise
            )
            raw_risk = float(np.clip(raw_risk, 0.0, 100.0))

            # Assign risk tiers based on standard GSI Hazard Tiers:
            # Low (< 40), Moderate (40-60), High (60-80), Critical (>= 80)
            if raw_risk >= 80:
                risk_level = 3  # Critical
                risk_category = "critical"
            elif raw_risk >= 60:
                risk_level = 2  # High
                risk_category = "high"
            elif raw_risk >= 40:
                risk_level = 1  # Moderate
                risk_category = "moderate"
            else:
                risk_level = 0  # Low
                risk_category = "low"

            records.append({
                "latitude": round(lat, 5),
                "longitude": round(lng, 5),
                "elevation": round(elevation, 1),
                "slope": round(slope, 2),
                "rainfall_24h": round(rainfall_24h, 2),
                "rainfall_72h": round(rainfall_72h, 2),
                "rainfall_intensity": round(rainfall_intensity, 2),
                "soil_moisture": round(soil_moisture, 2),
                "satellite_indicator": round(satellite_indicator, 2),
                "historical_landslide_occurrence": round(historical_risk, 2),
                "latent_risk_score": round(raw_risk, 2),
                "risk_level": risk_level,
                "risk_category": risk_category,
                "region_state": cluster["state"]
            })

    df = pd.DataFrame(records)
    # Shuffle dataset
    df = df.sample(frac=1.0, random_state=random_state).reset_index(drop=True)
    return df

if __name__ == "__main__":
    out_dir = os.path.dirname(os.path.abspath(__file__))
    df = generate_landslide_dataset(n_samples=6000)
    out_path = os.path.join(out_dir, "ner_historical_landslide_dataset.csv")
    df.to_csv(out_path, index=False)
    print(f"Generated {len(df)} samples saved to {out_path}")
    print("\nClass distribution:")
    print(df['risk_category'].value_counts())
    print("\nFeature Summary:")
    print(df.describe().round(2))
