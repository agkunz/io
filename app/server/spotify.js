/**
 * This is an example of a basic node.js script that performs
 * the Authorization Code oAuth2 flow to authenticate against
 * the Spotify Accounts.
 *
 * For more information, read
 * https://developer.spotify.com/web-api/authorization-guide/#authorization_code_flow
 */

var http = require('http');
var https = require('https');
var fs = require('fs');
var express = require('express'); // Express web server framework
var request = require('request'); // "Request" library
var cors = require('cors');
var querystring = require('querystring');
var cookieParser = require('cookie-parser');
var bodyParser = require('body-parser');

var client_id = global.env.SPOTIFY_CLIENT_ID;
var client_secret = global.env.SPOTIFY_CLIENT_SECRET;

var app = express();

app.use(express.static(__dirname + '/public'))
   .use(cors())
   .use(cookieParser())
   .use(bodyParser())
   .use(function(req, res, next) {
      res.header("Access-Control-Allow-Origin", "*");
      res.header("Access-Control-Allow-Headers", "Origin, X-Requested-With, Content-Type, Accept");
      next();
    });;

if (global.env.HTTP_PROTOCOL) {

  if (global.env.HTTP_PROTOCOL === 'https') {

    var options = {
      key: fs.readFileSync(env.SSL_KEY, 'utf8'),
      cert: fs.readFileSync(env.SSL_CERTIFICATE, 'utf8'),
      ca: fs.readFileSync(env.SSL_CA, 'utf8')
    };

    https.createServer(options, app).listen(global.env.HTTP_PORT);
    global.log('Listening for HTTPS on port ' + global.env.HTTP_PORT);    

  } else {

    // app.listen(global.env.HTTP_PORT);
    http.createServer(app).listen(global.env.HTTP_PORT);
    global.log('Listening for HTTP on port ' + global.env.HTTP_PORT);    

  }

} else {

  http.createServer(app).listen(global.env.HTTP_PORT);
  global.log('Listening for HTTP on port ' + global.env.HTTP_PORT);

}


/**
 * Get a new access token
 *
 * https://developer.spotify.com/web-api/authorization-guide/#authorization_code_flow
 */
app.post('/token', function(req, res)
{
  res.setHeader('Content-Type', 'application/json');

  var authOptions = {
    url: 'https://accounts.spotify.com/api/token',
    form: {
      code: req.body.code,
      redirect_uri: req.body.redirect_uri,
      grant_type: 'authorization_code'
    },
    headers: {
      'Authorization': 'Basic ' + (new Buffer(client_id + ':' + client_secret).toString('base64'))
    },
    json: true
  };

  request.post(authOptions, gotToken);

  function gotToken (error, response, body)
  {
    if (error || response.statusCode !== 200) {
      return res.send(JSON.stringify(response));
    }

    res.send(body);
  }
});

/**
 * refresh an existing access token
 *
 * https://developer.spotify.com/web-api/authorization-guide/#authorization_code_flow
 */
app.post('/refresh_token', function(req, res) {

  var authOptions = {
    url: 'https://accounts.spotify.com/api/token',
    headers: { 'Authorization': 'Basic ' + (new Buffer(client_id + ':' + client_secret).toString('base64')) },
    form: {
      grant_type: 'refresh_token',
      refresh_token: req.body.refresh_token
    },
    json: true
  };

  request.post (authOptions, then);

  function then (error, response, body) { res.send(body); }

});

app.get('/call', async function (req, res)
{
  let uri = req.query.endpoint;
  let token = req.query.token;

  let result = await call ( uri , token );

  res.send ( result );
});

// remember what the last valid response was
var last = {};
// make an endpoint to gather the spotify stats
app.get('/stats', async function (req, res)
{
  // use the supplied auth token
  let token = req.query.token;

  // prepare a spot to put the result
  let result = {};

  // attempt to
  try {
    // populate the result
    result.me = await call ('/me', token);
    result.me.player = await call ('/me/player', token);
    result.me.devices = (await call ('/me/player/devices', token)).devices;
    result.me.recent = await call ('/me/player/recently-played', token);
  }
  // and if there's a problem
  catch (ex) {
    // tell me what's up
    console.log(ex.code);
    // send the last valid response instead
    return res.send (last);
  }
  // and if there's not
  finally {
    // record this as the last valid result
    last = result.me;
    // and return it.
    return res.send (result.me);
  }
});

function call ( uri, token )
{
  let opts = {

    url: 'https://api.spotify.com/v1' + uri,

    headers: {
      'Accept'        : 'application/json',
      'Content-Type'  : 'application/json',
      'Origin'        : 'https://www.adamkunz.net',
      'DNT'           : '1',
      'Authorization' : 'Bearer ' + token,
    },

    json : true,

    timeout: 1500,

    time: true,
  };

  return new Promise( (resolve, reject) =>
  {
    request.get ( opts, (err, res, body) =>
    {
      if (err) { 

        return reject (err); 

      }

      return resolve (body);

    });
  }); 
}