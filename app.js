/* Interfaz — Calculadora de paella valenciana. Genera el formulario a partir de un esquema y recalcula en vivo. */
(function () {
  'use strict';
  var E = window.PaellaEngine;
  var $ = function (s, r) { return (r || document).querySelector(s); };
  var $$ = function (s, r) { return Array.prototype.slice.call((r || document).querySelectorAll(s)); };
  var esc = function (s) { return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); };
  var nf = function (x, d) { return Number(x).toLocaleString('es-ES', { maximumFractionDigits: d == null ? 1 : d }); };

  /* ───────── Almacenamiento ───────── */
  var LS = {
    get: function (k, d) { try { var v = localStorage.getItem(k); return v ? JSON.parse(v) : d; } catch (e) { return d; } },
    set: function (k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) { /* sin almacenamiento */ } }
  };
  var KS = 'paella.state.v1', KP = 'paella.profiles.v1', KF = 'paella.fichas.v1', KE = 'paella.noev.v1';
  var saved = LS.get(KS, null);
  var S = Object.assign({}, E.DEFAULTS, saved || {});
  if (!saved) S.estacion = E.seasonFromDate();
  var R = null;
  var openIds = { desglose: false, ficha: false, perfil: false }; /* tarjetas secundarias plegadas por defecto */

  /* ───────── Esquema de campos ───────── */
  var O = function (arr) { return arr.map(function (p) { return Array.isArray(p) ? { v: p[0], l: p[1] } : { v: p, l: p }; }); };
  var is = function (k) { var a = Array.prototype.slice.call(arguments, 1); return function (s) { return a.indexOf(s[k]) >= 0; }; };
  var gas = function (s) { return s.fuente_calor === 'gas_paellero' || s.fuente_calor === 'gas_cocina'; };
  var tallasList = E.TALLAS;

  var SECS = [
    { id: 'com', t: 'Comensales', open: true, f: [
      { k: 'n_adultos', t: 'int', l: 'Adultos', min: 0, max: 100, ev: 'F' },
      { k: 'n_ninos_mayores', t: 'int', l: 'Niños 6-12 años', min: 0, max: 50, ev: 'I', h: 'Cuentan como 0,6 de una ración de adulto.' },
      { k: 'n_ninos_pequenos', t: 'int', l: 'Niños < 6 años', min: 0, max: 50, ev: 'I', h: 'Cuentan como 0,4.' },
      { k: 'apetito', t: 'enum', l: 'Apetito del grupo', ev: 'I', o: O([['ligero', 'Ligero (×0,8)'], ['normal', 'Normal (×1)'], ['grande', 'Grande (×1,2)']]) },
      { k: 'tipo_comida', t: 'enum', l: 'Papel en la comida', ev: 'F', o: O([['plato_unico', 'Plato único (100 g/pers.)'], ['con_entrantes_postre', 'Con entrantes y postre (80 g)'], ['degustacion', 'Degustación (50 g)']]) },
      { k: 'arroz_g_persona_override', t: 'auto', l: 'Arroz por persona (g)', min: 0, max: 130, u: 'g', ev: 'F', h: 'Déjalo vacío para usar el valor según el tipo de comida.' },
      { k: 'margen_invitados', t: 'num', l: 'Margen invitados', min: 0, max: 25, u: '%', ev: 'I' },
      { k: 'repetir', t: 'bool', l: 'Se espera repetir plato (+12 %)', ev: 'I' },
      { k: 'dietas', t: 'multi', l: 'Restricciones del grupo', ev: 'P', o: O([['sin_gluten', 'Sin gluten'], ['sin_carne_de_conejo', 'Sin conejo'], ['sin_caracoles', 'Sin caracoles'], ['vegetariano', 'Vegetariano'], ['sin_cerdo', 'Sin cerdo'], ['alergia_frutos_secos', 'Alergia a frutos secos']]) },
      { k: 'ritmo_servicio', t: 'enum', l: 'Ritmo del servicio', ev: 'F', o: O([['inmediato', 'Inmediato'], ['espera_10_min', 'Espera de ~10 min'], ['espera_20_min_o_mas', 'Espera de 20 min o más'], ['a_domicilio', 'A domicilio']]) },
      { k: 'ocasion', t: 'enum', l: 'Ocasión', ev: 'P', o: O([['familiar', 'Familiar'], ['comida_diaria', 'Comida diaria'], ['evento_grande', 'Evento grande'], ['concurso', 'Concurso']]) }
    ] },
    { id: 'pae', t: 'Paella (utensilio)', open: true, f: [
      { k: 'paella_diametro_cm', t: 'auto', l: 'Diámetro de la paella', min: 20, max: 140, u: 'cm', ev: 'F', list: 'tallas', hint: 'diam', h: 'Vacío = recomendada para tu arroz. Tallas comerciales: 28 a 130 cm.' },
      { k: 'paella_base_cm', t: 'auto', l: 'Base plana', min: 15, max: 130, u: 'cm', ev: 'F', h: 'Vacío = estimada (≈ 82 % del diámetro). Mídela para más precisión.' },
      { k: 'capa_objetivo', t: 'enum', l: 'Capa de arroz deseada', ev: 'F', o: O([['fina', 'Fina (1-1,5 cm)'], ['media', 'Media (~2 cm)'], ['gruesa', 'Gruesa (> 2 cm)']]), h: 'Solo afecta a la recomendación de diámetro.' },
      { k: 'paella_material', t: 'enum', l: 'Material', ev: 'P', o: O([['acero_pulido', 'Acero pulido'], ['acero_esmaltado', 'Acero esmaltado'], ['acero_inox', 'Acero inox con fondo difusor'], ['hierro', 'Hierro'], ['aluminio_difusor', 'Aluminio con difusor'], ['antiadherente', 'Antiadherente']]) },
      { k: 'paella_fondo', t: 'enum', l: 'Forma del fondo', ev: 'F', o: O([['concavo', 'Cóncavo (tradicional)'], ['plano_induccion', 'Plano (inducción)']]) },
      { k: 'paella_estado', t: 'enum', l: 'Estado del metal', ev: 'P', o: O([['curada', 'Curada'], ['nueva_sin_curar', 'Nueva, sin curar'], ['oxidada', 'Oxidada']]) },
      { k: 'paella_nivelada', t: 'bool', l: 'He comprobado que está nivelada', ev: 'F' }
    ] },
    { id: 'fue', t: 'Fuente de calor', f: [
      { k: 'fuente_calor', t: 'enum', l: 'Fuente', ev: 'P', o: O([['gas_paellero', 'Gas: paellero de aros'], ['gas_cocina', 'Gas: fuego de cocina'], ['lena', 'Leña'], ['carbon', 'Carbón vegetal'], ['induccion', 'Inducción'], ['vitroceramica', 'Vitrocerámica'], ['horno_final', 'Horno: solo terminar el arroz'], ['horno_total', 'Horno: arroz entero']]) },
      { sub: 'Gas', show: gas },
      { k: 'gas_tipo', t: 'enum', l: 'Gas', ev: 'F', show: gas, o: O([['butano', 'Butano'], ['propano', 'Propano'], ['natural', 'Gas natural']]) },
      { k: 'gas_presion_mbar', t: 'nenum', l: 'Presión', u: 'mbar', ev: 'F', show: gas, o: O([[20, '20 (natural)'], [28, '28 (butano)'], [30, '30 (butano)'], [37, '37 (propano)'], [50, '50 (propano alta presión)']]) },
      { k: 'regulador_ok', t: 'bool', l: 'El regulador coincide con el quemador', ev: 'F', show: gas },
      { k: 'quemador_diametro_cm', t: 'nenum', l: 'Diámetro del quemador', u: 'cm', ev: 'F', show: is('fuente_calor', 'gas_paellero'), o: O([[0, 'Auto'], [20, '20'], [30, '30'], [40, '40'], [50, '50'], [60, '60'], [70, '70']]) },
      { k: 'quemador_aros', t: 'nenum', l: 'Aros encendidos', ev: 'F', show: is('fuente_calor', 'gas_paellero'), o: O([[0, 'Auto'], [1, '1'], [2, '2'], [3, '3'], [4, '4']]) },
      { k: 'cocina_kw', t: 'num', l: 'Potencia del fuego de cocina', min: 1, max: 6, step: 0.1, u: 'kW', ev: 'P', show: is('fuente_calor', 'gas_cocina') },
      { sub: 'Leña', show: is('fuente_calor', 'lena') },
      { k: 'lena_especie', t: 'enum', l: 'Especie', ev: 'F', show: is('fuente_calor', 'lena'), o: O([['naranjo', 'Naranjo'], ['otros_citricos', 'Otros cítricos'], ['vid_sarmiento', 'Sarmientos de vid'], ['almendro', 'Almendro / frutales'], ['algarrobo', 'Algarrobo'], ['olivo', 'Olivo'], ['encina', 'Encina'], ['pino_seco', 'Pino seco'], ['otra', 'Otra']]) },
      { k: 'lena_estado', t: 'enum', l: 'Estado', ev: 'F', show: is('fuente_calor', 'lena'), o: O([['bien_curada', 'Bien curada (meses o más)'], ['poco_seca', 'Poco seca'], ['verde', 'Verde']]) },
      { k: 'lena_calibres', t: 'multi', l: 'Calibres disponibles', ev: 'F', show: is('fuente_calor', 'lena'), o: O([['arremulla', 'Arremulla (≤ 1 cm)'], ['mitjaneta', 'Mitjaneta (1,5-3 cm)'], ['branqueta', 'Branqueta (6-8 cm)']]) },
      { k: 'fogon_tipo', t: 'enum', l: 'Fogón', ev: 'P', show: is('fuente_calor', 'lena'), o: O([['trebede_suelo', 'Trébede en el suelo'], ['paellero_lena_con_paravientos', 'Paellero de leña con paravientos'], ['barbacoa_obra', 'Barbacoa de obra'], ['hoguera_campo', 'Hoguera de campo']]) },
      { sub: 'Carbón', show: is('fuente_calor', 'carbon') },
      { k: 'carbon_tipo', t: 'enum', l: 'Tipo de carbón', ev: 'P', show: is('fuente_calor', 'carbon'), o: O([['encina', 'Encina (más calor)'], ['coco', 'Coco (más lento)'], ['briquetas', 'Briquetas'], ['mixto_con_lena', 'Mixto con leña']]) },
      { k: 'carbon_soporte', t: 'enum', l: 'Soporte', ev: 'P', show: is('fuente_calor', 'carbon'), o: O([['barbacoa_con_parrilla', 'Barbacoa con parrilla'], ['paellero_brasas', 'Paellero de brasas'], ['fogon_obra', 'Fogón de obra']]) },
      { k: 'carbon_ventilacion', t: 'bool', l: 'Ventilación regulable', ev: 'P', show: is('fuente_calor', 'carbon') },
      { k: 'carbon_encendido', t: 'enum', l: 'Encendido', ev: 'P', show: is('fuente_calor', 'carbon'), o: O([['chimenea_encendido', 'Chimenea de encendido'], ['pastillas', 'Pastillas'], ['lena_previa', 'Leña previa']]) },
      { sub: 'Placa', show: is('fuente_calor', 'induccion', 'vitroceramica') },
      { k: 'placa_zona_cm', t: 'num', l: 'Diámetro de la zona de cocción', min: 14, max: 40, u: 'cm', ev: 'F', show: is('fuente_calor', 'induccion', 'vitroceramica') },
      { sub: 'Horno', show: is('fuente_calor', 'horno_final', 'horno_total') },
      { k: 'horno_temp_c', t: 'num', l: 'Temperatura', min: 160, max: 250, u: 'ºC', ev: 'P', show: is('fuente_calor', 'horno_final', 'horno_total') },
      { k: 'horno_calor', t: 'enum', l: 'Tipo de calor', ev: 'P', show: is('fuente_calor', 'horno_final', 'horno_total'), o: O([['arriba_abajo', 'Arriba y abajo'], ['aire', 'Aire']]) }
    ] },
    { id: 'ent', t: 'Entorno', f: [
      { k: 'ciudad', t: 'enum', l: 'Ciudad (rellena altitud y dureza)', ev: 'F', h: 'Altitudes aproximadas. La dureza solo está en la guía para Sevilla y Valencia; en las demás, introduce la de tu compañía de aguas.', o: O(Object.keys(E.CIUDADES).map(function (c) { return [c, E.CIUDADES[c].n]; })) },
      { k: 'altitud_m', t: 'num', l: 'Altitud', min: 0, max: 2500, u: 'm', ev: 'F', hint: 'alt' },
      { k: 'temp_ext_c', t: 'num', l: 'Temperatura exterior', min: -5, max: 45, u: 'ºC', ev: 'I' },
      { k: 'humedad_pct', t: 'num', l: 'Humedad relativa', min: 15, max: 95, u: '%', ev: 'F' },
      { k: 'viento', t: 'enum', l: 'Viento', ev: 'P', o: O([['ninguno', 'Ninguno'], ['moderado', 'Moderado'], ['fuerte', 'Fuerte']]) },
      { k: 'paravientos', t: 'bool', l: 'Con pantalla paravientos', ev: 'P', show: function (s) { return s.viento !== 'ninguno'; } },
      { k: 'lluvia', t: 'enum', l: 'Lluvia', ev: 'P', o: O([['no', 'No'], ['fina', 'Fina'], ['fuerte', 'Fuerte']]) },
      { k: 'lugar', t: 'enum', l: 'Lugar', ev: 'P', o: O([['exterior_abierto', 'Exterior abierto'], ['exterior_cubierto', 'Exterior cubierto'], ['interior_campana', 'Interior con campana']]) },
      { k: 'sol', t: 'bool', l: 'La paella queda al sol directo', ev: 'P' },
      { k: 'estacion', t: 'enum', l: 'Época del año', ev: 'F', h: 'Decide verdura de temporada (alcachofa en invierno, tavella en verano).', o: O([['primavera', 'Primavera'], ['verano', 'Verano'], ['otono', 'Otoño'], ['invierno', 'Invierno']]) }
    ] },
    { id: 'agu', t: 'Agua', f: [
      { k: 'agua_origen', t: 'enum', l: 'Origen', ev: 'F', o: O([['grifo', 'Grifo'], ['grifo_filtrado', 'Grifo filtrado'], ['mineral_debil', 'Mineral de mineralización débil'], ['mineral_media_fuerte', 'Mineral de mineralización media-fuerte'], ['osmosis', 'Ósmosis o destilada'], ['caldo_preparado', 'Caldo preparado']]) },
      { k: 'agua_dureza_fh', t: 'num', l: 'Dureza del agua', min: 0, max: 60, step: 0.1, u: 'ºfH', ev: 'F', hint: 'dur', show: is('agua_origen', 'grifo', 'grifo_filtrado') },
      { k: 'agua_cloro', t: 'bool', l: 'Se percibe cloro', ev: 'I', show: is('agua_origen', 'grifo') },
      { k: 'agua_temp_inicial', t: 'enum', l: 'Temperatura al verter', ev: 'P', o: O([['ambiente', 'Ambiente'], ['caliente', 'Caliente']]) },
      { k: 'agua_medida_metodo', t: 'enum', l: 'Cómo la mides', ev: 'F', o: O([['jarra', 'Con jarra graduada'], ['remaches', 'Con los remaches de la paella'], ['prueba_evaporacion', 'Prueba de evaporación']]) }
    ] },
    { id: 'arr', t: 'Arroz', f: [
      { k: 'arroz_variedad', t: 'enum', l: 'Variedad', ev: 'F', hint: 'var', o: O([['senia', 'Senia'], ['bahia', 'Bahía'], ['albufera', 'Albufera'], ['bomba', 'Bomba'], ['otra_redonda', 'Otro grano redondo']]) },
      { k: 'arroz_do', t: 'bool', l: 'Con D.O. Arroz de Valencia', ev: 'F' }
    ] },
    { id: 'ing', t: 'Ingredientes', f: [
      { k: 'modo_ortodoxia', t: 'enum', l: 'Modo de ortodoxia', ev: 'F', o: O([['estricto_wikipaella', 'Estricto (10 del núcleo + temporada)'], ['tradicional_ampliado', 'Tradicional ampliado'], ['libre', 'Libre']]) },
      { sub: 'Carnes' },
      { k: 'pollo_tipo', t: 'enum', l: 'Pollo', ev: 'F', o: O([['corral', 'De corral'], ['granja', 'De granja'], ['muslos_contramuslos', 'Muslos y contramuslos'], ['troceado_con_hueso', 'Troceado con hueso']]) },
      { k: 'pollo_g_persona', t: 'num', l: 'Pollo por persona', min: 100, max: 220, u: 'g', ev: 'I' },
      { k: 'conejo_g_persona', t: 'num', l: 'Conejo por persona', min: 60, max: 170, u: 'g', ev: 'I' },
      { k: 'pato', t: 'bool', l: 'Pato (Albufera)', ev: 'F', h: '−30 % de pollo y de aceite.' },
      { k: 'costilla_cerdo', t: 'bool', l: 'Costilla de cerdo (Castellón)', ev: 'F', h: 'Sustituye parte del conejo.' },
      { k: 'caracoles', t: 'enum', l: 'Caracoles serranos', ev: 'F', o: O([['no', 'No'], ['pocos', 'Pocos'], ['muchos', 'Muchos']]), h: 'Con caracoles se quita el romero.' },
      { sub: 'Verduras y legumbres' },
      { k: 'ferradura_estado', t: 'enum', l: 'Judía plana (ferradura)', ev: 'F', o: O([['fresca', 'Fresca'], ['congelada', 'Congelada']]) },
      { k: 'ferradura_g_persona', t: 'num', l: 'Judía por persona', min: 40, max: 120, u: 'g', ev: 'I' },
      { k: 'garrofon_estado', t: 'enum', l: 'Garrofón', ev: 'P', o: O([['fresco', 'Fresco'], ['congelado', 'Congelado'], ['seco_remojado', 'Seco remojado'], ['lata', 'De lata']]) },
      { k: 'garrofon_g_persona', t: 'num', l: 'Garrofón por persona', min: 20, max: 90, u: 'g', ev: 'I' },
      { k: 'tavella', t: 'tri', l: 'Tavella', ev: 'F', h: 'Automático: solo en verano.' },
      { k: 'alcachofa', t: 'tri', l: 'Alcachofa', ev: 'F', h: 'Automático: solo en invierno.' },
      { k: 'habas_tiernas', t: 'bool', l: 'Habas tiernas', ev: 'F' },
      { k: 'ajo', t: 'bool', l: 'Ajo', ev: 'F' },
      { sub: 'Base de sabor' },
      { k: 'tomate_tipo', t: 'enum', l: 'Tomate', ev: 'P', o: O([['rallado_natural', 'Rallado natural'], ['triturado', 'Triturado'], ['concentrado', 'Concentrado']]) },
      { k: 'tomate_g_persona', t: 'num', l: 'Tomate por persona', min: 20, max: 60, u: 'g', ev: 'I' },
      { k: 'aceite_tipo', t: 'enum', l: 'Aceite', ev: 'F', o: O([['aove_afrutado_ligero', 'AOVE afrutado ligero'], ['aove_intenso', 'AOVE intenso'], ['girasol', 'Girasol']]) },
      { k: 'aceite_ml_persona', t: 'num', l: 'Aceite por persona', min: 10, max: 35, u: 'ml', ev: 'I' },
      { k: 'pimenton', t: 'enum', l: 'Pimentón dulce', ev: 'F', o: O([['vega_baja', 'Vega Baja'], ['la_vera', 'La Vera (ahumado)'], ['no', 'Sin pimentón']]) },
      { k: 'azafran_tipo', t: 'enum', l: 'Colorante', ev: 'F', o: O([['hebras', 'Azafrán en hebras'], ['polvo', 'Azafrán molido'], ['colorante_alimentario', 'Colorante alimentario'], ['tartrazina_e102', 'Tartrazina E-102']]) },
      { k: 'azafran_g_persona', t: 'num', l: 'Azafrán por persona', min: 0.03, max: 0.2, step: 0.01, u: 'g', ev: 'I' },
      { k: 'romero', t: 'bool', l: 'Romero', ev: 'F' },
      { k: 'sal_g_litro', t: 'num', l: 'Sal por litro de caldo', min: 5, max: 16, step: 0.5, u: 'g/L', ev: 'F' }
    ] },
    { id: 'res', t: 'Resultado deseado', f: [
      { k: 'estilo', t: 'enum', l: 'Textura', ev: 'I', o: O([['seca_clasica', 'Seca clásica'], ['seca_jugosa', 'Seca jugosa'], ['casi_meloso', 'Casi meloso']]) },
      { k: 'socarrat', t: 'enum', l: 'Socarrat', ev: 'F', o: O([['ninguno', 'Ninguno'], ['suave', 'Suave (30-40 s)'], ['marcado', 'Marcado (60-90 s)'], ['intenso', 'Intenso (90-120 s)']]) },
      { k: 'punto_grano', t: 'enum', l: 'Punto del grano', ev: 'I', o: O([['al_dente_firme', 'Al dente, firme'], ['tierno', 'Tierno (+1 min)']]) },
      { k: 'salado', t: 'enum', l: 'Nivel de sal', ev: 'I', o: O([['suave', 'Suave'], ['normal', 'Normal'], ['marcado', 'Marcado']]) },
      { k: 'azafran_intensidad', t: 'enum', l: 'Color y aroma del azafrán', ev: 'I', o: O([['suave', 'Suave'], ['normal', 'Normal'], ['intenso', 'Intenso']]) },
      { k: 'carnes_melosas', t: 'bool', l: 'Carnes muy tiernas (+10 min de caldo)', ev: 'P' },
      { k: 'reposo_min', t: 'num', l: 'Reposo', min: 0, max: 15, u: 'min', ev: 'F' }
    ] },
    { id: 'coc', t: 'Cocinero y proceso', f: [
      { k: 'nivel_cocinero', t: 'enum', l: 'Experiencia', ev: 'I', o: O([['principiante', 'Principiante'], ['intermedio', 'Intermedio'], ['avanzado', 'Avanzado']]) },
      { k: 'n_cocineros', t: 'int', l: 'Personas que atienden el fuego', min: 1, max: 3, ev: 'I' },
      { k: 'metodo_caldo', t: 'enum', l: 'Método del caldo', ev: 'F', o: O([['directo_continuo', 'Directo y continuo'], ['caldo_enfriado', 'Caldo enfriado (avanzado)']]) },
      { k: 'lleva_cronometro', t: 'bool', l: 'Usaré cronómetro', ev: 'I' },
      { k: 'hora_servicio', t: 'time', l: 'Hora de servir', ev: 'I' }
    ] },
    { id: 'cal', t: 'Ajustes personales y calibración', f: [
      { k: 'evap_medida_ml', t: 'auto', l: 'Evaporación medida con tu paella', min: 0, max: 5000, step: 50, u: 'ml', ev: 'F', h: 'Resultado de la prueba de evaporación (sección 5.5 de la guía). Si lo rellenas, el agua = arroz + evaporación y se ignoran los factores de entorno, fuego y paella.' },
      { k: 'ajuste_agua_pct', t: 'num', l: 'Corrección personal del agua', min: -20, max: 20, step: 1, u: '%', ev: 'P', h: 'Multiplicador propio que aprendes tras cada prueba.' },
      { k: 'ajuste_tiempo_min', t: 'num', l: 'Corrección personal del tiempo de arroz', min: -5, max: 5, step: 0.5, u: 'min', ev: 'P' }
    ] }
  ];

  var EVT = { F: 'Dato publicado por una fuente citada', P: 'Práctica extendida sin cifra oficial', I: 'Inferencia: punto de partida que debes calibrar' };
  var evBadge = function (e) { return e ? '<span class="ev ' + e.replace('/', '') + '" title="' + esc(EVT[e.charAt(0)] || '') + '">' + e + '</span>' : ''; };

  /* ───────── Formulario ───────── */
  function fieldHtml(f) {
    if (f.sub) return '<div class="sub fld" data-sub="1">' + esc(f.sub) + '</div>';
    var id = 'i-' + f.k, v = S[f.k], h = '';
    var wide = (f.t === 'enum' || f.t === 'nenum') && f.o.some(function (o) { return String(o.l).length > 22; }) ? ' wide' : '';
    var label = '<label class="l" for="' + id + '">' + esc(f.l) + ' ' + evBadge(f.ev) + '</label>';
    var attrs = ' id="' + id + '" data-k="' + f.k + '" data-t="' + f.t + '"';
    if (f.t === 'int' || f.t === 'num' || f.t === 'auto') {
      var step = f.step || (f.t === 'int' ? 1 : 'any');
      h = '<div class="row"><input type="number" inputmode="decimal"' + attrs + (f.min != null ? ' min="' + f.min + '"' : '') + (f.max != null ? ' max="' + f.max + '"' : '') + ' step="' + step + '"' + (f.list ? ' list="' + f.list + '"' : '') + ' value="' + (f.t === 'auto' && !v ? '' : esc(v)) + '"' + (f.t === 'auto' ? ' placeholder="auto"' : '') + '>' + (f.u ? '<span class="unit">' + esc(f.u) + '</span>' : '') + '</div>';
    } else if (f.t === 'enum' || f.t === 'nenum') {
      h = '<select' + attrs + '>' + f.o.map(function (o) { return '<option value="' + esc(o.v) + '"' + (String(o.v) === String(v) ? ' selected' : '') + '>' + esc(o.l) + '</option>'; }).join('') + '</select>';
    } else if (f.t === 'tri') {
      h = '<select' + attrs + '>' + [['auto', 'Automático (por época)'], ['si', 'Sí'], ['no', 'No']].map(function (o) { return '<option value="' + o[0] + '"' + (o[0] === v ? ' selected' : '') + '>' + o[1] + '</option>'; }).join('') + '</select>';
    } else if (f.t === 'time') {
      h = '<input type="time"' + attrs + ' value="' + esc(v) + '">';
    } else if (f.t === 'bool') {
      return '<div class="fld" data-f="' + f.k + '"><label class="sw"><input type="checkbox"' + attrs + (v ? ' checked' : '') + '><i></i><span>' + esc(f.l) + ' ' + evBadge(f.ev) + '</span></label>' + (f.h ? '<div class="h">' + esc(f.h) + '</div>' : '') + '</div>';
    } else if (f.t === 'multi') {
      h = '<div class="chips">' + f.o.map(function (o) { return '<label class="chip"><input type="checkbox" data-k="' + f.k + '" data-t="multi" data-v="' + esc(o.v) + '"' + ((v || []).indexOf(o.v) >= 0 ? ' checked' : '') + '>' + esc(o.l) + '</label>'; }).join('') + '</div>';
      label = '<div class="l">' + esc(f.l) + ' ' + evBadge(f.ev) + '</div>';
    }
    return '<div class="fld' + wide + '" data-f="' + f.k + '">' + label + h + (f.h ? '<div class="h">' + esc(f.h) + '</div>' : '') + (f.hint ? '<div class="h" id="hint-' + f.k + '"></div>' : '') + '</div>';
  }

  function buildForm() {
    var out = '<datalist id="tallas">' + tallasList.map(function (t) { return '<option value="' + t + '">'; }).join('') + '</datalist>';
    SECS.forEach(function (sec, i) {
      out += '<details class="sec" data-sec="' + sec.id + '"' + (sec.open ? ' open' : '') + '><summary><span class="sec-n">' + (i + 1) + '</span>' + esc(sec.t) + '</summary><div class="sec-body">' + sec.f.map(fieldHtml).join('') + '</div></details>';
    });
    $('#panelForm').innerHTML = out;
    var idx = 0;
    SECS.forEach(function (sec) { sec.f.forEach(function (f) { f._i = idx++; }); });
  }

  function allFields() { var a = []; SECS.forEach(function (s) { s.f.forEach(function (f) { a.push(f); }); }); return a; }

  function updateVisibility() {
    var nodes = $$('#panelForm .fld');
    var fields = allFields();
    var subs = fields.filter(function (f) { return f.sub; });
    var subNodes = $$('#panelForm .fld[data-sub]');
    subs.forEach(function (f, i) { if (subNodes[i]) subNodes[i].hidden = f.show ? !f.show(S) : false; });
    fields.forEach(function (f) {
      if (f.sub) return;
      var n = $('#panelForm .fld[data-f="' + f.k + '"]');
      if (n) n.hidden = f.show ? !f.show(S) : false;
    });
    /* subtítulos sin show: ocultar si todos los campos siguientes de su bloque están ocultos */
    subs.forEach(function (f, i) {
      if (f.show) return;
      var n = subNodes[i], sib = n.nextElementSibling, any = false;
      while (sib && !sib.hasAttribute('data-sub')) { if (!sib.hidden) any = true; sib = sib.nextElementSibling; }
      n.hidden = !any;
    });
  }

  function syncInputs() {
    allFields().forEach(function (f) {
      if (f.sub) return;
      if (f.t === 'multi') {
        $$('#panelForm input[data-k="' + f.k + '"]').forEach(function (c) { c.checked = (S[f.k] || []).indexOf(c.dataset.v) >= 0; });
        return;
      }
      var el = $('#i-' + f.k); if (!el) return;
      if (f.t === 'bool') el.checked = !!S[f.k];
      else if (f.t === 'auto') el.value = S[f.k] ? S[f.k] : '';
      else el.value = S[f.k];
    });
  }

  function onChange(e) {
    var el = e.target.closest('[data-k]'); if (!el) return;
    var k = el.dataset.k, t = el.dataset.t, f = allFields().filter(function (x) { return x.k === k; })[0] || {};
    var v;
    if (t === 'bool') v = el.checked;
    else if (t === 'multi') {
      var arr = (S[k] || []).slice(), x = el.dataset.v, i = arr.indexOf(x);
      if (el.checked && i < 0) arr.push(x); else if (!el.checked && i >= 0) arr.splice(i, 1);
      v = arr;
    } else if (t === 'int' || t === 'num' || t === 'auto') {
      if (el.value === '') { if (t === 'auto') v = 0; else return; }
      else {
        v = Number(el.value); if (!isFinite(v)) return;
        if (e.type === 'change') {
          if (f.min != null && v < f.min && !(t === 'auto' && v === 0)) v = f.min;
          if (f.max != null && v > f.max) v = f.max;
          if (t === 'int') v = Math.round(v);
          el.value = v;
        }
      }
    } else if (t === 'nenum') v = Number(el.value);
    else v = el.value;
    S[k] = v;
    if (k === 'ciudad') {
      var c = E.CIUDADES[v] || {};
      if (c.alt != null) S.altitud_m = c.alt;
      if (c.fh != null) S.agua_dureza_fh = c.fh;
      syncInputs();
    }
    if (k === 'altitud_m' && S.ciudad !== 'otra') {
      var cc = E.CIUDADES[S.ciudad];
      if (cc && cc.alt !== v) { S.ciudad = 'otra'; syncInputs(); }
    }
    LS.set(KS, S);
    refresh();
  }

  /* ───────── Resultados ───────── */
  var PHCOL = ['#8C3416', '#4F7A38', '#34607D', '#D9961A', '#B5471F', '#E0693A', '#7A6B5A', '#5B4A8A'];
  var SEVL = { bloqueante: 'Bloquea', alta: 'Alta', media: 'Media', baja: 'Baja', info: 'Info' };

  var LENA_TXT = {
    naranjo: 'Naranjo: llama corta y regular, brasa estable y aroma suave. La de referencia (BOE).',
    otros_citricos: 'Cítricos: sin resina, buena acidez, combustión rápida.',
    vid_sarmiento: 'Sarmientos: llama muy potente y rápida, sin brasa duradera. Buenos para avivar.',
    almendro: 'Frutales: alternativa válida.',
    algarrobo: 'Algarrobo: muy potente; mejor para encender el fuego.',
    olivo: 'Olivo: alto poder calorífico y poco humo.',
    encina: 'Encina: brasa fuerte y duradera.',
    pino_seco: 'Pino: mucha llama y poca brasa, resinoso. Solo muy seco y para arrancar.',
    otra: 'Evita maderas resinosas o tratadas.'
  };
  function fuelTips() {
    var t = [], f = S.fuente_calor;
    if (f === 'lena') {
      t.push(LENA_TXT[S.lena_especie]);
      t.push('Calibres: arremulla (≤ 1 cm) para arrancar el hervor y avivar; mitjaneta (1,5-3 cm) para sofrito y caldo; branqueta (6-8 cm) para la base de brasas y el socarrat.');
      t.push('Enciende con antelación y espera a que baje la llama antes de poner la paella. El calor tiende a concentrarse en el centro: juega con el fuego hacia los bordes.');
    } else if (f === 'carbon') {
      t.push('Extiende el carbón de forma uniforme (sin montañas) y pon la paella cuando el centro esté rojo vivo.');
      t.push(S.carbon_ventilacion ? 'Controla el calor con el aire (rejillas) y la distancia a la paella; no añadas carbón nuevo en exceso sobre brasas vivas.' : 'Sin ventilación regulable el calor es difícil de controlar: aparta o acerca brasas.');
      if (S.carbon_tipo === 'mixto_con_lena') t.push('Mezcla: carbón para una cama de brasas rápida y leña seca aparte para reponer.');
    } else if (f === 'gas_paellero') {
      t.push('Fuerte al principio, medio-bajo después y fuerte al final para el socarrat. Si el quemador es pequeño, gira la paella.');
    } else if (f === 'gas_cocina') {
      t.push('Un fuego doméstico solo calienta el centro: gira la paella a menudo o usa una paella pequeña.');
    } else if (f === 'induccion' || f === 'vitroceramica') {
      t.push('Mayor inercia térmica: anticipa los cambios de potencia. El socarrat tiende a ser más suave.');
    } else if (f === 'horno_final') {
      t.push('Sofrito, caldo y primera fase en fuego; el horno solo termina el arroz (200-220 ºC, 5-8 min).');
    } else if (f === 'horno_total') {
      t.push('Arroz entero al horno: muy uniforme, con poco socarrat. En el horno se evapora menos agua (factor 0,85).');
    }
    return t;
  }

  function card(id, title, body, extra) {
    return '<details class="card" data-id="' + id + '"' + (openIds[id] !== false ? ' open' : '') + '><summary><h2>' + title + (extra || '') + '</h2></summary>' + body + '</details>';
  }

  function renderResult() {
    var p = $('#panelResult');
    if (R.vacio) { p.innerHTML = '<div class="card"><h2>Resultado</h2><div class="alerts">' + alertsHtml() + '</div></div>'; return; }
    var T = R.tiempos, h = '';

    h += '<div class="card"><div class="kpis">' +
      kpi('Arroz', E.fmtG(R.arroz_g), nf(R.comensales, 1) + ' comensales eq. · ' + R.g_persona + ' g') +
      kpi('Paella', R.paella.d_real + ' cm', (R.paella.auto ? 'recomendada' : 'rec. ' + R.paella.d_rec + ' cm') + ' · capa ≈ ' + nf(R.paella.capa_cm, 1) + ' cm') +
      kpi('Agua al echar arroz', E.fmtL(R.agua.al_arroz_ml), 'inicial ' + E.fmtL(R.agua.inicial_ml)) +
      kpi('Arroz en paella', nf(T.total, 1) + ' min', T.modo === 'horno_total' ? 'en horno' : 'fase 1 ' + nf(T.fase1, 1) + ' · fase 2 ' + nf(T.fase2, 1) + ' · ráfaga ' + T.socarrat_s + ' s') +
      kpi('Empieza a las', R.t_fuego_inicio.split(' ')[0], 'para servir a las ' + S.hora_servicio) +
      '</div></div>';

    var al = R.alerts.filter(function (a) { return a.sev !== 'info'; }), inf = R.alerts.filter(function (a) { return a.sev === 'info'; });
    h += card('alertas', 'Avisos' + (al.length ? ' (' + al.length + ')' : ''), '<div class="alerts">' + (al.length ? al.map(alHtml).join('') : '<div class="muted">Sin avisos importantes con esta configuración.</div>') + '</div>' + (inf.length ? '<div class="alerts" style="margin-top:6px">' + inf.map(alHtml).join('') + '</div>' : ''));

    h += card('compra', 'Lista de compra', '<div class="scroll"><table class="t"><tbody>' + R.lista.map(function (i) { return '<tr><td>' + esc(i.n) + (i.nota ? '<span class="n">' + esc(i.nota) + '</span>' : '') + '</td><td class="q">' + esc(i.q) + '</td></tr>'; }).join('') + '</tbody></table></div>', '<small>' + R.lista.length + ' líneas</small>');

    var A = R.agua, medidas = { jarra: 'Mide con una jarra graduada; tras el hervor, comprueba el nivel con la regla de los 2 cm de caldo en el centro.', remaches: 'Llena hasta los remaches que marquen tu nivel y comprueba con la regla visual (unos 2 cm de caldo en el centro al echar el arroz).', prueba_evaporacion: 'Haz la prueba de evaporación: 2 L de agua hirviendo con tu pauta de fuego, mide lo que queda y escribe la evaporación en "Ajustes personales".' };
    h += card('agua', 'Agua', '<div class="two"><div><div class="muted">Al echar el arroz</div><div class="big">' + E.fmtL(A.al_arroz_ml) + '</div><div class="muted">rango seguro ' + E.fmtL(A.min_ml) + ' – ' + E.fmtL(A.max_ml) + ' (±7 %)</div></div><div><div class="muted">Inicial, antes de hervir</div><div class="big">' + E.fmtL(A.inicial_ml) + '</div><div class="muted">incluye ≈ ' + E.fmtL(A.evaporacion_caldo_ml) + ' que se evapora en el caldo</div></div></div>' +
      '<p class="muted" style="margin:10px 0 4px"><b>' + esc(A.recomendacion) + '.</b> Dureza efectiva ' + nf(A.dureza_ef, 1) + ' ºfH (' + A.clase + '). El agua hierve a ≈ ' + nf(R.ebullicion_c, 1) + ' ºC.</p>' +
      '<p class="muted" style="margin:4px 0">' + esc(medidas[S.agua_medida_metodo] || '') + '</p>' +
      '<p class="muted" style="margin:4px 0">Sal: ligeramente más salado de lo que apetecería comer; prueba el caldo antes de echar el arroz.</p>');

    var stack = R.cronograma.filter(function (c) { return c.d > 0 && c.id !== 'encendido'; });
    var totalStack = stack.reduce(function (a, c) { return a + c.d; }, 0) || 1;
    var stackH = '<div class="stack">' + stack.map(function (c, i) { return '<i style="width:' + (c.d / totalStack * 100) + '%;background:' + PHCOL[i % PHCOL.length] + '" title="' + esc(c.n) + ' · ' + nf(c.d, 1) + ' min"></i>'; }).join('') + '</div><div class="legend">' + stack.map(function (c, i) { return '<span><s style="background:' + PHCOL[i % PHCOL.length] + '"></s>' + esc(c.n.split(':')[0].split(' (')[0]) + ' ' + nf(c.d, 1) + '′</span>'; }).join('') + '</div>';
    var plan = '<div class="scroll"><table class="t"><thead><tr><th>Fase</th><th>Duración</th><th>Fuego</th><th></th></tr></thead><tbody>' + R.planFuego.map(function (x) { return '<tr><td>' + esc(x.fase) + '</td><td>' + (x.min < 1 && x.id === 'socarrat' ? T.socarrat_s + ' s' : nf(x.min, 1) + ' min') + '</td><td>' + esc(x.txt) + (x.kw ? '<span class="n">≈ ' + nf(x.kw, 1) + ' kW</span>' : '') + '</td><td style="width:90px"><div class="bar"><i style="width:' + x.pct + '%"></i></div></td></tr>'; }).join('') + '</tbody></table></div>';
    var tips = fuelTips();
    h += card('fuego', 'Plan de fuego y tiempos', stackH + plan + (tips.length ? '<ul class="muted" style="margin:10px 0 0;padding-left:18px">' + tips.map(function (t) { return '<li>' + esc(t) + '</li>'; }).join('') + '</ul>' : ''));

    h += card('crono', 'Cronograma', '<ul class="tl" style="margin:0">' + R.cronograma.map(function (c) { return '<li class="' + (c.id === 'servir' ? 'end' : '') + '"><time>' + esc(c.hora.split(' ')[0]) + '</time>' + esc(c.n) + (c.d ? ' <small>· ' + nf(c.d, 1) + ' min</small>' : '') + (c.hora.indexOf('anterior') > 0 ? ' <small>(día anterior)</small>' : '') + '</li>'; }).join('') + '</ul>');

    var rv = R.recVariedad.length ? '<ul class="muted" style="margin:8px 0 0;padding-left:18px">' + R.recVariedad.map(function (x) { return '<li>' + esc(x) + '</li>'; }).join('') + '</ul>' : '';
    h += card('perfil', 'Qué esperar', '<p style="margin:0 0 6px">' + esc(R.perfil.estilo) + '</p><p style="margin:0">' + esc(R.perfil.socarrat) + '</p>' + rv + '<p class="muted" style="margin:8px 0 0">Prueba el grano desde el minuto ' + nf(T.grano_desde, 0) + ': debe quedar cocido con un puntito firme en el centro.</p>');

    if (R.gas) {
      var g = R.gas;
      h += card('gas', 'Gas', '<div class="two"><div><div class="muted">Quemador</div><div class="big">' + (R.quemador.cocina ? 'cocina' : R.quemador.cm + ' cm') + '</div><div class="muted">' + nf(g.kw, 2) + ' kW' + (R.quemador.cocina ? '' : ' · ' + R.quemador.aros + ' aros') + '</div></div><div><div class="muted">Consumo estimado</div><div class="big">' + nf(g.kwh, 1) + ' kWh</div><div class="muted">' + (g.kg != null ? '≈ ' + nf(g.kg, 2) + ' kg de gas licuado · ' + nf(g.horas, 2) + ' h de uso [I]' : nf(g.horas, 2) + ' h de uso [I]') + '</div></div></div>' + (g.kg != null ? '<p class="muted" style="margin:8px 0 0">Una bombona de butano de 12,5 kg alcanza de sobra; comprueba que no esté casi vacía.</p>' : ''));
    }

    var fa = R.factoresAgua.map(function (x) { return '<tr><td>' + esc(x.n) + (x.det ? '<span class="n">' + esc(x.det) + '</span>' : '') + '</td><td class="q">× ' + nf(x.v, 3) + '</td><td>' + evBadge(x.ev) + '</td></tr>'; }).join('');
    var tm = '<tr><td>' + esc((E.VARIEDAD[S.arroz_variedad] || {}).n || '') + ' (base a nivel del mar)</td><td class="q">' + nf(T.base, 1) + ' min</td><td>' + evBadge('F/I') + '</td></tr>' + T.mods.map(function (m) { return '<tr><td>' + esc(m.n) + '</td><td class="q">' + (m.v > 0 ? '+' : '') + nf(m.v, 2) + ' min</td><td>' + evBadge(m.ev) + '</td></tr>'; }).join('') + '<tr><td><b>Total</b></td><td class="q"><b>' + nf(T.total, 2) + ' min</b></td><td></td></tr>';
    h += card('desglose', 'Cómo se ha calculado', '<h3 style="font-size:14px;margin:0 0 4px">Agua: base ' + E.fmtL(A.base_ml) + (A.calibrado ? ' (calibrada)' : ' (tabla)') + ' × factores</h3><div class="scroll"><table class="t"><tbody>' + fa + '<tr><td><b>Factor total</b></td><td class="q"><b>× ' + nf(A.factor, 3) + '</b></td><td></td></tr></tbody></table></div><h3 style="font-size:14px;margin:12px 0 4px">Tiempo de arroz</h3><div class="scroll"><table class="t"><tbody>' + tm + '</tbody></table></div><p class="muted">Las constantes marcadas con I son inferencias a partir de la guía. Calibra con tu paella y tu fuego.</p>');

    h += card('ficha', 'Ficha de calibración', fichasHtml());

    h += '<div class="card noprint"><div class="actions"><button class="btn primary" data-act="copy">Copiar receta</button><button class="btn" data-act="print">Imprimir / PDF</button><button class="btn" data-act="saveprof">Guardar como perfil</button></div></div>';
    p.innerHTML = h;
  }

  function kpi(l, b, s) { return '<div class="kpi"><small>' + esc(l) + '</small><b>' + esc(b) + '</b><span>' + esc(s) + '</span></div>'; }
  function alHtml(a) { return '<div class="al ' + a.sev + '"><b>' + SEVL[a.sev] + '</b><span>' + esc(a.msg) + '</span></div>'; }
  function alertsHtml() { return R.alerts.map(alHtml).join(''); }

  /* ───────── Ficha de calibración ───────── */
  var SOC = ['ninguno', 'suave', 'marcado', 'intenso'];
  function fichas() { return LS.get(KF, []); }
  function fichasHtml() {
    var fs = fichas(), out = '<p class="muted" style="margin:0 0 8px">Registra cada prueba y cambia solo una variable por vez (primero el agua, luego el tiempo, luego el fuego final).</p><div class="actions"><button class="btn primary small" data-act="newficha">Registrar prueba con estos datos</button>' + (fs.length ? '<button class="btn small" data-act="exportfichas">Copiar fichas</button>' : '') + '</div>';
    fs.slice().reverse().forEach(function (f, ri) {
      var i = fs.length - 1 - ri;
      out += '<div class="ficha"><b>' + esc(f.fecha) + '</b> · ' + esc(f.resumen) + '<br>Grano: <b>' + esc(f.grano) + '</b> · Socarrat: <b>' + esc(f.socarrat) + '</b>' + (f.cambio ? '<br>Cambio previsto: ' + esc(f.cambio) : '') + (f.lena ? '<br>Leña usada: ' + esc(f.lena) + ' kg' : '');
      var sug = [];
      if (f.grano === 'pasado') sug.push(['agua', -5, 'Agua −5 %']);
      if (f.grano === 'duro') sug.push(['agua', 5, 'Agua +5 %']);
      if (f.socarrat === 'quemado') sug.push(['soc', -1, 'Socarrat un nivel menos']);
      if (f.socarrat === 'nada') sug.push(['soc', 1, 'Socarrat un nivel más']);
      if (sug.length) out += '<div class="actions" style="margin-top:6px">' + sug.map(function (s) { return '<button class="btn small" data-act="sug" data-t="' + s[0] + '" data-v="' + s[1] + '">Aplicar: ' + s[2] + '</button>'; }).join('') + '</div>';
      out += '<div style="margin-top:6px"><button class="btn ghost small" data-act="delficha" data-i="' + i + '">Borrar</button></div></div>';
    });
    return out;
  }
  function openFichaDialog() {
    var d = new Date(), fecha = d.toLocaleDateString('es-ES') + ' ' + d.toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' });
    var resumen = R.paella.d_real + ' cm · ' + S.fuente_calor.replace(/_/g, ' ') + ' · ' + E.fmtG(R.arroz_g) + ' ' + ((E.VARIEDAD[S.arroz_variedad] || {}).n || '') + ' · agua ' + E.fmtL(R.agua.al_arroz_ml) + ' · ' + nf(R.tiempos.total, 1) + ' min' + ' · ' + nf(S.temp_ext_c, 0) + ' ºC, viento ' + S.viento + ', ' + nf(S.altitud_m, 0) + ' m';
    dlgOpen('<h3>Registrar prueba</h3><p class="muted">' + esc(resumen) + '</p>' +
      '<div class="fld"><label class="l">Punto del grano</label><select id="fg"><option value="ok">OK</option><option value="duro">Duro</option><option value="pasado">Pasado</option></select></div>' +
      '<div class="fld" style="margin-top:8px"><label class="l">Socarrat</label><select id="fs"><option value="ideal">Ideal</option><option value="nada">Nada</option><option value="suave">Suave</option><option value="quemado">Quemado</option></select></div>' +
      '<div class="fld" style="margin-top:8px"><label class="l">Leña o carbón usados (kg, opcional)</label><input type="number" id="fl" step="0.1" min="0" inputmode="decimal"></div>' +
      '<div class="fld" style="margin-top:8px"><label class="l">Cambio a hacer en la próxima</label><input type="text" id="fc" maxlength="140" placeholder="p. ej. −5 % de agua"></div>' +
      '<div class="actions" style="margin-top:14px"><button class="btn primary" id="fok">Guardar</button><button class="btn" data-close>Cancelar</button></div>');
    $('#fok').onclick = function () {
      var fs = fichas();
      fs.push({ fecha: fecha, resumen: resumen, grano: $('#fg').value, socarrat: $('#fs').value, lena: $('#fl').value, cambio: $('#fc').value });
      LS.set(KF, fs.slice(-30)); dlgClose(); renderResult(); toast('Prueba guardada');
    };
  }
  function applySuggestion(t, v) {
    if (t === 'agua') S.ajuste_agua_pct = Math.max(-20, Math.min(20, (S.ajuste_agua_pct || 0) + v));
    else { var i = SOC.indexOf(S.socarrat) + v; S.socarrat = SOC[Math.max(0, Math.min(3, i))]; }
    LS.set(KS, S); syncInputs(); refresh(); toast('Ajuste aplicado');
  }

  /* ───────── Mini barra, hints y refresco ───────── */
  function renderMini() {
    var m = $('#mini');
    if (R.vacio) { m.innerHTML = '<span>Sin comensales</span>'; return; }
    m.innerHTML = '<span><b>' + E.fmtG(R.arroz_g) + '</b> arroz</span><span><b>' + R.paella.d_real + ' cm</b> paella</span><span><b>' + E.fmtL(R.agua.al_arroz_ml) + '</b> agua</span><span><b>' + nf(R.tiempos.total, 1) + ' min</b> arroz</span>' + (R.bloqueada ? '<span style="color:var(--bad)"><b>Bloqueo</b></span>' : '');
  }
  function updateHints() {
    if (R.vacio) return;
    var set = function (id, t) { var n = $('#hint-' + id); if (n) n.textContent = t; };
    set('altitud_m', 'El agua hierve a ≈ ' + nf(R.ebullicion_c, 1) + ' ºC. +' + nf(1.8 * S.altitud_m / 100, 1) + ' % de agua y +' + nf(2 * S.altitud_m / 700, 1) + ' min de cocción.');
    set('agua_dureza_fh', 'Clasificación: ' + R.agua.clase + ' (blanda < 10, media 10-25, dura > 25 ºfH). Valencia ≈ 28 ºfH.');
    var v = E.VARIEDAD[S.arroz_variedad];
    set('arroz_variedad', v ? 'Tolerancia a la sobrecocción: ' + v.tol + ' · ≈ ' + v.t + ' min a nivel del mar · factor de agua ' + v.f : '');
    set('paella_diametro_cm', 'Recomendado ' + R.paella.d_rec + ' cm (rango ' + nf(R.paella.d_min, 0) + '-' + nf(R.paella.d_max, 0) + ' cm) · capa estimada ' + nf(R.paella.capa_cm, 1) + ' cm.');
    var ph = function (k, val) { var n = $('#i-' + k); if (n && n.placeholder !== undefined) n.placeholder = val ? 'auto (' + val + ')' : 'auto'; };
    ph('paella_diametro_cm', R.autos.paella_diametro_cm); ph('paella_base_cm', R.autos.paella_base_cm); ph('arroz_g_persona_override', R.g_persona);
    ['quemador_diametro_cm', 'quemador_aros'].forEach(function (k) {
      var sel = $('#i-' + k); if (!sel || !sel.options.length) return;
      sel.options[0].textContent = R.autos[k] ? 'Auto (' + R.autos[k] + ')' : 'Auto';
    });
  }
  function refresh() {
    R = E.compute(S);
    updateVisibility(); updateHints(); renderMini(); renderResult();
  }

  /* ───────── Diálogo, toast, portapapeles ───────── */
  var dlg = $('#dlg');
  function dlgOpen(html) { dlg.innerHTML = html; if (dlg.showModal) { if (!dlg.open) dlg.showModal(); } else dlg.setAttribute('open', ''); }
  function dlgClose() { if (dlg.close) dlg.close(); else dlg.removeAttribute('open'); }
  dlg.addEventListener('click', function (e) { if (e.target === dlg || e.target.hasAttribute('data-close')) dlgClose(); });
  var toastT;
  function toast(m) { var t = $('#toast'); t.textContent = m; t.classList.add('on'); clearTimeout(toastT); toastT = setTimeout(function () { t.classList.remove('on'); }, 1800); }
  function copyText(txt) {
    if (navigator.clipboard && navigator.clipboard.writeText) return navigator.clipboard.writeText(txt).then(function () { toast('Copiado'); }, fallback);
    fallback();
    function fallback() { var ta = document.createElement('textarea'); ta.value = txt; document.body.appendChild(ta); ta.select(); try { document.execCommand('copy'); toast('Copiado'); } catch (e) { toast('No se pudo copiar'); } ta.remove(); }
  }

  /* ───────── Perfiles, importar/exportar ───────── */
  function profiles() { return LS.get(KP, {}); }
  function menuHtml() {
    var ps = profiles(), names = Object.keys(ps);
    return '<h3>Menú</h3>' +
      '<div class="sub" style="margin-top:10px">Perfiles guardados</div>' +
      (names.length ? names.map(function (n) { return '<div class="list-row"><span>' + esc(n) + '</span><button class="btn small" data-act="loadprof" data-n="' + esc(n) + '">Cargar</button><button class="btn ghost small" data-act="delprof" data-n="' + esc(n) + '">Borrar</button></div>'; }).join('') : '<p class="muted">Aún no hay perfiles. Guarda tu paella y tu fuego con un nombre para recuperarlos con un toque.</p>') +
      '<div class="row" style="display:flex;gap:8px;margin-top:8px"><input type="text" id="pn" maxlength="40" placeholder="Nombre del perfil (p. ej. Mi paella 46 cm, gas)"><button class="btn primary" data-act="saveprof2">Guardar</button></div>' +
      '<div class="sub" style="margin-top:14px">Datos</div><div class="actions">' +
      '<button class="btn" data-act="export">Exportar JSON</button><button class="btn" data-act="import">Importar JSON</button><button class="btn" data-act="reset">Restablecer valores</button></div>' +
      '<div class="sub" style="margin-top:14px">Visualización</div><label class="sw"><input type="checkbox" id="evt"' + (document.body.classList.contains('noev') ? '' : ' checked') + '><i></i><span>Mostrar etiquetas de evidencia (F / P / I)</span></label>' +
      '<p class="muted"><span class="ev F">F</span> dato de fuente citada · <span class="ev P">P</span> práctica extendida · <span class="ev I">I</span> inferencia a calibrar.</p>' +
      '<div class="sub" style="margin-top:14px">Instalar</div><p class="muted">En Chrome/Edge/Android pulsa «Instalar» (si aparece). En iPhone: Compartir → «Añadir a pantalla de inicio». Requiere abrirla desde una dirección https (por ejemplo GitHub Pages) o localhost; funciona sin conexión tras la primera visita.</p>' +
      '<div class="actions" style="margin-top:10px"><button class="btn primary" data-close>Cerrar</button></div>';
  }
  function saveProfile(name) {
    name = (name || '').trim(); if (!name) { toast('Pon un nombre'); return false; }
    var ps = profiles(); ps[name] = JSON.parse(JSON.stringify(S)); LS.set(KP, ps); toast('Perfil guardado'); return true;
  }
  function doExport() {
    var data = JSON.stringify({ app: 'paella-calculadora', v: 1, estado: S, perfiles: profiles(), fichas: fichas() }, null, 2);
    try {
      var b = new Blob([data], { type: 'application/json' }), a = document.createElement('a');
      a.href = URL.createObjectURL(b); a.download = 'paella-datos.json'; document.body.appendChild(a); a.click(); a.remove();
    } catch (e) { copyText(data); }
  }
  function doImport() {
    var inp = document.createElement('input'); inp.type = 'file'; inp.accept = '.json,application/json';
    inp.onchange = function () {
      var f = inp.files[0]; if (!f) return;
      var r = new FileReader();
      r.onload = function () {
        try {
          var d = JSON.parse(r.result);
          if (!d || d.app !== 'paella-calculadora') throw new Error('formato');
          if (d.estado) { S = Object.assign({}, E.DEFAULTS, d.estado); LS.set(KS, S); }
          if (d.perfiles) LS.set(KP, Object.assign({}, profiles(), d.perfiles));
          if (d.fichas) LS.set(KF, d.fichas);
          syncInputs(); refresh(); toast('Datos importados'); dlgClose();
        } catch (e) { toast('Archivo no válido'); }
      };
      r.readAsText(f);
    };
    inp.click();
  }

  /* ───────── Eventos ───────── */
  document.addEventListener('click', function (e) {
    var b = e.target.closest('[data-act]'); if (!b) return;
    var a = b.dataset.act;
    if (a === 'copy') copyText(E.textoReceta(S, R));
    else if (a === 'print') window.print();
    else if (a === 'saveprof') dlgOpen('<h3>Guardar perfil</h3><input type="text" id="pn2" maxlength="40" placeholder="Nombre (p. ej. Mi paella 46 cm, gas)"><div class="actions" style="margin-top:12px"><button class="btn primary" data-act="saveprof3">Guardar</button><button class="btn" data-close>Cancelar</button></div>');
    else if (a === 'saveprof3') { if (saveProfile($('#pn2').value)) dlgClose(); }
    else if (a === 'saveprof2') { if (saveProfile($('#pn').value)) dlgOpen(menuHtml()); }
    else if (a === 'loadprof') { var p = profiles()[b.dataset.n]; if (p) { S = Object.assign({}, E.DEFAULTS, p); LS.set(KS, S); syncInputs(); refresh(); dlgClose(); toast('Perfil cargado'); } }
    else if (a === 'delprof') { var ps = profiles(); delete ps[b.dataset.n]; LS.set(KP, ps); dlgOpen(menuHtml()); }
    else if (a === 'export') doExport();
    else if (a === 'import') doImport();
    else if (a === 'reset') { if (confirm('¿Restablecer todos los valores a los de la guía? Los perfiles y fichas no se borran.')) { S = Object.assign({}, E.DEFAULTS, { estacion: E.seasonFromDate() }); LS.set(KS, S); syncInputs(); refresh(); dlgClose(); toast('Valores restablecidos'); } }
    else if (a === 'newficha') openFichaDialog();
    else if (a === 'exportfichas') copyText(fichas().map(function (f) { return f.fecha + ' | ' + f.resumen + ' | grano: ' + f.grano + ' | socarrat: ' + f.socarrat + (f.lena ? ' | leña ' + f.lena + ' kg' : '') + (f.cambio ? ' | cambio: ' + f.cambio : ''); }).join('\n'));
    else if (a === 'delficha') { var fs = fichas(); fs.splice(+b.dataset.i, 1); LS.set(KF, fs); renderResult(); }
    else if (a === 'sug') applySuggestion(b.dataset.t, +b.dataset.v);
  });
  dlg.addEventListener('change', function (e) { if (e.target.id === 'evt') { document.body.classList.toggle('noev', !e.target.checked); LS.set(KE, !e.target.checked); } });
  $('#btnMenu').addEventListener('click', function () { dlgOpen(menuHtml()); });
  $('#panelForm').addEventListener('input', onChange);
  $('#panelForm').addEventListener('change', onChange);
  $('#panelResult').addEventListener('toggle', function (e) { var d = e.target; if (d && d.dataset && d.dataset.id) openIds[d.dataset.id] = d.open; }, true);
  $('#tabForm').addEventListener('click', function () { document.body.classList.remove('show-result'); $('#tabForm').classList.add('on'); $('#tabRes').classList.remove('on'); window.scrollTo(0, 0); });
  $('#tabRes').addEventListener('click', function () { document.body.classList.add('show-result'); $('#tabRes').classList.add('on'); $('#tabForm').classList.remove('on'); window.scrollTo(0, 0); });

  /* PWA: instalación y conexión */
  var deferred = null;
  window.addEventListener('beforeinstallprompt', function (e) { e.preventDefault(); deferred = e; $('#btnInstall').hidden = false; });
  $('#btnInstall').addEventListener('click', function () { if (!deferred) return; deferred.prompt(); deferred.userChoice.then(function () { deferred = null; $('#btnInstall').hidden = true; }); });
  window.addEventListener('appinstalled', function () { $('#btnInstall').hidden = true; toast('Instalada'); });
  var net = function () { $('#netPill').hidden = navigator.onLine !== false; };
  window.addEventListener('online', net); window.addEventListener('offline', net); net();
  if ('serviceWorker' in navigator && /^https?:$/.test(location.protocol)) {
    window.addEventListener('load', function () { navigator.serviceWorker.register('sw.js').catch(function () { /* sin SW */ }); });
  }

  /* Inicio */
  if (LS.get(KE, false)) document.body.classList.add('noev');
  buildForm();
  refresh();
  if (location.hash === '#resultado') $('#tabRes').click();
  window.__paella = { get S() { return S; }, get R() { return R; }, refresh: refresh };
})();
