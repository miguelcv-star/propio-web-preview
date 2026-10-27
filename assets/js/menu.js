// Menú móvil accesible (spec 0001, criterio 3). Sin dependencias.
// La lógica de estado es pura (se prueba con `node --test`); `iniciar` solo conecta el DOM.
// Sin JavaScript el menú queda siempre visible: el CSS solo lo oculta si el script marcó `con-js`.
(function () {
  "use strict";
  var ANCHO_ESCRITORIO = 960;

  function estadoInicial() { return { abierto: false }; }
  function alternar(e) { return { abierto: !e.abierto }; }
  function alEscape(e, tecla) { return tecla === "Escape" ? { abierto: false } : e; }
  function etiqueta(e) { return e.abierto ? "Cerrar menú" : "Abrir menú"; }

  function iniciar(o) {
    var boton = o.boton, menu = o.menu, raiz = o.raiz, doc = o.documento, ventana = o.ventana;
    var estado = estadoInicial();
    raiz.classList.add("con-js");

    function pintar() {
      boton.setAttribute("aria-expanded", estado.abierto);
      boton.textContent = etiqueta(estado);
      menu.classList.toggle("nav-open", estado.abierto);
    }
    boton.addEventListener("click", function () { estado = alternar(estado); pintar(); });
    doc.addEventListener("keydown", function (ev) {
      if (estado.abierto && ev.key === "Escape") { estado = alEscape(estado, ev.key); pintar(); boton.focus(); }
    });
    menu.querySelectorAll("a").forEach(function (a) {
      a.addEventListener("click", function () { estado = { abierto: false }; pintar(); });
    });
    ventana.addEventListener("resize", function () {
      if (ventana.innerWidth > ANCHO_ESCRITORIO && estado.abierto) { estado = { abierto: false }; pintar(); }
    });
    pintar();
  }

  var api = { estadoInicial: estadoInicial, alternar: alternar, alEscape: alEscape, etiqueta: etiqueta, iniciar: iniciar };
  if (typeof module !== "undefined" && module.exports) { module.exports = api; }
  if (typeof document !== "undefined") {
    var boton = document.querySelector("[data-menu-boton]");
    var menu = document.getElementById("menu-principal");
    if (boton && menu) {
      iniciar({ boton: boton, menu: menu, raiz: document.documentElement, documento: document, ventana: window });
    }
  }
})();
