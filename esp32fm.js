// esp32fm.js
// A Espruino file manager for the ESP32.  Might work elsewhere, who knows.
// Written to allow me to manage the 'Storage' on the ESP32.
// Makes serving files from a webserver easier when they are already on the device.
// Trevor Merritt <trevor.merritt@gmail.com>
// Version 0.1.2
// CHANGELOG
// 0.1.2
//  - Form generation fixes.
// 0.1.1
//  - Removed debugging outputs
//  - Optimized some simple if/else statements
var ssid = 'Lord of the Pings';
var password = 'password';
var apname = 'ESP32FM';
var wifi = require('Wifi'), WebServer = require('WebServer'), Storage = require('Storage');
function onInit() {
  attempt_wifi_connect();
}

function startServer() {
  var webs = new WebServer({
    port: 80,
    default_index: 'index.njs',
    memory: {
      'index.njs': {
        'content': index_njs
      }
    }
  });
  webs.createServer();
}

function attempt_wifi_connect() {
  var numLoops = 0;
  var nettimeout = setInterval(function () {
    numLoops++;
    if (numLoops >= 4) {
      clearInterval(nettimeout);
      wifi.startAP(apname, {}, function () {
        startServer();
      });
    }
  }, 1000);

  wifi.connect(ssid, { password: password }, function (res) {
    res ? wifi.startAP(apname, {}, startServer) : startServer();
  });
}

function index_njs(req, res, uri, webs) {
  var result = '';
  if (uri.query && uri.query.action) {
    result = 'File ';
    switch (uri.query.action) {
      case 'rm':
        Storage.erase(uri.query.path);
        result += 'Erased';
        break;
      case 'write':
        result += 'Created:' + Storage.write(uri.query.path, uri.query.file);
        break;
      case 'read':
        result += 'Contents: ' + Storage.read(uri.query.path);
        break;
    }
  }
  var c = '';
  Storage.list().forEach(function(f) {
    c += '<li>' + f +
      '<form><input type="hidden" name="path" value="' + f + '"/>' +
      '<input type="submit" name="action" value="rm" />' +
      '<form><input type="hidden" name="path" value="' + f + '"/>' +
      '<input type="submit" name="action" value="read" /></form>'+
     '</li>';
  });
  var page_content = '<html><body><p>Free:'+Storage.getFree()+'</p>' +
    '<p><ul>'+c+'</ul></p>'+
    '<p><b>Result:</b>' + JSON.stringify(result) + '</p>' +
    '<p><form><textarea name="file" cols="40" rows="20"></textarea><input type="text" name="path" /><input type="submit" name="action" value="write"/></form></p>' +
    '</body></html>';
  return {
    type: 'text/html',
    content: page_content
  };
}
