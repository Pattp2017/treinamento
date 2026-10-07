(() => {
  function limparNome(v){return String(v||'arquivo').normalize('NFC').replace(/[<>:"/\\|?*\x00-\x1F]/g,' ').replace(/[. ]+$/g,'').replace(/\s+/g,' ').trim()||'arquivo';}
  async function gravar(dir,nome,blob){const arq=await dir.getFileHandle(limparNome(nome),{create:true});const w=await arq.createWritable();await w.write(blob);await w.close();}
  async function htmlListaParaPdf(html){
    const JsPDF=window.jspdf?.jsPDF||window.jsPDF,renderCanvas=window.html2canvas;
    if(!JsPDF||!renderCanvas)throw new Error('Gerador de PDF não carregado.');
    const doc=new DOMParser().parseFromString(html,'text/html');
    [...doc.querySelectorAll('.acoes-print,script')].forEach(x=>x.remove());
    const tabela=doc.querySelector('table.participantes'),tbody=tabela?.querySelector('tbody');
    if(!tabela||!tbody)return htmlParaPdf(html,'portrait');
    const linhas=[...tbody.querySelectorAll('tr')].map(x=>x.outerHTML);
    const antes=[...doc.body.childNodes].filter(n=>n!==tabela&&!n.classList?.contains('rodape-img')&&!n.classList?.contains('rodape-texto')).map(n=>n.outerHTML||n.textContent).join('');
    const rodape=[...doc.body.querySelectorAll('.rodape-img,.rodape-texto')].map(n=>n.outerHTML).join('');
    const cab=tabela.querySelector('thead')?.outerHTML||'';
    const estilos=[...doc.querySelectorAll('style')].map(x=>x.textContent).join('\n');
    const criarPagina=(conteudo,rows,primeira)=>{const p=document.createElement('div');p.style.cssText='width:210mm;height:297mm;padding:12.7mm;box-sizing:border-box;background:#fff;position:relative;overflow:hidden;font-family:Arial,sans-serif;color:#111;font-size:10px';p.innerHTML='<style>'+estilos+'<\/style><div class="lista-pagina-conteudo">'+(primeira?conteudo:'')+'<table class="participantes">'+cab+'<tbody>'+rows.join('')+'</tbody></table></div>'+rodape;return p;};
    const host=document.createElement('div');host.style.cssText='position:fixed;left:-100000px;top:0;background:#fff;z-index:-1';document.body.appendChild(host);
    const paginas=[];let restantes=[...linhas],primeira=true;
    try{
      while(restantes.length){
        let usados=[];
        const pagina=criarPagina(antes,usados,primeira);host.appendChild(pagina);
        await Promise.all([...pagina.querySelectorAll('img')].map(img=>img.complete?Promise.resolve():new Promise(r=>{img.onload=img.onerror=r;})));
        const area=pagina.querySelector('.lista-pagina-conteudo');
        const limite=pagina.clientHeight-48;
        while(restantes.length){
          usados.push(restantes.shift());
          pagina.querySelector('tbody').innerHTML=usados.join('');
          if(area.scrollHeight>limite){restantes.unshift(usados.pop());pagina.querySelector('tbody').innerHTML=usados.join('');break;}
        }
        if(!usados.length&&restantes.length)usados.push(restantes.shift());
        pagina.querySelector('tbody').innerHTML=usados.join('');
        paginas.push(pagina);primeira=false;
      }
      const pdf=new JsPDF({unit:'mm',format:'a4',orientation:'portrait'});
      for(let i=0;i<paginas.length;i++){const canvas=await renderCanvas(paginas[i],{scale:2,useCORS:true,backgroundColor:'#ffffff',width:paginas[i].scrollWidth,height:paginas[i].scrollHeight});if(i)pdf.addPage('a4','portrait');pdf.addImage(canvas.toDataURL('image/jpeg',.98),'JPEG',0,0,210,297);}
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
    try{if(orientacao==='landscape'){const pags=[...corpo.querySelectorAll('.pagina')];const JsPDF=window.jspdf?.jsPDF||window.jsPDF;if(!JsPDF)throw new Error('jsPDF não carregado.');const pdf=new JsPDF({unit:'mm',format:'a4',orientation:'landscape'});for(let i=0;i<pags.length;i++){const renderCanvas=window.html2canvas;if(!renderCanvas)throw new Error('html2canvas não carregado.');const canvas=await renderCanvas(pags[i],{scale:2,useCORS:true,backgroundColor:'#ffffff',width:pags[i].scrollWidth,height:pags[i].scrollHeight});if(i>0)pdf.addPage('a4','landscape');pdf.addImage(canvas.toDataURL('image/jpeg',.98),'JPEG',0,0,297,210);}return pdf.output('blob');}return await html2pdf().set({margin:0,filename:'documento.pdf',image:{type:'jpeg',quality:.98},html2canvas:{scale:2,useCORS:true,backgroundColor:'#ffffff'},jsPDF:{unit:'mm',format:'a4',orientation:orientacao},pagebreak:{mode:['css']}}).from(corpo).outputPdf('blob');}
    finally{box.remove();}
  }
  window.arquivarTreinamentoGithub=async function(ev){
    if(!window.showDirectoryPicker)return alert('Seu navegador não permite selecionar pastas. Use Chrome ou Edge atualizado.');
    let raiz;
    try{raiz=await window.showDirectoryPicker({mode:'readwrite'});}catch(e){if(e?.name!=='AbortError')alert('Não foi possível abrir a pasta: '+e.message);return;}
    const aviso=document.createElement('div');aviso.className='modal';aviso.innerHTML='<div class="modal-box" style="width:min(520px,92vw)"><h3>📁 Arquivando treinamento</h3><p id="statusArquivo">Preparando documentos...</p></div>';document.body.appendChild(aviso);
    try{
      const [lista,certs]=await Promise.all([window.obterListaPresencaGithub(ev),window.obterCertificadosGithub(ev)]);
      const pastaLista=await raiz.getDirectoryHandle('01) Lista de Presença',{create:true});
      await raiz.getDirectoryHandle('02) Fotos',{create:true});
      const pastaCertRaiz=await raiz.getDirectoryHandle('03) Certificados',{create:true});
      const pastaCert=await pastaCertRaiz.getDirectoryHandle(limparNome(lista.turma.treinamento||'Treinamento'),{create:true});
      const pastaIT12=lista.ehIT12?await raiz.getDirectoryHandle('04) IT 12',{create:true}):null;
      document.getElementById('statusArquivo').textContent='Gerando lista de presença...';
      const pdfLista=await htmlListaParaPdf(lista.html);
      await gravar(pastaLista,limparNome(lista.turma.treinamento||'Lista de Presença')+'.pdf',pdfLista);
      let n=0;
      for(const d of certs.documentos){
        document.getElementById('statusArquivo').textContent='Gerando certificado '+(++n)+' de '+certs.documentos.length+'...';
        const pdf=await htmlParaPdf(d.html,'landscape');
        await gravar(pastaCert,limparNome(d.nome)+'.pdf',pdf);
      }
      if(pastaIT12&&lista.htmlAtestadoIT12){document.getElementById('statusArquivo').textContent='Gerando atestado IT 12...';const pdfAtestado=await htmlParaPdf(lista.htmlAtestadoIT12,'portrait');await gravar(pastaIT12,'ATESTADO DE FORMAÇÃO DE BRIGADA DE INCÊNDIO.pdf',pdfAtestado);}
      aviso.remove();alert('Pasta atualizada com sucesso. Arquivos com o mesmo nome foram substituídos.');
    }catch(e){aviso.remove();alert('Erro ao gerar a pasta: '+e.message);}
  };
})();