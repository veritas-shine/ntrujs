var os = require('os');
var child_process = require('child_process');
var fs = require('fs');
var http = require('http');
var nodeFilePath = 'lib/addon-'+os.platform()+'-'+os.arch()+'.node';

fs.copy = function (src, dest, callBach) {
    fs.open(src, 'r', function (err, rfd) {
        fs.open(dest, 'w+', function (err, wfd) {
            var srcStream = fs.createReadStream(null, { fd: rfd });
            var destStream = fs.createWriteStream(null, { fd: wfd });
            srcStream.pipe(destStream);
            srcStream.on('close', function () {
                callBach();
            });
        });
    });
};

var run_installer = function () {
    child_process.exec('./build_ntru && (node-gyp rebuild) || (exit 0)', function (err, stdout, stderr) {
        console.log(stdout);
        console.log(stderr);
        if (stderr.indexOf('gyp ERR!') > -1) {
            console.log('Failed to compile ntrujs for your platform. To ensure successful compilation; please make sure that your platform-specific NTRU libraries are in the lib/lib folder. If you have downloaded pre-compiled binaries and do not wish to modify them, you can safely ignore this error.');
            process.exit(0);
        } else {
            fs.copy('build/Release/addon.node', nodeFilePath, function () {
                process.exit(0);
            });
        }
    });
};

function buildFromSource() {
  var src_gyp = "binding_linux.gyp";

  switch (os.platform()) {
    case "win32":
      src_gyp = "windows.gysrc";
      break;
    case "darwin":
      src_gyp = "darwin.gysrc";
      break;
    default:
      src_gyp = "linux.gysrc";
      break;
  }

  console.log('Source .gyp file: ' + src_gyp);
  fs.copy(src_gyp, 'binding.gyp', function () {
    run_installer();
  });
}

function tryToDownloadBinary(callback) {
    var NTRU_ROOT_URL = process.env.NTRU_ROOT_URL || 'http://github.com/veritas-shine/ntrujs/tree/dist/'
    if (NTRU_ROOT_URL) {

      var file = fs.createWriteStream(nodeFilePath);
      http.get(NTRU_ROOT_URL + nodeFilePath, function(response) {
        response.pipe(file);
        file.on('finish', function() {
          file.close();  // close() is async, call cb after close completes.
        });
      }).on('error', function(err) { // Handle errors
        console.error(err)
        fs.unlink(nodeFilePath); // Delete the file async. (But we don't check the result)
        callback();
      });
    } else {
        callback()
    }
}

if (!fs.existsSync(nodeFilePath)) {
  // tryToDownloadBinary(buildFromSource);
  buildFromSource();
}
