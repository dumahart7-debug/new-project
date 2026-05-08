export function unique(values) {
  return [...new Set(values)]
    .filter((value) => value !== "")
    .sort((a, b) => String(a).localeCompare(String(b)));
}

export function stringifyCell(value) {
  return value == null ? "" : String(value);
}

export function scale(value, inputMin, inputMax, outputMin, outputMax) {
  if (inputMax === inputMin) return (outputMin + outputMax) / 2;
  return outputMin + ((value - inputMin) / (inputMax - inputMin)) * (outputMax - outputMin);
}

export function ticks(min, max, count) {
  if (count <= 1) return [min];
  const step = (max - min) / (count - 1);
  return Array.from({ length: count }, (_, index) => min + step * index);
}

export function quantile(values, q) {
  const position = (values.length - 1) * q;
  const base = Math.floor(position);
  const rest = position - base;
  return values[base + 1] === undefined ? values[base] : values[base] + rest * (values[base + 1] - values[base]);
}

export function median(values) {
  return quantile(values, 0.5);
}

export function truncate(value, length) {
  const text = stringifyCell(value);
  return text.length > length ? `${text.slice(0, length - 1)}...` : text;
}

export function formatNumber(value) {
  return new Intl.NumberFormat("en-US").format(value);
}

export function formatCompact(value) {
  return new Intl.NumberFormat("en-US", {
    maximumFractionDigits: 1,
    notation: "compact",
  }).format(value);
}

export function escapeHtml(value) {
  return stringifyCell(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

export function animateValue(selector, from, to, formatter) {
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
