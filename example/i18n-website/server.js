'use strict';

// instantiates an ExpressJs web application
var express = require('express');
var website = express();
var http = require('http').Server(website);

// manages i18n routing of the index page
var i18n = require('i18n-express')();
i18n.options.supportedLocales = ['en', 'fr'];
i18n.options.defaultLocale = i18n.options.supportedLocales[0];
i18n.options.viewsDirectory = __dirname + '/views';

// serves the CSS resources for the locale selector directive
website.use(express.static('node_modules/i18n-express/lib/i18n-express-directives'));
// serves the javascript files browserified from webapp by package.json.scripts.postinstall.prestart
website.use(express.static('public'));
// serves other media resources (CSS)
website.use(express.static('media'));

// instantiates a router and its route URL
var i18nRouter = express.Router();
var routerUseUrl = '/';

/* i18n pages routes */
i18n.l10nRoutes(i18nRouter, 'index.html', routerUseUrl, '/', ['index', 'index.html']);
i18n.l10nRoutes(i18nRouter, 'app.html', routerUseUrl, '/webapp/');
website.use(routerUseUrl, i18nRouter);

/* i18n template routes */
var i18nTplRouter = express.Router();
var tplRouterUseUrl = '/tpl';
var refererLocalePattern = '/:locale/webapp/';
i18n.l10nRefererRoute(i18nTplRouter, 'tpl-items.html', tplRouterUseUrl, '/items.html', refererLocalePattern);
i18n.l10nRefererRoute(i18nTplRouter, 'tpl-details.html', tplRouterUseUrl, '/details.html', refererLocalePattern);
website.use(tplRouterUseUrl, i18nTplRouter);

// manages 404
website.use(i18n.l10n404('404.html'));

// starts the web aplication server
http.listen(3001, function() {
    console.log('listening on *:3001');
});

/** closes the database and the application */
function byeBye() {
    console.log('the i18n-express demonstration website is shutting down.');
    process.exit();
};

// shuts the application down on low-level errors
process.on('SIGINT', byeBye).on('SIGTERM', byeBye);
