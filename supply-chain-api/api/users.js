const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const keys = require('../config/keys');
const passport = require('passport');

//Load input Validation
const validateRegisterInput = require('../validation/users/register');
const validateLoginInput    = require('../validation/users/login');
const validateUpdateInput    = require('../validation/users/updatepassword');

//Load User Model
const User = require('../models/User');
require('dotenv').load();




router.get('/test',(req,res)=> res.json({msg: "Users Works!!"}));

router.post('/register',(req,res)=>{
  const {errors,isValid}= validateRegisterInput(req.body);
    
    //Check Validation
    if(!isValid){
        return res.status(400).json(errors);
    }

    User.findOne({$or:[{mobile:req.body.mobile},{email:req.body.email}]})
    .then(user => {
            if(user){
            errors.email = 'Email Already Exists';
            errors.mobile ='Mobile No Already Exists'
            return res.status(400).json(errors);
            }
            else{
                    const mobileno=req.body.mobile;
                    const newUser = new User({
                        userType : req.body.userType,
                        email: req.body.email,
                        name: req.body.name,
                        mobile: req.body.mobile,
                        password: req.body.password,
                        status:req.body.status
                    });
                    bcrypt.genSalt(10,(err,salt)=>{
                        bcrypt.hash(newUser.password,salt,(err,hash) => {
                        if(err) throw err;
                        newUser.password = hash;
                        newUser.save()
                        .then(user => {
                            //res.json(user)
                                //User matched
                                const payload = {id: user.id,name:user.name,email:user.email,userType:user.userType,mobile:user.mobile};//Create JWT Payload
                                //Sign Token
                                jwt.sign(payload,keys.secretOrKey,{expiresIn:3600},(err,token)=>{
                                    res.json({
                                        success:true,
                                        token:'Bearer ' + token
                                    })
                                });
                            
                        })
                        .catch(err => console.log(err));
                        })
                });
            
            }
    })
});


router.post('/login',(req,res)=>{
    const {errors,isValid}= validateLoginInput(req.body);
    //Check Validation
    if(!isValid){
        return res.status(400).json(errors);
    }

    const email = req.body.email;
    const password = req.body.password;

    //Find the user by email
    User.findOne({$and:[{email:req.body.email},{status:"active"}]})
        .then(user=>{
            //Check for user
            if(!user){
                errors.email = 'User not found';
                return res.status(404).json(errors);
            }
            //Check password
            bcrypt.compare(password,user.password)
                  .then(isMatch =>{
                      if(isMatch){
                        //User matched
                        const payload = {id: user.id,name:user.name,email:user.email,userType:user.userType,mobile:user.mobile};//Create JWT Payload
                        //Sign Token
                        jwt.sign(payload,keys.secretOrKey,{expiresIn:3600},(err,token)=>{
                            res.json({
                                success:true,
                                token:'Bearer ' + token
                            })
                        });
                      }else{
                        errors.password = 'Password Incorrect';
                        return res.status(400).json(errors);
                      }
                  });
        });
});



router.get('/current',passport.authenticate('jwt',{session:false}),(req,res)=>{
    res.json({
        id: req.user.id,
        name:req.user.name,
        email:req.user.email,
        userType:req.user.userType
    });
});


router.post('/update',passport.authenticate('jwt',{session:false}),(req,res)=>{

    const {errors,isValid}= validateUpdateInput(req.body);
    //Check Validation
    if(!isValid){
        return res.status(400).json(errors);
    }
    
    bcrypt.genSalt(10,(err,salt)=>{
        bcrypt.hash(req.body.password,salt,(err,hash) => {
          if(err) throw err;
          newpassword = hash;
          User.findByIdAndUpdate(req.user.id,{password:newpassword})
           .then(user => res.json(user))
           .catch(err => console.log(err));
        })
      })
});

module.exports = router;
