/**
 * This is an example of a basic node.js script that performs
 * the Authorization Code oAuth2 flow to authenticate against
 * the Spotify Accounts.
 *
 * For more information, read
 * https://developer.spotify.com/web-api/authorization-guide/#authorization_code_flow
 */

var express = require('express'); // Express web server framework
var request = require('request'); // "Request" library
var cors = require('cors');
var querystring = require('querystring');
var cookieParser = require('cookie-parser');
var bodyParser = require('body-parser');

var client_id = '09be945870074ec595e2f9174e572ba8'; // Your client id
var client_secret = 'a40bbc3835994098a6b631cd44e24f98'; // Your secret
var redirect_uri = 'http://localhost:8888/callback'; // Your redirect uri

/**
 * Generates a random string containing numbers and letters
 * @param  {number} length The length of the string
 * @return {string} The generated string
 */
var generateRandomString = function(length) {
  var text = '';
  var possible = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';

  for (var i = 0; i < length; i++) {
    text += possible.charAt(Math.floor(Math.random() * possible.length));
  }
  return text;
};

var stateKey = 'spotify_auth_state';

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

var access_token;
var refresh_token;

app.get('/login', function(req, res) {

  var state = generateRandomString(16);
  res.cookie(stateKey, state);

  // your application requests authorization
  var scope = 'user-read-private user-read-email';
  res.redirect('https://accounts.spotify.com/authorize?' +
    querystring.stringify({
      response_type: 'code',
      client_id: client_id,
      scope: scope,
      redirect_uri: redirect_uri,
      state: state
    }));
});

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

  request.post(authOptions, then);
  function then (error, response, body) { res.send(body); }
});



app.get('/call', function (req, res)
{
  api(req.query.endpoint, req.query.token, then);
  function then (error, response, body) { res.send(body); }
});

app.get('/me', function(req, res)
{
  api('/me', req.query.token, then);
  function then (error, response, body) { res.send(body); }  
});

app.get('/devices', function(req, res)
{
  api('/me/player/devices', req.query.token, then);
  function then (error, response, body) { res.send(body); }  
});

app.get('/recently-played', function(req, res)
{
  api('/me/player/recently-played', req.query.token, then);
  function then (error, response, body) { res.send(body); }
});

app.get('/player', function(req, res)
{
  api('/me/player', req.query.token, then);
  function then (error, response, body) { res.send(body); }
});

app.get('/stats', function (req, res)
{
  var result = {};

  api('/me', req.query.token, function (error, response, body) { 
    result.me = body;
    api('/me/player/', req.query.token, function (error, response, body) { 
      result.me.player = body;
      api('/me/player/devices', req.query.token, function (error, response, body) { 
        result.me.devices = body.devices;
        api('/me/player/recently-played', req.query.token, function (error, response, body) { 
          result.me.recent = body;
          res.send(result.me);
        });
      });
    });
  });
});

function api (uri, token, callback)
{
  var options = {
    url: 'https://api.spotify.com/v1' + uri,
    headers: { 'Authorization': 'Bearer ' + token },
    json: true
  };

  // use the access token to access the Spotify Web API
  request.get(options, callback);  
}

console.log('Listening for HTTP on port 4200');
app.listen(4200);
