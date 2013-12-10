angular.module('project', [ 'firebase' ]).value('fbURL',
		'https://bench-rest-webapp.firebaseio.com/').factory('Projects',
		function(angularFireCollection, fbURL) {
			return angularFireCollection(fbURL);
		}).config(function($routeProvider) {
	$routeProvider.when('/', {
		controller : BenchListCtrl,
		templateUrl : 'html/bench/list.html'
	}).when('/edit/:projectId', {
		controller : BenchEditCtrl,
		templateUrl : 'html/bench/detail.html'
	}).when('/new', {
		controller : BenchCreateCtrl,
		templateUrl : 'html/bench/detail.html'
	}).when('/benchtest', {
		controller : BenchEditCtrl,
		templateUrl : 'html/bench/detail.html'
	}).otherwise({
		redirectTo : '/'
	});

});

function BenchListCtrl($scope, Projects) {
	$scope.projects = Projects;
}

function BenchCreateCtrl($scope, $location, $timeout, Projects) {
	$scope.save = function() {
		Projects.add($scope.project, function() {
			$timeout(function() {
				$location.path('/');
			});
		});
	};
}

function BenchEditCtrl($http, $scope, $location, $routeParams, angularFire,
		fbURL) {
	angularFire(fbURL + $routeParams.projectId, $scope, 'remote', {}).then(
			function() {
				$scope.project = angular.copy($scope.remote);
				$scope.project.$id = $routeParams.projectId;
				$scope.remote = angular.copy($scope.project);

				$scope.isClean = function() {
					return angular.equals($scope.remote, $scope.project);
				};
				$scope.destroy = function() {
					$scope.remote = null;
					$location.path('/');
				};
				$scope.benchtest = function() {
					$http.get('/benchtest', {
						params : {
							site : $scope.project.site,
							limit : $scope.project.limit,
							iterations : $scope.project.iterations,
							prealloc : $scope.project.prealloc
						}
					}).success(function(ytdata) {
						$scope.data = ytdata;
						$scope.remote = angular.copy($scope.project);
						console.log($scope.remote.site);
						console.log($scope.data);
						// $location.path('/benchmarktest');
					});
				};

				$scope.save = function() {
					$http.get('/benchtest', {
						params : {
							site : $scope.project.site
						}
					}).success(function(ytdata) {
						$scope.data = ytdata;
						$scope.remote = angular.copy($scope.project);
						console.log($scope.remote.$site);
						$location.path('/');
					});
				};
			});
}
