// Captura asistida (0011). El navegador no busca inventario ni calcula valoraciones.
(function(){
  "use strict";
  if(typeof document==="undefined")return;
  var L=window.PropioLib,CFG=window.PROPIO_CONFIG||{};if(!L)return;
  function iniciar(form){
    var tipo=form.getAttribute("data-propio-form"),estado=form.querySelector("[data-estado]"),boton=form.querySelector("[type=submit]");
    var habilitado=CFG.captacionHabilitada===true&&CFG.textosLegalesAprobados===true&&/^https?:\/\//.test(CFG.apiUrl||"");
    var inicio=Date.now(),enviando=false,token=null,widget=null,empezo=false;
    var contexto=L.contextoFormulario(window.location.pathname,window.location.search);
    function aviso(texto,error){estado.textContent=texto;estado.className="web-estado"+(error?" error":"");}
    function track(nombre){if(window.PropioTrack)window.PropioTrack.registrar(nombre,Object.assign({ruta:window.location.pathname,intencion:form.getAttribute("data-intencion")},contexto));}
    if(!habilitado){boton.disabled=true;aviso("Previsualización: el envío se habilitará cuando estén aprobados los textos legales y configurada la API.",false);}
    if(habilitado&&CFG.turnstileSiteKey){
      var nodo=form.querySelector("[data-turnstile]"),s=document.createElement("script");
      s.src="https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit";s.async=true;s.defer=true;
      s.onload=function(){widget=window.turnstile.render(nodo,{sitekey:CFG.turnstileSiteKey,callback:function(t){token=t;},"expired-callback":function(){token=null;}});};
      s.onerror=function(){aviso("No pudimos cargar la verificación anti-spam. Recarga la página.",true);};document.head.appendChild(s);
    }
    form.addEventListener("input",function(){if(!empezo){empezo=true;track("lead_form_started");}});
    function valores(){var v={};Array.prototype.forEach.call(form.elements,function(c){if(c.name)v[c.name]=c.type==="checkbox"?c.checked:c.value;});var a=form.elements.fotos_archivos;v.fotos_archivos=a?Array.prototype.slice.call(a.files||[]):[];return v;}
    var selectorFotos=form.elements.fotos_archivos,listaFotos=form.querySelector("[data-fotos-seleccionadas]");
    var vistasFotos=[];
    function pintarFotos(){if(!selectorFotos||!listaFotos)return;vistasFotos.forEach(function(u){URL.revokeObjectURL(u);});vistasFotos=[];listaFotos.textContent="";Array.prototype.forEach.call(selectorFotos.files||[],function(f,i){var fila=document.createElement("span"),img=document.createElement("img"),texto=document.createElement("span"),quitar=document.createElement("button"),url=URL.createObjectURL(f);vistasFotos.push(url);img.src=url;img.alt="Vista previa de "+f.name;img.width=64;img.height=48;img.style.objectFit="cover";texto.textContent=f.name+" ("+Math.ceil(f.size/1024)+" KB) ";quitar.type="button";quitar.textContent="Quitar";quitar.setAttribute("aria-label","Quitar "+f.name);quitar.addEventListener("click",function(){var dt=new DataTransfer();Array.prototype.forEach.call(selectorFotos.files,function(x,j){if(j!==i)dt.items.add(x);});selectorFotos.files=dt.files;pintarFotos();});fila.appendChild(img);fila.appendChild(texto);fila.appendChild(quitar);listaFotos.appendChild(fila);});}
    if(selectorFotos)selectorFotos.addEventListener("change",pintarFotos);
    form.addEventListener("reset",function(){setTimeout(pintarFotos,0);});
    function errores(campos){var primero=null;
      Array.prototype.forEach.call(form.querySelectorAll("[data-error-for]"),function(p){p.textContent="";});
      Array.prototype.forEach.call(form.elements,function(c){c.removeAttribute("aria-invalid");});
      Object.keys(campos).forEach(function(k){var c=form.elements[k],p=form.querySelector('[data-error-for="'+k+'"]');if(p)p.textContent=campos[k];if(c){c.setAttribute("aria-invalid","true");if(!primero)primero=c;}});
      if(primero)primero.focus();
    }
    form.addEventListener("submit",function(e){
      e.preventDefault();if(!habilitado||enviando)return;
      var v=valores(),fallos=L.validar(tipo,v);
      if(tipo==="vender"){var archivos=v.fotos_archivos||[],bytes=archivos.reduce(function(n,f){return n+f.size;},0),enlaces=L.fotosDeTexto(v.fotos).fotos.length;if(archivos.some(function(f){return ["image/jpeg","image/png","image/webp"].indexOf(f.type)<0||f.size>5*1024*1024;}))fallos.fotos_archivos="Cada archivo debe ser una foto JPEG, PNG o WebP de máximo 5 MB.";else if(bytes>20*1024*1024)fallos.fotos_archivos="Las fotos adjuntas superan el máximo de 20 MB.";else if(archivos.length+enlaces>8)fallos.fotos_archivos="Puedes enviar hasta 8 fotos entre enlaces y archivos.";}
      errores(fallos);
      if(Object.keys(fallos).length){aviso("Revisa los campos marcados.",true);return;}
      if(v.sitio_web){aviso("Recibimos tu solicitud.",false);return;}
      if(CFG.turnstileSiteKey&&!token){aviso("Completa la verificación anti-spam para continuar.",true);return;}
      enviando=true;boton.disabled=true;form.setAttribute("aria-busy","true");var anterior=boton.textContent;boton.textContent="Enviando…";aviso("Enviando…",false);
      var body=L.cuerpo(tipo,v,Object.assign({},contexto,{tiempo_ms:Date.now()-inicio,turnstile:token}));
      if(tipo==="vender"&&v.fotos_archivos.length){var multipart=new FormData();multipart.append("datos",JSON.stringify(body));v.fotos_archivos.forEach(function(f){multipart.append("fotos",f,f.name);});body=multipart;}
      token=null;if(widget!==null)window.turnstile.reset(widget);
      L.enviar(window.fetch.bind(window),L.urlApi(CFG.apiUrl,L.RUTAS[tipo]),body).then(function(r){
        enviando=false;boton.disabled=false;boton.textContent=anterior;form.removeAttribute("aria-busy");
        if(!r.ok){track("lead_form_error");aviso(r.status===0?"No pudimos confirmar la recepción. El servidor podría haber guardado la solicitud. Tus datos siguen aquí; comprueba antes de repetir el envío.":r.error+" Tus datos siguen aquí.",true);return;}
        track("lead_form_submitted");form.reset();inicio=Date.now();empezo=false;aviso(r.datos&&r.datos.mensaje||"Recibimos tu solicitud. El equipo la revisará y te contactará.",false);
      });
    });
  }
  Array.prototype.forEach.call(document.querySelectorAll("form[data-propio-form]"),iniciar);
})();
