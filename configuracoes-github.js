(() => {
  function cfg(){ return window.SUPABASE_CONFIG || {}; }
  function configurado(){ return Boolean(cfg().url && cfg().anonKey); }
  async function supabaseFetch(path, options={}){
    if(!configurado()) throw new Error('Supabase ainda não configurado.');
    const base = cfg().url.replace(/\/$/,'');
    const r = await fetch(base + '/rest/v1/' + path, {
      ...options,
      headers:{
        apikey:cfg().anonKey,
        Authorization:'Bearer ' + cfg().anonKey,
        'Content-Type':'application/json',
        Accept:'application/json',
        ...(options.headers||{})
      }
    });
    const t = await r.text();
    if(!r.ok) throw new Error(t || ('HTTP ' + r.status));
    return t ? JSON.parse(t) : null;
  }
  function esc(v){ return String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c])); }
  function urlImagem(v){
    const s=String(v||'').trim();
    const m=s.match(/^https:\/\/github\.com\/([^/]+)\/([^/]+)\/blob\/([^/]+)\/(.+)$/i);
    return m ? `https://raw.githubusercontent.com/${m[1]}/${m[2]}/${m[3]}/${m[4]}` : s;
  }

  let registro=null;
  let assinaturaPreviewUrl='';

  async function carregar(){
    const rows=await supabaseFetch('configuracao_empresa?ativo=eq.true&select=*&limit=1');
    registro=rows?.[0]||null;
    return registro;
  }

  async function carregarAssinaturaPreview(){
    try{
      const inst=await supabaseFetch('instrutores?ativo=eq.true&assinatura_path=not.is.null&select=assinatura_path&limit=1');
      assinaturaPreviewUrl=urlImagem(inst?.[0]?.assinatura_path||'');
    }catch(e){ assinaturaPreviewUrl=''; }
  }

  function campo(id,label,valor='',tipo='text'){
    return `<label>${label}<input id="${id}" type="${tipo}" value="${esc(valor)}"></label>`;
  }

  function html(c){
    const modelo=c?.certificado_modelo||'padrao';
    const tam=Number(c?.certificado_assinatura_tamanho||100);
    const op=Number(c?.certificado_assinatura_opacidade||100);
    return `
      <div class="card" style="max-width:1000px">
        <span class="status">Personalização do sistema</span>
        <h2 style="margin-top:12px">⚙️ Identidade da Empresa</h2>
        <p style="color:#6c757d">Estes dados serão usados nos documentos emitidos pelo sistema. A empresa do sistema é diferente do cliente/fazenda atendido.</p>
        <div class="grid-form">
          ${campo('cfgNome','Nome exibido *',c?.nome_exibicao||'')}
          ${campo('cfgSubtitulo','Subtítulo',c?.subtitulo||'')}
          ${campo('cfgTelefone','Telefone',c?.telefone||'')}
          ${campo('cfgWhatsapp','WhatsApp',c?.whatsapp||'')}
          ${campo('cfgEmail','E-mail',c?.email||'','email')}
          ${campo('cfgCor','Cor principal',c?.cor_principal||'#0b8f43','color')}
          <label class="full">Endereço<input id="cfgEndereco" value="${esc(c?.endereco||'')}"></label>
          <label class="full">Logo - URL pública<input id="cfgLogo" type="url" placeholder="https://..." value="${esc(c?.logo_url||'')}"></label>
          <label class="full">Imagem de rodapé - URL pública<input id="cfgRodape" type="url" placeholder="https://..." value="${esc(c?.rodape_url||'')}"><small style="display:block;margin-top:5px;color:#6c757d;font-weight:normal">Use uma imagem horizontal própria para o rodapé dos documentos.</small></label>
        </div>
        <div id="previewIdentidade" style="margin-top:18px;border:1px solid #dde6e3;border-radius:12px;padding:16px;min-height:100px"></div>
      </div>

      <div class="card" style="max-width:1000px">
        <span class="status">Documentos</span>
        <h2 style="margin-top:12px">🏅 Certificado</h2>
        <p style="color:#6c757d">Defina o modelo do certificado e ajuste a assinatura sem alterar sua posição no layout.</p>
        <div class="grid-form">
          <label>Modelo do certificado
            <select id="cfgCertModelo">
              <option value="padrao" ${modelo==='padrao'?'selected':''}>Layout padrão do sistema</option>
              <option value="personalizado" ${modelo==='personalizado'?'selected':''}>Plano de fundo personalizado</option>
            </select>
          </label>
          <label>Logo específico - URL pública<input id="cfgCertLogo" type="url" placeholder="Vazio = usar logo principal" value="${esc(c?.certificado_logo_url||'')}"></label>
          <div id="cfgCertPersonalizado" class="full" style="display:${modelo==='personalizado'?'block':'none'}">
            <div class="grid-form">
              <label>Imagem da frente - página 1<input id="cfgCertFrente" type="url" placeholder="https://..." value="${esc(c?.certificado_frente_url||'')}"></label>
              <label>Imagem do verso - página 2<input id="cfgCertVerso" type="url" placeholder="https://..." value="${esc(c?.certificado_verso_url||'')}"></label>
            </div>
          </div>
        </div>

        <div style="margin-top:20px;padding:16px;border:1px solid #dde6e3;border-radius:12px;background:#fafcfc">
          <h3 style="margin:0 0 12px">✍️ Assinatura do instrutor</h3>
          <p style="margin:0 0 14px;color:#6c757d;font-size:13px">A posição é fixa. O cliente pode ajustar somente tamanho e transparência.</p>
          <div class="grid-form">
            <label>Tamanho: <strong id="lblAssTam">${tam}%</strong>
              <input id="cfgAssTam" type="range" min="50" max="150" step="5" value="${tam}">
            </label>
            <label>Transparência: <strong id="lblAssOp">${op}%</strong>
              <input id="cfgAssOp" type="range" min="10" max="100" step="5" value="${op}">
            </label>
          </div>
          <div id="previewAssinatura" style="margin-top:12px;min-height:105px;border:1px dashed #b8c4c0;border-radius:10px;display:flex;align-items:flex-end;justify-content:center;padding:12px;background:#fff"></div>
          <div style="margin-top:10px"><button class="btn" id="restaurarAssinatura">↺ Restaurar padrão</button></div>
        </div>

        <div id="previewCertificado" style="margin-top:18px"></div>
        <div id="avisoConfiguracao" class="aviso"></div>
        <div class="acoes"><button class="btn" id="visualizarCertificado">Visualizar modelo</button><button class="btn primario" id="salvarConfiguracao">Salvar configurações</button></div>
      </div>`;
  }

  function atualizarPreview(){
    const box=document.getElementById('previewIdentidade'); if(!box)return;
    const logo=document.getElementById('cfgLogo').value.trim();
    const rodape=document.getElementById('cfgRodape').value.trim();
    const nome=document.getElementById('cfgNome').value.trim()||'Nome da empresa';
    const sub=document.getElementById('cfgSubtitulo').value.trim();
    box.innerHTML=`<div style="display:flex;gap:18px;align-items:center">${logo?`<img src="${esc(urlImagem(logo))}" alt="Logo" style="max-width:180px;max-height:80px;object-fit:contain" onerror="this.style.display='none'">`:'<div style="width:130px;height:60px;border:1px dashed #b8c4c0;border-radius:8px;display:flex;align-items:center;justify-content:center;color:#89938f">LOGO</div>'}<div><strong style="font-size:20px">${esc(nome)}</strong>${sub?`<div style="margin-top:5px;color:#6c757d">${esc(sub)}</div>`:''}</div></div>${rodape?`<div style="margin-top:16px;padding-top:12px;border-top:1px solid #dde6e3"><img src="${esc(urlImagem(rodape))}" alt="Rodapé" style="width:100%;max-height:100px;object-fit:contain;object-position:left center" onerror="this.style.display='none'"></div>`:''}`;
  }

  function atualizarCamposCertificado(){
    document.getElementById('cfgCertPersonalizado').style.display=document.getElementById('cfgCertModelo').value==='personalizado'?'block':'none';
  }

  function atualizarPreviewAssinatura(){
    const box=document.getElementById('previewAssinatura'); if(!box)return;
    const tam=Number(document.getElementById('cfgAssTam').value||100);
    const op=Number(document.getElementById('cfgAssOp').value||100);
    document.getElementById('lblAssTam').textContent=tam+'%';
    document.getElementById('lblAssOp').textContent=op+'%';
    const h=20*(tam/100);
    box.innerHTML=assinaturaPreviewUrl
      ? `<div style="width:330px;text-align:center"><img src="${esc(assinaturaPreviewUrl)}" style="height:${h}mm;max-width:${62*(tam/100)}mm;object-fit:contain;opacity:${op/100};display:block;margin:0 auto -1mm"><div style="border-top:1px solid #333;padding-top:5px;font-size:12px">Assinatura do Instrutor</div></div>`
      : `<div style="width:330px;text-align:center"><div style="height:${Math.max(24,h*3.2)}px;display:flex;align-items:center;justify-content:center;font-family:'Brush Script MT','Segoe Script',cursive;font-size:${26*(tam/100)}px;opacity:${op/100}">Assinatura</div><div style="border-top:1px solid #333;padding-top:5px;font-size:12px">Prévia demonstrativa</div></div>`;
  }

  function visualizarCertificado(){
    const box=document.getElementById('previewCertificado');
    const personalizado=document.getElementById('cfgCertModelo').value==='personalizado';
    const logo=document.getElementById('cfgCertLogo').value.trim()||document.getElementById('cfgLogo').value.trim();
    const frente=document.getElementById('cfgCertFrente')?.value.trim()||'';
    const cor=document.getElementById('cfgCor').value||'#0b8f43';
    box.innerHTML=`<div style="font-size:12px;color:#6c757d;margin-bottom:7px">Prévia simplificada da página 1</div><div style="position:relative;aspect-ratio:1.414/1;border:1px solid #ccd7d3;border-radius:8px;overflow:hidden;background:#fff;max-width:760px">${personalizado&&frente?`<img src="${esc(urlImagem(frente))}" style="position:absolute;inset:0;width:100%;height:100%;object-fit:cover">`:`<div style="position:absolute;inset:14px;border:7px solid ${esc(cor)};border-radius:4px"></div>${logo?`<img src="${esc(urlImagem(logo))}" style="position:absolute;top:7%;left:7%;max-width:23%;max-height:17%;object-fit:contain">`:''}`}<div style="position:absolute;left:15%;right:15%;top:28%;text-align:center"><div style="font-family:'Brush Script MT','Segoe Script',cursive;font-size:32px">Certificado</div><div style="margin-top:18px;font-size:13px">Conferimos o presente certificado...</div></div><div style="position:absolute;bottom:9%;left:10%;width:32%;text-align:center"><div style="height:45px"></div><div style="border-top:1px solid #555;padding-top:5px;font-size:11px">Assinatura do Instrutor</div></div></div>`;
  }

  async function salvar(){
    const nome=document.getElementById('cfgNome').value.trim();
    if(!nome){ alert('Informe o nome exibido da empresa.'); return; }
    const dados={
      nome_exibicao:nome,
      subtitulo:document.getElementById('cfgSubtitulo').value.trim()||null,
      telefone:document.getElementById('cfgTelefone').value.trim()||null,
      whatsapp:document.getElementById('cfgWhatsapp').value.trim()||null,
      email:document.getElementById('cfgEmail').value.trim()||null,
      endereco:document.getElementById('cfgEndereco').value.trim()||null,
      logo_url:document.getElementById('cfgLogo').value.trim()||null,
      rodape_url:document.getElementById('cfgRodape').value.trim()||null,
      cor_principal:document.getElementById('cfgCor').value||'#0b8f43',
      certificado_modelo:document.getElementById('cfgCertModelo').value,
      certificado_logo_url:document.getElementById('cfgCertLogo').value.trim()||null,
      certificado_frente_url:document.getElementById('cfgCertFrente')?.value.trim()||null,
      certificado_verso_url:document.getElementById('cfgCertVerso')?.value.trim()||null,
      certificado_assinatura_tamanho:Number(document.getElementById('cfgAssTam').value||100),
      certificado_assinatura_opacidade:Number(document.getElementById('cfgAssOp').value||100),
      ativo:true,
      atualizado_em:new Date().toISOString()
    };
    try{
      let retorno;
      if(registro?.id){
        retorno=await supabaseFetch('configuracao_empresa?id=eq.'+encodeURIComponent(registro.id),{method:'PATCH',headers:{Prefer:'return=representation'},body:JSON.stringify(dados)});
      }else{
        retorno=await supabaseFetch('configuracao_empresa',{method:'POST',headers:{Prefer:'return=representation'},body:JSON.stringify(dados)});
      }
      registro=retorno?.[0]||registro||dados;
      document.getElementById('avisoConfiguracao').textContent='Configurações salvas com sucesso.';
      window.TREINAMENTO_IDENTIDADE_EMPRESA=registro;
      atualizarPreview();
      atualizarPreviewAssinatura();
    }catch(e){ document.getElementById('avisoConfiguracao').textContent='Erro ao salvar: '+e.message; }
  }

  window.carregarIdentidadeEmpresaGithub=async function(){
    try{ const c=await carregar(); window.TREINAMENTO_IDENTIDADE_EMPRESA=c; return c; }
    catch(e){ console.warn('Identidade da empresa não carregada:',e); return null; }
  };

  window.renderConfiguracoesGithub=async function(){
    const area=document.getElementById('conteudoPrincipal');
    if(!configurado()){
      area.innerHTML='<div class="card"><h2>⚙️ Configurações</h2><div class="aviso">Supabase não configurado.</div></div>';
      return;
    }
    try{
      const c=await carregar();
      await carregarAssinaturaPreview();
      area.innerHTML=html(c);
      ['cfgNome','cfgSubtitulo','cfgLogo','cfgRodape'].forEach(id=>document.getElementById(id).addEventListener('input',atualizarPreview));
      document.getElementById('cfgCertModelo').onchange=atualizarCamposCertificado;
      document.getElementById('cfgAssTam').oninput=atualizarPreviewAssinatura;
      document.getElementById('cfgAssOp').oninput=atualizarPreviewAssinatura;
      document.getElementById('restaurarAssinatura').onclick=()=>{
        document.getElementById('cfgAssTam').value='100';
        document.getElementById('cfgAssOp').value='100';
        atualizarPreviewAssinatura();
      };
      document.getElementById('visualizarCertificado').onclick=visualizarCertificado;
      document.getElementById('salvarConfiguracao').onclick=salvar;
      atualizarPreview();
      atualizarPreviewAssinatura();
    }catch(e){
      area.innerHTML=`<div class="card"><h2>⚙️ Configurações</h2><div class="aviso">Erro ao carregar configuração: ${esc(e.message)}</div><p>Verifique se as migrations do módulo de configurações foram executadas no Supabase.</p></div>`;
    }
  };
})();