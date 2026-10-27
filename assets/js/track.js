// Eventos preparados; sin proveedor, persistencia, cookies ni peticiones de terceros.
(function(){
  "use strict";
  var permitidos=["public_page_view","intent_selected","lead_form_started","lead_form_submitted","lead_form_error","whatsapp_clicked","case_study_opened","report_downloaded","cta_clicked"];
  function evento(nombre,contexto){
    if(permitidos.indexOf(nombre)<0)return null;
    contexto=contexto||{};var datos={evento:nombre,fuente:"web_propio",fecha:new Date().toISOString()};
    if(/^\/(?:[a-z-]+\/)?$/.test(contexto.ruta||""))datos.ruta=contexto.ruta;
    var intenciones=["invertir","vender-o-arrendar","comprar-o-arrendar-para-mi","conocer-precio","empezar-a-invertir","invertir-por-mi-cuenta","contacto","trabaja-con-nosotros"];
    if(intenciones.indexOf(contexto.intencion)>=0)datos.intencion=contexto.intencion;
    ["utm_source","utm_medium","utm_campaign"].forEach(function(k){if(/^[A-Za-z0-9_.-]{1,80}$/.test(contexto[k]||""))datos[k]=contexto[k];});
    return datos;
  }
  // El adaptador está apagado: validar el evento no lo envía ni lo almacena.
  function registrar(nombre,contexto){return evento(nombre,contexto);}
  var api={evento:evento,registrar:registrar};
  if(typeof module!=="undefined"&&module.exports)module.exports=api;
  if(typeof window==="undefined"||typeof document==="undefined")return;
  window.PropioTrack=api;
  registrar("public_page_view",{ruta:window.location.pathname});
  document.addEventListener("click",function(e){var a=e.target.closest?e.target.closest("[data-track],[data-radar],[data-whatsapp]"):null;if(!a)return;registrar(a.hasAttribute("data-radar")||a.hasAttribute("data-whatsapp")?"whatsapp_clicked":a.getAttribute("data-track"),{ruta:window.location.pathname,intencion:a.getAttribute("data-intencion")});});
})();
