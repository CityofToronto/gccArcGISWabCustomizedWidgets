$(function() {
  let filePath = window.location.pathname, urlParam
  if (filePath.indexOf('connection') > -1) {
    urlParam = getUrlParameter("hostname")
    $("#db-name").text(urlParam)
    getConnection(urlParam, filePath.split('-')[1].indexOf('db')>-1?'dbconns':'agsconns')
  } else {
    urlParam = getUrlParameter("env")
    urlParam = urlParam?urlParam.toLowerCase():'all'
    getStatus(urlParam)
    $("#env-select").val(urlParam)
    $("#env-select").change(function() {
      getStatus(this.value)     
    })   
  }
 


});

function getUrlParameter(sParam) {
    var sPageURL = window.location.search.substring(1),
        sURLVariables = sPageURL.split('&'),
        sParameterName,
        i;

    for (i = 0; i < sURLVariables.length; i++) {
        sParameterName = sURLVariables[i].split('=');

        if (sParameterName[0] === sParam) {
            return sParameterName[1] === undefined ? true : decodeURIComponent(sParameterName[1]);
        }
    }
}

function getStatus(env) {
  $(".loading").toggleClass('is-hidden')
  $.getJSON( 'http://maserati.corp.toronto.ca:7083/cotgeoservices/rest/dbstatus?env=' + env + '&f=pjson', function( data ) {
      console.log(data);
      $(".loading").toggleClass('is-hidden')
      var template = Handlebars.compile($("#db-row").html());
      $("#db-body").text('');
      $("#db-body").append(template(data.result));
  });
}

function getConnection(db, param) {
  $(".loading").toggleClass('is-hidden')
  $.getJSON( 'http://maserati.corp.toronto.ca:7083/cotgeoservices/rest/' + param + '?hostname=' + db + '&f=pjson', function( data ) {
      console.log(data);
      $(".loading").toggleClass('is-hidden')
      var template = Handlebars.compile($("#connection-row").html());
      $("#connection-body").text('');
      $("#connection-body").append(template(data.result));
  });
}


Handlebars.registerHelper('breaklines', function(text) {
    text = Handlebars.Utils.escapeExpression(text);
    text = text.replace(/(\r\n|\n|\r)/gm, '<br>');
    return new Handlebars.SafeString(text);
});