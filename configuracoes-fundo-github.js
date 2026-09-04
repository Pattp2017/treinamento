(() => {
  const renderOriginal = window.renderConfiguracoesGithub;
  if(!renderOriginal) return;

  function cfg(){return window.SUPABASE_CONFIG||{};}
  function configurado(){return Boolean(cfg().url&&cfg().anonKey);}
  async function supabaseFetch(path,options={}){
    if(!configurado()) throw new Error('Supabase ainda não configurado.');
    const base=cfg().url.replace(/\/$/,'');
    const r=await fetch(base+'/rest/v1/'+path,{...options,headers:{apikey:cfg().anonKey,Authorization:'Bearer '+cfg().anonKey,'Content-Type':'application/json',Accept:'application/json',...(options.headers||{})}});
    const t=await r.text();
    if(!r.ok) throw new Error(t||('HTTP '+r.status));
    return t?JSON.parse(t):null;
  }
  function esc(v){return String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));}
  function urlImagem(v){const s=String(v||'').trim();const m=s.match(/^https:\/\/github\.com\/([^/]+)\/([^/]+)\/blob\/([^/]+)\/(.+)$/i);return m?`https://raw.githubusercontent.com/${m[1]}/${m[2]}/${m[3]}/${m[4]}`:s;}
  function n(v,d){const x=Number(v);return Number.isFinite(x)?x:d;}

  async function lerConfig(){
    const rows=await supabaseFetch('configuracao_empresa?ativo=eq.true&select=*&limit=1');
    return rows?.[0]||null;
  }

  function bloco(prefixo,titulo,c){
    const escala=n(c?.[`certificado_${prefixo}_escala`],100);
    const op=n(c?.[`certificado_${prefixo}_opacidade`],100);
    const x=n(c?.[`certificado_${prefixo}_pos_x`],50);
    const y=n(c?.[`certificado_${prefixo}_pos_y`],50);
    const ajuste=c?.[`certificado_${prefixo}_ajuste`]||'cover';
    return `<div style="border:1px solid #dde6e3;border-radius:10px;padding:14px;background:#fff">
      <h4 style="margin:0 0 10px">${titulo}</h4>
      <label>Tamanho: <strong id="lbl_${prefixo}_escala">${escala}%</strong><input id="${prefixo}_escala" type="range" min="50" max="150" step="5" value="${escala}"></label>
      <label>Transparência: <strong id="lbl_${prefixo}_opacidade">${op}%</strong><input id="${prefixo}_opacidade" type="range" min="10" max="100" step="5" value="${op}"></label>
      <label>Posição horizontal: <strong id="lbl_${prefixo}_x">${x}%</strong><input id="${prefixo}_x" type="range" min="0" max="100" step="5" value="${x}"></label>
      <label>Posição vertical: <strong id="lbl_${prefixo}_y">${y}%</strong><input id="${prefixo}_y" type="range" min="0" max="100" step="5" value="${y}"></label>
      <label>Ajuste da imagem<select id="${prefixo}_ajuste"><option value="cover" ${ajuste==='cover'?'selected':''}>Preencher</option><option value="contain" ${ajuste==='contain'?'selected':''}>Conter</option><option value="fill" ${ajuste==='fill'?'selected':''}>Esticar</option></select></label>
      <div id="preview_${prefixo}" style="margin-top:10px;position:relative;aspect-ratio:1.414/1;border:1px dashed #b8c4c0;border-radius:8px;overflow:hidden;background:#fff"></div>
      <button class="btn" id="restaurar_${prefixo}" style="margin-top:10px">↺ Restaurar padrão</button>
    </div>`;
  }

  function atualizar(prefixo){
    const escala=n(document.getElementById(prefixo+'_escala')?.value,100);
    const op=n(document.getElementById(prefixo+'_opacidade')?.value,100);
    const x=n(document.getElementById(prefixo+'_x')?.value,50);
    const y=n(document.getElementById(prefixo+'_y')?.value,50);
    const ajuste=document.getElementById(prefixo+'_ajuste')?.value||'cover';
    const urlId=prefixo==='frente'?'cfgCertFrente':'cfgCertVerso';
    const url=urlImagem(document.getElementById(urlId)?.value||'');
    const mapa={escala,x,y,opacidade:op};
    Object.entries(mapa).forEach(([k,v])=>{const el=document.getElementById('lbl_'+prefixo+'_'+k);if(el)el.textContent=v+'%';});
    const box=document.getElementById('preview_'+prefixo);if(!box)return;
    box.innerHTML=url?`<img src="${esc(url)}" style="position:absolute;inset:0;width:100%;height:100%;object-fit:${ajuste};object-position:${x}% ${y}%;transform:scale(${escala/100});transform-origin:center;opacity:${op/100}">`:'<div style="position:absolute;inset:0;display:flex;align-items:center;justify-content:center;color:#89938f;font-size:12px">Informe a URL da imagem para visualizar</div>';
  }

  function restaurar(prefixo){
    document.getElementById(prefixo+'_escala').value='100';
    document.getElementById(prefixo+'_opacidade').value='100';
    document.getElementById(prefixo+'_x').value='50';
    document.getElementById(prefixo+'_y').value='50';
    document.getElementById(prefixo+'_ajuste').value='cover';
    atualizar(prefixo);
  }

  async function salvarAjustes(){
    try{
      const c=await lerConfig(); if(!c?.id) return;
      const dados={
        certificado_frente_escala:n(document.getElementById('frente_escala')?.value,100),
        certificado_frente_opacidade:n(document.getElementById('frente_opacidade')?.value,100),
        certificado_frente_pos_x:n(document.getElementById('frente_x')?.value,50),
        certificado_frente_pos_y:n(document.getElementById('frente_y')?.value,50),
        certificado_frente_ajuste:document.getElementById('frente_ajuste')?.value||'cover',
        certificado_verso_escala:n(document.getElementById('verso_escala')?.value,100),
        certificado_verso_opacidade:n(document.getElementById('verso_opacidade')?.value,100),
        certificado_verso_pos_x:n(document.getElementById('verso_x')?.value,50),
        certificado_verso_pos_y:n(document.getElementById('verso_y')?.value,50),
        certificado_verso_ajuste:document.getElementById('verso_ajuste')?.value||'cover',
        atualizado_em:new Date().toISOString()
      };
      const resp=await supabaseFetch('configuracao_empresa?id=eq.'+encodeURIComponent(c.id),{method:'PATCH',headers:{Prefer:'return=representation'},body:JSON.stringify(dados)});
      if(window.TREINAMENTO_IDENTIDADE_EMPRESA) Object.assign(window.TREINAMENTO_IDENTIDADE_EMPRESA,dados);
      if(resp?.[0]) window.TREINAMENTO_IDENTIDADE_EMPRESA=resp[0];
    }catch(e){
      const aviso=document.getElementById('avisoConfiguracao');
      if(aviso) aviso.textContent='Erro ao salvar ajustes do plano de fundo: '+e.message;
    }
  }

  async function adicionar(){
    const alvo=document.getElementById('cfgCertPersonalizado');
    if(!alvo||document.getElementById('ajustesFundoCertificado'))return;
    const c=await lerConfig();
    const painel=document.createElement('div');
    painel.id='ajustesFundoCertificado';
    painel.style.cssText='margin-top:16px;padding:16px;border:1px solid #dde6e3;border-radius:12px;background:#fafcfc';
    painel.innerHTML=`<h3 style="margin:0 0 6px">🖼️ Ajuste do plano de fundo</h3><p style="margin:0 0 14px;color:#6c757d;font-size:13px">Ajuste cada página sem precisar alterar a imagem original.</p><div style="display:grid;grid-template-columns:1fr 1fr;gap:14px">${bloco('frente','Página 1 - Frente',c)}${bloco('verso','Página 2 - Verso',c)}</div>`;
    alvo.appendChild(painel);
    ['frente','verso'].forEach(p=>{
      ['escala','opacidade','x','y','ajuste'].forEach(k=>document.getElementById(p+'_'+k)?.addEventListener('input',()=>atualizar(p)));
      document.getElementById('restaurar_'+p).onclick=()=>restaurar(p);
      const urlId=p==='frente'?'cfgCertFrente':'cfgCertVerso';
      document.getElementById(urlId)?.addEventListener('input',()=>atualizar(p));
      atualizar(p);
    });
    document.getElementById('salvarConfiguracao')?.addEventListener('click',()=>setTimeout(salvarAjustes,150));
  }

  window.renderConfiguracoesGithub=async function(){
    await renderOriginal();
    try{await adicionar();}catch(e){console.warn('Ajustes de fundo não carregados:',e);}
  };
})();