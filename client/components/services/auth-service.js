'use strict';

app.service('authService', ['$cookies', 'apiService', function($cookies, apiService) {

  this.isAuth = function() {
    return new Promise(function(resolve, reject) {
      apiService.verify($cookies.get('auth')).then(function(res){
        if (res.data.error) {
          reject(res.data.error);
        }
        resolve(res.data.authorized);
      })
    })
  }

  this.register = function(email, password, resolve, reject) {
    apiService.register(email, password).then(function(res){
      if (res.data.error) {
        reject(res.data.error);
      } else {
        $cookies.putObject('auth', res.data);
        resolve(res.data);
      }
    })
  }

  this.login = function(email, password, resolve, reject) {
    apiService.authenticate(email, password).then(function(res){
      if (res.data.error) {
        reject(res.data.error);
      } else {
        $cookies.putObject('auth', res.data);
        resolve(res.data);
      }
    })
  }

  this.logout = function(resolve) {
    $cookies.remove('auth');
    resolve();
  }

  this.isLoggedIn = function() {
    var userObject = $cookies.getObject('auth');
    if (userObject) {
      if (userObject.email && userObject.token) {
        return true;
      }
    }
    return false;
  }

  this.getLoggedInUser = function() {
    var userObject = $cookies.getObject('auth');
    if (userObject) {
      return userObject;
    }
    return null;
  }
}]);
