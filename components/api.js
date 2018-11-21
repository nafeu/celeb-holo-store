const express = require('express');
const api = express.Router();
const mongoose = require('mongoose');
const mongodb = require('mongodb');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const _ = require('lodash');
const nodemailer = require('nodemailer');

const MONGODB_URI = require('../config').MONGODB_URI || process.env.MONGODB_URI;
const SECRET = require('../config').SECRET || process.env.SECRET;
const ADMIN_SEED = require('../config').ADMIN_SEED || process.env.ADMIN_SEED;
const SMTP_SERVICE = require('../config').SMTP_SERVICE || process.env.SMTP_SERVICE;
const SMTP_HOST = require('../config').SMTP_HOST || process.env.SMTP_HOST;
const SMTP_PORT = require('../config').SMTP_PORT || process.env.SMTP_PORT;
const SMTP_USER = require('../config').SMTP_USER || process.env.SMTP_USER;
const SMTP_PASS = require('../config').SMTP_PASS || process.env.SMTP_PASS;
const ALL_ROLES = ['admin', 'customer'];

const hologramSeed = require('../data/hologramSeed')
const User = require('../models/user');
const Hologram = require('../models/hologram');

mongoose.connect(MONGODB_URI);
db = mongoose.connection;
db.on('error', console.error.bind(console, 'MongoDB connection error:'));

// Seed Administrator Account
const adminCredentials = ADMIN_SEED.split("/");
User.find({email: adminCredentials[0]}, function(err, docs) {
  if (docs.length) {
    // Administrator account is active
  } else {
    console.log('[ api.js - Seeding administrator account ]');
    bcrypt.hash(adminCredentials[1], 10, function(err, hash){
      const newAdmin = User({
        email: adminCredentials[0],
        hash: hash,
        role: 'admin',
        emailVerified: true
      });
      newAdmin.save(function(err){
        if (err) {
          console.log(`[ api.js - ${err} ]`);
        } else {
          console.log('[ api.js - Administrator account created successfully ]');
        }
      })
    })
  }
})

// Seed Store Data
Hologram.count(function(err, count){
  if (!err && count === 0) {
    console.log('[ api.js - Seeding hologram collection ]')
    try {
       Hologram.insertMany(hologramSeed);
    } catch (e) {
       console.log(e);
    }
  }
});

// Configure Nodemailer Transporter
let transporter = nodemailer.createTransport({
  service: SMTP_SERVICE,
  auth: {
    user: SMTP_USER,
    pass: SMTP_PASS
  }
});

api.use((req, res, next) => {
  const time = new Date().toTimeString();
  const {method, url} = req;
  const {statusCode} = res;

  console.log(`[ api.js - ${statusCode} ] ${method} ${url} : ${time}`);
  next();
})

api.get('/test', (req, res) => {
  res.status(200).send('OK');
})

api.post('/register', (req, res) => {
  if (req.body.password.length < 8) {
    res.json({
      error: "Password too short (minimum 8 characters)."
    })
  } else {
    bcrypt.hash(req.body.password, 10, function(err, hash) {
      User.find({email: req.body.email}, function(err, docs){
        if (docs.length) {
          res.json({
            error: "Email address is already in use."
          })
        } else {
          const newUser = User({
            email: req.body.email,
            hash: hash
          })
          newUser.save(function(err){
            if (err) {
              res.json({
                error: err
              })
            } else {
              generateMagicLink(newUser.email).then(function(magicLink) {
                // setup email data with unicode symbols
                let mailOptions = {
                  from: '"Celebrity Hologram Store" <noreply@chstore.com>', // sender address
                  to: newUser.email, // list of receivers
                  subject: 'Verify Email', // Subject line
                  text: 'Click the following link to verify your email: ' + magicLink, // plain text body
                  html: '<b>Click the following link to verify your email: <a href="' + magicLink + '">' + magicLink + '</a></b>' // html body
                };

                // send mail with defined transport object
                transporter.sendMail(mailOptions, (error, info) => {
                  if (error) {
                    res.json({
                      error: error
                    })
                  }
                  console.log('[ api.js - Message sent: %s ]', info.messageId);
                  console.log('[ api.js - Preview URL: %s ]', nodemailer.getTestMessageUrl(info));

                  res.json({
                    email: newUser.email
                  })
                });
              }, function(err) {
                res.json({
                  error: "Error creating magic link."
                })
              });
            }
          })
        }
      })
    });
  }
})

api.post('/authenticate', (req, res) => {
  User.findOne({email: req.body.email}, function(err, result){
    if (err) {
      res.json({
        error: "Database error."
      });
    } else {
      if (result) {
        bcrypt.compare(req.body.password, result.hash, function(err, matched){
          if (matched) {
            if (!result.active) {
              res.json({
                error: "Account has been deactivated."
              });
            }
            else if (!result.emailVerified) {
              res.json({
                error: "Email address has not yet been verified."
              });
            } else {
              res.json({
                email: result.email,
                role: result.role,
                token: jwt.sign({ id: result._id }, SECRET)
              });
            }
          } else {
            res.json({
              error: "Invalid password."
            });
          }
        })
      } else {
        res.json({
          error: "Account does not exist."
        });
      }
    }
  })
})

api.post('/verify', (req, res) => {
  jwt.verify(req.body.token, SECRET, function(err, decoded) {
    if (err) {
      res.json({
        error: "Invalid token."
      });
    } else {
      User.findById(decoded.id, function(err, user){
        if (err) {
          res.json({
            error: "Invalid token, no user."
          });
        } else if (!user.active) {
          res.json({
            error: "Account has been deactivated."
          })
        } else if (!user.emailVerified && !decoded.hasOwnProperty('verify')) {
          res.json({
            error: "Email address has not yet been verified."
          })
        } else {
          if (decoded.verify) {
            user.emailVerified = true;
            user.save(function(err){
              if (err) {
                res.json({
                  error: "Database error."
                });
              } else {
                res.json({
                  email: user.email,
                  role: user.role,
                  token: jwt.sign({ id: user._id }, SECRET)
                });
              }
            })
          } else {
            res.json({authorized: true});
          }
        }
      });
    }
  });
})

api.post('/reset', (req, res) => {
  isAuth(req.body.token, ALL_ROLES).then(function(user){
    bcrypt.compare(req.body.oldPassword, user.hash, function(err, matched){
      if (matched) {
        bcrypt.hash(req.body.newPassword, 10, function(err, hash){
          user.hash = hash;
          user.save(function(err){
            if (err) {
              res.json({
                error: "Database error."
              });
            } else {
              res.json({
                email: user.email,
                token: jwt.sign({ id: user._id }, SECRET)
              });
            }
          })
        })
      } else {
        res.json({
          error: "Invalid password."
        });
      }
    })
  }, function(err){
    res.json({
      error: err
    });
  })
})

api.post('/sendlink', (req, res) => {
  User.find({email: req.body.email}, function(err, docs){
    if (docs.length) {
      console.log("[ api.js - Sending a magic link to: " + req.body.email + " ]")

      generateMagicLink(req.body.email).then(function(magicLink) {
        // setup email data with unicode symbols
        let mailOptions = {
          from: '"Celebrity Hologram Store" <noreply@chstore.com>', // sender address
          to: req.body.email, // list of receivers
          subject: 'Magic Sign-in Link', // Subject line
          text: 'Click the following link to sign-in: ' + magicLink, // plain text body
          html: '<b>Click the following link to sign-in: <a href="' + magicLink + '">' + magicLink + '</a></b>' // html body
        };

        // send mail with defined transport object
        transporter.sendMail(mailOptions, (error, info) => {
          if (error) {
            res.json({
              error: error
            })
          }
          console.log('[ api.js - Message sent: %s ]', info.messageId);
          console.log('[ api.js - Preview URL: %s ]', nodemailer.getTestMessageUrl(info));

          res.json({
            email: req.body.email
          })
        });
      }, function(err) {
        res.json({
          error: "Error creating magic link."
        })
      })
    } else {
      res.json({
        error: "Invalid email address."
      })
    }
  })
})

api.post('/user/getInfo', (req, res) => {
  isAuth(req.body.token, ALL_ROLES).then(function(user){
    res.json({
      user: _.omit(user.toObject(), ['hash'])
    });
  }, function(err){
    res.json({
      error: err
    })
  });
})

api.post('/user/activate', (req, res) => {
  isAuth(req.body.token, ['admin']).then(() => {
    User.findById(req.body.id, (err, user) => {
      user.active = true;
      user.save(function(err){
        if (err) {
          res.json({
            error: "Database error."
          });
        } else {
          res.json({
            success: true
          });
        }
      })
    })
  })
})

api.post('/user/deactivate', (req, res) => {
  isAuth(req.body.token, ['admin']).then(() => {
    User.findById(req.body.id, (err, user) => {
      user.active = false;
      user.save(function(err){
        if (err) {
          res.json({
            error: "Database error."
          });
        } else {
          res.json({
            success: true
          });
        }
      })
    })
  })
})

api.post('/user/changeRole', (req, res) => {
  isAuth(req.body.token, ['admin']).then(() => {
    User.findById(req.body.id, (err, user) => {
      user.role = req.body.newRole;
      user.save(function(err){
        if (err) {
          res.json({
            error: "Database error."
          });
        } else {
          res.json({
            success: true
          });
        }
      })
    })
  })
})

api.post('/users', (req, res) => {
  isAuth(req.body.token, ['admin']).then((admin) => {
    User.find({}, function(err, users) {
      let userList = [];

      users.forEach(function(user) {
        if (user.id != admin.id) {
          userList.push(_.omit(user.toObject(), ['hash']));
        }
      });

      res.send(userList);
    });
  })
})

api.post('/user/getPurchases', (req, res) => {
  jwt.verify(req.body.token, SECRET, function(err, decoded) {
    if (err) {
      res.json({
        error: "Invalid token."
      });
    } else {
      User.findById(decoded.id, function(err, user){
        if (err) {
          res.json({
            error: "Invalid token, no user."
          });
        } else {
          const objectIds = [];
          user.purchases.forEach((purchaseId) => {
            objectIds.push(mongoose.Types.ObjectId(purchaseId));
          });
          Hologram.find({
            '_id': {
              $in: objectIds
            }
          }, function(err, docs){
            console.log(docs);
            if (err) {
              res.status(500).send("DB Error");
            } else {
              res.json(docs);
            }
          });
        }
      });
    }
  });
})

api.post('/user/purchaseHologram', (req, res) => {
  jwt.verify(req.body.token, SECRET, function(err, decoded) {
    if (err) {
      res.json({
        error: "Invalid token."
      });
    } else {
      if (req.body.hologramId) {
        User.findById(decoded.id, function(err, user){
          if (err) {
            res.json({
              error: "Invalid token, no user."
            });
          } else if (user.purchases.includes(req.body.hologramId)) {
            res.json({
              error: "Item has already been purchased"
            })
          } else {
            user.purchases.push(req.body.hologramId);
            user.save((err) => {
              if (err) {
                res.status(500).send('DB Error');
              } else {
                res.status(200).send('New purchase added successfully');
              }
            });
          }
        });
      } else {
        res.json({
          error: "Invalid arguments"
        })
      }
    }
  });
})

api.get('/hologram', (req, res) => {
  Hologram.findById(req.body.id, (err, result) => {
    if (err) {
      res.status(500).send('DB Error');
    } else {
      res.json(result);
    }
  })
})

api.get('/holograms', (req, res) => {
  Hologram.find((err, holograms) => {
    if (err) {
      res.status(500).send('DB Error');
    } else {
      const output = [];

      holograms.forEach((hologram) => {
        output.push({
          id: hologram.id,
          name: hologram.name,
          price: hologram.price,
        });
      });

      res.status(200).json(output.reverse())
    }
  });
});

api.post('/addHologram', (req, res) => {
  if (req.body.name && req.body.price) {
    newHologram = Hologram({
      name: req.body.name,
      price: req.body.price
    });

    newHologram.save((err) => {
      if (err) {
        res.status(500).send('DB Error');
      } else {
        res.status(200).send('New hologram successfully created');
      }
    });
  } else {
    res.status(400).send('Invalid parameters');
  }
});

api.post('/deleteHologram', (req, res) => {
  if (req.body.id) {
    Hologram.findByIdAndRemove(req.body.id, (err, result) => {
      if (err) {
        res.status(500).send('DB Error');
      } else {
        res.status(200).send('Hologram successfully removed');
      }
    })
  } else {
    res.status(400).send('Invalid parameters');
  }
});

function isAuth(token, roles) {
  return new Promise(function(resolve, reject){
    jwt.verify(token, SECRET, function(err, decoded) {
      if (err) {
        reject(err);
      } else {
        User.findById(decoded.id, function(err, user){
          if (err) {
            reject(err);
          } else if (!user.active) {
            reject("Account has been deactivated.");
          } else if (!user.emailVerified) {
            reject("Email address has not yet been verified.");
          } else if (!roles.includes(user.role)) {
            reject("Unauthorized request.")
          } else {
            resolve(user);
          }
        });
      }
    });
  })
}

function generateMagicLink(email) {
  return new Promise((resolve, reject) => {
    User.findOne({email: email}, (err, result) => {
      if (err) {
        reject(err)
      } else {
        if (result) {
          const token = jwt.sign({id: result.id, verify: true}, SECRET)
          resolve("http://localhost:8000/#!/login?token=" + token)
        } else {
          reject("Account does not exist.")
        }
      }
    })
  })
}

module.exports = api;
