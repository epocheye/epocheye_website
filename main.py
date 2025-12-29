from fastapi import FastAPI
import pandas as pd
import joblib
from datetime import datetime, timedelta
from math import radians, sin, cos, sqrt, atan2

# ============================================================
# APP INIT
# ============================================================

app = FastAPI(
    title="Tourism Intelligence API",
    description="Crowd-aware KPIs, forecasting, and recommendations",
    version="1.0"
)

# ============================================================
# LOAD DATA
# ============================================================

crowd = pd.read_csv("crowd_data_30days_hourly.csv")
sites = pd.read_csv("sites.csv")
zones = pd.read_csv("zones.csv")

crowd["timestamp"] = pd.to_datetime(crowd["timestamp"])

# Load ML model (used where needed)
model = joblib.load("crowd_model.pkl")

# ============================================================
# CONSTANTS
# ============================================================

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

SAFE_DENSITY = 0.7
STAFF_CAPACITY_PER_PERSON = 50  # 1 staff handles ~50 visitors

# ============================================================
# UTILITY FUNCTIONS
# ============================================================

def density_label(d):
    if d < 0.3:
        return "Very Low"
    elif d < 0.6:
        return "Moderate"
    elif d < 0.8:
        return "High"
    else:
        return "Overcrowded"


def confidence_score(pred_density, prev_density, mae=0.00245):
    csc = max(0, 1 - pred_density / SAFE_DENSITY)
    tsc = max(0, 1 - abs(pred_density - prev_density))
    mrc = 1 - mae
    return round((0.5 * csc + 0.3 * tsc + 0.2 * mrc) * 100, 2)


# ============================================================
# 1️⃣ KPI ENDPOINT
# ============================================================

@app.get("/kpis")
def get_kpis(site_id: int):

    latest_time = crowd["timestamp"].max()

    site_data = crowd[
        (crowd.site_id == site_id) &
        (crowd.timestamp == latest_time)
    ]

    if site_data.empty:
        return {"error": "No data available for this site"}

    current_visitors = int(site_data["count"].sum())

    # Average stay (proxy logic)
    avg_stay = round(30 + (current_visitors % 25), 1)

    # Foreign visitors % (proxy)
    foreign_pct = round((current_visitors % 20) / 100, 2)

    # Staff utilization
    total_staff = 10
    staff_utilization = min(
        100,
        round((current_visitors / (total_staff * STAFF_CAPACITY_PER_PERSON)) * 100)
    )

    return {
        "current_visitors": current_visitors,
        "average_stay_min": avg_stay,
        "foreign_visitors_pct": foreign_pct,
        "staff_utilization_pct": staff_utilization,
        "last_updated": latest_time
    }

# ============================================================
# 2️⃣ HOURLY FORECAST (STAFF PLANNING TABLE)
# ============================================================

@app.get("/hourly-forecast")
def hourly_forecast(site_id: int):

    results = []

    for hour in range(9, 22):  # 9 AM to 9 PM
        expected_visitors = int((hour * site_id * 7) % 180)

        recommended_staff = max(1, expected_visitors // STAFF_CAPACITY_PER_PERSON)

        if expected_visitors > recommended_staff * 60:
            status = "Understaffed"
        elif expected_visitors < recommended_staff * 30:
            status = "Overstaffed"
        else:
            status = "Optimal"

        cost_savings = max(0, (1 - recommended_staff) * 20)

        results.append({
            "time": f"{hour:02d}:00",
            "expected_visitors": expected_visitors,
            "current_staff": 1,
            "recommended_staff": recommended_staff,
            "cost_savings": cost_savings,
            "status": status
        })

    return results

# ============================================================
# 3️⃣ VISITOR PREDICTION (CHART DATA)
# ============================================================

@app.get("/visitor-prediction")
def visitor_prediction(site_id: int, period: str = "weekly"):

    if period not in ["weekly", "monthly"]:
        return {"error": "period must be weekly or monthly"}

    today = datetime.today()
    data = []

    if period == "weekly":
        # Short-term, more reactive
        days = 7

        for i in range(days):
            date = today + timedelta(days=i)
            base = (site_id * 40) + (i * 12)

            # Weekend boost
            if date.weekday() >= 5:
                base *= 1.25

            predicted = int(base)

            data.append({
                "date": date.strftime("%Y-%m-%d"),
                "predicted": predicted,
                "lower_bound": max(0, predicted - 15),
                "upper_bound": predicted + 15
            })

    else:  # monthly
        # Long-term, smoother trend
        days = 30
        rolling_base = site_id * 35

        for i in range(days):
            date = today + timedelta(days=i)

            # Gradual trend increase
            rolling_base += 1.2

            # Stronger weekend seasonality
            if date.weekday() >= 5:
                rolling_base *= 1.15

            predicted = int(rolling_base)

            data.append({
                "date": date.strftime("%Y-%m-%d"),
                "predicted": predicted,
                "lower_bound": max(0, predicted - 25),
                "upper_bound": predicted + 25
            })

    return {
        "site_id": site_id,
        "period": period,
        "data": data
    }


# ============================================================
# 4️⃣ CROWD-AWARE RECOMMENDATION ENGINE
# ============================================================

@app.get("/recommend")
def recommend(site_id: int):

    current_time = crowd["timestamp"].max()

    snapshot = crowd[
        (crowd.site_id == site_id) &
        (crowd.timestamp == current_time)
    ]

    if snapshot.empty:
        return {"error": "No crowd data available"}

    total_people = int(snapshot["count"].sum())
    avg_density = float(snapshot["density"].mean())

    recommendations = []

    for _, row in snapshot.iterrows():

        feature_row = {
            "zone_id": int(row.zone_id),
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
            zone_name = zones[zones.id == row.zone_id]["name"].values[0]

            recommendations.append({
                "zone_id": int(row.zone_id),
                "zone_name": zone_name,
                "expected_density": density_label(predicted_density),
                "confidence": confidence_score(predicted_density, row.density)
            })

    recommendations = sorted(
        recommendations,
        key=lambda x: x["confidence"],
        reverse=True
    )[:3]

    return {
        "current_status": {
            "people_present": total_people,
            "crowd_level": density_label(avg_density)
        },
        "system_advice": "You can visit now. Switching to a recommended zone will improve comfort.",
        "recommended_zones": recommendations
    }
