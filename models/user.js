users = [
    {"userid": "fred@fred.com", "password": "1234", "username": "fred"},
    {"userid": "vane@vane.com", "password": "1234", "username": "vane"},
    {"userid": "nnao@nnao.com", "password": "nnao", "username": "nnao"},

]

module.exports = class User{
    static verify = function(userid, password){
        var flag = false
        users.forEach(u => {
            if (u.userid == userid && u.password == password){
                flag = true
            }
        });
        return flag
    }

    static getUsername = function(userid){
        var result = undefined
        users.forEach(u => {
            if (u.userid == userid){
                result = u.username
            }
        });
        return result
    }
}