'use strict';

// instantiates an ExpressJs web application
var express = require('express');
var website = express();
var http = require('http').Server(website);

// manages i18n routing of the index page
var i18n = require('i18n-express')();
i18n.options.supportedLocales = ['en', 'fr'];
i18n.options.defaultLocale = i18n.options.supportedLocales[0];
i18n.options.viewsDirectory = __dirname + '/templates';

// instantiates a router and its route URL
var i18nRouter = express.Router();
var routerUseUrl = '/';

/* i18n routes */
// landing page
i18n.l10nRoutes(i18nRouter, 'index.html', routerUseUrl, '/', ['index', 'index.html']);
website.use(routerUseUrl, i18nRouter);

// starts the web aplication server
http.listen(3000, function() {
    console.log('listening on *:3000');
});

/** closes the database and the application */
function byeBye() {
    console.log('the i18n-express demonstration website is shutting down.');
    process.exit();
};

// shuts the application down on low-level errors
process.on('SIGINT', byeBye).on('SIGTERM', byeBye);
