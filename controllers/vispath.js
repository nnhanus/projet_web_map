const VisPath = require('../models/vispath')

module.exports.getPath = function (req, res){
    res.json(VisPath.getPath(session.userid))
}