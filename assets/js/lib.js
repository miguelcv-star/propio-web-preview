// Lógica pura de los formularios del sitio (spec 0010): validación, armado del cuerpo que recibe la API pública de
// Propio, formato de resultados y manejo de errores. Sin DOM: se prueba con `node --test`.
(function () {
  "use strict";

  var PLAZOS = {
    "0-1": [0, 1], "1-3": [1, 3], "3-6": [3, 6], "6-12": [6, 12], "12+": [12, null]
  };
  var TIMEOUT_MS = 20000;

  function texto(v) { return v == null ? "" : String(v).trim(); }

  // «680» millones → 680000000. Acepta coma o punto decimal; vacío o inválido → null.
  function millonesAPesos(v) {
    var t = texto(v).replace(/\s/g, "").replace(",", ".");
    if (t === "") { return null; }
    var n = Number(t);
    return isFinite(n) && n >= 0 ? Math.round(n * 1e6) : null;
  }
  function aNumero(v) {
    var t = texto(v).replace(",", ".");
    if (t === "") { return null; }
    var n = Number(t);
    return isFinite(n) ? n : null;
  }
  function aEntero(v) {
    var n = aNumero(v);
    return n == null ? null : Math.round(n);
  }
  function plazoDe(clave) {
    var p = PLAZOS[clave];
    return p ? { plazo_min_meses: p[0], plazo_max_meses: p[1] } : {};
  }
  // Una foto por línea; solo http(s); máximo 8. Devuelve { fotos, invalidas }.
  function fotosDeTexto(t) {
    var lineas = texto(t).split(/\r?\n/).map(texto).filter(Boolean);
    var fotos = [], invalidas = [];
    lineas.forEach(function (l) {
      if (/^https?:\/\/[^\s]+$/i.test(l) && l.length <= 500) { fotos.push(l); } else { invalidas.push(l); }
    });
    return { fotos: fotos.slice(0, 8), invalidas: invalidas, demasiadas: fotos.length > 8 };
  }

  // ── validación ────────────────────────────────────────────────────────────
  var REGLAS = {
    solicitud: { obligatorios: ["intencion"] },
    invierte: { obligatorios: [] },
    busqueda: { obligatorios: ["operacion"] },
    valorar: { obligatorios: ["motivo", "tipo_inmueble", "area_construida"], ubicacion: true },
    vender: { obligatorios: ["operacion", "tipo_inmueble", "titulo", "descripcion", "precio", "area_construida"],
              ubicacion: true, acuerdo: true }
  };
  var ETIQUETAS = {
    operacion: "Elige si es venta o arriendo.", motivo: "Cuéntanos el motivo de tu consulta.",
    tipo_inmueble: "Elige el tipo de inmueble.", area_construida: "Escribe el área en metros cuadrados.",
    titulo: "Escribe un título para el aviso.", descripcion: "Escribe una descripción del inmueble.",
    precio: "Escribe el precio que esperas."
  };

  function validar(tipo, v) {
    var e = {}, regla = REGLAS[tipo];
    if (!regla) { return { _form: "Formulario desconocido." }; }
    var nombre = texto(v.nombre);
    if (nombre.length < 2) { e.nombre = "Escribe tu nombre."; }
    var tel = texto(v.telefono), mail = texto(v.email);
    if (!tel && !mail) { e.telefono = "Déjanos un teléfono o un correo para contactarte."; }
    if (tel && (tel.replace(/\D/g, "").length < 7 || tel.replace(/\D/g, "").length > 15)) { e.telefono = "El teléfono no parece válido."; }
    if (mail && !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(mail)) { e.email = "El correo no parece válido."; }
    regla.obligatorios.forEach(function (c) {
      if (texto(v[c]) === "") { e[c] = ETIQUETAS[c] || "Este campo es obligatorio."; }
    });
    ["area_construida", "precio"].forEach(function (c) {
      if (v[c] != null && texto(v[c]) !== "" && !(aNumero(v[c]) > 0)) { e[c] = "Escribe un número mayor que cero."; }
    });
    if (regla.obligatorios.indexOf("area_construida") >= 0 && !e.area_construida && aNumero(v.area_construida) <= 9) {
      e.area_construida = "El área debe ser de más de 9 m².";
    }
    if (regla.ubicacion && !texto(v.localidad) && !texto(v.barrio)) { e.localidad = "Elige la localidad o escribe el barrio."; }
    if (tipo === "vender") {
      var f = fotosDeTexto(v.fotos);
      if (f.invalidas.length) { e.fotos = "Cada foto debe ser un enlace que empiece por http:// o https://."; }
      else if (f.demasiadas) { e.fotos = "Máximo 8 fotos."; }
      if (texto(v.titulo) && texto(v.titulo).length < 5) { e.titulo = "El título es muy corto."; }
      if (texto(v.descripcion) && texto(v.descripcion).length < 10) { e.descripcion = "Cuéntanos un poco más del inmueble."; }
    }
    if (!v.consentimiento) { e.consentimiento = "Debes autorizar el tratamiento de tus datos para continuar."; }
    if (regla.acuerdo && !v.acepta_comision) { e.acepta_comision = "Debes aceptar el acuerdo de publicación y comisión."; }
    if (tipo === "solicitud") {
      var intenciones = ["invertir", "comprar-o-arrendar-para-mi", "invertir-por-mi-cuenta", "empezar-a-invertir", "conocer-precio", "contacto", "trabaja-con-nosotros"];
      if (intenciones.indexOf(v.intencion) < 0) e.intencion = "Elige un servicio válido.";
      if (v.intencion === "invertir" && !(millonesAPesos(v.presupuesto_max) > 0)) e.presupuesto_max = "Indica tu presupuesto máximo.";
      if (v.intencion === "comprar-o-arrendar-para-mi" && ["venta","arriendo"].indexOf(v.operacion)<0) e.operacion = "Elige si quieres comprar o arrendar.";
      if (v.intencion === "conocer-precio") {
        if (!v.tipo_inmueble) e.tipo_inmueble = "Elige el tipo de inmueble.";
        if (!(aNumero(v.area_construida)>9)) e.area_construida = "Indica un área mayor que 9 m².";
        if (!texto(v.localidad) && !texto(v.barrio) && !texto(v.zonas)) e.zonas = "Indica la zona del inmueble.";
      }
      if (v.intencion === "trabaja-con-nosotros") {
        if (!texto(v.ciudad)) e.ciudad = "Indica tu ciudad.";
        if (!texto(v.experiencia)) e.experiencia = "Cuéntanos tu experiencia.";
        if (!v.acepta_colaboracion) e.acepta_colaboracion = "Acepta las condiciones de colaboración para continuar.";
      }
    }
    if (tipo === "solicitud" || tipo === "vender") {
      ["presupuesto_min","presupuesto_max","area_min","area_max","area_construida","habitaciones","banos","parqueaderos"].forEach(function(c) {
        if (texto(v[c]) && (aNumero(v[c]) === null || aNumero(v[c]) < 0)) e[c] = "Escribe un número válido, mayor o igual que cero.";
      });
      if (texto(v.presupuesto_max) && !(millonesAPesos(v.presupuesto_max)>0)) e.presupuesto_max="El presupuesto máximo debe ser mayor que cero.";
      ["habitaciones","banos","parqueaderos","estrato","antiguedad_anios"].forEach(function(c){
        var n=aNumero(v[c]),max=c==="estrato"?6:c==="antiguedad_anios"?200:20;
        if(texto(v[c]) && (n===null || n<0 || n>max || !Number.isInteger(n))) e[c]="Escribe un número entero dentro del rango permitido.";
      });
      [["presupuesto_min","presupuesto_max"],["area_min","area_max"]].forEach(function(par) {
        if (texto(v[par[0]]) && texto(v[par[1]]) && aNumero(v[par[0]])>aNumero(v[par[1]])) e[par[1]] = "El máximo no puede ser menor que el mínimo.";
      });
    }
    return e;
  }

  // ── cuerpo de cada ruta de la API pública ─────────────────────────────────
  function limpio(o) {
    var r = {};
    Object.keys(o).forEach(function (k) {
      var x = o[k];
      if (x !== null && x !== undefined && x !== "" && !(Array.isArray(x) && x.length === 0)) { r[k] = x; }
    });
    return r;
  }
  function base(v, ctx) {
    return {
      nombre: texto(v.nombre), telefono: texto(v.telefono), email: texto(v.email).toLowerCase(),
      consentimiento: v.consentimiento === true, sitio_web: texto(v.sitio_web),
      tiempo_ms: ctx && ctx.tiempo_ms != null ? Math.max(0, Math.round(ctx.tiempo_ms)) : null,
      turnstile: ctx && ctx.turnstile ? ctx.turnstile : null
    };
  }
  function cuerpo(tipo, v, ctx) {
    if (tipo === "solicitud") return cuerpoSolicitud(v, ctx || {});
    var b = base(v, ctx), extra = {};
    if (tipo === "invierte") {
      var plazo = plazoDe(v.plazo);
      extra = {
        presupuesto_min: millonesAPesos(v.presupuesto_min), presupuesto_max: millonesAPesos(v.presupuesto_max),
        plazo_min_meses: plazo.plazo_min_meses, plazo_max_meses: plazo.plazo_max_meses,
        mensaje: (ctx && ctx.prefijoMensaje ? ctx.prefijoMensaje + " " : "") + texto(v.mensaje)
      };
      extra.mensaje = texto(extra.mensaje).slice(0, 1000);
    } else if (tipo === "busqueda") {
      extra = {
        operacion: v.operacion, tipo_inmueble: v.tipo_inmueble, localidad: texto(v.localidad), barrio: texto(v.barrio),
        presupuesto_min: millonesAPesos(v.presupuesto_min), presupuesto_max: millonesAPesos(v.presupuesto_max),
        area_min: aNumero(v.area_min), area_max: aNumero(v.area_max), habitaciones_min: aEntero(v.habitaciones_min),
        banos_min: aEntero(v.banos_min), estrato: aEntero(v.estrato), mensaje: texto(v.mensaje).slice(0, 1000)
      };
    } else if (tipo === "valorar") {
      extra = {
        motivo: v.motivo, operacion: v.operacion || "venta", tipo_inmueble: v.tipo_inmueble,
        area_construida: aNumero(v.area_construida), estrato: aEntero(v.estrato), habitaciones: aEntero(v.habitaciones),
        banos: aEntero(v.banos), parqueaderos: aEntero(v.parqueaderos), antiguedad_anios: aEntero(v.antiguedad_anios),
        localidad: texto(v.localidad), barrio: texto(v.barrio)
      };
    } else if (tipo === "vender") {
      extra = {
        acepta_comision: v.acepta_comision === true, operacion: v.operacion, tipo_inmueble: v.tipo_inmueble,
        titulo: texto(v.titulo), descripcion: texto(v.descripcion), precio: aNumero(v.precio),
        area_construida: aNumero(v.area_construida), habitaciones: aEntero(v.habitaciones), banos: aEntero(v.banos),
        parqueaderos: aEntero(v.parqueaderos), estrato: aEntero(v.estrato), antiguedad_anios: aEntero(v.antiguedad_anios),
        localidad: texto(v.localidad), barrio: texto(v.barrio), direccion: texto(v.direccion),
        fotos: fotosDeTexto(v.fotos).fotos, estado_inmueble: texto(v.estado_inmueble), horizonte: texto(v.horizonte)
      };
    }
    var salida = limpio(Object.assign({}, b, extra, tipo === "vender" ? atribucion(ctx || {}) : {}));
    if (tipo === "vender") salida.consentimiento_comunicaciones = v.consentimiento_comunicaciones === true;
    salida.consentimiento = b.consentimiento;                       // se envía siempre, aunque sea false
    if (tipo === "vender") { salida.acepta_comision = extra.acepta_comision; }
    return salida;
  }

  var RUTAS = { invierte: "/publico/contacto", busqueda: "/publico/busqueda", valorar: "/publico/valorar",
                vender: "/publico/vender", solicitud: "/publico/solicitudes", busqueda_pdf: "/publico/busqueda/pdf" };
  function urlApi(apiUrl, ruta) {
    var base = texto(apiUrl).replace(/\/+$/, "");
    return base + ruta;
  }

  var RUTAS_ORIGEN = ["/", "/invertir/", "/comprar-o-arrendar-para-mi/", "/invertir-por-mi-cuenta/", "/empezar-a-invertir/", "/conocer-precio/", "/vender-o-arrendar/", "/trabaja-con-nosotros/", "/contacto/", "/comunidad/", "/casos/", "/oportunidades/"];
  function atribucion(ctx) {
    var a = {};
    if (RUTAS_ORIGEN.indexOf(ctx.ruta_origen)>=0) a.ruta_origen = ctx.ruta_origen;
    ["utm_source","utm_medium","utm_campaign"].forEach(function(k) { if (/^[A-Za-z0-9_.-]{1,80}$/.test(ctx[k] || "")) a[k]=ctx[k]; });
    return a;
  }
  function contextoFormulario(ruta, search) {
    var ctx={ruta_origen:ruta}, params=new URLSearchParams(search || "");
    ["utm_source","utm_medium","utm_campaign"].forEach(function(k){ctx[k]=params.get(k);});
    return atribucion(ctx);
  }
  function urlConCampana(href, origen, contexto) {
    try {
      var u=new URL(href,origen),base=new URL(origen);
      if(u.origin!==base.origin||!["http:","https:"].includes(u.protocol))return null;
      var a=atribucion(contexto||{});
      ["utm_source","utm_medium","utm_campaign"].forEach(function(k){if(a[k]&&!u.searchParams.has(k))u.searchParams.set(k,a[k]);});
      return u.pathname+u.search+u.hash;
    } catch(e){return null;}
  }
  function cuerpoSolicitud(v, ctx) {
    var b=Object.assign(base(v,ctx),atribucion(ctx)), extra={};
    var textos=["intencion","operacion","tipo_inmueble","ciudad","localidad","barrio","zonas","horizonte","objetivo","financiacion","experiencia","indispensables","preferencias","nivel_acompanamiento","perfil","estado_inmueble","disponibilidad","transporte","operaciones","referencias","mensaje"];
    textos.forEach(function(k){if(texto(v[k]))extra[k]=texto(v[k]);});
    ["area_min","area_max","area_construida","habitaciones","banos","parqueaderos"].forEach(function(k){extra[k]=aNumero(v[k]);});
    ["presupuesto_min","presupuesto_max"].forEach(function(k){extra[k]=millonesAPesos(v[k]);});
    extra.consentimiento_comunicaciones=v.consentimiento_comunicaciones===true;
    if(v.intencion==="trabaja-con-nosotros")extra.acepta_colaboracion=v.acepta_colaboracion===true;
    return limpio(Object.assign(b,extra,plazoDe(v.horizonte)));
  }

  // ── formato ───────────────────────────────────────────────────────────────
  function formatoPesos(n) {
    if (n == null || !isFinite(n)) { return "—"; }
    return "$" + Math.round(n).toString().replace(/\B(?=(\d{3})+(?!\d))/g, ".");
  }
  function formatoMillones(n) {
    if (n == null || !isFinite(n)) { return "—"; }
    var m = n / 1e6;
    return "$" + (m >= 100 ? Math.round(m) : Math.round(m * 10) / 10).toString().replace(".", ",") + " M";
  }
  var CONFIANZA = {
    alta: "Confianza alta: hay varios inmuebles muy parecidos en tu zona.",
    media: "Confianza media: hay inmuebles comparables, pero no idénticos.",
    baja: "Confianza baja: tómalo solo como una primera idea."
  };
  function textoConfianza(c) { return CONFIANZA[c] || ""; }

  // ── errores ───────────────────────────────────────────────────────────────
  function mensajeDeError(status, detalle) {
    if (status === 422 && typeof detalle === "string" && detalle) { return detalle; }
    if (status === 429) { return "Hiciste muchas solicitudes seguidas. Espera un rato e inténtalo de nuevo."; }
    if (status === 403) { return "No pudimos verificar que eres una persona. Inténtalo de nuevo."; }
    if (status === 413 || status === 411) { return "Los datos enviados son demasiado grandes."; }
    if (status === 404 || status === 503) { return "El servicio no está disponible por ahora. Inténtalo más tarde."; }
    if (status === 0) { return "No pudimos conectarnos. Revisa tu conexión e inténtalo de nuevo."; }
    return "No pudimos procesar tu solicitud. Inténtalo de nuevo.";
  }

  // Envía el cuerpo con límite de tiempo. `fetchFn` se inyecta (en el navegador es window.fetch).
  // Devuelve { ok, status, datos, error, blob }; nunca lanza.
  function enviar(fetchFn, url, cuerpoJson, opciones) {
    opciones = opciones || {};
    var controlador = typeof AbortController !== "undefined" ? new AbortController() : null;
    var reloj = setTimeout(function () { if (controlador) { controlador.abort(); } }, opciones.timeoutMs || TIMEOUT_MS);
    var esFormData = typeof FormData !== "undefined" && cuerpoJson instanceof FormData;
    return fetchFn(url, {
      method: "POST", headers: esFormData ? {} : { "Content-Type": "application/json" }, body: esFormData ? cuerpoJson : JSON.stringify(cuerpoJson),
      signal: controlador ? controlador.signal : undefined, credentials: "omit", referrerPolicy: "no-referrer"
    }).then(function (res) {
      clearTimeout(reloj);
      if (!res.ok) {
        return res.json().catch(function () { return {}; }).then(function (j) {
          return { ok: false, status: res.status, error: mensajeDeError(res.status, j && j.detail) };
        });
      }
      if (opciones.blob) { return res.blob().then(function (b) { return { ok: true, status: res.status, blob: b }; }); }
      return res.json().then(function (j) { return { ok: true, status: res.status, datos: j }; });
    }).catch(function () {
      clearTimeout(reloj);
      return { ok: false, status: 0, error: mensajeDeError(0) };
    });
  }

  var api = {
    PLAZOS: PLAZOS, RUTAS: RUTAS, contextoFormulario: contextoFormulario, urlConCampana: urlConCampana, atribucion: atribucion, millonesAPesos: millonesAPesos, plazoDe: plazoDe, fotosDeTexto: fotosDeTexto,
    validar: validar, cuerpo: cuerpo, urlApi: urlApi, formatoPesos: formatoPesos, formatoMillones: formatoMillones,
    textoConfianza: textoConfianza, mensajeDeError: mensajeDeError, enviar: enviar
  };
  if (typeof module !== "undefined" && module.exports) { module.exports = api; }
  if (typeof window !== "undefined") { window.PropioLib = api; }
})();
