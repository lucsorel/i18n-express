'use strict';

// assertion utility (https://nodejs.org/api/assert.html)
var assert = require('assert');

// tested module
var i18n = require((process.env.APP_DIR_FOR_CODE_COVERAGE || '../../') + 'index.js')();
i18n.options.supportedLocales = ['en', 'fr'];
i18n.options.defaultLocale = i18n.options.supportedLocales[0];

describe('i18n', function() {
	describe('.research', function() {
		it('should replace sophisticated text as pattern', function() {
			var messageKey = '__{join-item-landing%%{{::item.title}}%%{{getMemberName(item.author)}}%%}';
			var originalText = '<p>' + messageKey + '</p>';
			var replacement = 'Vous allez rejoindre la item "<strong>{{::item.title}}</strong>" créée par <em>{{getMemberName(item.author)}';

			function escapePattern(value) {
				return value.replace(/([-()\[\]{}+?*.$\^|,:#<!\\])/g, '\\$1');
			}

			assert.equal('<p>'+replacement+'</p>', originalText.replace(new RegExp(escapePattern(messageKey), 'g'), replacement));
		})
	});

	describe('.options', function() {
		it('should return \'en\' as the default locale', function() {
			assert.equal('en', i18n.options.defaultLocale);
		})
	});

	describe('.l10nRoutes', function() {
		it('should add l10n routes to a router', function() {
			// sets the directory in which i18n should retrieve the test view and language resource
			i18n.options.viewsDirectory = __dirname + '/views'
			// mocks an Express router
			var router = {
				// test property used to cache routing function
				routingCache: {},

				// registers a routing function to a route expression (string or regexp)
				get: function(routeExpression, routingFunction) {
					// caches the function by its regexp string expression
					this.routingCache[routeExpression.toString()] = routingFunction;
				}
			};

			// creates the routes to the /home page, with the home.html templates
			i18n.l10nRoutes(router, 'home.html', '/', ['/home']);
			var routingFunctionKeys = Object.keys(router.routingCache);

			// expects 2 routes: the root redirection one and the l10ned one
			assert.equal(2, routingFunctionKeys.length);
			assert.equal('/^\\/home$/i', routingFunctionKeys[0]);
			assert.equal('/^\\/(?:([\\w]{2}))\\/home$$/i', routingFunctionKeys[1]);

			// the root route should redirect the response to the l10ned route
			var mockedRequest = {
				headers: {
					'accept-language': 'en'
				}
			};
			var mockedResponse = {
				// test property used to cache redirection calls
				redirectionsCache: {},

				// registers a routing function to a route expression (string or regexp)
				redirect: function(httpStatusCode, redirectionRoute) {
					this.redirectionsCache['' + httpStatusCode] = redirectionRoute;
				}
			};
			router.routingCache['/^\\/home$/i'](mockedRequest, mockedResponse);
			assert('/en/home', mockedResponse.redirectionsCache['302']);
		})
	});

	describe('.languagesFromHeader', function() {
		it('should return an empty array of languages if the request is invalid', function() {
			// creates a fake request object with the accept-language header
			var request = null;
			assert.deepEqual([], i18n.languagesFromHeader(request));

			request = {};
			assert.deepEqual([], i18n.languagesFromHeader(request));

			request.headers = {};
			assert.deepEqual([], i18n.languagesFromHeader(request));

			request.headers['accept-language'] = null;
			assert.deepEqual([], i18n.languagesFromHeader(request));

			request.headers['accept-language'] = '';
			assert.deepEqual([], i18n.languagesFromHeader(request));
		});

		it('should parse the headers from a request object', function() {
			// creates a fake request object with the accept-language header
			var request = {
				headers: {
					'accept-language': 'da,en-gb;q=0.8,en;q=0.7'
				}
			};

			var expectedParsedLanguages = [
				{ locale: 'da', country: '*', q: 1 },
				{ locale: 'en', country: 'gb', q: 0.8 },
				{ locale: 'en', country: '*', q: 0.7 }
			];
			assert.deepEqual(expectedParsedLanguages, i18n.languagesFromHeader(request));
		});

	});

	describe('.languageFromReferer', function() {
		// checks that a default locale is set
		assert.equal('en', i18n.options.defaultLocale);

		// defines the regexp friendly pattern used to extract the locale from a referer URL
		var refererLocaleRegExp = /\/([\w]{2})\/item\//;
		it('should return null if the request or the referer header is invalid', function() {
			// null request should yield the default language
			var request = null;
			assert.equal(null, i18n.languageFromReferer(request, refererLocaleRegExp));

			var request = {};
			assert.equal(null, i18n.languageFromReferer(request, refererLocaleRegExp));

			request.headers = {};
			assert.equal(null, i18n.languageFromReferer(request, refererLocaleRegExp));

			request.headers['referer'] = null;
			assert.equal(null, i18n.languageFromReferer(request, refererLocaleRegExp));

			request.headers['referer'] = '';
			assert.equal(null, i18n.languageFromReferer(request, refererLocaleRegExp));
		});

		it('should return null if the referer local regexp is invalid', function() {
			var request = { headers: { referer: 'http://www.i18n-express.com/fr/item/55293af2206f5d540ec87495#/123456' } };
			var invalidRegExp = null;
			assert.equal(null, i18n.languageFromReferer(request, invalidRegExp, 'null regexp'));

			invalidRegExp = {};
			assert.equal(null, i18n.languageFromReferer(request, invalidRegExp, 'empty object regexp'));

			invalidRegExp.exec = 'not a function';
			assert.equal(null, i18n.languageFromReferer(request, invalidRegExp, 'regexp without exec function'));
		});

		it('should return null if no locale could be found in the the referer url', function() {
			var request = { headers: { referer: 'http://www.i18n-express.com/localetoolong/item/55293af2206f5d540ec87495' } };
			assert.equal(null, i18n.languageFromReferer(request, refererLocaleRegExp, 'locale should be 2 characters long'));

			request.headers.referer = 'http://www.i18n-express.com/item/550c6d527a9b64dd0c4237ae#/admin/71ptSs0K';
			assert.equal(null, i18n.languageFromReferer(request, refererLocaleRegExp, 'no locale matching the pattern'));
		});

		it('should return a language with the locale detected from the request referer header', function() {
			var request = { headers: { referer: 'http://localhost:3000/fr/item/55293af2206f5d540ec87495#/join' } };
			var expectedLanguage = { locale: 'fr', country: '*', q: 1 };

			assert.deepEqual(expectedLanguage, i18n.languageFromReferer(request, refererLocaleRegExp));

			request.headers.referer = 'http://www.i18n-express.com/en/item/550c6d527a9b64dd0c4237ae#/admin/71ptSs0K';
			expectedLanguage.locale = 'en';
			assert.deepEqual(expectedLanguage, i18n.languageFromReferer(request, refererLocaleRegExp));
		});
	});
});
