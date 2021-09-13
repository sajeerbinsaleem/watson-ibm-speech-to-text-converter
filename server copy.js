/**
 * Copyright 2015 IBM Corp. All Rights Reserved.
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *      http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

'use strict';

const express = require('express');
const app = express();

const expressBrowserify = require('express-browserify');
const webpackDevMiddleware = require('webpack-dev-middleware');
const webpack = require('webpack');
const webpackConfig = require('./webpack.config');
const { IamTokenManager } = require('ibm-watson/auth');
var IamAuthenticator = require('ibm-watson/auth').IamAuthenticator;
var AssistantV2 = require('ibm-watson/assistant/v2'); // watson sdk
const redis = require("redis");
const redisPort = process.env.redisPort?process.env.redisPort:6379;
const Redisclient = redis.createClient(redisPort,{ db: 0 });
// allows environment properties to be set in a file named .env
require('dotenv').config({ silent: true });

var bodyParser = require('body-parser');

if (!process.env.SPEECH_TO_TEXT_IAM_APIKEY) {
  console.error('Missing required credentials - see https://github.com/watson-developer-cloud/node-sdk#getting-the-service-credentials');
  process.exit(1);
}

// enable rate-limiting
const RateLimit = require('express-rate-limit');
app.enable('trust proxy'); // required to work properly behind Bluemix's reverse proxy

const limiter = new RateLimit({
  windowMs: 30 * 60 * 1000, // 15 minutes
  max: 1000 // limit each IP to 100 requests per windowMs
});

//  apply to /api/*
app.use('/api/', limiter);

// force https - microphone access requires https in Chrome and possibly other browsers
// (*.mybluemix.net domains all have built-in https support)

// const secure = require('express-secure-only');
// app.use(secure());
app.use(express.static(__dirname + '/static'));

// set up express-browserify to serve browserify bundles for examples
const isDev = app.get('env') === 'development';
app.get(
  '/browserify-bundle.js',
  expressBrowserify('static/browserify-app.js', {
    watch: isDev,
    debug: isDev
  })
);

// set up webpack-dev-middleware to serve Webpack bundles for examples
const compiler = webpack(webpackConfig);
app.use(
  webpackDevMiddleware(compiler, {
    publicPath: '/' // Same as `output.publicPath` in most cases.
  })
);

// const sttAuthenticator = new IamTokenManager({
//   apikey: process.env.SPEECH_TO_TEXT_IAM_APIKEY
// });


// Create the service wrapper
var assistant = new AssistantV2({
  version: '2019-02-28',
  authenticator: new IamAuthenticator({
    apikey: process.env.ASSISTANT_IAM_APIKEY
  }),
  serviceUrl: process.env.ASSISTANT_URL,
});
// const assistant = new AssistantV2({
//   authenticator: new IamAuthenticator({ apikey: 'qpwUvPnQ2piomi3lGJPh4sqwa8ZvRtkEoG4qDjhlYxW1' }),
//   serviceUrl: 'https://api.us-south.assistant.watson.cloud.ibm.com/instances/da5aab5f-2601-4bcc-8f03-a943d19dabb5',
//   version: '2018-09-19'
// });
var date = new Date();
date.setMonth(date.getMonth() + 1);
var initContext = {
  skills: {
    'main skill': {
      user_defined: {
        acc_minamt: 50,
        acc_currbal: 430,
        acc_paydue: date.getFullYear() + '-' + (date.getMonth() + 1) + '-26 12:00:00',
        accnames: [
          5624,
          5893,
          9225,
        ]
      }
    }
  }
};
var sessionId = '';
// const ttsAuthenticator = new IamTokenManager({
//   apikey: process.env.TEXT_TO_SPEECH_IAM_APIKEY
// });

// speech to text token endpoint
app.use('/api/speech-to-text/token', function(req, res) {

  Redisclient.get('pm_watson_api_key', async (err, authData) => {
    if (err) throw err;

    if (authData) {
        authData = JSON.parse(authData)
        const sttAuthenticator = new IamTokenManager({
          apikey: authData.speech_key
        });
        return sttAuthenticator
        .requestToken()
        .then(({ result }) => {
          res.json({ accessToken: result.access_token, url: process.env.SPEECH_TO_TEXT_URL });
        })
        .catch(console.error);
    }
    else {
      return res.json({text:  null, status:true});
    }
  });
  
});
/*
 * Endpoint to be call from the client side.
 * Required.body.firstcall is set when initialising chat and sends initial context (initContext)
 * Context is then set when required for actions.
 */
app.use(bodyParser.json());
app.post('/api/message', function (req, res) {
  
  var assistantId = process.env.ASSISTANT_ID || '<assistant-id>';
  if (!assistantId || assistantId === '<assistant-id>') {
    return res.json({
      'output': {
        'text': 'The app has not been configured with a <b>ASSISTANT_ID</b> environment variable. Please refer to the '
      }
    });
  }

  var textIn = '';

  if(req.body.input) {
    textIn = req.body.input.text;
  }

  var payload = {
    assistantId: assistantId,
    sessionId: req.body.session_id,
    input: {
      message_type : 'text',
      text : textIn,
    }
  };

  if (req.body.firstCall) {
    payload.context =  req.body.context || initContext;
  } 
  // else {
  //   res.status(500).json('error message');
  // }

  // Send the input to the assistant service
   assistant.message(payload)
    .then(response => {
      console.log(JSON.stringify(response.result, null, 2));
      if(response.result){

        return res.json({text: response.result.output.generic[0].text, data:response.result});
      }
      return res.json({text: 'I do not understand what you said', data:response.result});
    })
    .catch(err => {
      console.log(err);
    });

  
});
app.post('/api/set_auth_key', function (req, res) {

  if(!req.body.assistant_key || !req.body.assistant_id || !req.body.assistant_url || !req.body.speech_key || !req.body.speech_url){
    res.status(401).json({
      error: 'Partial request!, the psrameters is invalid',
      body : req.body,
    });
  }

  Redisclient.get('pm_watson_api_key', async (err, authData) => {
    if (err) throw err;

    // if (authData) {
    //     authData = JSON.parse(authData)
    //     return res.json({text: authData, status:true});
    // }
    // else {
      let obj = {
        assistant_key : req.body.assistant_key,
        assistant_id : req.body.assistant_id,
        assistant_url : req.body.assistant_url,
        speech_key : req.body.speech_key,
        speech_url : req.body.speech_url,
      }
      obj = JSON.stringify(obj)
      Redisclient.set('pm_watson_api_key',obj);
      return res.json({text:  JSON.parse(obj), status:true});
    // }
  });
  
});
app.get('/api/get_auth_key', function (req, res) {

  
  Redisclient.get('pm_watson_api_key', async (err, authData) => {
    if (err) throw err;

    if (authData) {
        authData = JSON.parse(authData)
        return res.json({text: authData, status:true});
    }
    else {
      return res.json({text:  null, status:true});
    }
  });

  
});
app.get('/api/session', function (req, res) {
  Redisclient.get('pm_watson_api_key', async (err, authData) => {
    if (err) throw err;

    if (authData) {
        authData = JSON.parse(authData)
        async function asyncCall() {
          var k = await assistant.createSession({
                assistantId: authData.assistant_id,
              });
              console.log(k.result)
              sessionId = k.result;
              return res.send(sessionId)
      
          }
          
          asyncCall();
    }
    else {
      return res.json({text:  null, status:true});
    }
  });
  
  // async function asyncCall() {
  //   var k = await assistant.createSession({
  //         assistantId: '256ffa4d-5070-4dc8-9cb1-33d0b77873b2',
  //       });
  //       console.log(k.result)
  //       sessionId = k.result;
  //       return res.send(sessionId)

  //   }
    
  //   asyncCall();

  
});

// app.use('/api/text-to-speech/token', function(req, res) {
//   return ttsAuthenticator
//     .requestToken()
//     .then(({ result }) => {
//       res.json({ accessToken: result.access_token, url: process.env.TEXT_TO_SPEECH_URL });
//     })
//     .catch(console.error);
// });

const port = process.env.PORT || process.env.VCAP_APP_PORT || 3008;
app.listen(port, function() {
  console.log('Example IBM Watson Speech JS SDK client app & token server live at http://localhost:%s/', port);
});

// Chrome requires https to access the user's microphone unless it's a localhost url so
// this sets up a basic server on port 3001 using an included self-signed certificate
// note: this is not suitable for production use
// however bluemix automatically adds https support at https://<myapp>.mybluemix.net
// if (!process.env.VCAP_SERVICES) {
//   const fs = require('fs');
//   const https = require('https');
//   const HTTPS_PORT = 3001;

//   const options = {
//     key: fs.readFileSync(__dirname + '/keys/localhost.pem'),
//     cert: fs.readFileSync(__dirname + '/keys/localhost.cert')
//   };
//   https.createServer(options, app).listen(HTTPS_PORT, function() {
//     console.log('Secure server live at https://localhost:%s/', HTTPS_PORT);
//   });
// }
