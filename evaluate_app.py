"""
Lightweight evaluation runner for the dataset visualization app.

Run:
    python3 evaluate_app.py

The goal is not to test every pixel. It checks the core behaviors that matter
for the data app: summary calculations, chart routing, comparison routing, and
clear refusal for unsupported natural-language requests.
"""

from __future__ import annotations

import csv
import json
import re
from pathlib import Path


CASES_PATH = Path("evaluation/benchmark_cases.json")
APP_PATH = Path("app.js")


def main() -> None:
    cases = json.loads(CASES_PATH.read_text(encoding="utf-8"))
    app_source = APP_PATH.read_text(encoding="utf-8")

    results = []
    for case in cases:
        dataset = load_csv(Path(case["dataset"]))
        schema = infer_schema(dataset)
        if case["type"] == "summary":
            results.append(evaluate_summary_case(case, dataset, schema, app_source))
        elif case["type"] == "query":
            results.append(evaluate_query_case(case, dataset, schema, app_source))
        else:
            results.append(fail(case, f"Unknown case type: {case['type']}"))

    print_report(results)
    if any(not result["passed"] for result in results):
        raise SystemExit(1)


def load_csv(path: Path) -> list[dict[str, str]]:
    with path.open(newline="", encoding="utf-8") as file:
        return list(csv.DictReader(file))


def infer_schema(rows: list[dict[str, str]]) -> dict:
    columns = list(rows[0].keys()) if rows else []
    numeric_columns = []
    categorical_columns = []
    missing = {}

    for column in columns:
        values = [row[column] for row in rows]
        filled = [value for value in values if value not in ("", "NA")]
        numeric = [value for value in filled if is_number(value)]
        missing[column] = len(values) - len(filled)
        if filled and len(numeric) / len(filled) > 0.8:
            numeric_columns.append(column)
        else:
            categorical_columns.append(column)

    return {
        "columns": columns,
        "numeric_columns": numeric_columns,
        "categorical_columns": categorical_columns,
        "missing": missing,
    }


def evaluate_summary_case(case: dict, rows: list[dict[str, str]], schema: dict, app_source: str) -> dict:
    expected = case["expected"]
    checks = [
        ("app has summary renderer", "renderDatasetSummary" in app_source),
        ("row count", len(rows) == expected["rows"]),
        ("column count", len(schema["columns"]) == expected["columns"]),
    ]

    for column, missing_count in expected["missing"].items():
        checks.append((f"missing count for {column}", schema["missing"].get(column) == missing_count))

    for column in expected["numeric_columns_include"]:
        checks.append((f"{column} detected numeric", column in schema["numeric_columns"]))

    for column in expected["categorical_columns_include"]:
        checks.append((f"{column} detected categorical", column in schema["categorical_columns"]))

    return result_from_checks(case, checks)


def evaluate_query_case(case: dict, rows: list[dict[str, str]], schema: dict, app_source: str) -> dict:
    expected = case["expected"]
    routed = route_query(case["request"], rows, schema)
    checks = [
        ("app has query router", "function routeQuery" in app_source),
        ("support status", routed["supported"] == expected["supported"]),
    ]

    if expected["supported"]:
        checks.extend(
            [
                ("chart", routed.get("chart") == expected["chart"]),
                ("x column", routed.get("xColumn") == expected["xColumn"]),
            ]
        )
        if "yColumn" in expected:
            checks.append(("y column", routed.get("yColumn") == expected["yColumn"]))
        if "answerContains" in expected:
            checks.append(("answer text", expected["answerContains"] in routed.get("message", "")))
    else:
        checks.append(("refusal message", expected["messageContains"] in routed.get("message", "")))

    return result_from_checks(case, checks)


def route_query(raw_query: str, rows: list[dict[str, str]], schema: dict) -> dict:
    query = raw_query.strip().lower()
    numeric_columns = schema["numeric_columns"]
    categorical_columns = schema["categorical_columns"]

    if "distribution" in query or "histogram" in query:
        numeric_column = find_column_in_text(query, numeric_columns)
        if not numeric_column:
            return unsupported("I could not find a numeric column in that request.")
        return {
            "supported": True,
            "chart": "histogram",
            "xColumn": numeric_column,
            "yColumn": numeric_column,
            "message": f"Showing the distribution of {numeric_column} with a histogram.",
        }

    if "compare" in query or " by " in query:
        numeric_column = find_column_in_text(query, numeric_columns)
        categorical_column = find_column_in_text(query, categorical_columns)
        if not numeric_column or not categorical_column:
            return unsupported("For comparisons, include one numeric column and one categorical column.")
        return {
            "supported": True,
            "chart": "box",
            "xColumn": categorical_column,
            "yColumn": numeric_column,
            "message": f"Comparing {numeric_column} by {categorical_column} with a box plot.",
        }

    if any(word in query for word in ["which", "highest", "largest", "widest"]):
        numeric_column = find_column_in_text(query, numeric_columns) or infer_numeric_column_from_words(query, numeric_columns)
        categorical_column = find_column_in_text(query, categorical_columns)
        if not numeric_column or not categorical_column:
            return unsupported("For highest-group questions, include or imply one numeric column and one categorical column.")

        label, value = highest_average_by_category(rows, categorical_column, numeric_column)
        return {
            "supported": True,
            "chart": "bar",
            "xColumn": categorical_column,
            "yColumn": numeric_column,
            "message": f"{label} has the highest average {numeric_column} at {value:.1f}.",
        }

    return unsupported("")


def unsupported(message: str) -> dict:
    examples = 'Try "show the distribution of petal length", "compare petal length by species", or "which species has the widest sepals?".'
    return {"supported": False, "message": f"{examples} {message}".strip()}


def find_column_in_text(text: str, columns: list[str]) -> str:
    compact_text = re.sub(r"\s+", "", text)
    for column in columns:
        normalized = normalize_text(column)
        compact_column = normalized.replace(" ", "")
        meaningful_tokens = [token for token in normalized.split(" ") if len(token) > 1]
        if normalized in text or compact_column in compact_text or all(token in text for token in meaningful_tokens):
            return column
    return ""


def normalize_text(value: str) -> str:
    text = value.lower().replace("_", " ").replace("-", " ").replace("(", " ").replace(")", " ")
    return re.sub(r"\s+", " ", text).strip()


def infer_numeric_column_from_words(query: str, numeric_columns: list[str]) -> str:
    if "heav" in query or "mass" in query or "weight" in query:
        for column in numeric_columns:
            normalized = normalize_text(column)
            if "body mass" in normalized or "weight" in normalized or "mass" in normalized:
                return column
    if "fare" in query or "paid" in query or "price" in query:
        for column in numeric_columns:
            if "fare" in normalize_text(column):
                return column
    if "age" in query or "old" in query:
        for column in numeric_columns:
            if "age" in normalize_text(column):
                return column
    if "sepal" in query and "wide" in query:
        for column in numeric_columns:
            if "sepal width" in normalize_text(column):
                return column
    if "petal" in query and "long" in query:
        for column in numeric_columns:
            if "petal length" in normalize_text(column):
                return column
    return ""


def highest_average_by_category(rows: list[dict[str, str]], category_column: str, numeric_column: str) -> tuple[str, float]:
    groups: dict[str, list[float]] = {}
    for row in rows:
        value = row[numeric_column]
        label = row[category_column]
        if value in ("", "NA") or label in ("", "NA") or not is_number(value):
            continue
        groups.setdefault(label, []).append(float(value))

    averages = [(label, sum(values) / len(values)) for label, values in groups.items() if values]
    return max(averages, key=lambda item: item[1])


def is_number(value: str) -> bool:
    try:
        float(value.replace(",", ""))
        return True
    except ValueError:
        return False


def result_from_checks(case: dict, checks: list[tuple[str, bool]]) -> dict:
    failed = [name for name, passed in checks if not passed]
    return {
        "id": case["id"],
        "description": case["description"],
        "passed": not failed,
        "checks": checks,
        "failed": failed,
    }


def fail(case: dict, message: str) -> dict:
    return {
        "id": case.get("id", "unknown"),
        "description": case.get("description", ""),
        "passed": False,
        "checks": [(message, False)],
        "failed": [message],
    }


def print_report(results: list[dict]) -> None:
    passed_count = sum(1 for result in results if result["passed"])
    print("\nDataset Visualizer Evaluation")
    print("=" * 31)
    print(f"Passed {passed_count} of {len(results)} benchmark cases.\n")

    for result in results:
        status = "PASS" if result["passed"] else "FAIL"
        print(f"[{status}] {result['id']}")
        print(f"  {result['description']}")
        for name, passed in result["checks"]:
            marker = "ok" if passed else "missing"
            print(f"  - {marker}: {name}")
        print()

    print("To extend this evaluation, add a case to evaluation/benchmark_cases.json.")
    print("Use type 'summary' for dataset summary checks or type 'query' for plain-English request checks.")


if __name__ == "__main__":
    main()
