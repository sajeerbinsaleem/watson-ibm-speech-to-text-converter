const AssistantV2 = require('ibm-watson/assistant/v2');
const { IamAuthenticator } = require('ibm-watson/auth');

const assistant = new AssistantV2({
  authenticator: new IamAuthenticator({ apikey: 'qpwUvPnQ2piomi3lGJPh4sqwa8ZvRtkEoG4qDjhlYxW1' }),
  serviceUrl: 'https://api.us-south.assistant.watson.cloud.ibm.com/instances/da5aab5f-2601-4bcc-8f03-a943d19dabb5',
  version: '2018-09-19'
});
var sessionId = '';
async function asyncCall() {
   var k = await assistant.createSession({
        assistantId: '256ffa4d-5070-4dc8-9cb1-33d0b77873b2',
      });
      console.log(k.result)
      sessionId = k.result.session_id;
      assistant.message(
        {
          input: { text: "How much automation have you been able to incorporate in your processes?" },
          assistantId: '256ffa4d-5070-4dc8-9cb1-33d0b77873b2',
          sessionId: sessionId,
        })
        .then(response => {
          console.log(JSON.stringify(response.result, null, 2));
        })
        .catch(err => {
          console.log(err);
        });
  }
  
  asyncCall();
