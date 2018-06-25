'use strict';

angular.module('myApp.account', ['ngRoute'])

.controller('AccountController', ['$scope',
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

  console.log("AccountController reporting for duty.");

  $scope.user = authService.getLoggedInUser();
  $scope.userData = {};

  apiService.getUserInfo($scope.user.token).then(function(res){
    $scope.userData = res.data.user;
    console.log($scope.userData);
  })

  $scope.goBack = function() {
    $window.history.back();
  }

}]);