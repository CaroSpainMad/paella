/* Motor de cálculo — Paella valenciana (secciones 13-14 de la guía).
   Sin dependencias, sin DOM. Funciona en navegador (window.PaellaEngine) y Node (module.exports).
   Evidencia: F = fuente citada · P = práctica extendida · I = inferencia (calibrar). */
(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory();
  else root.PaellaEngine = factory();
})(typeof self !== 'undefined' ? self : this, function () {
  'use strict';

  /* ───────────── Constantes ───────────── */
  var TALLAS = [28, 30, 32, 34, 36, 38, 40, 42, 46, 50, 55, 60, 65, 70, 75, 80, 85, 90, 100, 115, 130];
  var AGUA_BASE = [[0, 0], [100, 400], [200, 700], [400, 1350], [600, 1850], [800, 2300], [1000, 2750], [1200, 3250]];
  var PENDIENTE_SOBRE_1200 = 2.5;
  var FACTOR_AGUA_INICIAL = 1.30;
  var ALT_FACTOR_100M = 0.018;
  var G_PERSONA = { plato_unico: 100, con_entrantes_postre: 80, degustacion: 50 };
  var APETITO = { ligero: 0.8, normal: 1, grande: 1.2 };
  var CAPA_K = { fina: [5.3, 6.25], media: [3.2, 4.0], gruesa: [2.0, 2.6] };
  var VARIEDAD = {
    senia:        { n: 'Senia',        t: 15.5, f: 0.95, tol: 'baja' },
    bahia:        { n: 'Bahía',        t: 16,   f: 0.95, tol: 'baja' },
    albufera:     { n: 'Albufera',     t: 17,   f: 1.00, tol: 'media-alta' },
    bomba:        { n: 'Bomba',        t: 18,   f: 1.08, tol: 'alta' },
    otra_redonda: { n: 'Otro redondo', t: 16.5, f: 1.00, tol: 'media' }
  };
  var ESTILO_F = { seca_clasica: 1.00, seca_jugosa: 1.07, casi_meloso: 1.18 };
  var FUENTE_F = { gas_paellero: 1.00, gas_cocina: 1.00, lena: 1.05, carbon: 1.05, induccion: 0.95, vitroceramica: 0.95, horno_final: 0.85, horno_total: 0.85 };
  var SOCARRAT_S = { ninguno: 0, suave: 35, marcado: 75, intenso: 105 };
  var ENCENDIDO_MIN = { gas_paellero: 5, gas_cocina: 2, lena: 40, carbon: 25, induccion: 3, vitroceramica: 4, horno_final: 15, horno_total: 15 };
  var GAS_KW = {
    butano:    { 20: 5.65, 30: 10.85, 40: 15.05, 50: 21.85, 60: 25.75, 70: 33.85 },
    propano50: { 20: 6.55, 30: 12.55, 40: 17.50, 50: 23.35, 60: 29.95, 70: 38.60 },
    natural:   { 20: 6.40, 30: 9.67,  40: 15.76, 50: 20.22, 60: 23.70, 70: 31.20 }
  };
  var AROS = { 20: 1, 30: 1, 40: 2, 50: 2, 60: 3, 70: 3 };
  var QUEMADORES = [20, 30, 40, 50, 60, 70];
  var KWH_KG_BUTANO = 12.7;
  var COCINA_QUEMADOR_EQ_CM = 24; /* [I] equivalente de un fuego doméstico grande */

  var CIUDADES = {
    sevilla:   { n: 'Sevilla',   alt: 10,  fh: 12.3 },
    valencia:  { n: 'Valencia',  alt: 15,  fh: 28 },
    madrid:    { n: 'Madrid',    alt: 650 },
    barcelona: { n: 'Barcelona', alt: 12 },
    bilbao:    { n: 'Bilbao',    alt: 19 },
    zaragoza:  { n: 'Zaragoza',  alt: 200 },
    granada:   { n: 'Granada',   alt: 680 },
    alicante:  { n: 'Alicante',  alt: 7 },
    otra:      { n: 'Otra (manual)' }
  };

  var DEFAULTS = {
    n_adultos: 4, n_ninos_mayores: 0, n_ninos_pequenos: 0, apetito: 'normal', tipo_comida: 'plato_unico',
    arroz_g_persona_override: 0, margen_invitados: 10, repetir: false, dietas: [], ritmo_servicio: 'inmediato', ocasion: 'familiar',
    paella_diametro_cm: 0, paella_base_cm: 0, paella_material: 'acero_pulido', paella_fondo: 'concavo',
    paella_profundidad_cm: 6, paella_nivelada: false, paella_estado: 'curada', capa_objetivo: 'fina',
    fuente_calor: 'gas_paellero',
    gas_tipo: 'butano', gas_presion_mbar: 28, regulador_ok: true, quemador_diametro_cm: 0, quemador_aros: 0, quemador_tubo: 'redondo', cocina_kw: 3,
    lena_especie: 'naranjo', lena_estado: 'bien_curada', lena_calibres: ['arremulla', 'mitjaneta', 'branqueta'], fogon_tipo: 'trebede_suelo',
    carbon_tipo: 'encina', carbon_soporte: 'barbacoa_con_parrilla', carbon_ventilacion: true, carbon_encendido: 'chimenea_encendido',
    placa_zona_cm: 28, placa_potencia_w: 2400,
    horno_temp_c: 200, horno_calor: 'arriba_abajo',
    ciudad: 'sevilla', altitud_m: 10, temp_ext_c: 22, humedad_pct: 55, viento: 'ninguno', paravientos: true,
    lluvia: 'no', lugar: 'exterior_abierto', sol: false, estacion: 'otono', hora: 'mediodia',
    agua_origen: 'grifo', agua_dureza_fh: 12.3, agua_cloro: false, agua_temp_inicial: 'ambiente', agua_medida_metodo: 'jarra',
    arroz_variedad: 'senia', arroz_do: true,
    modo_ortodoxia: 'estricto_wikipaella',
    pollo_tipo: 'corral', pollo_g_persona: 160, conejo_g_persona: 110, pato: false, costilla_cerdo: false, caracoles: 'no',
    ferradura_estado: 'fresca', ferradura_g_persona: 80, garrofon_estado: 'fresco', garrofon_g_persona: 50,
    tavella: 'auto', alcachofa: 'auto', habas_tiernas: false, ajo: false,
    tomate_tipo: 'rallado_natural', tomate_g_persona: 35, aceite_tipo: 'aove_afrutado_ligero', aceite_ml_persona: 20,
    pimenton: 'vega_baja', azafran_tipo: 'hebras', azafran_g_persona: 0.1, romero: true, sal_g_litro: 10, sal_tipo: 'isla',
    estilo: 'seca_clasica', socarrat: 'marcado', punto_grano: 'al_dente_firme', salado: 'normal',
    azafran_intensidad: 'normal', carnes_melosas: false, reposo_min: 5,
    nivel_cocinero: 'intermedio', n_cocineros: 1, metodo_caldo: 'directo_continuo', lleva_cronometro: true, hora_servicio: '14:30',
    evap_medida_ml: 0, ajuste_agua_pct: 0, ajuste_tiempo_min: 0
  };

  var SEV_ORDER = { bloqueante: 0, alta: 1, media: 2, baja: 3, info: 4 };

  /* ───────────── Utilidades ───────────── */
  function num(x, d) { x = Number(x); return isFinite(x) ? x : d; }
  function clamp(x, a, b) { return Math.max(a, Math.min(b, x)); }
  function rnd(x, step) { return Math.round(x / step) * step; }
  function nearest(arr, x) {
    var best = arr[0], bd = Infinity;
    for (var i = 0; i < arr.length; i++) { var d = Math.abs(arr[i] - x); if (d < bd) { bd = d; best = arr[i]; } }
    return best;
  }
  function interpAgua(arroz) {
    var T = AGUA_BASE, last = T[T.length - 1];
    if (arroz >= last[0]) return last[1] + PENDIENTE_SOBRE_1200 * (arroz - last[0]);
    for (var i = 1; i < T.length; i++) {
      if (arroz <= T[i][0]) {
        var a = T[i - 1], b = T[i];
        return a[1] + (b[1] - a[1]) * (arroz - a[0]) / (b[0] - a[0]);
      }
    }
    return 0;
  }
  function fmtG(g) {
    if (g >= 1000) return (g / 1000).toLocaleString('es-ES', { maximumFractionDigits: 2 }) + ' kg';
    return Math.round(g).toLocaleString('es-ES') + ' g';
  }
  function fmtL(ml) { return (ml / 1000).toLocaleString('es-ES', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + ' L'; }
  function fmtMin(m) {
    var s = Math.round(m * 10) / 10;
    return s.toLocaleString('es-ES', { maximumFractionDigits: 1 }) + ' min';
  }
  function parseHM(s) {
    var m = /^(\d{1,2}):(\d{2})$/.exec(String(s || ''));
    return m ? (+m[1]) * 60 + (+m[2]) : 14 * 60 + 30;
  }
  function fmtHM(min) {
    var dia = 0;
    while (min < 0) { min += 1440; dia--; }
    min = Math.round(min) % 1440;
    var h = Math.floor(min / 60), m = min % 60;
    return (h < 10 ? '0' : '') + h + ':' + (m < 10 ? '0' : '') + m + (dia < 0 ? ' (día anterior)' : '');
  }
  function gasKey(tipo, pres) {
    if (tipo === 'natural') return 'natural';
    if (tipo === 'propano' && pres >= 50) return 'propano50';
    return 'butano';
  }
  function seasonFromDate(d) {
    var m = (d || new Date()).getMonth() + 1;
    if (m === 12 || m <= 2) return 'invierno';
    if (m <= 5) return 'primavera';
    if (m <= 8) return 'verano';
    return 'otono';
  }

  /* ───────────── Cálculo principal ───────────── */
  function compute(input) {
    var S = {}, k;
    for (k in DEFAULTS) S[k] = DEFAULTS[k];
    for (k in (input || {})) if (input[k] !== undefined && input[k] !== null) S[k] = input[k];

    var R = { alerts: [], notas: [], autos: {}, factoresAgua: [], tiempos: {}, lista: [] };
    var dietas = S.dietas || [];
    var has = function (x) { return dietas.indexOf(x) >= 0; };
    var alerta = function (sev, msg, id) { R.alerts.push({ sev: sev, msg: msg, id: id || '' }); };
    var fuente = S.fuente_calor;
    var esGas = fuente === 'gas_paellero' || fuente === 'gas_cocina';
    var esPlaca = fuente === 'induccion' || fuente === 'vitroceramica';

    /* 14.1 Arroz */
    var comens = num(S.n_adultos, 0) + 0.6 * num(S.n_ninos_mayores, 0) + 0.4 * num(S.n_ninos_pequenos, 0);
    var gpp = num(S.arroz_g_persona_override, 0) > 0 ? num(S.arroz_g_persona_override, 0) : G_PERSONA[S.tipo_comida] || 100;
    var arrozRaw = comens * gpp * (APETITO[S.apetito] || 1) * (1 + num(S.margen_invitados, 0) / 100) * (S.repetir ? 1.12 : 1);
    var arroz = Math.round(arrozRaw / 5) * 5;
    R.comensales = comens; R.g_persona = gpp; R.arroz_g = arroz;
    var vr = VARIEDAD[S.arroz_variedad] || VARIEDAD.senia;
    if (arroz <= 0) {
      alerta('alta', 'Indica al menos un comensal para calcular la paella.', 'sin_comensales');
      R.vacio = true; return R;
    }

    /* 14.2 Diámetro */
    var kr = CAPA_K[S.capa_objetivo] || CAPA_K.fina;
    var dmin = Math.sqrt(kr[0] * arroz), dmax = Math.sqrt(kr[1] * arroz), dmid = Math.sqrt((kr[0] + kr[1]) / 2 * arroz);
    var dRec = nearest(TALLAS, dmid);
    var dReal = num(S.paella_diametro_cm, 0) > 0 ? num(S.paella_diametro_cm, 0) : dRec;
    var baseAuto = Math.round(dReal * 0.82); /* [I] base útil ≈ 82 % del diámetro superior */
    var baseReal = num(S.paella_base_cm, 0) > 0 ? num(S.paella_base_cm, 0) : baseAuto;
    var kReal = dReal * dReal / arroz;
    var capaEst = 7.5 / kReal; /* [I] ajuste a las tablas: k 5,3-6,25 → 1-1,5 cm; k 3,2-4 → ~2 cm */
    R.paella = { d_min: dmin, d_max: dmax, d_rec: dRec, d_real: dReal, base: baseReal, k: kReal, capa_cm: capaEst, auto: !(num(S.paella_diametro_cm, 0) > 0) };
    R.autos.paella_diametro_cm = dRec; R.autos.paella_base_cm = baseAuto;

    /* Quemador / soporte */
    var qEf = null;
    if (fuente === 'gas_paellero') {
      var qAuto = nearest(QUEMADORES, baseReal);
      var qSel = num(S.quemador_diametro_cm, 0) > 0 ? num(S.quemador_diametro_cm, 0) : qAuto;
      var qKey = nearest(QUEMADORES, qSel);
      var gk = gasKey(S.gas_tipo, num(S.gas_presion_mbar, 28));
      var kw = GAS_KW[gk][qKey];
      var arosAuto = AROS[qKey];
      R.autos.quemador_diametro_cm = qAuto; R.autos.quemador_aros = AROS[nearest(QUEMADORES, qSel)];
      R.quemador = { cm: qSel, aros: num(S.quemador_aros, 0) > 0 ? num(S.quemador_aros, 0) : arosAuto, kw: kw, rec_cm: qAuto, rec_aros: AROS[qAuto], gas_col: gk };
      qEf = qSel;
    } else if (fuente === 'gas_cocina') {
      R.quemador = { cm: COCINA_QUEMADOR_EQ_CM, aros: 1, kw: num(S.cocina_kw, 3), rec_cm: null, cocina: true };
      qEf = COCINA_QUEMADOR_EQ_CM;
    } else if (esPlaca) {
      qEf = num(S.placa_zona_cm, 28);
    }

    /* 14.4 Agua */
    var base, calibrado = num(S.evap_medida_ml, 0) > 0;
    base = calibrado ? arroz + num(S.evap_medida_ml, 0) : interpAgua(arroz);
    var F = R.factoresAgua;
    var addF = function (n, v, ev, det) { F.push({ n: n, v: v, ev: ev, det: det || '' }); };
    var alt = num(S.altitud_m, 0);
    var prod = 1;
    addF('Variedad: ' + vr.n, vr.f, 'I', 'Bomba admite más líquido; Senia y Bahía menos'); prod *= vr.f;
    var fe = ESTILO_F[S.estilo] || 1;
    addF('Estilo de arroz', fe, 'I', S.estilo.replace(/_/g, ' ')); prod *= fe;
    var acuosa = (S.alcachofa === 'auto' ? S.estacion === 'invierno' : S.alcachofa === 'si');
    var fv = acuosa ? 0.97 : 1;
    addF('Verdura acuosa (alcachofa)', fv, 'I', acuosa ? 'La alcachofa aporta jugo' : 'No aplica'); prod *= fv;
    if (!calibrado) {
      var fa = 1 + ALT_FACTOR_100M * alt / 100;
      addF('Altitud ' + Math.round(alt) + ' m', fa, 'F/I', '+1,8 % por cada 100 m (Rioja: +10-15 % a ~700 m)'); prod *= fa;
      var ff = FUENTE_F[fuente] || 1;
      addF('Fuente de calor', ff, 'I', fuente.replace(/_/g, ' ')); prod *= ff;
      var hum = num(S.humedad_pct, 55), fh = hum > 70 ? 0.97 : hum < 40 ? 1.05 : 1;
      addF('Humedad ' + Math.round(hum) + ' %', fh, 'F/I', hum > 70 ? 'Evaporación lenta' : hum < 40 ? 'Ambiente seco: evapora antes' : 'Normal'); prod *= fh;
      var tc = num(S.temp_ext_c, 22), ft = tc < 10 ? 0.97 : tc > 30 ? 1.05 : 1;
      addF('Temperatura ' + Math.round(tc) + ' ºC', ft, 'I', tc < 10 ? 'Frío' : tc > 30 ? 'Calor' : 'Templado'); prod *= ft;
      var fvto = S.viento === 'fuerte' ? 1.10 : S.viento === 'moderado' ? 1.05 : 1;
      if (fvto > 1.02 && S.paravientos) fvto = 1.02;
      addF('Viento ' + S.viento + (S.viento !== 'ninguno' && S.paravientos ? ' (con paravientos)' : ''), fvto, 'I', ''); prod *= fvto;
      var ratio = dReal / dRec, fp = clamp(1 + 0.5 * (ratio - 1), 0.9, 1.4);
      addF('Paella ' + (ratio > 1.001 ? 'grande' : ratio < 0.999 ? 'pequeña' : 'ajustada') + ' para el arroz', fp, 'F/I', 'd real ' + dReal + ' cm vs recomendado ' + dRec + ' cm'); prod *= fp;
    } else {
      addF('Calibración propia', 1, 'F', 'Evaporación medida ' + num(S.evap_medida_ml, 0) + ' ml: sustituye la tabla base y los factores de entorno/fuego/paella');
    }
    var fpers = 1 + num(S.ajuste_agua_pct, 0) / 100;
    if (fpers !== 1) { addF('Ajuste personal', fpers, 'P', num(S.ajuste_agua_pct, 0) + ' %'); prod *= fpers; }
    var aguaArroz = base * prod;
    var aguaIni = aguaArroz * FACTOR_AGUA_INICIAL;
    R.agua = { base_ml: base, calibrado: calibrado, factor: prod, al_arroz_ml: aguaArroz, inicial_ml: aguaIni, min_ml: aguaArroz * 0.93, max_ml: aguaArroz * 1.07, evaporacion_caldo_ml: aguaIni - aguaArroz };

    /* Dureza efectiva */
    var fhIn = num(S.agua_dureza_fh, 12.3), durEf = fhIn;
    if (S.agua_origen === 'mineral_debil') durEf = 4;
    else if (S.agua_origen === 'mineral_media_fuerte') durEf = 25;
    else if (S.agua_origen === 'osmosis') durEf = 1;
    R.agua.dureza_ef = durEf;
    R.agua.clase = durEf < 10 ? 'blanda' : durEf <= 25 ? 'media' : 'dura';
    var recAgua = {
      grifo: 'Agua del grifo' + (S.agua_cloro ? ': déjala reposar 1-2 h en jarra abierta o fíltrala' : ''),
      grifo_filtrado: 'Grifo filtrado (sin cloro): buena opción',
      mineral_debil: 'Mineral de mineralización débil: neutra, el arroz tiende a pasarse antes',
      mineral_media_fuerte: 'Mineral de mineralización media-fuerte: imita el efecto "cal" valenciano',
      osmosis: 'Ósmosis/destilada: muy blanda, el arroz queda más suelto pero se pasa antes',
      caldo_preparado: 'Caldo preparado: no es la receta tradicional'
    };
    R.agua.recomendacion = recAgua[S.agua_origen] || '';

    /* 14.5 Tiempos */
    var T = R.tiempos;
    var mods = [];
    var addM = function (n, v, ev) { if (v) mods.push({ n: n, v: v, ev: ev }); };
    T.base = vr.t;
    addM('Altitud ' + Math.round(alt) + ' m (+2 min cada 700 m)', 2 * alt / 700, 'F');
    if (S.arroz_variedad !== 'bomba') {
      if (durEf < 10) addM('Agua blanda (' + durEf.toFixed(1).replace('.', ',') + ' ºfH)', -1, 'I');
      else if (durEf <= 25) addM('Agua media (' + durEf.toFixed(1).replace('.', ',') + ' ºfH)', -0.5, 'I');
    }
    if (fuente === 'lena' || fuente === 'carbon') addM('Leña / carbón', 0.5, 'I');
    if (esPlaca) addM('Inducción / vitrocerámica (inercia)', 1, 'I');
    if (num(S.temp_ext_c, 22) < 10) addM('Frío (< 10 ºC)', 2, 'I');
    if (S.estilo !== 'seca_clasica') addM('Estilo más jugoso', -1, 'I');
    if (S.punto_grano === 'tierno') addM('Grano tierno', 1, 'I');
    if (qEf !== null && esGas) {
      var dq = baseReal - qEf;
      if (dq > 2) addM('Quemador pequeño para la base (> 2 cm)', 2, 'I');
      else if (dq > 0) addM('Quemador algo justo para la base', 1, 'I');
    }
    if (num(S.ajuste_tiempo_min, 0)) addM('Ajuste personal', num(S.ajuste_tiempo_min, 0), 'P');
    var suma = 0; mods.forEach(function (m) { suma += m.v; });
    T.mods = mods;
    var tTotal = Math.max(8, T.base + suma);
    T.dorado = 12; T.verduras = 5; T.tomate = 4;
    T.hasta_hervir = S.agua_temp_inicial === 'caliente' ? 2 : 6; /* [I] */
    T.caldo = (S.carnes_melosas ? 37 : 27);
    T.enfriado = S.metodo_caldo === 'caldo_enfriado' ? 30 : 0;
    T.reposo = num(S.reposo_min, 5);
    T.encendido = ENCENDIDO_MIN[fuente] || 5;
    var fase1 = 9, socS = SOCARRAT_S[S.socarrat] != null ? SOCARRAT_S[S.socarrat] : 75;
    var fase2;
    if (fuente === 'horno_total') {
      var tt = clamp(35 - (num(S.horno_temp_c, 200) - 180) * 15 / 40, 15, 40);
      tTotal = tt + num(S.ajuste_tiempo_min, 0); fase1 = 0; socS = 0; fase2 = tTotal;
      T.modo = 'horno_total';
    } else if (fuente === 'horno_final') {
      fase2 = clamp(tTotal - fase1 - socS / 60, 5, 8);
      tTotal = fase1 + fase2 + socS / 60;
      T.modo = 'horno_final';
    } else {
      fase1 = Math.min(fase1, Math.max(1, tTotal - 1));
      fase2 = tTotal - fase1 - socS / 60;
      T.modo = 'normal';
    }
    if (fase2 < 0) { alerta('media', 'El tiempo de arroz no alcanza para fase 1 + ráfaga de socarrat: reduce la ráfaga o revisa los ajustes de tiempo.', 'fase2_neg'); fase2 = 0; }
    T.total = tTotal; T.fase1 = fase1; T.fase2 = fase2; T.socarrat_s = socS;
    T.grano_desde = Math.max(1, tTotal - 3);

    /* Cronograma hacia atrás (14.10) */
    var tServ = parseHM(S.hora_servicio);
    var pasos = [];
    pasos.push({ id: 'reposo', n: 'Reposo (tapada con papel o paño)', d: T.reposo });
    if (socS > 0 && fuente !== 'horno_total') pasos.push({ id: 'socarrat', n: 'Ráfaga final de fuego (socarrat)', d: socS / 60 });
    if (fuente === 'horno_total') pasos.push({ id: 'arroz', n: 'Arroz en horno a ' + num(S.horno_temp_c, 200) + ' ºC', d: tTotal });
    else if (fuente === 'horno_final') {
      pasos.push({ id: 'arroz2', n: 'Terminar en horno a ' + num(S.horno_temp_c, 200) + ' ºC', d: fase2 });
      pasos.push({ id: 'arroz1', n: 'Arroz, fase 1 (fuego fuerte)', d: fase1 });
    } else {
      if (fase2 > 0) pasos.push({ id: 'arroz2', n: 'Arroz, fase 2 (fuego medio-bajo)', d: fase2 });
      pasos.push({ id: 'arroz1', n: 'Arroz, fase 1 (fuego fuerte)', d: fase1 });
    }
    if (T.enfriado) pasos.push({ id: 'enfriado', n: 'Enfriar el caldo fuera del fuego (técnica avanzada) y volver a subir el fuego', d: T.enfriado });
    pasos.push({ id: 'caldo', n: 'Caldo: ebullición viva (rectificar sal, retirar romero)', d: T.caldo });
    pasos.push({ id: 'hervir', n: 'Agua + garrofón + romero: hasta que hierva', d: T.hasta_hervir });
    pasos.push({ id: 'tomate', n: 'Tomate reducido + pimentón (agua enseguida)', d: T.tomate });
    pasos.push({ id: 'verdura', n: 'Verduras (judía, alcachofa)', d: T.verduras });
    pasos.push({ id: 'dorado', n: 'Dorar pollo y conejo (hígado al final)', d: T.dorado });
    pasos.push({ id: 'encendido', n: fuente === 'lena' ? 'Encender la leña y dejar bajar la llama' : fuente === 'carbon' ? 'Encender el carbón hasta brasa viva' : esGas || esPlaca ? 'Preparar el fuego y nivelar la paella' : 'Precalentar y preparar', d: T.encendido });
    pasos.reverse();
    var inicios = {}, acum = tServ;
    var orig = pasos.slice().reverse(); /* orden: reposo ... encendido */
    for (var i = 0; i < orig.length; i++) { acum -= orig[i].d; inicios[orig[i].id] = acum; }
    R.cronograma = pasos.map(function (p) { return { id: p.id, n: p.n, d: p.d, inicio: inicios[p.id], hora: fmtHM(inicios[p.id]) }; });
    R.cronograma.push({ id: 'servir', n: 'Servir en la propia paella', d: 0, inicio: tServ, hora: fmtHM(tServ) });
    R.t_fuego_inicio = fmtHM(R.cronograma[0].inicio);
    R.minutos_fuego = T.dorado + T.verduras + T.tomate + T.hasta_hervir + T.caldo + T.enfriado + tTotal;

    /* 14.6 Plan de fuego */
    var P = {
      gas:     { dorado: [70, '70 %'], verdura: [55, '50-60 %'], caldo: [90, '80-100 %'], arroz1: [100, '100 %'], arroz2: [42, '35-50 %'], socarrat: [95, '90-100 % durante ' + socS + ' s'], fin: [0, '0 %'] },
      lena:    { dorado: [60, 'Llama media (mitjaneta)'], verdura: [40, 'Llama baja y constante'], caldo: [85, 'Hervor vivo'], arroz1: [100, 'Vivo, arremulla'], arroz2: [30, 'Quitar leña, apartar brasas'], socarrat: [90, 'Brasa fuerte bajo la paella'], fin: [0, 'Apartar de la brasa'] },
      carbon:  { dorado: [60, 'Cama de brasas pareja'], verdura: [45, 'Zona media'], caldo: [85, 'Brasas altas'], arroz1: [100, 'Brasas altas, aire abierto'], arroz2: [35, 'Cerrar el aire parcialmente'], socarrat: [90, 'Aire abierto o acercar brasa'], fin: [0, 'Apartar'] },
      placa:   { dorado: [75, '70-80 %'], verdura: [55, '50-60 %'], caldo: [95, '90-100 %'], arroz1: [100, '100 %'], arroz2: [45, '40-50 % (anticipa por inercia)'], socarrat: [95, '90-100 % durante ' + socS + ' s'], fin: [0, '0 %'] }
    };
    var fam = esGas ? 'gas' : fuente === 'lena' ? 'lena' : fuente === 'carbon' ? 'carbon' : 'placa';
    var plan = P[fam];
    var fases = [
      ['dorado', 'Aceite y dorado', T.dorado], ['verdura', 'Verdura y tomate', T.verduras + T.tomate],
      ['caldo', 'Caldo', T.hasta_hervir + T.caldo], ['arroz1', 'Arroz, fase 1', fase1], ['arroz2', 'Arroz, fase 2', fase2],
      ['socarrat', 'Socarrat', socS / 60], ['fin', 'Fin y reposo', T.reposo]
    ];
    var kwNom = R.quemador && R.quemador.kw ? R.quemador.kw : 0;
    R.planFuego = fases.filter(function (f) { return f[2] > 0 || f[0] === 'fin'; }).map(function (f) {
      var pl = plan[f[0]], txt = pl[1];
      if (fuente === 'horno_final' && f[0] === 'arroz2') { pl = [0, 'Horno ' + num(S.horno_temp_c, 200) + ' ºC (' + (S.horno_calor === 'aire' ? 'aire' : 'arriba y abajo') + ')']; txt = pl[1]; }
      if (fuente === 'horno_total') { if (f[0] === 'arroz1' || f[0] === 'arroz2') return null; }
      return { id: f[0], fase: f[1], min: f[2], pct: pl[0], txt: txt, kw: (esGas && kwNom && pl[0] > 0) ? kwNom * pl[0] / 100 : null };
    }).filter(Boolean);
    if (fuente === 'horno_total') R.planFuego.splice(3, 0, { id: 'arroz', fase: 'Arroz en horno', min: tTotal, pct: 0, txt: 'Horno ' + num(S.horno_temp_c, 200) + ' ºC (' + (S.horno_calor === 'aire' ? 'aire' : 'arriba y abajo') + ')', kw: null });

    /* 14.7 Gas */
    if (esGas && kwNom) {
      var horas = R.minutos_fuego / 60;
      var kwh = kwNom * 0.65 * horas;
      R.gas = { kw: kwNom, horas: horas, kwh: kwh, kg: S.gas_tipo === 'natural' ? null : kwh / KWH_KG_BUTANO };
    }

    /* Ingredientes (14.3 + reglas de dieta/ortodoxia) */
    var pato = !!S.pato, costilla = !!S.costilla_cerdo;
    if (has('sin_cerdo') && costilla) { costilla = false; R.notas.push('Dieta "sin cerdo": se ha quitado la costilla.'); }
    var polloBase = comens * num(S.pollo_g_persona, 160);
    var conejoBase = comens * num(S.conejo_g_persona, 110);
    var polloG = polloBase * (pato ? 0.70 : 1);
    var conejoG = conejoBase * (costilla ? 0.80 : 1);
    var patoG = pato ? polloBase * 0.30 : 0;       /* [I] el pato sustituye el 30 % del pollo */
    var costG = costilla ? conejoBase * 0.20 : 0;  /* [I] la costilla sustituye el 20 % del conejo */
    if (has('sin_carne_de_conejo') || has('sin_conejo')) { polloG += conejoG; conejoG = 0; R.notas.push('Dieta "sin conejo": se sustituye por pollo (misma cantidad).'); }
    var carac = S.caracoles;
    if (has('sin_caracoles')) carac = 'no';
    var caracUd = carac === 'pocos' ? 4 : carac === 'muchos' ? 10 : 0;
    var caracN = Math.round(comens * caracUd);
    var ferr = comens * num(S.ferradura_g_persona, 80);
    var garr = comens * num(S.garrofon_g_persona, 50);
    var tom = comens * num(S.tomate_g_persona, 35);
    var aceite = comens * num(S.aceite_ml_persona, 20) * (pato ? 0.70 : 1);
    var azInt = { suave: 0.7, normal: 1, intenso: 1.3 }[S.azafran_intensidad] || 1;
    var azG = comens * num(S.azafran_g_persona, 0.1) * azInt;
    var saladoF = { suave: 0.8, normal: 1, marcado: 1.2 }[S.salado] || 1;
    var salG = (aguaArroz / 1000) * num(S.sal_g_litro, 10) * saladoF;
    var tavOn = S.tavella === 'auto' ? S.estacion === 'verano' : S.tavella === 'si';
    var alcOn = S.alcachofa === 'auto' ? S.estacion === 'invierno' : S.alcachofa === 'si';

    var L = R.lista;
    var add = function (n, q, nota, cat) { L.push({ n: n, q: q, nota: nota || '', cat: cat || '' }); };
    add('Arroz ' + vr.n + (S.arroz_do ? ' D.O. Valencia' : ''), fmtG(arroz), gpp + ' g/pers. · ' + (S.tipo_comida === 'plato_unico' ? 'plato único' : S.tipo_comida === 'con_entrantes_postre' ? 'con entrantes y postre' : 'degustación'), 'base');
    add('Pollo (troceado, con hueso)', fmtG(rnd(polloG, 10)), (S.pollo_tipo || '').replace(/_/g, ' ') + (pato ? ' · −30 % por el pato' : ''), 'carne');
    if (conejoG > 0) add('Conejo (troceado, con hueso)', fmtG(rnd(conejoG, 10)), 'con el hígado' + (costilla ? ' · −20 % por la costilla' : ''), 'carne');
    if (patoG > 0) add('Pato', fmtG(rnd(patoG, 10)), 'zona de la Albufera · cantidad estimada [I]', 'carne');
    if (costG > 0) add('Costilla de cerdo', fmtG(rnd(costG, 10)), 'variante de Castellón · cantidad estimada [I]', 'carne');
    if (caracN > 0) add('Caracoles serranos (vaquetes)', caracN + ' uds', 'al caldo, no al sofrito' + (S.romero ? ' · sin romero' : ''), 'carne');
    add('Judía verde plana (ferradura)', fmtG(rnd(ferr, 10)), S.ferradura_estado === 'congelada' ? 'congelada: suelta agua, 1 min más de sofrito [I]' : 'fresca', 'verdura');
    add('Garrofón', fmtG(rnd(garr, 10)), { fresco: 'fresco desgranado', congelado: 'congelado (mejor alternativa)', seco_remojado: 'seco: remojo previo y más tiempo en el caldo [I]', lata: 'de lata: añadir al final del caldo [I]' }[S.garrofon_estado] || '', 'verdura');
    if (tavOn) add('Tavella (judía blanca tierna)', fmtG(rnd(comens * 30, 10)), 'un puñado por persona · cantidad estimada [I]', 'verdura');
    if (alcOn) add('Alcachofa', Math.max(1, Math.ceil(comens * 0.75)) + ' uds', 'cortar y echar enseguida (agua con limón)', 'verdura');
    if (S.habas_tiernas) add('Habas tiernas', fmtG(rnd(comens * 40, 10)), 'invierno · cantidad estimada [I]', 'verdura');
    add('Tomate ' + ({ rallado_natural: 'rallado natural', triturado: 'triturado', concentrado: 'concentrado' }[S.tomate_tipo] || ''), fmtG(rnd(tom, 5)), 'reducir hasta casi caramelizar', 'base');
    add('Aceite de oliva (' + (S.aceite_tipo === 'aove_intenso' ? 'AOVE intenso' : S.aceite_tipo === 'girasol' ? 'girasol' : 'AOVE afrutado ligero') + ')', Math.round(rnd(aceite, 5)) + ' ml', pato ? '−30 % por el pato' : 'película fina en el fondo', 'base');
    if (S.pimenton !== 'no') add('Pimentón dulce', (Math.round(comens * 0.25 * 4) / 4).toLocaleString('es-ES') + ' cdta.', S.pimenton === 'la_vera' ? 'La Vera: aroma ahumado, no recomendado' : 'Vega Baja · con el tomate y agua enseguida', 'base');
    if (S.azafran_tipo === 'hebras' || S.azafran_tipo === 'polvo') add('Azafrán ' + (S.azafran_tipo === 'polvo' ? 'molido' : 'en hebras'), (Math.round(azG * 100) / 100).toLocaleString('es-ES') + ' g', '≈ ' + Math.round(azG / 0.0125) + ' hebras · tostar y macerar en agua caliente', 'base');
    else add('Colorante (' + (S.azafran_tipo === 'tartrazina_e102' ? 'tartrazina E-102' : 'alimentario') + ')', 'según etiqueta', S.azafran_tipo === 'tartrazina_e102' ? 'no recomendado' : 'revisar etiqueta (alérgenos)', 'base');
    if (S.romero && caracN === 0) add('Romero fresco', '1 ramita', 'se retira antes de echar el arroz', 'base');
    if (S.ajo) add('Ajo', Math.max(1, Math.round(comens / 2)) + ' dientes', 'variante local · cantidad estimada [I]', 'base');
    add('Sal', Math.round(salG).toLocaleString('es-ES') + ' g', num(S.sal_g_litro, 10) + ' g/L × ' + (aguaArroz / 1000).toFixed(2).replace('.', ',') + ' L · rectifica el caldo antes del arroz', 'base');
    add('Agua (' + (S.agua_origen || 'grifo').replace(/_/g, ' ') + ')', fmtL(aguaIni), 'inicial; ' + fmtL(aguaArroz) + ' al echar el arroz', 'base');
    R.cantidades = { pollo: polloG, conejo: conejoG, pato: patoG, costilla: costG, ferradura: ferr, garrofon: garr, tomate: tom, aceite_ml: aceite, azafran_g: azG, sal_g: salG, caracoles: caracN };

    /* Perfil de resultado */
    var PE = {
      seca_clasica: 'Arroz suelto y seco: grano entero con un puntito firme y sin caldo visible al servir.',
      seca_jugosa: 'Seca pero jugosa: el grano queda tierno y húmedo; retira el fuego con ~1 min de cocción pendiente y reposa tapada.',
      casi_meloso: 'En el límite entre paella y arroz meloso. Ya se aleja de la paella valenciana clásica; casi no habrá socarrat.'
    };
    var PS = {
      ninguno: 'Sin socarrat: retira del fuego al final.',
      suave: 'Socarrat suave: costra fina y clara (ráfaga de 30-40 s).',
      marcado: 'Socarrat marcado: costra dorada y crujiente (ráfaga de 60-90 s). Huele a tostado, no a quemado.',
      intenso: 'Socarrat intenso: ráfaga de 90-120 s. Vigílalo; un olor agrio o acre significa que se quema.'
    };
    R.perfil = { estilo: PE[S.estilo] || '', socarrat: PS[S.socarrat] || '' };

    /* 14.8 Recomendación de variedad */
    var recV = [];
    if (S.ritmo_servicio === 'espera_20_min_o_mas' || S.ritmo_servicio === 'a_domicilio') recV.push('Con espera larga o servicio a domicilio conviene Bomba o Albufera.');
    if (S.nivel_cocinero === 'principiante') recV.push('Para principiantes, Bomba o Albufera perdonan más la sobrecocción.');
    if (durEf < 10 && S.arroz_variedad === 'senia') recV.push('Con agua blanda la Senia se pasa antes: resta 1 min y vigila desde el minuto 12.');
    if (durEf >= 25) recV.push('Agua dura: los tiempos de referencia valencianos aplican tal cual.');
    R.recVariedad = recV;

    /* Hecho físico de referencia */
    R.ebullicion_c = 100 - alt / 305;

    /* 14.9 Alertas y validaciones */
    var mat = S.paella_material, fondo = S.paella_fondo;
    if (fuente === 'induccion' && fondo === 'concavo') alerta('bloqueante', 'La paella de fondo cóncavo no sirve para inducción: necesitas base plana ferromagnética (prueba del imán).', 'induccion_concavo');
    if (fuente === 'vitroceramica' && fondo === 'concavo') alerta('alta', 'Fondo cóncavo sobre vitrocerámica: el contacto es deficiente y el calor se reparte mal. Usa base plana.', 'vitro_concavo');
    if (qEf !== null && baseReal > qEf + 2) alerta('alta', 'La base de la paella (' + baseReal + ' cm) supera al ' + (esPlaca ? 'zona de cocción' : 'quemador') + ' (' + Math.round(qEf) + ' cm) en más de 2 cm: los bordes quedarán fríos. Gira la paella o sube de quemador.', 'base_quemador');
    if (fuente === 'gas_paellero' && R.quemador && qEf > baseReal + 10) alerta('baja', 'El quemador (' + qEf + ' cm) es mucho mayor que la base: la llama sube por los laterales y se pierde gas.', 'quemador_grande');
    if (fuente === 'gas_cocina' && dReal > 36) alerta('alta', 'Con fuego de cocina doméstica, paellas de más de 34-36 cm no calientan los bordes. Cocina con paellero exterior o reduce el diámetro.', 'cocina_grande');
    if (!S.paella_nivelada) alerta('media', 'Nivela la paella antes de empezar (compruébalo con agua).', 'nivel');
    if (capaEst > 2) alerta('media', 'La capa de arroz sería de unos ' + capaEst.toFixed(1).replace('.', ',') + ' cm (> 2 cm): usa una paella más grande o reduce el arroz.', 'capa_gruesa');
    else if (kReal > 7.5) alerta('baja', 'Paella muy grande para ese arroz (capa de ' + capaEst.toFixed(1).replace('.', ',') + ' cm): se evaporará más agua y el arroz quedará muy fino.', 'capa_fina');
    if (dReal > 70 && num(S.n_cocineros, 1) < 2) alerta('media', 'Con más de 70 cm, manejar el peso y el fuego requiere dos personas.', 'cocineros');
    if (S.paella_estado === 'nueva_sin_curar') alerta('media', 'Cura la paella nueva antes de usarla (aceite y calor) y sécala siempre después.', 'curado');
    if (S.paella_estado === 'oxidada') alerta('baja', 'Limpia el óxido y vuelve a curar la paella: puede dar sabor metálico.', 'oxido');
    if (mat === 'antiadherente' && S.socarrat !== 'ninguno') alerta('media', 'Con paella antiadherente casi no se obtiene socarrat de verdad.', 'antiadherente');
    if (mat === 'acero_esmaltado' && (S.socarrat === 'marcado' || S.socarrat === 'intenso')) alerta('baja', 'El acero esmaltado da un socarrat más suave que el acero pulido.', 'esmaltado');
    if (fuente === 'lena') {
      if (S.lena_estado === 'verde') alerta('alta', 'Leña verde o resinosa: humo, sabores extraños y riesgo. Evítala.', 'lena_verde');
      else if (S.lena_estado === 'poco_seca') alerta('media', 'Leña poco seca: más humo y llama irregular. Mejor curada (Rioja deja secar la suya año y medio).', 'lena_poco_seca');
      if (S.lena_especie === 'pino_seco') alerta('baja', 'El pino solo muy seco y para arrancar el fuego: es resinoso.', 'pino');
      if (S.lena_especie === 'otra') alerta('info', 'Con leña desconocida, evita las resinosas y las tratadas.', 'lena_otra');
      if ((S.lena_calibres || []).length === 0) alerta('media', 'Sin ningún calibre de leña no podrás regular el fuego (arremulla / mitjaneta / branqueta).', 'calibres');
    }
    if (fuente === 'carbon' && S.carbon_soporte === 'barbacoa_con_parrilla' && dReal > 60) alerta('media', 'Una parrilla de barbacoa no calienta bien paellas de más de 50-60 cm: usa un paellero de brasas o un fogón de obra.', 'carbon_grande');
    if ((fuente === 'lena' || fuente === 'carbon') && S.lugar === 'interior_campana') alerta('alta', 'Leña o carbón en interior: humo y monóxido de carbono. Cocina en exterior ventilado.', 'humo_interior');
    if (esPlaca && dReal > 50) alerta('media', 'En placa, el límite práctico es una paella de unos 50 cm (4-6 raciones en capa fina).', 'placa_grande');
    if (esPlaca) alerta('info', 'En placa gira la paella con frecuencia: el foco central crea puntos más calientes.', 'placa_girar');
    if (fuente === 'horno_total') alerta('baja', 'Cocer todo en horno da poco socarrat y no es la técnica tradicional.', 'horno_total');
    if (fuente === 'horno_final') alerta('info', 'Terminar en horno: muy uniforme, socarrat menos marcado. Paella apta para horno (esmaltada, inox, hierro).', 'horno_final');
    if ((fuente === 'horno_final' || fuente === 'horno_total') && (mat === 'antiadherente')) alerta('baja', 'Comprueba que tu paella antiadherente soporta la temperatura del horno.', 'horno_antiadh');
    if (S.viento === 'fuerte' && !S.paravientos) alerta('alta', 'Viento fuerte sin paravientos: instala una pantalla, la llama se desequilibra.', 'viento');
    else if (S.viento !== 'ninguno' && !S.paravientos && (esGas || fuente === 'lena' || fuente === 'carbon')) alerta('baja', 'Con viento conviene una pantalla cortavientos y girar la paella.', 'viento_leve');
    if (S.lluvia !== 'no') alerta(S.lluvia === 'fuerte' ? 'alta' : 'media', 'Lluvia: cubre el fogón con toldo (nunca la paella con una tapa).', 'lluvia');
    if (S.sol) alerta('baja', 'Paella y cocinero al sol directo: busca sombra o ten agua a mano.', 'sol');
    if (num(S.temp_ext_c, 22) < 10) alerta('info', 'Frío: la paella pierde calor por los bordes; usa pantalla y prevé 1-3 min más.', 'frio');
    if (S.pimenton === 'la_vera') alerta('baja', 'Pimentón de La Vera: aroma ahumado no recomendado por Wikipaella.', 'la_vera');
    if (S.azafran_tipo === 'tartrazina_e102') alerta('media', 'Tartrazina (E-102): colorante artificial no recomendado.', 'tartrazina');
    if (S.agua_origen === 'caldo_preparado') alerta('baja', 'El caldo preparado rompe la receta tradicional: la valenciana se cocina con agua.', 'caldo_prep');
    if (S.agua_origen === 'osmosis') alerta('baja', 'Agua de ósmosis o destilada: desaconsejada si buscas imitar Valencia; el arroz se pasa antes.', 'osmosis');
    if (S.agua_cloro) alerta('baja', 'Deja reposar el agua 1-2 h en jarra abierta o fíltrala para quitar el cloro.', 'cloro');
    if (has('vegetariano')) alerta('alta', 'La paella valenciana lleva carne: para vegetarianos conviene una paella de verduras (es otro plato).', 'vegetariano');
    if (has('sin_gluten') && (S.azafran_tipo === 'colorante_alimentario' || S.azafran_tipo === 'polvo')) alerta('media', 'Sin gluten: revisa la etiqueta del colorante, a veces lleva base de trigo.', 'gluten');
    if (has('alergia_frutos_secos')) alerta('info', 'Alergia a frutos secos: la receta tradicional no los lleva, pero revisa el aceite y los envasados.', 'frutos_secos');
    if (alcOn && S.estacion === 'verano') alerta('baja', 'Alcachofa en verano: posible, pero fuera de temporada.', 'alcachofa_verano');
    if (tavOn && S.estacion === 'invierno') alerta('baja', 'Tavella en invierno: poco habitual.', 'tavella_invierno');
    if (S.modo_ortodoxia === 'estricto_wikipaella') {
      var fuera = [];
      if (pato) fuera.push('pato'); if (costilla) fuera.push('costilla de cerdo'); if (carac !== 'no') fuera.push('caracoles'); if (S.ajo) fuera.push('ajo'); if (S.habas_tiernas) fuera.push('habas');
      if (fuera.length) alerta('media', 'Fuera de la receta estricta de Wikipaella: ' + fuera.join(', ') + '. Cambia el modo a "tradicional ampliado" si lo quieres.', 'ortodoxia');
    } else if (S.modo_ortodoxia === 'tradicional_ampliado' && S.habas_tiernas) {
      alerta('info', 'Habas tiernas: habitual en invierno según la zona.', 'habas');
    }
    if (S.ocasion === 'concurso' && S.modo_ortodoxia !== 'estricto_wikipaella') alerta('baja', 'Para un concurso conviene el modo estricto (solo los 10 productos del núcleo).', 'concurso');
    if (S.regulador_ok === false && esGas) alerta('alta', 'SEGURIDAD: el regulador no coincide con el quemador. No cocines hasta comprobar la presión con el fabricante.', 'regulador');
    if (esGas) {
      var pr = num(S.gas_presion_mbar, 28), gt = S.gas_tipo;
      var okP = (gt === 'butano' && (pr === 28 || pr === 30)) || (gt === 'propano' && (pr === 37 || pr === 50)) || (gt === 'natural' && pr === 20);
      if (!okP) alerta('alta', 'SEGURIDAD: la presión ' + pr + ' mbar no es la habitual para ' + gt + ' (butano 28/30, propano 37/50, natural 20). Revisa regulador y quemador.', 'presion');
    }
    if (!S.lleva_cronometro) alerta('baja', 'Usa cronómetro: el punto del arroz se decide por minutos.', 'cronometro');
    if (alt > 500) alerta('info', 'Altitud de ' + Math.round(alt) + ' m: el agua hierve a ~' + R.ebullicion_c.toFixed(1).replace('.', ',') + ' ºC. Se añade un 1,8 % de agua por cada 100 m y ~' + (2 * alt / 700).toFixed(1).replace('.', ',') + ' min de cocción.', 'altitud');
    if (S.arroz_do === false) alerta('baja', 'Sin D.O. Arroz de Valencia: los tiempos y factores de agua pueden desviarse; calibra.', 'sin_do');
    if (S.ferradura_estado === 'congelada' && S.garrofon_estado === 'lata') alerta('info', 'Verdura no fresca: prevé algo más de agua suelta y ajusta la sal.', 'verdura_congelada');
    if (!calibrado) alerta('info', 'Todos los valores marcados [I] son inferencias: calibra con tu paella y tu fuego (ficha de calibración).', 'calibrar');

    R.alerts.sort(function (a, b) { return SEV_ORDER[a.sev] - SEV_ORDER[b.sev]; });
    R.bloqueada = R.alerts.some(function (a) { return a.sev === 'bloqueante'; });
    return R;
  }

  /* ───────────── Texto exportable ───────────── */
  function textoReceta(S0, R) {
    var S = Object.assign({}, DEFAULTS, S0 || {});
    if (R.vacio) return 'Sin comensales.';
    var out = [];
    out.push('PAELLA VALENCIANA — receta calculada');
    out.push('Comensales equivalentes: ' + R.comensales.toLocaleString('es-ES') + ' · Arroz: ' + fmtG(R.arroz_g));
    out.push('Paella: ' + R.paella.d_real + ' cm (capa ≈ ' + R.paella.capa_cm.toFixed(1).replace('.', ',') + ' cm)' + (R.quemador && R.quemador.rec_cm ? ' · quemador ' + R.quemador.cm + ' cm / ' + R.quemador.aros + ' aros' : ''));
    out.push('');
    out.push('INGREDIENTES');
    R.lista.forEach(function (i) { out.push('- ' + i.n + ': ' + i.q + (i.nota ? ' (' + i.nota + ')' : '')); });
    out.push('');
    out.push('AGUA: inicial ' + fmtL(R.agua.inicial_ml) + ' · al echar el arroz ' + fmtL(R.agua.al_arroz_ml) + ' (rango ' + fmtL(R.agua.min_ml) + '-' + fmtL(R.agua.max_ml) + ')');
    out.push('TIEMPO DE ARROZ: ' + fmtMin(R.tiempos.total) + ' (fase 1: ' + fmtMin(R.tiempos.fase1) + ' · fase 2: ' + fmtMin(R.tiempos.fase2) + ' · ráfaga: ' + R.tiempos.socarrat_s + ' s) · reposo ' + R.tiempos.reposo + ' min');
    out.push('');
    out.push('CRONOGRAMA (servir a las ' + S.hora_servicio + ')');
    R.cronograma.forEach(function (c) { out.push(c.hora + '  ' + c.n + (c.d ? ' — ' + fmtMin(c.d) : '')); });
    out.push('');
    out.push('PLAN DE FUEGO');
    R.planFuego.forEach(function (p) { out.push('- ' + p.fase + ' (' + fmtMin(p.min) + '): ' + p.txt + (p.kw ? ' ≈ ' + p.kw.toFixed(1).replace('.', ',') + ' kW' : '')); });
    if (R.alerts.length) {
      out.push(''); out.push('AVISOS');
      R.alerts.filter(function (a) { return a.sev !== 'info'; }).forEach(function (a) { out.push('- [' + a.sev + '] ' + a.msg); });
    }
    out.push(''); out.push('Valores [I] = inferencias a calibrar. Fuente: guía "Paella valenciana tradicional: guía definitiva".');
    return out.join('\n');
  }

  return {
    DEFAULTS: DEFAULTS, TALLAS: TALLAS, VARIEDAD: VARIEDAD, CIUDADES: CIUDADES, SOCARRAT_S: SOCARRAT_S, GAS_KW: GAS_KW,
    compute: compute, textoReceta: textoReceta, seasonFromDate: seasonFromDate,
    fmtG: fmtG, fmtL: fmtL, fmtMin: fmtMin, fmtHM: fmtHM, parseHM: parseHM
  };
});
