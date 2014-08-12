/*
 * ng-tasty
 * https://github.com/Zizzamia/ng-tasty

 * Version: 0.2.3 - 2014-08-11
 * License: MIT
 */
angular.module("ngTasty", ["ngTasty.tpls", "ngTasty.filter","ngTasty.service","ngTasty.table"]);
angular.module("ngTasty.tpls", ["template/table/head.html","template/table/pagination.html"]);
/**
 * @ngdoc 
 * @name 
 *
 */
angular.module('ngTasty.filter', [
  'ngTasty.filter.cleanFieldName',
  'ngTasty.filter.range'
]);

/**
 * @ngdoc filter
 * @name cleanFieldName
 *
 * @description
 * Calling toString will return the ...
 *
 * @example
  ng-bind="key | cleanFieldName"
 *
 */
angular.module('ngTasty.filter.cleanFieldName', [])
.filter('cleanFieldName', function() {
  return function (input) {
    return input.replace(/[^a-zA-Z0-9-]+/g, '-').toLowerCase();
  };
});

/**
 * @ngdoc range
 * @name toDateString
 *
 * @description
 * Calling range will return ...
 * I got ispiration of the code from this page
 * http://stackoverflow.com/questions/8273047/javascript-function-similar-to-python-range
 *
 * @example
  ng-repeat="n in [] | range:1:30"
 *
 */
angular.module('ngTasty.filter.range', [])
.filter('range', function() {
  return function(start, stop, step) {
    var list;
    list = [];
    if (typeof stop === 'undefined'){
      stop = start;
      start = 0;
    }
    if (typeof step === 'undefined'){
      step = 1;
    }
    if ((step > 0 && start >= stop) || (step < 0 && start <= stop)){
      return [];
    }
    for (var i = start; step > 0 ? i < stop : i > stop; i += step){
      list.push(i);
    }
    return list;
  };
});

/**
 * @ngdoc 
 * @name 
 *
 */
angular.module('ngTasty.service', [
  'ngTasty.service.debounce',
  'ngTasty.service.setProperty',
  'ngTasty.service.joinObjects'
]);

/**
 * @ngdoc 
 * @name 
 *
 */
angular.module('ngTasty.service.debounce', [])
.factory('debounce', [
  '$timeout',
  function($timeout) {
    return function(func, wait, immediate) {
      var timeout;
      return function() {
        var context = this, args = arguments;
        $timeout.cancel(timeout);
        timeout = $timeout(function() {
          timeout = null;
          func.apply(context, args);
        }, wait);
      };
    }
  }
]);

/**
 * @ngdoc 
 * @name 
 *
 */
angular.module('ngTasty.service.setProperty', [])
.factory('setProperty', function() {
  return function(objOne, objTwo, attrname) {
    if (angular.isDefined(objTwo[attrname])) {
      objOne[attrname] = objTwo[attrname];
    }
    return objOne;
  }
});

/**
 * @ngdoc 
 * @name 
 *
 */
angular.module('ngTasty.service.joinObjects', [])
.factory('joinObjects', [
  'setProperty',
  function(setProperty) {
    return function(objOne, objTwo) {
      for (var attrname in objTwo) {
        setProperty(objOne, objTwo, attrname);
      }
      return objOne;
    };
  }
]);

/**
 * @ngdoc directive
 * @name tastyTable
 *
 * @example
  <table tasty-table>
    <tbody></tbody>
  </table>
 *
 */
angular.module('ngTasty.table', [
  'ngTasty.filter.cleanFieldName',
  'ngTasty.filter.range',
  'ngTasty.service.debounce',
  'ngTasty.service.setProperty',
  'ngTasty.service.joinObjects'
])
.constant('tableConfig', {
  query: {
    'page': 'page',
    'count': 'count',
    'sortBy': 'sort-by',
    'sortOrder': 'sort-order',
  },
  resource: undefined
})
.controller('TableController', [
  '$scope', 
  '$attrs',
  'tableConfig',
  'debounce',
  'setProperty',
  'joinObjects',
  function($scope, $attrs, tableConfig, debounce, setProperty, joinObjects) {
    'use strict';
    this.$scope = $scope;

    // Default configs
    $scope.query = tableConfig.query;
    $scope.resource = tableConfig.resource;

    // Set custom configs
    if (angular.isDefined($attrs.query)) {
      $scope.query = $scope.$parent.$eval($attrs.query);
    }
    if (!angular.isDefined($attrs.resource)) {
      throw 'AngularJS tastyTable directive: miss the resource attribute';
    } else {
      $scope.resource = $scope.$parent.$eval($attrs.resource);
      if (!$scope.resource) {
        throw 'AngularJS tastyTable directive: the resource ('+
            $attrs.resource + ') callback it\'s undefined';
      }
    }

    $scope.url = '';
    $scope.header = {
      'columns': []
    };
    $scope.rows = [];
    $scope.params = {};
    $scope.pagination = {};
    $scope.theadDirective = false;
    $scope.paginationDirective = false;

    // In TableController, by using `this` we build an API 
    // for other directives to talk to this one.
    this.activate = function(directiveName) {
      $scope[directiveName + 'Directive'] = true;
      $scope.params[directiveName] = true;
    };

    this.setParams = function(key, value) {
      $scope.params[key] = value;
    };

    $scope.setDirectivesValues = function (resource) {
      if (!resource) {
        return false;
      }
      $scope.rows = resource.rows;
      $scope.header = {
        'columns': resource.header,
        'sortBy': resource.sortBy,
        'sortOrder': resource.sortOrder
      };
      $scope.pagination = resource.pagination;
    };

    $scope.buildUrl = function(params, filters) {
      var urlQuery, value, url;
      urlQuery = {};
      if ($scope.theadDirective) {
        urlQuery = setProperty(urlQuery, params, 'sortBy');
        urlQuery = setProperty(urlQuery, params, 'sortOrder');
      }
      if ($scope.paginationDirective) {
        urlQuery = setProperty(urlQuery, params, 'page');
        urlQuery = setProperty(urlQuery, params, 'count');
      }
      if ($attrs.filters) {
        urlQuery = joinObjects(urlQuery, filters);
      }
      return Object.keys(urlQuery).map(function(key) {
        value = urlQuery[key];
        if ($scope.query[key]) {
          key = $scope.query[key];
        }
        return encodeURIComponent(key) + '=' + encodeURIComponent(value);
      }).join('&');
    };

    $scope.updateResource = debounce(function() {
      $scope.url = $scope.buildUrl($scope.params, $scope[$attrs.filters]);
      $scope[$attrs.resource]($scope.url).then(function (resource) {
        $scope.setDirectivesValues(resource);
      });
    }, 100);

    $scope.initDirective = function () {
      $scope.params['sortBy'] = undefined;
      $scope.params['sortOrder'] = 'asc';
      $scope.params['page'] = 1;
      $scope.params['count'] = 5;
      $scope.updateResource();
    };
    
    // AngularJs $watch callbacks
    if ($attrs.filters) {
      $scope.$watch($attrs.filters, function (newValue, oldValue){
        if (newValue !== oldValue) {
          $scope.updateResource();
        }
      }, true);
    }
    $scope.$watch('params', function (newValue, oldValue){
      if (newValue !== oldValue) {
        $scope.updateResource();
      }
    }, true);
    $scope.initDirective();
  }
])
.directive('tastyTable', function(){
  return {
    restrict: 'A',
    scope: true,
    controller: 'TableController'
  };
})

/**
 * @ngdoc directive
 * @name tastyThead
 *
 * @example
  <table tasty-table>
    <thead table-head></thead>
    <tbody></tbody>
  </table>
 *
 */
.directive('tastyThead', [
  '$filter',
  function($filter) {
    return {
      restrict: 'AE',
      require: '^tastyTable',
      scope: {
        'notSortBy': '='
      },
      templateUrl: 'template/table/head.html',
      link: function (scope, element, attrs, tastyTable) {
        'use strict';
        var setFields;

        // Thead it's called
        tastyTable.activate('thead');

        scope.fields = {};

        setFields = function () {
          var lenHeader, i;
          lenHeader = scope.header.columns.length;
          for (i = 0; i < lenHeader; i++) {
            scope.fields[scope.header.columns[i].key] = {
              'width': parseFloat((100 / lenHeader).toFixed(2)),
              'sort': $filter('cleanFieldName')(scope.header.columns[i].key)
            };
          }
          if (scope.header.sortOrder === 'dsc') {
            scope.header.sortBy = '-' + scope.header.sortBy;
          }
        };

        scope.sortBy = function (field) {
          if (scope.notSortBy && scope.notSortBy.indexOf(field.key) >= 0) {
            return false;
          }
          var fieldName;
          fieldName = $filter('cleanFieldName')(field.key);
          if (scope.header.sortBy == fieldName) {
            scope.header.sortBy = '-' + fieldName;
            tastyTable.setParams('sortOrder', 'dsc');
          } else {
            scope.header.sortBy = fieldName;
            tastyTable.setParams('sortOrder', 'asc');
          }
          tastyTable.setParams('sortBy', field.key);
        };

        scope.isSortUp = function(field) {
          if (scope.fields[field.key] === undefined) {
            return false;
          }
          return scope.header.sortBy == '-' + scope.fields[field.key].sort;
        };

        scope.isSortDown = function(field) {
          if (scope.fields[field.key] === undefined) {
            return false;
          }
          return scope.header.sortBy == scope.fields[field.key].sort;
        };

        tastyTable.$scope.$watch('header', function (newValue, oldValue){
          if (newValue && (newValue !== oldValue)) {
            scope.header = newValue;
            setFields();
          }
        });
      }
    };
  }
])

/**
 * @ngdoc directive
 * @name tastyPagination
 *
 * @example
  <div tasty-table>
    <table>
     ...
    </table>
    <div table-pagination></div>
  </div>
 *
 */
.directive('tastyPagination', [
  '$filter',
  function($filter) {
    return {
      restrict: 'AE',
      require: '^tastyTable',
      scope: {},
      templateUrl: 'template/table/pagination.html',
      link: function (scope, element, attrs, tastyTable) {
        'use strict';
        var getPage, setCount, setPaginationRange,
            setPreviousRange, setRemainingRange,
            setPaginationRanges;

        // Pagination it's called
        tastyTable.activate('pagination');

        /* In the future you will have a way to change
         * these values by an isolate optional scope variable,
         * more info here https://github.com/angular/angular.js/issues/6404 */
        scope.numPaginations = 5;
        scope.pagListCount = [5, 25, 50, 100];

        // Internal variable
        scope.pagination = {};
        scope.pagMinRange = 1;
        scope.pagMaxRange = 1;

        getPage = function (numPage) {
          tastyTable.setParams('page', numPage);
        };

        setCount = function(count) {
          var maxItems, page;
          maxItems = count * scope.pagination.page;
          if (maxItems > scope.pagination.size) {
            page = Math.ceil(scope.pagination.size / count);
            tastyTable.setParams('page', page);
          }
          tastyTable.setParams('count', count);
        };

        setPaginationRange = function () {
          var currentPage, totalPages;
          currentPage = scope.pagination.page;
          if (currentPage > scope.pagination.pages) {
            currentPage = scope.pagination.pages;
          }
          scope.pagMinRange = (currentPage - 2) > 0 ? (currentPage - 2) : 1;
          scope.pagMaxRange = (currentPage + 2);
          scope.pagination.page  = currentPage;
          setPaginationRanges();
        };

        setPreviousRange = function () {
          if (scope.pagHideMinRange === true || scope.pagMinRange < 1) {
            return false;
          }
          scope.pagMaxRange = scope.pagMinRange;
          scope.pagMinRange = scope.pagMaxRange - scope.numPaginations;
          setPaginationRanges();
        };

        setRemainingRange = function () {
          if (scope.pagHideMaxRange === true || scope.pagMaxRange > scope.pagination.pages) {
            return false;
          }
          scope.pagMinRange = scope.pagMaxRange;
          scope.pagMaxRange = scope.pagMinRange + scope.numPaginations;
          if (scope.pagMaxRange > scope.pagination.pages) {
            scope.pagMaxRange = scope.pagination.pages;
          }
          scope.pagMinRange = scope.pagMaxRange - scope.numPaginations;
          setPaginationRanges();
        };

        setPaginationRanges =  function () {
          scope.pagMinRange = scope.pagMinRange > 0 ? scope.pagMinRange : 1;
          scope.pagMaxRange = scope.pagMinRange + scope.numPaginations;
          if (scope.pagMaxRange > scope.pagination.pages) {
            scope.pagMaxRange = scope.pagination.pages + 1;
          }
          scope.pagHideMinRange = scope.pagMinRange <= 1;
          scope.pagHideMaxRange = scope.pagMaxRange >= scope.pagination.pages;
          if (scope.pagination.size < 50) {
            scope.pagListCount = [5, 25];
          } else if (scope.pagination.size < 100) {
            scope.pagListCount = [5, 25, 50];
          } else {
            scope.pagListCount = [5, 25, 50, 100];
          }
          scope.rangePage = $filter('range')(scope.pagMinRange, scope.pagMaxRange);
        };

        scope.page = {
          'get': getPage,
          'setCount': setCount,
          'previous': setPreviousRange,
          'remaining': setRemainingRange
        };

        tastyTable.$scope.$watch('pagination', function (newValue, oldValue){
          if (newValue && (newValue !== oldValue)) {
            scope.pagination = newValue;
            setPaginationRange();
          }
        });
      }
    };
  }
]);
angular.module('template/table/head.html', []).run(['$templateCache', function($templateCache) {
  $templateCache.put('template/table/head.html',
    '<tr>\n' +
    '  <th ng-repeat="column in header.columns" \n' +
    '  ng-class="{active: column.key == header.sortBy}"\n' +
    '  ng-click="sortBy(column)">\n' +
    '    <span ng-bind="column.name"></span>\n' +
    '    <span ng-if="isSortUp(column)" class="fa fa-sort-up"></span>\n' +
    '    <span ng-if="isSortDown(column)" class="fa fa-sort-down"></span>\n' +
    '  </th> \n' +
    '</tr>');
}]);

angular.module('template/table/pagination.html', []).run(['$templateCache', function($templateCache) {
  $templateCache.put('template/table/pagination.html',
    '<div class="row">\n' +
    '  <div class="col-md-3 text-left">\n' +
    '    <div class="btn-group">\n' +
    '      <button type="button" class="btn btn-default" \n' +
    '      ng-repeat="count in pagListCount" \n' +
    '      ng-class="{active: count == pagination.count}" \n' +
    '      ng-click="page.setCount(count)" ng-bind="count"></button>\n' +
    '    </div>\n' +
    '  </div>\n' +
    '  <div class="col-md-6 text-center">\n' +
    '    <ul class="pagination">\n' +
    '      <li ng-class="{disabled: pagHideMinRange }">\n' +
    '        <span ng-click="page.previous()">&laquo;</span>\n' +
    '      </li>\n' +
    '      <li ng-repeat="numPage in rangePage" ng-class="{active: numPage == pagination.page}">\n' +
    '        <span ng-click="page.get(numPage)">\n' +
    '          <span ng-bind="numPage"></span>\n' +
    '          <span class="sr-only" ng-if="numPage == pagination.page">(current)</span>\n' +
    '        </span>\n' +
    '      </li>\n' +
    '      <li ng-class="{disabled: pagHideMaxRange }">\n' +
    '        <span ng-click="page.remaining()">&raquo;</span>\n' +
    '      </li>\n' +
    '    </ul>\n' +
    '  </div>\n' +
    '  <div class="col-md-3 text-right">\n' +
    '    <p>Page <span ng-bind="pagination.page"></span> \n' +
    '    of <span ng-bind="pagination.pages"></span>,\n' +
    '    of <span ng-bind="pagination.size"></span> entries</p>\n' +
    '  </div>\n' +
    '</div>');
}]);
