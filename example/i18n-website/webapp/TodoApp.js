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
            { id: 0, done: true, label: 'install i18n-express', description : 'this can be done with "npm i -S lucsorel/i18n-express"' },
            { id: 1, done: true, label: 'add 404 route and template' },
            { id: 2, done: true, label: 'localize home page' },
            { id: 3, done: true, label: 'localize web app templates' },
            { id: 4, done: false, label: 'promote my internationalized website!' }
        ];
        var nextId = items.length;

        return {
            // emulates an asynchronous retrieval of the items
            getAll: function() {
                return $q.when(items);
            },

            // flags whether the details of an item are being displayed
            display: {details: false},

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
            },

            // asynchronously deletes the item
            delete: function(item) {
                var deferredDeletion = $q.defer();
                var itemIndex = items.indexOf(item);
                if (itemIndex < 0) {
                    deferredDeletion.reject('invalid item');
                }
                else {
                    items.splice(itemIndex, 1);
                    deferredDeletion.resolve();
                }

                return deferredDeletion.promise;
            }
        }
    }])
    // controller managing the items of the to-do list
    .controller('ItemsController', ['$state', 'itemsService', function($state, itemsService) {
        var viewModel = this;

        // retrieves the items asynchronously
        itemsService.getAll().then(function(items) {
            viewModel.items = items;
        });

        viewModel.newItem = {};

        viewModel.addItem = function() {
            itemsService.add(viewModel.newItem);
            viewModel.newItem = {};
            return true;
        }

        viewModel.display = itemsService.display;

        viewModel.showDetails = function(item) {
            $state.go('items.detail', { itemId: item.id });
        };
    }])
    // controller displaying the details of a given item
    .controller('ItemDetailsController', ['$scope', '$state', 'item', 'itemsService', function($scope, $state, item, itemsService) {
        var viewModel = this;
        viewModel.item = item;

        // flags that an item is being displayed
        itemsService.display.details = true;

        // deletes the item then returns to the list
        viewModel.delete = function() {
            itemsService.delete(viewModel.item).then(function() {
                $state.go('items');
            });
        };

        // flags that the view is being hidden
        $scope.$on('$destroy', function() {
            itemsService.display.details = false;
        });
    }])
;
