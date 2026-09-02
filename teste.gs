function testeModeloLista() {

  const id = '1QciVlhhuUb9n2DDPWTyIvTO6bt8BnE_I21PdEmAbQLM';

  const arquivo = DriveApp.getFileById(id);

  Logger.log(arquivo.getName());

}