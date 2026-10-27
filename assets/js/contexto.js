// Contexto de intención (spec 0001 criterio 9 / 0003 criterio 7): la intención viaja en la URL como
// `?intencion=<id>` (un id fijo de la lista, nunca datos personales); cualquier otro valor se ignora.
// Lo usan el formulario (0005) y la analítica (0006).
(function () {
  "use strict";
  var INTENCIONES = ["vender-o-arrendar", "conocer-precio", "invertir-por-mi-cuenta",
    "empezar-a-invertir", "comprar-o-arrendar-para-mi", "invertir", "contacto", "trabaja-con-nosotros"];

  function intencionDesde(search) {
    var m = /[?&]intencion=([^&#]*)/.exec(search || "");
    if (!m) { return null; }
    var valor;
    try { valor = decodeURIComponent(m[1]); } catch (e) { return null; }
    return INTENCIONES.indexOf(valor) >= 0 ? valor : null;
  }
  function urlConIntencion(ruta, id) {
    return INTENCIONES.indexOf(id) >= 0 ? ruta + "?intencion=" + id : ruta;
  }

  var api = { INTENCIONES: INTENCIONES, intencionDesde: intencionDesde, urlConIntencion: urlConIntencion };
  if (typeof module !== "undefined" && module.exports) { module.exports = api; }
  if (typeof window !== "undefined") {
    window.AurexContexto = api;
    if (typeof document !== "undefined" && window.PropioLib) {
      var L=window.PropioLib, campana=L.contextoFormulario(window.location.pathname,window.location.search);
      document.addEventListener("click",function(e){
        var enlace=e.target.closest?e.target.closest("a[href]"):null;
        if(!enlace)return;
        var destino=L.urlConCampana(enlace.getAttribute("href"),window.location.origin+window.location.pathname,campana);
        if(destino)enlace.setAttribute("href",destino);
      });
    }
  }
})();
