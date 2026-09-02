function doGet() {
  return HtmlService.createTemplateFromFile('index')
    .evaluate()
    .setTitle('RG Certe SST')
    .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL);
}

function include(nome) {
  return HtmlService.createHtmlOutputFromFile(nome).getContent();
}

function obterTela(nome) {
  return HtmlService.createTemplateFromFile(nome)
    .evaluate()
    .getContent();
}

function formatarData(valor) {
  if (!valor) return '';

  if (Object.prototype.toString.call(valor) === '[object Date]') {
    return Utilities.formatDate(valor, Session.getScriptTimeZone(), 'dd/MM/yyyy');
  }

  return valor;
}

function formatarDataHora(valor) {
  if (!valor) return '';

  if (Object.prototype.toString.call(valor) === '[object Date]') {
    return Utilities.formatDate(valor, Session.getScriptTimeZone(), 'dd/MM/yyyy HH:mm');
  }

  return valor;
}

function formatarDataInput(valor) {
  if (!valor) return '';

  if (Object.prototype.toString.call(valor) === '[object Date]') {
    return Utilities.formatDate(valor, Session.getScriptTimeZone(), 'yyyy-MM-dd');
  }

  if (valor.toString().includes('/')) {
    const partes = valor.toString().split('/');
    return partes[2] + '-' + partes[1] + '-' + partes[0];
  }

  return valor;
}

function testarHistorico() {
  const html = obterTela('Historico');
  Logger.log(html.substring(0, 100));
}
