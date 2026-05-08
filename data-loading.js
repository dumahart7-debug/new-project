export const sampleDatasets = {
  penguins: {
    label: "Penguins",
    path: "data/penguins_size.csv",
  },
  penguinsDetail: {
    label: "Penguins detail",
    path: "data/penguins_lter.csv",
  },
};

export function loadSampleDataset(key) {
  const sample = sampleDatasets[key];
  if (!sample) return Promise.reject(new Error("Unknown sample dataset"));

  return fetch(sample.path).then((response) => {
    if (!response.ok) throw new Error(`Could not load ${sample.path}`);
    return response.text().then((text) => ({ name: sample.label, text, sampleKey: key }));
  });
}

export function loadUploadedFile(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve({ name: file.name, text: String(reader.result), sampleKey: "" });
    reader.onerror = () => reject(new Error(`Could not read ${file.name}.`));
    reader.readAsText(file);
  });
}

export function parseCsv(text) {
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
