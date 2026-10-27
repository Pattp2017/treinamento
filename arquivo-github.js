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


  async function htmlVencimentoParaPdf(html){
    const JsPDF=window.jspdf?.jsPDF||window.jsPDF,render=window.html2canvas;
    if(!JsPDF||!render)throw new Error('Bibliotecas de PDF indisponíveis.');
    const iframe=document.createElement('div');iframe.style.cssText='position:fixed;left:-10000px;top:0;width:794px;background:white;z-index:-1;';
    const doc=new DOMParser().parseFromString(html,'text/html');
    const style=document.createElement('style');style.textContent=[...doc.querySelectorAll('style')].map(x=>x.textContent).join('\n');
    iframe.appendChild(style);const corpo=document.createElement('div');corpo.innerHTML=doc.body.innerHTML;corpo.style.cssText='width:794px;padding:40px 48px;background:#fff';iframe.appendChild(corpo);document.body.appendChild(iframe);
    try{
      const pdf=new JsPDF({unit:'mm',format:'a4',orientation:'portrait'});
      const canvas=await render(corpo,{scale:1.7,useCORS:true,backgroundColor:'#ffffff',width:794,windowWidth:794});
      const pxPagina=Math.floor(canvas.width*297/210);
      let y=0,pagina=0;
      while(y<canvas.height){
        const h=Math.min(pxPagina,canvas.height-y);
        const parte=document.createElement('canvas');parte.width=canvas.width;parte.height=h;
        parte.getContext('2d').drawImage(canvas,0,y,canvas.width,h,0,0,canvas.width,h);
        if(pagina++)pdf.addPage();
        pdf.addImage(parte.toDataURL('image/jpeg',.94),'JPEG',0,0,210,h*210/canvas.width);
        y+=h;
      }
      return pdf.output('blob');
    }finally{iframe.remove();}
  }
  function vencEsc(v){return String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));}
  function vencData(v){return v?String(v).slice(0,10).split('-').reverse().join('/'):'Não definida';}
  function vencSomarMeses(data,meses){const n=Number(meses);if(!data||!Number.isInteger(n)||n<=0)return null;const [y,m,d]=String(data).slice(0,10).split('-').map(Number),a=new Date(Date.UTC(y,m-1+n,1));a.setUTCDate(Math.min(d,new Date(Date.UTC(a.getUTCFullYear(),a.getUTCMonth()+1,0)).getUTCDate()));return a.toISOString().slice(0,10);}
  window.gerarControleVencimentosClienteGithub=async function(ev,raizExistente=null,opcoes={}){
    if(!ev?.empresa&&!ev?.empresa_id)throw Error('Cliente não identificado.');
    if(!raizExistente&&!window.showDirectoryPicker)throw Error('Use Chrome ou Edge para selecionar a pasta.');
    let raiz=raizExistente;if(!raiz){try{raiz=await window.showDirectoryPicker({mode:'readwrite'});}catch(e){if(e?.name==='AbortError')return;throw e;}}
    const aviso=document.createElement('div');aviso.className='modal';aviso.innerHTML='<div class="modal-box"><h3>Controle de vencimentos</h3><p id="controleVencStatus">Consultando todos os treinamentos do cliente...</p></div>';document.body.appendChild(aviso);
    try{
      const c=window.SUPABASE_CONFIG||{},base=String(c.url||'').replace(/\/$/,'');
      async function buscar(path){let todos=[];for(let offset=0;offset<10000;offset+=1000){const r=await fetch(base+'/rest/v1/'+path+(path.includes('?')?'&':'?')+'limit=1000&offset='+offset,{headers:{apikey:c.anonKey,Authorization:'Bearer '+c.anonKey,Accept:'application/json'}});if(!r.ok)throw Error(await r.text());const lote=await r.json();todos.push(...lote);if(lote.length<1000)break;}return todos;}
      const [agendas,turmas,treinos]=await Promise.all([buscar('treinamento_agenda?select=id,id_turma,empresa,empresa_id,treinamento,treinamento_id,data_inicio,data_fim,status'),buscar('treinamento_turmas?select=id,agenda_id,empresa,treinamento,treinamento_id,norma,data_inicio,data_fim'),buscar('treinamento_treinamentos?select=id,nome,norma,validade_meses')]);
      const norm=v=>String(v||'').trim().toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g,'');
      const minhas=agendas.filter(a=>String(a.status||'').toLowerCase()!=='cancelado'&&(ev.empresa_id&&a.empresa_id?String(a.empresa_id)===String(ev.empresa_id):norm(a.empresa)===norm(ev.empresa)));
      const ids=new Set(minhas.map(a=>String(a.id))),tid=new Set(minhas.map(a=>String(a.id_turma||'')));
      const relacionadas=turmas.filter(t=>ids.has(String(t.agenda_id))||tid.has(String(t.id)));
      const dados=[];for(const t of relacionadas){const a=minhas.find(x=>String(x.id)===String(t.agenda_id)||String(x.id_turma)===String(t.id));if(!a)continue;const tr=treinos.find(x=>String(x.id)===String(t.treinamento_id||a.treinamento_id))||treinos.find(x=>norm(x.nome)===norm(t.treinamento||a.treinamento));const ps=await buscar('treinamento_turma_participantes?select=nome,cpf&turma_id=eq.'+encodeURIComponent(t.id));const data=String(t.data_fim||a.data_fim||'').slice(0,10),venc=vencSomarMeses(data,tr?.validade_meses);for(const pessoa of ps)dados.push({nome:pessoa.nome,cpf:pessoa.cpf||'',treinamento:t.treinamento||a.treinamento||tr?.nome||'',norma:tr?.norma||t.norma||'',data,venc,meses:tr?.validade_meses});}
      if(!dados.length)throw new Error('Nenhum participante encontrado nas turmas deste cliente. Confira o cadastro antes de gerar o relatório.');
      const recentes=new Map();for(const d of dados){const chave=norm(d.treinamento)+'|'+(String(d.cpf).replace(/\D/g,'')||norm(d.nome));const atual=recentes.get(chave);if(!atual||d.data>atual.data)recentes.set(chave,d);}
      const hoje=new Date(),hojeIso=[hoje.getFullYear(),String(hoje.getMonth()+1).padStart(2,'0'),String(hoje.getDate()).padStart(2,'0')].join('-');
      const registros=[...recentes.values()].map(d=>{const dias=d.venc?Math.round((Date.parse(d.venc)-Date.parse(hojeIso))/86400000):null;return {...d,situacao:dias===null?'Validade não cadastrada':dias<0?'Vencido':dias<=30?'Até 30 dias':dias<=60?'Até 60 dias':'Vigente',ordem:dias===null?3:dias<0?0:dias<=60?1:2};}).sort((a,b)=>a.ordem-b.ordem||(a.venc||'9999').localeCompare(b.venc||'9999')||a.treinamento.localeCompare(b.treinamento));
      const contar=s=>registros.filter(d=>d.situacao===s).length;
      const grupos=new Map();for(const d of registros){const k=d.treinamento||'Treinamento';if(!grupos.has(k))grupos.set(k,[]);grupos.get(k).push(d);}
      const blocos=[...grupos].map(([nome,lista])=>{
        const edicoes=new Map();for(const d of lista){const chave=[d.data,d.venc,d.situacao].join('|');if(!edicoes.has(chave))edicoes.set(chave,[]);edicoes.get(chave).push(d);}
        return '<div class="treinamento"><h2>'+vencEsc(nome)+'</h2>'+[...edicoes.values()].map(grupo=>{const d=grupo[0];return '<div class="grupo"><div class="info"><span><small>Data de realização</small><b>'+vencData(d.data)+'</b></span><span><small>Vencimento</small><b>'+vencData(d.venc)+'</b></span><span><small>Situação</small><b>'+vencEsc(d.situacao)+'</b></span></div><div class="participantes"><strong>Participantes</strong><ol>'+grupo.map(x=>'<li>'+vencEsc(x.nome)+'</li>').join('')+'</ol></div></div>';}).join('')+'</div>';
      }).join('');
      const html='<!doctype html><html lang="pt-BR"><head><meta charset="utf-8"><style>@page{size:A4;margin:0}*{box-sizing:border-box}html,body{margin:0;padding:0}body{font-family:Arial,sans-serif;color:#24332b;font-size:11px}main{width:100%;padding:0;margin:0}h1{font-size:19px;color:#205c42;margin:0 0 7px}.cabecalho{margin:0 0 12px}.cabecalho p{margin:4px 0}.resumo{background:#edf5ef;padding:10px;margin:10px 0 14px;font-size:10px}.treinamento{margin:0 0 15px;break-inside:auto}.treinamento h2{font-size:13px;background:#e2efe6;color:#1d4c37;padding:8px;margin:0;break-after:avoid}.grupo{margin:0 0 8px;break-inside:auto}.info{display:flex;gap:12px;padding:8px 10px;border:1px solid #e1e9e3;break-inside:avoid}.info span{flex:1}.info small{display:block;color:#607267;font-size:9px;margin-bottom:4px}.info b{font-size:11px}.participantes{padding:8px 12px}.participantes strong{font-size:10px}.participantes ol{margin:6px 0 0;padding-left:23px;columns:2;column-gap:18px}.participantes li{padding:3px 0;break-inside:avoid}.nota{font-size:9px;color:#59665d;margin-top:14px}</style></head><body><main><div class="cabecalho"><h1>CONTROLE GERAL DE VENCIMENTOS</h1><p><b>Cliente:</b> '+vencEsc(ev.empresa)+'</p></div>'+blocos+'<p class="nota">Prazos calculados conforme a validade cadastrada no sistema. Conferir as exigências normativas antes de programar reciclagens.</p></main></body></html>';
      aviso.querySelector('#controleVencStatus').textContent='Gerando PDF consolidado...';
      const pasta=await raiz.getDirectoryHandle('05) Vencimento',{create:true});
      await gravar(pasta,'Controle Geral de Vencimentos.pdf',await htmlVencimentoParaPdf(html));
      aviso.remove();if(!opcoes.silencioso)alert('Controle Geral de Vencimentos.pdf salvo em 05) Vencimento. '+registros.length+' participação(ões).');
    }catch(e){aviso.remove();throw e;}
  };
  window.gerarTreinamentoLoteGithub=async function(ev,raiz,opcoes={},progresso=()=>{}){
    const gerarLista=opcoes.lista!==false,gerarCert=opcoes.certificados!==false;
    // Relatórios de vencimento são gerados uma vez por cliente ao concluir o lote.
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
      aviso.remove();alert('Pasta atualizada com sucesso. Arquivos com o mesmo nome foram substituídos.');
    }catch(e){aviso.remove();alert('Erro ao gerar a pasta: '+e.message);}
  };
})();