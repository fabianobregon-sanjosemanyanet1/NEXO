/*
 * NEXO · Laboratorio de domótica
 * HTML, CSS y JavaScript sin dependencias.
 * Los datos de ejemplo son simulados y se guardan solo en este navegador.
 * Para integrar hardware, pausa la simulación y usa Nexo.updateSensor(id, valor).
 */
(() => {
  'use strict';

  const STORAGE_KEY = 'nexo-domotica-v1';
  const ROOMS = ['Sala', 'Laboratorio', 'Cocina', 'Exterior'];
  const TYPES = {
    temperature: { label: 'Temperatura', unit: '°C', min: 0, max: 50, icon: '<path d="M14 14.8V5a2 2 0 0 0-4 0v9.8a4 4 0 1 0 4 0Z"/><path d="M12 9v9"/>' },
    humidity: { label: 'Humedad', unit: '%', min: 0, max: 100, icon: '<path d="M12 3s-7 7.5-7 12a7 7 0 0 0 14 0c0-4.5-7-12-7-12Z"/><path d="M8 15a4 4 0 0 0 4 4"/>' },
    light: { label: 'Luminosidad', unit: 'lx', min: 0, max: 1200, icon: '<circle cx="12" cy="12" r="4"/><path d="M12 2v2m0 16v2M2 12h2m16 0h2M5 5l1.5 1.5m11 11L19 19M5 19l1.5-1.5m11-11L19 5"/>' },
    motion: { label: 'Movimiento', unit: '', min: 0, max: 1, icon: '<circle cx="13" cy="4" r="2"/><path d="m8 9 4-2 4 4h4m-8-4-2 7 4 3v5M10 14l-5 6M3 8h3M2 12h3"/>' },
    gas: { label: 'Calidad del aire', unit: 'ppm', min: 0, max: 1000, icon: '<path d="M3 8h12a3 3 0 1 0-3-3M3 12h16a3 3 0 1 1-3 3M3 16h7a3 3 0 1 1-3 3"/>' },
    other: { label: 'Personalizado', unit: 'u', min: 0, max: 100, icon: '<path d="m12 2 9 5v10l-9 5-9-5V7l9-5Z"/><path d="m3 7 9 5 9-5M12 12v10"/>' }
  };

  const defaultState = () => ({
    schemaVersion: 1,
    project: { name: 'Casa Nexo', team: 'Equipo Alpha', course: 'Laboratorio de domótica', description: 'Un espacio inteligente. Un proyecto tuyo.' },
    sensors: [
      { id: 'temperatura-sala', name: 'Temperatura interior', type: 'temperature', room: 'Sala', value: 24.6, unit: '°C', min: 0, max: 50, active: true },
      { id: 'humedad-sala', name: 'Humedad relativa', type: 'humidity', room: 'Sala', value: 58, unit: '%', min: 0, max: 100, active: true },
      { id: 'luz-laboratorio', name: 'Luz ambiental', type: 'light', room: 'Laboratorio', value: 740, unit: 'lx', min: 0, max: 1200, active: true },
      { id: 'movimiento-exterior', name: 'Movimiento', type: 'motion', room: 'Exterior', value: 0, unit: '', min: 0, max: 1, active: true }
    ],
    settings: { simulation: true, lights: true, climate: true, security: false, brightness: 80, scene: 'home' }
  });

  const $ = id => document.getElementById(id);
  const text = (id, value) => { if ($(id)) $(id).textContent = value; };
  const clone = value => JSON.parse(JSON.stringify(value));
  const clamp = (value, min, max) => Math.min(max, Math.max(min, value));
  const format = value => new Intl.NumberFormat('es-CO', { maximumFractionDigits: 1 }).format(value);
  const time = date => date.toLocaleTimeString('es-CO', { hour: '2-digit', minute: '2-digit', hour12: false });
  const on = (id, event, callback) => { if ($(id)) $(id).addEventListener(event, callback); };
  const safeString = (value, max, label, allowEmpty = false) => {
    if (typeof value !== 'string' || value.length > max || (!allowEmpty && !value.trim())) throw new Error(`${label}: revisa el texto (máximo ${max} caracteres).`);
    return value.trim();
  };
  const finite = value => typeof value === 'number' && Number.isFinite(value) && Math.abs(value) <= 1000000000;

  function validateConfig(config) {
    if (!config || typeof config !== 'object' || config.schemaVersion !== 1) throw new Error('Selecciona una configuración Nexo de versión 1.');
    const p = config.project;
    if (!p || typeof p !== 'object') throw new Error('Faltan los datos del proyecto.');
    const project = { name: safeString(p.name, 50, 'Nombre'), team: safeString(p.team, 45, 'Equipo'), course: safeString(p.course, 65, 'Curso'), description: safeString(p.description, 140, 'Descripción', true) };
    if (!Array.isArray(config.sensors) || config.sensors.length > 32) throw new Error('Puedes configurar hasta 32 sensores.');
    const ids = new Set();
    const sensors = config.sensors.map(s => {
      if (!s || typeof s !== 'object') throw new Error('Hay un sensor con formato incorrecto.');
      const id = safeString(s.id, 80, 'Identificador');
      if (ids.has(id)) throw new Error('Cada sensor debe tener un identificador único.');
      ids.add(id);
      if (!Object.hasOwn(TYPES, s.type) || !ROOMS.includes(s.room)) throw new Error('Revisa el tipo o la ubicación del sensor.');
      if (![s.value, s.min, s.max].every(finite) || s.min >= s.max || s.value < s.min || s.value > s.max) throw new Error('El valor del sensor debe estar entre su mínimo y su máximo.');
      if (s.type === 'motion' && (s.min !== 0 || s.max !== 1 || ![0, 1].includes(s.value))) throw new Error('Movimiento usa mínimo 0, máximo 1 y valor 0 o 1.');
      if (typeof s.active !== 'boolean') throw new Error('El estado del sensor debe ser activo o inactivo.');
      return { id, name: safeString(s.name, 55, 'Sensor'), type: s.type, room: s.room, value: s.value, unit: safeString(s.unit, 12, 'Unidad', true), min: s.min, max: s.max, active: s.active };
    });
    const source = config.settings || {};
    const settings = { ...defaultState().settings };
    for (const key of ['simulation', 'lights', 'climate', 'security']) {
      if (source[key] !== undefined && typeof source[key] !== 'boolean') throw new Error('Hay un control con formato incorrecto.');
      if (source[key] !== undefined) settings[key] = source[key];
    }
    if (source.brightness !== undefined) {
      if (!finite(source.brightness) || source.brightness < 0 || source.brightness > 100) throw new Error('El brillo debe estar entre 0 y 100.');
      settings.brightness = source.brightness;
    }
    if (source.scene !== undefined) {
      if (!['home', 'away', 'night', 'custom'].includes(source.scene)) throw new Error('La escena no es válida.');
      settings.scene = source.scene;
    }
    return { schemaVersion: 1, project, sensors, settings };
  }

  let state = defaultState();
  let storageWarning = false;
  let loadWarning = '';
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) state = validateConfig(JSON.parse(saved));
  } catch { loadWarning = 'No se pudo recuperar la configuración anterior. Se cargó el ejemplo.'; }

  let room = 'all';
  let selectedChart = 'temperature';
  let toastTimer;
  let lastUpdate = new Date();
  const histories = new Map();
  const activities = [];

  function toast(message) {
    const element = $('toast');
    if (!element) return;
    element.textContent = message;
    element.classList.add('visible', 'show');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => element.classList.remove('visible', 'show'), 4200);
  }

  function persist() {
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(state)); }
    catch {
      if (!storageWarning) toast('El navegador no permite guardar. Exporta tu configuración para conservarla.');
      storageWarning = true;
    }
  }

  function addActivity(message, kind = 'info') {
    activities.unshift({ message, kind, at: new Date() });
    activities.splice(5);
    renderActivities();
  }

  function renderActivities() {
    const list = $('activity-list');
    if (!list) return;
    list.replaceChildren();
    activities.forEach(item => {
      const row = document.createElement('div');
      row.className = 'activity-item';
      const dot = document.createElement('span');
      dot.className = `activity-dot ${item.kind}`;
      const copy = document.createElement('span');
      copy.className = 'activity-copy';
      copy.textContent = item.message;
      const stamp = document.createElement('time');
      stamp.className = 'activity-time';
      stamp.dateTime = item.at.toISOString();
      stamp.textContent = time(item.at);
      row.append(dot, copy, stamp);
      list.append(row);
    });
  }

  function seedHistory(sensor) {
    if (!histories.has(sensor.id)) histories.set(sensor.id, Array.from({ length: 20 }, (_, i) => clamp(sensor.value + Math.sin(i * 0.45) * (sensor.max - sensor.min) * 0.025, sensor.min, sensor.max)));
    return histories.get(sensor.id);
  }

  function reading(sensor) {
    return sensor.type === 'motion' ? (sensor.value === 1 ? 'Detectado' : 'Sin movimiento') : format(sensor.value);
  }

  function renderSensors() {
    const grid = $('sensor-grid');
    if (!grid) return;
    const focused = document.activeElement?.matches?.('.sensor-edit') ? document.activeElement : null;
    const focusedId = focused?.closest('.sensor-card')?.dataset.sensorId;
    let restoreFocus = null;
    grid.replaceChildren();
    const sensors = state.sensors.filter(sensor => room === 'all' || sensor.room === room);
    if (!sensors.length) {
      const empty = document.createElement('div');
      empty.className = 'empty-state';
      const title = document.createElement('strong');
      title.textContent = 'Tu próxima idea empieza aquí';
      const detail = document.createElement('p');
      detail.textContent = 'Añade un sensor o selecciona otra zona para explorar el proyecto.';
      empty.append(title, detail);
      grid.append(empty);
    }
    sensors.forEach(sensor => {
      const card = document.createElement('article');
      card.className = `sensor-card ${sensor.type}${sensor.active ? '' : ' is-paused'}`;
      card.dataset.sensorId = sensor.id;
      const top = document.createElement('div');
      top.className = 'sensor-card-top';
      const icon = document.createElement('span');
      icon.className = `sensor-icon ${sensor.type}`;
      icon.innerHTML = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${TYPES[sensor.type].icon}</svg>`;
      const status = document.createElement('span');
      status.className = `sensor-status${sensor.active ? '' : ' paused'}`;
      status.textContent = sensor.active ? 'Activo' : 'Pausado';
      top.append(icon, status);
      const name = document.createElement('h3');
      name.className = 'sensor-name';
      name.textContent = sensor.name;
      const location = document.createElement('p');
      location.className = 'sensor-room';
      location.textContent = `${sensor.room} · ${TYPES[sensor.type].label}`;
      const value = document.createElement('div');
      value.className = `sensor-reading${sensor.type === 'motion' ? ' is-motion' : ''}`;
      value.append(document.createTextNode(reading(sensor)));
      const unit = document.createElement('span');
      unit.className = 'sensor-unit';
      unit.textContent = sensor.type === 'motion' ? '' : sensor.unit;
      value.append(unit);
      const track = document.createElement('div');
      track.className = 'sensor-track';
      const bar = document.createElement('span');
      bar.style.width = `${clamp((sensor.value - sensor.min) / (sensor.max - sensor.min) * 100, 0, 100)}%`;
      track.append(bar);
      const bottom = document.createElement('div');
      bottom.className = 'sensor-bottom';
      const tag = document.createElement('span');
      tag.className = 'sensor-tag';
      tag.textContent = sensor.type === 'motion' ? 'Digital · 0 / 1' : `${format(sensor.min)} – ${format(sensor.max)} ${sensor.unit}`;
      const edit = document.createElement('button');
      edit.type = 'button';
      edit.className = 'sensor-edit';
      edit.textContent = 'Editar ↗';
      edit.setAttribute('aria-label', `Editar ${sensor.name}`);
      edit.addEventListener('click', () => openSensor(sensor.id));
      if (sensor.id === focusedId) restoreFocus = edit;
      bottom.append(tag, edit);
      card.append(top, name, location, value, track, bottom);
      card.addEventListener('click', event => { if (!event.target.closest('button')) openSensor(sensor.id); });
      grid.append(card);
    });
    document.querySelectorAll('[data-room]').forEach(button => {
      const active = button.dataset.room === room;
      button.classList.toggle('active', active);
      button.setAttribute('aria-pressed', String(active));
    });
    restoreFocus?.focus({ preventScroll: true });
  }

  function renderChart() {
    const sensor = state.sensors.find(s => s.type === selectedChart && s.active) || state.sensors.find(s => s.type === selectedChart);
    document.querySelectorAll('[data-chart]').forEach(button => {
      const active = button.dataset.chart === selectedChart;
      button.classList.toggle('active', active);
      button.setAttribute('aria-pressed', String(active));
    });
    text('chart-title', sensor ? sensor.name : TYPES[selectedChart].label);
    text('chart-value', sensor ? format(sensor.value) : '—');
    text('chart-unit', sensor ? sensor.unit : 'Sin sensor');
    if (!sensor) {
      $('chart-line')?.setAttribute('d', '');
      $('chart-area')?.setAttribute('d', '');
      return;
    }
    const values = seedHistory(sensor);
    const range = sensor.max - sensor.min;
    const low = Math.max(sensor.min, Math.min(...values) - range * 0.08);
    const high = Math.min(sensor.max, Math.max(...values) + range * 0.08);
    const span = high - low || 1;
    const points = values.map((v, i) => [i * 600 / (values.length - 1), 123 - (v - low) / span * 108]);
    const line = points.map((p, i) => `${i ? 'L' : 'M'} ${p[0].toFixed(1)} ${p[1].toFixed(1)}`).join(' ');
    $('chart-line')?.setAttribute('d', line);
    $('chart-area')?.setAttribute('d', `${line} L600 140 L0 140 Z`);
    text('chart-max', `${format(high)} ${sensor.unit}`);
    text('chart-min', `${format(low)} ${sensor.unit}`);
  }

  function render() {
    text('project-title', state.project.name);
    text('project-subtitle', `${state.project.course}${state.project.description ? ` · ${state.project.description}` : ''}`);
    text('team-name', state.project.team);
    text('project-course-label', state.project.course);
    document.title = `${state.project.name} · Nexo`;
    text('stat-sensors', String(state.sensors.length).padStart(2, '0'));
    const average = type => {
      const matches = state.sensors.filter(s => s.type === type && s.active);
      return matches.length ? format(matches.reduce((sum, s) => sum + s.value, 0) / matches.length) : '—';
    };
    const temperature = average('temperature');
    const humidity = average('humidity');
    text('stat-temperature', temperature === '—' ? temperature : `${temperature}°`);
    text('stat-humidity', humidity === '—' ? humidity : `${humidity}%`);
    text('stat-active', `${state.sensors.filter(s => s.active).length} / ${state.sensors.length}`);
    text('connection-label', state.settings.simulation ? 'Simulación activa' : 'Simulación pausada');
    text('last-updated', `Última lectura · ${time(lastUpdate)}`);
    const simulation = $('simulation-toggle');
    if (simulation) {
      simulation.setAttribute('aria-pressed', String(state.settings.simulation));
      simulation.classList.toggle('is-paused', !state.settings.simulation);
      const pulse = document.createElement('span');
      pulse.className = 'pulse-dot';
      pulse.setAttribute('aria-hidden', 'true');
      const label = document.createElement('span');
      label.textContent = state.settings.simulation ? 'Pausar simulación' : 'Reanudar simulación';
      simulation.replaceChildren(pulse, label);
    }
    for (const key of ['lights', 'climate', 'security']) {
      const element = $(`${key}-toggle`);
      if (element) {
        element.setAttribute('aria-checked', String(state.settings[key]));
        element.classList.toggle('on', state.settings[key]);
      }
    }
    if ($('light-level')) $('light-level').value = state.settings.brightness;
    text('light-output', `${format(state.settings.brightness)}%`);
    for (const scene of ['home', 'away', 'night']) {
      $(`scene-${scene}`)?.classList.toggle('active', state.settings.scene === scene);
      $(`scene-${scene}`)?.setAttribute('aria-pressed', String(state.settings.scene === scene));
    }
    renderSensors();
    renderChart();
  }

  function openDialog(id) {
    const dialog = $(id);
    if (dialog && !dialog.open) dialog.showModal();
  }

  function openSensor(id) {
    const sensor = state.sensors.find(s => s.id === id);
    const draft = sensor || { id: '', name: '', type: 'temperature', room: 'Sala', value: 24, unit: '°C', min: 0, max: 50, active: true };
    text('sensor-dialog-title', sensor ? 'Editar sensor' : 'Nuevo sensor');
    for (const field of ['id', 'name', 'type', 'room', 'value', 'unit', 'min', 'max']) if ($(`sensor-${field}`)) $(`sensor-${field}`).value = draft[field];
    if ($('sensor-active')) $('sensor-active').checked = draft.active;
    if ($('delete-sensor')) $('delete-sensor').hidden = !sensor;
    text('sensor-error', '');
    openDialog('sensor-dialog');
  }

  function init() {
    on('add-sensor', 'click', () => {
      if (state.sensors.length >= 32) return toast('El proyecto admite hasta 32 sensores.');
      openSensor();
    });
    on('sensor-type', 'change', () => {
      const type = TYPES[$('sensor-type').value];
      $('sensor-unit').value = type.unit;
      $('sensor-min').value = type.min;
      $('sensor-max').value = type.max;
      $('sensor-value').value = $('sensor-type').value === 'motion' ? 0 : clamp(Number($('sensor-value').value), type.min, type.max);
    });
    on('sensor-form', 'submit', event => {
      event.preventDefault();
      try {
        const id = $('sensor-id').value || `sensor-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`;
        const sensor = { id, name: $('sensor-name').value, type: $('sensor-type').value, room: $('sensor-room').value, value: Number($('sensor-value').value), unit: $('sensor-unit').value, min: Number($('sensor-min').value), max: Number($('sensor-max').value), active: $('sensor-active').checked };
        const existing = state.sensors.some(s => s.id === id);
        const candidate = clone(state);
        candidate.sensors = existing ? candidate.sensors.map(s => s.id === id ? sensor : s) : [...candidate.sensors, sensor];
        state = validateConfig(candidate);
        histories.delete(id);
        lastUpdate = new Date();
        persist(); render(); $('sensor-dialog').close();
        addActivity(`${existing ? 'Sensor actualizado' : 'Sensor añadido'}: ${sensor.name}`, 'success');
        toast(existing ? 'Cambios guardados.' : 'Sensor añadido al proyecto.');
      } catch (error) { text('sensor-error', error.message); }
    });
    on('delete-sensor', 'click', () => {
      const id = $('sensor-id').value;
      const sensor = state.sensors.find(s => s.id === id);
      if (!sensor) return;
      state.sensors = state.sensors.filter(s => s.id !== id);
      histories.delete(id);
      persist(); render(); $('sensor-dialog').close();
      addActivity(`Sensor eliminado: ${sensor.name}`, 'warning');
      toast('Sensor eliminado. Puedes recuperarlo importando una copia exportada.');
    });
    on('edit-project', 'click', () => {
      for (const field of ['name', 'team', 'course', 'description']) if ($(`project-${field}`)) $(`project-${field}`).value = state.project[field];
      text('project-error', '');
      openDialog('project-dialog');
    });
    on('project-form', 'submit', event => {
      event.preventDefault();
      try {
        const candidate = clone(state);
        for (const field of ['name', 'team', 'course', 'description']) candidate.project[field] = $(`project-${field}`).value;
        state = validateConfig(candidate);
        persist(); render(); $('project-dialog').close();
        addActivity('Datos del proyecto actualizados', 'success');
        toast('Tu proyecto ya tiene su propia identidad.');
      } catch (error) { text('project-error', error.message); }
    });
    document.querySelectorAll('[data-close]').forEach(button => button.addEventListener('click', () => button.closest('dialog')?.close()));
    document.querySelectorAll('dialog').forEach(dialog => dialog.addEventListener('click', event => {
      if (event.target !== dialog) return;
      const box = dialog.getBoundingClientRect();
      if (event.clientX < box.left || event.clientX > box.right || event.clientY < box.top || event.clientY > box.bottom) dialog.close();
    }));
    document.querySelectorAll('[data-room]').forEach(button => button.addEventListener('click', () => { room = button.dataset.room; renderSensors(); }));
    document.querySelectorAll('[data-chart]').forEach(button => button.addEventListener('click', () => { selectedChart = button.dataset.chart; renderChart(); }));
    on('simulation-toggle', 'click', () => {
      state.settings.simulation = !state.settings.simulation;
      persist(); render();
      addActivity(state.settings.simulation ? 'Simulación de lecturas reanudada' : 'Simulación pausada · edición manual disponible');
      toast(state.settings.simulation ? 'Los datos de ejemplo cambian cada 5 segundos.' : 'Simulación pausada. Puedes introducir tus propias lecturas.');
    });
    const actuatorNames = { lights: 'Iluminación', climate: 'Climatización', security: 'Seguridad' };
    for (const key of Object.keys(actuatorNames)) on(`${key}-toggle`, 'click', () => {
      state.settings[key] = !state.settings[key];
      state.settings.scene = 'custom';
      persist(); render();
      addActivity(`${actuatorNames[key]} ${state.settings[key] ? 'activada' : 'desactivada'} · demo`);
    });
    on('light-level', 'input', () => {
      state.settings.brightness = clamp(Number($('light-level').value), 0, 100);
      state.settings.scene = 'custom';
      text('light-output', `${format(state.settings.brightness)}%`);
      for (const scene of ['home', 'away', 'night']) {
        $(`scene-${scene}`)?.classList.remove('active');
        $(`scene-${scene}`)?.setAttribute('aria-pressed', 'false');
      }
      persist();
    });
    on('light-level', 'change', () => addActivity(`Brillo ajustado al ${format(state.settings.brightness)}% · demo`));
    const scenes = {
      home: { lights: true, climate: true, security: false, brightness: 80, label: 'En casa' },
      away: { lights: false, climate: false, security: true, brightness: 0, label: 'Fuera de casa' },
      night: { lights: true, climate: false, security: true, brightness: 20, label: 'Modo noche' }
    };
    for (const [name, scene] of Object.entries(scenes)) on(`scene-${name}`, 'click', () => {
      Object.assign(state.settings, { lights: scene.lights, climate: scene.climate, security: scene.security, brightness: scene.brightness, scene: name });
      persist(); render(); addActivity(`Escena «${scene.label}» aplicada · demo`, 'success');
      toast(`Escena ${scene.label.toLowerCase()} aplicada a los controles de ejemplo.`);
    });
    on('export-config', 'click', () => {
      const blob = new Blob([JSON.stringify(state, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `${state.project.name.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || 'nexo'}-config.json`;
      document.body.append(link); link.click(); link.remove();
      setTimeout(() => URL.revokeObjectURL(url), 2000);
      addActivity('Configuración exportada como JSON', 'success');
      toast('Configuración exportada. Guarda esta copia para compartir tu proyecto.');
    });
    on('import-trigger', 'click', () => $('import-config')?.click());
    on('import-config', 'change', async event => {
      const file = event.target.files[0];
      if (!file) return;
      try {
        if (file.size > 262144) throw new Error('El archivo es demasiado grande (máximo 256 KB).');
        const imported = validateConfig(JSON.parse(await file.text()));
        state = imported; room = 'all'; histories.clear(); lastUpdate = new Date();
        persist(); render(); addActivity('Configuración importada correctamente', 'success');
        toast('Proyecto importado. Tus datos anteriores se han reemplazado.');
      } catch (error) {
        toast(error instanceof SyntaxError ? 'El archivo no contiene JSON válido. Tu proyecto sigue intacto.' : error.message);
      } finally { event.target.value = ''; }
    });
    on('reset-demo', 'click', () => openDialog('reset-dialog'));
    on('confirm-reset', 'click', () => {
      state = defaultState(); room = 'all'; selectedChart = 'temperature'; histories.clear(); lastUpdate = new Date();
      activities.length = 0; persist(); render(); $('reset-dialog')?.close();
      addActivity('Proyecto de ejemplo restaurado', 'success'); toast('Ejemplo restaurado. Listo para volver a experimentar.');
    });
    for (const name of ['overview', 'sensors', 'activity', 'settings']) on(`nav-${name}`, 'click', () => {
      document.querySelectorAll('.nav-link').forEach(button => {
        button.classList.remove('active');
        button.removeAttribute('aria-current');
      });
      $(`nav-${name}`)?.classList.add('active');
      $(`nav-${name}`)?.setAttribute('aria-current', 'page');
      $(`${name}-section`)?.scrollIntoView({ behavior: window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'instant' : 'smooth', block: 'start' });
    });
    text('clock-time', time(new Date()));
    setInterval(() => text('clock-time', time(new Date())), 30000);
    render();
    addActivity('Proyecto listo · datos de demostración', 'success');
    addActivity('Personaliza el nombre y los sensores para empezar');
    if (loadWarning) toast(loadWarning);
    setInterval(() => {
      if (!state.settings.simulation || document.hidden || $('sensor-dialog')?.open) return;
      state.sensors.filter(sensor => sensor.active).forEach(sensor => {
        if (sensor.type === 'motion') sensor.value = Math.random() > 0.91 ? 1 : 0;
        else {
          const step = (sensor.max - sensor.min) * 0.008;
          const precision = sensor.type === 'temperature' ? 10 : 1;
          sensor.value = clamp(Math.round((sensor.value + (Math.random() - 0.5) * step) * precision) / precision, sensor.min, sensor.max);
        }
        const values = seedHistory(sensor);
        values.push(sensor.value); values.shift();
      });
      lastUpdate = new Date(); persist(); render();
    }, 5000);
  }

  // Punto de integración para estudiantes: Nexo.updateSensor('temperatura-sala', 26.3).
  // Esta API actualiza la interfaz; la conexión a ESP32/Arduino/MQTT debe implementarse aparte.
  window.Nexo = Object.freeze({
    getState: () => clone(state),
    updateSensor(id, value) {
      const sensor = state.sensors.find(s => s.id === id);
      if (!sensor) throw new Error('No existe un sensor con ese identificador.');
      if (!finite(value) || value < sensor.min || value > sensor.max || (sensor.type === 'motion' && ![0, 1].includes(value))) throw new Error('La lectura está fuera del rango del sensor.');
      sensor.value = value;
      const values = seedHistory(sensor); values.push(value); values.shift();
      lastUpdate = new Date(); persist(); render();
      window.dispatchEvent(new CustomEvent('nexo:sensor-update', { detail: { id, value } }));
      return clone(sensor);
    }
  });

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init, { once: true });
  else init();
})();
