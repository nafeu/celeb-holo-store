'use strict';

app.service('modalService', ['$uibModal', function($uibModal) {

    var modalDefaults = {
        backdrop: true,
        keyboard: true,
        modalFade: true,
        templateUrl: 'templates/partials/modal.html'
    };

    var modalOptions = {
        closeButtonText: 'Close',
        actionButtonText: 'OK',
        headerText: 'Proceed?',
        bodyText: 'Perform this action?'
    };

    this.showModal = function (customModalDefaults, customModalOptions) {
        if (!customModalDefaults) customModalDefaults = {};
        customModalDefaults.backdrop = 'static';
        return this.show(customModalDefaults, customModalOptions);
    };

    this.show = function (customModalDefaults, customModalOptions) {
        //Create temp objects to work with since we're in a singleton service
        var tempModalDefaults = {};
        var tempModalOptions = {};

        //Map angular-ui modal custom defaults to modal defaults defined in service
        angular.extend(tempModalDefaults, modalDefaults, customModalDefaults);

        //Map modal.html $scope custom properties to defaults defined in service
        angular.extend(tempModalOptions, modalOptions, customModalOptions);

        if (!tempModalDefaults.controller) {
            tempModalDefaults.controller = function ($scope, $uibModalInstance) {
                $scope.modalOptions = tempModalOptions;
                $scope.modalOptions.ok = function (result) {
                    $uibModalInstance.close(result);
                };
                $scope.modalOptions.close = function (result) {
                    $uibModalInstance.dismiss('cancel');
                };
            };
        }

        return $uibModal.open(tempModalDefaults).result;
    };

    this.alert = function(header, body) {
      this.showModal(
        {
          templateUrl: 'templates/partials/alert.html'
        },
        {
          headerText: header,
          bodyText: body
        }
      ).then(function(result){});
    }

    this.confirm = function(header, body) {
      // Returns a promise for .then(function(result){ ... })
      return this.showModal({}, {
        closeButtonText: 'Cancel',
        actionButtonText: 'Confirm',
        headerText: header,
        bodyText: body
      })
    }

}]);