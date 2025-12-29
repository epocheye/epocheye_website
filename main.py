from fastapi import FastAPI
import pandas as pd
import joblib
from math import radians, sin, cos, sqrt, atan2

# =====================================================
# APP INITIALIZATION
# =====================================================

app = FastAPI(
    title="Crowd-Aware Recommendation System",
    description="Zone & Time based crowd recommendation with confidence scoring",
    version="1.0"
)

# =====================================================
# LOAD DATA & MODEL
# =====================================================

sites = pd.read_csv("sites.csv")
zones = pd.read_csv("zones.csv")
crowd = pd.read_csv("crowd_data_30days_hourly.csv")

crowd["timestamp"] = pd.to_datetime(crowd["timestamp"])

model = joblib.load("crowd_model.pkl")

# =====================================================
# CONSTANTS
# =====================================================

SAFE_DENSITY = 0.7
MODEL_MAE = 0.00245

FEATURE_COLUMNS = [
    "zone_id",
    "site_id",
    "hour",
    "dow",
    "is_weekend",
    "density_lag_1h",
    "density_lag_24h",
    "density_roll_6h"
]

# =====================================================
# UTILITY FUNCTIONS
# =====================================================

def haversine(lat1, lon1, lat2, lon2):
    R = 6371
    dlat = radians(lat2 - lat1)
    dlon = radians(lon2 - lon1)
    a = sin(dlat / 2) ** 2 + cos(radians(lat1)) * cos(radians(lat2)) * sin(dlon / 2) ** 2
    return 2 * R * atan2(sqrt(a), sqrt(1 - a))


def density_label(d):
    if d < 0.3:
        return "Very Low"
    elif d < 0.6:
        return "Moderate"
    elif d < 0.8:
        return "High"
    else:
        return "Overcrowded"


def confidence_score(pred_density, prev_density):
    csc = max(0, 1 - pred_density / SAFE_DENSITY)
    tsc = max(0, 1 - abs(pred_density - prev_density))
    mrc = 1 - MODEL_MAE

    confidence = 0.5 * csc + 0.3 * tsc + 0.2 * mrc
    return round(confidence * 100, 2)


# =====================================================
# API ENDPOINT
# =====================================================

@app.get("/recommend")
def recommend(site_id: int):

    # -----------------------------
    # CURRENT CROWD SNAPSHOT
    # -----------------------------
    current_time = crowd["timestamp"].max()

    snapshot = crowd[
        (crowd.site_id == site_id) &
        (crowd.timestamp == current_time)
    ]

    if snapshot.empty:
        return {"error": "No crowd data available for this site"}

    total_people = int(snapshot["count"].sum())
    avg_density = float(snapshot["density"].mean())

    # -----------------------------
    # ZONE LEVEL RECOMMENDATIONS
    # -----------------------------
    zone_recommendations = []

    for _, row in snapshot.iterrows():

        zone_id = int(row.zone_id)

        feature_row = {
            "zone_id": zone_id,
            "site_id": site_id,
            "hour": current_time.hour,
            "dow": current_time.dayofweek,
            "is_weekend": int(current_time.dayofweek >= 5),
            "density_lag_1h": float(row.density),
            "density_lag_24h": float(row.density),
            "density_roll_6h": float(row.density)
        }

        X_pred = pd.DataFrame([feature_row], columns=FEATURE_COLUMNS)

        predicted_density = float(model.predict(X_pred)[0])

        if predicted_density < SAFE_DENSITY:
            zone_name = zones[zones.id == zone_id]["name"].values[0]

            zone_recommendations.append({
                "zone_id": zone_id,
                "zone_name": zone_name,
                "expected_density": density_label(predicted_density),
                "confidence": confidence_score(predicted_density, row.density)
            })

    # -----------------------------
    # DECISION LOGIC
    # -----------------------------
    if zone_recommendations:
        zone_recommendations = sorted(
            zone_recommendations,
            key=lambda x: x["confidence"],
            reverse=True
        )

        return {
            "current_status": {
                "people_present": total_people,
                "crowd_level": density_label(avg_density)
            },
            "system_advice": "You can visit now. Switching to a recommended zone will improve comfort.",
            "recommended_zones": zone_recommendations[:3]
        }

    # -----------------------------
    # NEARBY ALTERNATIVES (2 KM)
    # -----------------------------
    base_site = sites[sites.id == site_id].iloc[0]
    alternatives = []

    for _, s in sites.iterrows():
        if s.id == site_id:
            continue
        dist = haversine(base_site.lat, base_site.lon, s.lat, s.lon)
        if dist <= 2:
            alternatives.append({
                "site_name": s.name,
                "distance_km": round(dist, 2)
            })

    if alternatives:
        return {
            "current_status": {
                "people_present": total_people,
                "crowd_level": density_label(avg_density)
            },
            "system_advice": "This place is crowded. Nearby alternatives are recommended.",
            "nearby_alternatives": alternatives
        }

    # -----------------------------
    # TIME-BASED FALLBACK
    # -----------------------------
    return {
        "current_status": {
            "people_present": total_people,
            "crowd_level": density_label(avg_density)
        },
        "system_advice": "Crowd is high. Visiting early morning or late evening is recommended.",
        "suggested_times": [
            "7:00 AM – 9:00 AM",
            "6:30 PM – 8:00 PM"
        ]
    }
