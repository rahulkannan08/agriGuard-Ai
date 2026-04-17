const form = document.getElementById("predict-form");
const submitBtn = document.getElementById("submit-btn");
const resultSection = document.getElementById("result");
const resultBody = document.getElementById("result-body");
const errorSection = document.getElementById("error");

function escapeHtml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function listHtml(items) {
  if (!Array.isArray(items) || items.length === 0) {
    return "<li>Not available</li>";
  }
  return items.map((item) => `<li>${escapeHtml(item)}</li>`).join("");
}

function showError(message) {
  errorSection.textContent = message;
  errorSection.classList.remove("hidden");
}

function hideError() {
  errorSection.classList.add("hidden");
}

function renderResult(data) {
  const recommendation = data.recommendation || {};

  const html = `
    <p><strong>Crop:</strong> ${escapeHtml(data.crop ?? "Unknown")}</p>
    <p><strong>Crop Category:</strong> ${escapeHtml(data.crop_category ?? "Unknown")}</p>
    <p><strong>Disease:</strong> ${escapeHtml(data.disease ?? "Unknown")}</p>
    <p><strong>Confidence:</strong> ${escapeHtml((data.confidence ?? 0).toString())}</p>
    <p><strong>Severity:</strong> ${escapeHtml(data.severity ?? "Unknown")}</p>
    <p><strong>Decision:</strong> ${escapeHtml(data.decision ?? "Unknown")}</p>
    <p><strong>Blur Score:</strong> ${escapeHtml((data.blur_score ?? "N/A").toString())}</p>
    ${data.confidence_gate_message ? `<p><strong>Note:</strong> ${escapeHtml(data.confidence_gate_message)}</p>` : ""}

    <h3>Summary</h3>
    <p>${escapeHtml(recommendation.summary ?? "Not available")}</p>

    <h3>Immediate Actions</h3>
    <ul>${listHtml(recommendation.immediate_actions)}</ul>

    <h3>Organic Treatment</h3>
    <ul>${listHtml(recommendation.organic_treatment)}</ul>

    <h3>Chemical Treatment</h3>
    <ul>${listHtml(recommendation.chemical_treatment)}</ul>

    <h3>Preventive Measures</h3>
    <ul>${listHtml(recommendation.preventive_measures)}</ul>

    <h3>Monitoring Checklist</h3>
    <ul>${listHtml(recommendation.monitoring_checklist)}</ul>

    <p><strong>Recovery Estimate:</strong> ${escapeHtml(recommendation.recovery_estimate ?? "Not available")}</p>
    <p><strong>Safety Note:</strong> ${escapeHtml(recommendation.safety_note ?? "Not available")}</p>
  `;

  resultBody.innerHTML = html;
  resultSection.classList.remove("hidden");
}

form.addEventListener("submit", async (event) => {
  event.preventDefault();
  hideError();
  resultSection.classList.add("hidden");

  const formData = new FormData(form);
  submitBtn.disabled = true;
  submitBtn.textContent = "Analyzing...";

  try {
    const response = await fetch("/predict", {
      method: "POST",
      body: formData,
    });

    const payload = await response.json();

    if (!response.ok) {
      const message = payload.details || payload.error || "Prediction failed";
      showError(message);
      return;
    }

    renderResult(payload);
  } catch (error) {
    showError(`Request failed: ${error.message}`);
  } finally {
    submitBtn.disabled = false;
    submitBtn.textContent = "Analyze Image";
  }
});
