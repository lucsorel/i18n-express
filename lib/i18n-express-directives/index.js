'use strict';

// use browserify to include this directive in your AngularJS 1.x application
// angular and lodash import
var angular = require('angular');
var _ = require('lodash');

var I18nExpressDirectives = angular.module('I18nExpressDirectives', [])
	/**
	 * Directive which allows to switch the locale of a page
	 * - the locale id (ISO 2-letter code) is expected to be the first path element
	 *   of the URL: www.i18n-express.com/{locale id}/...?...#...
	 * - the switch directive reloads the page by just changing the locale id
	 */
	.directive('i18nLocaleSelector', ['$window', '$timeout', '$location', function($window, $timeout, $location) {
		return {
			restrict: 'E',
			replace: false,
			scope: {},
			templateUrl: '/i18n-locale-selector.html',
			link: function(scope, element, attr) {
				// parses the locales details from the locales directive attribute
				scope.locales = angular.fromJson(attr.locales);

				// regexp which captures the url parts that are before and after the current locale id
				var urlLocaleRegExp = /^([^\/]+\/\/[^\/]+\/)([^\/]+)(\/.*)$/;
				var currentLocaleId = $window.location.href.replace(urlLocaleRegExp, '$2');

				// preselects the current locale
				scope.currentLocale = _.find(scope.locales, {id: currentLocaleId});
				scope.currentLocale.current = true

				// redirects the current url with the selected locale id
				scope.select = function(locale) {
					$window.location.href = $window.location.href.replace(urlLocaleRegExp, '$1' + locale.id + '$3');
				};

				// hides the popup by default
				scope.areLocalesVisible = false;

				// delays the show execution call so that the click listener can occur before
				scope.show = function() {
					$timeout(function() {
						scope.areLocalesVisible = true;
					}, 0);
				};

				// hides the popup if the dom is clicked outside of the popup, on the label or on the selected locale
				var documentElement = angular.element($window.document)
				documentElement.on('click', function (e) {
					var eventTargetElement = angular.element(e.target);
					if (scope.areLocalesVisible &&
						((element !== e.target && !element[0].contains(e.target))
							|| eventTargetElement.hasClass('i18n-selected')
							|| eventTargetElement.hasClass('i18n-display'))) {
						scope.$apply(function () {
							scope.areLocalesVisible = false;
						});
					}
			   });

			   // unbinds the click listener when destroying the directive
			   element.bind('$destroy', function() {
				   documentElement.unbind('click');
			   });
			}
		}
	}]);

module.exports = I18nExpressDirectives.name;
