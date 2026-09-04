(() => {
  // Compatibilidade com versões antigas da Agenda.
  // A Agenda atual já carrega Empresa e Instrutor diretamente dos cadastros
  // e usa os IDs reais como value dos selects. Este patch antigo não deve
  // substituir esses campos, pois convertia os values novamente para nomes.
  function aplicarPatch(){
    if(typeof window.renderAgendaGithub!=='function') return false;
    if(window.renderAgendaGithub.__cadastrosIntegrados) return true;

    const original=window.renderAgendaGithub;
    const envolvida=async function(){
      await original.apply(this,arguments);
      // Se a Agenda atual já criou selects, preserva-os exatamente como estão.
      const empresa=document.getElementById('agEmpresa');
      const instrutor=document.getElementById('agInstrutor');
      if(empresa?.tagName==='SELECT' && instrutor?.tagName==='SELECT') return;
    };
    envolvida.__cadastrosIntegrados=true;
    window.renderAgendaGithub=envolvida;
    return true;
  }

  if(!aplicarPatch()) window.addEventListener('load',()=>aplicarPatch(),{once:true});
})();