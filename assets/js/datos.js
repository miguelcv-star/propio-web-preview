// Lectura de datos públicos de Propio (spec 0010): el catálogo de inmuebles publicados por propietarios y las cifras
// del inicio. Solo pide GET /publico/inmuebles y GET /publico/cifras. Si la API falla, la página se queda con su texto
// fijo (nunca se rompe).
(function () {
  "use strict";
  if (typeof document === "undefined" || !window.PropioLib) { return; }
  var L = window.PropioLib, CFG = window.PROPIO_CONFIG || {};

  function el(tag, props, hijos) {
    var n = document.createElement(tag);
    Object.keys(props || {}).forEach(function (k) {
      if (k === "texto") { n.textContent = props[k]; } else if (k === "clase") { n.className = props[k]; } else { n.setAttribute(k, props[k]); }
    });
    (hijos || []).forEach(function (h) { if (h) { n.appendChild(typeof h === "string" ? document.createTextNode(h) : h); } });
    return n;
  }
  function pedir(ruta) {
    return window.fetch(L.urlApi(CFG.apiUrl, ruta), { credentials: "omit", referrerPolicy: "no-referrer" })
      .then(function (r) { if (!r.ok) { throw new Error("http"); } return r.json(); });
  }

  // Cifras del inicio
  var cifras = document.querySelector("[data-cifras]");
  if (cifras) {
    pedir("/publico/cifras").then(function (d) {
      if (d && d.inmuebles_analizados > 0) {
        cifras.textContent = "Analizamos más de " + d.inmuebles_analizados.toLocaleString("es-CO") + " inmuebles en " +
          d.localidades + (d.localidades === 1 ? " localidad." : " localidades.");
        cifras.hidden = false;
      }
    }).catch(function () { /* sin cifras: la sección simplemente no aparece */ });
  }

  // Catálogo
  var catalogo = document.querySelector("[data-catalogo]");
  if (catalogo) {
    var lista = catalogo.querySelector("[data-lista]"), estado = catalogo.querySelector("[data-estado]");
    var nav = catalogo.querySelector("[data-paginas]"), pagina = 0, POR_PAGINA = 12;
    var tarjeta = function (i) {
      var arriendo = i.operacion === "arriendo";
      var datos = [i.tipo_inmueble, i.area_construida ? i.area_construida + " m²" : null,
        i.habitaciones != null ? i.habitaciones + " hab." : null, i.banos != null ? i.banos + " baños" : null,
        i.estrato != null ? "estrato " + i.estrato : null].filter(Boolean).join(" · ");
      var fotos = (i.fotos || []).map(function (f, k) {
        var url = f.indexOf("/publico/fotos/") === 0 ? L.urlApi(CFG.apiUrl, f) : f;
        var enlace = el("a", { href: url, target: "_blank", rel: "noopener noreferrer", texto: "Foto " + (k + 1) });
        if (f.indexOf("/publico/fotos/") === 0) { enlace.appendChild(el("img", { src: url, alt: "Foto " + (k + 1) + " del inmueble", loading: "lazy" })); }
        return enlace;
      });
      return el("article", { clase: "web-inmueble" }, [
        el("h3", { texto: i.titulo }),
        el("p", { clase: "web-precio", texto: L.formatoPesos(i.precio) + (arriendo ? " /mes" : "") }),
        el("p", { clase: "web-datos", texto: datos }),
        el("p", { clase: "web-datos", texto: [i.barrio, i.localidad, i.ciudad].filter(Boolean).join(", ") }),
        i.descripcion ? el("p", { texto: i.descripcion }) : null,
        fotos.length ? el("p", { clase: "web-enlaces" }, fotos.reduce(function (a, f) { a.push(f, " "); return a; }, [])) : null
      ]);
    };
    var cargar = function () {
      estado.textContent = "Cargando…";
      pedir("/publico/inmuebles?pagina=" + pagina + "&por_pagina=" + POR_PAGINA).then(function (d) {
        while (lista.firstChild) { lista.removeChild(lista.firstChild); }
        (d.items || []).forEach(function (i) { lista.appendChild(tarjeta(i)); });
        estado.textContent = d.total ? d.total + (d.total === 1 ? " inmueble publicado" : " inmuebles publicados")
          : "Aún no hay inmuebles publicados. ¡Sé el primero: publica el tuyo gratis!";
        while (nav.firstChild) { nav.removeChild(nav.firstChild); }
        var ultima = Math.max(0, Math.ceil(d.total / POR_PAGINA) - 1);
        if (pagina > 0) { var a = el("button", { type: "button", clase: "btn-secundario", texto: "Anterior" }); a.addEventListener("click", function () { pagina--; cargar(); }); nav.appendChild(a); }
        if (pagina < ultima) { var s = el("button", { type: "button", clase: "btn-secundario", texto: "Siguiente" }); s.addEventListener("click", function () { pagina++; cargar(); }); nav.appendChild(s); }
      }).catch(function () { estado.textContent = "No pudimos cargar los inmuebles ahora. Inténtalo de nuevo más tarde."; });
    };
    cargar();
  }
})();
