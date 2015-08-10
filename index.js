'use strict';

module.exports = function () {
	// referenced to handle parameterized routes to localize
	var pathToRegExp = require('path-to-regexp');
	var pathToRegExpOptions = { strict: true };
	// file system access to load view templates
	var fs = require('fs');

	// default module options
	var options = {
		// the codes for the locales supported by the web application: ['en', 'jp', 'fr']
		supportedLocales: [],
		// the code of the default locale (one of the supportedLocales items)
		defaultLocale: null,
		// the server directory where the templates and {template}_{locale code}.json i18n resources will be loaded
		viewsDirectory: null
	};

	/* regular expression which extracts languages from the browser's 'accepted languages' header:
	 * - ([\w]{2}) captures the language (in match[1])
	 * - (?:-([\w]{2}))? captures the optional country (in match[2])
	 * - (?:;q=((?:0\.)[\d]))? captures the optional preference level (in match[3])
	 * @see http://www.w3.org/Protocols/rfc2616/rfc2616-sec3.html#sec3.10
	 */
	var languagesRegExp = /([\w]{2})(?:-([\w]{2}))?(?:;q=((?:0\.)[\d]))?/g;

	/** represents a language as modelled in the browser's 'accepted languages' header */
	var Language = function(locale, country, q) {
		this.locale = locale;
		// defaults country to '*' wildcard
		this.country = (typeof country === 'undefined') ? '*' : country;
		// defaults preference to 1
		this.q = (typeof q === 'undefined') ? 1 : parseFloat(q);
	};

	/* regular expression used to escape translation keys when they are replaced in a view template by their content
	 * @see http://closure-library.googlecode.com/git-history/docs/local_closure_goog_string_string.js.source.html#line1021
	 */
	var escapingRegExp = /([-()\[\]{}+?*.$\^|,:#<!\\])/g;

	/** escapes the given value to return a RegExp to be used to replace the given value in a text */
	function asEscapedRegExpPattern(value) {
		return new RegExp(value.replace(escapingRegExp, '\\$1'), 'g');
	}

	/* regular expression which finds a translation pattern in a view:
	 * - match[0] is the value found in the template view. It can be:
	 * -- '__{sENs.iti-ve_Alphanum3r1c}'
	 * -- '__{hello%%{{::discussion.title}}%%{{getMemberName(discussion.author)}}%%}'
	 *
	 * - match[1] is the translation key to be found in the template_locale.json files. It is:
	 * -- 'sENs.iti-ve_Alphanum3r1c'
	 * -- 'hello'
	 *
	 * - match[2] contains the optional parameters to be merged in the value corresponding to the translation key
	 * -- null if no %%parameters%%...%% follow the translation key
	 * -- '{{::discussion.title}}%%{{getMemberName(discussion.author)}}'
	 *    The whole string needs to be split with '%%' to produce the different parameter values because
	 *    js does not support repeated capturing group (the last match only is kept)
	 */
	var l10nPatternRegExp = /__{([\w|\-|\.]+)(?:}|%%((?:(?!%%}).)*)%%})/;

	/** extracts the accepted languages defined in the request headers */
	function languagesFromHeader(request) {
		var languages = [],
			languagesHeader,
			match;
		// extracts the languages from the header
		if (request && (typeof request.headers === 'object') &&
				(typeof (languagesHeader = request.headers['accept-language']) === 'string')) {
			// iterates over the accepted languages
			while ((match = languagesRegExp.exec(languagesHeader)) !== null) {
				languages.push(new Language(match[1], match[2], match[3]));
			}
		}

		return languages;
	}

	/** returns the language from the given request and regexp, which is expected to extract the local in the 1st match group */
	function languageFromReferer(request, refererLocaleRegexp) {
		// returns null if the request's referer header is invalid of if the regexp is undefined
		if (request && request.headers && request.headers.referer && 'string' === typeof request.headers.referer
				&& refererLocaleRegexp && refererLocaleRegexp.exec && 'function' === typeof refererLocaleRegexp.exec) {
			// executes the regexp on the header and returns the 1st group's value
			var matches = refererLocaleRegexp.exec(request.headers.referer);
			if (matches && matches.length > 0) {
				return new Language(matches[1], '*', 1);
			}
		}

		return null;
	}

	/** returns the browser-accepted language that matches best the supported locales, or the default locale */
	function browserBestAcceptedLanguage(request) {
		// retrieves the browser accepted-languages and sorts by best q values
		var browserLanguages = languagesFromHeader(request),
			nbLanguages = browserLanguages.length,
			iLanguage = 0,
			browserLanguage = null,
			acceptedLanguage = null;

		browserLanguages.sort(function(languageA, languageB) {
			return languageB.q - languageA.q;
		});

		// iterates over the languages until a supported one is found
		while(acceptedLanguage === null && iLanguage < nbLanguages) {
			browserLanguage = browserLanguages[iLanguage];
			if (options.supportedLocales.indexOf(browserLanguage.locale) > -1) {
				acceptedLanguage = browserLanguage;
			}

			iLanguage++;
		}

		// falls back to the default locale
		if (acceptedLanguage === null) {
			acceptedLanguage = new Language(options.defaultLocale, null, 0.1);
		}

		return acceptedLanguage;
	}

	/** localizes the template content with the translation resources */
	function t9nContent(templateContent, t9ns, strippedRouterUseUrl, canonicalL10edRoute, locale, response, status) {
		// merges the locale in the template view
		templateContent = templateContent.replace(/__{locale}/g, locale);
		// merges the relative canonical url
		templateContent = templateContent.replace(/__{canonicalUrl}/g, strippedRouterUseUrl + canonicalL10edRoute);

		// iterates over the merge patterns
		var t9nPatternMatches, t9nPattern, t9nKey, t9n, hasParameters;
		while (l10nPatternRegExp.test(templateContent)) {
			t9nPatternMatches = l10nPatternRegExp.exec(templateContent);
			t9nPattern = t9nPatternMatches[0];
			t9nKey = t9nPatternMatches[1];
			hasParameters = 'undefined' !== typeof t9nPatternMatches[2];

			// retrieves the translation from the resources
			if (t9ns.hasOwnProperty(t9nKey)) {
				t9n = t9ns[t9nKey];

				// merges the parameters if any
				if (hasParameters) {
					// iterates over the parameter values to merge them in the translation
					var parameters = t9nPatternMatches[2].split('%%');
					for (var parameterIndex = 0; parameterIndex < parameters.length; parameterIndex++) {
						// in translated messages, parameters are expected as '__{1}' or '__{i:any comment}' with starting from 1 to parameters.length
						t9n = t9n.replace(new RegExp('__\\{' + (parameterIndex + 1) + '(?::[^\\}]*)?\\}','g'), parameters[parameterIndex]);
					}
				}
			}
			// error replacement otherwise
			else {
				t9n = '???' + t9nKey + '???';
			}

			// replaces all occurences of the translation pattern
			templateContent = templateContent.replace(asEscapedRegExpPattern(t9nPattern), t9n);
		}

		// returns the templateContent
		status = status || 200;
		response.status(status).send(templateContent);
	}

	/** localizes the route content and returns it in the response */
	var readAccessOptions = { encoding: 'UTF-8', flag: 'r' };
	function l10nContent(template, strippedRouterUseUrl, canonicalL10edRoute, locale, response, status) {
		// retrieves the template
		var templatePath = options.viewsDirectory + '/' + template;
		fs.readFile(templatePath, readAccessOptions, function (error, templateContent) {
			if (error) {
				var message = 'cannot read template file ' + templatePath + ': ' + error;
				response.status(500).send(message);
			}

			// retrieves the translations
			var t9nsPath = options.viewsDirectory + '/' + template + '_' + locale + '.json';
			// TODO require(file) in production, read file each time in development
			//var t9ns = require(t9nsPath);
			fs.readFile(t9nsPath, readAccessOptions, function (error, t9ns) {
				if (error) {
					var message = 'cannot read translations resource file ' + t9nsPath + ': ' + error;
					response.status(500).send(message);
				}

				// translates the template
				t9nContent(templateContent, JSON.parse(t9ns.trim()), strippedRouterUseUrl, canonicalL10edRoute, locale, response, status);
			});
		});
	}

	/** registers a template and a canonical route pattern to a router and returns a route suffix registration function */
	function templatedRouter(router, template, routerUseUrl, canonicalRoute) {
		// the router use URL stripped of its last '/', for concatenation purposes
		var strippedRouterUseUrl = routerUseUrl.replace(/\/$/, '');
		var canonicalL10edRouteKeys = [];
		var canonicalL10edRouteRegExp = pathToRegExp('/:anyLocale([\\w]{2})' + canonicalRoute, canonicalL10edRouteKeys, pathToRegExpOptions);

		return function(routeSuffix) {
			var routeKeys = [];
			var routeRegExp = pathToRegExp(canonicalRoute + routeSuffix, routeKeys, pathToRegExpOptions);
			// redirects the 'raw' route to its best l10n version
			router.get(routeRegExp, function(request, response) {
				var locale = browserBestAcceptedLanguage(request).locale;
				// easy redirection to the canonical route if it involves no path variable
				if (0 === routeKeys.length) {
					response.redirect(302, strippedRouterUseUrl + '/' + locale + canonicalRoute);
				}
				else {
					var matches = routeRegExp.exec(request.originalUrl.replace(request.baseUrl, ''));
					// iterates over the keys of the canonical route to build the canonical route
					var redirectionRoute = canonicalRoute;
					for (var keyIndex = 0; keyIndex < routeKeys.length; keyIndex++) {
						redirectionRoute = redirectionRoute.replace(':' + routeKeys[keyIndex].name, matches[1 + keyIndex]);
					}

					response.redirect(302, strippedRouterUseUrl + '/' + locale + redirectionRoute);
				}
			});

			// localizes the template with the route's locale or the best supported locale
			var l10nRouteKeys = [];
			var l10nRouteRegExp = pathToRegExp('/:anyLocale([\\w]{2})' + canonicalRoute + routeSuffix + '$', l10nRouteKeys, pathToRegExpOptions);
			router.get(l10nRouteRegExp, function(request, response) {
				// retrieves the request URL inside the router
				var requestRouterUrl = request.originalUrl.replace(request.baseUrl, '');

				// displays the localized page if the locale is managed
				var locale = request.params[0];
				var isLocaleSupported = options.supportedLocales.indexOf(locale) > -1;

				// displays the localized canonical route
				if (canonicalL10edRouteRegExp.test(requestRouterUrl)) {
					if (isLocaleSupported) {
						l10nContent(template, strippedRouterUseUrl, requestRouterUrl, locale, response);
					}
					// redirects to the best default locale page otherwise
					else {
						response.redirect(302, strippedRouterUseUrl + '/' + browserBestAcceptedLanguage(request).locale
							+ requestRouterUrl.substring(3, requestRouterUrl.length));
					}
				}
				// or redirects to the localized canonical route
				else {
					// easy redirection of the canonical route contains no path variable
					if (canonicalL10edRouteKeys.length < 2) {
						response.redirect(301, strippedRouterUseUrl + '/' + (isLocaleSupported ? locale : browserBestAcceptedLanguage(request).locale)
							+ canonicalRoute);
					}
					// computes the canonical URL redirection otherwise
					else {
						var matches = l10nRouteRegExp.exec(requestRouterUrl);
						// iterates over the keys of the canonical route to build the canonical route (skips the 1st key which is the locale)
						var redirectionRoute = '/' + (isLocaleSupported ? locale : browserBestAcceptedLanguage(request).locale) + canonicalRoute;
						for (var keyIndex = 1; keyIndex < l10nRouteKeys.length; keyIndex++) {
							redirectionRoute = redirectionRoute.replace(':' + l10nRouteKeys[keyIndex].name, matches[1 + keyIndex]);
						}

						response.redirect(302, strippedRouterUseUrl + redirectionRoute);
					}
				}
			});
		}
	}

	/** l10zes and serves the template content to the canonical route, which can be appended by suffixes redirecting to the canonical route */
	function l10nRoutes(router, template, routerUseUrl, canonicalRoute, routeSuffixes) {
		// creates a route registration function which binds the canonical route and the content template
		var registerRoute = templatedRouter(router, template, routerUseUrl, canonicalRoute);
		// enables the canonical route if the suffixes array is undefined or if it does not contain the empty string element
		if ('undefined' === typeof routeSuffixes || !routeSuffixes.hasOwnProperty('length')) {
			routeSuffixes = [''];
		}
		else if (routeSuffixes.indexOf('') < 0) {
			routeSuffixes.unshift('');
		}

		// registers the route suffixes with the templated router function
		for (var routeIndex = 0; routeIndex < routeSuffixes.length; routeIndex++) {
			registerRoute(routeSuffixes[routeIndex]);
		}

		return router;
	}

	/** l10zes the template with the locale found in the referer url with the given pattern */
	function l10nRefererRoute(router, template, routerUseUrl, route, refererLocalePattern) {
		// checks that a regexp can be build from the given parameter
		if (!refererLocalePattern || 'string' !== typeof refererLocalePattern || refererLocalePattern.indexOf(':locale') < 0) {
			throw new Error('refererLocalePattern must be a string containing ":locale" defining where the locale will be extracted from the referer URL');
		}

		// builds the regexp which extracts the locale from the referer url
		var refererLocaleRegExp = new RegExp(refererLocalePattern.replace(':locale', '([\\w]{2})'));
		router.get(route, function(request, response) {
			// uses the locale from the request's referer URL or the best supported locale accepted by the browser
			var refererLanguage = languageFromReferer(request, refererLocaleRegExp) || browserBestAcceptedLanguage(request);
			l10nContent(template, routerUseUrl, route, refererLanguage.locale, response);
		});
	}

	/** i18n manager for 404 pages (detects the local from the request accepted-languages header) */
	function l10n404(template) {
		return function(request, response, next) {
			l10nContent(template, '/', request.originalUrl, browserBestAcceptedLanguage(request).locale, response, 404);
		}
	}

	// returns the internationalization service
	return {
		options: options,

		languagesFromHeader:languagesFromHeader,

		languageFromReferer:languageFromReferer,

		// routing function to register i18n public pages
		l10nRoutes: l10nRoutes,

		// routing function to register i18n text resources (ex: ajax templates)
		l10nRefererRoute: l10nRefererRoute,

		// registers the 404 page
		l10n404: l10n404
	};
};