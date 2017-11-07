const { app } = require('electron');

//add ignore-gpu-blacklist to enable webgl tests on CI services
app.commandLine.appendSwitch('ignore-gpu-blacklist');
