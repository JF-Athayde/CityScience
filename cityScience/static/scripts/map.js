document.addEventListener('DOMContentLoaded', () => {
  if (typeof L === 'undefined') {
    console.error('Leaflet not loaded');
    return;
  }

  // prevent the world being drawn multiple times when zoomed out
  // set minZoom and maxZoom to limit how far user can zoom out/in
  const MIN_ZOOM = 2.5;
  const MAX_ZOOM = 18;
  const map = L.map('map', {
    zoomControl: true,
    worldCopyJump: false,
    // disable CSS-based zoom animation to avoid temporary scaling artifacts on vector layers
    zoomAnimation: false,
    // realistic world bounds
    maxBounds: [[-90, -180], [90, 180]],
    maxBoundsViscosity: 0.9,
    minZoom: MIN_ZOOM,
    maxZoom: MAX_ZOOM
  }).setView([0, 0], MIN_ZOOM);

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

  // layer groups for each metric
  const heatLayer = L.layerGroup();
  const airLayer = L.layerGroup();
  const humidityLayer = L.layerGroup();
  const uvLayer = L.layerGroup();
  const comfortLayer = L.layerGroup();
  const compositeLayer = L.layerGroup();

  // index to find regions by name (populated when data loads)
  const regionIndex = [];

  const overlays = { 'Composite': compositeLayer, 'Heat': heatLayer, 'Air': airLayer, 'Humidity': humidityLayer, 'UV': uvLayer, 'Comfort': comfortLayer };

  L.control.layers(baseLayers, overlays, { collapsed: true }).addTo(map);

  // use a shared canvas renderer for many circleMarkers (much faster with huge point counts)
  const canvasRenderer = L.canvas({ padding: 0.5 });

  function getColorForMetric(metric, value){
    // continuous color ramp for values in 0..10
    // normalize value to 0..1
    const v = Math.max(0, Math.min(10, Number(value) || 0));
    let n = v / 10; // 0 (low) .. 1 (high)
    // metrics where higher values are worse should be inverted so
    // the visual scale goes from red (bad) -> green (good)
    const higherWorse = { heat: true, uv: true };
    if(higherWorse[metric]) n = 1 - n;
    // map to hue 0 (red) -> 120 (green) and return HSL
    const hue = Math.round(120 * n);
    return `hsl(${hue},75%,45%)`;
  }

  function radiusFromComfort(comfort){
    const p = Math.max(0, Math.min(10, Number(comfort)/2 || 5));
    // markers very small for high-volume datasets: base 1px + scaled factor
    // p in 0..10 -> radius in ~1..4.5px
    return 1 + (p * 0.35);
  }

  // compute composite using user-specified weights and tanh normalization
  // weights: heat=3, air=2.2, uv=2.5, comfort=1.2
  function computeWeightedTanh(values){
    const w = { heat:3, air:5, uv:2, comfort:1.2 };
    const heat = Number(values.heat || 0);
    const air = Number(values.air || 0);
    const uv = Number(values.uv || 0);
    const comfort = Number(values.comfort || 0);
    const sumW = w.heat + w.air + w.uv + w.comfort;
    // raw weighted mean (assuming input indicators are on a comparable 0-10 scale)
    const raw = (w.heat*heat + w.air*air + w.uv*uv + w.comfort*comfort) / sumW;
    // scale raw to roughly -1..1 before tanh: bring it to 0..1 by dividing by 10, center at 0.5
    const scaled = (raw / 10) - 0.5;
    // apply tanh and map to 0..1
    const k = 2.0; // gain; controls contrast of tanh
    const t = Math.tanh(k * scaled);
    const normalized = (t + 1) / 2;
    return normalized; // 0..1 where higher is better
  }

  function scoreToColor(score){
    // score is 0..1. Map to hue 0 (red) -> 120 (green)
    const hue = Math.round((120 * score));
    return `hsl(${hue},75%,45%)`;
  }

  // Generate tailored recommendations based on the city's indicator values.
  // Assumes indicators are on a 0-10 scale where higher is better.
  function generateRecommendations(vals){
    const recs = [];
    const heat = Number(vals.heat || 0);
    const air = Number(vals.air || 0);
    const uv = Number(vals.uv || 0);
    const humidity = Number(vals.humidity || 0);
    const comfort = Number(vals.comfort || 0);

    // thresholds (tunable)
    const low = 4;
    const med = 6;

    // Heat (low -> needs cooling / greening)
    if(heat <= low){
      recs.push('High heat risk: prioritize urban greening (street trees, parks), cool roofs, shaded pedestrian routes and water features to reduce surface temperatures.');
    } else if(heat <= med){
      recs.push('Moderate heat: target greening in hotspots and use reflective materials for pavements and roofs.');
    } else {
      recs.push('Heat index is good — maintain cooling strategies and monitor Land Surface Temperature trends.');
    }

    // Air quality (low -> reduce emissions / monitor)
    if(air <= low){
      recs.push('Poor air quality: expand air pollution monitoring (PM2.5/AOD), restrict high-emission traffic in sensitive areas, and promote public transport and EV adoption.');
    } else if(air <= med){
      recs.push('Moderate air quality: implement traffic calming, urban vegetation near roads and targeted monitoring.');
    } else {
      recs.push('Air quality appears good — protect low-emission zones and continue monitoring.');
    }

    // UV index guidance (higher UV -> more protective measures)
    if(uv >= 8){
      recs.push('High UV exposure: prioritize shade structures, tree canopy expansion, public education on peak UV hours and protective measures for outdoor workers and vulnerable groups.');
    } else if(uv >= 5){
      recs.push('Moderate UV: encourage shaded bus stops, shaded playgrounds and targeted tree planting in recreational areas.');
    } else {
      recs.push('Low UV — outdoor exposure risk is lower; maintain green cover and monitor seasonal UV changes.');
    }

    // Humidity-related guidance
    if(humidity >= 8){
      recs.push('High humidity and rainfall: improve drainage, permeable pavements and water-sensitive urban design to reduce flood risk and standing water.');
    } else if(humidity <= 3){
      recs.push('Low humidity/drier conditions: prioritize water retention measures and drought-tolerant planting.');
    }

    // Comfort guidance (lower comfort -> interventions to improve microclimate)
    if(comfort <= 3){
      recs.push('Low outdoor comfort: improve shading, wind protection, seating and water features; target interventions in frequently-used public spaces.');
    } else if(comfort <= 6){
      recs.push('Moderate comfort: prioritize localized shading and microclimate improvements in hotspots.');
    } else {
      recs.push('High comfort — maintain public amenities and ensure accessibility to shaded, comfortable outdoor areas for all residents.');
    }

    // If nothing matched (shouldn't happen) provide a default
    if(recs.length === 0) recs.push('No specific alerts — continue monitoring indicators and use NASA time series to inform interventions.');
    return recs;
  }

  function createPopupHTML(item){
    const vals = item.values || {};
    const comp = (typeof computeWeightedTanh === 'function') ? computeWeightedTanh(vals) : null;
    const html = `
      <div style="min-width:200px">
        <strong>${item.region}</strong>
        <p style="margin:6px 0;color:#444;font-size:13px">${item.summary}</p>
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
      </div>
    `;
    return html;
  }

  // Load data
  fetch(REGIONS_JSON).then(r => r.json()).then(data => {
    data.forEach(item => {
      const lat = item.lat || item.latitude || 0;
      const lon = item.lon || item.longitude || 0;
      const vals = item.values || {};
      const compositeScore = computeWeightedTanh(vals);

      // marker common options
      // minimalistic markers: no stroke (no border), small radius for many points
      const baseOpts = {
        radius: radiusFromComfort(vals.comfort),
        stroke: false,
        weight: 0,
        opacity: 0.9,
        color: 'transparent',
        fillOpacity: 0.85
      };

      // heat marker
      const heatColor = getColorForMetric('heat', vals.heat);
  const heatMarker = L.circleMarker([lat, lon], Object.assign({}, baseOpts, { fillColor: heatColor, renderer: canvasRenderer }));
      heatMarker.bindPopup(createPopupHTML(item));
      heatLayer.addLayer(heatMarker);

      // air marker
      const airColor = getColorForMetric('air', vals.air);
  const airMarker = L.circleMarker([lat, lon], Object.assign({}, baseOpts, { fillColor: airColor, renderer: canvasRenderer }));
      airMarker.bindPopup(createPopupHTML(item));
      airLayer.addLayer(airMarker);

  // uv marker
  const uvColor = getColorForMetric('uv', vals.uv);
  const uvMarker = L.circleMarker([lat, lon], Object.assign({}, baseOpts, { fillColor: uvColor, renderer: canvasRenderer }));
  uvMarker.bindPopup(createPopupHTML(item));
  uvLayer.addLayer(uvMarker);

  // comfort marker
  const comfortColor = getColorForMetric('comfort', vals.comfort);
  const comfortMarker = L.circleMarker([lat, lon], Object.assign({}, baseOpts, { fillColor: comfortColor, renderer: canvasRenderer }));
  comfortMarker.bindPopup(createPopupHTML(item));
  comfortLayer.addLayer(comfortMarker);

  // humidity marker
  const humidityColor = getColorForMetric('humidity', vals.humidity);
  const humidityMarker = L.circleMarker([lat, lon], Object.assign({}, baseOpts, { fillColor: humidityColor, renderer: canvasRenderer }));
  humidityMarker.bindPopup(createPopupHTML(item));
  humidityLayer.addLayer(humidityMarker);

      // composite marker: continuous color ramp from red (low) to green (high)
      const compColor = scoreToColor(compositeScore);
  const compMarker = L.circleMarker([lat, lon], Object.assign({}, baseOpts, { fillColor: compColor, renderer: canvasRenderer }));
      compMarker.bindPopup(createPopupHTML(item));
      compositeLayer.addLayer(compMarker);

      // store for quick search: keep reference to all markers so we can resize them on zoom
      regionIndex.push({
        id: item.region + '|' + lat + ',' + lon,
        name: item.region,
        summary: item.summary,
        lat, lon,
        heatMarker,
        airMarker,
        uvMarker,
        comfortMarker,
        humidityMarker,
        compositeMarker: compMarker,
        data: item
      });
    });

  // default: show composite
  compositeLayer.addTo(map);
  updateLegend('composite');

  // ensure markers are sized for the current zoom after load
  try{ updateMarkerSizes(map.getZoom()); }catch(e){}

  // Fit to bounds (include humidity layer)
  const allLayersGroup = L.featureGroup([compositeLayer, heatLayer, airLayer, humidityLayer, uvLayer, comfortLayer]);
    // compute bounds from composite layer
    try{
      const bounds = L.featureGroup([compositeLayer]).getBounds();
      if(bounds.isValid()) map.fitBounds(bounds.pad(0.2));
    }catch(e){/* ignore */}

  }).catch(err => {
    console.error('Error loading regions.json', err);
  });

  // Utility: haversine distance (km)
  function haversineDistance(lat1, lon1, lat2, lon2){
    const toRad = v => v * Math.PI / 180;
    const R = 6371; // km
    const dLat = toRad(lat2 - lat1);
    const dLon = toRad(lon2 - lon1);
    const a = Math.sin(dLat/2) * Math.sin(dLat/2) + Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon/2) * Math.sin(dLon/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    return R * c;
  }

  // radius scaling: convert comfort-based base radius (px) into scaled radius depending on zoom
  // contract: input comfort value (0..10) -> returns radius in pixels appropriate for the given zoom
  function scaledRadiusFromComfort(comfort, zoom){
    // base radius from existing function (small px values)
    const base = radiusFromComfort(comfort); // ~1..4.5px
    // scale factor per zoom level: each zoom increments size by a power factor so growth looks natural
    // tuned constants: at zoom 2 -> scale ~0.5, at zoom 18 -> scale ~6
    const minZoom = MIN_ZOOM; const maxZoom = MAX_ZOOM;
    const z = Math.max(minZoom, Math.min(maxZoom, zoom));
    const t = (z - minZoom) / (maxZoom - minZoom); // 0..1
    const scale = 0.5 + (5.5 * t); // 0.5 .. 6.0
    return Math.max(0.5, Math.round(base * scale));
  }

  // update sizes for all markers in regionIndex for a given zoom
  function updateMarkerSizes(zoom){
    if(!regionIndex || regionIndex.length === 0) return;
    for(const r of regionIndex){
      const vals = (r.data && r.data.values) ? r.data.values : {};
      const comfort = Number(vals.comfort || 0);
      const newR = scaledRadiusFromComfort(comfort, zoom);
      // update each marker if present
      ['heatMarker','airMarker','uvMarker','comfortMarker','humidityMarker','compositeMarker'].forEach(key => {
        const m = r[key];
        try{ if(m && typeof m.setRadius === 'function') m.setRadius(newR); }catch(e){}
      });
    }
  }

  // Listen to zoom changes and update marker sizes when zoom ends
  map.on('zoomend', function(){
    try{ updateMarkerSizes(map.getZoom()); }catch(e){ console.error('updateMarkerSizes error', e); }
  });

  // When user clicks anywhere on the map, show information for the nearest city
  map.on('click', function(e){
    try{
      if(!regionIndex || regionIndex.length === 0) return;
      const { lat: latClick, lng: lonClick } = e.latlng;
      let best = null;
      let bestDist = Infinity;
      for(const r of regionIndex){
        const d = haversineDistance(latClick, lonClick, r.lat, r.lon);
        if(d < bestDist){ bestDist = d; best = r; }
      }
      if(!best) return;

      // Build popup content but start with the exact requested English phrase
      const vals = (best.data && best.data.values) ? best.data.values : {};
      const comp = (typeof computeWeightedTanh === 'function') ? computeWeightedTanh(vals) : null;
      // remove explicit region name from the summary so we don't show the nearest city's name
      let safeSummary = (best.summary || '').toString();
      if(best.name && safeSummary.includes(best.name)) safeSummary = safeSummary.replace(best.name, '').replace(/^,?\s*-?\s*/,'').trim();
      const popupHtml = `
        <div style="min-width:220px">
          <strong>For the selected point</strong>
          <p style="margin:6px 0;color:#444;font-size:13px">${safeSummary}</p>
          <table style="font-size:13px;width:100%">
            <tr><td>Heat</td><td style="text-align:right">${vals.heat ?? '—'}</td></tr>
            <tr><td>Air (Normalized)</td><td style="text-align:right">${vals.air ?? '—'}</td></tr>
            <tr><td>UV index</td><td style="text-align:right">${vals.uv ?? '—'}</td></tr>
            <tr><td>Humidity</td><td style="text-align:right">${vals.humidity ?? '—'}</td></tr>
            <tr><td>Comfort</td><td style="text-align:right">${vals.comfort ?? '—'}</td></tr>
            <tr><td>Composite</td><td style="text-align:right">${comp !== null ? comp.toFixed(2) : '—'}</td></tr>
          </table>
        </div>
      `;

      L.popup({ maxWidth: 360, autoPan: true })
        .setLatLng(e.latlng)
        .setContent(popupHtml)
        .openOn(map);
    }catch(ex){ console.error('click handler error', ex); }
  });

  // metric control
  const metricSelect = document.getElementById('metric-select');
  if(metricSelect){
    metricSelect.addEventListener('change', (ev) => {
      showMetric(ev.target.value);
    });
  }

  // Search controls
  const searchInput = document.getElementById('region-search');
  const searchBtn = document.getElementById('region-search-btn');
  const searchResultEl = document.getElementById('search-result');

  // helpers for fuzzy matching
  function normalizeText(s){
    if(!s) return '';
    // remove accents and lowercase
    return s.normalize('NFD').replace(/\p{Diacritic}/gu, '').toLowerCase();
  }

  function levenshtein(a, b){
    if(a === b) return 0;
    a = a || '';
    b = b || '';
    const al = a.length; const bl = b.length;
    if(al === 0) return bl;
    if(bl === 0) return al;
    const matrix = [];
    for(let i=0;i<=bl;i++){ matrix[i] = [i]; }
    for(let j=0;j<=al;j++){ matrix[0][j] = j; }
    for(let i=1;i<=bl;i++){
      for(let j=1;j<=al;j++){
        const cost = a[j-1] === b[i-1] ? 0 : 1;
        matrix[i][j] = Math.min(
          matrix[i-1][j] + 1,
          matrix[i][j-1] + 1,
          matrix[i-1][j-1] + cost
        );
      }
    }
    return matrix[bl][al];
  }

  function scoreMatch(regionObj, q){
    const name = normalizeText(regionObj.name || '');
    const summary = normalizeText(regionObj.summary || '');
    const nq = normalizeText(q);
    if(!nq) return 0;
    // exact contains -> highest score
    if(name.includes(nq)) return 100;
    if(summary.includes(nq)) return 90;
    // token starts
    const nameTokens = name.split(/\s+/);
    for(const t of nameTokens){ if(t.startsWith(nq)) return 85; }
    const summaryTokens = summary.split(/\s+/);
    for(const t of summaryTokens){ if(t.startsWith(nq)) return 75; }
    // levenshtein similarity on name
    const d = levenshtein(nq, name);
    const maxLen = Math.max(nq.length, name.length);
    let nameScore = 0;
    if(maxLen > 0) nameScore = Math.max(0, 60 * (1 - (d / maxLen)));
    // also compare with summary for partial matches
    const ds = levenshtein(nq, summary);
    const maxLs = Math.max(nq.length, summary.length);
    let sumScore = 0;
    if(maxLs > 0) sumScore = Math.max(0, 50 * (1 - (ds / maxLs)));
    return Math.round(Math.max(nameScore, sumScore));
  }

  function searchRegion(query){
    if(!query || !query.trim()){
      searchResultEl.innerHTML = '<em>Type a region name to search.</em>';
      return;
    }
    const q = query.trim();
    // score all regions
    const scored = regionIndex.map(r => ({ r, score: scoreMatch(r, q) }));
    const filtered = scored.filter(s => s.score > 10).sort((a,b) => b.score - a.score);
    if(filtered.length === 0){
      searchResultEl.innerHTML = '<em>No regions found.</em>';
      return;
    }
    // build list of top 7 matches
    const top = filtered.slice(0,7);
    let html = '<div style="display:flex;flex-direction:column;gap:6px">';
    top.forEach(item => {
      const name = item.r.name;
      const summary = item.r.summary || '';
      html += `<button class="btn" style="text-align:left;background:#fff;border:1px solid #e6eef5;color:#123;padding:8px;border-radius:6px" data-id="${item.r.id}"><strong>${name}</strong><div style="font-size:12px;color:#555;margin-top:4px">${summary}</div></button>`;
    });
    html += '</div>';
    searchResultEl.innerHTML = html;

    // attach click handlers
    top.forEach(item => {
      const btn = searchResultEl.querySelector(`button[data-id="${item.r.id}"]`);
      if(!btn) return;
      btn.addEventListener('click', () => {
        const sel = item.r;
        const targetZoom = Math.max(8, MIN_ZOOM);
        map.setView([sel.lat, sel.lon], targetZoom);
        try{ sel.compositeMarker.openPopup(); }catch(e){}
        // on small screens, hide the sidebar to reveal the map
        try{ maybeCloseOnSelect(); }catch(e){}
        // show detailed summary
        searchResultEl.innerHTML = `<strong>${sel.name}</strong><div style="margin-top:6px;color:#444;font-size:13px">${sel.summary}</div>`;
      });
    });
  }

  if(searchBtn){
    searchBtn.addEventListener('click', () => searchRegion(searchInput.value));
  }
  if(searchInput){
    searchInput.addEventListener('keydown', (ev) => { if(ev.key === 'Enter') searchRegion(searchInput.value); });
  }

  function clearMetricLayers(){
    map.removeLayer(heatLayer);
    map.removeLayer(airLayer);
    map.removeLayer(uvLayer);
    map.removeLayer(comfortLayer);
    map.removeLayer(compositeLayer);
  }

  function showMetric(metric){
    clearMetricLayers();
    if(metric === 'heat') heatLayer.addTo(map);
    else if(metric === 'air') airLayer.addTo(map);
    else if(metric === 'humidity') humidityLayer.addTo(map);
    else if(metric === 'uv') uvLayer.addTo(map);
    else if(metric === 'comfort') comfortLayer.addTo(map);
    else compositeLayer.addTo(map);
    updateLegend(metric);
  }

  function updateLegend(metric){
    const legendEl = document.getElementById('legend');
    if(!legendEl) return;
  let title = (metric[0].toUpperCase()+metric.slice(1));
  let html = `<strong>Legend — ${title}`;
  if(metric === 'composite') html += ' (Weighted tanh composite)';
  html += '</strong>';
    if(metric === 'composite'){
      // continuous red -> green gradient (single scale)
      html += '<div class="legend-gradient" style="background:linear-gradient(90deg, hsl(0,75%,45%), hsl(120,75%,45%))"></div>';
      html += '<div class="legend-scale"><span>Low (0)</span><span>0.5</span><span>High (1)</span></div>';
    } else {
      // unified two-stop red->green gradient for all metrics (0..10)
      const c0 = getColorForMetric(metric, 0);
      const c10 = getColorForMetric(metric, 10);
      html += `<div class="legend-gradient" style="background:linear-gradient(90deg, ${c0}, ${c10})"></div>`;
      // numeric ruler 0..10
      html += '<div class="legend-scale"><span>0</span><span>5</span><span>10</span></div>';
    }
    legendEl.innerHTML = html;
  }

  // small accessibility: keyboard focus on map
  document.getElementById('map').tabIndex = -1;

  // Sidebar toggle behavior for responsive layouts
  const sidebar = document.getElementById('map-sidebar');
  const sidebarClose = document.getElementById('map-sidebar-close');
  function closeSidebar(){
    if(!sidebar) return;
    sidebar.classList.add('closed');
    sidebar.setAttribute('aria-hidden','true');
  if(sidebarClose) sidebarClose.setAttribute('aria-expanded','false');
    // put legend into overlay mode
    const legend = document.getElementById('legend');
    if(legend) legend.classList.add('overlay');
    // ensure map redraw after CSS transition
    setTimeout(()=>{ try{ map.invalidateSize(); }catch(e){} }, 350);
  // move focus to the map for keyboard users now that the open button was removed
  try{ const mapEl = document.getElementById('map'); if(mapEl) mapEl.focus(); }catch(e){}
  }
  function openSidebar(){
    if(!sidebar) return;
    sidebar.classList.remove('closed');
    sidebar.setAttribute('aria-hidden','false');
  if(sidebarClose) sidebarClose.setAttribute('aria-expanded','true');
    const legend = document.getElementById('legend');
    if(legend) legend.classList.remove('overlay');
    setTimeout(()=>{ try{ map.invalidateSize(); }catch(e){} }, 300);
    // move focus into the sidebar for screen reader users
    try{ const firstControl = sidebar.querySelector('select, input, button, a'); if(firstControl) firstControl.focus(); }catch(e){}
  }
  if(sidebarClose) sidebarClose.addEventListener('click', closeSidebar);

  // allow Esc to close sidebar when open
  document.addEventListener('keydown', (ev) => {
    if(ev.key === 'Escape' || ev.key === 'Esc'){
      if(sidebar && sidebar.classList && !sidebar.classList.contains('closed')) closeSidebar();
    }
  });

  // When a search result is clicked we close the sidebar on narrow viewports to show the map
  const mq = window.matchMedia('(max-width:900px)');
  function maybeCloseOnSelect(){ if(mq.matches) closeSidebar(); }

  // hook into previously-attached search result handlers by wrapping the search result render
  const originalSearchRegion = window.searchRegion || null;
  // if searchRegion exists in this scope we don't replace it; instead, ensure we close sidebar in handlers above where buttons are created

});
