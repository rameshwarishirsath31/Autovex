import os
import json
import joblib
import numpy as np
import pandas as pd
import matplotlib
matplotlib.use("Agg")
import matplotlib.pyplot as plt
import seaborn as sns

from sklearn.model_selection import train_test_split
from sklearn.preprocessing import OneHotEncoder, StandardScaler
from sklearn.compose import ColumnTransformer
from sklearn.pipeline import Pipeline
from sklearn.tree import DecisionTreeClassifier
from sklearn.ensemble import RandomForestClassifier, RandomForestRegressor
from xgboost import XGBClassifier
from sklearn.metrics import (
    accuracy_score, precision_recall_fscore_support,
    confusion_matrix, mean_absolute_error, r2_score
)

def train_and_evaluate():
    base_dir = os.path.dirname(__file__)
    data_path = os.path.join(base_dir, "data", "synthetic_vehicle_maintenance_data.csv")
    models_dir = os.path.join(base_dir, "models")
    os.makedirs(models_dir, exist_ok=True)

    if not os.path.exists(data_path):
        from generate_dataset import generate_synthetic_data
        print("Data file not found. Generating dataset first...")
        df = generate_synthetic_data()
        os.makedirs(os.path.dirname(data_path), exist_ok=True)
        df.to_csv(data_path, index=False)
    else:
        df = pd.read_csv(data_path)

    numeric_features = [
        "vehicle_age_years",
        "odometer_km",
        "km_since_last_replacement",
        "days_since_last_replacement",
        "avg_coolant_temp",
        "avg_rpm",
        "hard_braking_score",
        "active_dtc_count",
        "replacement_interval_km",
        "past_replacement_count"
    ]
    categorical_features = ["component_type", "usage_pattern"]

    X = df[numeric_features + categorical_features]
    y_class = df["recommendation"]
    y_reg = df["remaining_useful_life_km"]

    # Class mappings
    class_labels = ["Monitor", "Inspect", "Service", "Replace"]
    label_to_idx = {lbl: i for i, lbl in enumerate(class_labels)}
    idx_to_label = {i: lbl for i, lbl in enumerate(class_labels)}
    y_class_num = y_class.map(label_to_idx)

    X_train, X_test, y_train_cls, y_test_cls, y_train_reg, y_test_reg = train_test_split(
        X, y_class_num, y_reg, test_size=0.20, random_state=42, stratify=y_class_num
    )

    # Preprocessing
    preprocessor = ColumnTransformer(
        transformers=[
            ("num", StandardScaler(), numeric_features),
            ("cat", OneHotEncoder(handle_unknown="ignore", sparse_output=False), categorical_features)
        ]
    )

    X_train_trans = preprocessor.fit_transform(X_train)
    X_test_trans = preprocessor.transform(X_test)

    # Feature names
    cat_encoder = preprocessor.named_transformers_["cat"]
    cat_names = cat_encoder.get_feature_names_out(categorical_features).tolist()
    all_feature_names = numeric_features + cat_names

    classifiers = {
        "Decision Tree": DecisionTreeClassifier(max_depth=9, random_state=42),
        "Random Forest": RandomForestClassifier(n_estimators=120, max_depth=14, n_jobs=-1, random_state=42),
        "XGBoost": XGBClassifier(n_estimators=120, max_depth=6, learning_rate=0.1, n_jobs=-1, random_state=42, eval_metric="mlogloss")
    }

    results = {}
    best_f1 = -1.0
    best_clf_name = None
    best_clf = None

    print("\n--- Training and Comparing Classifiers ---")
    for name, clf in classifiers.items():
        print(f"Training {name}...")
        clf.fit(X_train_trans, y_train_cls)
        y_pred = clf.predict(X_test_trans)

        acc = accuracy_score(y_test_cls, y_pred)
        prec, rec, f1, _ = precision_recall_fscore_support(y_test_cls, y_pred, average="weighted")
        cm = confusion_matrix(y_test_cls, y_pred)

        results[name] = {
            "accuracy": round(float(acc), 4),
            "precision": round(float(prec), 4),
            "recall": round(float(rec), 4),
            "f1_weighted": round(float(f1), 4),
            "confusion_matrix": cm.tolist()
        }
        print(f"[{name}] Acc: {acc:.4f} | Prec: {prec:.4f} | Rec: {rec:.4f} | F1: {f1:.4f}")

        if f1 > best_f1:
            best_f1 = f1
            best_clf_name = name
            best_clf = clf

    print(f"\n=> Best Classifier: {best_clf_name} (F1-score: {best_f1:.4f})")

    # Train RUL Regressor
    print("\n--- Training Remaining Useful Life (RUL) Regressor ---")
    regressor = RandomForestRegressor(n_estimators=100, max_depth=12, n_jobs=-1, random_state=42)
    regressor.fit(X_train_trans, y_train_reg)
    y_reg_pred = regressor.predict(X_test_trans)
    mae = mean_absolute_error(y_test_reg, y_reg_pred)
    r2 = r2_score(y_test_reg, y_reg_pred)
    print(f"RUL Regressor: MAE = {mae:.2f} km | R² = {r2:.4f}")

    # Save artifacts
    print("\n--- Saving Artifacts ---")
    joblib.dump(best_clf, os.path.join(models_dir, "best_classifier.joblib"))
    joblib.dump(regressor, os.path.join(models_dir, "rul_regressor.joblib"))
    joblib.dump(preprocessor, os.path.join(models_dir, "preprocessor.joblib"))
    
    metadata = {
        "best_classifier_name": best_clf_name,
        "class_labels": class_labels,
        "label_to_idx": label_to_idx,
        "idx_to_label": idx_to_label,
        "numeric_features": numeric_features,
        "categorical_features": categorical_features,
        "all_feature_names": all_feature_names,
        "classifier_metrics": results,
        "rul_metrics": {
            "mae_km": round(float(mae), 2),
            "r2_score": round(float(r2), 4)
        }
    }
    with open(os.path.join(models_dir, "metrics.json"), "w") as f:
        json.dump(metadata, f, indent=2)

    # Plot Confusion Matrix for best classifier
    y_best_pred = best_clf.predict(X_test_trans)
    best_cm = confusion_matrix(y_test_cls, y_best_pred)
    plt.figure(figsize=(7, 6))
    sns.heatmap(best_cm, annot=True, fmt="d", cmap="Blues",
                xticklabels=class_labels, yticklabels=class_labels)
    plt.title(f"Confusion Matrix - {best_clf_name} (Acc: {results[best_clf_name]['accuracy']:.3f})")
    plt.xlabel("Predicted Label")
    plt.ylabel("True Label")
    plt.tight_layout()
    cm_path = os.path.join(models_dir, "confusion_matrix.png")
    plt.savefig(cm_path, dpi=200)
    plt.close()
    print(f"Confusion matrix plot saved: {cm_path}")

    # Plot Feature Importance
    if hasattr(best_clf, "feature_importances_"):
        importances = best_clf.feature_importances_
    elif hasattr(best_clf, "feature_importances_"):
        importances = best_clf.feature_importances_
    else:
        importances = np.ones(len(all_feature_names))

    indices = np.argsort(importances)[::-1][:15]  # Top 15 features
    top_features = [all_feature_names[i] for i in indices]
    top_importances = [importances[i] for i in indices]

    plt.figure(figsize=(9, 6))
    sns.barplot(x=top_importances, y=top_features, palette="viridis")
    plt.title(f"Top 15 Feature Importances ({best_clf_name})")
    plt.xlabel("Relative Importance")
    plt.tight_layout()
    fi_path = os.path.join(models_dir, "feature_importance.png")
    plt.savefig(fi_path, dpi=200)
    plt.close()
    print(f"Feature importance plot saved: {fi_path}")

    print("\nTraining complete and all assets persisted!")
    return metadata

if __name__ == "__main__":
    train_and_evaluate()
