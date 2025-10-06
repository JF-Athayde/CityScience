async function sendLocationToServer(payload) {
  try {
    // Se você usa CSRF (Flask-WTF) e gerou token em meta tag:
    const csrf = document.querySelector('meta[name="csrf-token"]')?.getAttribute('content');

    const resp = await fetch('{{ url_for("report_location") }}', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(csrf ? {'X-CSRFToken': csrf} : {})
      },
      body: JSON.stringify(payload),
      credentials: 'same-origin'
    });

    if (!resp.ok) {
      const text = await resp.text();
      console.error('Server error:', resp.status, text);
      return null;
    }
    const data = await resp.json();
    console.log('Server response:', data);
    // exemplo: mostrar cidade na página
    const el = document.getElementById('user-location-display');
    if (el) el.textContent = data.city ? `${data.city}, ${data.state || ''}` : `Lat ${data.lat}, Lon ${data.lon}`;
    return data;
  } catch (err) {
    console.error('Network error:', err);
    return null;
  }
}

function requestAndSendLocation() {
  if (!('geolocation' in navigator)) {
    alert('Geolocation is not supported by your browser.');
    return;
  }

  navigator.geolocation.getCurrentPosition(async (position) => {
    const lat = position.coords.latitude;
    const lon = position.coords.longitude;
    // opcional: precisão em metros
    const accuracy = position.coords.accuracy;

    // você pode enviar dados extras (timestamp, accuracy, etc)
    const payload = { lat, lon, accuracy, timestamp: position.timestamp };

    // enviar para o servidor
    const result = await sendLocationToServer(payload);
    // aqui você pode tomar ações adicionais com 'result'
    // ex: atualizar UI, buscar estações próximas, etc
  }, (error) => {
    console.warn('Geolocation error', error);
    if (error.code === error.PERMISSION_DENIED) {
      alert('Permission denied. To use location features, please allow location access in your browser.');
    } else {
      alert('Could not obtain location: ' + error.message);
    }
  }, {
    enableHighAccuracy: true,
    timeout: 10000,
    maximumAge: 0
  });