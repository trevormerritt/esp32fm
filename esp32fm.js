// esp32fm.js
// A Espruino file manager for the ESP32.  Might work elsewhere, who knows.
// Written to allow me to manage the 'Storage' on the ESP32.
// Makes serving files from a webserver easier when they are already on the device.
// Trevor Merritt <trevor.merritt@gmail.com>
// Version 0.1
var ssid = '__YOUR_SSID_HERE__';
var password = '__YOUR_PASS_HERE__';
var apname = 'ESP32FM'
var port = 80;
var wifi = require('Wifi'), WebServer = require('WebServer'), Storage = require('Storage');

function onInit() {
  console.log("Its alive!");
  console.log(Date.now());

  attempt_wifi_connect();
}

function startServer() {
  var webs = new WebServer({
    port: 80,
    default_index: 'index.njs',
    file_system: '/var/www/',
    memory: {
      'index.txt': {
        'content': 'Hello from in memory text!'
      },
      'index.js': {
        'type': 'application/javascript',
        'content': "function hello(){ alert('Hello from in memory client side javascript'); }",
      },
      'index.njs': {
        'content': index_njs
      },
      'favicon.ico': {
        'type': 'image/x-icon',
        'content': "\0\0\x01\0\x01\0\x10\x10\x10\0\x01\0\x04\x00\xf0\0\0\0\x16\0\0\x00\x89PNG\x0d\x0a\x1a\x0a\0\0\0\x0dIHDR\0\0\0\x10\0\0\0\x10\x08\x06\0\0\0\x1f\xf3\xffa\0\0\x00\xb7IDAT8\x8d\xa5S\xc1\x0d\x03!\x0csN\xb7\x91w\xcaP\xde)3\xd1G\x09\x0a\x85\xab\xa8\xea\x0f\x02\x82c\x1b0\x92x\x82\xbb\xb7:\x8f\x08D\x84\xd5\xb5\x1b\x00H\xb6>N\x04uN\x12\x92\x10\x11S\xcd]\x0b\xbf\xa9\xe9\x8a\x00\xa0I\x1a*\x06A\x97\xb7\x90\xd4\x8e$A\x12\xee\xde\xb2vR\x90$\xc8q\xf6\x03\xbc\x15Ldw]\x88zpc\xab*\x8c\x08H\xb2A\x90\x1e\x97\xce\x1bd3\x00\xb8v\x9b\xa7p\xf7\xb6\x10\x9cb\xc9\xe0Wd\x06\x17\x80v\xe2\xfb\x09\x17\x00H\xfa\x8b\xc0\xba\x9c\xe3CU\xf1\xc8@\xd2\x08fW\xf8i3?U\x12\x18z\x16\xf5A\x9ddc_\xee\xbd~e{*z\x01|\xcdnfT\x03\x0an\0\0\0\x00IEND\xaeB`\x82"
      }
    }
  });

  webs.on('start', function (WebServer) {
    console.log('WebServer listening on port ' + WebServer.port);
  });
  webs.on('request', function (request, response, parsedUrl, WebServer) {
    console.log('WebServer requested', parsedUrl);
  });
  webs.on('error', function (error, WebServer) {
    console.log('WebServer error', error);
  });

  webs.createServer();
}

function attempt_wifi_connect() {
  var numLoops = 0;
  var nettimeout = setInterval(function () {
    console.log("check for net - test " + numLoops);
    console.log(wifi.getStatus());
    numLoops++;
    if (numLoops >= 4) {
      clearInterval(nettimeout);
      console.log("starting AP");
      wifi.startAP(apname, {}, function () {
        startServer();
        console.log(wifi.getStatus());
      });
    }
  }, 1000);

  wifi.connect(ssid, { password: password }, function (res) {
    console.log("...Connect complete. getting IP...");
    console.log(wifi.getIP());
    console.log("...and checking server setup...");
    if (res) {
      wifi.startAP('Espruino_Server', {}, startServer);
    } else {
      startServer();
    }
    console.log("...server setup complete.");
  });

  console.log('connection attempt in progress...');
}

function index_njs(req, res, uri, webs) {
  console.log(uri);
  // build the page.
  var result = '';
  if (uri.query != null && uri.query.action != null) {
    switch (uri.query.action) {
      case 'rm':
        Storage.erase(uri.query.path);
        result = 'File Erased';
        break;
      case 'write':
        result = 'File Created:' + Storage.write(uri.query.path, uri.query.file);
        break;
      case 'read':
        result = 'File Contents: ' + Storage.read(uri.query.path);
        break;
    }
    console.log(uri.query.action);
    console.log('RESULT:');
    console.log(result);
  }

  var flcode = '<ul>';
  Storage.list().forEach(function(file) {
    flcode += '<li>' + file +
      '<form><input type="hidden" name="path" value="' + file + '"/>' +
      '<input type="submit" name="action" value="rm" />' +
      '<form><input type="hidden" name="path" value="' + file + '"/>' +
      '<input type="submit" name="action" value="read" /></form>'
     '</li>';
  });
  flcode += '</ul>';
  var freespace = '<p>Free:' + Storage.getFree() + '</p>';
  var page_content = '<html><body>' +
    '<p>' + freespace + '</p>' +
    '<p>' + flcode +'</p>' +
    '<p><b>Result:</b>' + JSON.stringify(result) + '</p>' +
    '<p><b>Run At: </b><br>' + JSON.stringify(Date.now()) + '</p>' +
    '<p><form><textarea name="file" cols="40" rows="20"></textarea><input type="text" name="path" /><input type="submit" name="action" value="write"/></form></p>' +
    '</body></html>';
  return {
    type: 'text/html',
    content: page_content
  };
};
