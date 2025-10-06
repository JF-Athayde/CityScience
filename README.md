# 🌍 City Science — Intelligent Environmental & Urban Data Platform

### Summary

**City Science** is a versatile data platform that transforms complex environmental and urban information into **actionable insights**.  
It automates the **integration, analysis, and visualization** of data from multiple sources — including climate, infrastructure, and sustainability indicators — to generate **customized, interactive technical bulletins** for diverse urban challenges.

By translating raw data into clear, decision-oriented outputs, the system bridges the critical gap between environmental information and its **practical application**.  
Users can easily obtain structured assessments and visual reports that support **planning, risk management, and policy development**.

---

## 🚀 Project Objectives

- Convert complex environmental and urban data into intuitive, interactive visual bulletins.
- Support sustainable development, resilience, and informed decision-making.
- Automate technical report generation (HTML/PDF) using AI-based analysis and visualization.
- Standardize environmental indicators for easier comparison and reproducibility.

---

## 🧠 Problem Background

### Urban Sustainability Challenges

| Key Issue | Description |
|------------|-------------|
| **Greenhouse Gas Emissions** | Transport contributes ~29% of total CO₂e emissions in the U.S. (EPA, 2022). Light-duty and heavy-duty vehicles dominate emissions. |
| **Land-Use Conversion** | Urban expansion drives habitat fragmentation and biodiversity loss, with >300,000 km² of projected natural habitat loss under SSP5 scenarios (Nature). |
| **Air Pollution** | Outdoor pollution causes ~7 million premature deaths per year globally (WHO). |
| **Urban Sprawl** | Disordered urban growth amplifies per-capita emissions and resource pressure. |

### Human & Economic Impact

- **Health:** Increased cardiovascular, respiratory, and cognitive risks.
- **Safety:** Higher flood, landslide, and infrastructure failure risks.
- **Economics:** Climate-related disasters push ~26 million people into poverty yearly (World Bank).

---

## 🧩 Project-Level Solution

### Geotechnical Risk Analytics → Safer, More Resilient Cities
- Maps slope stability, soil moisture, and rainfall to estimate **landslide probability**.  
- Supports **targeted mitigation** (drainage, retaining walls, early warning).  
- Reduces emergency response costs and casualties.

### LEED-Style Sustainability Reports → Greener Urban Environments
- Automates **resource-efficiency diagnostics** (energy, water, materials).  
- Identifies retrofit opportunities and improves **building performance**.  
- Supports health and productivity gains for occupants.

### From Raw Data to Actionable Insight
- Integrates **satellite, sensor, and cadastral** data into a unified pipeline.  
- Produces downloadable HTML/PDF bulletins and dashboards.  
- Enables **evidence-based** planning and design.

---

## 🤖 Role of Statistics & Artificial Intelligence

| Method | Application |
|--------|--------------|
| **Predictive Analytics** | Estimate landslide probability from rainfall, soil, and terrain data using logistic regression, random forests, and Bayesian networks. |
| **Pattern Recognition** | Identify hidden drivers of urban vulnerability (e.g., impervious cover + socioeconomic factors + heat). |
| **Optimization Algorithms** | Suggest energy-efficient design parameters using constrained optimization and genetic algorithms. |

### Documented Benefits
- **Risk Reduction:** Early-warning systems cut response costs and casualties.  
- **Health Gains:** Spatial interventions improve air quality and reduce morbidity.

---

## 💻 System Features

- Flask-based backend for API integration and web rendering.
- Automated environmental bulletin generator (HTML + Chart.js).
- Real-time weather and forecast integration.
- Dynamic geospatial map with **Leaflet.js**.
- Responsive design with integrated data visualization.

---

## 🧰 Technologies Used

| Category | Tools |
|-----------|-------|
| **Backend** | Python, Flask |
| **Frontend** | HTML5, CSS3, Chart.js, Leaflet.js |
| **APIs** | OpenWeatherMap, Geocoding API |
| **Data Handling** | Requests, JSON |
| **Visualization** | Chart.js (inline), dynamic canvases (910×300 px fixed) |

---

## ⚙️ Installation

1️⃣ Clone the repository:
```bash
git clone https://github.com/your-username/city-science.git
cd city-science

python -m venv venv
source venv/bin/activate    # (Linux/Mac)
venv\Scripts\activate       # (Windows)

pip install -r requirements.txt

flask run

