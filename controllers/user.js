const User = require('../models/user')

module.exports.loginUser = 
function (req, res)
{
	if(User.verify(req.body.userid, req.body.password))
	{
		session = req.session;
		session.userid = req.body.userid;
		session.username = User.getUsername(session.userid);
		res.render("index.ejs", {'userid':session.userid, 'username':session.username})
	}
	else
	{
		console.log(req.body.username +" does not match " + req.body.password)
		res.send('Invalid username or password.<a href="/">Try again</a>');
	}
}

module.exports.logoutUser = function (req, res){
    req.session.destroy();
    res.redirect('/');
}