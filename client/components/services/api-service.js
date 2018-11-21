'use strict';

app.service('apiService', function($http) {
  this.register = function(email, password) {
    return $http.post("api/register", {
      email: email,
      password: password
    });
  }

  this.authenticate = function(email, password) {
    return $http.post("api/authenticate", {
      email: email,
      password: password
    });
  }

  this.verify = function(token) {
    return $http.post("api/verify", {
      token: token
    })
  }

  this.getUserInfo = function(token) {
    return $http.post("api/user/getInfo", {
      token: token
    })
  }

  this.resetPassword = function(token, oldPassword, newPassword) {
    return $http.post("api/reset", {
      token: token,
      oldPassword: oldPassword,
      newPassword: newPassword
    })
  }

  this.sendMagicLink = function(email) {
    return $http.post("api/sendlink", {
      email: email
    })
  }

  this.getUsers = function(token) {
    return $http.post("api/users", {
      token: token
    })
  }

  this.getHolograms = function() {
    return $http.get("api/holograms");
  }
});
