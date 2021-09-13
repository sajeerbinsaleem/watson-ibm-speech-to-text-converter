// The Api module is designed to handle all interactions with the server

var Api = (function() {
    var requestPayload;
    var responsePayload;
  
    var messageEndpoint = '/api/message';
  
    var sessionEndpoint = '/api/session';

    var apikeyEndpoint = '/api/set_auth_key';
    var getApikeyEndpoint = '/api/get_auth_key';
  
    var sessionId = null;
  
    // Publicly accessible methods defined
    return {
      sendRequest: sendRequest,
      getSessionId: getSessionId,
      setApi: setApi,
      getApi : getApi,
  
      // The request/response getters/setters are defined here to prevent internal methods
      // from calling the methods without any of the callbacks that are added elsewhere.
      getRequestPayload: function() {
        return requestPayload;
      },
      setRequestPayload: function(newPayloadStr) {
        requestPayload = JSON.parse(newPayloadStr);
      },
      getResponsePayload: function() {
        return responsePayload;
      },
      setResponsePayload: function(newPayloadStr) {
        responsePayload = JSON.parse(newPayloadStr);
       // console.log('requestPayload',requestPayload)
      },
      setErrorPayload: function() {
      }
    };
    function getApi() {
      var http = new XMLHttpRequest();
      http.open('GET', getApikeyEndpoint, true);
      http.setRequestHeader('Content-type', 'application/json');
      http.onreadystatechange = function () {
        if (http.readyState === XMLHttpRequest.DONE) {
          var res = JSON.parse(http.response);
        //   sessionId = res.result.session_id;
          console.log('http.response get id',http.response)
         
        }
      };
      http.send();
    }
    function getSessionId(callback) {
      var http = new XMLHttpRequest();
      http.open('GET', sessionEndpoint, true);
      http.setRequestHeader('Content-type', 'application/json');
      http.onreadystatechange = function () {
        if (http.readyState === XMLHttpRequest.DONE) {
          var res = JSON.parse(http.response);
        //   sessionId = res.result.session_id;
          sessionId = res.session_id;
          console.log('sessionId',sessionId)
          callback();
        }
      };
      http.send();
    }
  
    // Send a message request to the server
    function sendRequest(text, isFirstCall) {
      // Build request payload
      var payloadToWatson = {
        session_id: sessionId,
        firstCall: isFirstCall
      };
  
      payloadToWatson.input = {
        message_type: 'text',
        text: text,
      };
  
      
      // Built http request
      var http = new XMLHttpRequest();
      http.open('POST', messageEndpoint, true);
      http.setRequestHeader('Content-type', 'application/json');
      http.onreadystatechange = function () {
        if (http.readyState === XMLHttpRequest.DONE && http.status === 200 && http.responseText) {
          Api.setResponsePayload(http.responseText);
          console.log('http.responseText',JSON.parse(http.response))
          var jsn = JSON.parse(http.response)
          document.getElementById("robot").innerHTML += jsn.text;
          window.parent.postMessage({
              'action_type':'assistant_response',
              'response_string':JSON.stringify(jsn.data),
              'response_json': jsn.data,
          }, "*");

        } else if (http.readyState === XMLHttpRequest.DONE && http.status !== 200) {
          Api.setErrorPayload({
            'output': {
              'generic': [
                {
                  'response_type': 'text',
                  'text': 'I\'m having trouble connecting to the server, please refresh the page'
                }
              ],
            }
          });
        }
      };
  
      var params = JSON.stringify(payloadToWatson);
      // Stored in variable (publicly visible through Api.getRequestPayload)
      // to be used throughout the application
      if (Object.getOwnPropertyNames(payloadToWatson).length !== 0) {
        Api.setRequestPayload(params);
      }
  
      // Send request
      http.send(params);
    }
    // Send a message request to the server
    function setApi(assistant_key, assistant_id, assistant_url, speech_key, speech_url) {
      if(!assistant_key || !assistant_id || !assistant_url || !speech_key || !speech_url){
        console.log('error sending keys to redis')
        return;
      }
      let obj = {
        assistant_key : assistant_key,
        assistant_id : assistant_id,
        assistant_url : assistant_url,
        speech_key : speech_key,
        speech_url : speech_url,
      }
      // Built http request
      var http = new XMLHttpRequest();
      http.open('POST', apikeyEndpoint, true);
      http.setRequestHeader('Content-type', 'application/json');
      http.onreadystatechange = function () {
        if (http.readyState === XMLHttpRequest.DONE && http.status === 200 && http.responseText) {
          console.log('http.responseText',JSON.parse(http.response))
          var jsn = JSON.parse(http.response)
          window.parent.postMessage({
              'action_type':'api_key',
              'response_string':'successfully assigned api keys ',
          }, "*");
         sendRequest('', true);
          return 'sucess';


        } else if (http.readyState === XMLHttpRequest.DONE && http.status !== 200) {
          
          return 'error';
        }
      };
      var params = JSON.stringify(obj);
      // Send request
      http.send(params);
    }
  }());
  
