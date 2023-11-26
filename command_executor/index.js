'use strict';

var libQ = require('kew');
var io = require('socket.io-client');

var socket = io.connect('http://localhost:3000');


//declare global status variable
var last_state = 'na';


module.exports = commandExecutor;
function commandExecutor(context) {
	var self = this;

	this.context = context;
	this.commandRouter = this.context.coreCommand;
	this.logger = this.context.logger;
	this.configManager = this.context.configManager;

}



commandExecutor.prototype.onVolumioStart = function()
{
	var self = this;
	var configFile=this.commandRouter.pluginManager.getConfigurationFile(this.context,'config.json');
	this.config = new (require('v-conf'))();
	this.config.loadFile(configFile);

    return libQ.resolve();
}

commandExecutor.prototype.onStart = function() {
    var self = this;
	var defer=libQ.defer();

	// read and parse status once
	socket.emit('getState','');
	socket.once('pushState', self.parseStatus.bind(self));

	// listen to every subsequent status report from Volumio
	// status is pushed after every playback action, so we will be
	// notified if the status changes
	socket.on('pushState', self.parseStatus.bind(self));

	// Once the Plugin has successfull started resolve the promise
	defer.resolve();

    return defer.promise;
};

commandExecutor.prototype.onStop = function() {
    var self = this;
    var defer=libQ.defer();

    // Once the Plugin has successfull stopped resolve the promise
    defer.resolve();

    return libQ.resolve();
};

commandExecutor.prototype.onRestart = function() {
    var self = this;
    // Optional, use if you need it
};


// a pushState event has happened. Check whether it differs from the last known status and
// switch output port on or off respectively
commandExecutor.prototype.parseStatus = function(state) {
    var self = this;
	
	self.logger.info('CurState: ' + state.status + ' PrevState: ' + last_state);

    if(state.status!=last_state && state.status=='play'){
		self.logger.info('Sending cmd via API');

		var cmd = ("curl" + 
			  	   " -H \"Authorization: Bearer " + self.config.get('ha_authorization_token') + "\"" +
				   " -H \"Content-Type: application/json\" " +
				   " -d \'{\"entity_id\": \"" + self.config.get('ha_entity_id') +  "\"}\'" + 
				   " http://"+ self.config.get('ha_address')+ "/api/services/switch/turn_on"
		)
		self.logger.info(cmd)

		exec(cmd, function (error, stdout, stderr) {
			if(error){
				self.logger.info('Cannot execute command')
			}
		});
	}
	last_state=state.status;
};

// Configuration Methods -----------------------------------------------------------------------------

commandExecutor.prototype.getUIConfig = function() {
    var defer = libQ.defer();
    var self = this;
	self.logger.info('Setting UI defaults')
	self.logger.info('Entity ID: ' + self.config.get('ha_entity_id'));
	self.logger.info('Token: ' + self.config.get('ha_authorization_token'));
	self.logger.info('IP: ' + self.config.get('ha_address'));

    var lang_code = this.commandRouter.sharedVars.get('language_code');

    self.commandRouter.i18nJson(__dirname+'/i18n/strings_'+lang_code+'.json',
        __dirname+'/i18n/strings_en.json',
        __dirname + '/UIConfig.json')
        .then(function(uiconf)
        {
			uiconf.sections[0].content[0].value = self.config.get('ha_entity_id');
			uiconf.sections[0].content[1].value = "********" // hide token#self.config.get('ha_authorization_token');
			uiconf.sections[0].content[2].value = self.config.get('ha_address');
            defer.resolve(uiconf);
        })
        .fail(function()
        {
            defer.reject(new Error());
        });

    return defer.promise;
};


commandExecutor.prototype.saveOptions = function(data) {
    var self = this;
    var successful = true;

    // save port setting to our config
	self.logger.info('Saving Settings: Entity ID: ' + data['ha_entity_id']);
	self.logger.info('Saving Settings: Authorization token: ' + data['ha_authorization_token']);
	self.logger.info('Saving Settings: address: ' + data['ha_address']);


	self.config.set('ha_entity_id', data['ha_entity_id']);
	self.config.set('ha_authorization_token', data['ha_authorization_token']);
	self.config.set('ha_address', data['ha_address']);

};

commandExecutor.prototype.getConfigurationFiles = function() {
	return ['config.json'];
}

commandExecutor.prototype.setUIConfig = function(data) {
	var self = this;
	//Perform your installation tasks here
};

commandExecutor.prototype.getConf = function(varName) {
	var self = this;
	//Perform your installation tasks here
};

commandExecutor.prototype.setConf = function(varName, varValue) {
	var self = this;
	//Perform your installation tasks here
};

