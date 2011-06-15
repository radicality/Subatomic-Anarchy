var admin = require('./admin.js');
var game  = require('./game.js');
var lr    = require('./loginregisterh.js');
var msg   = require('./messaging.js');
var data = require('../data.js')

// Routing information:
// First comes the path, then the array of functions, starting with 
// the middlewares, followed by the final handling function

exports.start = function(app,auth,data,forms,models) {
  lr.start(auth, forms.login_form, forms.register_form, models.User);
  admin.start(models);
  msg.start(forms, models, data);
  var routes = {
    post : {
      '/login' : [lr.login],
      '/register' : [lr.register],
      '/sendMessage' : [requireLogin, msg.sendMessage]
    },
    get : {
      '/' : [index],
      '/game' : [requireLogin, accessLogger, game.game],
      '/login' : [loggedIn, lr.login_register_f],
      '/logout' : [requireLogin, /*writeData, */ lr.logout],
      '/admin' : [requireLogin, requireAdmin, accessLogger, admin.admin],
      '/mapEdit' : [requireLogin, /*requireAdmin,*/ accessLogger, admin.mapEdit],
      '/admin/clearPlanets' : [requireLogin, requireAdmin, accessLogger, admin.clearPlanets],
      '/inbox' : [requireLogin, accessLogger, msg.inbox],
      '/getUsernames' : [msg.getUsernames]
    }
  }

  // Routing functions

  var funcs = {
    post : app.post,
    get : app.get,
    all : app.all
  }

  // Call the appropriate methods...

  Object.keys(routes).forEach( function(type, index, array) {
    var func = funcs[type];
    Object.keys(routes[type]).forEach( function(path, index1, array1){
      var args = routes[type][path];
      args.unshift(path);
      func.apply(app,args);
    });
  });
  
  function index(req,res) {
    if(req.session.user)
      res.redirect('/game');
    else
      res.redirect('/login');
  }


  // MIDDLEWARE

  // If the user is logged in, redirect to home
  // Use for places which require person to be NOT logged in.
  function loggedIn(req,res,next){
    if(req.session.user) res.redirect('home');
    else next();
  }
  
  // Do not allow multiple game screens per person. Only one!
  function noMultipleLogins(req,res,next){
    var uname = req.session.user.username;
    if(data.players[uname]){
      res.send("Sorry, no multiple logins are allowed.")
    }
    else{
      next();
    }
  }

  // If user is not logged in, redirect to login page
  function requireLogin(req,res,next){
    if(req.session.user) {
      next();
    } else {
      req.flash('error', 'You have to login!');
      res.redirect('/login');
    }
  }

  // If user is not an admin, redirect to home page
  function requireAdmin(req,res,next){
    if(req.session.user.admin) {
      next();
    } else {
      req.flash('error', 'You don\'t have sufficient privileges to access the site');
      res.redirect('back');
    }
  }

  // Logs access to site after logging in
  function accessLogger(req, res, next) {
    console.log('Restricted part %s accessed by %s', req.originalUrl,req.session.user.username);
    next();
  }
  
  // TEMPORARY: Writes player data back to backing store
  function writeData(req,res,next){
    models.User.findById(req.session.user._id, function(err, user){
      console.log(user);
      
      var p = data.players[user.username];
      user.position.x = p.position.x;
      user.position.y = p.position.y;
      
      user.rotation = p.rotation;
      user.save(function(err){});
    });
    next();
  }
}
