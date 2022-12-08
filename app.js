const express = require('express'); //Import the express dependency
const path = require('path')
const expressLayouts = require('express-ejs-layouts') // Import express layouts 
const app = express();              //Instantiate an express app, the main work horse of this server
const port = 8080;                  //Save the port number where your server will be listening




/// TODOS:

// Distribute path between users
// Uncolored path, get path -> color it = make it unavailable (and save which group has it)
// then un-assign paths
// - server side : assign pass
// - client side : choose path, quit path

// Point of interest on path
// Load POIs array and show the one next to a path 
// - server side : -
// - client side : - 

// JSON datas :

// Path : points[], color(default:black)
// POIs : [ points, description, ?icon (pathto/svg...) ] 


/*********************************/
/** DEFINITIONS TO USE SESSIONS **/
/*********************************/

// Declare sessions
const sessions = require('express-session');
const oneDay = 1000 * 60 * 60 * 24;
app.use(sessions({
    secret: "thisismysecrctekeyfhrgfgrfrty84fwir767",
    saveUninitialized:true,
    cookie: { maxAge: oneDay },
    resave: false 
}));

// a variable to save a session
var session;

// to make session user variable available everywhere
app.use(function(req, res, next) {
  res.locals.user = req.session.user;
  next();
});



/*********************************/
/*********** USING FILES *********/
/*********************************/
// parsing the incoming data
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

//serving public file
app.use(express.static(__dirname));

// Adding css and js files from installed apps
app.use('/css', express.static(path.join(__dirname, 'node_modules/bootstrap/dist/css')))
app.use('/js', express.static(path.join(__dirname, 'node_modules/bootstrap/dist/js')))
app.use('/js', express.static(path.join(__dirname, 'node_modules/jquery/dist')))




/*********************************/
/** TEMPLATE ENGINES AND LAYOUTS */
/*********************************/

// This requires a folder called views
app.engine('html', require('ejs').renderFile);
app.set('view engine', 'html');
app.use(expressLayouts)
app.set('layout', './layouts/base-layout.ejs')


/*********************************/
/************ Routes *************/
/*********************************/

// MAIN
app.get('', (req, res) => {
  session=req.session;
    if(session.userid){
    }else
      res.sendFile('views/login.html',{root:__dirname})
})

app.get('/vis', function (req, res) {
  session=req.session;
  if(session.userid){
    console.log(session.userid)
    res.render("vis.ejs", {'userid':session.userid, 'username': session.username})
  } else
    res.sendFile('views/login.html',{root:__dirname})
})

const userRoutes = require('./routes/user')
app.use(userRoutes)

const vispathRoutes = require('./routes/vispath')
app.use(vispathRoutes)

/*********************************/
/******* Application start *******/
/*********************************/

app.listen(port, () => {
    console.log(`Now listening on port ${port}`);
});
