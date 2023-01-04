const express = require('express'); //Import the express dependency

const path = require('path')
const expressLayouts = require('express-ejs-layouts') // Import express layouts 
const app = express();              //Instantiate an express app, the main work horse of this server
const port = 8080;                  //Save the port number where your server will be listening
const bodyParser = require('body-parser');
const fs = require('fs');



/// TODOS:

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
app.use(function(req, res, next) 
{
  res.locals.user = req.session.user;
  next();
});



/*********************************/
/*********** USING FILES *********/
/*********************************/
// parsing the incoming data
// also setting the limit size of request to a higher amont than the default value, same with parameter limit
app.use(express.json({ limit: '8mb' }));
app.use(express.urlencoded({ limit: '8mb', extended: true, parameterLimit: 1000000 }));

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
app.get('/', 
function(req, res) 
{
  session=req.session;
	if(!session.userid) res.sendFile('views/login.html',{root:__dirname})
	else res.render('index.ejs', {userid: session.userid, username: session.username})
})

app.get('/vis', 
function (req, res) 
{
  session=req.session;
  if(!session.userid) res.sendFile('views/login.html',{root:__dirname});
	else
	{
    res.render("vis.ejs", 
		{
			'userid':session.userid, 
			'username': session.username,
			'team_colors':
			[
				'red',
				'green',
				'blue',
				'yellow',
				'cyan',
				'magenta'
			]
		})
  }
    
})

const userRoutes = require('./routes/user')
app.use(userRoutes)

const vispathRoutes = require('./routes/vispath');
app.use(vispathRoutes)


/*********************************/
/********SERVER DATABASE**********/
/*********************************/

var all_paths = [];

function update_local()
{
	fs.writeFileSync('./data/data.json', JSON.stringify(all_paths));
}

function get_path(name)
{
	for(var path of all_paths)
	{
		if(path.name == name) return path;
	}
}

app.post('/path-name', 
(req, res) =>
{
	const path_data = req.body;	
	// console.log('received new path', path_data);

	if(!get_path(path_data.name)) 
	{
		path_data.color = 'black'; // default color
		all_paths.push(path_data);
	}
	update_local();
	res.sendStatus(200); // success.
})

app.post('/path-points',
(req, res) =>
{
	const path_data = req.body;
	// console.log('received path points', path_data);

	var path = get_path(path_data.name);
	if(path) 
	{
		path.points = path_data.points;
		update_local();
	}
	res.sendStatus(200); // success.
})

app.post('/path-desc',
(req, res) =>
{
	const path_data = req.body;
	// console.log('received path desc', path_data);

	var path = get_path(path_data.name);
	if(path) 
	{
		path.description = path_data.description;
		update_local();
	}
	res.sendStatus(200); // success.
})

app.post('/path-elevs',
(req, res) =>
{
	const path_data = req.body;
	// console.log('received path elevations', path_data);

	var path = get_path(path_data.name);
	if(path) 
	{
		path.elevations = path_data.elevations;
		update_local();
	}
	res.sendStatus(200); // success.
})


app.post('/path-color',
(req, res) =>
{
	const path_data = req.body;
	// console.log('received path color change', path_data);

	var path = get_path(path_data.name);
	if(path) 
	{
		path.color = path_data.color;
		update_local();
	}
	res.sendStatus(200); // success.
})

app.post('/path-pois', 
(req, res) =>
{
	const data = req.body;
	// console.log('received path POIs', data);

	for(var path in all_paths)
	{
		if(path.name == data.name) path.waypoints = data.waypoints;
	}

	update_local();
	res.sendStatus(200); // success.
})

app.get('/get-all-paths', 
(req, res) => 
{
	const json = fs.readFileSync('./data/data.json');
	const obj = JSON.parse(json);
	// console.log(obj);
	res.send(obj);
});


/*********************************/
/******* Application start *******/
/*********************************/

app.listen(port, () => 
{
  console.log(`Now listening on port ${port}`);
});
