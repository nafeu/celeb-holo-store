'use strict';

angular.module('myApp.dashboard', ['ngRoute'])

.controller('DashboardController', ['$scope',
                               '$window',
                               '$timeout',
                               'apiService',
                               'authService',
                               'modalService',
                               'storageService',
                               function($scope,
                                        $window,
                                        $timeout,
                                        apiService,
                                        authService,
                                        modalService,
                                        storageService)
{

  console.log("DashboardController reporting for duty.");


  $scope.sectionMeta = [
    {
      id: 0,
      title: "Store",
    },
    {
      id: 1,
      title: "Purchases",
    }
  ]

  $scope.user = authService.getLoggedInUser();
  $scope.holograms = [];

  apiService.getHolograms().then(function(res){
    $scope.holograms = res.data;
  });

  $scope.currentSection = 0;
  $scope.currentTitle = $scope.sectionMeta[$scope.currentSection].title;

  $scope.selectSection = function(id) {
    $scope.currentSection = id;
    $scope.currentTitle = $scope.sectionMeta[$scope.currentSection].title;

    if (id === 0) {

    }
  }


}]);