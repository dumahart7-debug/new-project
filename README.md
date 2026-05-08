# Dataset Visualizer and Prediction Lab

This project is a browser-based data app that lets you:

- upload CSV or Excel data
- inspect automatic summaries and data-quality checks
- explore the data with multiple chart types
- train a classifier directly from the uploaded dataset
- test new prediction inputs in the same web app

## What the app does

The app has two connected workflows.

1. Dataset visualization
   - reads `.csv`, `.xlsx`, and `.xls`
   - shows row and column counts
   - detects numeric and categorical columns
   - reports missing values per column
   - computes descriptive statistics for numeric fields
   - supports filtering, search, chart recommendations, and plain-English chart requests

2. Dataset-driven prediction
   - lets the user choose a target column from the uploaded dataset
   - trains one of three browser-side models:
     - Decision Tree
     - Random Forest
     - Nearest Neighbor
   - uses a held-out test split to report simple accuracy
   - generates prediction inputs from the trained feature schema
   - updates probabilities and explanations from the trained model
   - can save predictions and place them on the chart when the axes line up

## How prediction works

The app trains directly in the browser from the currently loaded dataset.

1. The user uploads a dataset.
2. The app finds target-column candidates with a manageable number of distinct labels.
3. The user picks a target column, model type, and test split.
4. The app imputes simple defaults for missing feature values.
5. The selected model is trained on the training split.
6. Accuracy is measured on the held-out test split.
7. The prediction form is generated from the trained feature schema.

The explanation changes slightly by model:

- Decision Tree: describes the tree-rule style of the prediction
- Random Forest: describes the main features that influenced the forest vote
- Nearest Neighbor: describes the vote among the closest training rows

## Current scope

The prediction workflow currently focuses on classification targets with a low-to-moderate number of distinct labels. Very high-cardinality targets and regression targets are not yet the main path.

## Lightweight evaluation

Run:

```bash
python3 evaluate_app.py
```

This checks a small benchmark set for:

- dataset summary behavior
- chart routing from plain-English requests
- comparison requests
- unsupported-request refusal behavior

## Deploy on GitHub Pages

This project is now set up for GitHub Pages with a workflow in:

- `.github/workflows/deploy-pages.yml`

To publish it:

1. Create a new GitHub repository.
2. Push this project to the `main` branch.
3. In GitHub, open `Settings` -> `Pages`.
4. Under `Source`, choose **GitHub Actions**.
5. Push again any time you want to redeploy.

Useful commands:

```bash
cd "/Users/annabelhart/Documents/New project"
git init
git add .
git commit -m "Prepare site for GitHub Pages"
git branch -M main
git remote add origin https://github.com/YOUR-USERNAME/YOUR-REPO.git
git push -u origin main
```

After the workflow finishes, your site will be available at:

```text
https://YOUR-USERNAME.github.io/YOUR-REPO/
```
