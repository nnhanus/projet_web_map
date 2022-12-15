const User = require('./user')

module.exports = class VisPath{
    static getPath = function(userid){
        const username = User.getUsername(userid)
        console.log(username)
        return require('../data/' + username + '-path.gpx')
    }
}