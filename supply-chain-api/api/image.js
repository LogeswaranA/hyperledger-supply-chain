const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const keys = require('../config/keys');
const passport = require('passport');


//Load User Model
const Image = require('../models/Image');
require('dotenv').load();






/**
 * @typedef uploadImage
 * @property {string} imageData.required - Key Name- eg: "base64data"
 */
/**
 * This function comment is parsed by doctrine
 * @route POST /images/uploadImage
 * @group Network - Operations on Blockchain Network
 * @param {uploadImage.model} uploadImage.body.required - the new point
 * @returns {object} 200 - An array of user info
 * @returns {Error}  default - Unexpected error
 * @security JWT
*/
router.post('/uploadImage',passport.authenticate('jwt',{session:false}),(req,res)=>{

    const newImage = new Image({
        imageData : req.body.imageData,
    });
    newImage.save()
     .then(image => {
         res.json(image)
     })
  
});



/**
 * This function comment is parsed by doctrine
 * @route GET /images/getAllImages
 * @group Network - Operations on Blockchain Network
 * @returns {object} 200 - An array of user info
 * @returns {Error}  default - Unexpected error
 * @security JWT
*/
router.get('/getAllImages',passport.authenticate('jwt',{session:false}),(req,res)=>{

   Image.find()
   .then(result=>{
       res.json(result)
   })
  
});

/**
 * @typedef getImages
 * @property {string} imageID.required - Key Name- eg: 5df539b6731ac03901e06045
 */
/**
 * This function comment is parsed by doctrine
 * @route POST /images/getImages
 * @group Network - Operations on Blockchain Network
 * @param {getImages.model} getImages.body.required - the new point
 * @returns {object} 200 - An array of user info
 * @returns {Error}  default - Unexpected error
 * @security JWT
*/
router.post('/getImages',passport.authenticate('jwt',{session:false}),(req,res)=>{

    Image.findOne({_id:req.body.imageID})
    .then(result=>{
        res.json(result)
    })
   
 });

module.exports = router;
