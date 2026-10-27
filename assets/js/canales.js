// Enlaces oficiales configurables. No carga widgets ni conoce miembros del grupo.
(function(){
  "use strict";
  function enlaceRadar(valor){
    try { var u=new URL(valor); if(u.protocol!=="https:"||u.hostname!=="chat.whatsapp.com"||u.username||u.password||u.port||!/^\/[A-Za-z0-9_-]{10,100}$/.test(u.pathname))return null;return u.origin+u.pathname; }
    catch(e){return null;}
  }
  var api={enlaceRadar:enlaceRadar};
  if(typeof module!=="undefined"&&module.exports)module.exports=api;
  if(typeof document==="undefined")return;
  var cfg=window.PROPIO_CONFIG||{}, enlace=enlaceRadar(cfg.radarGrupoUrl);
  Array.prototype.forEach.call(document.querySelectorAll("[data-radar]"),function(a){
    if(!enlace)return;a.setAttribute("href",enlace);a.setAttribute("target","_blank");a.setAttribute("rel","noopener noreferrer");a.hidden=false;
  });
  if(enlace)Array.prototype.forEach.call(document.querySelectorAll("[data-radar-pendiente]"),function(p){p.hidden=true;});
  var numero=String(cfg.whatsappNumero||"");
  if(/^\d{10,15}$/.test(numero))Array.prototype.forEach.call(document.querySelectorAll("[data-whatsapp]"),function(a){
    a.href="https://wa.me/"+numero+"?text="+encodeURIComponent("Hola, quiero conocer los servicios de Propio.");a.target="_blank";a.rel="noopener noreferrer";a.hidden=false;
  });
})();
