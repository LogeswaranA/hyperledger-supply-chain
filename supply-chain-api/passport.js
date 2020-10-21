const JwtStrategy = require('passport-jwt').Strategy;
const ExtractJwt  = require('passport-jwt').ExtractJwt;
const mongoose    = require('mongoose');
const User        = mongoose.model('users');
const keys        = require('./config/keys');

const opts = {};
opts.jwtFromRequest = ExtractJwt.fromAuthHeaderAsBearerToken();
opts.secretOrKey    = keys.secretOrKey;

module.exports = passport => {
    passport.use(new JwtStrategy(opts,(jwt_payload, done)=>{  
            if(jwt_payload.username){
                const payload = {
                    username:jwt_payload.username,
                    orgName:jwt_payload.orgName,
                    role:jwt_payload.role,
                    mobile:jwt_payload.mobile,
                    exp:jwt_payload.exp,
                    lat:jwt_payload.lat
                }     
                if(jwt_payload.username != null){
                    return done(null,payload);
                }
                return done(null,false);    
            }
         
    }));
};