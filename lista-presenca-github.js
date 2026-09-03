(() => {
  function cfg(){ return window.SUPABASE_CONFIG || {}; }
  function configurado(){ return Boolean(cfg().url && cfg().anonKey); }
  async function supabaseFetch(path, options={}){
    if(!configurado()) throw new Error('Supabase ainda não configurado.');
    const base=cfg().url.replace(/\/$/,'');
    const resposta=await fetch(base+'/rest/v1/'+path,{...options,headers:{apikey:cfg().anonKey,Authorization:'Bearer '+cfg().anonKey,'Content-Type':'application/json',Accept:'application/json',...(options.headers||{})}});
    const texto=await resposta.text();
    if(!resposta.ok) throw new Error(texto||('HTTP '+resposta.status));
    return texto?JSON.parse(texto):null;
  }
  function esc(v){return String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));}
  function dataBr(v){if(!v)return'';const p=String(v).split('-');return p.length===3?`${p[2]}/${p[1]}/${p[0]}`:v;}
  function hojeBr(){return new Date().toLocaleDateString('pt-BR');}
  function formatarCPF(v){const d=String(v||'').replace(/\D/g,'').slice(0,11);return d.replace(/(\d{3})(\d)/,'$1.$2').replace(/(\d{3})(\d)/,'$1.$2').replace(/(\d{3})(\d{1,2})$/,'$1-$2');}
  function formatarCarga(v){if(v===null||v===undefined||v==='')return'';const n=Number(v);return Number.isFinite(n)?`${String(Math.floor(n)).padStart(2,'0')}:00:00`:String(v);}
  function fecharModal(){document.getElementById('modalListaPresenca')?.remove();}
  function conteudoHtml(texto){
    const seguro=esc(texto||'Conteúdo programático não informado.');
    return seguro.replace(/\r?\n/g,'<br>');
  }
  function cabecalhoDocumento(turma){
    return `<table class="cabecalho-doc"><tr><td class="logo-doc" rowspan="2"><div class="logo-simbolo">RG</div><div class="logo-texto">CERTE</div><small>CONSULTORIA E PROJETOS</small></td><td class="titulo-doc" colspan="5">Relatório de Treinamento</td></tr><tr><td><b>Código ▼</b><span>Form: RG_Presença</span></td><td><b>Impresso em ▼</b><span>${hojeBr()}</span></td><td><b>Elaborado por ▼</b><span>Eq. Téc. RG Certe</span></td><td><b>Aprovado por ▼</b><span>Raphael O. Gualberto</span></td><td><b>Página ▼</b><span class="pagina-numero"></span></td></tr></table>`;
  }
  function blocoDados(turma){
    return `<table class="dados-turma"><tr class="faixa"><th>Instrutor (es)</th><th>Habilitação</th><th>Local do Treinamento</th></tr><tr><td>${esc(turma.instrutor||'')}</td><td>${esc(turma.habilitacao_instrutor||'')}</td><td>${esc(turma.empresa||'')}</td></tr><tr class="faixa"><th>Data Inicial</th><th>Data Final</th><th>Carga Horária</th></tr><tr><td>${esc(dataBr(turma.data_inicio))}</td><td>${esc(dataBr(turma.data_fim))}</td><td>${esc(formatarCarga(turma.carga_horaria))}</td></tr></table>`;
  }
  function tabelaParticipantes(participantes){
    const linhas=participantes.map(p=>`<tr><td>${esc(p.nome)}</td><td>${esc(String(p.cpf||'').replace(/\D/g,''))}</td><td class="assinatura"></td></tr>`).join('');
    return `<table class="participantes"><thead><tr class="faixa"><th>NOME</th><th>CPF</th><th>ASSINATURA</th></tr></thead><tbody>${linhas}</tbody></table>`;
  }
  function htmlImpressao(turma, participantes){
    return `<!doctype html><html lang="pt-BR"><head><meta charset="utf-8"><title>${esc(turma.treinamento||'Relatório de Treinamento')}</title><style>
      @page{size:A4;margin:10mm 11mm 16mm}
      *{box-sizing:border-box} body{font-family:Arial,sans-serif;color:#111;font-size:10px;margin:0;background:#fff}
      table{width:100%;border-collapse:collapse} th,td{border:1px solid #222;padding:4px 6px;vertical-align:middle}
      .cabecalho-doc{margin-bottom:10px}.logo-doc{width:18%;text-align:center;padding:6px}.logo-simbolo{font-weight:900;font-size:26px;color:#0b8f43;line-height:1}.logo-texto{font-weight:800;color:#0b8f43;font-size:15px}.logo-doc small{font-size:6px;color:#0b8f43}.titulo-doc{text-align:center;font-family:Georgia,serif;font-size:18px;height:30px}.cabecalho-doc b{display:block;text-align:center;font-size:8px}.cabecalho-doc span{display:block;text-align:center;margin-top:5px;font-size:8px}
      .dados-turma{margin-bottom:10px;text-align:center}.dados-turma th{font-weight:700}.dados-turma td{font-weight:600;height:28px}.faixa th,.faixa td{background:#edf3dc}
      .secao{border:1px solid #222;margin-bottom:10px;page-break-inside:avoid}.secao-titulo{background:#edf3dc;border-bottom:1px solid #222;font-weight:700;text-align:center;padding:5px}.secao-corpo{padding:7px;line-height:1.25}.secao-corpo strong{display:block;margin-bottom:5px}.desenvolvimento{text-align:center;padding:8px}
      .participantes{page-break-inside:auto}.participantes thead{display:table-header-group}.participantes tr{page-break-inside:avoid;page-break-after:auto}.participantes th{text-align:center;font-weight:700}.participantes td:nth-child(1){width:34%;font-weight:600;text-align:center}.participantes td:nth-child(2){width:20%;font-weight:600;text-align:center}.participantes td:nth-child(3){width:46%}.assinatura{height:27px}
      .rodape{position:fixed;left:11mm;right:11mm;bottom:5mm;border-top:0;font-size:8px;color:#617a42;line-height:1.25}.rodape-linha{height:4px;background:linear-gradient(90deg,#9ad74b 0 78%,#00a651 78%)}
      .acoes-print{position:fixed;right:14px;top:14px;z-index:5}.acoes-print button{padding:8px 12px}
      @media print{.acoes-print{display:none}.pagina-numero:after{content:counter(page)}}
    </style></head><body>
      <div class="acoes-print"><button onclick="window.print()">Imprimir / Salvar PDF</button></div>
      ${cabecalhoDocumento(turma)}
      ${blocoDados(turma)}
      <div class="secao"><div class="secao-titulo">CONTEÚDO MINISTRADO.</div><div class="secao-corpo"><strong>${esc(turma.treinamento||'')}</strong>${conteudoHtml(turma.conteudo_programatico||turma.topicos_realizados||'')}</div></div>
      <div class="secao"><div class="secao-titulo">FORMA DE DESENVOLVIMENTO DO TREINAMENTO</div><div class="desenvolvimento">Explicação oral equipamento visual complementar, demonstrações e atividades práticas.</div></div>
      <div class="secao"><div class="secao-titulo">FORMA DE DESENVOLVIMENTO DO TREINAMENTO</div><div class="desenvolvimento">Através da análise global, considero todos aptos a realizarem as funções pré determinadas.</div></div>
      ${tabelaParticipantes(participantes)}
      <div class="rodape">RG Certe | Certificações Agrícolas, Saúde e Segurança do Trabalho.<br>RG Extintores | Venda e Manutenção de Equipamentos de Combate a Incêndio.<br>Fone: (35) 3265 - 4682 | (35) 9 8810 - 9495<br>E-mail: rgcerte@gmail.com | raphaelrgcerte@gmail.com<br>End: Av. Juscelino Kubitschek, Nº 941, Bairro Francisco Vieira Campos – Três Pontas | MG<div class="rodape-linha"></div></div>
    </body></html>`;
  }
  async function carregar(ev){
    if(!ev?.id_turma) throw new Error('Este agendamento ainda não possui turma.');
    const ts=await supabaseFetch('turmas?id=eq.'+encodeURIComponent(ev.id_turma)+'&select=*&limit=1');
    if(!ts?.length) throw new Error('Turma não encontrada.');
    const turma=ts[0];
    if(!turma.topicos_realizados && turma.treinamento_id){
      const tr=await supabaseFetch('treinamentos?id=eq.'+encodeURIComponent(turma.treinamento_id)+'&select=topicos_padrao&limit=1');
      if(tr?.length) turma.conteudo_programatico=tr[0].topicos_padrao||'';
    }
    const participantes=await supabaseFetch('turma_participantes?turma_id=eq.'+encodeURIComponent(turma.id)+'&select=nome,cpf&order=nome.asc')||[];
    if(!participantes.length) throw new Error('A turma não possui participantes.');
    return {turma,participantes};
  }
  function renderModal(ev,turma,participantes){
    fecharModal();
    const modal=document.createElement('div');modal.id='modalListaPresenca';modal.className='modal';
    modal.innerHTML=`<div class="modal-box" style="width:min(980px,97vw)"><div style="display:flex;justify-content:space-between;gap:12px;align-items:center"><h3 style="margin:0">✅ Lista de Presença</h3><button class="btn" id="fecharListaPresenca">✕</button></div><div class="aviso" style="color:#46505a">Prévia baseada no modelo institucional atual. Use a impressão para conferir a paginação A4.</div><div style="border:1px solid #dde6e3;border-radius:10px;padding:10px;background:#fff;max-height:58vh;overflow:auto"><div style="font-family:Arial,sans-serif;font-size:12px"><div style="text-align:center;font-size:18px;font-weight:700;margin-bottom:8px">Relatório de Treinamento</div><div style="display:grid;grid-template-columns:repeat(3,1fr);gap:6px;margin-bottom:8px"><div><b>Instrutor:</b><br>${esc(turma.instrutor||'')}</div><div><b>Habilitação:</b><br>${esc(turma.habilitacao_instrutor||'')}</div><div><b>Local:</b><br>${esc(turma.empresa||'')}</div></div><div style="border:1px solid #cfd9ca;padding:8px;margin-bottom:8px"><b>CONTEÚDO MINISTRADO.</b><div style="margin-top:6px">${conteudoHtml(turma.conteudo_programatico||turma.topicos_realizados||'')}</div></div><div><b>Participantes:</b> ${participantes.length}</div></div></div><div class="acoes"><button class="btn secundario" id="cancelarListaPresenca">Voltar</button><button class="btn" id="imprimirListaPresenca">🖨️ Abrir modelo para impressão</button><button class="btn primario" id="concluirListaPresenca">✅ Confirmar lista gerada</button></div></div>`;
    document.body.appendChild(modal);
    document.getElementById('fecharListaPresenca').onclick=fecharModal;document.getElementById('cancelarListaPresenca').onclick=fecharModal;
    document.getElementById('imprimirListaPresenca').onclick=()=>{const w=window.open('','_blank');if(!w){alert('O navegador bloqueou a janela de impressão.');return;}w.document.open();w.document.write(htmlImpressao(turma,participantes));w.document.close();};
    document.getElementById('concluirListaPresenca').onclick=async()=>{try{const filtro=ev.id?'id=eq.'+encodeURIComponent(ev.id):'codigo=eq.'+encodeURIComponent(ev.codigo);await supabaseFetch('agenda?'+filtro,{method:'PATCH',body:JSON.stringify({etapa:Math.max(3,Number(ev.etapa||1)),atualizado_em:new Date().toISOString()})});ev.etapa=Math.max(3,Number(ev.etapa||1));fecharModal();alert('Lista de presença confirmada. A Agenda avançou para a etapa 3.');if(window.renderAgendaGithub)await window.renderAgendaGithub();}catch(e){alert('Erro ao confirmar lista: '+e.message);}};
  }
  window.abrirListaPresencaGithub=async function(ev){try{const dados=await carregar(ev);renderModal(ev,dados.turma,dados.participantes);}catch(e){alert('Erro ao abrir lista de presença: '+e.message);}};
})();