import { median, quantile, stringifyCell, unique } from "./utils.js";

export function profileColumns(rows, columns) {
  return columns.map((name) => {
    const values = rows.map((row) => row[name]).filter((value) => stringifyCell(value) !== "");
    const numericValues = values.filter((value) => typeof value === "number" && Number.isFinite(value));

    return {
      name,
      type: values.length && numericValues.length / values.length > 0.8 ? "number" : "category",
      filled: values.length,
      unique: unique(values.map(stringifyCell)).length,
    };
  });
}

export function getVisibleRows(rows, columns, filterColumn, filterValue, search) {
  return rows.filter((row) => {
    const filterMatches =
      !filterColumn || filterValue === "__all__" || stringifyCell(row[filterColumn]) === filterValue;
    const searchMatches =
      !search || columns.some((column) => stringifyCell(row[column]).toLowerCase().includes(search));
    return filterMatches && searchMatches;
  });
}

export function rowsWithNumeric(rows, column) {
  return rows.filter((row) => typeof row[column] === "number" && Number.isFinite(row[column]));
}

export function aggregateRows(rows, labelColumn, valueColumn) {
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

export function aggregateForDistribution(rows, xColumn, yColumn, numericColumns) {
  if (numericColumns.includes(yColumn)) {
    const numericRows = rowsWithNumeric(rows, yColumn);
    if (numericRows.length) return aggregateRows(numericRows, xColumn, yColumn);
  }

  return Object.entries(countBy(rows, xColumn))
    .map(([label, value]) => ({ label, value }))
    .sort((a, b) => b.value - a.value);
}

export function countBy(rows, column) {
  return rows.reduce((totals, row, index) => {
    const label = stringifyCell(row[column]) || `Row ${index + 1}`;
    totals[label] = (totals[label] || 0) + 1;
    return totals;
  }, {});
}

export function groupedValues(rows, labelColumn, valueColumn) {
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

export function boxStats(values) {
  if (!values.length) return null;
  return {
    min: values[0],
    q1: quantile(values, 0.25),
    median: quantile(values, 0.5),
    q3: quantile(values, 0.75),
    max: values[values.length - 1],
  };
}

export function histogram(values, count) {
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

export function paddedExtent(rows, column) {
  const values = rows.map((row) => Number(row[column])).filter(Number.isFinite);
  if (!values.length) return [0, 1];
  const min = Math.min(...values);
  const max = Math.max(...values);
  const padding = (max - min || Math.abs(max) || 1) * 0.08;
  return [min - padding, max + padding];
}
