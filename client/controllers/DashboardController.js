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

  $scope.newHologram = {
    name: "",
    price: 100
  }

  $scope.currentSection = 0;
  $scope.currentTitle = $scope.sectionMeta[$scope.currentSection].title;

  $scope.refreshHolograms = function() {
    apiService.getHolograms().then(function(res){
      $scope.holograms = res.data;
    });
  }

  $scope.addHologram = function(name, price) {
    apiService.addHologram(name, price).then(function(res){
      modalService.alert("Hologram Added", name + "'s celebrity hologram has been added successfully with price of " + price);
      $scope.refreshHolograms();
      $scope.newHologram.name = "",
      $scope.newHologram.price = 100
    }, function(err){
      modalService.alert("Hologram Error", "An error occured");
    })
  }

  $scope.deleteHologram = function(id) {
    apiService.deleteHologram(id).then(function(res){
      modalService.alert("Hologram Deleted", name + " has been deleted");
      $scope.refreshHolograms();
    }, function(err){
      modalService.alert("Hologram Error", "An error occured");
    })
  }

  $scope.selectSection = function(id) {
    $scope.currentSection = id;
    $scope.currentTitle = $scope.sectionMeta[$scope.currentSection].title;

    if (id === 0) {

    }
  }

  $scope.refreshHolograms();

}]);