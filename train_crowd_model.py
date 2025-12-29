import pandas as pd
import numpy as np
import joblib

from sklearn.ensemble import RandomForestRegressor
from sklearn.model_selection import train_test_split
from sklearn.metrics import mean_absolute_error

# ----------------------------------------------------
# 1. LOAD DATA
# ----------------------------------------------------

crowd = pd.read_csv("crowd_data_30days_hourly.csv")
crowd["timestamp"] = pd.to_datetime(crowd["timestamp"])

# ----------------------------------------------------
# 2. FEATURE ENGINEERING
# ----------------------------------------------------

# Time-based features
crowd["hour"] = crowd["timestamp"].dt.hour
crowd["dow"] = crowd["timestamp"].dt.dayofweek
crowd["is_weekend"] = crowd["dow"].isin([5, 6]).astype(int)

# Sort for lag features
crowd = crowd.sort_values(["zone_id", "timestamp"])

# Lag features (memory of crowd)
crowd["density_lag_1h"] = crowd.groupby("zone_id")["density"].shift(1)
crowd["density_lag_24h"] = crowd.groupby("zone_id")["density"].shift(24)

# Rolling trend
crowd["density_roll_6h"] = (
    crowd.groupby("zone_id")["density"]
    .rolling(window=6)
    .mean()
    .reset_index(0, drop=True)
)

# Remove rows with missing lag values
crowd.dropna(inplace=True)

# ----------------------------------------------------
# 3. DEFINE FEATURES & TARGET
# ----------------------------------------------------

FEATURES = [
    "zone_id",
    "site_id",
    "hour",
    "dow",
    "is_weekend",
    "density_lag_1h",
    "density_lag_24h",
    "density_roll_6h"
]

TARGET = "density"

X = crowd[FEATURES]
y = crowd[TARGET]

# ----------------------------------------------------
# 4. TRAIN / TEST SPLIT (TIME-AWARE)
# ----------------------------------------------------

X_train, X_test, y_train, y_test = train_test_split(
    X,
    y,
    test_size=0.2,
    shuffle=False  # VERY IMPORTANT for time series
)

# ----------------------------------------------------
# 5. TRAIN MODEL
# ----------------------------------------------------

model = RandomForestRegressor(
    n_estimators=200,
    max_depth=15,
    min_samples_leaf=5,
    random_state=42,
    n_jobs=-1
)

model.fit(X_train, y_train)

# ----------------------------------------------------
# 6. EVALUATION
# ----------------------------------------------------

preds = model.predict(X_test)
mae = mean_absolute_error(y_test, preds)

print("=" * 50)
print("Crowd Forecasting Model Trained")
print(f"Mean Absolute Error (MAE): {mae:.6f}")
print("=" * 50)

# ----------------------------------------------------
# 7. SAVE MODEL
# ----------------------------------------------------

joblib.dump(model, "crowd_model.pkl")

print("Model saved as crowd_model.pkl")
