const sampleDatasets = {};

const chartTypes = [
  { key: "scatter", label: "Scatter", icon: "scatter" },
  { key: "bar", label: "Bar", icon: "bar" },
  { key: "line", label: "Line", icon: "line" },
  { key: "area", label: "Area", icon: "area" },
  { key: "pie", label: "Pie", icon: "pie" },
  { key: "histogram", label: "Histogram", icon: "histogram" },
  { key: "box", label: "Box", icon: "box" },
  { key: "clock", label: "Clock", icon: "clock" },
];

const palette = ["#2864f0", "#008982", "#c98212", "#d94c68", "#7f56d9", "#2f8f46", "#26313f"];

const state = {
  name: "",
  rows: [],
  columns: [],
  profile: [],
  numericColumns: [],
  categoricalColumns: [],
  chartType: "scatter",
  xColumn: "",
  yColumn: "",
  groupColumn: "",
  filterColumn: "",
  filterValue: "__all__",
  search: "",
  activeSample: "",
  modelArtifact: null,
  selectedPreparedDataset: "",
  selectedPreparedModel: "",
  labValues: {},
  livePrediction: null,
  predictedPoints: [],
  counters: {
    rows: 0,
    columns: 0,
    numeric: 0,
    visible: 0,
  },
};

const elements = {
  fileInput: document.querySelector("#fileInput"),
  surprisePalette: document.querySelector("#surprisePalette"),
  sampleButtons: document.querySelector("#sampleButtons"),
  chartTypeButtons: document.querySelector("#chartTypeButtons"),
  xSelect: document.querySelector("#xSelect"),
  ySelect: document.querySelector("#ySelect"),
  groupSelect: document.querySelector("#groupSelect"),
  chartRecommendation: document.querySelector("#chartRecommendation"),
  queryForm: document.querySelector("#queryForm"),
  queryInput: document.querySelector("#queryInput"),
  queryResponse: document.querySelector("#queryResponse"),
  filterColumnSelect: document.querySelector("#filterColumnSelect"),
  filterValueSelect: document.querySelector("#filterValueSelect"),
  searchInput: document.querySelector("#searchInput"),
  uploadZone: document.querySelector(".upload-zone"),
  chartFrame: document.querySelector("#chartFrame"),
  chartInsights: document.querySelector("#chartInsights"),
  chartTitle: document.querySelector("#chartTitle"),
  chartSubtitle: document.querySelector("#chartSubtitle"),
  datasetLabel: document.querySelector("#datasetLabel"),
  datasetSummary: document.querySelector("#datasetSummary"),
  summaryStatus: document.querySelector("#summaryStatus"),
  mlReport: document.querySelector("#mlReport"),
  mlStatus: document.querySelector("#mlStatus"),
  predictionForm: document.querySelector("#predictionForm"),
  predictionResult: document.querySelector("#predictionResult"),
  predictionStatus: document.querySelector("#predictionStatus"),
  predictionViz: document.querySelector("#predictionViz"),
  columnProfile: document.querySelector("#columnProfile"),
  profileTitle: document.querySelector("#profileTitle"),
  tableWrap: document.querySelector("#tableWrap"),
  tableCount: document.querySelector("#tableCount"),
  loadError: document.querySelector("#loadError"),
};

init();

function init() {
  renderSampleButtons();
  renderChartTypeButtons();
  bindEvents();
  setEmptyState();
  updateQueryExamples();
  loadMachineLearningReport();
  loadPredictionArtifact();
  loadSample("penguins");
}

function bindEvents() {
  elements.fileInput.addEventListener("change", (event) => {
    const [file] = event.target.files;
    if (file) loadFile(file);
  });

  ["dragenter", "dragover"].forEach((eventName) => {
    elements.uploadZone.addEventListener(eventName, (event) => {
      event.preventDefault();
      elements.uploadZone.classList.add("dragover");
    });
  });

  ["dragleave", "drop"].forEach((eventName) => {
    elements.uploadZone.addEventListener(eventName, () => {
      elements.uploadZone.classList.remove("dragover");
    });
  });

  elements.uploadZone.addEventListener("drop", (event) => {
    event.preventDefault();
    const [file] = event.dataTransfer.files;
    if (file) loadFile(file);
  });

  elements.xSelect.addEventListener("change", () => {
    state.xColumn = elements.xSelect.value;
    render();
  });

  elements.ySelect.addEventListener("change", () => {
    state.yColumn = elements.ySelect.value;
    render();
  });

  elements.groupSelect.addEventListener("change", () => {
    state.groupColumn = elements.groupSelect.value;
    render();
  });

  elements.filterColumnSelect.addEventListener("change", () => {
    state.filterColumn = elements.filterColumnSelect.value;
    state.filterValue = "__all__";
    renderFilterValues();
    render();
  });

  elements.filterValueSelect.addEventListener("change", () => {
    state.filterValue = elements.filterValueSelect.value;
    render();
  });

  elements.searchInput.addEventListener("input", () => {
    state.search = elements.searchInput.value.trim().toLowerCase();
    render();
  });

  elements.chartRecommendation.addEventListener("click", (event) => {
    const button = event.target.closest("button[data-recommended-chart]");
    if (!button) return;

    state.chartType = button.dataset.recommendedChart;
    syncChartTypeButtons();
    chooseDefaults(false);
    syncControls();
    render();
  });

  elements.queryForm.addEventListener("submit", (event) => {
    event.preventDefault();
    handleNaturalLanguageQuery(elements.queryInput.value);
  });

  elements.predictionForm.addEventListener("input", (event) => {
    const datasetChoice = event.target.closest("select[data-prediction-dataset]");
    if (datasetChoice) {
      state.selectedPreparedDataset = datasetChoice.value;
      state.selectedPreparedModel = "";
      initializePreparedState();
      renderPredictionWorkflow();
      return;
    }
    const modelChoice = event.target.closest("select[data-model-choice]");
    if (modelChoice) {
      state.selectedPreparedModel = modelChoice.value;
      updatePredictionLab();
      return;
    }
    const control = event.target.closest("[data-model-feature]");
    if (!control) return;
    updatePreparedFeatureValue(control);
    syncPreparedFeatureValue(control);
    updatePredictionLab();
  });

  elements.predictionForm.addEventListener("change", (event) => {
    const datasetChoice = event.target.closest("select[data-prediction-dataset]");
    if (datasetChoice) {
      state.selectedPreparedDataset = datasetChoice.value;
      state.selectedPreparedModel = "";
      initializePreparedState();
      renderPredictionWorkflow();
      return;
    }
    const modelChoice = event.target.closest("select[data-model-choice]");
    if (modelChoice) {
      state.selectedPreparedModel = modelChoice.value;
      updatePredictionLab();
      return;
    }
    const control = event.target.closest("select[data-model-feature], input[type='checkbox'][data-model-feature]");
    if (!control) return;
    updatePreparedFeatureValue(control);
    syncPreparedFeatureValue(control);
    updatePredictionLab();
  });

  elements.predictionForm.addEventListener("click", (event) => {
    const saveButton = event.target.closest("button[data-save-prediction]");
    if (saveButton) {
      event.preventDefault();
      saveCurrentPrediction();
      return;
    }

    const resetButton = event.target.closest("button[data-reset-flower]");
    if (resetButton) {
      event.preventDefault();
      resetPreparedInputs();
    }
  });

  elements.predictionResult.addEventListener("click", (event) => {
    const showButton = event.target.closest("button[data-show-prediction]");
    if (showButton) {
      showPredictionOnChart(showButton.dataset.showPrediction);
      return;
    }

    const removeButton = event.target.closest("button[data-remove-prediction]");
    if (removeButton) {
      removePrediction(removeButton.dataset.removePrediction);
      return;
    }

    const clearButton = event.target.closest("button[data-clear-predictions]");
    if (clearButton) {
      clearPredictions();
      return;
    }
  });

  elements.surprisePalette.addEventListener("click", () => {
    applyRandomPalette();
  });
}

function renderSampleButtons() {
  elements.sampleButtons.innerHTML = Object.entries(sampleDatasets)
    .map(
      ([key, dataset]) =>
        `<button class="sample-button" type="button" data-sample="${key}">${dataset.label}</button>`,
    )
    .join("");

  elements.sampleButtons.addEventListener("click", (event) => {
    const button = event.target.closest("button");
    if (button) loadSample(button.dataset.sample);
  });
}

function renderChartTypeButtons() {
  elements.chartTypeButtons.innerHTML = chartTypes
    .map(
      (chart) => `
        <button class="chart-type-button${chart.key === state.chartType ? " active" : ""}" type="button" data-chart="${chart.key}">
          ${chartIcon(chart.icon)}
          <span>${chart.label}</span>
        </button>
      `,
    )
    .join("");

  elements.chartTypeButtons.addEventListener("click", (event) => {
    const button = event.target.closest("button");
    if (!button) return;

    state.chartType = button.dataset.chart;
    syncChartTypeButtons();
    chooseDefaults(false);
    syncControls();
    render();
  });
}

function syncChartTypeButtons() {
  [...elements.chartTypeButtons.querySelectorAll("button")].forEach((item) =>
    item.classList.toggle("active", item.dataset.chart === state.chartType),
  );
}

function loadSample(key) {
  const sample = sampleDatasets[key];
  if (!sample) return Promise.resolve();

  return fetch(sample.path)
    .then((response) => {
      if (!response.ok) throw new Error(`Could not load ${sample.path}`);
      return response.text();
    })
    .then((text) => {
      loadDataset(sample.label, text, key, sample.modelKey || "");
      elements.loadError.textContent = "";
    })
    .catch((error) => {
      clearDataset();
      elements.loadError.textContent =
        `${error.message}. Run a local server such as python3 -m http.server 8000, then open http://localhost:8000.`;
    });
}

function loadFile(file) {
  const reader = new FileReader();
  const lowerName = file.name.toLowerCase();
  reader.onload = () => {
    if (lowerName.endsWith(".xlsx") || lowerName.endsWith(".xls")) {
      loadSpreadsheetFile(file.name, reader.result);
      return;
    }
    loadDataset(file.name, String(reader.result), "", "");
  };
  reader.onerror = () => {
    clearDataset();
    elements.loadError.textContent = `Could not read ${file.name}.`;
  };
  if (lowerName.endsWith(".xlsx") || lowerName.endsWith(".xls")) {
    reader.readAsArrayBuffer(file);
  } else {
    reader.readAsText(file);
  }
}

function loadSpreadsheetFile(name, buffer) {
  try {
    if (!window.XLSX) throw new Error("Excel parser is not available.");
    const workbook = window.XLSX.read(buffer, { type: "array" });
    const firstSheetName = workbook.SheetNames[0];
    if (!firstSheetName) throw new Error("The workbook does not contain any sheets.");
    const firstSheet = workbook.Sheets[firstSheetName];
    const rows = window.XLSX.utils.sheet_to_json(firstSheet, { defval: "" });
    loadRows(name, rows, "", "");
    elements.loadError.textContent = "";
  } catch (error) {
    clearDataset();
    elements.loadError.textContent = error.message || `Could not parse ${name}.`;
  }
}

function loadMachineLearningReport() {
  fetch("data/ml_report.json")
    .then((response) => {
      if (!response.ok) throw new Error("No machine learning report found.");
      return response.json();
    })
    .then((report) => renderMachineLearningReport(report))
    .catch((error) => renderMachineLearningError(error.message));
}

function loadPredictionArtifact() {
  fetch("data/ml_model_artifact.json")
    .then((response) => {
      if (!response.ok) throw new Error("No prediction artifact found.");
      return response.json();
    })
    .then((artifact) => {
      state.modelArtifact = artifact;
      const preferredDefault = sampleDatasets.penguins?.modelKey || artifact.order?.find((key) => key !== "iris") || "";
      const activeKey =
        state.selectedPreparedDataset && artifact.datasets?.[state.selectedPreparedDataset]
          ? state.selectedPreparedDataset
          : preferredDefault || artifact.default_dataset || artifact.order?.[0] || "";
      state.selectedPreparedDataset = activeKey;
      state.selectedPreparedModel = "";
      initializePreparedState();
      renderPredictionWorkflow();
    })
    .catch((error) => {
      state.modelArtifact = null;
      renderPredictionError(error.message);
    });
}

function renderMachineLearningReport(report) {
  if (report.status !== "ok") {
    renderMachineLearningError(report.result_summary || "No model was trained.");
    return;
  }

  elements.mlStatus.textContent = "Bundled prediction models for the sample datasets";
  const visibleModelKeys = report.order.filter((key) => key !== "iris");
  elements.mlReport.innerHTML = visibleModelKeys
    .map((key) => {
      const dataset = report.datasets[key];
      return `
        <article class="ml-card">
          <h3>${escapeHtml(dataset.label)}</h3>
          <span class="ml-score">${escapeHtml(dataset.metric_display)}</span>
          <p>${escapeHtml(dataset.result_summary)}</p>
          <div class="ml-meta">
            <span class="summary-tag">${formatNumber(dataset.train_rows)} training rows</span>
            <span class="summary-tag">${formatNumber(dataset.test_rows)} testing rows</span>
            <span class="summary-tag">Target: ${escapeHtml(dataset.target)}</span>
          </div>
          <p><strong>Why this one?</strong> ${escapeHtml(dataset.why_chosen)}</p>
          <p><strong>Features:</strong> ${dataset.features.map(escapeHtml).join(", ")}</p>
          <p><strong>Available models:</strong> ${dataset.available_models.map(escapeHtml).join(", ")}</p>
          <ul>${dataset.limitations.map((item) => `<li>${escapeHtml(item)}</li>`).join("")}</ul>
        </article>
      `;
    })
    .join("");
}

function renderMachineLearningError(message) {
  elements.mlStatus.textContent = "Model report unavailable";
  elements.mlReport.innerHTML = `
    <article class="ml-card">
      <h3>No model result yet</h3>
      <p>${escapeHtml(message)}</p>
      <p>Run <code>python3 ml_demo.py</code> to generate the bundled prediction model files for this web app.</p>
    </article>
  `;
}

function renderPredictionWorkflow() {
  const preparedOptions = getPreparedDatasetOptions();
  const datasetModel = getCurrentPreparedDataset();
  if (!datasetModel) {
    elements.predictionStatus.textContent = "Prediction is available after you train from a loaded dataset";
    elements.predictionForm.innerHTML = `
      <label class="prepared-select-card prepared-model-card">
        <div class="iris-slider-copy">
          <span>Prediction dataset</span>
          <strong>Choose a model dataset</strong>
        </div>
        <select data-prediction-dataset="true">
          ${preparedOptions
            .map(
              (option) =>
                `<option value="${escapeHtml(option.key)}"${option.key === state.selectedPreparedDataset ? " selected" : ""}>${escapeHtml(option.label)}</option>`,
            )
            .join("")}
        </select>
        <p class="prediction-model-note">Prediction models are prebuilt for the bundled datasets. Uploaded spreadsheets still use the full summary and chart workflow.</p>
      </label>
    `;
    elements.predictionResult.innerHTML = `
      <h3>No prepared prediction model for this dataset</h3>
      <p>You can still explore this dataset with summaries, charts, filters, and table previews.</p>
      <p>To use prediction, choose one of the available model datasets in the selector above.</p>
    `;
    elements.predictionViz.innerHTML = emptyState("Prediction inactive", "Load a dataset and train a model to see the live prediction lab.");
    return;
  }

  const modelChoice = getCurrentPreparedModel();
  if (!modelChoice) {
    elements.predictionStatus.textContent = "Prediction model unavailable for this dataset";
    elements.predictionForm.innerHTML = "";
    elements.predictionResult.innerHTML = `<p>No prepared model choice is available right now.</p>`;
    elements.predictionViz.innerHTML = "";
    return;
  }

  elements.predictionStatus.textContent = `Live what-if mode is on for ${datasetModel.label} with ${modelChoice.label}`;
  elements.predictionForm.innerHTML = `
    <div class="prediction-form-heading">
      <h3>${escapeHtml(datasetModel.intro.title)}</h3>
      <p>${escapeHtml(datasetModel.intro.control_copy)}</p>
    </div>
    <label class="prepared-select-card prepared-model-card">
      <div class="iris-slider-copy">
        <span>Prediction dataset</span>
        <strong>${escapeHtml(datasetModel.label)}</strong>
      </div>
      <select data-prediction-dataset="true">
        ${preparedOptions
          .map(
            (option) =>
              `<option value="${escapeHtml(option.key)}"${option.key === state.selectedPreparedDataset ? " selected" : ""}>${escapeHtml(option.label)}</option>`,
          )
          .join("")}
      </select>
      <p class="prediction-model-note">This selector controls the prediction lab. Your uploaded spreadsheet can stay loaded in the visualizer at the same time.</p>
    </label>
    <label class="prepared-select-card prepared-model-card">
      <div class="iris-slider-copy">
        <span>Prediction model</span>
        <strong>${escapeHtml(modelChoice.metric_display || "")}</strong>
      </div>
      <select data-model-choice="true">
        ${Object.entries(datasetModel.models)
          .map(
            ([key, option]) =>
              `<option value="${escapeHtml(key)}"${key === state.selectedPreparedModel ? " selected" : ""}>${escapeHtml(option.label)}</option>`,
          )
          .join("")}
      </select>
      <p class="prediction-model-note">${escapeHtml(modelChoice.why_choose || "")}</p>
    </label>
    ${datasetModel.features.map((feature) => renderPreparedControl(datasetModel, feature)).join("")}
    <div class="prediction-form-actions">
      <button type="button" data-save-prediction="true">${escapeHtml(datasetModel.intro.save_label)}</button>
      <button type="button" class="prediction-secondary-button" data-reset-flower="true">Reset to typical values</button>
    </div>
  `;
  updatePredictionLab();
}

function renderPredictionError(message) {
  elements.predictionStatus.textContent = "Prediction workflow unavailable";
  elements.predictionForm.innerHTML = "";
  elements.predictionResult.innerHTML = `
    <h3>No prediction artifact yet</h3>
    <p>${escapeHtml(message)}</p>
    <p>Run <code>python3 ml_demo.py</code> to generate <code>data/ml_model_artifact.json</code> for the bundled prediction lab.</p>
  `;
  elements.predictionViz.innerHTML = "";
}

function initializePreparedState() {
  const datasetModel = getCurrentPreparedDataset();
  if (!datasetModel) {
    state.labValues = {};
    state.livePrediction = null;
    state.selectedPreparedModel = "";
    return;
  }
  state.selectedPreparedModel =
    datasetModel.models?.[state.selectedPreparedModel] ? state.selectedPreparedModel : datasetModel.default_model;
  state.labValues = Object.fromEntries(
    datasetModel.features.map((feature) => [feature, datasetModel.schema[feature].default]),
  );
  state.livePrediction = null;
}

function getPreparedDatasetOptions() {
  return (state.modelArtifact?.order || [])
    .filter((key) => state.modelArtifact?.datasets?.[key])
    .map((key) => ({
      key,
      label: state.modelArtifact.datasets[key].label,
    }));
}

function getCurrentPreparedDataset() {
  const key = state.selectedPreparedDataset || state.modelArtifact?.default_dataset || state.modelArtifact?.order?.[0];
  return key ? state.modelArtifact?.datasets?.[key] || null : null;
}

function getCurrentPreparedModel() {
  const datasetModel = getCurrentPreparedDataset();
  if (!datasetModel) return null;
  const modelKey = state.selectedPreparedModel || datasetModel.default_model;
  const selectedModel = datasetModel.models?.[modelKey];
  return selectedModel ? { ...selectedModel, key: modelKey } : null;
}

function renderPreparedControl(model, feature) {
  const schema = model.schema[feature];
  const value = state.labValues[feature];
  if (schema.kind === "numeric") {
    return `
      <label class="iris-slider-card">
        <div class="iris-slider-copy">
          <span>${escapeHtml(titleCase(schema.label))}</span>
          <strong id="${escapeHtml(`${feature}Value`)}">${formatControlValue(schema.kind, value)}</strong>
        </div>
        <input
          type="range"
          min="${schema.min}"
          max="${schema.max}"
          step="${schema.step}"
          value="${value}"
          data-model-feature="${escapeHtml(feature)}"
        />
        <div class="iris-slider-range">
          <span>${formatSliderValue(schema.min)}</span>
          <span>${formatSliderValue(schema.max)}</span>
        </div>
      </label>
    `;
  }

  if (schema.kind === "boolean") {
    const checked = String(value) === "true";
    return `
      <label class="prepared-boolean-card">
        <div class="iris-slider-copy">
          <span>${escapeHtml(titleCase(schema.label))}</span>
          <strong id="${escapeHtml(`${feature}Value`)}">${checked ? "Yes" : "No"}</strong>
        </div>
        <input type="checkbox" ${checked ? "checked" : ""} data-model-feature="${escapeHtml(feature)}" />
      </label>
    `;
  }

  return `
    <label class="prepared-select-card">
      <div class="iris-slider-copy">
        <span>${escapeHtml(titleCase(schema.label))}</span>
      </div>
      <select data-model-feature="${escapeHtml(feature)}">
        ${schema.options
          .map((option) => `<option value="${escapeHtml(option)}"${option === value ? " selected" : ""}>${escapeHtml(titleCase(option.replaceAll("_", " ")))}</option>`)
          .join("")}
      </select>
    </label>
  `;
}

function updatePreparedFeatureValue(control) {
  const feature = control.dataset.modelFeature;
  if (!feature) return;
  if (control.type === "checkbox") {
    state.labValues[feature] = control.checked ? "true" : "false";
  } else if (control.type === "range") {
    state.labValues[feature] = Number(control.value);
  } else {
    state.labValues[feature] = control.value;
  }
}

function syncPreparedFeatureValue(control) {
  const feature = control.dataset.modelFeature;
  if (!feature) return;
  const datasetModel = getCurrentPreparedDataset();
  const schema = datasetModel?.schema?.[feature];
  const output = document.querySelector(`#${CSS.escape(`${feature}Value`)}`);
  if (!output || !schema) return;
  const value = state.labValues[feature];
  output.textContent = formatControlValue(schema.kind, value);
}

function resetPreparedInputs() {
  initializePreparedState();
  renderPredictionWorkflow();
}

function updatePredictionLab() {
  const datasetModel = getCurrentPreparedDataset();
  const modelChoice = getCurrentPreparedModel();
  if (!datasetModel || !modelChoice) return;
  const livePrediction = buildPreparedPrediction(state.labValues, datasetModel, modelChoice);
  state.livePrediction = livePrediction;
  elements.predictionResult.innerHTML = renderPreparedPredictionResult(livePrediction, datasetModel, modelChoice);
  elements.predictionViz.innerHTML = renderPreparedPredictionVisualization(livePrediction, datasetModel);
  render();
}

function saveCurrentPrediction() {
  const datasetModel = getCurrentPreparedDataset();
  const modelChoice = getCurrentPreparedModel();
  const livePrediction = state.livePrediction;
  if (!datasetModel || !modelChoice || !livePrediction) return;
  const predictionId = addSavedPrediction(livePrediction);
  elements.predictionResult.innerHTML = renderPreparedPredictionResult(livePrediction, datasetModel, modelChoice, predictionId);
  render();
}

function addSavedPrediction(prediction) {
  const predictionId = `prediction-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
  state.predictedPoints.unshift({
    id: predictionId,
    datasetKey: prediction.datasetKey,
    modelKey: prediction.modelKey,
    label: prediction.predictedLabel,
    features: { ...prediction.point },
    closestLabel: prediction.closestLabel,
    explanation: prediction.explanation,
  });
  return predictionId;
}

// Walk the exported decision tree in the browser so the lab can explain
// which measurements pushed the flower into its predicted class.
function analyzeDecisionTree(point, tree) {
  let node = 0;
  const path = [];

  while (tree.children_left[node] !== -1) {
    const featureName = tree.feature_name[node];
    const threshold = tree.threshold[node];
    const value = Number(point[featureName]);
    const wentLeft = value <= threshold;
    path.push({ featureName, threshold, value, wentLeft });
    if (wentLeft) {
      node = tree.children_left[node];
    } else {
      node = tree.children_right[node];
    }
  }

  return {
    node,
    path,
    scores: tree.value[node],
  };
}

function buildPreparedPrediction(point, datasetModel, modelChoice) {
  const encodedPoint = encodePreparedPoint(point, datasetModel.schema, datasetModel.features);
  const probabilities = getModelProbabilities(encodedPoint, datasetModel, modelChoice);
  const predicted = probabilities[0];
  const nearestSamples = findNearestSamples(point, datasetModel.samples || [], datasetModel.features, datasetModel.schema, 18);
  const targetField = datasetModel.target;
  const closestLabel = nearestSamples[0]?.[targetField] || predicted.label;
  return {
    datasetKey: datasetModel.key,
    modelKey: modelChoice.key,
    point: { ...point },
    predictedLabel: predicted.label,
    probabilities,
    explanation: explainPreparedPrediction(modelChoice, predicted.label, encodedPoint, datasetModel.schema),
    confidenceNote: describeConfidenceShift(probabilities, modelChoice.label),
    nearestSamples,
    closestLabel,
    nearestDistance: nearestSamples[0]?.distance ?? 0,
  };
}

function getModelProbabilities(encodedPoint, datasetModel, modelChoice) {
  if (modelChoice.kind === "decision_tree") {
    const treeResult = analyzeDecisionTree(encodedPoint, modelChoice.tree);
    return normalizeScores(treeResult.scores, datasetModel.classes);
  }

  if (modelChoice.kind === "random_forest") {
    const averagedScores = modelChoice.trees.reduce(
      (totals, tree) => {
        const treeResult = analyzeDecisionTree(encodedPoint, tree);
        const perTree = normalizeRawScores(treeResult.scores);
        return totals.map((value, index) => value + perTree[index]);
      },
      new Array(datasetModel.classes.length).fill(0),
    );
    const averaged = averagedScores.map((value) => value / Math.max(modelChoice.trees.length, 1));
    return normalizeScores(averaged, datasetModel.classes);
  }

  if (modelChoice.kind === "nearest_neighbor") {
    const nearest = [...modelChoice.training_rows]
      .map((row) => ({
        ...row,
        distance: euclideanDistance(encodedPoint, row, datasetModel.features, numericOnlySchema(datasetModel.features)),
      }))
      .sort((a, b) => a.distance - b.distance)
      .slice(0, modelChoice.k);
    const counts = datasetModel.classes.map(
      (label) => nearest.filter((row) => String(row.target) === String(label)).length,
    );
    return normalizeScores(counts, datasetModel.classes);
  }

  return normalizeScores([], datasetModel.classes);
}

function normalizeRawScores(scores) {
  const total = scores.reduce((sum, value) => sum + value, 0) || 1;
  return scores.map((value) => value / total);
}

function explainPreparedPrediction(modelChoice, predictedLabel, encodedPoint, schema) {
  if (modelChoice.kind === "decision_tree") {
    const path = analyzeDecisionTree(encodedPoint, modelChoice.tree).path;
    return explainPredictionPath(path, predictedLabel, "tree");
  }

  if (modelChoice.kind === "random_forest") {
    const topFeatures = rankedFeatureNames(modelChoice.feature_importances).slice(0, 3);
    if (!topFeatures.length) {
      return `Across many trees, the forest leaned toward ${titleCase(predictedLabel)}.`;
    }
    return `${topFeatures.map((feature) => formatFeatureLabel(feature)).join(", ")} carried the most weight across the forest, so the ensemble leaned toward ${titleCase(predictedLabel)}.`;
  }

  if (modelChoice.kind === "nearest_neighbor") {
    return `This model looks for the most similar training rows and votes across the ${modelChoice.k} nearest neighbors before choosing ${titleCase(predictedLabel)}.`;
  }

  return `The selected model leaned toward ${titleCase(predictedLabel)}.`;
}

function encodePreparedPoint(point, schema, features) {
  return Object.fromEntries(
    features.map((feature) => {
      const config = schema[feature];
      if (config.kind === "numeric") return [feature, Number(point[feature])];
      return [feature, config.mapping[normalizeCategory(point[feature])] ?? 0];
    }),
  );
}

function normalizeScores(scores, classes) {
  const total = scores.reduce((sum, value) => sum + value, 0) || 1;
  return classes
    .map((label, index) => ({
      label: titleCase(label),
      rawLabel: label,
      probability: scores[index] / total,
    }))
    .sort((a, b) => b.probability - a.probability);
}

function explainPredictionPath(path, predictedLabel, modelFamily) {
  if (!path.length) {
    return `The ${modelFamily} saw this case as a strong ${titleCase(predictedLabel)} match right away.`;
  }

  const leadingSteps = path.slice(0, 3).map((step) => {
    const direction = step.wentLeft ? "below" : "above";
    return `${formatFeatureLabel(step.featureName)} stayed ${direction} ${formatSliderValue(step.threshold)}`;
  });

  return `${leadingSteps.join(", ")}. Those splits guide the tree toward ${titleCase(predictedLabel)}.`;
}

function describeConfidenceShift(probabilities, modelLabel) {
  const [top, next] = probabilities;
  const margin = top && next ? (top.probability - next.probability) * 100 : 0;
  if (margin >= 45) return `${modelLabel} is very sure because one class stands well above the others.`;
  if (margin >= 20) return `${modelLabel} leans clearly toward ${top.label}, but another class is still in play.`;
  return `${modelLabel} sees a close call here, so small input changes can change the winner.`;
}

function findNearestSamples(point, samples, features, schema, count) {
  return samples
    .map((sample) => ({
      ...sample,
      distance: euclideanDistance(point, sample, features, schema),
    }))
    .sort((a, b) => a.distance - b.distance)
    .slice(0, count)
    .map((sample) => ({ ...sample }));
}

function euclideanDistance(a, b, features, schema) {
  return Math.sqrt(
    features.reduce((sum, feature) => {
      const config = schema[feature];
      const left = config.kind === "numeric" ? Number(a[feature]) : categoricalDistanceValue(a[feature], config);
      const right = config.kind === "numeric" ? Number(b[feature]) : categoricalDistanceValue(b[feature], config);
      const delta = left - right;
      return sum + delta * delta;
    }, 0),
  );
}

function categoricalDistanceValue(value, schema) {
  return schema.mapping[normalizeCategory(value)] ?? 0;
}

function renderPreparedPredictionResult(prediction, datasetModel, modelChoice, savedPredictionId) {
  const canShowPrediction = canPlotPredictionOnCurrentChart();
  return `
    <div class="prediction-species-card prediction-species-${prediction.predictedLabel.toLowerCase()}">
      <p class="eyebrow">Predicted ${escapeHtml(datasetModel.target_label)}</p>
      <h3>${escapeHtml(titleCase(prediction.predictedLabel.replaceAll("_", " ")))}</h3>
      <p>${escapeHtml(prediction.confidenceNote)}</p>
    </div>
    <div class="prediction-metrics">
      <article>
        <span>${Math.round(prediction.probabilities[0].probability * 100)}%</span>
        <p>top confidence</p>
      </article>
      <article>
        <span>${escapeHtml(titleCase(stringifyCell(prediction.closestLabel).replaceAll("_", " ")))}</span>
        <p>closest nearby label</p>
      </article>
      <article>
        <span>${prediction.nearestDistance.toFixed(2)}</span>
        <p>nearest sample distance</p>
      </article>
      <article>
        <span>${escapeHtml(modelChoice.label)}</span>
        <p>selected model</p>
      </article>
    </div>
    <div class="probability-list">
      ${prediction.probabilities
        .map(
          (item) => `
            <div class="probability-row">
              <div class="probability-copy">
                <strong>${escapeHtml(item.label)}</strong>
                <span>${Math.round(item.probability * 100)}%</span>
              </div>
              <div class="probability-track">
                <div class="probability-fill species-${escapeHtml(item.rawLabel)}" style="width:${Math.max(item.probability * 100, 4)}%"></div>
              </div>
            </div>
          `,
        )
        .join("")}
    </div>
    <div class="prediction-explanation">
      <h3>Why the model chose this</h3>
      <p>${escapeHtml(prediction.explanation)}</p>
      <p>${escapeHtml(describeProbabilitySource(modelChoice))}</p>
    </div>
    ${
      canShowPrediction
        ? ""
        : `<button type="button" class="prediction-link-button" data-show-prediction="${escapeHtml(savedPredictionId || "")}">Show this prediction on the chart</button>`
    }
    ${renderSavedPredictions()}
  `;
}

function renderPreparedPredictionVisualization(prediction, model) {
  const width = 1080;
  const height = 420;
  const margin = { top: 24, right: 210, bottom: 54, left: 60 };
  const neighborhood = prediction.nearestSamples;
  const xFeature = model.visualization.x_feature;
  const yFeature = model.visualization.y_feature;
  const domainX = paddedExtent(neighborhood.concat([prediction.point]).map((item) => ({ value: item[xFeature] })), "value");
  const domainY = paddedExtent(neighborhood.concat([prediction.point]).map((item) => ({ value: item[yFeature] })), "value");
  const x = (value) => scale(Number(value), domainX[0], domainX[1], margin.left, width - margin.right);
  const y = (value) => scale(Number(value), domainY[0], domainY[1], height - margin.bottom, margin.top);
  const targetField = model.target;

  return `
    <div class="prediction-viz-copy">
      <div>
        <p class="eyebrow">${escapeHtml(model.visualization.title)}</p>
        <h3>${escapeHtml(model.intro.title)}</h3>
      </div>
      <p>${escapeHtml(model.visualization.subtitle)}</p>
    </div>
    <svg viewBox="0 0 ${width} ${height}" role="img" aria-label="Nearby prepared dataset samples and predicted point">
      ${grid(width, height, margin, domainX, domainY)}
      <text class="axis-title" x="${width / 2}" y="${height - 10}" text-anchor="middle">${escapeHtml(titleCase(formatFeatureLabel(xFeature)))}</text>
      <text class="axis-title" x="18" y="${height / 2}" text-anchor="middle" transform="rotate(-90 18 ${height / 2})">${escapeHtml(titleCase(formatFeatureLabel(yFeature)))}</text>
      ${neighborhood
        .map(
          (sample) => `
            <circle class="neighbor-dot species-${escapeHtml(cssSpeciesClass(sample[targetField]))}" cx="${x(sample[xFeature])}" cy="${y(sample[yFeature])}" r="${sample.distance < 0.4 ? 7 : 5}">
              <title>${escapeHtml(titleCase(stringifyCell(sample[targetField]).replaceAll("_", " ")))} sample: ${escapeHtml(titleCase(formatFeatureLabel(xFeature)))} ${formatSliderValue(sample[xFeature])}, ${escapeHtml(titleCase(formatFeatureLabel(yFeature)))} ${formatSliderValue(sample[yFeature])}, distance ${sample.distance.toFixed(2)}</title>
            </circle>
          `,
        )
        .join("")}
      <circle class="mystery-flower-ring" cx="${x(prediction.point[xFeature])}" cy="${y(prediction.point[yFeature])}" r="18"></circle>
      <circle class="mystery-flower-dot" cx="${x(prediction.point[xFeature])}" cy="${y(prediction.point[yFeature])}" r="9"></circle>
      <text class="prediction-label" x="${Math.min(x(prediction.point[xFeature]) + 16, width - margin.right + 20)}" y="${Math.max(y(prediction.point[yFeature]) - 16, margin.top + 14)}">Your ${escapeHtml(model.entity_label)}: ${escapeHtml(titleCase(prediction.predictedLabel.replaceAll("_", " ")))}</text>
      ${renderSpeciesLegend(model.classes, width - 180, 90)}
    </svg>
  `;
}

function describeProbabilitySource(modelChoice) {
  if (modelChoice.kind === "decision_tree") {
    return "The probability bars come from the class mix inside the final decision-tree leaf.";
  }
  if (modelChoice.kind === "random_forest") {
    return "The probability bars come from averaging the class probabilities across all trees in the forest.";
  }
  if (modelChoice.kind === "nearest_neighbor") {
    return `The probability bars come from the vote split among the ${modelChoice.k} nearest training examples.`;
  }
  return "The probability bars summarize how strongly the selected model favored each class.";
}

function rankedFeatureNames(featureImportances) {
  return Object.entries(featureImportances || {})
    .sort((left, right) => right[1] - left[1])
    .map(([feature]) => feature);
}

function numericOnlySchema(features) {
  return Object.fromEntries(features.map((feature) => [feature, { kind: "numeric", mapping: {} }]));
}

function renderSpeciesLegend(classes, x, y) {
  return classes
    .map(
      (species, index) => `
        <g transform="translate(${x} ${y + index * 28})">
          <circle class="neighbor-dot species-${escapeHtml(cssSpeciesClass(species))}" cx="8" cy="8" r="7"></circle>
          <text class="tick-label" x="24" y="12">${escapeHtml(titleCase(stringifyCell(species).replaceAll("_", " ")))}</text>
        </g>
      `,
    )
    .join("");
}

function formatFeatureLabel(feature) {
  return feature.replaceAll("_", " ");
}

function formatControlValue(kind, value) {
  if (kind === "numeric") return formatSliderValue(value);
  if (kind === "boolean") return String(value) === "true" ? "Yes" : "No";
  return titleCase(stringifyCell(value).replaceAll("_", " "));
}

function formatSliderValue(value) {
  return Number(value).toFixed(1);
}

function titleCase(value) {
  return stringifyCell(value)
    .split(" ")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

function normalizeCategory(value) {
  return stringifyCell(value).trim().toLowerCase() || "__missing__";
}

function cssSpeciesClass(value) {
  return normalizeCategory(value).replace(/[^a-z0-9]+/g, "-");
}

function applyRandomPalette() {
  const root = document.documentElement;
  const palettes = [
    ["#2864f0", "#008982", "#c98212", "#d94c68", "#7f56d9"],
    ["#0f766e", "#be123c", "#7c3aed", "#2563eb", "#ca8a04"],
    ["#166534", "#1d4ed8", "#c2410c", "#b91c1c", "#6d28d9"],
  ];
  const choice = palettes[Math.floor(Math.random() * palettes.length)];
  root.style.setProperty("--blue", choice[0]);
  root.style.setProperty("--teal", choice[1]);
  root.style.setProperty("--gold", choice[2]);
  root.style.setProperty("--rose", choice[3]);
  root.style.setProperty("--violet", choice[4]);
}

function loadDataset(name, text, sampleKey, modelKey) {
  const parsed = parseCsv(text);
  loadRows(name, parsed, sampleKey, modelKey);
}

function loadRows(name, parsed, sampleKey, modelKey) {
  if (!parsed.length) {
    clearDataset();
    elements.loadError.textContent = "The selected file does not contain readable rows.";
    return;
  }

  state.name = name;
  state.rows = parsed;
  state.columns = Object.keys(parsed[0] || {});
  state.profile = profileColumns(state.rows, state.columns);
  state.numericColumns = state.profile.filter((column) => column.type === "number").map((column) => column.name);
  state.categoricalColumns = state.profile
    .filter((column) => column.type !== "number")
    .map((column) => column.name);
  state.filterColumn = "";
  state.filterValue = "__all__";
  state.search = "";
  state.activeSample = sampleKey;
  if (modelKey) {
    state.selectedPreparedDataset = modelKey;
  } else if (!state.selectedPreparedDataset) {
    state.selectedPreparedDataset = sampleDatasets.penguins?.modelKey || "";
  }
  state.selectedPreparedModel = "";
  state.predictedPoints = [];
  initializePreparedState();
  elements.searchInput.value = "";

  chooseDefaults(true);
  renderControls();
  updateQueryExamples();
  renderPredictionWorkflow();
  render();
}

function clearDataset() {
  state.name = "";
  state.rows = [];
  state.columns = [];
  state.profile = [];
  state.numericColumns = [];
  state.categoricalColumns = [];
  state.filterColumn = "";
  state.filterValue = "__all__";
  state.search = "";
  state.activeSample = "";
  if (!state.selectedPreparedDataset) {
    state.selectedPreparedDataset = sampleDatasets.penguins?.modelKey || "";
  }
  state.selectedPreparedModel = "";
  state.labValues = {};
  state.livePrediction = null;
  state.predictedPoints = [];
  elements.searchInput.value = "";
  renderControls();
  updateQueryExamples();
  renderPredictionWorkflow();
  setEmptyState();
  updateCounters(0);
}

function chooseDefaults(resetGroup) {
  const firstNumeric = state.numericColumns[0] || state.columns[0] || "";
  const secondNumeric = state.numericColumns[1] || firstNumeric;
  const firstCategory = state.categoricalColumns[0] || state.columns[0] || "";
  const penguinDemo = getPenguinDemoColumns();

  if (state.chartType === "scatter") {
    state.xColumn =
      state.numericColumns.includes(state.xColumn)
        ? state.xColumn
        : penguinDemo?.scatterX || firstNumeric;
    state.yColumn =
      state.numericColumns.includes(state.yColumn)
        ? state.yColumn
        : penguinDemo?.scatterY || secondNumeric;
  } else if (state.chartType === "histogram") {
    state.xColumn = state.numericColumns.includes(state.xColumn) ? state.xColumn : firstNumeric;
    state.yColumn = state.numericColumns.includes(state.yColumn) ? state.yColumn : firstNumeric;
  } else if (state.chartType === "box") {
    state.xColumn = state.columns.includes(state.xColumn) ? state.xColumn : firstCategory;
    state.yColumn = state.numericColumns.includes(state.yColumn) ? state.yColumn : firstNumeric;
  } else if (state.chartType === "pie" || state.chartType === "clock") {
    state.xColumn = state.columns.includes(state.xColumn) ? state.xColumn : firstCategory;
    state.yColumn = state.numericColumns.includes(state.yColumn) ? state.yColumn : firstNumeric;
  } else if (state.chartType === "bar") {
    state.xColumn = state.columns.includes(state.xColumn) ? state.xColumn : firstCategory;
    state.yColumn = state.numericColumns.includes(state.yColumn) ? state.yColumn : firstNumeric;
  } else {
    state.xColumn = state.columns.includes(state.xColumn) ? state.xColumn : firstCategory || state.columns[0] || "";
    state.yColumn = state.numericColumns.includes(state.yColumn) ? state.yColumn : firstNumeric;
  }

  if (resetGroup || !state.columns.includes(state.groupColumn)) {
    state.groupColumn = penguinDemo?.group || firstCategory;
  }
}

function renderControls() {
  syncSampleButtons();
  syncSelect(elements.xSelect, state.columns, state.xColumn);
  syncSelect(elements.ySelect, state.numericColumns.length ? state.numericColumns : state.columns, state.yColumn);
  syncSelect(elements.groupSelect, ["", ...state.columns], state.groupColumn, "None");
  syncSelect(elements.filterColumnSelect, ["", ...state.columns], state.filterColumn, "None");
  renderFilterValues();
}

function syncControls() {
  syncSelect(elements.xSelect, state.columns, state.xColumn);
  syncSelect(elements.ySelect, state.numericColumns.length ? state.numericColumns : state.columns, state.yColumn);
  syncSelect(elements.groupSelect, ["", ...state.columns], state.groupColumn, "None");
}

function syncSelect(select, values, selected, emptyLabel) {
  select.innerHTML = values
    .map((value) => {
      const label = value === "" ? emptyLabel : value;
      return `<option value="${escapeHtml(value)}"${value === selected ? " selected" : ""}>${escapeHtml(label)}</option>`;
    })
    .join("");
}

function renderFilterValues() {
  const values = state.filterColumn
    ? unique(state.rows.map((row) => stringifyCell(row[state.filterColumn]))).slice(0, 200)
    : [];

  elements.filterValueSelect.innerHTML = [
    `<option value="__all__">All values</option>`,
    ...values.map(
      (value) =>
        `<option value="${escapeHtml(value)}"${value === state.filterValue ? " selected" : ""}>${escapeHtml(value || "(blank)")}</option>`,
    ),
  ].join("");
}

function syncSampleButtons() {
  [...elements.sampleButtons.querySelectorAll("button")].forEach((button) =>
    button.classList.toggle("active", button.dataset.sample === state.activeSample),
  );
}

function updateQueryExamples() {
  const examples = {
    penguins: {
      placeholder: "compare body mass by species",
      text: 'Try: "show the distribution of body mass", "compare body mass by species", or "which species is heaviest?"',
    },
    titanic: {
      placeholder: "show the distribution of fare",
      text: 'Try: "show the distribution of fare", "compare age by class", or "which class paid the highest fare?"',
    },
    default: {
      placeholder: "show the distribution of a numeric column",
      text: 'Try asking about a numeric column from your sheet, such as "show the distribution of revenue" or "compare sales by region".',
    },
  };
  const next = examples[state.activeSample] || examples.default;
  elements.queryInput.placeholder = next.placeholder;
  if (!elements.queryResponse.textContent.trim() || elements.queryResponse.dataset.isDefault === "true") {
    elements.queryResponse.textContent = next.text;
    elements.queryResponse.dataset.isDefault = "true";
  }
}

function getQueryExampleText() {
  const examples = {
    penguins:
      '"show the distribution of body mass", "compare body mass by species", or "which species is heaviest?"',
    titanic:
      '"show the distribution of fare", "compare age by class", or "which class paid the highest fare?"',
    default:
      '"show the distribution of revenue", "compare sales by region", or "which segment has the highest average profit?"',
  };
  return examples[state.activeSample] || examples.default;
}

function handleNaturalLanguageQuery(rawQuery) {
  const query = rawQuery.trim().toLowerCase();

  if (!query) {
    showQueryResponse(`Type a request such as: ${getQueryExampleText()}`);
    return;
  }

  if (!state.rows.length) {
    showQueryResponse("Load a spreadsheet first, then ask about its columns.");
    return;
  }

  const result = routeQuery(query);
  if (!result.supported) {
    showQueryResponse(`I can support simple requests like ${getQueryExampleText()}. ${result.message}`.trim());
    return;
  }

  applyQueryResult(result);
  showQueryResponse(result.message);
}

function routeQuery(query) {
  if (query.includes("distribution") || query.includes("histogram")) {
    const numericColumn = findColumnInText(query, state.numericColumns);
    if (!numericColumn) {
      return { supported: false, message: "I could not find a numeric column in that request." };
    }
    return {
      supported: true,
      chartType: "histogram",
      xColumn: numericColumn,
      yColumn: numericColumn,
      message: `Showing the distribution of ${numericColumn} with a histogram.`,
    };
  }

  if (query.includes("compare") || query.includes(" by ")) {
    const numericColumn = findColumnInText(query, state.numericColumns);
    const categoricalColumn = findColumnInText(query, state.categoricalColumns);

    if (!numericColumn || !categoricalColumn) {
      return {
        supported: false,
        message: "For comparisons, include one numeric column and one categorical column.",
      };
    }

    return {
      supported: true,
      chartType: "box",
      xColumn: categoricalColumn,
      yColumn: numericColumn,
      message: `Comparing ${numericColumn} by ${categoricalColumn} with a box plot.`,
    };
  }

  if (query.includes("which") || query.includes("highest") || query.includes("largest") || query.includes("widest")) {
    const numericColumn = findColumnInText(query, state.numericColumns) || inferNumericColumnFromWords(query);
    const categoricalColumn = findColumnInText(query, state.categoricalColumns);

    if (!numericColumn || !categoricalColumn) {
      return {
        supported: false,
        message: "For highest-group questions, include or imply one numeric column and one categorical column.",
      };
    }

    const answer = highestAverageByCategory(categoricalColumn, numericColumn);
    if (!answer) {
      return { supported: false, message: "I could not calculate that from the currently loaded data." };
    }

    return {
      supported: true,
      chartType: "bar",
      xColumn: categoricalColumn,
      yColumn: numericColumn,
      message: `${answer.label} has the highest average ${numericColumn} at ${formatCompact(answer.value)}.`,
    };
  }

  return { supported: false, message: "" };
}

function applyQueryResult(result) {
  state.chartType = result.chartType;
  state.xColumn = result.xColumn;
  state.yColumn = result.yColumn;
  state.groupColumn = result.xColumn;
  syncChartTypeButtons();
  syncControls();
  render();
}

function showQueryResponse(message) {
  elements.queryResponse.textContent = message;
  elements.queryResponse.dataset.isDefault = "false";
}

function findColumnInText(text, columns) {
  return columns.find((column) => {
    const normalizedColumn = normalizeText(column);
    const compactColumn = normalizedColumn.replaceAll(" ", "");
    const compactText = text.replace(/\s+/g, "");
    const meaningfulTokens = normalizedColumn.split(" ").filter((token) => token.length > 1);
    return (
      text.includes(normalizedColumn) ||
      compactText.includes(compactColumn) ||
      meaningfulTokens.every((token) => text.includes(token))
    );
  });
}

function normalizeText(value) {
  return stringifyCell(value)
    .toLowerCase()
    .replaceAll("_", " ")
    .replaceAll("-", " ")
    .replaceAll("(", " ")
    .replaceAll(")", " ")
    .replace(/\s+/g, " ")
    .trim();
}

function detectDatasetTheme(name, rows) {
  const columns = Object.keys(rows[0] || {}).map(normalizeText);
  const hasSpecies = columns.some((column) => column === "species");
  const hasBodyMass = columns.some((column) => column.includes("body mass"));
  const hasCulmenOrBill =
    columns.some((column) => column.includes("culmen length")) ||
    columns.some((column) => column.includes("bill length"));
  if (hasSpecies && hasBodyMass && hasCulmenOrBill) {
    return "penguins";
  }
  if (columns.some((column) => column === "class") && columns.some((column) => column === "fare")) {
    return "titanic";
  }
  return "";
}

function getPreferredTargetColumn(candidates) {
  if (!candidates.length) return "";
  if (state.activeSample === "penguins" || looksLikePenguinDataset()) {
    const speciesColumn = candidates.find((column) => normalizeText(column) === "species");
    if (speciesColumn) return speciesColumn;
  }
  return candidates[0];
}

function looksLikePenguinDataset() {
  return state.columns.some((column) => normalizeText(column) === "species") &&
    state.columns.some((column) => normalizeText(column).includes("body mass"));
}

function getPenguinDemoColumns() {
  if (!(state.activeSample === "penguins" || looksLikePenguinDataset())) return null;

  const findMatchingColumn = (patterns) =>
    state.columns.find((column) => patterns.some((pattern) => normalizeText(column).includes(pattern)));

  return {
    scatterX: findMatchingColumn(["culmen length", "bill length"]) || state.numericColumns[0] || "",
    scatterY: findMatchingColumn(["culmen depth", "bill depth"]) || state.numericColumns[1] || state.numericColumns[0] || "",
    group: findMatchingColumn(["species"]) || state.categoricalColumns[0] || "",
  };
}

function predictionTargetLabel(columnName) {
  const normalized = normalizeText(columnName);
  if (normalized === "species") return "species";
  return humanizeColumnLabel(columnName).toLowerCase();
}

function predictionTargetHeading(columnName) {
  const normalized = normalizeText(columnName);
  if (normalized === "species") return "Predicted Species";
  return "Predicted Class";
}

function humanizeColumnLabel(columnName) {
  return titleCase(
    stringifyCell(columnName)
      .replaceAll("_", " ")
      .replace(/\s*\(mm\)\s*/gi, " (mm)")
      .replace(/\s*\(g\)\s*/gi, " (g)")
      .trim(),
  );
}

function formatMeasuredValue(value, columnName) {
  const normalized = normalizeText(columnName);
  const suffix = normalized.includes("mm") ? " mm" : normalized.includes("body mass") || normalized.endsWith(" g") ? " g" : "";
  const decimals = suffix ? 2 : Math.abs(value) >= 1000 ? 0 : 2;
  return `${new Intl.NumberFormat("en-US", { maximumFractionDigits: decimals, minimumFractionDigits: suffix ? 1 : 0 }).format(value)}${suffix}`;
}

function inferNumericColumnFromWords(query) {
  if (query.includes("heav") || query.includes("mass") || query.includes("weight")) {
    return state.numericColumns.find((column) => {
      const normalized = normalizeText(column);
      return normalized.includes("body mass") || normalized.includes("weight") || normalized.includes("mass");
    });
  }
  if (query.includes("fare") || query.includes("paid") || query.includes("price")) {
    return state.numericColumns.find((column) => normalizeText(column).includes("fare"));
  }
  if (query.includes("age") || query.includes("old")) {
    return state.numericColumns.find((column) => normalizeText(column).includes("age"));
  }
  if (query.includes("sepal") && query.includes("wide")) {
    return state.numericColumns.find((column) => {
      const normalized = normalizeText(column);
      return normalized.includes("sepal width");
    });
  }
  if (query.includes("petal") && query.includes("long")) {
    return state.numericColumns.find((column) => {
      const normalized = normalizeText(column);
      return normalized.includes("petal length");
    });
  }
  return "";
}

function highestAverageByCategory(categoryColumn, numericColumn) {
  const grouped = aggregateRows(rowsWithNumeric(state.rows, numericColumn), categoryColumn, numericColumn);
  return grouped[0] || null;
}

function render() {
  const visibleRows = getVisibleRows();
  const chartData = rowsWithNumeric(visibleRows, state.yColumn);

  updateCounters(visibleRows.length);
  renderChartRecommendation();
  renderDatasetSummary();
  renderChart(chartData, visibleRows);
  renderColumnProfile();
  renderTable(visibleRows);
}

function getVisibleRows() {
  return state.rows.filter((row) => {
    const filterMatches =
      !state.filterColumn ||
      state.filterValue === "__all__" ||
      stringifyCell(row[state.filterColumn]) === state.filterValue;
    const searchMatches =
      !state.search ||
      state.columns.some((column) => stringifyCell(row[column]).toLowerCase().includes(state.search));
    return filterMatches && searchMatches;
  });
}

function updateCounters(visible) {
  const next = {
    rows: state.rows.length,
    columns: state.columns.length,
    numeric: state.numericColumns.length,
    visible,
  };

  animateValue("#rowCount", state.counters.rows, next.rows, (value) => formatNumber(Math.round(value)));
  animateValue("#columnCount", state.counters.columns, next.columns, (value) => String(Math.round(value)));
  animateValue("#numericCount", state.counters.numeric, next.numeric, (value) => String(Math.round(value)));
  animateValue("#visibleCount", state.counters.visible, next.visible, (value) => formatNumber(Math.round(value)));
  state.counters = next;
}

function renderChartRecommendation() {
  const recommendation = getChartRecommendation();

  if (!recommendation) {
  elements.chartRecommendation.innerHTML = `
    <strong>Recommended chart</strong>
    <p>Load a spreadsheet and choose columns to see a chart suggestion.</p>
  `;
    return;
  }

  const chart = chartTypes.find((item) => item.key === recommendation.chart);
  const isActive = state.chartType === recommendation.chart;

  elements.chartRecommendation.innerHTML = `
    <strong>Recommended chart: ${escapeHtml(chart?.label || recommendation.chart)}</strong>
    <p>${escapeHtml(recommendation.reason)}</p>
    ${
      isActive
        ? ""
        : `<button type="button" data-recommended-chart="${escapeHtml(recommendation.chart)}">Use ${escapeHtml(chart?.label || recommendation.chart)}</button>`
    }
  `;
}

function getChartRecommendation() {
  if (!state.columns.length) return null;

  const selectedColumns = unique([state.xColumn, state.yColumn].filter(Boolean));
  if (!selectedColumns.length) return null;

  const numericCount = selectedColumns.filter(isNumericColumn).length;
  const categoricalCount = selectedColumns.filter(isCategoricalColumn).length;

  if (selectedColumns.length === 1 && numericCount === 1) {
    return {
      chart: "histogram",
      reason: `${selectedColumns[0]} is numeric, so a histogram is a good first look at its distribution, center, spread, and skew.`,
    };
  }

  if (selectedColumns.length === 1 && categoricalCount === 1) {
    return {
      chart: "bar",
      reason: `${selectedColumns[0]} is categorical, so a bar chart makes it easy to compare category counts or grouped values.`,
    };
  }

  if (selectedColumns.length >= 2 && numericCount >= 2) {
    return {
      chart: "scatter",
      reason: `${state.xColumn} and ${state.yColumn} are numeric, so a scatter plot is best for checking relationships, clusters, and outliers.`,
    };
  }

  if (selectedColumns.length >= 2 && numericCount === 1 && categoricalCount >= 1) {
    const numericColumn = selectedColumns.find(isNumericColumn);
    const categoricalColumn = selectedColumns.find(isCategoricalColumn);
    return {
      chart: "box",
      reason: `${categoricalColumn} is categorical and ${numericColumn} is numeric, so a box plot compares the numeric distribution across groups. A grouped bar chart can also summarize group averages.`,
    };
  }

  return {
    chart: "bar",
    reason: "These selections are mostly categorical, so a bar chart is the clearest way to compare groups.",
  };
}

function isNumericColumn(column) {
  return state.numericColumns.includes(column);
}

function isCategoricalColumn(column) {
  return state.categoricalColumns.includes(column);
}

function renderChartInsights(numericRows, visibleRows) {
  const insights = getChartInsights(numericRows, visibleRows).slice(0, 4);

  if (!insights.length) {
    elements.chartInsights.innerHTML = `
      <h3>Chart insights</h3>
      <ul><li>Load data and choose chart fields to see calculated insights.</li></ul>
    `;
    return;
  }

  elements.chartInsights.innerHTML = `
    <h3>Chart insights</h3>
    <ul>${insights.map((insight) => `<li>${escapeHtml(insight)}</li>`).join("")}</ul>
  `;
}

function getChartInsights(numericRows, visibleRows) {
  if (!visibleRows.length) return [];

  const insights = [];
  const yValues = numericRows.map((row) => row[state.yColumn]).filter(Number.isFinite);
  const xValues = rowsWithNumeric(visibleRows, state.xColumn).map((row) => row[state.xColumn]).filter(Number.isFinite);
  const groupedSummary =
    state.groupColumn && isCategoricalColumn(state.groupColumn) && isNumericColumn(state.yColumn)
      ? aggregateRows(rowsWithNumeric(visibleRows, state.yColumn), state.groupColumn, state.yColumn)
      : [];

  if (groupedSummary.length) {
    const top = groupedSummary[0];
    insights.push(
      `Among ${humanizeColumnLabel(state.groupColumn).toLowerCase()} groups, ${titleCase(stringifyCell(top.label).replaceAll("_", " "))} has the highest average ${humanizeColumnLabel(state.yColumn).toLowerCase()} at ${formatMeasuredValue(top.value, state.yColumn)}.`,
    );
  }

  if (yValues.length) {
    const stats = numericSummary(yValues);
    insights.push(`${humanizeColumnLabel(state.yColumn)} averages ${formatMeasuredValue(stats.mean, state.yColumn)} across ${formatNumber(yValues.length)} rows.`);
    insights.push(`${humanizeColumnLabel(state.yColumn)} ranges from ${formatMeasuredValue(stats.min, state.yColumn)} to ${formatMeasuredValue(stats.max, state.yColumn)}.`);

    const outlierCount = countIqrOutliers(yValues);
    if (outlierCount > 0) {
      insights.push(`${formatNumber(outlierCount)} ${humanizeColumnLabel(state.yColumn).toLowerCase()} value${outlierCount === 1 ? "" : "s"} sit outside the 1.5x IQR outlier rule.`);
    }
  } else if (xValues.length) {
    const stats = numericSummary(xValues);
    insights.push(`${humanizeColumnLabel(state.xColumn)} averages ${formatMeasuredValue(stats.mean, state.xColumn)} across ${formatNumber(xValues.length)} rows.`);
    insights.push(`${humanizeColumnLabel(state.xColumn)} ranges from ${formatMeasuredValue(stats.min, state.xColumn)} to ${formatMeasuredValue(stats.max, state.xColumn)}.`);
  }

  if (isNumericColumn(state.xColumn) && isNumericColumn(state.yColumn)) {
    const pairedRows = visibleRows.filter(
      (row) => Number.isFinite(row[state.xColumn]) && Number.isFinite(row[state.yColumn]),
    );
    const relationship = describeCorrelation(pairedRows);
    if (relationship) insights.push(relationship);
  }

  return unique(insights).slice(0, 4);
}

function numericSummary(values) {
  const sorted = [...values].sort((a, b) => a - b);
  const sum = sorted.reduce((total, value) => total + value, 0);
  return {
    min: sorted[0],
    max: sorted[sorted.length - 1],
    mean: sum / sorted.length,
  };
}

function countIqrOutliers(values) {
  if (values.length < 4) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  const q1 = quantile(sorted, 0.25);
  const q3 = quantile(sorted, 0.75);
  const iqr = q3 - q1;
  const lower = q1 - 1.5 * iqr;
  const upper = q3 + 1.5 * iqr;
  return sorted.filter((value) => value < lower || value > upper).length;
}

function describeCorrelation(rows) {
  if (rows.length < 3) return "";

  const xValues = rows.map((row) => row[state.xColumn]);
  const yValues = rows.map((row) => row[state.yColumn]);
  const xMean = numericSummary(xValues).mean;
  const yMean = numericSummary(yValues).mean;
  const numerator = rows.reduce(
    (sum, row) => sum + (row[state.xColumn] - xMean) * (row[state.yColumn] - yMean),
    0,
  );
  const xVariance = xValues.reduce((sum, value) => sum + (value - xMean) ** 2, 0);
  const yVariance = yValues.reduce((sum, value) => sum + (value - yMean) ** 2, 0);
  const denominator = Math.sqrt(xVariance * yVariance);
  if (!denominator) return "";

  const correlation = numerator / denominator;
  const strength = Math.abs(correlation) >= 0.7 ? "strong" : Math.abs(correlation) >= 0.35 ? "moderate" : "weak";
  const direction = correlation >= 0 ? "positive" : "negative";
  return `${humanizeColumnLabel(state.xColumn)} and ${humanizeColumnLabel(state.yColumn)} show a ${strength} ${direction} relationship (correlation ${correlation.toFixed(2)}).`;
}

function renderChart(numericRows, visibleRows) {
  elements.datasetLabel.textContent = state.name || "No dataset loaded";

  if (!state.rows.length) {
    setEmptyState();
    return;
  }

  const needsNumeric = !["pie", "clock"].includes(state.chartType);
  if (needsNumeric && !numericRows.length) {
    elements.chartTitle.textContent = "No rows match this view";
    elements.chartSubtitle.textContent = "Adjust the filter or select a numeric Y axis.";
    elements.chartFrame.innerHTML = emptyState("No chartable rows", "Choose a numeric field or widen the filter.");
    renderChartInsights([], []);
    return;
  }

  if (!visibleRows.length) {
    elements.chartTitle.textContent = "No rows match this view";
    elements.chartSubtitle.textContent = "Adjust the filter or search query.";
    elements.chartFrame.innerHTML = emptyState("No rows", "Clear the current filter or search query.");
    renderChartInsights([], []);
    return;
  }

  elements.chartTitle.textContent = chartTitle();
  elements.chartSubtitle.textContent = `${formatNumber(visibleRows.length)} visible rows`;

  if (state.chartType === "scatter") {
    renderScatter(numericRows);
  } else if (state.chartType === "bar") {
    renderBar(numericRows);
  } else if (state.chartType === "line") {
    renderLineOrArea(numericRows, false);
  } else if (state.chartType === "area") {
    renderLineOrArea(numericRows, true);
  } else if (state.chartType === "pie") {
    renderPie(visibleRows);
  } else if (state.chartType === "histogram") {
    renderHistogram(rowsWithNumeric(visibleRows, state.xColumn));
  } else if (state.chartType === "box") {
    renderBoxPlot(numericRows);
  } else if (state.chartType === "clock") {
    renderClock(visibleRows);
  }

  renderChartInsights(numericRows, visibleRows);
}

function renderScatter(rows) {
  if (shouldRenderPenguinsStory(rows)) {
    renderPenguinsStoryScatter(rows);
    return;
  }

  if (shouldRenderEditorialGroupedScatter(rows)) {
    renderEditorialGroupedScatter(rows);
    return;
  }

  const points = rowsWithNumeric(rows, state.xColumn).slice(0, 800);
  const width = 900;
  const height = 460;
  const margin = { top: 26, right: 24, bottom: 58, left: 72 };
  const predictions = getPredictionOverlayForAxes();
  const domainRows = points.concat(
    predictions.map((prediction) => ({
      [state.xColumn]: prediction.xValue,
      [state.yColumn]: prediction.yValue,
    })),
  );
  const xDomain = paddedExtent(domainRows, state.xColumn);
  const yDomain = paddedExtent(domainRows, state.yColumn);
  const color = colorForGroups(points);
  const x = (value) => scale(Number(value), xDomain[0], xDomain[1], margin.left, width - margin.right);
  const y = (value) => scale(Number(value), yDomain[0], yDomain[1], height - margin.bottom, margin.top);

  elements.chartFrame.innerHTML = `
    <svg viewBox="0 0 ${width} ${height}" role="img" aria-label="${escapeHtml(chartTitle())}">
      ${grid(width, height, margin, xDomain, yDomain)}
      <text class="axis-title" x="${width / 2}" y="${height - 12}" text-anchor="middle">${escapeHtml(state.xColumn)}</text>
      <text class="axis-title" x="18" y="${height / 2}" text-anchor="middle" transform="rotate(-90 18 ${height / 2})">${escapeHtml(state.yColumn)}</text>
      ${points
        .map((row, index) => {
          const group = state.groupColumn ? stringifyCell(row[state.groupColumn]) : "Dataset";
          return `
            <circle class="dot" style="animation-delay:${Math.min(index * 3, 360)}ms" cx="${x(row[state.xColumn])}" cy="${y(row[state.yColumn])}" r="6" fill="${color(group)}">
              <title>${escapeHtml(group)}: ${escapeHtml(state.xColumn)} ${stringifyCell(row[state.xColumn])}, ${escapeHtml(state.yColumn)} ${stringifyCell(row[state.yColumn])}</title>
            </circle>
          `;
        })
        .join("")}
      ${predictions
        .map(
          (prediction, index) => `
            <circle class="prediction-ring" cx="${x(prediction.xValue)}" cy="${y(prediction.yValue)}" r="${11 + (index % 2) * 2}"></circle>
            <circle class="prediction-dot" cx="${x(prediction.xValue)}" cy="${y(prediction.yValue)}" r="6.5">
              <title>${escapeHtml(prediction.live ? "Current prediction" : "Saved prediction")} ${escapeHtml(prediction.label)}: ${escapeHtml(state.xColumn)} ${formatCompact(prediction.xValue)}, ${escapeHtml(state.yColumn)} ${formatCompact(prediction.yValue)}</title>
            </circle>
            <text class="prediction-label" x="${Math.min(x(prediction.xValue) + 12, width - margin.right + 4)}" y="${Math.max(y(prediction.yValue) - 12 - index * 14, margin.top + 12)}">${escapeHtml(`${prediction.live ? "Current" : "Predicted"}: ${prediction.label}`)}</text>
          `,
        )
        .join("")}
    </svg>
  `;
}

function shouldRenderPenguinsStory(rows) {
  if (!rows.length) return false;
  const hasColumns = ["species", "flipper_length_mm", "bill_length_mm"].every((column) => state.columns.includes(column));
  if (!hasColumns) return false;
  if (state.chartType !== "scatter") return false;
  if (state.xColumn !== "flipper_length_mm" || state.yColumn !== "bill_length_mm") return false;
  const speciesValues = unique(rows.map((row) => normalizeCategory(row.species)));
  return ["adelie", "chinstrap", "gentoo"].every((species) => speciesValues.includes(species));
}

function shouldRenderEditorialGroupedScatter(rows) {
  if (!rows.length) return false;
  if (state.chartType !== "scatter") return false;
  if (!state.groupColumn || !isCategoricalColumn(state.groupColumn)) return false;
  if (!isNumericColumn(state.xColumn) || !isNumericColumn(state.yColumn)) return false;

  const groups = unique(rows.map((row) => normalizeCategory(row[state.groupColumn])));
  return groups.length >= 2 && groups.length <= 6;
}

function renderPenguinsStoryScatter(rows) {
  const points = rowsWithNumeric(rowsWithNumeric(rows, "flipper_length_mm"), "bill_length_mm").slice(0, 800);
  const predictions = getPredictionOverlayForAxes();
  const width = 1100;
  const height = 720;
  const margin = { top: 96, right: 62, bottom: 84, left: 92 };
  const domainRows = points.concat(
    predictions.map((prediction) => ({
      flipper_length_mm: prediction.xValue,
      bill_length_mm: prediction.yValue,
      species: prediction.label,
    })),
  );
  const xDomain = paddedExtent(domainRows, "flipper_length_mm");
  const yDomain = paddedExtent(domainRows, "bill_length_mm");
  const x = (value) => scale(Number(value), xDomain[0], xDomain[1], margin.left, width - margin.right);
  const y = (value) => scale(Number(value), yDomain[0], yDomain[1], height - margin.bottom, margin.top);
  const speciesColors = {
    adelie: "#e89a4c",
    chinstrap: "#9a68ca",
    gentoo: "#708760",
  };
  const grouped = groupPenguinPoints(points);
  const callouts = [
    { label: "Chinstrap", key: "chinstrap", x: 296, y: 220 },
    { label: "Gentoo", key: "gentoo", x: 818, y: 414 },
    { label: "Adelie", key: "adelie", x: 505, y: 556 },
  ];

  elements.chartTitle.textContent = "Palmer Penguins";
  elements.chartSubtitle.textContent = "Species clusters by flipper length and bill length";
  elements.chartFrame.innerHTML = `
    <svg viewBox="0 0 ${width} ${height}" role="img" aria-label="Palmer Penguins scatter plot">
      <rect class="penguin-story-bg" x="0" y="0" width="${width}" height="${height}" rx="10"></rect>
      <text class="penguin-story-title" x="${margin.left + 8}" y="54">Palmer Penguins</text>
      ${renderPenguinStoryBillCallout(width, 18)}
      ${renderPenguinStorySpeciesBadges(width)}
      ${renderPenguinStoryGrid(width, height, margin, xDomain, yDomain)}
      <text class="penguin-story-axis-title" x="${(margin.left + width - margin.right) / 2}" y="${height - 18}" text-anchor="middle">flipper_length_mm</text>
      <text class="penguin-story-axis-title" x="28" y="${(margin.top + height - margin.bottom) / 2}" text-anchor="middle" transform="rotate(-90 28 ${(margin.top + height - margin.bottom) / 2})">bill_length_mm</text>
      ${points
        .map((row, index) => {
          const group = normalizeCategory(row.species);
          const fill = speciesColors[group] || palette[index % palette.length];
          return `
            <circle class="penguin-story-dot species-${escapeHtml(group)}" cx="${x(row.flipper_length_mm)}" cy="${y(row.bill_length_mm)}" r="7.2" fill="${fill}">
              <title>${escapeHtml(titleCase(group))}: flipper_length_mm ${stringifyCell(row.flipper_length_mm)}, bill_length_mm ${stringifyCell(row.bill_length_mm)}</title>
            </circle>
          `;
        })
        .join("")}
      ${predictions
        .map(
          (prediction, index) => `
            <circle class="prediction-ring" cx="${x(prediction.xValue)}" cy="${y(prediction.yValue)}" r="${12 + (index % 2) * 2}"></circle>
            <circle class="prediction-dot" cx="${x(prediction.xValue)}" cy="${y(prediction.yValue)}" r="7.2">
              <title>${escapeHtml(prediction.live ? "Current prediction" : "Saved prediction")} ${escapeHtml(prediction.label)}: flipper_length_mm ${formatCompact(prediction.xValue)}, bill_length_mm ${formatCompact(prediction.yValue)}</title>
            </circle>
            <text class="prediction-label" x="${Math.min(x(prediction.xValue) + 14, width - margin.right + 12)}" y="${Math.max(y(prediction.yValue) - 14 - index * 14, margin.top + 14)}">${escapeHtml(`${prediction.live ? "Current" : "Predicted"}: ${titleCase(prediction.label)}`)}</text>
          `,
        )
        .join("")}
      ${callouts
        .map(
          (callout) => `
            <text class="penguin-story-species-label species-${escapeHtml(callout.key)}" x="${callout.x}" y="${callout.y}">${escapeHtml(callout.label)}</text>
          `,
        )
        .join("")}
      ${renderPenguinStoryClusterHints(grouped, x, y)}
    </svg>
  `;
}

function renderEditorialGroupedScatter(rows) {
  const points = rowsWithNumeric(rowsWithNumeric(rows, state.xColumn), state.yColumn).slice(0, 800);
  const predictions = getPredictionOverlayForAxes();
  const width = 1080;
  const height = 650;
  const margin = { top: 104, right: 54, bottom: 82, left: 90 };
  const domainRows = points.concat(
    predictions.map((prediction) => ({
      [state.xColumn]: prediction.xValue,
      [state.yColumn]: prediction.yValue,
      [state.groupColumn]: prediction.label,
    })),
  );
  const xDomain = paddedExtent(domainRows, state.xColumn);
  const yDomain = paddedExtent(domainRows, state.yColumn);
  const x = (value) => scale(Number(value), xDomain[0], xDomain[1], margin.left, width - margin.right);
  const y = (value) => scale(Number(value), yDomain[0], yDomain[1], height - margin.bottom, margin.top);
  const grouped = points.reduce((groups, row) => {
    const label = stringifyCell(row[state.groupColumn]) || "Group";
    groups[label] ||= [];
    groups[label].push(row);
    return groups;
  }, {});
  const groupItems = Object.entries(grouped).map(([label, values], index) => {
    const meanX = values.reduce((sum, row) => sum + Number(row[state.xColumn]), 0) / values.length;
    const meanY = values.reduce((sum, row) => sum + Number(row[state.yColumn]), 0) / values.length;
    return {
      label,
      values,
      meanX,
      meanY,
      color: palette[index % palette.length],
    };
  });
  const colorMap = Object.fromEntries(groupItems.map((item) => [item.label, item.color]));
  const storyTitle = deriveEditorialChartTitle();
  const storySubtitle = `${titleCase(formatFeatureLabel(state.yColumn))} vs ${titleCase(formatFeatureLabel(state.xColumn))}`;

  elements.chartTitle.textContent = storyTitle;
  elements.chartSubtitle.textContent = `${formatNumber(points.length)} rows across ${groupItems.length} groups`;
  elements.chartFrame.innerHTML = `
    <svg viewBox="0 0 ${width} ${height}" role="img" aria-label="${escapeHtml(storyTitle)} grouped scatter plot">
      <rect class="editorial-story-bg" x="0" y="0" width="${width}" height="${height}" rx="10"></rect>
      <text class="editorial-story-title" x="${margin.left}" y="58">${escapeHtml(storyTitle)}</text>
      <text class="editorial-story-subtitle" x="${margin.left}" y="90">${escapeHtml(storySubtitle)}</text>
      ${renderEditorialStoryBadges(groupItems, width)}
      ${renderEditorialStoryGrid(width, height, margin, xDomain, yDomain)}
      <text class="editorial-story-axis-title" x="${(margin.left + width - margin.right) / 2}" y="${height - 20}" text-anchor="middle">${escapeHtml(state.xColumn)}</text>
      <text class="editorial-story-axis-title" x="28" y="${(margin.top + height - margin.bottom) / 2}" text-anchor="middle" transform="rotate(-90 28 ${(margin.top + height - margin.bottom) / 2})">${escapeHtml(state.yColumn)}</text>
      ${points
        .map((row) => {
          const label = stringifyCell(row[state.groupColumn]) || "Group";
          return `
            <circle class="editorial-story-dot" cx="${x(row[state.xColumn])}" cy="${y(row[state.yColumn])}" r="7" fill="${colorMap[label] || palette[0]}">
              <title>${escapeHtml(label)}: ${escapeHtml(state.xColumn)} ${stringifyCell(row[state.xColumn])}, ${escapeHtml(state.yColumn)} ${stringifyCell(row[state.yColumn])}</title>
            </circle>
          `;
        })
        .join("")}
      ${groupItems
        .map(
          (item) => `
            <circle class="editorial-story-halo" cx="${x(item.meanX)}" cy="${y(item.meanY)}" r="24" stroke="${item.color}"></circle>
            <text class="editorial-story-group-label" x="${Math.min(x(item.meanX) + 12, width - margin.right - 24)}" y="${Math.max(y(item.meanY) - 16, margin.top + 18)}" fill="${item.color}">${escapeHtml(titleCase(item.label))}</text>
          `,
        )
        .join("")}
      ${predictions
        .map(
          (prediction, index) => `
            <circle class="prediction-ring" cx="${x(prediction.xValue)}" cy="${y(prediction.yValue)}" r="${12 + (index % 2) * 2}"></circle>
            <circle class="prediction-dot" cx="${x(prediction.xValue)}" cy="${y(prediction.yValue)}" r="7">
              <title>${escapeHtml(prediction.live ? "Current prediction" : "Saved prediction")} ${escapeHtml(prediction.label)}: ${escapeHtml(state.xColumn)} ${formatCompact(prediction.xValue)}, ${escapeHtml(state.yColumn)} ${formatCompact(prediction.yValue)}</title>
            </circle>
            <text class="prediction-label" x="${Math.min(x(prediction.xValue) + 12, width - margin.right + 6)}" y="${Math.max(y(prediction.yValue) - 12 - index * 14, margin.top + 14)}">${escapeHtml(`${prediction.live ? "Current" : "Predicted"}: ${titleCase(prediction.label)}`)}</text>
          `,
        )
        .join("")}
      ${renderEditorialStorySummary(groupItems, width, margin)}
    </svg>
  `;
}

function deriveEditorialChartTitle() {
  const cleanName = stringifyCell(state.name).replace(/\.[^.]+$/, "").trim();
  if (cleanName) return titleCase(cleanName.replaceAll("_", " "));
  if (state.groupColumn) return `${titleCase(formatFeatureLabel(state.groupColumn))} clusters`;
  return "Dataset clusters";
}

function renderEditorialStoryBadges(groupItems, width) {
  return groupItems
    .slice(0, 4)
    .map(
      (item, index) => `
        <g transform="translate(${width - 140 - index * 118} 28)">
          <rect class="editorial-story-badge" width="104" height="34" rx="17" fill="${item.color}"></rect>
          <text class="editorial-story-badge-label" x="52" y="22" text-anchor="middle">${escapeHtml(titleCase(item.label))}</text>
        </g>
      `,
    )
    .join("");
}

function renderEditorialStoryGrid(width, height, margin, xDomain, yDomain) {
  const x = (value) => scale(value, xDomain[0], xDomain[1], margin.left, width - margin.right);
  const y = (value) => scale(value, yDomain[0], yDomain[1], height - margin.bottom, margin.top);
  return `
    ${ticks(yDomain[0], yDomain[1], 6)
      .map(
        (tick) => `
          <line class="editorial-story-grid" x1="${margin.left}" x2="${width - margin.right}" y1="${y(tick)}" y2="${y(tick)}"></line>
          <text class="editorial-story-tick" x="${margin.left - 16}" y="${y(tick) + 6}" text-anchor="end">${formatCompact(tick)}</text>
        `,
      )
      .join("")}
    ${ticks(xDomain[0], xDomain[1], 6)
      .map(
        (tick) => `
          <line class="editorial-story-grid" y1="${margin.top}" y2="${height - margin.bottom}" x1="${x(tick)}" x2="${x(tick)}"></line>
          <text class="editorial-story-tick" x="${x(tick)}" y="${height - 40}" text-anchor="middle">${formatCompact(tick)}</text>
        `,
      )
      .join("")}
    <line class="editorial-story-axis" x1="${margin.left}" x2="${width - margin.right}" y1="${height - margin.bottom}" y2="${height - margin.bottom}"></line>
    <line class="editorial-story-axis" x1="${margin.left}" x2="${margin.left}" y1="${margin.top}" y2="${height - margin.bottom}"></line>
  `;
}

function renderEditorialStorySummary(groupItems, width, margin) {
  const sorted = [...groupItems].sort((left, right) => right.values.length - left.values.length);
  const lead = sorted[0];
  const next = sorted[1];
  const summaryLines = [
    `${lead ? titleCase(lead.label) : "Top group"} has the largest visible cluster.`,
    next ? `${titleCase(next.label)} forms the next biggest cluster by row count.` : "Use the group labels to compare cluster size.",
    `${titleCase(formatFeatureLabel(state.yColumn))} and ${titleCase(formatFeatureLabel(state.xColumn))} are plotted directly for group comparison.`,
  ];
  return `
    <g transform="translate(${width - 296} ${margin.top + 82})">
      <rect class="editorial-story-summary-card" width="240" height="128" rx="12"></rect>
      <text class="editorial-story-summary-title" x="18" y="28">Cluster notes</text>
      ${summaryLines
        .map(
          (line, index) => `
            <text class="editorial-story-summary-line" x="18" y="${56 + index * 24}">${escapeHtml(line)}</text>
          `,
        )
        .join("")}
    </g>
  `;
}

function groupPenguinPoints(rows) {
  return rows.reduce((groups, row) => {
    const label = normalizeCategory(row.species);
    groups[label] ||= [];
    groups[label].push(row);
    return groups;
  }, {});
}

function renderPenguinStoryGrid(width, height, margin, xDomain, yDomain) {
  const x = (value) => scale(value, xDomain[0], xDomain[1], margin.left, width - margin.right);
  const y = (value) => scale(value, yDomain[0], yDomain[1], height - margin.bottom, margin.top);
  return `
    ${ticks(yDomain[0], yDomain[1], 7)
      .map(
        (tick) => `
          <line class="penguin-story-grid" x1="${margin.left}" x2="${width - margin.right}" y1="${y(tick)}" y2="${y(tick)}"></line>
          <text class="penguin-story-tick" x="${margin.left - 18}" y="${y(tick) + 6}" text-anchor="end">${Math.round(tick)}</text>
        `,
      )
      .join("")}
    ${ticks(xDomain[0], xDomain[1], 8)
      .map(
        (tick) => `
          <line class="penguin-story-grid" y1="${margin.top}" y2="${height - margin.bottom}" x1="${x(tick)}" x2="${x(tick)}"></line>
          <text class="penguin-story-tick" x="${x(tick)}" y="${height - 42}" text-anchor="middle">${Math.round(tick)}</text>
        `,
      )
      .join("")}
    <line class="penguin-story-axis" x1="${margin.left}" x2="${width - margin.right}" y1="${height - margin.bottom}" y2="${height - margin.bottom}"></line>
    <line class="penguin-story-axis" x1="${margin.left}" x2="${margin.left}" y1="${margin.top}" y2="${height - margin.bottom}"></line>
  `;
}

function renderPenguinStoryBillCallout(width, top) {
  return `
    <g transform="translate(${width - 586} ${top})">
      <path class="penguin-story-head" d="M0 84 C8 22, 84 10, 116 52 C141 46, 174 48, 214 62 C190 80, 166 90, 132 92 C112 108, 84 126, 42 128 C24 122, 16 112, 11 100 C2 94, -1 88, 0 84 Z"></path>
      <path class="penguin-story-beak" d="M115 52 C145 42, 182 44, 214 62 C178 72, 149 78, 124 76 Z"></path>
      <circle class="penguin-story-eye" cx="74" cy="56" r="7"></circle>
      <circle class="penguin-story-eye-glint" cx="76.5" cy="54.5" r="2.2"></circle>
      <line class="penguin-story-note-line" x1="154" y1="34" x2="184" y2="24"></line>
      <line class="penguin-story-note-line" x1="154" y1="78" x2="194" y2="88"></line>
      <text class="penguin-story-note" x="188" y="24">Bill length</text>
      <text class="penguin-story-note" x="198" y="92">Bill depth</text>
      <text class="penguin-story-caption" x="170" y="118">Bill dimensions are commonly compared with flipper length</text>
    </g>
  `;
}

function renderPenguinStorySpeciesBadges(width) {
  const cards = [
    { key: "chinstrap", label: "CHINSTRAP!", x: width - 318, fill: "#b269d3" },
    { key: "gentoo", label: "GENTOO!", x: width - 210, fill: "#4f8f91" },
    { key: "adelie", label: "ADELIE!", x: width - 102, fill: "#ef9d43" },
  ];
  return cards
    .map(
      (card) => `
        <g transform="translate(${card.x} 20)">
          <path class="penguin-story-badge-splash" fill="${card.fill}" d="M8 12 C18 2, 46 -2, 70 9 C92 16, 104 37, 98 62 C92 84, 61 98, 34 94 C16 89, 4 72, 1 50 C-2 30, 0 20, 8 12 Z"></path>
          <text class="penguin-story-badge-label" x="50" y="10" text-anchor="middle">${card.label}</text>
          ${renderPenguinBadgeSilhouette(card.key)}
        </g>
      `,
    )
    .join("");
}

function renderPenguinBadgeSilhouette(key) {
  const variants = {
    chinstrap: '<ellipse cx="47" cy="49" rx="18" ry="31" class="penguin-story-silhouette" /><ellipse cx="47" cy="51" rx="10" ry="22" class="penguin-story-belly" /><circle cx="48" cy="21" r="11" class="penguin-story-silhouette" /><path d="M58 19 l12 4 -12 4 Z" class="penguin-story-beak-mini"></path><line x1="29" y1="44" x2="18" y2="57" class="penguin-story-wing"></line>',
    gentoo: '<ellipse cx="50" cy="49" rx="22" ry="32" class="penguin-story-silhouette" /><ellipse cx="50" cy="52" rx="12" ry="24" class="penguin-story-belly" /><circle cx="50" cy="21" r="12" class="penguin-story-silhouette" /><path d="M61 20 l13 4 -13 5 Z" class="penguin-story-beak-mini"></path><line x1="29" y1="44" x2="12" y2="40" class="penguin-story-wing"></line><line x1="71" y1="44" x2="88" y2="40" class="penguin-story-wing"></line>',
    adelie: '<ellipse cx="48" cy="50" rx="19" ry="31" class="penguin-story-silhouette" /><ellipse cx="48" cy="52" rx="11" ry="23" class="penguin-story-belly" /><circle cx="48" cy="21" r="11" class="penguin-story-silhouette" /><path d="M59 20 l11 4 -11 4 Z" class="penguin-story-beak-mini"></path><line x1="29" y1="44" x2="17" y2="47" class="penguin-story-wing"></line><line x1="67" y1="44" x2="79" y2="47" class="penguin-story-wing"></line>',
  };
  return variants[key] || "";
}

function renderPenguinStoryClusterHints(grouped, x, y) {
  const colors = {
    adelie: "#e89a4c",
    chinstrap: "#9a68ca",
    gentoo: "#708760",
  };
  return Object.entries(grouped)
    .map(([key, values]) => {
      const meanX = values.reduce((sum, row) => sum + row.flipper_length_mm, 0) / values.length;
      const meanY = values.reduce((sum, row) => sum + row.bill_length_mm, 0) / values.length;
      return `<circle class="penguin-story-cluster-halo" cx="${x(meanX)}" cy="${y(meanY)}" r="22" stroke="${colors[key] || "#888"}"></circle>`;
    })
    .join("");
}

function getPredictionOverlayForAxes() {
  if (state.chartType !== "scatter") return [];

  const savedPredictions = state.predictedPoints
    .filter((prediction) => currentDatasetHasColumns([state.xColumn, state.yColumn]))
    .map((prediction) => ({
      id: prediction.id,
      label: prediction.label,
      xValue: Number(prediction.features[state.xColumn]),
      yValue: Number(prediction.features[state.yColumn]),
      live: false,
    }))
    .filter((prediction) => Number.isFinite(prediction.xValue) && Number.isFinite(prediction.yValue));

  const livePrediction =
    state.livePrediction && currentDatasetHasColumns([state.xColumn, state.yColumn])
      ? {
          id: "live-prediction",
          label: state.livePrediction.predictedLabel,
          xValue: Number(state.livePrediction.point[state.xColumn]),
          yValue: Number(state.livePrediction.point[state.yColumn]),
          live: true,
        }
      : null;

  if (!livePrediction || !Number.isFinite(livePrediction.xValue) || !Number.isFinite(livePrediction.yValue)) {
    return savedPredictions;
  }

  const alreadySaved = savedPredictions.some(
    (prediction) =>
      prediction.label === livePrediction.label &&
      prediction.xValue === livePrediction.xValue &&
      prediction.yValue === livePrediction.yValue,
  );

  return alreadySaved ? savedPredictions : [livePrediction, ...savedPredictions];
}

function canPlotPredictionOnCurrentChart() {
  return state.chartType === "scatter" && currentDatasetHasColumns([state.xColumn, state.yColumn]);
}

function currentDatasetHasColumns(columns) {
  return columns.every((column) => state.columns.includes(column));
}

function showPredictionOnChart(predictionId) {
  const savedPoints = [...state.predictedPoints];
  let prediction = predictionId
    ? state.predictedPoints.find((item) => item.id === predictionId)
    : state.predictedPoints[0];
  if (!prediction && state.livePrediction) {
    const id = addSavedPrediction(state.livePrediction);
    prediction = state.predictedPoints.find((item) => item.id === id);
    const currentDataset = getCurrentPreparedDataset();
    const currentModel = getCurrentPreparedModel();
    if (currentDataset && currentModel) {
      elements.predictionResult.innerHTML = renderPreparedPredictionResult(state.livePrediction, currentDataset, currentModel, id);
    }
  }
  if (!prediction) return;
  const model = state.modelArtifact?.datasets?.[prediction.datasetKey];
  if (!model) return;

  const applyPredictionView = () => {
    state.chartType = "scatter";
    state.xColumn = model.visualization.x_feature;
    state.yColumn = model.visualization.y_feature;
    if (state.columns.includes(model.target)) {
      state.groupColumn = model.target;
    }
    syncChartTypeButtons();
    syncControls();
    render();
  };

  if (currentDatasetHasColumns([model.visualization.x_feature, model.visualization.y_feature])) {
    applyPredictionView();
    return;
  }

  loadSample(model.sample_key).then(() => {
    state.predictedPoints = savedPoints;
    if (!currentDatasetHasColumns([model.visualization.x_feature, model.visualization.y_feature])) return;
    applyPredictionView();
    showQueryResponse(`Loaded the ${model.label} dataset and plotted the predicted ${prediction.label} point on the scatter chart.`);
  });
}

function renderSavedPredictions() {
  if (!state.predictedPoints.length) {
    return `
      <div class="prediction-history">
        <h3>Saved predictions</h3>
        <p>No saved predictions yet. Add one above to place it on the chart later.</p>
      </div>
    `;
  }

  return `
    <div class="prediction-history">
      <div class="prediction-history-header">
        <h3>Saved predictions</h3>
        <button type="button" class="prediction-text-button" data-clear-predictions="true">Clear all</button>
      </div>
      <div class="prediction-history-list">
        ${state.predictedPoints
          .map((prediction, index) => {
            const model = state.modelArtifact?.datasets?.[prediction.datasetKey];
            const modelChoice = model?.models?.[prediction.modelKey];
            const featureSummary = Object.entries(prediction.features)
              .map(([feature, value]) => `${titleCase(formatFeatureLabel(feature))}: ${typeof value === "number" ? formatSliderValue(value) : titleCase(stringifyCell(value).replaceAll("_", " "))}`)
              .join(", ");
            return `
              <article class="prediction-item">
                <div class="prediction-item-copy">
                  <p class="prediction-item-title">
                    <span class="prediction-badge">${escapeHtml(prediction.label)}</span>
                    <span>Prediction ${state.predictedPoints.length - index}</span>
                  </p>
                  <p><strong>Dataset:</strong> ${escapeHtml(model?.label || prediction.datasetKey)}</p>
                  <p><strong>Model:</strong> ${escapeHtml(modelChoice?.label || prediction.modelKey || "Prepared model")}</p>
                  <p><strong>Closest nearby label:</strong> ${escapeHtml(titleCase(stringifyCell(prediction.closestLabel || prediction.label).replaceAll("_", " ")))}</p>
                  <p><strong>Input:</strong> ${escapeHtml(featureSummary)}</p>
                  <p>${escapeHtml(truncate(prediction.explanation || "", 140))}</p>
                </div>
                <div class="prediction-item-actions">
                  <button type="button" class="prediction-text-button" data-show-prediction="${escapeHtml(prediction.id)}">Show on chart</button>
                  <button type="button" class="prediction-text-button is-danger" data-remove-prediction="${escapeHtml(prediction.id)}">Remove</button>
                </div>
              </article>
            `;
          })
          .join("")}
      </div>
    </div>
  `;
}

function removePrediction(predictionId) {
  state.predictedPoints = state.predictedPoints.filter((prediction) => prediction.id !== predictionId);
  updatePredictionLab();
  render();
}

function clearPredictions() {
  state.predictedPoints = [];
  updatePredictionLab();
  render();
}

function renderBar(rows) {
  const grouped = aggregateRows(rows, state.xColumn, state.yColumn).slice(0, 18);
  const width = 900;
  const height = Math.max(420, grouped.length * 42 + 72);
  const margin = { top: 18, right: 96, bottom: 34, left: 170 };
  const maxValue = Math.max(...grouped.map((item) => item.value), 1);
  const color = colorForGroups(grouped);

  elements.chartFrame.innerHTML = `
    <svg viewBox="0 0 ${width} ${height}" role="img" aria-label="${escapeHtml(chartTitle())}">
      ${grouped
        .map((item, index) => {
          const y = margin.top + index * 42;
          const barWidth = scale(item.value, 0, maxValue, 0, width - margin.left - margin.right);
          return `
            <text class="bar-label" x="${margin.left - 12}" y="${y + 24}" text-anchor="end">${escapeHtml(truncate(item.label, 22))}</text>
            <rect class="bar" style="animation-delay:${index * 45}ms" x="${margin.left}" y="${y}" width="${barWidth}" height="28" rx="6" fill="${color(item.label)}"></rect>
            <text class="bar-value" x="${margin.left + barWidth + 10}" y="${y + 20}">${formatCompact(item.value)}</text>
          `;
        })
        .join("")}
    </svg>
  `;
}

function renderLineOrArea(rows, showArea) {
  const grouped = aggregateRows(rows, state.xColumn, state.yColumn).slice(0, 60).reverse();
  const width = 900;
  const height = 460;
  const margin = { top: 26, right: 30, bottom: 74, left: 72 };
  const yDomain = paddedExtent(grouped, "value");
  const x = (index) => scale(index, 0, Math.max(grouped.length - 1, 1), margin.left, width - margin.right);
  const y = (value) => scale(value, yDomain[0], yDomain[1], height - margin.bottom, margin.top);
  const path = grouped.map((item, index) => `${index === 0 ? "M" : "L"} ${x(index)} ${y(item.value)}`).join(" ");
  const areaPath = `${path} L ${x(grouped.length - 1)} ${height - margin.bottom} L ${margin.left} ${height - margin.bottom} Z`;
  const xTickEvery = Math.max(1, Math.ceil(grouped.length / 8));

  elements.chartFrame.innerHTML = `
    <svg viewBox="0 0 ${width} ${height}" role="img" aria-label="${escapeHtml(chartTitle())}">
      ${ticks(yDomain[0], yDomain[1], 5)
        .map(
          (tick) => `
            <line class="grid-line" x1="${margin.left}" x2="${width - margin.right}" y1="${y(tick)}" y2="${y(tick)}"></line>
            <text class="tick-label" x="${margin.left - 12}" y="${y(tick) + 4}" text-anchor="end">${formatCompact(tick)}</text>
          `,
        )
        .join("")}
      <line class="axis" x1="${margin.left}" x2="${width - margin.right}" y1="${height - margin.bottom}" y2="${height - margin.bottom}"></line>
      <line class="axis" x1="${margin.left}" x2="${margin.left}" y1="${margin.top}" y2="${height - margin.bottom}"></line>
      ${showArea && grouped.length > 1 ? `<path class="area-path" d="${areaPath}" fill="${palette[0]}"></path>` : ""}
      ${grouped.length > 1 ? `<path class="line-path" d="${path}" stroke="${palette[0]}"></path>` : ""}
      ${grouped
        .map((item, index) =>
          index % xTickEvery === 0
            ? `<text class="tick-label" x="${x(index)}" y="${height - 38}" text-anchor="middle" transform="rotate(-28 ${x(index)} ${height - 38})">${escapeHtml(truncate(item.label, 12))}</text>`
            : "",
        )
        .join("")}
      ${grouped
        .map(
          (item, index) => `
            <circle class="dot" cx="${x(index)}" cy="${y(item.value)}" r="4.5" fill="${palette[0]}">
              <title>${escapeHtml(item.label)}: ${formatCompact(item.value)}</title>
            </circle>
          `,
        )
        .join("")}
    </svg>
  `;
}

function renderPie(rows) {
  const slices = aggregateForDistribution(rows).slice(0, 8);
  const total = slices.reduce((sum, item) => sum + item.value, 0);
  const width = 900;
  const height = 460;
  const cx = 315;
  const cy = 230;
  const radius = 170;
  let startAngle = -Math.PI / 2;

  elements.chartFrame.innerHTML = `
    <svg viewBox="0 0 ${width} ${height}" role="img" aria-label="${escapeHtml(chartTitle())}">
      ${slices
        .map((slice, index) => {
          const angle = (slice.value / total) * Math.PI * 2;
          const endAngle = startAngle + angle;
          const path = slices.length === 1 ? fullCirclePath(cx, cy, radius) : arcPath(cx, cy, radius, startAngle, endAngle);
          const labelPoint = polarToCartesian(cx, cy, radius + 28, startAngle + angle / 2);
          const color = palette[index % palette.length];
          startAngle = endAngle;
          return `
            <path class="pie-slice" style="animation-delay:${index * 70}ms" d="${path}" fill="${color}">
              <title>${escapeHtml(slice.label)}: ${formatCompact(slice.value)}</title>
            </path>
            <text class="tick-label" x="${labelPoint.x}" y="${labelPoint.y}" text-anchor="${labelPoint.x > cx ? "start" : "end"}">${escapeHtml(truncate(slice.label, 15))}</text>
          `;
        })
        .join("")}
      <circle cx="${cx}" cy="${cy}" r="76" fill="rgba(255,255,255,0.88)"></circle>
      <text class="point-label" x="${cx}" y="${cy - 5}" text-anchor="middle">${formatCompact(total)}</text>
      <text class="tick-label" x="${cx}" y="${cy + 18}" text-anchor="middle">total</text>
      ${legend(slices, 630, 96)}
    </svg>
  `;
}

function renderHistogram(rows) {
  const values = rows.map((row) => Number(row[state.xColumn])).filter(Number.isFinite);
  const bins = histogram(values, 14);
  const width = 900;
  const height = 460;
  const margin = { top: 26, right: 30, bottom: 58, left: 70 };
  const maxCount = Math.max(...bins.map((bin) => bin.count), 1);
  const x = (index) => scale(index, 0, bins.length, margin.left, width - margin.right);
  const y = (count) => scale(count, 0, maxCount, height - margin.bottom, margin.top);
  const barGap = 4;

  elements.chartFrame.innerHTML = `
    <svg viewBox="0 0 ${width} ${height}" role="img" aria-label="${escapeHtml(chartTitle())}">
      ${ticks(0, maxCount, 5)
        .map(
          (tick) => `
            <line class="grid-line" x1="${margin.left}" x2="${width - margin.right}" y1="${y(tick)}" y2="${y(tick)}"></line>
            <text class="tick-label" x="${margin.left - 12}" y="${y(tick) + 4}" text-anchor="end">${formatCompact(tick)}</text>
          `,
        )
        .join("")}
      <line class="axis" x1="${margin.left}" x2="${width - margin.right}" y1="${height - margin.bottom}" y2="${height - margin.bottom}"></line>
      <line class="axis" x1="${margin.left}" x2="${margin.left}" y1="${margin.top}" y2="${height - margin.bottom}"></line>
      ${bins
        .map((bin, index) => {
          const left = x(index) + barGap / 2;
          const right = x(index + 1) - barGap / 2;
          const top = y(bin.count);
          return `
            <rect class="bar" style="animation-delay:${index * 40}ms" x="${left}" y="${top}" width="${Math.max(right - left, 1)}" height="${height - margin.bottom - top}" rx="5" fill="${palette[index % palette.length]}">
              <title>${formatCompact(bin.min)} to ${formatCompact(bin.max)}: ${bin.count}</title>
            </rect>
            ${index % 3 === 0 ? `<text class="tick-label" x="${left}" y="${height - 28}" text-anchor="start">${formatCompact(bin.min)}</text>` : ""}
          `;
        })
        .join("")}
      <text class="axis-title" x="${width / 2}" y="${height - 8}" text-anchor="middle">${escapeHtml(state.xColumn)}</text>
    </svg>
  `;
}

function renderBoxPlot(rows) {
  const groups = groupedValues(rows, state.xColumn, state.yColumn).slice(0, 10);
  const stats = groups.map((group) => ({ label: group.label, ...boxStats(group.values) })).filter((item) => item);
  const width = 900;
  const height = 460;
  const margin = { top: 30, right: 34, bottom: 78, left: 72 };
  const allValues = stats.flatMap((item) => [item.min, item.q1, item.median, item.q3, item.max]);
  const yDomain = paddedExtent(allValues.map((value) => ({ value })), "value");
  const x = (index) => scale(index, 0, Math.max(stats.length - 1, 1), margin.left + 40, width - margin.right - 40);
  const y = (value) => scale(value, yDomain[0], yDomain[1], height - margin.bottom, margin.top);

  elements.chartFrame.innerHTML = `
    <svg viewBox="0 0 ${width} ${height}" role="img" aria-label="${escapeHtml(chartTitle())}">
      ${ticks(yDomain[0], yDomain[1], 5)
        .map(
          (tick) => `
            <line class="grid-line" x1="${margin.left}" x2="${width - margin.right}" y1="${y(tick)}" y2="${y(tick)}"></line>
            <text class="tick-label" x="${margin.left - 12}" y="${y(tick) + 4}" text-anchor="end">${formatCompact(tick)}</text>
          `,
        )
        .join("")}
      <line class="axis" x1="${margin.left}" x2="${width - margin.right}" y1="${height - margin.bottom}" y2="${height - margin.bottom}"></line>
      <line class="axis" x1="${margin.left}" x2="${margin.left}" y1="${margin.top}" y2="${height - margin.bottom}"></line>
      ${stats
        .map((item, index) => {
          const center = x(index);
          const boxWidth = Math.min(56, (width - margin.left - margin.right) / Math.max(stats.length, 1) - 16);
          return `
            <line class="box-line" x1="${center}" x2="${center}" y1="${y(item.min)}" y2="${y(item.max)}"></line>
            <line class="box-line" x1="${center - boxWidth / 3}" x2="${center + boxWidth / 3}" y1="${y(item.min)}" y2="${y(item.min)}"></line>
            <line class="box-line" x1="${center - boxWidth / 3}" x2="${center + boxWidth / 3}" y1="${y(item.max)}" y2="${y(item.max)}"></line>
            <rect class="box-shape" x="${center - boxWidth / 2}" y="${y(item.q3)}" width="${boxWidth}" height="${Math.max(y(item.q1) - y(item.q3), 1)}" rx="5" fill="${palette[index % palette.length]}"></rect>
            <line class="median-line" x1="${center - boxWidth / 2}" x2="${center + boxWidth / 2}" y1="${y(item.median)}" y2="${y(item.median)}"></line>
            <text class="tick-label" x="${center}" y="${height - 42}" text-anchor="middle" transform="rotate(-24 ${center} ${height - 42})">${escapeHtml(truncate(item.label, 12))}</text>
          `;
        })
        .join("")}
      <text class="axis-title" x="18" y="${height / 2}" text-anchor="middle" transform="rotate(-90 18 ${height / 2})">${escapeHtml(state.yColumn)}</text>
    </svg>
  `;
}

function renderClock(rows) {
  const spokes = aggregateForDistribution(rows).slice(0, 24);
  const maxValue = Math.max(...spokes.map((item) => item.value), 1);
  const width = 900;
  const height = 460;
  const cx = 320;
  const cy = 230;
  const inner = 54;
  const outer = 178;

  elements.chartFrame.innerHTML = `
    <svg viewBox="0 0 ${width} ${height}" role="img" aria-label="${escapeHtml(chartTitle())}">
      ${ticks(0, maxValue, 4)
        .slice(1)
        .map((tick) => `<circle class="grid-line" cx="${cx}" cy="${cy}" r="${scale(tick, 0, maxValue, inner, outer)}"></circle>`)
        .join("")}
      ${spokes
        .map((item, index) => {
          const angle = -Math.PI / 2 + (index / spokes.length) * Math.PI * 2;
          const end = polarToCartesian(cx, cy, scale(item.value, 0, maxValue, inner, outer), angle);
          const label = polarToCartesian(cx, cy, outer + 28, angle);
          return `
            <line class="clock-spoke" style="animation-delay:${index * 45}ms" x1="${cx}" y1="${cy}" x2="${end.x}" y2="${end.y}" stroke="${palette[index % palette.length]}"></line>
            <circle class="dot" cx="${end.x}" cy="${end.y}" r="6" fill="${palette[index % palette.length]}">
              <title>${escapeHtml(item.label)}: ${formatCompact(item.value)}</title>
            </circle>
            <text class="tick-label" x="${label.x}" y="${label.y}" text-anchor="middle">${escapeHtml(truncate(item.label, 10))}</text>
          `;
        })
        .join("")}
      <circle cx="${cx}" cy="${cy}" r="${inner}" fill="rgba(255,255,255,0.9)" stroke="rgba(24,33,44,0.12)"></circle>
      <text class="point-label" x="${cx}" y="${cy + 5}" text-anchor="middle">${escapeHtml(truncate(state.xColumn, 14))}</text>
      ${legend(spokes.slice(0, 10), 610, 86)}
    </svg>
  `;
}

function renderColumnProfile() {
  elements.profileTitle.textContent = `${state.columns.length} fields`;
  elements.columnProfile.innerHTML = state.profile
    .map(
      (column) => `
        <article class="column-item">
          <strong>${escapeHtml(column.name)}</strong>
          <span>${column.type}</span>
          <span>${formatNumber(column.filled)} filled</span>
          <span>${formatNumber(column.missing)} missing</span>
          <span>${formatNumber(column.unique)} unique</span>
        </article>
      `,
    )
    .join("");
}

function renderDatasetSummary() {
  if (!state.rows.length) {
    elements.summaryStatus.textContent = "Load a spreadsheet to inspect its structure.";
    elements.datasetSummary.innerHTML = emptyState("No dataset loaded", "Rows, columns, types, and statistics will appear here.");
    return;
  }

  const missingTotal = state.profile.reduce((sum, column) => sum + column.missing, 0);
  const cleanColumns = state.profile.filter((column) => column.missing === 0).length;
  const numericStats = state.numericColumns.map((column) => describeNumericColumn(state.rows, column)).filter(Boolean);

  elements.summaryStatus.textContent =
    `${state.name}: ${formatNumber(state.rows.length)} rows, ${formatNumber(state.columns.length)} columns`;

  elements.datasetSummary.innerHTML = `
    <article class="summary-card">
      <h3>Structure</h3>
      <dl class="summary-list">
        <div class="summary-row"><dt>Rows</dt><dd><strong>${formatNumber(state.rows.length)}</strong></dd></div>
        <div class="summary-row"><dt>Columns</dt><dd><strong>${formatNumber(state.columns.length)}</strong></dd></div>
        <div class="summary-row"><dt>Numeric</dt><dd><strong>${formatNumber(state.numericColumns.length)}</strong></dd></div>
        <div class="summary-row"><dt>Categorical</dt><dd><strong>${formatNumber(state.categoricalColumns.length)}</strong></dd></div>
        <div class="summary-row"><dt>Missing cells</dt><dd><strong>${formatNumber(missingTotal)}</strong></dd></div>
        <div class="summary-row"><dt>Complete columns</dt><dd><strong>${formatNumber(cleanColumns)}</strong></dd></div>
      </dl>
      <div class="summary-tags" aria-label="Numeric columns">
        ${renderColumnTags("Numeric", state.numericColumns)}
      </div>
      <div class="summary-tags" aria-label="Categorical columns">
        ${renderColumnTags("Categorical", state.categoricalColumns)}
      </div>
    </article>

    <article class="summary-card">
      <h3>Column quality</h3>
      <div class="quality-table-wrap">
        <table class="quality-table">
          <thead>
            <tr>
              <th>Column</th>
              <th>Detected type</th>
              <th>Missing</th>
              <th>Missing %</th>
            </tr>
          </thead>
          <tbody>
            ${state.profile
              .map(
                (column) => `
                  <tr>
                    <td>${escapeHtml(column.name)}</td>
                    <td>${escapeHtml(column.type)}</td>
                    <td>${formatNumber(column.missing)}</td>
                    <td>${column.missingRate.toFixed(1)}%</td>
                  </tr>
                `,
              )
              .join("")}
          </tbody>
        </table>
      </div>
    </article>

    <article class="summary-card summary-card-wide">
      <h3>Numeric statistics</h3>
      ${
        numericStats.length
          ? `
            <div class="quality-table-wrap">
              <table class="quality-table">
                <thead>
                  <tr>
                    <th>Column</th>
                    <th>Mean</th>
                    <th>Median</th>
                    <th>Min</th>
                    <th>Max</th>
                    <th>Std. dev.</th>
                  </tr>
                </thead>
                <tbody>
                  ${numericStats
                    .map(
                      (column) => `
                        <tr>
                          <td>${escapeHtml(column.name)}</td>
                          <td>${formatStat(column.mean)}</td>
                          <td>${formatStat(column.median)}</td>
                          <td>${formatStat(column.min)}</td>
                          <td>${formatStat(column.max)}</td>
                          <td>${formatStat(column.stdDev)}</td>
                        </tr>
                      `,
                    )
                    .join("")}
                </tbody>
              </table>
            </div>
          `
          : "<p>No numeric columns were detected, so there are no numeric statistics to show yet.</p>"
      }
    </article>
  `;
}

function renderColumnTags(label, columns) {
  const names = columns.length ? columns : ["None detected"];
  return [
    `<span class="summary-tag">${label}</span>`,
    ...names.map((column) => `<span class="summary-tag">${escapeHtml(column)}</span>`),
  ].join("");
}

function renderTable(rows) {
  const preview = rows.slice(0, 80);
  elements.tableCount.textContent = `${formatNumber(preview.length)} of ${formatNumber(rows.length)} visible rows`;

  if (!preview.length) {
    elements.tableWrap.innerHTML = emptyState("No rows to preview", "Clear the current filter or search query.");
    return;
  }

  elements.tableWrap.innerHTML = `
    <table>
      <thead>
        <tr>${state.columns.map((column) => `<th>${escapeHtml(column)}</th>`).join("")}</tr>
      </thead>
      <tbody>
        ${preview
          .map(
            (row) => `
              <tr>${state.columns.map((column) => `<td>${escapeHtml(stringifyCell(row[column]))}</td>`).join("")}</tr>
            `,
          )
          .join("")}
      </tbody>
    </table>
  `;
}

function setEmptyState() {
  elements.chartFrame.innerHTML = emptyState("Upload or load a spreadsheet", "Then choose fields for the chart.");
  renderChartInsights([], []);
  elements.chartRecommendation.innerHTML = `
    <strong>Recommended chart</strong>
    <p>Load a spreadsheet and choose columns to see a chart suggestion.</p>
  `;
  elements.summaryStatus.textContent = "Load a spreadsheet to inspect its structure.";
  elements.datasetSummary.innerHTML = emptyState("No dataset loaded", "Rows, columns, types, and statistics will appear here.");
  elements.columnProfile.innerHTML = emptyState("No fields yet", "Column summaries appear after data loads.");
  elements.tableWrap.innerHTML = emptyState("No rows yet", "The dataset preview will appear here.");
}

function emptyState(title, text) {
  return `<div class="empty-state"><p><strong>${title}</strong>${text}</p></div>`;
}

function parseCsv(text) {
  const rows = [];
  let row = [];
  let value = "";
  let inQuotes = false;

  for (let index = 0; index < text.length; index += 1) {
    const char = text[index];
    const next = text[index + 1];

    if (char === '"' && inQuotes && next === '"') {
      value += '"';
      index += 1;
    } else if (char === '"') {
      inQuotes = !inQuotes;
    } else if (char === "," && !inQuotes) {
      row.push(value);
      value = "";
    } else if ((char === "\n" || char === "\r") && !inQuotes) {
      if (char === "\r" && next === "\n") index += 1;
      row.push(value);
      if (row.some((cell) => cell.trim() !== "")) rows.push(row);
      row = [];
      value = "";
    } else {
      value += char;
    }
  }

  if (value || row.length) {
    row.push(value);
    rows.push(row);
  }

  const headers = dedupeHeaders(rows.shift() || []);
  return rows.map((cells) =>
    Object.fromEntries(headers.map((header, index) => [header, parseValue(cells[index] ?? "")])),
  );
}

function dedupeHeaders(headers) {
  const seen = {};
  return headers.map((header, index) => {
    const base = header.trim() || `Column ${index + 1}`;
    seen[base] = (seen[base] || 0) + 1;
    return seen[base] === 1 ? base : `${base} ${seen[base]}`;
  });
}

function parseValue(value) {
  const trimmed = value.trim();
  if (trimmed === "" || trimmed.toUpperCase() === "NA") return "";
  const numeric = Number(trimmed.replaceAll(",", ""));
  return Number.isFinite(numeric) && /^-?[\d,.]+$/.test(trimmed) ? numeric : trimmed;
}

function profileColumns(rows, columns) {
  return columns.map((name) => {
    const values = rows.map((row) => row[name]).filter((value) => stringifyCell(value) !== "");
    const numericValues = values.filter((value) => typeof value === "number" && Number.isFinite(value));
    const missing = rows.length - values.length;

    return {
      name,
      type: values.length && numericValues.length / values.length > 0.8 ? "number" : "category",
      filled: values.length,
      missing,
      missingRate: rows.length ? (missing / rows.length) * 100 : 0,
      unique: unique(values.map(stringifyCell)).length,
    };
  });
}

function describeNumericColumn(rows, column) {
  const values = rowsWithNumeric(rows, column).map((row) => row[column]).filter(Number.isFinite);
  if (!values.length) return null;
  const sorted = [...values].sort((a, b) => a - b);
  const mean = sorted.reduce((sum, value) => sum + value, 0) / sorted.length;
  const variance =
    sorted.length > 1 ? sorted.reduce((sum, value) => sum + (value - mean) ** 2, 0) / (sorted.length - 1) : 0;
  return {
    name: column,
    mean,
    median: quantile(sorted, 0.5),
    min: sorted[0],
    max: sorted[sorted.length - 1],
    stdDev: Math.sqrt(variance),
  };
}

function formatStat(value) {
  return new Intl.NumberFormat("en-US", { maximumFractionDigits: 2 }).format(value);
}

function rowsWithNumeric(rows, column) {
  return rows.filter((row) => typeof row[column] === "number" && Number.isFinite(row[column]));
}

function aggregateRows(rows, labelColumn, valueColumn) {
  const groups = rows.reduce((totals, row, index) => {
    const label = stringifyCell(row[labelColumn]) || `Row ${index + 1}`;
    totals[label] ||= [];
    totals[label].push(row[valueColumn]);
    return totals;
  }, {});

  return Object.entries(groups)
    .map(([label, values]) => ({
      label,
      value: values.reduce((sum, value) => sum + value, 0) / values.length,
    }))
    .sort((a, b) => b.value - a.value);
}

function aggregateForDistribution(rows) {
  if (state.numericColumns.includes(state.yColumn)) {
    const numericRows = rowsWithNumeric(rows, state.yColumn);
    if (numericRows.length) return aggregateRows(numericRows, state.xColumn, state.yColumn);
  }
  return Object.entries(countBy(rows, state.xColumn))
    .map(([label, value]) => ({ label, value }))
    .sort((a, b) => b.value - a.value);
}

function countBy(rows, column) {
  return rows.reduce((totals, row, index) => {
    const label = stringifyCell(row[column]) || `Row ${index + 1}`;
    totals[label] = (totals[label] || 0) + 1;
    return totals;
  }, {});
}

function groupedValues(rows, labelColumn, valueColumn) {
  const groups = rows.reduce((totals, row, index) => {
    const label = stringifyCell(row[labelColumn]) || `Row ${index + 1}`;
    totals[label] ||= [];
    totals[label].push(row[valueColumn]);
    return totals;
  }, {});

  return Object.entries(groups)
    .map(([label, values]) => ({ label, values: values.filter(Number.isFinite).sort((a, b) => a - b) }))
    .filter((group) => group.values.length)
    .sort((a, b) => median(b.values) - median(a.values));
}

function boxStats(values) {
  if (!values.length) return null;
  return {
    min: values[0],
    q1: quantile(values, 0.25),
    median: quantile(values, 0.5),
    q3: quantile(values, 0.75),
    max: values[values.length - 1],
  };
}

function histogram(values, count) {
  if (!values.length) return [];
  const min = Math.min(...values);
  const max = Math.max(...values);
  const width = (max - min || 1) / count;
  const bins = Array.from({ length: count }, (_, index) => ({
    min: min + index * width,
    max: min + (index + 1) * width,
    count: 0,
  }));

  values.forEach((value) => {
    const index = Math.min(Math.floor((value - min) / width), count - 1);
    bins[index].count += 1;
  });

  return bins;
}

function chartTitle() {
  const chartLabel = chartTypes.find((chart) => chart.key === state.chartType)?.label || "Chart";
  if (state.chartType === "histogram") return `${chartLabel}: ${state.xColumn}`;
  if (state.chartType === "pie" || state.chartType === "clock") return `${chartLabel}: ${state.xColumn}`;
  return `${chartLabel}: ${state.yColumn} by ${state.xColumn}`;
}

function grid(width, height, margin, xDomain, yDomain) {
  const x = (value) => scale(value, xDomain[0], xDomain[1], margin.left, width - margin.right);
  const y = (value) => scale(value, yDomain[0], yDomain[1], height - margin.bottom, margin.top);
  return `
    ${ticks(yDomain[0], yDomain[1], 5)
      .map(
        (tick) => `
          <line class="grid-line" x1="${margin.left}" x2="${width - margin.right}" y1="${y(tick)}" y2="${y(tick)}"></line>
          <text class="tick-label" x="${margin.left - 12}" y="${y(tick) + 4}" text-anchor="end">${formatCompact(tick)}</text>
        `,
      )
      .join("")}
    ${ticks(xDomain[0], xDomain[1], 5)
      .map(
        (tick) => `
          <line class="grid-line" y1="${margin.top}" y2="${height - margin.bottom}" x1="${x(tick)}" x2="${x(tick)}"></line>
          <text class="tick-label" x="${x(tick)}" y="${height - 34}" text-anchor="middle">${formatCompact(tick)}</text>
        `,
      )
      .join("")}
    <line class="axis" x1="${margin.left}" x2="${width - margin.right}" y1="${height - margin.bottom}" y2="${height - margin.bottom}"></line>
    <line class="axis" x1="${margin.left}" x2="${margin.left}" y1="${margin.top}" y2="${height - margin.bottom}"></line>
  `;
}

function legend(items, x, y) {
  return items
    .map(
      (item, index) => `
        <g transform="translate(${x} ${y + index * 30})">
          <rect width="14" height="14" rx="4" fill="${palette[index % palette.length]}"></rect>
          <text class="tick-label" x="24" y="12">${escapeHtml(truncate(item.label, 24))} ${formatCompact(item.value)}</text>
        </g>
      `,
    )
    .join("");
}

function arcPath(cx, cy, radius, startAngle, endAngle) {
  const start = polarToCartesian(cx, cy, radius, endAngle);
  const end = polarToCartesian(cx, cy, radius, startAngle);
  const largeArc = endAngle - startAngle <= Math.PI ? 0 : 1;
  return `M ${cx} ${cy} L ${start.x} ${start.y} A ${radius} ${radius} 0 ${largeArc} 0 ${end.x} ${end.y} Z`;
}

function fullCirclePath(cx, cy, radius) {
  return `
    M ${cx} ${cy - radius}
    A ${radius} ${radius} 0 1 1 ${cx} ${cy + radius}
    A ${radius} ${radius} 0 1 1 ${cx} ${cy - radius}
    Z
  `;
}

function polarToCartesian(cx, cy, radius, angle) {
  return {
    x: cx + radius * Math.cos(angle),
    y: cy + radius * Math.sin(angle),
  };
}

function paddedExtent(rows, column) {
  const values = rows.map((row) => Number(row[column])).filter(Number.isFinite);
  if (!values.length) return [0, 1];
  const min = Math.min(...values);
  const max = Math.max(...values);
  const padding = (max - min || Math.abs(max) || 1) * 0.08;
  return [min - padding, max + padding];
}

function colorForGroups(items) {
  const labels = unique(
    items.map((item) => item.label || (state.groupColumn ? stringifyCell(item[state.groupColumn]) : "Dataset")),
  );
  const map = Object.fromEntries(labels.map((label, index) => [label, palette[index % palette.length]]));
  return (label) => map[label] || palette[0];
}

function chartIcon(type) {
  const paths = {
    scatter: '<circle cx="7" cy="15" r="2" /><circle cx="12" cy="9" r="2" /><circle cx="18" cy="13" r="2" />',
    bar: '<path d="M5 19V9" /><path d="M12 19V5" /><path d="M19 19v-7" />',
    line: '<path d="m4 16 5-6 4 3 7-8" />',
    area: '<path d="m4 17 5-7 4 3 7-8v12H4Z" />',
    pie: '<path d="M12 3a9 9 0 1 0 9 9h-9Z" /><path d="M14 3.25V10h6.75A9 9 0 0 0 14 3.25Z" />',
    histogram: '<path d="M4 19V8h4v11M10 19V5h4v14M16 19v-8h4v8" />',
    box: '<path d="M7 7v10M17 7v10M9 8h6v8H9Z" /><path d="M12 8v8M5 12h4M15 12h4" />',
    clock: '<circle cx="12" cy="12" r="8" /><path d="M12 7v5l4 2" />',
  };
  return `<svg viewBox="0 0 24 24" aria-hidden="true">${paths[type]}</svg>`;
}

function unique(values) {
  return [...new Set(values)].filter((value) => value !== "").sort((a, b) => String(a).localeCompare(String(b)));
}

function stringifyCell(value) {
  return value == null ? "" : String(value);
}

function scale(value, inputMin, inputMax, outputMin, outputMax) {
  if (inputMax === inputMin) return (outputMin + outputMax) / 2;
  return outputMin + ((value - inputMin) / (inputMax - inputMin)) * (outputMax - outputMin);
}

function ticks(min, max, count) {
  if (count <= 1) return [min];
  const step = (max - min) / (count - 1);
  return Array.from({ length: count }, (_, index) => min + step * index);
}

function quantile(values, q) {
  const position = (values.length - 1) * q;
  const base = Math.floor(position);
  const rest = position - base;
  return values[base + 1] === undefined ? values[base] : values[base] + rest * (values[base + 1] - values[base]);
}

function median(values) {
  return quantile(values, 0.5);
}

function truncate(value, length) {
  const text = stringifyCell(value);
  return text.length > length ? `${text.slice(0, length - 1)}...` : text;
}

function formatNumber(value) {
  return new Intl.NumberFormat("en-US").format(value);
}

function formatCompact(value) {
  return new Intl.NumberFormat("en-US", { maximumFractionDigits: 1, notation: "compact" }).format(value);
}

function escapeHtml(value) {
  return stringifyCell(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function animateValue(selector, from, to, formatter) {
  const element = document.querySelector(selector);
  const start = performance.now();
  const duration = 540;

  function frame(now) {
    const progress = Math.min((now - start) / duration, 1);
    const eased = 1 - Math.pow(1 - progress, 3);
    element.textContent = formatter(from + (to - from) * eased);
    if (progress < 1) requestAnimationFrame(frame);
  }

  requestAnimationFrame(frame);
}

// Override the original prepared-dataset prediction flow with an upload-driven
// training workflow. The charting and data summary parts stay the same, but the
// prediction lab now trains directly from the currently loaded dataset.

function init() {
  state.modelTraining = createEmptyModelTrainingState();
  renderSampleButtons();
  renderChartTypeButtons();
  bindEvents();
  setEmptyState();
  updateQueryExamples();
  loadMachineLearningReport();
  loadPredictionArtifact();
}

function createEmptyModelTrainingState() {
  return {
    targetColumn: "",
    selectedFeatureColumns: [],
    modelType: "decision_tree",
    testRatio: 0.25,
    trainedModel: null,
    inputValues: {},
  };
}

function bindEvents() {
  elements.fileInput.addEventListener("change", (event) => {
    const [file] = event.target.files;
    if (file) loadFile(file);
  });

  ["dragenter", "dragover"].forEach((eventName) => {
    elements.uploadZone.addEventListener(eventName, (event) => {
      event.preventDefault();
      elements.uploadZone.classList.add("dragover");
    });
  });

  ["dragleave", "drop"].forEach((eventName) => {
    elements.uploadZone.addEventListener(eventName, () => {
      elements.uploadZone.classList.remove("dragover");
    });
  });

  elements.uploadZone.addEventListener("drop", (event) => {
    event.preventDefault();
    const [file] = event.dataTransfer.files;
    if (file) loadFile(file);
  });

  elements.xSelect.addEventListener("change", () => {
    state.xColumn = elements.xSelect.value;
    render();
  });

  elements.ySelect.addEventListener("change", () => {
    state.yColumn = elements.ySelect.value;
    render();
  });

  elements.groupSelect.addEventListener("change", () => {
    state.groupColumn = elements.groupSelect.value;
    render();
  });

  elements.filterColumnSelect.addEventListener("change", () => {
    state.filterColumn = elements.filterColumnSelect.value;
    state.filterValue = "__all__";
    renderFilterValues();
    render();
  });

  elements.filterValueSelect.addEventListener("change", () => {
    state.filterValue = elements.filterValueSelect.value;
    render();
  });

  elements.searchInput.addEventListener("input", () => {
    state.search = elements.searchInput.value.trim().toLowerCase();
    render();
  });

  elements.chartRecommendation.addEventListener("click", (event) => {
    const button = event.target.closest("button[data-recommended-chart]");
    if (!button) return;
    state.chartType = button.dataset.recommendedChart;
    syncChartTypeButtons();
    chooseDefaults(false);
    syncControls();
    render();
  });

  elements.queryForm.addEventListener("submit", (event) => {
    event.preventDefault();
    handleNaturalLanguageQuery(elements.queryInput.value);
  });

  elements.predictionForm.addEventListener("input", handlePredictionFormChange);
  elements.predictionForm.addEventListener("change", handlePredictionFormChange);

  elements.predictionForm.addEventListener("click", (event) => {
    const trainButton = event.target.closest("button[data-train-model]");
    if (trainButton) {
      event.preventDefault();
      trainCurrentModel();
      return;
    }

    const saveButton = event.target.closest("button[data-save-prediction]");
    if (saveButton) {
      event.preventDefault();
      saveCurrentPrediction();
      return;
    }

    const resetButton = event.target.closest("button[data-reset-prediction-inputs], button[data-reset-flower]");
    if (resetButton) {
      event.preventDefault();
      resetPreparedInputs();
    }
  });

  elements.predictionResult.addEventListener("click", (event) => {
    const showButton = event.target.closest("button[data-show-prediction]");
    if (showButton) {
      showPredictionOnChart(showButton.dataset.showPrediction);
      return;
    }

    const removeButton = event.target.closest("button[data-remove-prediction]");
    if (removeButton) {
      removePrediction(removeButton.dataset.removePrediction);
      return;
    }

    const clearButton = event.target.closest("button[data-clear-predictions]");
    if (clearButton) {
      clearPredictions();
      return;
    }
  });

  elements.surprisePalette.addEventListener("click", () => {
    applyRandomPalette();
  });
}

function handlePredictionFormChange(event) {
  const targetChoice = event.target.closest("select[data-target-column]");
  if (targetChoice) {
    state.modelTraining.targetColumn = targetChoice.value;
    syncSelectedFeatureColumns(true);
    state.modelTraining.trainedModel = null;
    state.modelTraining.inputValues = {};
    renderPredictionWorkflow();
    renderMachineLearningReport();
    return;
  }

  const modelChoice = event.target.closest("select[data-model-choice]");
  if (modelChoice) {
    state.modelTraining.modelType = modelChoice.value;
    state.modelTraining.trainedModel = null;
    state.modelTraining.inputValues = {};
    renderPredictionWorkflow();
    renderMachineLearningReport();
    return;
  }

  const splitChoice = event.target.closest("select[data-test-ratio]");
  if (splitChoice) {
    state.modelTraining.testRatio = Number(splitChoice.value);
    state.modelTraining.trainedModel = null;
    renderPredictionWorkflow();
    renderMachineLearningReport();
    return;
  }

  const featureToggle = event.target.closest("input[data-feature-toggle]");
  if (featureToggle) {
    updateSelectedFeatureColumns(featureToggle);
    state.modelTraining.trainedModel = null;
    state.modelTraining.inputValues = {};
    renderPredictionWorkflow();
    renderMachineLearningReport();
    return;
  }

  const control = event.target.closest("[data-model-feature]");
  if (!control) return;
  updatePreparedFeatureValue(control);
  syncPreparedFeatureValue(control);
  updatePredictionLab();
}

function renderSampleButtons() {
  elements.sampleButtons.innerHTML = "";
}

function loadMachineLearningReport() {
  renderMachineLearningReport();
}

function loadPredictionArtifact() {
  state.modelArtifact = null;
  renderPredictionWorkflow();
}

function renderMachineLearningReport() {
  const trainedModel = state.modelTraining?.trainedModel;
  if (!trainedModel) {
    elements.mlStatus.textContent = "No trained model yet";
    elements.mlReport.innerHTML = `
      <article class="ml-card">
        <h3>Train from your dataset</h3>
        <p>Upload a spreadsheet, choose a target column, pick a model, and train directly in the browser.</p>
        <p><strong>How prediction works:</strong> The model compares a new row to similar rows in the dataset and predicts the most likely class based on the nearest examples.</p>
        <ul>
          <li>Decision tree: readable split rules</li>
          <li>Random forest: many trees voting together</li>
          <li>Nearest neighbor: predicts from similar examples</li>
        </ul>
      </article>
    `;
    return;
  }

  elements.mlStatus.textContent = `Latest model: ${trainedModel.modelLabel}`;
  elements.mlReport.innerHTML = `
    <article class="ml-card">
      <h3>${escapeHtml(trainedModel.modelLabel)}</h3>
      <span class="ml-score">${escapeHtml(trainedModel.metricDisplay)}</span>
      <p>${escapeHtml(trainedModel.resultSummary)}</p>
      <div class="ml-meta">
        <span class="summary-tag">${formatNumber(trainedModel.trainRows.length)} training rows</span>
        <span class="summary-tag">${formatNumber(trainedModel.testRows.length)} testing rows</span>
        <span class="summary-tag">Target: ${escapeHtml(trainedModel.targetColumn)}</span>
      </div>
      <p><strong>How prediction works:</strong> The model compares a new row to similar rows in the dataset and predicts the most likely class based on the nearest examples.</p>
      <p><strong>Classes:</strong> ${trainedModel.classes.map((label) => escapeHtml(titleCase(label.replaceAll("_", " ")))).join(", ")}</p>
      <p><strong>Features used:</strong> ${trainedModel.featureNames.map(escapeHtml).join(", ")}</p>
      <p><strong>Why choose it:</strong> ${escapeHtml(trainedModel.whyChoose)}</p>
      <ul>
        <li>Accuracy is measured on the held-out test split.</li>
        <li>Missing values are imputed with simple defaults before training.</li>
        <li>Categorical values are encoded consistently between training and prediction.</li>
      </ul>
    </article>
  `;
}

function renderMachineLearningError(message) {
  elements.mlStatus.textContent = "Training unavailable";
  elements.mlReport.innerHTML = `<article class="ml-card"><h3>Could not prepare training</h3><p>${escapeHtml(message)}</p></article>`;
}

function renderPredictionWorkflow() {
  if (!state.rows.length) {
    elements.predictionStatus.textContent = "Upload a dataset to unlock prediction";
    elements.predictionForm.innerHTML = "";
    elements.predictionResult.innerHTML = `
      <h3>No dataset loaded</h3>
      <p>Upload a CSV or Excel sheet first. Then you will be able to choose a target column, train a model, and test new predictions.</p>
    `;
    elements.predictionViz.innerHTML = emptyState("Prediction inactive", "Load a dataset to train a browser-side model.");
    return;
  }

  const targetOptions = getPredictionTargetCandidates();
  if (!targetOptions.length) {
    elements.predictionStatus.textContent = "Prediction needs a categorical target";
    elements.predictionForm.innerHTML = "";
    elements.predictionResult.innerHTML = `
      <h3>No target column found</h3>
      <p>This dataset does not have a clear low-cardinality target column yet. Prediction currently supports classification targets with a manageable number of labels.</p>
    `;
    elements.predictionViz.innerHTML = emptyState("Prediction unavailable", "Choose or upload a dataset with a label column such as species, class, category, outcome, or status.");
    return;
  }

  const trainingState = state.modelTraining;
  if (!targetOptions.includes(trainingState.targetColumn)) {
    trainingState.targetColumn = targetOptions[0];
    trainingState.trainedModel = null;
  }
  syncSelectedFeatureColumns();

  const trainedModel = trainingState.trainedModel;
  const availableFeatureColumns = getAvailableFeatureCandidates(trainingState.targetColumn);
  const selectedFeatureColumns = getSelectedFeatureCandidates(trainingState.targetColumn);

  elements.predictionStatus.textContent = trainedModel
    ? `Model trained on ${state.name}: ${trainedModel.modelLabel}`
    : `Choose a target and train a model from ${state.name}`;

  elements.predictionForm.innerHTML = `
    <div class="prediction-form-heading">
      <h3>Train a classifier from this dataset</h3>
      <p>Pick a target column, choose a prediction algorithm, and train on a held-out split from your uploaded data.</p>
    </div>
    <label class="prepared-select-card prepared-model-card">
      <div class="iris-slider-copy">
        <span>Target column</span>
        <strong>${escapeHtml(trainingState.targetColumn || "Choose target")}</strong>
      </div>
      <select data-target-column="true">
        ${targetOptions
          .map((column) => `<option value="${escapeHtml(column)}"${column === trainingState.targetColumn ? " selected" : ""}>${escapeHtml(column)}</option>`)
          .join("")}
      </select>
      <p class="prediction-model-note">The target should be the label you want to predict. This app currently focuses on classification targets.</p>
    </label>
    <label class="prepared-select-card prepared-model-card">
      <div class="iris-slider-copy">
        <span>Prediction model</span>
        <strong>${escapeHtml(modelLabel(trainingState.modelType))}</strong>
      </div>
      <select data-model-choice="true">
        <option value="decision_tree"${trainingState.modelType === "decision_tree" ? " selected" : ""}>Decision tree</option>
        <option value="random_forest"${trainingState.modelType === "random_forest" ? " selected" : ""}>Random forest</option>
        <option value="nearest_neighbor"${trainingState.modelType === "nearest_neighbor" ? " selected" : ""}>Nearest neighbor</option>
      </select>
      <p class="prediction-model-note">${escapeHtml(modelDescription(trainingState.modelType))}</p>
    </label>
    <label class="prepared-select-card prepared-model-card">
      <div class="iris-slider-copy">
        <span>Test split</span>
        <strong>${Math.round(trainingState.testRatio * 100)}%</strong>
      </div>
      <select data-test-ratio="true">
        <option value="0.2"${trainingState.testRatio === 0.2 ? " selected" : ""}>20% test</option>
        <option value="0.25"${trainingState.testRatio === 0.25 ? " selected" : ""}>25% test</option>
        <option value="0.3"${trainingState.testRatio === 0.3 ? " selected" : ""}>30% test</option>
      </select>
      <p class="prediction-model-note">A held-out test split gives a simple accuracy estimate on data the model did not train on.</p>
    </label>
    <div class="prepared-select-card prepared-model-card">
      <div class="iris-slider-copy">
        <span>Predictor columns</span>
        <strong>${selectedFeatureColumns.length} selected</strong>
      </div>
      <div class="feature-picker-grid">
        ${availableFeatureColumns
          .map(
            (feature) => `
              <label class="feature-toggle">
                <input type="checkbox" data-feature-toggle="${escapeHtml(feature)}"${selectedFeatureColumns.includes(feature) ? " checked" : ""} />
                <span>${escapeHtml(feature)}</span>
              </label>
            `,
          )
          .join("")}
      </div>
      <p class="prediction-model-note">Choose which columns the model can learn from. This lets people test how the prediction changes when different inputs are included.</p>
    </div>
    <div class="summary-tags">${selectedFeatureColumns.map((feature) => `<span class="summary-tag">${escapeHtml(feature)}</span>`).join("")}</div>
    <div class="prediction-form-actions">
      <button type="button" data-train-model="true">Train model</button>
    </div>
    ${trainedModel ? renderDynamicPredictionInputs(trainedModel) : ""}
  `;

  if (!trainedModel) {
    elements.predictionResult.innerHTML = `
      <h3>Train to start predicting</h3>
      <p>The app will use <strong>${escapeHtml(selectedFeatureColumns.length.toString())}</strong> selected predictor${selectedFeatureColumns.length === 1 ? "" : "s"} from the current dataset and report test accuracy after training.</p>
    `;
    elements.predictionViz.innerHTML = emptyState("No prediction yet", "Train a model to see probabilities, explanations, and nearby examples.");
    return;
  }

  updatePredictionLab();
}

function renderDynamicPredictionInputs(trainedModel) {
  return `
    <div class="prediction-form-heading">
      <h3>Predict a new row</h3>
      <p>Adjust the generated inputs below. The prediction updates live from the trained model.</p>
    </div>
    ${trainedModel.featureNames.map((feature) => renderPreparedControl(trainedModel, feature)).join("")}
    <div class="prediction-form-actions">
      <button type="button" data-save-prediction="true">Save prediction</button>
      <button
        type="button"
        class="prediction-secondary-button"
        data-reset-prediction-inputs="true"
        data-reset-flower="true"
      >
        Reset prediction inputs
      </button>
    </div>
  `;
}

function initializePreparedState() {
  const trainedModel = state.modelTraining?.trainedModel;
  if (!trainedModel) {
    state.modelTraining.inputValues = {};
    state.livePrediction = null;
    return;
  }
  state.modelTraining.inputValues = Object.fromEntries(
    trainedModel.featureNames.map((feature) => [feature, trainedModel.schema[feature].default]),
  );
  state.livePrediction = null;
}

function getPreparedDatasetOptions() {
  return [];
}

function getCurrentPreparedDataset() {
  return state.modelTraining?.trainedModel || null;
}

function getCurrentPreparedModel() {
  return state.modelTraining?.trainedModel || null;
}

function renderPreparedControl(model, feature) {
  const schema = model.schema[feature];
  const value = state.modelTraining.inputValues[feature];
  if (schema.kind === "numeric") {
    return `
      <label class="iris-slider-card">
        <div class="iris-slider-copy">
          <span>${escapeHtml(titleCase(schema.label))}</span>
          <strong id="${escapeHtml(`${feature}Value`)}">${formatControlValue(schema.kind, value)}</strong>
        </div>
        <input type="range" min="${schema.min}" max="${schema.max}" step="${schema.step}" value="${value}" data-model-feature="${escapeHtml(feature)}" />
        <div class="iris-slider-range">
          <span>${formatSliderValue(schema.min)}</span>
          <span>${formatSliderValue(schema.max)}</span>
        </div>
      </label>
    `;
  }

  return `
    <label class="prepared-select-card">
      <div class="iris-slider-copy">
        <span>${escapeHtml(titleCase(schema.label))}</span>
      </div>
      <select data-model-feature="${escapeHtml(feature)}">
        ${schema.options
          .map((option) => `<option value="${escapeHtml(option)}"${option === value ? " selected" : ""}>${escapeHtml(titleCase(option.replaceAll("_", " ")))}</option>`)
          .join("")}
      </select>
    </label>
  `;
}

function updatePreparedFeatureValue(control) {
  const feature = control.dataset.modelFeature;
  if (!feature) return;
  if (control.type === "range") {
    state.modelTraining.inputValues[feature] = Number(control.value);
  } else {
    state.modelTraining.inputValues[feature] = control.value;
  }
}

function syncPreparedFeatureValue(control) {
  const feature = control.dataset.modelFeature;
  if (!feature) return;
  const trainedModel = state.modelTraining.trainedModel;
  const schema = trainedModel?.schema?.[feature];
  const output = document.querySelector(`#${CSS.escape(`${feature}Value`)}`);
  if (!output || !schema) return;
  output.textContent = formatControlValue(schema.kind, state.modelTraining.inputValues[feature]);
}

function resetPreparedInputs() {
  const trainedModel = state.modelTraining?.trainedModel;
  initializePreparedState();

  if (!trainedModel) {
    renderPredictionWorkflow();
    return;
  }

  syncPredictionInputsFromState(trainedModel);
  updatePredictionLab();
}

// Keep the live form controls in sync with the reset/default values without
// depending on a full rerender of the prediction workflow.
function syncPredictionInputsFromState(trainedModel) {
  trainedModel.featureNames.forEach((feature) => {
    const schema = trainedModel.schema[feature];
    const selectorValue = window.CSS?.escape ? CSS.escape(feature) : feature.replace(/"/g, '\\"');
    const control = elements.predictionForm.querySelector(`[data-model-feature="${selectorValue}"]`);
    if (!control || !schema) return;

    const value = state.modelTraining.inputValues[feature];
    if (control.tagName === "SELECT") {
      control.value = String(value);
    } else if (control.type === "range") {
      control.value = Number(value);
    }

    syncPreparedFeatureValue(control);
  });
}

function updatePredictionLab() {
  const trainedModel = state.modelTraining.trainedModel;
  if (!trainedModel) return;
  const prediction = buildPreparedPrediction(state.modelTraining.inputValues, trainedModel, trainedModel);
  state.livePrediction = prediction;
  elements.predictionResult.innerHTML = renderPreparedPredictionResult(prediction, trainedModel, trainedModel);
  elements.predictionViz.innerHTML = renderPreparedPredictionVisualization(prediction, trainedModel);
  render();
}

function saveCurrentPrediction() {
  const trainedModel = state.modelTraining.trainedModel;
  if (!trainedModel || !state.livePrediction) return;
  const predictionId = addSavedPrediction(state.livePrediction);
  elements.predictionResult.innerHTML = renderPreparedPredictionResult(state.livePrediction, trainedModel, trainedModel, predictionId);
  render();
}

function addSavedPrediction(prediction) {
  const predictionId = `prediction-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
  state.predictedPoints.unshift({
    id: predictionId,
    datasetKey: state.name,
    modelKey: prediction.modelKey,
    label: prediction.predictedLabel,
    features: { ...prediction.point },
    closestLabel: prediction.closestLabel,
    explanation: prediction.explanation,
  });
  return predictionId;
}

function trainCurrentModel() {
  try {
    const trainedModel = trainModelFromCurrentDataset();
    state.modelTraining.trainedModel = trainedModel;
    initializePreparedState();
    state.predictedPoints = [];
    renderMachineLearningReport();
    renderPredictionWorkflow();
  } catch (error) {
    renderMachineLearningError(error.message || "Could not train the selected model.");
    elements.predictionResult.innerHTML = `<h3>Training did not complete</h3><p>${escapeHtml(error.message || "Could not train the selected model.")}</p>`;
    elements.predictionViz.innerHTML = "";
  }
}

function trainModelFromCurrentDataset() {
  const targetColumn = state.modelTraining.targetColumn;
  if (!targetColumn) throw new Error("Choose a target column before training.");

  const featureNames = getSelectedFeatureCandidates(targetColumn);
  if (!featureNames.length) throw new Error("Choose at least one predictor column before training.");

  const dataset = buildTrainingDataset(targetColumn, featureNames);
  if (dataset.classes.length < 2) throw new Error("The selected target needs at least two classes.");
  if (dataset.rows.length < 12) throw new Error("The dataset is too small for a meaningful train/test split.");

  const split = stratifiedTrainTestSplit(dataset.rows, state.modelTraining.testRatio, dataset.classes);
  if (!split.train.length || !split.test.length) throw new Error("Could not create a train/test split from this dataset.");

  const trainedEstimator = trainEstimator(state.modelTraining.modelType, split.train, dataset);
  const evaluation = evaluateEstimator(trainedEstimator, split.test, dataset.classes);

  return {
    key: state.modelTraining.modelType,
    kind: state.modelTraining.modelType,
    modelLabel: modelLabel(state.modelTraining.modelType),
    whyChoose: modelDescription(state.modelTraining.modelType),
    metricLabel: "Test accuracy",
    metricValue: evaluation.accuracy,
    metricDisplay: `${(evaluation.accuracy * 100).toFixed(1)}%`,
    resultSummary: `${modelLabel(state.modelTraining.modelType)} predicts ${predictionTargetLabel(targetColumn)} with ${(evaluation.accuracy * 100).toFixed(1)}% accuracy on the held-out test split.`,
    target: targetColumn,
    targetColumn,
    target_label: targetColumn,
    classes: dataset.classes,
    featureNames,
    schema: dataset.schema,
    trainRows: split.train,
    testRows: split.test,
    estimator: trainedEstimator,
    visualization: {
      x_feature: dataset.numericFeatureNames[0] || featureNames[0],
      y_feature: dataset.numericFeatureNames[1] || dataset.numericFeatureNames[0] || featureNames[0],
      title: "Nearest training rows",
      subtitle: "The cards below show the closest rows in the training set for the current prediction input.",
    },
    intro: {
      title: `Predict ${predictionTargetLabel(targetColumn)}`,
      control_copy: `This model uses ${featureNames.length} feature${featureNames.length === 1 ? "" : "s"} from the currently loaded dataset.`,
      save_label: "Save prediction",
    },
    entity_label: "row",
    tree: trainedEstimator.tree || null,
    trees: trainedEstimator.trees || null,
    k: trainedEstimator.k || null,
  };
}

function getPredictionTargetCandidates() {
  const candidates = state.profile
    .filter((column) => {
      const values = state.rows.map((row) => normalizeCategory(row[column.name])).filter((value) => value !== "__missing__");
      const distinct = [...new Set(values)];
      return distinct.length >= 2 && distinct.length <= 12;
    })
    .map((column) => column.name);
  const preferredTarget = getPreferredTargetColumn(candidates);
  if (!preferredTarget) return candidates;
  return [preferredTarget, ...candidates.filter((column) => column !== preferredTarget)];
}

function getAvailableFeatureCandidates(targetColumn) {
  return state.profile
    .filter((column) => column.name !== targetColumn)
    .filter((column) => {
      const values = state.rows.map((row) => stringifyCell(row[column.name]).trim()).filter(Boolean);
      return new Set(values).size >= 2;
    })
    .filter((column) => column.type === "number" || distinctCategoryCount(column.name) <= 18)
    .map((column) => column.name);
}

function getSelectedFeatureCandidates(targetColumn) {
  const available = getAvailableFeatureCandidates(targetColumn);
  const selected = state.modelTraining.selectedFeatureColumns.filter((feature) => available.includes(feature));
  return selected.length ? selected : available;
}

function syncSelectedFeatureColumns(resetSelection) {
  const available = getAvailableFeatureCandidates(state.modelTraining.targetColumn);
  if (resetSelection || !state.modelTraining.selectedFeatureColumns.length) {
    state.modelTraining.selectedFeatureColumns = [...available];
    return;
  }

  const nextSelection = state.modelTraining.selectedFeatureColumns.filter((feature) => available.includes(feature));
  state.modelTraining.selectedFeatureColumns = nextSelection.length ? nextSelection : [...available];
}

function updateSelectedFeatureColumns(control) {
  const feature = control.dataset.featureToggle;
  if (!feature) return;
  const current = new Set(state.modelTraining.selectedFeatureColumns);
  if (control.checked) {
    current.add(feature);
  } else if (current.size > 1) {
    current.delete(feature);
  } else {
    control.checked = true;
  }
  state.modelTraining.selectedFeatureColumns = [...current];
}

function distinctCategoryCount(columnName) {
  return new Set(state.rows.map((row) => normalizeCategory(row[columnName]))).size;
}

function buildTrainingDataset(targetColumn, featureNames) {
  const schema = {};
  const numericFeatureNames = [];

  featureNames.forEach((feature) => {
    if (isNumericColumn(feature)) {
      const values = state.rows
        .map((row) => Number(String(row[feature]).replaceAll(",", "")))
        .filter(Number.isFinite)
        .sort((a, b) => a - b);
      const medianValue = values.length ? median(values) : 0;
      const min = values.length ? values[0] : 0;
      const max = values.length ? values[values.length - 1] : min + 1;
      schema[feature] = {
        kind: "numeric",
        label: feature.replaceAll("_", " "),
        default: roundNumber(medianValue),
        min: roundNumber(min),
        max: roundNumber(max === min ? min + 1 : max),
        step: 0.1,
        median: medianValue,
        range: max - min || 1,
      };
      numericFeatureNames.push(feature);
      return;
    }

    const options = unique(state.rows.map((row) => normalizeCategory(row[feature]))).filter((value) => value !== "__missing__");
    const fallback = options[0] || "__missing__";
    schema[feature] = {
      kind: "categorical",
      label: feature.replaceAll("_", " "),
      default: fallback,
      options: options.length ? options : [fallback],
    };
  });

  const classOrder = [];
  const rows = state.rows
    .map((row) => {
      const label = normalizeCategory(row[targetColumn]);
      if (label === "__missing__") return null;
      if (!classOrder.includes(label)) classOrder.push(label);
      const features = {};
      const distanceFeatures = {};

      featureNames.forEach((feature) => {
        const config = schema[feature];
        if (config.kind === "numeric") {
          const value = Number(String(row[feature]).replaceAll(",", ""));
          const numericValue = Number.isFinite(value) ? value : config.median;
          features[feature] = numericValue;
          distanceFeatures[feature] = (numericValue - config.median) / config.range;
        } else {
          const categoryValue = normalizeCategory(row[feature]);
          const normalizedValue = config.options.includes(categoryValue) ? categoryValue : config.default;
          features[feature] = normalizedValue;
          distanceFeatures[feature] = normalizedValue;
        }
      });

      return {
        features,
        distanceFeatures,
        label,
        rawRow: row,
      };
    })
    .filter(Boolean);

  return {
    rows,
    classes: classOrder,
    schema,
    featureNames,
    numericFeatureNames,
  };
}

function stratifiedTrainTestSplit(rows, ratio, classes) {
  const rng = seededRandom(42);
  const train = [];
  const test = [];

  classes.forEach((label) => {
    const group = rows.filter((row) => row.label === label);
    shuffleInPlace(group, rng);
    const tentativeTest = Math.round(group.length * ratio);
    const testCount = group.length <= 2 ? 1 : Math.min(Math.max(tentativeTest, 1), group.length - 1);
    test.push(...group.slice(0, testCount));
    train.push(...group.slice(testCount));
  });

  shuffleInPlace(train, rng);
  shuffleInPlace(test, rng);
  return { train, test };
}

function trainEstimator(modelType, trainRows, dataset) {
  if (modelType === "decision_tree") {
    return trainDecisionTreeModel(trainRows, dataset, {
      maxDepth: 5,
      minSamplesLeaf: 3,
      featureSubsetSize: dataset.featureNames.length,
    });
  }
  if (modelType === "random_forest") {
    return trainRandomForestModel(trainRows, dataset);
  }
  return trainNearestNeighborModel(trainRows, dataset);
}

function trainDecisionTreeModel(trainRows, dataset, options) {
  return {
    kind: "decision_tree",
    tree: buildDecisionTree(trainRows, dataset, 0, options),
  };
}

function trainRandomForestModel(trainRows, dataset) {
  const treeCount = 15;
  const featureSubsetSize = Math.max(1, Math.floor(Math.sqrt(dataset.featureNames.length)));
  const rng = seededRandom(7);
  const trees = Array.from({ length: treeCount }, () => {
    const bootstrap = Array.from({ length: trainRows.length }, () => trainRows[Math.floor(rng() * trainRows.length)]);
    return buildDecisionTree(bootstrap, dataset, 0, {
      maxDepth: 6,
      minSamplesLeaf: 3,
      featureSubsetSize,
      random: rng,
    });
  });

  return {
    kind: "random_forest",
    trees,
    featureScores: summarizeForestFeatureUsage(trees),
  };
}

function trainNearestNeighborModel(trainRows, dataset) {
  return {
    kind: "nearest_neighbor",
    k: Math.min(7, Math.max(3, Math.floor(Math.sqrt(trainRows.length)) | 1)),
    trainingRows: trainRows,
  };
}

function buildDecisionTree(rows, dataset, depth, options) {
  const counts = classCounts(rows, dataset.classes);
  const predictedLabel = dataset.classes[counts.indexOf(Math.max(...counts))];
  const impurity = giniImpurity(counts);

  if (
    depth >= options.maxDepth ||
    rows.length <= options.minSamplesLeaf * 2 ||
    impurity === 0
  ) {
    return createLeafNode(counts, predictedLabel, rows.length);
  }

  const candidateFeatures = chooseFeatureSubset(dataset.featureNames, options.featureSubsetSize, options.random);
  let bestSplit = null;

  candidateFeatures.forEach((feature) => {
    const schema = dataset.schema[feature];
    const candidates =
      schema.kind === "numeric"
        ? numericSplitCandidates(rows, feature)
        : categoricalSplitCandidates(rows, feature);

    candidates.forEach((candidate) => {
      const split = splitRows(rows, feature, schema.kind, candidate);
      if (!split.left.length || !split.right.length) return;
      if (split.left.length < options.minSamplesLeaf || split.right.length < options.minSamplesLeaf) return;
      const score = weightedImpurity(split.left, split.right, dataset.classes);
      if (!bestSplit || score < bestSplit.score) {
        bestSplit = { feature, kind: schema.kind, candidate, score, left: split.left, right: split.right };
      }
    });
  });

  if (!bestSplit || bestSplit.score >= impurity) {
    return createLeafNode(counts, predictedLabel, rows.length);
  }

  return {
    kind: bestSplit.kind,
    feature: bestSplit.feature,
    threshold: bestSplit.kind === "numeric" ? bestSplit.candidate : undefined,
    category: bestSplit.kind === "categorical" ? bestSplit.candidate : undefined,
    counts,
    size: rows.length,
    left: buildDecisionTree(bestSplit.left, dataset, depth + 1, options),
    right: buildDecisionTree(bestSplit.right, dataset, depth + 1, options),
  };
}

function createLeafNode(counts, predictedLabel, size) {
  return {
    kind: "leaf",
    counts,
    predictedLabel,
    size,
  };
}

function chooseFeatureSubset(featureNames, subsetSize, random) {
  if (subsetSize >= featureNames.length) return featureNames;
  const rng = random || seededRandom(99);
  const pool = [...featureNames];
  shuffleInPlace(pool, rng);
  return pool.slice(0, subsetSize);
}

function numericSplitCandidates(rows, feature) {
  const values = [...new Set(rows.map((row) => row.features[feature]).filter(Number.isFinite))].sort((a, b) => a - b);
  if (values.length <= 1) return [];
  if (values.length > 12) {
    return ticks(1, values.length - 2, 8).map((index) => {
      const low = values[Math.floor(index)];
      const high = values[Math.min(Math.floor(index) + 1, values.length - 1)];
      return (low + high) / 2;
    });
  }
  return values.slice(0, -1).map((value, index) => (value + values[index + 1]) / 2);
}

function categoricalSplitCandidates(rows, feature) {
  return [...new Set(rows.map((row) => row.features[feature]))].slice(0, 12);
}

function splitRows(rows, feature, kind, candidate) {
  if (kind === "numeric") {
    return {
      left: rows.filter((row) => row.features[feature] <= candidate),
      right: rows.filter((row) => row.features[feature] > candidate),
    };
  }

  return {
    left: rows.filter((row) => row.features[feature] === candidate),
    right: rows.filter((row) => row.features[feature] !== candidate),
  };
}

function weightedImpurity(leftRows, rightRows, classes) {
  const total = leftRows.length + rightRows.length;
  return (
    (leftRows.length / total) * giniImpurity(classCounts(leftRows, classes)) +
    (rightRows.length / total) * giniImpurity(classCounts(rightRows, classes))
  );
}

function classCounts(rows, classes) {
  return classes.map((label) => rows.filter((row) => row.label === label).length);
}

function giniImpurity(counts) {
  const total = counts.reduce((sum, value) => sum + value, 0);
  if (!total) return 0;
  return 1 - counts.reduce((sum, value) => sum + (value / total) ** 2, 0);
}

function evaluateEstimator(estimator, testRows, classes) {
  const predictions = testRows.map((row) => predictWithEstimator(estimator, row.features, row.distanceFeatures, classes));
  const correct = predictions.filter((prediction, index) => prediction.label === testRows[index].label).length;
  return {
    accuracy: correct / Math.max(testRows.length, 1),
  };
}

function predictWithEstimator(estimator, features, distanceFeatures, classes) {
  if (estimator.kind === "decision_tree") {
    const leaf = traverseDecisionTree(estimator.tree, features);
    return normalizePredictionScores(leaf.counts, classes);
  }

  if (estimator.kind === "random_forest") {
    const totals = new Array(classes.length).fill(0);
    estimator.trees.forEach((tree) => {
      const leaf = traverseDecisionTree(tree, features);
      const normalized = normalizeScoreArray(leaf.counts);
      normalized.forEach((value, index) => {
        totals[index] += value;
      });
    });
    return normalizePredictionScores(totals.map((value) => value / estimator.trees.length), classes);
  }

  const nearest = [...estimator.trainingRows]
    .map((row) => ({
      label: row.label,
      distance: predictionDistance(distanceFeatures, row.distanceFeatures, features, row.features),
    }))
    .sort((a, b) => a.distance - b.distance)
    .slice(0, estimator.k);
  const counts = classes.map((label) => nearest.filter((row) => row.label === label).length);
  return normalizePredictionScores(counts, classes);
}

function traverseDecisionTree(node, features) {
  if (!node || node.kind === "leaf") return node;
  if (node.kind === "numeric") {
    return traverseDecisionTree(features[node.feature] <= node.threshold ? node.left : node.right, features);
  }
  return traverseDecisionTree(features[node.feature] === node.category ? node.left : node.right, features);
}

function normalizePredictionScores(scores, classes) {
  const total = scores.reduce((sum, value) => sum + value, 0) || 1;
  return classes
    .map((label, index) => ({
      label: titleCase(label),
      rawLabel: label,
      probability: scores[index] / total,
    }))
    .sort((left, right) => right.probability - left.probability);
}

function normalizeScoreArray(scores) {
  const total = scores.reduce((sum, value) => sum + value, 0) || 1;
  return scores.map((value) => value / total);
}

function predictionDistance(leftDistanceFeatures, rightDistanceFeatures, leftRawFeatures, rightRawFeatures) {
  return Math.sqrt(
    Object.keys(leftDistanceFeatures).reduce((sum, feature) => {
      const leftValue = leftDistanceFeatures[feature];
      const rightValue = rightDistanceFeatures[feature];
      if (typeof leftValue === "number" && typeof rightValue === "number") {
        return sum + (leftValue - rightValue) ** 2;
      }
      return sum + (leftRawFeatures[feature] === rightRawFeatures[feature] ? 0 : 1);
    }, 0),
  );
}

function summarizeForestFeatureUsage(trees) {
  const counts = {};
  trees.forEach((tree) => {
    collectTreeFeatures(tree, counts);
  });
  return counts;
}

function collectTreeFeatures(node, counts) {
  if (!node || node.kind === "leaf") return;
  counts[node.feature] = (counts[node.feature] || 0) + 1;
  collectTreeFeatures(node.left, counts);
  collectTreeFeatures(node.right, counts);
}

function buildPreparedPrediction(point, datasetModel, modelChoice) {
  const processed = preparePredictionPoint(point, datasetModel.schema, datasetModel.featureNames);
  const probabilities = predictWithEstimator(datasetModel.estimator, processed.features, processed.distanceFeatures, datasetModel.classes);
  const predicted = probabilities[0];
  const nearestSamples = findNearestTrainingRows(processed, datasetModel, 5);
  const closestLabel = nearestSamples[0]?.label || predicted.rawLabel;

  return {
    datasetKey: state.name,
    modelKey: datasetModel.kind,
    point: { ...point },
    predictedLabel: predicted.rawLabel,
    probabilities,
    explanation: explainPreparedPrediction(datasetModel, predicted.rawLabel, nearestSamples),
    confidenceNote: describeConfidenceShift(probabilities, datasetModel.modelLabel),
    nearestSamples,
    closestLabel,
    nearestDistance: nearestSamples[0]?.distance ?? 0,
  };
}

function preparePredictionPoint(point, schema, featureNames) {
  const features = {};
  const distanceFeatures = {};

  featureNames.forEach((feature) => {
    const config = schema[feature];
    if (config.kind === "numeric") {
      const value = Number(point[feature]);
      const numericValue = Number.isFinite(value) ? value : config.median;
      features[feature] = numericValue;
      distanceFeatures[feature] = (numericValue - config.median) / config.range;
      return;
    }
    const categoryValue = normalizeCategory(point[feature]);
    const normalizedValue = config.options.includes(categoryValue) ? categoryValue : config.default;
    features[feature] = normalizedValue;
    distanceFeatures[feature] = normalizedValue;
  });

  return { features, distanceFeatures };
}

function findNearestTrainingRows(processedPoint, trainedModel, count) {
  return trainedModel.trainRows
    .map((row) => ({
      ...row,
      distance: predictionDistance(processedPoint.distanceFeatures, row.distanceFeatures, processedPoint.features, row.features),
    }))
    .sort((left, right) => left.distance - right.distance)
    .slice(0, count);
}

function explainPreparedPrediction(modelChoice, predictedLabel, nearestSamples) {
  if (modelChoice.kind === "decision_tree") {
    return `The decision tree followed a small set of feature rules and landed on ${titleCase(predictedLabel)}.`;
  }
  if (modelChoice.kind === "random_forest") {
    const topFeatures = Object.entries(modelChoice.estimator.featureScores || {})
      .sort((left, right) => right[1] - left[1])
      .slice(0, 3)
      .map(([feature]) => formatFeatureLabel(feature));
    return `${topFeatures.join(", ")} shaped many of the tree votes, so the forest leaned toward ${titleCase(predictedLabel)}.`;
  }
  const support = nearestSamples.filter((sample) => sample.label === predictedLabel).length;
  return `Nearest neighbor compared this input to the most similar training rows. ${support} of the closest rows voted for ${titleCase(predictedLabel)}.`;
}

function describeProbabilitySource(modelChoice) {
  if (modelChoice.kind === "decision_tree") {
    return "The probability bars come from the class mix in the tree leaf reached by the input.";
  }
  if (modelChoice.kind === "random_forest") {
    return "The probability bars come from averaging the class probabilities across the forest's trees.";
  }
  return `The probability bars come from the vote split across the ${modelChoice.estimator.k} nearest training rows.`;
}

function renderPreparedPredictionResult(prediction, datasetModel, modelChoice, savedPredictionId) {
  const canShowPrediction = canPlotPredictionOnCurrentChart();
  return `
    <div class="prediction-species-card prediction-species-${cssSpeciesClass(prediction.predictedLabel)}">
      <p class="eyebrow">${escapeHtml(predictionTargetHeading(datasetModel.targetColumn))}</p>
      <h3>${escapeHtml(titleCase(prediction.predictedLabel.replaceAll("_", " ")))}</h3>
      <p>${escapeHtml(prediction.confidenceNote)}</p>
    </div>
    <div class="prediction-metrics">
      <article>
        <span>${Math.round(prediction.probabilities[0].probability * 100)}%</span>
        <p>top confidence</p>
      </article>
      <article>
        <span>${escapeHtml(datasetModel.metricDisplay)}</span>
        <p>test accuracy</p>
      </article>
      <article>
        <span>${escapeHtml(datasetModel.modelLabel)}</span>
        <p>selected model</p>
      </article>
      <article>
        <span>${prediction.nearestDistance.toFixed(2)}</span>
        <p>nearest row distance</p>
      </article>
    </div>
    <div class="probability-list">
      ${prediction.probabilities
        .map(
          (item) => `
            <div class="probability-row">
              <div class="probability-copy">
                <strong>${escapeHtml(item.label)}</strong>
                <span>${Math.round(item.probability * 100)}%</span>
              </div>
              <div class="probability-track">
                <div class="probability-fill species-${escapeHtml(cssSpeciesClass(item.rawLabel))}" style="width:${Math.max(item.probability * 100, 4)}%"></div>
              </div>
            </div>
          `,
        )
        .join("")}
    </div>
    <div class="prediction-explanation">
      <h3>Why the model chose this</h3>
      <p>${escapeHtml(prediction.explanation)}</p>
      <p>${escapeHtml(describeProbabilitySource(modelChoice))}</p>
    </div>
    ${canShowPrediction ? "" : `<button type="button" class="prediction-link-button" data-show-prediction="${escapeHtml(savedPredictionId || "")}">Show this prediction on the chart</button>`}
    ${renderSavedPredictions()}
  `;
}

function renderPreparedPredictionVisualization(prediction, model) {
  return `
    <div class="prediction-viz-copy">
      <div>
        <p class="eyebrow">${escapeHtml(model.visualization.title)}</p>
        <h3>${escapeHtml(model.intro.title)}</h3>
      </div>
      <p>${escapeHtml(model.visualization.subtitle)}</p>
    </div>
    <div class="prediction-neighbor-list">
      ${prediction.nearestSamples
        .map((sample, index) => {
          const summary = model.featureNames
            .slice(0, 4)
            .map((feature) => `${titleCase(formatFeatureLabel(feature))}: ${typeof sample.features[feature] === "number" ? formatSliderValue(sample.features[feature]) : titleCase(stringifyCell(sample.features[feature]).replaceAll("_", " "))}`)
            .join(", ");
          return `
            <article class="prediction-neighbor-item">
              <h4>Nearby row ${index + 1}: ${escapeHtml(titleCase(sample.label.replaceAll("_", " ")))}</h4>
              <p><strong>Distance:</strong> ${sample.distance.toFixed(2)}</p>
              <p>${escapeHtml(summary)}</p>
            </article>
          `;
        })
        .join("")}
    </div>
  `;
}

function showPredictionOnChart(predictionId) {
  const prediction = predictionId ? state.predictedPoints.find((item) => item.id === predictionId) : state.predictedPoints[0];
  const trainedModel = state.modelTraining.trainedModel;
  if (!prediction || !trainedModel) return;
  const xColumn = trainedModel.numericFeatureNames?.[0] || trainedModel.featureNames.find((feature) => isNumericColumn(feature)) || "";
  const yColumn = trainedModel.numericFeatureNames?.[1] || trainedModel.numericFeatureNames?.[0] || "";
  if (!xColumn || !yColumn) return;
  state.chartType = "scatter";
  state.xColumn = xColumn;
  state.yColumn = yColumn;
  if (state.columns.includes(trainedModel.targetColumn)) {
    state.groupColumn = trainedModel.targetColumn;
  }
  syncChartTypeButtons();
  syncControls();
  render();
}

function renderSavedPredictions() {
  if (!state.predictedPoints.length) {
    return `
      <div class="prediction-history">
        <h3>Saved predictions</h3>
        <p>No saved predictions yet. Train a model and save a few prediction points to compare them later.</p>
      </div>
    `;
  }

  return `
    <div class="prediction-history">
      <div class="prediction-history-header">
        <h3>Saved predictions</h3>
        <button type="button" class="prediction-text-button" data-clear-predictions="true">Clear all</button>
      </div>
      <div class="prediction-history-list">
        ${state.predictedPoints
          .map((prediction, index) => {
            const featureSummary = Object.entries(prediction.features)
              .slice(0, 4)
              .map(([feature, value]) => `${titleCase(formatFeatureLabel(feature))}: ${typeof value === "number" ? formatSliderValue(value) : titleCase(stringifyCell(value).replaceAll("_", " "))}`)
              .join(", ");
            return `
              <article class="prediction-item">
                <div class="prediction-item-copy">
                  <p class="prediction-item-title">
                    <span class="prediction-badge">${escapeHtml(titleCase(prediction.label.replaceAll("_", " ")))}</span>
                    <span>Prediction ${state.predictedPoints.length - index}</span>
                  </p>
                  <p><strong>Model:</strong> ${escapeHtml(modelLabel(prediction.modelKey))}</p>
                  <p><strong>Closest nearby label:</strong> ${escapeHtml(titleCase(stringifyCell(prediction.closestLabel).replaceAll("_", " ")))}</p>
                  <p><strong>Input:</strong> ${escapeHtml(featureSummary)}</p>
                  <p>${escapeHtml(truncate(prediction.explanation || "", 140))}</p>
                </div>
                <div class="prediction-item-actions">
                  <button type="button" class="prediction-text-button" data-show-prediction="${escapeHtml(prediction.id)}">Show on chart</button>
                  <button type="button" class="prediction-text-button is-danger" data-remove-prediction="${escapeHtml(prediction.id)}">Remove</button>
                </div>
              </article>
            `;
          })
          .join("")}
      </div>
    </div>
  `;
}

function loadRows(name, parsed, sampleKey, modelKey) {
  if (!parsed.length) {
    clearDataset();
    elements.loadError.textContent = "The selected file does not contain readable rows.";
    return;
  }

  state.name = name;
  state.rows = parsed;
  state.columns = Object.keys(parsed[0] || {});
  state.profile = profileColumns(state.rows, state.columns);
  state.numericColumns = state.profile.filter((column) => column.type === "number").map((column) => column.name);
  state.categoricalColumns = state.profile.filter((column) => column.type !== "number").map((column) => column.name);
  state.filterColumn = "";
  state.filterValue = "__all__";
  state.search = "";
  state.activeSample = detectDatasetTheme(name, parsed);
  state.predictedPoints = [];
  const targetCandidates = getPredictionTargetCandidates();
  state.modelTraining = {
    ...createEmptyModelTrainingState(),
    targetColumn: getPreferredTargetColumn(targetCandidates) || targetCandidates[0] || "",
  };
  syncSelectedFeatureColumns(true);
  elements.searchInput.value = "";

  chooseDefaults(true);
  renderControls();
  updateQueryExamples();
  renderMachineLearningReport();
  renderPredictionWorkflow();
  render();
}

function clearDataset() {
  state.name = "";
  state.rows = [];
  state.columns = [];
  state.profile = [];
  state.numericColumns = [];
  state.categoricalColumns = [];
  state.filterColumn = "";
  state.filterValue = "__all__";
  state.search = "";
  state.activeSample = "";
  state.predictedPoints = [];
  state.modelTraining = createEmptyModelTrainingState();
  state.livePrediction = null;
  elements.searchInput.value = "";
  renderControls();
  updateQueryExamples();
  renderMachineLearningReport();
  renderPredictionWorkflow();
  setEmptyState();
  updateCounters(0);
}

function modelLabel(modelType) {
  return {
    decision_tree: "Decision tree",
    random_forest: "Random forest",
    nearest_neighbor: "Nearest neighbor",
  }[modelType] || "Model";
}

function modelDescription(modelType) {
  return {
    decision_tree: "A small tree learns readable if/then split rules from the dataset.",
    random_forest: "A forest averages many trees so one noisy split does not decide everything.",
    nearest_neighbor: "This model predicts from the most similar training rows in feature space.",
  }[modelType] || "Train a model from this dataset.";
}

function roundNumber(value) {
  return Math.round(value * 100) / 100;
}

function seededRandom(seed) {
  let value = seed >>> 0;
  return function next() {
    value += 0x6d2b79f5;
    let result = value;
    result = Math.imul(result ^ (result >>> 15), result | 1);
    result ^= result + Math.imul(result ^ (result >>> 7), result | 61);
    return ((result ^ (result >>> 14)) >>> 0) / 4294967296;
  };
}

function shuffleInPlace(values, random) {
  for (let index = values.length - 1; index > 0; index -= 1) {
    const swapIndex = Math.floor(random() * (index + 1));
    [values[index], values[swapIndex]] = [values[swapIndex], values[index]];
  }
}
