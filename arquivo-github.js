(() => {
  function limparNome(v){return String(v||'arquivo').normalize('NFC').replace(/[<>:"/\\|?*\x00-\x1F]/g,' ').replace(/[. ]+$/g,'').replace(/\s+/g,' ').trim()||'arquivo';}
  async function gravar(dir,nome,blob){const arq=await dir.getFileHandle(limparNome(nome),{create:true});let w;try{w=await arq.createWritable();await w.write(blob);await w.close();}catch(e){try{await w?.abort();}catch(_){}if(e?.name==='InvalidStateError')throw new Error('O arquivo está aberto ou bloqueado. Feche PDFs/arquivos desta pasta e tente novamente.');throw e;}}
  async function htmlListaParaPdf(html){
    const JsPDF=window.jspdf?.jsPDF||window.jsPDF,renderCanvas=window.html2canvas;
    if(!JsPDF||!renderCanvas)throw new Error('Gerador de PDF não carregado.');
    const doc=new DOMParser().parseFromString(html,'text/html');
    [...doc.querySelectorAll('.acoes-print,script')].forEach(x=>x.remove());
    const tabelas=[...doc.querySelectorAll('table')];
    const tabela=tabelas.find(t=>{
      const cabecalho=(t.querySelector('thead')?.textContent||t.querySelector('tr')?.textContent||'').toUpperCase().replace(/\s+/g,' ');
      return cabecalho.includes('Nº')&&cabecalho.includes('NOME')&&cabecalho.includes('CPF')&&cabecalho.includes('ASSINATURA');
    })||doc.querySelector('table.participantes');
    const tbody=tabela?.querySelector('tbody');
    if(!tabela||!tbody)return htmlParaPdf(html,'portrait');

    const linhas=[...tbody.querySelectorAll('tr')].map(x=>x.outerHTML);
    const cab=tabela.querySelector('thead')?.outerHTML||'';
    const estilos=[...doc.querySelectorAll('style')].map(x=>x.textContent).join('\n');
    // Captura o rodapé em qualquer nível do HTML. Não restringir a filho direto do body.
    const rodape=[...doc.querySelectorAll('.rodape-img,.rodape-texto')].map(n=>n.outerHTML).join('');
    // Prepara o corpo-base da primeira página: mantém toda a estrutura original,
    // retira o rodapé (ele será recolocado no final) e substitui apenas a tabela
    // de participantes por um marcador para a paginação.
    const tabelaMarcador='lista-participantes-paginada';
    tabela.setAttribute('data-pdf-marker',tabelaMarcador);
    const corpoClone=doc.body.cloneNode(true);
    const tabelaClone=corpoClone.querySelector('[data-pdf-marker="'+tabelaMarcador+'"]');
    const marcador=doc.createElement('div');
    marcador.setAttribute('data-pdf-inserir-tabela','1');
    tabelaClone?.replaceWith(marcador);
    [...corpoClone.querySelectorAll('.rodape-img,.rodape-texto')].forEach(n=>n.remove());
    const htmlBase=corpoClone.innerHTML;

    const rodapeSrcConfigurado=doc.querySelector('.rodape-img img')?.getAttribute('src')||'';
    const rodapeSrcPadrao='https://raw.githubusercontent.com/Pattp2017/treinamento/main/assets/Rodap%C3%A9_atualizado.png';

    // Para o PDF automático, usamos primeiro o rodapé configurado.
    // Se ele não existir ou não puder ser carregado, usamos o arquivo fixo do repositório.
    let rodapeDataUrl='';
    for(const src of [rodapeSrcConfigurado,rodapeSrcPadrao].filter(Boolean)){
      try{
        const resp=await fetch(src,{cache:'no-store'});
        if(!resp.ok)throw new Error('HTTP '+resp.status);
        const blob=await resp.blob();
        rodapeDataUrl=await new Promise((resolve,reject)=>{
          const fr=new FileReader();
          fr.onload=()=>resolve(String(fr.result||''));
          fr.onerror=()=>reject(fr.error||new Error('Falha ao ler imagem do rodapé.'));
          fr.readAsDataURL(blob);
        });
        if(rodapeDataUrl)break;
      }catch(e){
        console.warn('Falha ao carregar rodapé para PDF:',src,e);
      }
    }

    const host=document.createElement('div');
    host.style.cssText='position:fixed;left:-100000px;top:0;width:210mm;background:#fff;z-index:-1';
    document.body.appendChild(host);

    function novaPagina(primeira){
      const p=document.createElement('div');
      p.className='lista-pdf-pagina';
      p.style.cssText='width:210mm;height:297mm;padding:12.7mm 12.7mm 16mm;box-sizing:border-box;background:#fff;position:relative;overflow:hidden;font-family:Arial,sans-serif;color:#111;font-size:10px';
      if(primeira){
        p.innerHTML='<style>'+estilos+'<\/style><div class="lista-pdf-fluxo">'+htmlBase+'</div>'+rodape;
        const fluxo=p.querySelector('.lista-pdf-fluxo');
        const ponto=fluxo.querySelector('[data-pdf-inserir-tabela="1"]');
        const t=doc.createElement('table');t.className='participantes';t.innerHTML=cab+'<tbody></tbody>';
        ponto?.replaceWith(t);
      }else{
        p.innerHTML='<style>'+estilos+'<\/style><div class="lista-pdf-fluxo"><table class="participantes">'+cab+'<tbody></tbody></table></div>'+rodape;
      }
      if(rodapeDataUrl){
        p.querySelectorAll('.rodape-img img').forEach(img=>{
          img.removeAttribute('onerror');
          img.src=rodapeDataUrl;
        });
      }
      // Posiciona o rodapé depois que todo o HTML da página já existe.
      // Fazemos diretamente nos elementos para não depender da cascata do CSS original.
      [...p.querySelectorAll('.rodape-img,.rodape-texto')].forEach(r=>{
        r.style.setProperty('position','absolute','important');
        r.style.setProperty('left','12.7mm','important');
        r.style.setProperty('right','12.7mm','important');
        r.style.setProperty('bottom','4mm','important');
        r.style.setProperty('height','11mm','important');
        r.style.setProperty('margin','0','important');
        r.style.setProperty('background','#fff','important');
        const img=r.querySelector('img');
        if(img){
          img.style.setProperty('display','block','important');
          img.style.setProperty('width','100%','important');
          img.style.setProperty('height','11mm','important');
          img.style.setProperty('object-fit','contain','important');
          img.style.setProperty('object-position','center bottom','important');
        }
      });
      host.appendChild(p);
      return p;
    }

    const paginas=[];
    let indice=0,primeira=true;
    try{
      while(indice<linhas.length){
        const pagina=novaPagina(primeira);
        await Promise.all([...pagina.querySelectorAll('img')].map(img=>img.complete?Promise.resolve():new Promise(r=>{img.onload=img.onerror=r;})));
        const fluxo=pagina.querySelector('.lista-pdf-fluxo');
        const corpo=pagina.querySelector('table.participantes tbody');
        // O limite real é o topo do rodapé. Assim nenhuma linha pode ficar escondida atrás dele.
        const rodapeEl=pagina.querySelector('.rodape-img,.rodape-texto');
        const paginaRect=pagina.getBoundingClientRect();
        const limite=rodapeEl?rodapeEl.getBoundingClientRect().top-paginaRect.top-34:pagina.clientHeight-(26/25.4*96);
        let adicionadas=0;
        while(indice<linhas.length){
          corpo.insertAdjacentHTML('beforeend',linhas[indice]);
          const linhaInserida=corpo.lastElementChild;
          const linhaRect=linhaInserida.getBoundingClientRect();
          const fimLinha=linhaRect.bottom-paginaRect.top;
          if(fimLinha>limite){
            linhaInserida.remove();
            break;
          }
          indice++;adicionadas++;
        }
        if(adicionadas===0&&indice<linhas.length){
          // Segurança contra loop infinito: só força a linha se a página estiver realmente vazia.
          corpo.insertAdjacentHTML('beforeend',linhas[indice]);
          indice++;adicionadas++;
        }
        paginas.push(pagina);
        primeira=false;
      }

      const pdf=new JsPDF({unit:'mm',format:'a4',orientation:'portrait'});
      for(let i=0;i<paginas.length;i++){
        const canvas=await renderCanvas(paginas[i],{scale:2,useCORS:true,backgroundColor:'#ffffff',width:paginas[i].scrollWidth,height:paginas[i].scrollHeight});
        if(i)pdf.addPage('a4','portrait');
        pdf.addImage(canvas.toDataURL('image/jpeg',.98),'JPEG',0,0,210,297);
      }
      return pdf.output('blob');
    }finally{host.remove();}
  }
  async function htmlParaPdf(html,orientacao='portrait'){
    if(!window.html2pdf)throw new Error('Gerador de PDF não carregado.');
    const box=document.createElement('div');box.style.cssText='position:fixed;left:-100000px;top:0;background:#fff;z-index:-1';
    const doc=new DOMParser().parseFromString(html,'text/html');
    [...doc.querySelectorAll('.acoes-print,script')].forEach(x=>x.remove());
    const style=document.createElement('style');style.textContent=[...doc.querySelectorAll('style')].map(x=>x.textContent).join('\n');box.appendChild(style);
    const corpo=document.createElement('div');corpo.innerHTML=doc.body.innerHTML;corpo.style.margin='0';corpo.style.padding='0';if(orientacao==='landscape'){const pags=[...corpo.querySelectorAll('.pagina')];pags.forEach(p=>{p.style.pageBreakAfter='auto';p.style.breakAfter='auto';p.style.pageBreakBefore='auto';p.style.breakBefore='auto';});}box.appendChild(corpo);document.body.appendChild(box);
    await Promise.all([...box.querySelectorAll('img')].map(img=>img.complete?Promise.resolve():new Promise(r=>{img.onload=img.onerror=r;})));
    try{const atestados=[...corpo.querySelectorAll('.atestado-it12')];if(orientacao==='portrait'&&atestados.length){const JsPDF=window.jspdf?.jsPDF||window.jsPDF;if(!JsPDF)throw new Error('jsPDF não carregado.');const renderCanvas=window.html2canvas;if(!renderCanvas)throw new Error('html2canvas não carregado.');const pdf=new JsPDF({unit:'mm',format:'a4',orientation:'portrait'});for(let i=0;i<atestados.length;i++){const pag=atestados[i];pag.style.width='210mm';pag.style.height='297mm';pag.style.minHeight='297mm';pag.style.maxHeight='297mm';pag.style.overflow='hidden';pag.style.pageBreakBefore='auto';pag.style.pageBreakAfter='auto';pag.style.breakBefore='auto';pag.style.breakAfter='auto';const canvas=await renderCanvas(pag,{scale:2,useCORS:true,backgroundColor:'#ffffff',width:pag.scrollWidth,height:pag.scrollHeight});if(i>0)pdf.addPage('a4','portrait');pdf.addImage(canvas.toDataURL('image/jpeg',.98),'JPEG',0,0,210,297);}return pdf.output('blob');}if(orientacao==='landscape'){const pags=[...corpo.querySelectorAll('.pagina')];const JsPDF=window.jspdf?.jsPDF||window.jsPDF;if(!JsPDF)throw new Error('jsPDF não carregado.');const pdf=new JsPDF({unit:'mm',format:'a4',orientation:'landscape'});for(let i=0;i<pags.length;i++){const renderCanvas=window.html2canvas;if(!renderCanvas)throw new Error('html2canvas não carregado.');const canvas=await renderCanvas(pags[i],{scale:2,useCORS:true,backgroundColor:'#ffffff',width:pags[i].scrollWidth,height:pags[i].scrollHeight});if(i>0)pdf.addPage('a4','landscape');pdf.addImage(canvas.toDataURL('image/jpeg',.98),'JPEG',0,0,297,210);}return pdf.output('blob');}return await html2pdf().set({margin:0,filename:'documento.pdf',image:{type:'jpeg',quality:.98},html2canvas:{scale:2,useCORS:true,backgroundColor:'#ffffff'},jsPDF:{unit:'mm',format:'a4',orientation:orientacao},pagebreak:{mode:['css']}}).from(corpo).outputPdf('blob');}
    finally{box.remove();}
  }

  function vencEsc(v){return String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));}
  function vencData(v){return v?String(v).slice(0,10).split('-').reverse().join('/'):'Não definida';}
  function vencSomarMeses(data,meses){const n=Number(meses);if(!data||!Number.isInteger(n)||n<=0)return null;const [y,m,d]=String(data).slice(0,10).split('-').map(Number),a=new Date(Date.UTC(y,m-1+n,1));a.setUTCDate(Math.min(d,new Date(Date.UTC(a.getUTCFullYear(),a.getUTCMonth()+1,0)).getUTCDate()));return a.toISOString().slice(0,10);}
  async function gerarRelatorioVencimento(ev,turma,raiz,progresso=()=>{}){
    if(!turma?.id)throw new Error('Turma não localizada para o relatório de vencimentos.');
    progresso('Gerando controle de vencimentos...');
    const c=window.SUPABASE_CONFIG||{},base=String(c.url||'').replace(/\/$/,'');
    async function buscar(path){const r=await fetch(base+'/rest/v1/'+path,{headers:{apikey:c.anonKey,Authorization:'Bearer '+c.anonKey,Accept:'application/json'}});if(!r.ok)throw Error('Consulta de vencimentos: '+await r.text());return r.json();}
    const [pessoas,treinos]=await Promise.all([
      buscar('treinamento_turma_participantes?turma_id=eq.'+encodeURIComponent(turma.id)+'&select=nome,cpf&order=nome.asc'),
      buscar('treinamento_treinamentos?select=id,nome,norma,validade_meses')
    ]);
    const normal=v=>String(v||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase();
    const tr=treinos.find(t=>String(t.id)===String(turma.treinamento_id||ev.treinamento_id))||treinos.find(t=>normal(t.nome)===normal(turma.treinamento||ev.treinamento));
    const data=String(turma.data_fim||ev.data_fim||'').slice(0,10),venc=vencSomarMeses(data,tr?.validade_meses);
    const hoje=new Date(),agora=[hoje.getFullYear(),String(hoje.getMonth()+1).padStart(2,'0'),String(hoje.getDate()).padStart(2,'0')].join('-');
    const dias=venc?Math.round((Date.parse(venc)-Date.parse(agora))/86400000):null;
    const situacao=dias===null?'Sem validade definida':dias<0?'Vencido':dias<=30?'Vence em até 30 dias':dias<=60?'Vence em até 60 dias':'Vigente';
    const cliente=turma.empresa||ev.empresa||'Cliente não informado',nome=turma.treinamento||ev.treinamento||tr?.nome||'Treinamento';
    const linhas=(pessoas.length?pessoas:[{nome:'Participantes não cadastrados'}]).map((p,i)=>'<tr><td>'+String(i+1).padStart(2,'0')+'</td><td>'+vencEsc(p.nome)+'</td><td>'+vencData(data)+'</td><td>'+vencData(venc)+'</td><td>'+vencEsc(situacao)+'</td></tr>').join('');
    const html='<!doctype html><html lang="pt-BR"><head><meta charset="utf-8"><style>body{font-family:Arial,sans-serif;color:#22332c;font-size:12px;margin:0;padding:0}main{padding:16mm 14mm}h1{font-size:20px;color:#1b503a;margin:0 0 10px}h2{font-size:15px;margin:16px 0 6px}.meta{padding:12px;background:#edf4ef;border-left:4px solid #3b7754}.meta div{margin:5px 0}table{width:100%;border-collapse:collapse;margin-top:14px;font-size:10px}th,td{padding:8px;border:1px solid #d4e0d8;text-align:left}th{background:#e2efe7}tr{break-inside:avoid}.nota{margin-top:16px;color:#66736b;font-size:10px}footer{margin-top:25px;border-top:1px solid #d4e0d8;padding-top:9px;font-size:10px}</style></head><body><main><h1>CONTROLE DE VENCIMENTOS DE TREINAMENTOS</h1><p>Relatório de acompanhamento para o cliente</p><div class="meta"><div><b>Cliente:</b> '+vencEsc(cliente)+'</div><div><b>Treinamento:</b> '+vencEsc(nome)+'</div><div><b>Norma:</b> '+vencEsc(tr?.norma||turma.norma||ev.norma||'Não informada')+'</div><div><b>Carga horária:</b> '+vencEsc(turma.carga_horaria||ev.carga_horaria||'Não informada')+' horas</div><div><b>Data de conclusão:</b> '+vencData(data)+'</div><div><b>Validade cadastrada:</b> '+(Number(tr?.validade_meses)>0?vencEsc(tr.validade_meses)+' meses':'Não definida')+'</div><div><b>Emissão:</b> '+vencData(agora)+'</div></div><h2>Relação de participantes e vencimentos</h2><table><thead><tr><th>Nº</th><th>Participante</th><th>Realização</th><th>Vencimento</th><th>Situação</th></tr></thead><tbody>'+linhas+'</tbody></table><p class="nota">As datas de vencimento são calculadas conforme o prazo cadastrado para este treinamento. A ausência de prazo cadastrado não significa dispensa de reciclagem. Confira exigências normativas e situações individuais antes de programar novos treinamentos.</p><footer>Total de participantes: '+pessoas.length+' | Documento gerado automaticamente para acompanhamento.</footer></main></body></html>';
    const pasta=await raiz.getDirectoryHandle('05) Vencimento',{create:true});
    const pdf=await htmlParaPdf(html,'portrait');
    await gravar(pasta,'Controle de Vencimento - '+limparNome(nome)+'.pdf',pdf);
  }
  window.gerarTreinamentoLoteGithub=async function(ev,raiz,opcoes={},progresso=()=>{}){
    const gerarLista=opcoes.lista!==false,gerarCert=opcoes.certificados!==false;
    // O relatório de vencimentos acompanha toda geração de treinamento.
    let lista=null,certs=null;
    if(gerarLista&&gerarCert)[lista,certs]=await Promise.all([window.obterListaPresencaGithub(ev),window.obterCertificadosGithub(ev)]);
    else if(gerarLista)lista=await window.obterListaPresencaGithub(ev);
    else certs=await window.obterCertificadosGithub(ev);
    const nomeTreinamento=(lista?.turma?.treinamento||certs?.turma?.treinamento||ev.treinamento||'Treinamento');
    if(gerarLista){
      progresso('Gerando lista de presença...');
      const pastaLista=await raiz.getDirectoryHandle('01) Lista de Presença',{create:true});
      const pdfLista=await htmlListaParaPdf(lista.html);
      await gravar(pastaLista,limparNome(nomeTreinamento)+'.pdf',pdfLista);
      if(lista.ehIT12&&lista.htmlAtestadoIT12){
        progresso('Gerando atestado IT 12...');
        const pastaIT12=await raiz.getDirectoryHandle('04) IT 12',{create:true});
        const pdfAtestado=await htmlParaPdf(lista.htmlAtestadoIT12,'portrait');
        await gravar(pastaIT12,'ATESTADO DE FORMAÇÃO DE BRIGADA DE INCÊNDIO.pdf',pdfAtestado);
      }
    }
    if(gerarCert){
      const pastaCertRaiz=await raiz.getDirectoryHandle('03) Certificados',{create:true});
      const pastaCert=await pastaCertRaiz.getDirectoryHandle(limparNome(nomeTreinamento),{create:true});
      let n=0;
      for(const d of certs.documentos){
        progresso('Gerando certificado '+(++n)+' de '+certs.documentos.length+'...');
        const pdf=await htmlParaPdf(d.html,'landscape');
        await gravar(pastaCert,limparNome(d.nome)+'.pdf',pdf);
        if(window.registrarCertificadoGeradoGithub)await window.registrarCertificadoGeradoGithub(certs.turma,d.participante||{nome:d.nome,cpf:d.cpf});
      }
    }
    await gerarRelatorioVencimento(ev,lista?.turma||certs?.turma,raiz,progresso);
  };
  window.arquivarTreinamentoGithub=async function(ev){
    if(!window.showDirectoryPicker)return alert('Seu navegador não permite selecionar pastas. Use Chrome ou Edge atualizado.');
    let raiz;
    try{raiz=await window.showDirectoryPicker({mode:'readwrite'});}catch(e){if(e?.name!=='AbortError')alert('Não foi possível abrir a pasta: '+e.message);return;}
    const aviso=document.createElement('div');aviso.className='modal';aviso.innerHTML='<div class="modal-box" style="width:min(520px,92vw)"><h3>📁 Arquivando treinamento</h3><p id="statusArquivo">Preparando documentos...</p></div>';document.body.appendChild(aviso);
    try{
      const [lista,certs]=await Promise.all([window.obterListaPresencaGithub(ev),window.obterCertificadosGithub(ev)]);const pastaLista=await raiz.getDirectoryHandle('01) Lista de Presença',{create:true});
      await raiz.getDirectoryHandle('02) Fotos',{create:true});
      const pastaCertRaiz=await raiz.getDirectoryHandle('03) Certificados',{create:true});
      const pastaCert=await pastaCertRaiz.getDirectoryHandle(limparNome(lista.turma.treinamento||'Treinamento'),{create:true});
      const pastaIT12=lista.ehIT12?await raiz.getDirectoryHandle('04) IT 12',{create:true}):null;
      const nomeTreinamento=lista.turma.treinamento||'Treinamento';
      const statusArquivo=document.getElementById('statusArquivo');
      const atualizarStatus=(mensagem)=>{statusArquivo.innerHTML='<strong>'+nomeTreinamento+'</strong><br>'+mensagem;};
      atualizarStatus('Gerando lista de presença...');
      const pdfLista=await htmlListaParaPdf(lista.html);
      await gravar(pastaLista,limparNome(lista.turma.treinamento||'Lista de Presença')+'.pdf',pdfLista);
      let n=0;
      for(const d of certs.documentos){
        atualizarStatus('Gerando certificado '+(++n)+' de '+certs.documentos.length+'...');
        const pdf=await htmlParaPdf(d.html,'landscape');
        await gravar(pastaCert,limparNome(d.nome)+'.pdf',pdf);
        if(window.registrarCertificadoGeradoGithub)await window.registrarCertificadoGeradoGithub(certs.turma,d.participante||{nome:d.nome,cpf:d.cpf});
      }
      if(pastaIT12&&lista.htmlAtestadoIT12){atualizarStatus('Gerando atestado IT 12...');const pdfAtestado=await htmlParaPdf(lista.htmlAtestadoIT12,'portrait');await gravar(pastaIT12,'ATESTADO DE FORMAÇÃO DE BRIGADA DE INCÊNDIO.pdf',pdfAtestado);}
      await gerarRelatorioVencimento(ev,lista.turma,raiz,atualizarStatus);
      aviso.remove();alert('Pasta atualizada com sucesso. Arquivos com o mesmo nome foram substituídos.');
    }catch(e){aviso.remove();alert('Erro ao gerar a pasta: '+e.message);}
  };
})();