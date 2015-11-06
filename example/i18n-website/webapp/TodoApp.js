'use strict';

// declares the to-do application and requires the dependencies (ui-routing, locale selector directive)
require('angular').module('ToDoApp', [require('ui-router'), require('i18n-express/lib/i18n-express-directives')])
    .config(['$stateProvider', '$urlRouterProvider', function($stateProvider, $urlRouterProvider) {
        $stateProvider
            .state('items', {
                url: '/items',
                views: {
                    'items': {
                        templateUrl: '/tpl/items.html',
                        controller: 'ItemsController as itemsCtrl'
                    }
                }
            })
            .state('items.detail', {
                url: '/:itemId',
                resolve: {
                    item: ['itemsService', '$stateParams', function(itemsService, $stateParams) {
                        // a numeric id is expected by the service but $stateParams holds only string values
                        return itemsService.get(parseFloat($stateParams.itemId));
					}]
                },
                views: {
                    'detail': {
                        templateUrl: '/tpl/details.html',
                        controller: 'ItemDetailsController as detailsCtrl'
                    }
                }
            })
        ;

        $urlRouterProvider.otherwise('/items');
    }])
    .service('itemsService', ['$q', function($q) {
        var items = [
            { id: 0, done: false, label: 'install i18n-express', description : 'this can be done with "npm i -S lucsorel/i18n-express"' },
            { id: 1, done: false, label: 'add 404 route and template' },
            { id: 2, done: false, label: 'localize template and add route for the home page' },
            { id: 3, done: false, label: 'localize templates and add routes for web application' },
            { id: 4, done: false, label: 'please webapp developers!' }
        ];
        var nextId = items.length;

        return {
            // emulates an asynchronous retrieval of the items
            getAll: function() {
                return $q.when(items);
            },

            // emulates an asynchronous retrieval of the item corresponding to the given id
            get: function(itemId) {
                var deferredItem = $q.defer();
                var item = null;
                for (var i = 0; i < items.length; i++) {
                    if (itemId === items[i]['id']) {
                        item = items[i];
                        break;
                    }
                }

                // resolves the promise with the retrieved item or rejects it if the id could not be found
                if (null === item) {
                    deferredItem.reject();
                }
                else {
                    deferredItem.resolve(item);
                }

                return deferredItem.promise;
            },

            // adds the given item to the list
            add: function(item) {
                item.id = nextId++;
                items.push(item);
            }
        }
    }])
    // controller managing the items of the to-do list
    .controller('ItemsController', ['$state', 'itemsService', function($state, itemsService) {
        var viewModel = this;
        itemsService.getAll().then(function(items) {
            viewModel.items = items;
        });

        viewModel.showDetails = function(item) {
            $state.go('items.detail', { itemId: item.id });
        };
    }])
    // controller displaying the details of a given item
    .controller('ItemDetailsController', ['item', function(item) {
        console.log('ItemDetailsController');
        console.log(item);
    }])
;
