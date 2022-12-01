const User = require('./user')

module.exports = class VisPath{
    static getPath = function(userid){
        const username = User.getUsername(userid)
        return require('../data/' + username + '-path.json')
    }
}