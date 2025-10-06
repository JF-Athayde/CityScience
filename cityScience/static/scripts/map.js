document.addEventListener('DOMContentLoaded', () => {
  if (typeof L === 'undefined') {
    console.error('Leaflet not loaded');
    return;
  }

  // --- CONFIGURAÇÕES DO MAPA E DA GERAÇÃO DE PONTOS ---
  const MIN_ZOOM = 2.5;
  const MAX_ZOOM = 15;
  const MIN_VISIBLE_POINTS = 100;
  const MAX_GENERATED_POINTS = MIN_VISIBLE_POINTS*100; // Limite 'Z' de pontos gerados para não sobrecarregar
  const map = L.map('map', {
    zoomControl: true,
    worldCopyJump: false,
    zoomAnimation: false,
    maxBounds: [[-90, -180], [90, 180]],
    maxBoundsViscosity: 0.9,
    minZoom: MIN_ZOOM,
    maxZoom: MAX_ZOOM
  }).setView([0, 0], MIN_ZOOM);

  let isPopupOpening = false;

  // --- CAMADAS DE BASE (TILES) ---
  const osm = L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    attribution: '&copy; OpenStreetMap contributors',
    noWrap: true,
    minZoom: MIN_ZOOM,
    maxZoom: MAX_ZOOM
  }).addTo(map);
  const esri = L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}', {
    attribution: 'Esri',
    noWrap: true,
    minZoom: MIN_ZOOM,
    maxZoom: MAX_ZOOM
  });
  const baseLayers = { 'Street (OSM)': osm, 'Satellite (Esri)': esri };

  // --- CAMADAS DE DADOS (OVERLAYS) ---
  const heatLayer = L.layerGroup();
  const airLayer = L.layerGroup();
  const humidityLayer = L.layerGroup();
  const uvLayer = L.layerGroup();
  const comfortLayer = L.layerGroup();
  const compositeLayer = L.layerGroup();
  const overlays = { 'Composite': compositeLayer, 'Heat': heatLayer, 'Air': airLayer, 'Humidity': humidityLayer, 'UV': uvLayer, 'Comfort': comfortLayer };
  L.control.layers(baseLayers, overlays, { collapsed: true }).addTo(map);

  // --- ÍNDICES DE DADOS E RENDERIZADOR ---
  const regionIndex = [];
  let generatedPointsIndex = []; // Array persistente para pontos gerados
  const canvasRenderer = L.canvas({ padding: 0.5 });

  // --- FUNÇÕES DE CÁLCULO E ESTILO ---
  function getColorForMetric(metric, value) {
    const v = Math.max(0, Math.min(10, Number(value) || 0));
    let n = v / 10;
    const higherWorse = { heat: true, uv: true };
    if (higherWorse[metric]) n = 1 - n;
    const hue = Math.round(120 * n);
    return `hsl(${hue},75%,45%)`;
  }

  function radiusFromComfort(comfort) {
    const p = Math.max(0, Math.min(10, Number(comfort) / 2 || 5));
    return 1 + (p * 0.15);
  }

  function computeWeightedTanh(values) {
    const w = { heat: 3, air: 5, uv: 2, comfort: 1.2 };
    const heat = Number(values.heat || 0), air = Number(values.air || 0), uv = Number(values.uv || 0), comfort = Number(values.comfort || 0);
    const sumW = w.heat + w.air + w.uv + w.comfort;
    const raw = (w.heat * heat + w.air * air + w.uv * uv + w.comfort * comfort) / sumW;
    const scaled = (raw / 10) - 0.5;
    const t = Math.tanh(2.0 * scaled);
    return (t + 1) / 2;
  }

  function scoreToColor(score) {
    const hue = Math.round((120 * score));
    return `hsl(${hue},75%,45%)`;
  }
  
  function generateRecommendations(vals) {
    const recs = [];
    const heat = Number(vals.heat || 0), 
          air = Number(vals.air || 0), 
          uv = Number(vals.uv || 0), 
          humidity = Number(vals.humidity || 0), 
          comfort = Number(vals.comfort || 0);
    const low = 4, med = 6;

    if (heat <= low) recs.push('High heat: increase green areas and shading.');
    else if (heat <= med) recs.push('Moderate heat: vegetation in critical spots.');
    else recs.push('Adequate heat: maintain cooling strategies.');

    if (air <= low) recs.push('Poor air quality: monitor pollution and reduce traffic.');
    else if (air <= med) recs.push('Moderate air quality: implement urban vegetation.');
    else recs.push('Good air quality: protect low-emission zones.');

    if (uv >= 8) recs.push('High UV: expand shading and raise awareness.');
    else if (uv >= 5) recs.push('Moderate UV: shaded spots in public areas.');
    else recs.push('Low UV: maintain green coverage.');

    if (humidity >= 8) recs.push('High humidity: improve drainage and use permeable pavements.');
    else if (humidity <= 3) recs.push('Low humidity: water retention and drought-resistant plants.');

    if (comfort <= 3) recs.push('Low comfort: add shading, airflow, and water features.');
    else if (comfort <= 6) recs.push('Moderate comfort: localized improvements.');
    else recs.push('High comfort: maintain pleasant public areas.');

    return recs;
}

  // --- CRIAÇÃO DE POP-UP (MODIFICADO) ---
  function createPopupHTML(item, isGenerated = false) {
    const vals = item.values || {};
    const comp = computeWeightedTanh(vals);
    
    // MODIFIED: Anonymous title for generated points
    const titleHTML = isGenerated ? `<strong>Selected Point</strong>` : `<strong>${item.region}</strong>`;
    const descriptionHTML = isGenerated ? `<strong>Selected point data</strong>` : `${item.summary}`;

    let html = `
      <div style="min-width:200px">
        ${titleHTML}
        <p style="margin:6px 0;color:#444;font-size:13px">${descriptionHTML}</p>
        <table style="font-size:13px;width:100%">
          <tr><td>Heat</td><td style="text-align:right">${vals.heat ?? '—'}</td></tr>
          <tr><td>Air</td><td style="text-align:right">${vals.air ?? '—'}</td></tr>
          <tr><td>UV index</td><td style="text-align:right">${vals.uv ?? '—'}</td></tr>
          <tr><td>Composite index</td><td style="text-align:right">${comp !== null ? comp.toFixed(2) : '—'}</td></tr>
          <tr><td>Humidity</td><td style="text-align:right">${vals.humidity ?? '—'}</td></tr>
          <tr><td>Comfort</td><td style="text-align:right">${vals.comfort ?? '—'}</td></tr>
        </table>
        <hr style="margin:6px 0">
        <div style="font-size:12px;color:#333">
          <strong>Recommendations</strong>
          <ul style="margin:6px 0 0 18px;padding:0">
            ${generateRecommendations(vals).map(r => `<li>${r}</li>`).join('')}
          </ul>
        </div>
    `;

    // O link para o boletim só aparece se for um ponto real (isKnownCity)
    if (!isGenerated && !!item.region) {
      html += `
        <hr style="margin:6px 0">
        <div style="text-align:center; margin-top:4px;">
          <a href="/create_bulletin_urban?city=${encodeURIComponent(item.region)}"
            style="display:inline-block;padding:6px 12px;border:1px solid #000000ff;color:#000000;border-radius:4px;text-decoration:none;font-size:13px;">
            Go to full bulletin
          </a>
        </div>
      `;
    }
    html += '</div>';
    return html;
  }

  // --- LÓGICA DE CRIAÇÃO E ADIÇÃO DE PONTOS ---
  function addPointToMap(itemData, lat, lon, isGenerated = false) {
    const vals = itemData.values || {};
    const compositeScore = computeWeightedTanh(vals);
    const baseOpts = { radius: radiusFromComfort(vals.comfort), stroke: false, weight: 0, opacity: 0.9, color: 'transparent', fillOpacity: 0.85 };
    const popupContent = createPopupHTML(itemData, isGenerated);
    const markers = {
      heatMarker: L.circleMarker([lat, lon], {...baseOpts, fillColor: getColorForMetric('heat', vals.heat), renderer: canvasRenderer }).bindPopup(popupContent),
      airMarker: L.circleMarker([lat, lon], {...baseOpts, fillColor: getColorForMetric('air', vals.air), renderer: canvasRenderer }).bindPopup(popupContent),
      uvMarker: L.circleMarker([lat, lon], {...baseOpts, fillColor: getColorForMetric('uv', vals.uv), renderer: canvasRenderer }).bindPopup(popupContent),
      comfortMarker: L.circleMarker([lat, lon], {...baseOpts, fillColor: getColorForMetric('comfort', vals.comfort), renderer: canvasRenderer }).bindPopup(popupContent),
      humidityMarker: L.circleMarker([lat, lon], {...baseOpts, fillColor: getColorForMetric('humidity', vals.humidity), renderer: canvasRenderer }).bindPopup(popupContent),
      compositeMarker: L.circleMarker([lat, lon], {...baseOpts, fillColor: scoreToColor(compositeScore), renderer: canvasRenderer }).bindPopup(popupContent)
    };
    heatLayer.addLayer(markers.heatMarker);
    airLayer.addLayer(markers.airMarker);
    uvLayer.addLayer(markers.uvMarker);
    comfortLayer.addLayer(markers.comfortMarker);
    humidityLayer.addLayer(markers.humidityMarker);
    compositeLayer.addLayer(markers.compositeMarker);
    return { lat, lon, data: itemData, ...markers };
  }

  // --- CARREGAMENTO DE DADOS INICIAIS ---
  fetch(REGIONS_JSON).then(r => r.json()).then(data => {
    data.forEach(item => {
      const lat = item.lat || item.latitude || 0;
      const lon = item.lon || item.longitude || 0;
      const pointEntry = addPointToMap(item, lat, lon, false);
      regionIndex.push({ ...pointEntry, id: item.region + '|' + lat + ',' + lon, name: item.region, summary: item.summary });
    });
    compositeLayer.addTo(map);
    updateLegend('composite');
    updateMarkerSizes(map.getZoom());
    try {
      const bounds = L.featureGroup(regionIndex.map(r => r.compositeMarker)).getBounds();
      if (bounds.isValid()) map.fitBounds(bounds.pad(0.2));
    } catch (e) { console.error("Could not fit bounds.", e); }
    updateFillerPoints();
  }).catch(err => console.error('Error loading regions.json', err));

  // --- LÓGICA DE PONTOS DE PREENCHIMENTO (REFEITA) ---
  async function isLand(lat, lon) {
    try {
      const response = await fetch(`https://api.onwater.io/api/v1/results/${lat},${lon}`);
      if (!response.ok) return true;
      const result = await response.json();
      return !result.water;
    } catch (error) { return true; }
  }
  
  function findNearestRegion(lat, lon) {
    let best = null;
    let bestDist = Infinity;
    for (const r of regionIndex) {
      const d = haversineDistance(lat, lon, r.lat, r.lon);
      if (d < bestDist) { bestDist = d; best = r; }
    }
    return best;
  }
  
  function removePointMarkersFromMap(point) {
    heatLayer.removeLayer(point.heatMarker);
    airLayer.removeLayer(point.airMarker);
    uvLayer.removeLayer(point.uvMarker);
    comfortLayer.removeLayer(point.comfortMarker);
    humidityLayer.removeLayer(point.humidityMarker);
    compositeLayer.removeLayer(point.compositeMarker);
  }

  async function updateFillerPoints() {
    if (map.getZoom() < 7 || regionIndex.length === 0) return;

    const bounds = map.getBounds();
    // Conta quantos pontos (reais + gerados) já estão visíveis
    const visibleRealCount = regionIndex.filter(p => bounds.contains([p.lat, p.lon])).length;
    const visibleGeneratedCount = generatedPointsIndex.filter(p => bounds.contains([p.lat, p.lon])).length;
    const totalVisible = visibleRealCount + visibleGeneratedCount;
    
    if (totalVisible >= MIN_VISIBLE_POINTS) return; // Se a tela já está cheia, não faz nada

    let pointsToAdd = MIN_VISIBLE_POINTS - totalVisible;

    // Gerencia o limite máximo de pontos gerados
    if (generatedPointsIndex.length + pointsToAdd > MAX_GENERATED_POINTS) {
      const numToRemove = (generatedPointsIndex.length + pointsToAdd) - MAX_GENERATED_POINTS;
      const pointsToRemove = generatedPointsIndex.splice(0, numToRemove); // Remove os mais antigos
      pointsToRemove.forEach(p => removePointMarkersFromMap(p));
    }

    let addedCount = 0;
    let attempts = 0;
    const maxAttempts = pointsToAdd * 15;
    while (addedCount < pointsToAdd && attempts < maxAttempts) {
      const lat = Math.random() * (bounds.getNorth() - bounds.getSouth()) + bounds.getSouth();
      const lon = Math.random() * (bounds.getEast() - bounds.getWest()) + bounds.getWest();
      attempts++;
      if (await isLand(lat, lon)) {
        const nearestRegion = findNearestRegion(lat, lon);
        if (nearestRegion) {
          const pointEntry = addPointToMap(nearestRegion.data, lat, lon, true);
          generatedPointsIndex.push(pointEntry); // Adiciona ao array persistente
          addedCount++;
        }
      }
    }
    if (addedCount > 0) updateMarkerSizes(map.getZoom());
  }

  // --- FUNÇÕES UTILITÁRIAS E MANIPULADORES DE EVENTOS ---
  function haversineDistance(lat1, lon1, lat2, lon2) {
    const toRad = v => v * Math.PI / 180;
    const R = 6371;
    const dLat = toRad(lat2 - lat1), dLon = toRad(lon2 - lon1);
    const a = Math.sin(dLat / 2) ** 2 + Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) ** 2;
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
  }
  
  function scaledRadiusFromComfort(comfort, zoom) {
    const base = radiusFromComfort(comfort);
    const z = Math.max(MIN_ZOOM, Math.min(MAX_ZOOM, zoom));
    const t = (z - MIN_ZOOM) / (MAX_ZOOM - MIN_ZOOM);
    const scale = 0.5 + (5.5 * t);
    return Math.max(0.5, Math.round(base * scale));
  }
  
  function updateMarkerSizes(zoom) {
    const allPoints = [...regionIndex, ...generatedPointsIndex];
    for (const r of allPoints) {
      const comfort = Number((r.data.values && r.data.values.comfort) || 0);
      const newR = scaledRadiusFromComfort(comfort, zoom);
      ['heatMarker', 'airMarker', 'uvMarker', 'comfortMarker', 'humidityMarker', 'compositeMarker'].forEach(key => {
        try { if (r[key]) r[key].setRadius(newR); } catch (e) {}
      });
    }
  }

  map.on('zoomend', () => updateMarkerSizes(map.getZoom()));
  map.on('popupopen', () => { isPopupOpening = true; });
  map.on('moveend', () => {
    if (isPopupOpening) { isPopupOpening = false; return; }
    updateFillerPoints();
  });
  
  map.on('click', function(e){
    if(!regionIndex.length) return;
    const nearest = findNearestRegion(e.latlng.lat, e.latlng.lng);
    if (!nearest) return;
    const popupHtml = createPopupHTML(nearest.data, false).replace("<strong>For the selected point</strong>", `<strong>Dados para o ponto mais próximo (${nearest.name})</strong>`);
    L.popup({ maxWidth: 360, autoPan: true }).setLatLng(e.latlng).setContent(popupHtml).openOn(map);
  });
  
  // O restante do código (busca, legenda, sidebar, etc.) permanece o mesmo...

  const metricSelect = document.getElementById('metric-select');
  if(metricSelect) metricSelect.addEventListener('change', (ev) => showMetric(ev.target.value));
  const searchInput = document.getElementById('region-search');
  const searchBtn = document.getElementById('region-search-btn');
  const searchResultEl = document.getElementById('search-result');

  function normalizeText(s){
    if(!s) return '';
    return s.normalize('NFD').replace(/\p{Diacritic}/gu, '').toLowerCase();
  }

  function levenshtein(a, b){
    if(a === b) return 0; a = a || ''; b = b || '';
    const al = a.length, bl = b.length;
    if(al === 0) return bl; if(bl === 0) return al;
    const matrix = Array(bl + 1).fill(null).map(() => Array(al + 1).fill(null));
    for(let i=0;i<=al;i++) matrix[0][i] = i;
    for(let i=0;i<=bl;i++) matrix[i][0] = i;
    for(let i=1;i<=bl;i++){
      for(let j=1;j<=al;j++){
        const cost = b[i-1] === a[j-1] ? 0 : 1;
        matrix[i][j] = Math.min(matrix[i-1][j]+1, matrix[i][j-1]+1, matrix[i-1][j-1]+cost);
      }
    }
    return matrix[bl][al];
  }

  function scoreMatch(regionObj, q){
    const name = normalizeText(regionObj.name || ''), summary = normalizeText(regionObj.summary || '');
    const nq = normalizeText(q);
    if(!nq) return 0;
    if(name.includes(nq)) return 100; if(summary.includes(nq)) return 90;
    if(name.split(/\s+/).some(t => t.startsWith(nq))) return 85;
    if(summary.split(/\s+/).some(t => t.startsWith(nq))) return 75;
    const d = levenshtein(nq, name), maxLen = Math.max(nq.length, name.length);
    let nameScore = maxLen > 0 ? Math.max(0, 60 * (1 - (d / maxLen))) : 0;
    return Math.round(nameScore);
  }

  function searchRegion(query){
    if(!query || !query.trim()){ searchResultEl.innerHTML = '<em>Digite o nome de uma região para buscar.</em>'; return; }
    const q = query.trim();
    const scored = regionIndex.map(r => ({ r, score: scoreMatch(r, q) }));
    const filtered = scored.filter(s => s.score > 10).sort((a,b) => b.score - a.score);
    if (filtered.length === 0) {
      searchResultEl.innerHTML = '<em>No region found.</em>';
      return;
    }

    const top = filtered.slice(0,7);
    let html = '<div style="display:flex;flex-direction:column;gap:6px">';
    top.forEach(item => {
      html += `<button class="btn" style="text-align:left;background:#fff;border:1px solid #e6eef5;color:#123;padding:8px;border-radius:6px" data-id="${item.r.id}"><strong>${item.r.name}</strong><div style="font-size:12px;color:#555;margin-top:4px">${item.r.summary || ''}</div></button>`;
    });
    html += '</div>';
    searchResultEl.innerHTML = html;
    searchResultEl.querySelectorAll('button[data-id]').forEach(btn => {
      btn.addEventListener('click', () => {
        const sel = regionIndex.find(r => r.id === btn.dataset.id);
        if(!sel) return;
        map.setView([sel.lat, sel.lon], Math.max(8, MIN_ZOOM));
        sel.compositeMarker.openPopup();
        maybeCloseOnSelect();
        searchResultEl.innerHTML = `<strong>${sel.name}</strong><div style="margin-top:6px;color:#444;font-size:13px">${sel.summary}</div>`;
      });
    });
  }

  if(searchBtn) searchBtn.addEventListener('click', () => searchRegion(searchInput.value));
  if(searchInput) searchInput.addEventListener('keydown', (ev) => { if(ev.key === 'Enter') searchRegion(searchInput.value); });

  function showMetric(metric){
    Object.values(overlays).forEach(l => map.removeLayer(l));
    (overlays[metric.charAt(0).toUpperCase() + metric.slice(1)] || compositeLayer).addTo(map);
    updateLegend(metric);
  }

  function updateLegend(metric) {
    const legendEl = document.getElementById('legend');
    if (!legendEl) return;

    let title = metric.charAt(0).toUpperCase() + metric.slice(1);
    let html = `<strong>Legend — ${title}`;

    if (metric === 'composite') html += ' (Composite Index)';
    html += '</strong>';

    if (metric === 'composite') {
      html += '<div class="legend-gradient" style="background:linear-gradient(90deg, hsl(0,75%,45%), hsl(120,75%,45%))"></div>';
      html += '<div class="legend-scale"><span>Low (0)</span><span>0.5</span><span>High (1)</span></div>';
    } else {
      const c0 = getColorForMetric(metric, 0), c10 = getColorForMetric(metric, 10);
      html += `<div class="legend-gradient" style="background:linear-gradient(90deg, ${c0}, ${c10})"></div>`;
      html += '<div class="legend-scale"><span>0</span><span>5</span><span>10</span></div>';
    }

    legendEl.innerHTML = html;
  }

  // Sidebar toggle behavior
  const sidebar = document.getElementById('map-sidebar'), sidebarClose = document.getElementById('map-sidebar-close');
  function closeSidebar(){
    if(!sidebar) return;
    sidebar.classList.add('closed');
    sidebar.setAttribute('aria-hidden','true');
    if(sidebarClose) sidebarClose.setAttribute('aria-expanded','false');
    document.getElementById('legend')?.classList.add('overlay');
    setTimeout(()=> map.invalidateSize(), 350);
    document.getElementById('map')?.focus();
  }
  function openSidebar(){
    if(!sidebar) return;
    sidebar.classList.remove('closed');
    sidebar.setAttribute('aria-hidden','false');
    if(sidebarClose) sidebarClose.setAttribute('aria-expanded','true');
    document.getElementById('legend')?.classList.remove('overlay');
    setTimeout(()=> map.invalidateSize(), 300);
    sidebar.querySelector('select, input, button, a')?.focus();
  }
  if(sidebarClose) sidebarClose.addEventListener('click', closeSidebar);
  document.addEventListener('keydown', (ev) => { if((ev.key === 'Escape' || ev.key === 'Esc') && !sidebar?.classList.contains('closed')) closeSidebar(); });
  const mq = window.matchMedia('(max-width:900px)');
  function maybeCloseOnSelect(){ if(mq.matches) closeSidebar(); }
});