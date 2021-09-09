/*
	Tuna Meet API
	Version: 1.0.1
	Author: TunaGroup
	window.tunaMeetAPI.loadWidget();
	window.tunaMeetAPI.loadAassistant();
	window.tunaMeetAPI.startRecording();
	window.tunaMeetAPI.stopRecording();

 */
var tunaMeetAPI = {

	loadWidget: function(){
		var css = document.createElement('style');
		css.type = 'text/css';
		var styles = '.tuna_meet_widget-active {position: fixed; right: 30px; left: unset; bottom: 0px; top: unset;width: 300px; height: 300px; z-index: 2147482998; margin: 0px; padding: 0px;border: 0px; background-color: transparent; background-image: none; display: block; max-width: 100%; max-height: 100%;}';

		if (css.styleSheet) css.styleSheet.cssText = styles;
		else css.appendChild(document.createTextNode(styles));

		document.getElementsByTagName("head")[0].appendChild(css);
		var chatUrl = "https://eyai.thetunagroup.com";

		var newDiv = document.createElement("div");
		newDiv.id = "tuna_meet_widget";
		newDiv.style.display = "none";

		var iframe = document.createElement("iframe");
                iframe.src = chatUrl;
                iframe.id="tuna_chat_iframe"
		iframe.setAttribute("frameborder", "0");
                 className = "tuna_meet_widget-active";
		iframe.setAttribute("allow", "microphone");
		iframe.scrolling = "no";

		newDiv.appendChild(iframe);
		document.body.appendChild(newDiv);
	},

	loadAassistant: function(){
       // document.getElementById("tuna_meet_widget").style.display ="block";
        var tuna_chat = document.getElementById('tuna_chat_iframe');
//var idoc = tuna_chat.contentWindow.document;
//var e = idoc.createEvent('MouseEvent');
//e.initUIEvent('touchstart', true, true);
//Fix 2
//idoc.dispatchEvent(e);
        // var tuna_object={};
        // tuna_object.action_type='open_chat';
        // tuna_object.user_id=user_id;
        // tuna_object.area_id=area_id;
        tuna_chat.contentWindow.postMessage({
            'action_type':'load_assistant'
        }, "*");


	},
	startRecording: function(){
        //document.getElementById("tuna_meet_widget").style.display ="block";
        var tuna_chat = document.getElementById('tuna_chat_iframe');
        // var tuna_object={};
        // tuna_object.action_type='open_chat';
        // tuna_object.user_id=user_id;
        // tuna_object.area_id=area_id;
        tuna_chat.contentWindow.postMessage({
            'action_type':'start'
        }, "*");


	},
	stopRecording: function(){
        //document.getElementById("tuna_meet_widget").style.display ="block";
        var tuna_chat = document.getElementById('tuna_chat_iframe');
        // var tuna_object={};
        // tuna_object.action_type='open_chat';
        // tuna_object.user_id=user_id;
        // tuna_object.area_id=area_id;
        tuna_chat.contentWindow.postMessage({
            'action_type':'stop'
        }, "*");


	},

}
