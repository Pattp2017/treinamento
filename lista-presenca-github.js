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
  function periodo(a,b){const i=dataBr(a),f=dataBr(b);return i&&f&&i!==f?`${i} a ${f}`:(i||f||'');}
  function fecharModal(){document.getElementById('modalListaPresenca')?.remove();}
  function htmlImpressao(turma, participantes){
    const linhas=participantes.map((p,i)=>`<tr><td>${i+1}</td><td>${esc(p.nome)}</td><td>${esc(formatarCPF(p.cpf))}</td><td class="assinatura"></td></tr>`).join('');
    return `<!doctype html><html lang="pt-BR"><head><meta charset="utf-8"><title>Lista de Presença - ${esc(turma.codigo||'')}</title><style>@page{size:A4;margin:12mm}*{box-sizing:border-box}body{font-family:Arial,sans-serif;color:#111;font-size:12px;margin:0}h1{text-align:center;font-size:18px;margin:0 0 14px}.dados{display:grid;grid-template-columns:1fr 1fr;border:1px solid #222;margin-bottom:12px}.dados div{padding:6px 8px;border-right:1px solid #222;border-bottom:1px solid #222}.dados div:nth-child(even){border-right:0}.dados .full{grid-column:1/-1;border-right:0}table{width:100%;border-collapse:collapse}th,td{border:1px solid #222;padding:6px}th{background:#eee}.num{width:36px}.cpf{width:125px}.assinatura{height:34px;width:220px}.rodape{margin-top:16px;font-size:10px;color:#555}@media print{button{display:none}}</style></head><body><h1>LISTA DE PRESENÇA</h1><div class="dados"><div><strong>Empresa:</strong> ${esc(turma.empresa)}</div><div><strong>Turma:</strong> ${esc(turma.codigo||'')}</div><div><strong>Treinamento:</strong> ${esc(turma.treinamento)}</div><div><strong>Carga Horária:</strong> ${esc(turma.carga_horaria||'')} h</div><div><strong>Período:</strong> ${esc(periodo(turma.data_inicio,turma.data_fim))}</div><div><strong>Instrutor:</strong> ${esc(turma.instrutor||'')}</div><div class="full"><strong>Habilitação / Registro:</strong> ${esc([turma.habilitacao_instrutor,turma.registro_instrutor].filter(Boolean).join(' - '))}</div></div><table><thead><tr><th class="num">Nº</th><th>Nome</th><th class="cpf">CPF</th><th>Assinatura</th></tr></thead><tbody>${linhas}</tbody></table><div class="rodape">Treinamento 2.0 - RG Certe SST</div><script>window.onload=()=>window.print();<\/script></body></html>`;
  }
  function formatarCPF(v){const d=String(v||'').replace(/\D/g,'').slice(0,11);return d.replace(/(\d{3})(\d)/,'$1.$2').replace(/(\d{3})(\d)/,'$1.$2').replace(/(\d{3})(\d{1,2})$/,'$1-$2');}
  async function carregar(ev){
    if(!ev?.id_turma) throw new Error('Este agendamento ainda não possui turma.');
    const ts=await supabaseFetch('turmas?id=eq.'+encodeURIComponent(ev.id_turma)+'&select=*&limit=1');
    if(!ts?.length) throw new Error('Turma não encontrada.');
    const turma=ts[0];
    const participantes=await supabaseFetch('turma_participantes?turma_id=eq.'+encodeURIComponent(turma.id)+'&select=nome,cpf&order=nome.asc')||[];
    if(!participantes.length) throw new Error('A turma não possui participantes.');
    return {turma,participantes};
  }
  function renderModal(ev,turma,participantes){
    fecharModal();
    const modal=document.createElement('div');modal.id='modalListaPresenca';modal.className='modal';
    const linhas=participantes.map((p,i)=>`<tr><td style="width:46px;text-align:center">${i+1}</td><td>${esc(p.nome)}</td><td>${esc(formatarCPF(p.cpf))}</td><td style="height:34px"></td></tr>`).join('');
    modal.innerHTML=`<div class="modal-box" style="width:min(920px,96vw)"><div style="display:flex;justify-content:space-between;gap:12px;align-items:center"><h3 style="margin:0">✅ Lista de Presença</h3><button class="btn" id="fecharListaPresenca">✕</button></div><div class="aviso" style="color:#46505a">Confira os dados antes de imprimir ou salvar em PDF.</div><div class="grid-form"><label>Empresa<input readonly value="${esc(turma.empresa)}"></label><label>Turma<input readonly value="${esc(turma.codigo||'')}"></label><label>Treinamento<input readonly value="${esc(turma.treinamento)}"></label><label>Período<input readonly value="${esc(periodo(turma.data_inicio,turma.data_fim))}"></label><label>Instrutor<input readonly value="${esc(turma.instrutor||'')}"></label><label>Carga Horária<input readonly value="${esc(turma.carga_horaria||'')} horas"></label></div><div style="overflow:auto;max-height:42vh;margin-top:12px"><table style="width:100%;border-collapse:collapse"><thead><tr><th>Nº</th><th style="text-align:left">Nome</th><th style="text-align:left">CPF</th><th>Assinatura</th></tr></thead><tbody>${linhas}</tbody></table></div><div class="acoes"><button class="btn secundario" id="cancelarListaPresenca">Voltar</button><button class="btn" id="imprimirListaPresenca">🖨️ Imprimir / Salvar PDF</button><button class="btn primario" id="concluirListaPresenca">✅ Confirmar lista gerada</button></div></div>`;
    document.body.appendChild(modal);
    modal.querySelectorAll('th,td').forEach(x=>{x.style.border='1px solid #dde6e3';x.style.padding='7px'});
    document.getElementById('fecharListaPresenca').onclick=fecharModal;document.getElementById('cancelarListaPresenca').onclick=fecharModal;
    document.getElementById('imprimirListaPresenca').onclick=()=>{const w=window.open('','_blank');if(!w){alert('O navegador bloqueou a janela de impressão.');return;}w.document.open();w.document.write(htmlImpressao(turma,participantes));w.document.close();};
    document.getElementById('concluirListaPresenca').onclick=async()=>{try{const filtro=ev.id?'id=eq.'+encodeURIComponent(ev.id):'codigo=eq.'+encodeURIComponent(ev.codigo);await supabaseFetch('agenda?'+filtro,{method:'PATCH',body:JSON.stringify({etapa:Math.max(3,Number(ev.etapa||1)),atualizado_em:new Date().toISOString()})});ev.etapa=Math.max(3,Number(ev.etapa||1));fecharModal();alert('Lista de presença confirmada. A Agenda avançou para a etapa 3.');if(window.renderAgendaGithub)await window.renderAgendaGithub();}catch(e){alert('Erro ao confirmar lista: '+e.message);}};
  }
  window.abrirListaPresencaGithub=async function(ev){try{const dados=await carregar(ev);renderModal(ev,dados.turma,dados.participantes);}catch(e){alert('Erro ao abrir lista de presença: '+e.message);}};
})();