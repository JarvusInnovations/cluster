
var start = Date.now(),
    http = require('http'),
    cluster = require('cluster'),
    args = process.argv,
    app = require(args[args.length - 1]),
    callback = app.callback(),
    server = http.createServer(),
    closing = false;

cluster.schedulingPolicy = cluster.SCHED_RR;

server.on('request', callback);

server.on('checkContinue', function (req, res) {
  req.checkContinue = true;
  callback(req, res);
});

// custom koa settings
// defaults to http://nodejs.org/api/http.html#http_server_maxheaderscount
server.maxHeadersCount = app.maxHeadersCount || 1000;
server.timeout = app.timeout || 120000;

server.listen(app.port, function (err) {
  if (err) {
    throw err;
  }

  app.name || (app.name = 'koa app');

  console.log('[WORKER] %s listening on port %s, pid %d, started in %sms',
      app.name,
      this.address().port,
      process.pid,
      Date.now() - start
  );
});

process.on('uncaughtException', function (err) {
  console.error(err.stack);
  close(1);
});

process.on('exit', function () {
  console.log('[WORKER] exiting worker %s', cluster.worker.id)
});

function close(code) {
  if (closing) {
      return;
  }

  console.log('[WORKER] closing worker %s', cluster.worker.id);
  closing = true;

  // to do: make this an option
  var killtimer = setTimeout(function () {
    process.exit(code);
  }, 30000);

  // http://nodejs.org/api/timers.html#timers_unref
  killtimer.unref();
  server.close();
  cluster.worker.disconnect();
}
