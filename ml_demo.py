"""
Prepared-model pipeline for the dataset visualizer prediction lab.

This script trains a few small classifiers for the bundled sample datasets
and exports the metadata the static frontend needs:

- model summaries for the ML panel
- schema and defaults for the prediction controls
- encoded model data for in-browser prediction
- real sample rows for nearby-point visualizations
"""

from __future__ import annotations

import json
from dataclasses import dataclass
from pathlib import Path

import pandas as pd
from sklearn.metrics import accuracy_score
from sklearn.model_selection import train_test_split
from sklearn.ensemble import RandomForestClassifier
from sklearn.neighbors import KNeighborsClassifier
from sklearn.tree import DecisionTreeClassifier


REPORT_PATH = Path("data/ml_report.json")
ARTIFACT_PATH = Path("data/ml_model_artifact.json")
IRIS_CSV_PATH = Path("data/iris_demo.csv")
PENGUINS_CSV_PATH = Path("data/penguins.csv")
TITANIC_CSV_PATH = Path("data/titanic.csv")
RANDOM_STATE = 42
MISSING_TOKEN = "__missing__"


@dataclass(frozen=True)
class PreparedDataset:
    key: str
    label: str
    sample_key: str
    source: str
    target: str
    target_label: str
    numeric_features: list[str]
    categorical_features: list[str]
    visualization_x: str
    visualization_y: str
    intro_title: str
    control_copy: str
    save_label: str
    why_chosen: str


@dataclass(frozen=True)
class ModelOption:
    key: str
    label: str
    metric_hint: str
    why_choose: str


DATASET_CONFIGS = [
    PreparedDataset(
        key="iris",
        label="Iris flowers",
        sample_key="irisDemo",
        source="sklearn_iris",
        target="species",
        target_label="species",
        numeric_features=["sepal_length", "sepal_width", "petal_length", "petal_width"],
        categorical_features=[],
        visualization_x="petal_length",
        visualization_y="petal_width",
        intro_title="You discovered a mysterious flower.",
        control_copy="Move the sliders and watch the species confidence change live.",
        save_label="Save this flower",
        why_chosen="Iris is compact, well balanced, and ideal for a clear species-classification example.",
    ),
    PreparedDataset(
        key="penguins",
        label="Penguin species",
        sample_key="penguins",
        source="data/penguins.csv",
        target="species",
        target_label="species",
        numeric_features=["bill_length_mm", "bill_depth_mm", "flipper_length_mm", "body_mass_g"],
        categorical_features=["sex", "island"],
        visualization_x="bill_length_mm",
        visualization_y="flipper_length_mm",
        intro_title="You found a penguin field record.",
        control_copy="Change the specimen details to see how the species confidence shifts.",
        save_label="Save this specimen",
        why_chosen="Penguins add a biological dataset with both body measurements and habitat clues.",
    ),
    PreparedDataset(
        key="titanic",
        label="Titanic passengers",
        sample_key="titanic",
        source="data/titanic.csv",
        target="alive",
        target_label="survival outcome",
        numeric_features=["age", "fare", "pclass", "sibsp", "parch"],
        categorical_features=["sex", "embarked", "alone"],
        visualization_x="age",
        visualization_y="fare",
        intro_title="Build a Titanic passenger profile.",
        control_copy="Update the passenger details to see how the survival confidence moves.",
        save_label="Save this passenger",
        why_chosen="Titanic adds a classic mixed-feature classification problem with a very different domain.",
    ),
]

MODEL_OPTIONS = [
    ModelOption(
        key="decision_tree",
        label="Decision tree",
        metric_hint="A simple baseline that is easy to explain.",
        why_choose="It makes step-by-step rules that are beginner-friendly to inspect.",
    ),
    ModelOption(
        key="random_forest",
        label="Random forest",
        metric_hint="Often stronger because it averages many trees.",
        why_choose="It reduces the noise of a single tree by combining many small trees.",
    ),
    ModelOption(
        key="nearest_neighbor",
        label="Nearest neighbor",
        metric_hint="Useful when similar records tend to share the same label.",
        why_choose="It predicts by looking at the most similar training examples.",
    ),
]


def main() -> None:
    report, artifact = build_prepared_outputs()
    REPORT_PATH.write_text(json.dumps(report, indent=2), encoding="utf-8")
    ARTIFACT_PATH.write_text(json.dumps(artifact, indent=2), encoding="utf-8")
    print(f"Wrote {REPORT_PATH}")
    print(f"Wrote {ARTIFACT_PATH}")
    print("Prepared datasets:", ", ".join(report["order"]))


def build_prepared_outputs() -> tuple[dict, dict]:
    iris_frame = build_iris_frame()
    iris_frame.to_csv(IRIS_CSV_PATH, index=False)

    datasets = {
        "iris": iris_frame,
        "penguins": pd.read_csv(PENGUINS_CSV_PATH),
        "titanic": pd.read_csv(TITANIC_CSV_PATH),
    }

    report = {
        "status": "ok",
        "panel_title": "Prepared prediction models",
        "order": [config.key for config in DATASET_CONFIGS],
        "datasets": {},
    }
    artifact = {
        "status": "ok",
        "default_dataset": DATASET_CONFIGS[0].key,
        "order": [config.key for config in DATASET_CONFIGS],
        "datasets": {},
    }

    for config in DATASET_CONFIGS:
        model_report, model_artifact = train_prepared_model(config, datasets[config.key].copy())
        report["datasets"][config.key] = model_report
        artifact["datasets"][config.key] = model_artifact

    return report, artifact


def build_iris_frame() -> pd.DataFrame:
    from sklearn.datasets import load_iris

    iris = load_iris(as_frame=True)
    dataframe = iris.frame.copy()
    feature_names = [clean_feature_name(name) for name in iris.feature_names]
    dataframe.columns = feature_names + ["species"]
    dataframe["species"] = dataframe["species"].map(dict(enumerate(iris.target_names)))
    return dataframe


def clean_feature_name(name: str) -> str:
    return name.lower().replace(" (cm)", "").replace(" ", "_")


def train_prepared_model(config: PreparedDataset, dataframe: pd.DataFrame) -> tuple[dict, dict]:
    feature_names = config.numeric_features + config.categorical_features
    working = dataframe[feature_names + [config.target]].copy()
    working = working.dropna(subset=[config.target])

    encoded_frame, schema = encode_dataset(working, config)
    x = encoded_frame[feature_names]
    y = encoded_frame[config.target].astype(str)

    x_train, x_test, y_train, y_test = train_test_split(
        x,
        y,
        test_size=0.25,
        random_state=RANDOM_STATE,
        stratify=y,
    )

    trained_models = train_model_options(x_train, x_test, y_train, y_test, feature_names)
    default_model_key = choose_default_model(trained_models)
    default_model = trained_models[default_model_key]

    report = {
        "label": config.label,
        "dataset_key": config.key,
        "sample_key": config.sample_key,
        "model_name": default_model["label"],
        "available_models": [option.label for option in MODEL_OPTIONS],
        "model_reports": {
            key: {
                "label": model_info["label"],
                "metric_label": "Test accuracy",
                "metric_value": round(float(model_info["accuracy"]), 3),
                "metric_display": f"{model_info['accuracy']:.1%}",
                "why_choose": model_info["why_choose"],
                "metric_hint": model_info["metric_hint"],
            }
            for key, model_info in trained_models.items()
        },
        "default_model": default_model_key,
        "target": config.target_label,
        "features": feature_names,
        "train_rows": int(len(x_train)),
        "test_rows": int(len(x_test)),
        "metric_label": "Test accuracy",
        "metric_value": round(float(default_model["accuracy"]), 3),
        "metric_display": f"{default_model['accuracy']:.1%}",
        "why_chosen": config.why_chosen,
        "result_summary": (
            f"The {config.label.lower()} {default_model['label'].lower()} predicts {config.target_label} "
            f"with {default_model['accuracy']:.1%} accuracy on held-out data."
        ),
        "limitations": [
            "These are small prepared teaching models, not production systems.",
            "Different models can disagree, especially near class boundaries.",
            "Confidence should be read as model confidence, not ground truth.",
        ],
    }
    artifact = {
        "key": config.key,
        "label": config.label,
        "sample_key": config.sample_key,
        "target": config.target,
        "target_label": config.target_label,
        "entity_label": singular_label(config.label),
        "features": feature_names,
        "classes": default_model["classes"],
        "schema": schema,
        "default_model": default_model_key,
        "models": {
            key: model_info["artifact"]
            for key, model_info in trained_models.items()
        },
        "samples": export_samples(working, config),
        "visualization": {
            "x_feature": config.visualization_x,
            "y_feature": config.visualization_y,
            "title": neighborhood_title(config),
            "subtitle": neighborhood_subtitle(config),
        },
        "intro": {
            "title": config.intro_title,
            "control_copy": config.control_copy,
            "save_label": config.save_label,
        },
        "metric_label": report["metric_label"],
        "metric_display": report["metric_display"],
        "why_chosen": report["why_chosen"],
        "result_summary": report["result_summary"],
    }
    return report, artifact


def train_model_options(
    x_train: pd.DataFrame,
    x_test: pd.DataFrame,
    y_train: pd.Series,
    y_test: pd.Series,
    feature_names: list[str],
) -> dict[str, dict]:
    trainers = {
        "decision_tree": DecisionTreeClassifier(max_depth=4, random_state=RANDOM_STATE),
        "random_forest": RandomForestClassifier(
            n_estimators=18,
            max_depth=5,
            random_state=RANDOM_STATE,
        ),
        "nearest_neighbor": KNeighborsClassifier(n_neighbors=7),
    }

    trained: dict[str, dict] = {}
    for option in MODEL_OPTIONS:
        estimator = trainers[option.key]
        estimator.fit(x_train, y_train)
        predictions = estimator.predict(x_test)
        accuracy = accuracy_score(y_test, predictions)
        trained[option.key] = {
            "label": option.label,
            "accuracy": float(accuracy),
            "classes": list(estimator.classes_),
            "metric_hint": option.metric_hint,
            "why_choose": option.why_choose,
            "artifact": export_model_artifact(option.key, estimator, feature_names, x_train, y_train),
        }
    return trained


def choose_default_model(trained_models: dict[str, dict]) -> str:
    ranked = sorted(
        trained_models.items(),
        key=lambda item: (item[1]["accuracy"], item[0] == "random_forest", item[0] == "decision_tree"),
        reverse=True,
    )
    return ranked[0][0]


def export_model_artifact(
    model_key: str,
    estimator,
    feature_names: list[str],
    x_train: pd.DataFrame,
    y_train: pd.Series,
) -> dict:
    if model_key == "decision_tree":
        return {
            "kind": model_key,
            "label": "Decision tree",
            "classes": list(estimator.classes_),
            "feature_importances": feature_importance_map(estimator.feature_importances_, feature_names),
            "tree": export_tree(estimator, feature_names),
        }

    if model_key == "random_forest":
        return {
            "kind": model_key,
            "label": "Random forest",
            "classes": list(estimator.classes_),
            "feature_importances": feature_importance_map(estimator.feature_importances_, feature_names),
            "trees": [export_tree(tree, feature_names) for tree in estimator.estimators_],
        }

    training_rows = x_train.copy()
    training_rows["target"] = y_train.astype(str).tolist()
    return {
        "kind": model_key,
        "label": "Nearest neighbor",
        "classes": list(estimator.classes_),
        "feature_importances": {},
        "k": int(estimator.n_neighbors),
        "training_rows": training_rows.to_dict(orient="records"),
    }


def feature_importance_map(values, feature_names: list[str]) -> dict[str, float]:
    return {
        feature: round(float(value), 4)
        for feature, value in zip(feature_names, values)
    }


def encode_dataset(dataframe: pd.DataFrame, config: PreparedDataset) -> tuple[pd.DataFrame, dict]:
    schema: dict[str, dict] = {}

    for feature in config.numeric_features:
        median = float(dataframe[feature].median())
        dataframe[feature] = dataframe[feature].fillna(median).astype(float)
        schema[feature] = {
            "kind": "numeric",
            "label": feature.replace("_", " "),
            "default": round(median, 2),
            "min": round(float(dataframe[feature].min()), 2),
            "max": round(float(dataframe[feature].max()), 2),
            "step": 0.1 if dataframe[feature].dtype.kind == "f" else 1,
        }

    for feature in config.categorical_features:
        cleaned = dataframe[feature].fillna(MISSING_TOKEN).map(normalize_category)
        categories = sorted(cleaned.dropna().unique().tolist())
        mapping = {value: index for index, value in enumerate(categories)}
        dataframe[feature] = cleaned.map(mapping).astype(float)
        schema[feature] = {
            "kind": "boolean" if categories == ["false", "true"] else "categorical",
            "label": feature.replace("_", " "),
            "default": categories[0],
            "options": categories,
            "mapping": mapping,
        }

    return dataframe, schema


def normalize_category(value: object) -> str:
    if pd.isna(value):
        return MISSING_TOKEN
    if isinstance(value, bool):
        return "true" if value else "false"
    text = str(value).strip()
    return text.lower() if text else MISSING_TOKEN


def export_tree(model: DecisionTreeClassifier, feature_names: list[str]) -> dict:
    tree = model.tree_
    return {
        "children_left": tree.children_left.tolist(),
        "children_right": tree.children_right.tolist(),
        "feature_name": [
            feature_names[index] if index >= 0 else "" for index in tree.feature.tolist()
        ],
        "threshold": tree.threshold.tolist(),
        "value": tree.value[:, 0, :].tolist(),
    }


def export_samples(dataframe: pd.DataFrame, config: PreparedDataset) -> list[dict]:
    columns = config.numeric_features + config.categorical_features + [config.target]
    rows = dataframe[columns].copy()

    for feature in config.categorical_features:
        rows[feature] = rows[feature].fillna(MISSING_TOKEN).map(normalize_category)

    rows[config.target] = rows[config.target].astype(str).str.lower()
    records = rows.to_dict(orient="records")
    return [
        {
            **{feature: float(record[feature]) for feature in config.numeric_features},
            **{feature: record[feature] for feature in config.categorical_features},
            config.target: record[config.target],
        }
        for record in records
    ]


def singular_label(label: str) -> str:
    return {
        "Iris flowers": "flower",
        "Penguin species": "penguin",
        "Titanic passengers": "passenger",
    }.get(label, "sample")


def neighborhood_title(config: PreparedDataset) -> str:
    return {
        "iris": "Flower neighborhood",
        "penguins": "Specimen neighborhood",
        "titanic": "Passenger neighborhood",
    }[config.key]


def neighborhood_subtitle(config: PreparedDataset) -> str:
    return {
        "iris": "Nearby real Iris flowers help show where your new flower sits.",
        "penguins": "Nearby recorded penguins help show which species your specimen resembles.",
        "titanic": "Nearby passenger records help show how your profile compares with the bundled sample data.",
    }[config.key]


if __name__ == "__main__":
    main()
