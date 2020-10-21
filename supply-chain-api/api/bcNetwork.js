var express = require("express");
var router = express.Router();
require("dotenv").config();
require('../config.js');
var hfc = require("fabric-client");

//Fabric-helpers
var createChannel = require("../app/create-channel.js");
var join = require("../app/join-channel.js");
var install = require("../app/install-chaincode.js");
var upgrade = require("../app/upgrade-chaincode.js");
var instantiate = require("../app/instantiate-chaincode.js");
var updateAnchorPeers = require('../app/update-anchor-peers.js');
var invoke = require("../app/invoke-transaction.js");
var query = require("../app/query.js");
var helper = require("../app/helper.js");
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const keys = require('../config/keys');
const passport = require('passport');

//logger
var logger = helper.getLogger("Routes");

//load User Model
const User = require('../models/User');

function getErrorMessage(field) {
  var response = {
    success: false,
    message: field + " field is missing or Invalid in the request"
  };
  return response;
}

//Declare constants below
var channelName = "mychannel";
var channelConfigPath = "../artifacts/channel/mychannel.tx";
var chaincodeName = "carton";
var chaincodeType = "golang";
var mainpeers = ["peer0.org1.example.com","peer0.org2.example.com"];

// @typedef createArray
// @property {string} username.required -  eg: 1
// @property {string} orgName.required - Org Name- eg: 2  
// @property {Array.<createArray>} createArray.required
/**
 * @typedef CreateUser
 * @property {string} username.required - username - eg: user1
 * @property {string} orgName.required - Org Name- eg: Org1
 * @property {string} password.required - password eg: admin1234
 * @property {string} role.required -Role- eg: Admin
 * @property {string} useremail.required - useremail - eg:admin@testing.com
 */
/**
 * This function comment is parsed by testing
 * @route POST /bcNetwork/createUser
 * @group Network - Operations on Blockchain Network
 * @param {CreateUser.model} CreateUser.body.required - Create User
 * @returns {object} 200 - An array of user info
 * @returns {Error}  default - Unexpected error
*/
router.post("/createUser", async function(req, res) {
  var username = req.body.username;
  var orgName = req.body.orgName;
  var role    = req.body.role;

  var mongodb = global.db;
  logger.debug("User name : " + username);
  logger.debug("Org name  : " + orgName);
  logger.debug("Role  : " + role);
  if (!username) {
    res.json(getErrorMessage("'username'"));
    return;
  }
  if (!orgName) {
    res.json(getErrorMessage("'orgName'"));
    return;
  }
  mongodb.collection("users").find({userName:req.body.username}).toArray(async function (err, exiRes) {
    console.log("exiRes",exiRes)
    if(exiRes.length >0){

          return res.status(200).json({success:false,message:'User Already Exists'});
    }else{
      let response = await helper.getRegisteredUser(username, orgName, true);
      logger.debug("response is  : " + response);

      logger.debug(
        "-- returned from registering the username %s for organization %s",
        username,
        orgName
      );
      if (response && typeof response !== "string") {
        logger.debug(
          "Successfully registered the username %s for organization %s",
          username,
          orgName
        );

        const salt = await bcrypt.genSalt(10);
        var hashedpassword = await bcrypt.hash(req.body.password, salt);

        var newusers = {
          userName : req.body.username,
          status:'Active',
          role:req.body.role,
          org:req.body.orgName,
          password:hashedpassword,
          userEmail:req.body.useremail,
        };

        mongodb.collection("users").insertOne(newusers).then(result => {
          console.log("result is",result,result["ops"][0]["_id"])
          if(result){
            return res.status(200).json({success:true,message:'User Registered Successfully'});
          }
        });
       
      } else {
        logger.debug(
          "Failed to register the username %s for organization %s with::%s",
          username,
          orgName,
          response
        );
        res.json({
          success: false,
          message: response
        });
      }
    }
  });
});


/**
 * @typedef LoginUser
 * @property {string} username.required - username - eg: user1
 * @property {string} password.required - password- eg: admin1234
 * 
 */
/**
 * This function comment is parsed by testing
 * @route POST /bcNetwork/userLogin
 * @group Network - Operations on Blockchain Network
 * @param {LoginUser.model} LoginUser.body.required - Create User
 * @returns {object} 200 - An array of user info
 * @returns {Error}  default - Unexpected error
*/
router.post('/userLogin',(req,res)=>{
  const validateLoginInput    = require('../validation/users/login');
  const {errors,isValid}= validateLoginInput(req.body);
  //Check Validation
  if(!isValid){
      return res.status(400).json(errors);
  }

  const username = req.body.username;
  const password = req.body.password;
  
  var mongodb = global.db;
  var query = {$and:[{userName:req.body.username},{status:"Active"}]};
  //Find the user by username
  mongodb.collection("users").findOne(query).then(exiRes =>{
      //Check for user
      if(exiRes){
            //Check password
            bcrypt.compare(password,exiRes.password)
            .then(isMatch =>{
                if(isMatch){
                  //User matched
                  const payload = {id: exiRes._id,userName:exiRes.userName,role:exiRes.role};//Create JWT Payload
                  console.log("payLoad",payload)
                  //Sign Token
                  jwt.sign(payload,keys.secretOrKey,{expiresIn:3600000},(err,token)=>{
                      res.json({
                          success:true,
                          token:'Bearer ' + token
                      })
                  });
                }else{
                  return res.status(200).json({success:false,message:"Password Incorrect"});
                }
              });
      }else{
        return res.status(200).json({success:false,message:"User not found"});    
      }
  });
});


/**
 * @typedef usersList
 * @property {string} username.required - username - eg: user1 
 */
/**
 * This function comment is parsed by testing
 * @route POST /bcNetwork/usersList
 * @group Network - Operations on Blockchain Network
 * @param {usersList.model} usersList.body.required - List all users
 * @returns {object} 200 - An array of user info
 * @returns {Error}  default - Unexpected error
 * @security JWT
*/
router.post('/usersList',passport.authenticate('jwt',{session:false}),(req,res)=>{
    var mongodb = global.db;
    var query = {status:"Active"};
    console.log("Iam in userlist")
    mongodb.collection("users").find(query).toArray(async function (err, exiRes) {
        if(exiRes.length>0){
            response = {"success":true,"message":exiRes};
            return res.status(200).json(response);
        }else{
          response = {"success":false,"message":"No Active user exists"};
          res.status(200).json(response);
        }
    });
});

/**
 * @typedef changePassword
 * @property {string} username.required - username - eg: user1
 * @property {string} newpassword.required - newpassword- eg: newpass
 */
/**
 * This function comment is parsed by testing
 * @route POST /bcNetwork/changePassword
 * @group Network - Operations on Blockchain Network
 * @param {changePassword.model} changePassword.body.required - Change Password
 * @returns {object} 200 - An array of user info
 * @returns {Error}  default - Unexpected error
 * @security JWT
*/
router.post('/changePassword',passport.authenticate('jwt',{session:false}),async (req,res)=>{
  var mongodb = global.db;
  const salt = await bcrypt.genSalt(10);
  var hashedpassword = await bcrypt.hash(req.body.newpassword, salt);
  var query =  { "userName": req.body.username} ;
  var newValues = { $set: {"password":hashedpassword}};
  mongodb.collection("users").updateOne(query,newValues,function (err, exiRes) {
      if(exiRes['result'].n > 0){
        response = {"success":true,"message":"Password changed successfully for the given user"};
        res.status(200).json(response);
      }else{
        response = {"success":false,"message":"No Such User Exists or Operation Failed"};
        res.status(200).json(response);
      }
  });
});


/**
 * @typedef editUser
 * @property {string} username.required - username - eg: user1
 * @property {string} role.required - role- eg: Admin
 * @property {string} newstatus.required - newstatus- eg: Inactive
 */
/**
 * This function comment is parsed by testing
 * @route POST /bcNetwork/editUser
 * @group Network - Operations on Blockchain Network
 * @param {editUser.model} editUser.body.required - Edit Users
 * @returns {object} 200 - An array of user info
 * @returns {Error}  default - Unexpected error
 * @security JWT
*/
router.post('/editUser',passport.authenticate('jwt',{session:false}),(req,res)=>{
  var mongodb = global.db;
  var query =  { "userName": req.body.username} ;
  var newValues = { $set: {"role":req.body.role,"status":req.body.newstatus}};

  mongodb.collection("users").updateOne(query,newValues,function (err, exiRes) {
      if(exiRes['result'].n > 0){
        response = {"success":true,"message":"Edited & Saved successfully for the given user"};
        res.status(200).json(response);
      }else{
        response = {"success":false,"message":"No Such User Exists"};
        res.status(200).json(response);
      }
  });

});
////////////////////////////////////////////////////////////////////////////////////////////
///////////////////////////////////////////////////////////////////////////////////////////

/**
 * @typedef createChannel
 * @property {string} username.required - username - eg: user1
 * @property {string} orgName.required - Org Name- eg: Org1
 */
/**
 * This function comment is parsed by testing
 * @route POST /bcNetwork/createChannel
 * @group Network - Operations on Blockchain Network
 * @param {createChannel.model} createChannel.body.required -Create Channel
 * @returns {object} 200 - An array of user info
 * @returns {Error}  default - Unexpected error
 * @security JWT
*/
router.post("/createChannel", passport.authenticate('jwt',{session:false}),async function(req, res) {
  logger.info("<<<<<<<<<<<<<<<<< C R E A T E  C H A N N E L >>>>>>>>>>>>>>>>>");
  logger.debug("End point : /channels");
  var userName = req.body.userName;
  var orgName = req.body.orgName;
  logger.debug("Channel name : " + channelName);
  logger.debug("channelConfigPath : " + channelConfigPath); 
  logger.debug("orgName : " + orgName);
  if (!channelName) {
    res.json(getErrorMessage("'channelName'"));
    return;
  }
  if (!channelConfigPath) {
    res.json(getErrorMessage("'channelConfigPath'"));
    return;
  }

  let message = await createChannel.createChannel(
    channelName,
    channelConfigPath,
    userName,
    orgName
  );
  res.send(message);
});



/**
 * @typedef joinPeers
 * @property {string} userName.required - username - eg: user1
 * @property {string} orgName.required - Org Name- eg: Org1
 * @property {Array} peers.required - peers Name- eg: ["peer0.org1.example.com","peer1.org1.example.com"]
 */
/**
 * This function comment is parsed by testing
 * @route POST /bcNetwork/joinPeers
 * @group Network - Operations on Blockchain Network
 * @param {joinPeers.model} joinPeers.body.required - Join Peers
 * @returns {object} 200 - An array of user info
 * @returns {Error}  default - Unexpected error
 * @security JWT
*/
router.post("/joinPeers",passport.authenticate('jwt',{session:false}), async function(req, res) {
  logger.info("<<<<<<<<<<<<<<<<< J O I N  C H A N N E L >>>>>>>>>>>>>>>>>");
  logger.debug("End point : /joinPeers");
  var userName = req.body.userName;
  var orgName = req.body.orgName;
  var peers = req.body.peers;
  logger.debug("channelName : " + channelName);
  logger.debug("peers : " + peers);
  logger.debug("userName :" + userName);
  logger.debug("orgName:" + orgName);

  if (!channelName) {
    res.json(getErrorMessage("'channelName'"));
    return;
  }
  if (!peers || peers.length == 0) {
    res.json(getErrorMessage("'peers'"));
    return;
  }

  let message = await join.joinChannel(channelName, peers, userName, orgName);
  const timeout = ms => new Promise(res => setTimeout(res, ms));
  await timeout(1000);
  res.send(message);
});




/**
 * @typedef updateAnchors
 * @property {string} userName.required - username - eg: user1
 * @property {string} orgName.required - Org Name- eg: Org1
 * @property {string} configUpdatePath.required - configUpdatePath - eg: ../artifacts/channel/Org1MSPanchors.tx
 */
/**
 * This function comment is parsed by testing
 * @route POST /bcNetwork/updateAnchors
 * @group Network - Operations on Blockchain Network
 * @param {updateAnchors.model} updateAnchors.body.required - Join Peers
 * @returns {object} 200 - An array of user info
 * @returns {Error}  default - Unexpected error
 * @security JWT
*/
router.post("/updateAnchors",passport.authenticate('jwt',{session:false}), async function(req, res) {
  logger.info("<<<<<<<<<<<<<<<<< J O I N  C H A N N E L  UpdateAnchors>>>>>>>>>>>>>>>>>");
  logger.debug("End point : /updateAnchors");
  var userName = req.body.userName;
  var orgName = req.body.orgName;
  var configUpdatePath = req.body.configUpdatePath;
  logger.debug("channelName : " + channelName);
  logger.debug("configUpdatePath : " + configUpdatePath);
  logger.debug("userName :" + userName);
  logger.debug("orgName:" + orgName);

  if (!channelName) {
    res.json(getErrorMessage("'channelName'"));
    return;
  }
  if (!configUpdatePath || configUpdatePath.length == 0) {
    res.json(getErrorMessage("'configUpdatePath'"));
    return;
  }

  let message = await updateAnchorPeers.updateAnchorPeers(channelName, configUpdatePath, userName,orgName);
  const timeout = ms => new Promise(res => setTimeout(res, ms));
  await timeout(1000);
  res.send(message);
});

// Install chaincode on target peers

/**
 * @typedef installChaincode
 * @property {string} chaincodeVersion.required - Channel Name - eg: v0
 * @property {string} userName.required - username - eg: user1
 * @property {string} orgName.required -   OrgName - eg: Org1
 * @property {Array} peers.required - peers Name- eg: ["peer0.org1.example.com","peer1.org1.example.com"]
 * @property {string} chaincodePath.required - chaincode path- eg: github.com/Carton/go
 */
/**
 * This function comment is parsed by testing
 * @route POST /bcNetwork/installChaincode
 * @group Network - Operations on Blockchain Network
 * @param {installChaincode.model} installChaincode.body.required - Install Chaincode
 * @returns {object} 200 - An array of user info
 * @returns {Error}  default - Unexpected error
 * @security JWT
*/
router.post("/installChaincode", passport.authenticate('jwt',{session:false}),async function(req, res) {
  logger.debug("==================== INSTALL CHAINCODE ==================");
  var chaincodeVersion = req.body.chaincodeVersion;
  var chaincodePath = req.body.chaincodePath;
  var userName = req.body.userName;
  var orgName = req.body.orgName;
  var peers = req.body.peers;
  logger.debug("peers : " + peers); // target peers list
  logger.debug("chaincodeName : " + chaincodeName);
  logger.debug("chaincodePath  : " + chaincodePath);
  logger.debug("chaincodeVersion  : " + chaincodeVersion);
  logger.debug("chaincodeType  : " + chaincodeType);
  if (!peers || peers.length == 0) {
    res.json(getErrorMessage("'peers'"));
    return;
  }
  if (!chaincodeName) {
    res.json(getErrorMessage("'chaincodeName'"));
    return;
  }
  if (!chaincodePath) {
    res.json(getErrorMessage("'chaincodePath'"));
    return;
  }
  if (!chaincodeVersion) {
    res.json(getErrorMessage("'chaincodeVersion'"));
    return;
  }
  if (!chaincodeType) {
    res.json(getErrorMessage("'chaincodeType'"));
    return;
  }
  let message = await install.installChaincode(
    peers,
    chaincodeName,
    chaincodePath,
    chaincodeVersion,
    chaincodeType,
    userName,
    orgName
  );
  res.send(message);
});


/**
 * @typedef upgradeChaincode
 * @property {string} chaincodeVersion.required - Channel Name - eg: v0
 * @property {string} userName.required - username - eg: user1
 * @property {string} orgName.required -   OrgName - eg: Org1
 * @property {Array} peers.required - peers Name- eg: ["peer0.org1.example.com","peer1.org1.example.com"]
 * @property {string} chaincodeType.required - chaincode path- eg: go
 */
/**
 * This function comment is parsed by testing
 * @route POST /bcNetwork/upgradeChaincode
 * @group Network - Operations on Blockchain Network
 * @param {upgradeChaincode.model} upgradeChaincode.body.required - Upgrade Chaincode
 * @returns {object} 200 - An array of user info
 * @returns {Error}  default - Unexpected error
 * @security JWT
*/
router.post("/upgradeChaincode", passport.authenticate('jwt',{session:false}),async function(req, res) {
  logger.debug("==================== Upgrade CHAINCODE ==================");
  var chaincodeVersion = req.body.chaincodeVersion;
  var chaincodeType = req.body.chaincodeType;
  var userName = req.body.userName;
  var orgName = req.body.orgName;
  var peers = req.body.peers;
  logger.debug("peers : " + peers); // target peers list
  logger.debug("chaincodeName : " + chaincodeName);
  logger.debug("chaincodeType  : " + chaincodeType);
  logger.debug("chaincodeVersion  : " + chaincodeVersion);
  logger.debug("chaincodeType  : " + chaincodeType);
  if (!peers || peers.length == 0) {
    res.json(getErrorMessage("'peers'"));
    return;
  }
  if (!chaincodeName) {
    res.json(getErrorMessage("'chaincodeName'"));
    return;
  }
  if (!chaincodeType) {
    res.json(getErrorMessage("'chaincodeType'"));
    return;
  }
  if (!chaincodeVersion) {
    res.json(getErrorMessage("'chaincodeVersion'"));
    return;
  }
  if (!chaincodeType) {
    res.json(getErrorMessage("'chaincodeType'"));
    return;
  }
  var functionName = "instantiate";
  var args = [""];

  console.log("teseting",peers,channelName,chaincodeName,chaincodeVersion,functionName,chaincodeType,args,userName,orgName)

  let message = await upgrade.upgradeChaincode(
    peers,
    channelName,
    chaincodeName,
    chaincodeVersion,
    functionName,
    chaincodeType,
    args,
    userName,
    orgName
  );
  res.send(message);
});

/**
 * @typedef instantiateChain
 * @property {string} chaincodeVersion.required - Channel Name - eg: v0
 * @property {string} userName.required - username - eg: user1
 * @property {string} orgName.required -   OrgName - eg: Org1
 * @property {Array} peers.required - peers Name- eg: ["peer0.org1.example.com","peer1.org1.example.com"]
 */
/**
 * This function comment is parsed by testing
 * @route POST /bcNetwork/instantiateChaincode
 * @group Network - Operations on Blockchain Network
 * @param {instantiateChain.model} instantiateChain.body.required - Instantiate Chaincode
 * @returns {object} 200 - An array of user info
 * @returns {Error}  default - Unexpected error
 * @security JWT
*/
// Instantiate chaincode on target peers
router.post("/instantiateChaincode",passport.authenticate('jwt',{session:false}), async function(req, res) {
  logger.debug("==================== INSTANTIATE CHAINCODE ==================");
  var chaincodeVersion = req.body.chaincodeVersion;
  var fcn = req.body.fcn;
  var args = [""];
  var userName = req.body.userName;
  var orgName = req.body.orgName;
  var peers = req.body.peers;
  logger.debug("peers  : " + peers);
  logger.debug("channelName  : " + channelName);
  logger.debug("chaincodeName : " + chaincodeName);
  logger.debug("chaincodeVersion  : " + chaincodeVersion);
  logger.debug("chaincodeType  : " + chaincodeType);
  logger.debug("fcn  : " + fcn);
  logger.debug("args  : " + args);
  if (!chaincodeName) {
    res.json(getErrorMessage("'chaincodeName'"));
    return;
  }
  if (!chaincodeVersion) {
    res.json(getErrorMessage("'chaincodeVersion'"));
    return;
  }
  if (!channelName) {
    res.json(getErrorMessage("'channelName'"));
    return;
  }
  if (!chaincodeType) {
    res.json(getErrorMessage("'chaincodeType'"));
    return;
  }
  if (!args) {
    res.json(getErrorMessage("'args'"));
    return;
  }

  let message = await instantiate.instantiateChaincode(
    peers,
    channelName,
    chaincodeName,
    chaincodeVersion,
    chaincodeType,
    fcn,
    args,
    userName,
    orgName
  );
  res.send(message);
});


/**
 * @typedef uploadData
 * @property {string} userName.required - username - eg: user1
 * @property {string} orgName.required -   OrgName - eg: Org1
 * @property {string} fileName.required -   fileName - eg: 51235323
 */
/**
 * This function comment is parsed by testing
 * @route POST /bcNetwork/uploadData
 * @group Network - Operations on Blockchain Network
 * @param {uploadData.model} uploadData.body.required - Upload Data
 * @returns {object} 200 - An array of user info
 * @returns {Error}  default - Unexpected error
 * @security JWT
*/
router.post("/uploadData", async function(req, res) {
  logger.debug("==================== INVOKE ON CHAINCODE UploadData ==================");
  var key = req.body.fileName;
  var fileName = req.body.fileName;
 // var peers = req.body.peers;
  var value = "Test";
  var fcn = "createJSON";

  console.log("type value of key", typeof(key))
  var args =[];
  var userName = req.body.userName;
  var orgName = req.body.orgName;
  args.push(key)
  args.push(value)
  logger.debug("channelName  : " + channelName);
  logger.debug("Peers :" + mainpeers);
  logger.debug("chaincodeName : " + chaincodeName);
  logger.debug("fcn  : " + fcn);
  logger.debug("jsonargs value is  : " + args);
  if (!chaincodeName) {
    res.json(getErrorMessage("'chaincodeName'", res));
    return;
  }
  if (!channelName) {
    res.json(getErrorMessage("'channelName'", res));
    return;
  }
  if (!fcn) {
    res.json(getErrorMessage("'fcn'", res));
    return;
  }
  if (!args) {
    res.json(getErrorMessage("'args'", res));
    return;
  }
  let message = await invoke.invokeChaincode(
    mainpeers,
    channelName,
    chaincodeName,
    fcn,
    args,
    userName,
    orgName
  );
  console.log("message",message);
  
  res.send({"message":"File Uploaded Successfully"})

});


/**
 * @typedef getCartonBycartonNo
 * @property {string} cartonNo.required - peers- eg: 1234567
 * @property {string} userName.required - username - eg: user1
 * @property {string} orgName.required -   OrgName - eg: Org1
 */
/**
 * This function comment is parsed by testing
 * @route POST /bcNetwork/getCartonBycartonNo
 * @group Network - Operations on Blockchain Network
 * @param {getCartonBycartonNo.model} getCartonBycartonNo.body.required - getCartonBycartonNo
 * @returns {object} 200 - An array of user info
 * @returns {Error}  default - Unexpected error
 * @security JWT
*/

router.post("/getCartonBycartonNo", passport.authenticate('jwt',{session:false}),async function(req, res) {
  logger.debug("==================== QUERY ON CHAINCODE getCartonBycartonNo==================");
  var cartonNo = req.body.cartonNo;
  var docType = "CartonTypes";
  var fcn = "queryLedger";
  var args = [`{\"selector\":{\"docType\":\"${docType}\",\"cartonNo\":\"${cartonNo}\"}}`];
  var userName = req.body.userName;
  var orgName = req.body.orgName;
  logger.debug("channelName  : " + channelName);
  logger.debug("chaincodeName : " + chaincodeName);
  logger.debug("fcn  : " + fcn);
  logger.debug("args  : " + args);
  if (!chaincodeName) {
    res.json(getErrorMessage("'chaincodeName'", res));
    return;
  }
  if (!channelName) {
    res.json(getErrorMessage("'channelName'", res));
    return;
  }
  if (!fcn) {
    res.json(getErrorMessage("'fcn'", res));
    return;
  }
  if (!args) {
    res.json(getErrorMessage("'args'", res));
    return;
  }

  let message = await query.queryChaincode(
    channelName,
    chaincodeName,
    args,
    fcn,
    userName,
    orgName
  );
  message = JSON.parse(message)
  res.send( message);
});



/**
 * @typedef getAllData
 * @property {string} userName.required - username - eg: user1
 * @property {string} orgName.required -   OrgName - eg: Org1
 */
/**
 * This function comment is parsed by testing
 * @route POST /bcNetwork/getAllData
 * @group Network - Operations on Blockchain Network
 * @param {getAllData.model} getAllData.body.required - get All data
 * @returns {object} 200 - An array of user info
 * @returns {Error}  default - Unexpected error
 * @security JWT
*/
router.post("/getAllData",passport.authenticate('jwt',{session:false}), async function(req, res) {
  logger.debug("==================== QUERY ON CHAINCODE getAllData==================");
  var fcn = "queryAll";
  var args = [""];
  var userName =req.body.userName;
  var orgName = req.body.orgName;
  logger.debug("channelName  : " + channelName);
  logger.debug("chaincodeName : " + chaincodeName);
  logger.debug("fcn  : " + fcn);
  logger.debug("args  : " + args);
  if (!chaincodeName) {
    res.json(getErrorMessage("'chaincodeName'", res));
    return;
  }
  if (!channelName) {
    res.json(getErrorMessage("'channelName'", res));
    return;
  }
  if (!fcn) {
    res.json(getErrorMessage("'fcn'", res));
    return;
  }
  if (!args) {
    res.json(getErrorMessage("'args'", res));
    return;
  }

  let message = await query.queryChaincode(
    channelName,
    chaincodeName,
    args,
    fcn,
    userName,
    orgName
  );
  message = JSON.parse(message);
  res.send(message);
});



/**
 * @typedef getCartonList
 * @property {string} userName.required - username - eg: user1
 * @property {string} orgName.required -   OrgName - eg: Org1
 */
/**
 * This function comment is parsed by testing
 * @route POST /bcNetwork/getCartonList
 * @group Network - Operations on Blockchain Network
 * @param {getCartonList.model} getCartonList.body.required - the new point
 * @returns {object} 200 - An array of user info
 * @returns {Error}  default - Unexpected error
 * @security JWT
*/
router.post("/getCartonList",passport.authenticate('jwt',{session:false}), async function(req, res) {
    logger.debug("==================== QUERY ON CHAINCODE getCartonLIST ==================");
    var fcn = "queryLedger";
    var args = [`{\"selector\":{\"docType\":\"CartonTypes\",\"processed\":false}}`];
    console.log("args",args);
    var userName = req.body.userName;
    var orgName = req.body.orgName;
  
  
    logger.debug("channelName  : " + channelName);
    logger.debug("chaincodeName : " + chaincodeName);
    logger.debug("fcn  : " + fcn);
    logger.debug("args  : " + args);
    if (!chaincodeName) {
      res.json(getErrorMessage("'chaincodeName'", res));
      return;
    }
    if (!channelName) {
      res.json(getErrorMessage("'channelName'", res));
      return;
    }
    if (!fcn) {
      res.json(getErrorMessage("'fcn'", res));
      return;
    }
    if (!args) {
      res.json(getErrorMessage("'args'", res));
      return;
    }
  
    let message = await query.queryChaincode(
      channelName,
      chaincodeName,
      args,
      fcn,
      userName,
      orgName
    );
    console.log("message",message)
    message = JSON.parse(message)
     var headers =  [];
        message.map((result,index)=>{
          var data=result.Record;
          var number=data.actualQty.split(':');
              headers.push({
                "vendor_id":index,
                "cartonNo":data.cartonNo,
                "SenderName":data.senderName,
              })
        })
    res.send(headers);
  });
  

/**
 * @typedef getALLCartonList
 * @property {string} userName.required - username - eg: user1
 * @property {string} orgName.required -   OrgName - eg: Org1
 */
/**
 * This function comment is parsed by testing
 * @route POST /bcNetwork/getALLCartonList
 * @group Network - Operations on Blockchain Network
 * @param {getALLCartonList.model} getALLCartonList.body.required - the new point
 * @returns {object} 200 - An array of user info
 * @returns {Error}  default - Unexpected error
 * @security JWT
*/
router.post("/getALLCartonList",passport.authenticate('jwt',{session:false}), async function(req, res) {
    logger.debug("==================== QUERY ON CHAINCODE getALLCartonList ==================");
    var fcn = "queryLedger";
    var args = [`{\"selector\":{\"docType\":\"CartonTypes\"}}`];
    console.log("args",args);
    var userName = req.body.userName;
    var orgName = req.body.orgName;
  
  
    logger.debug("channelName  : " + channelName);
    logger.debug("chaincodeName : " + chaincodeName);
    logger.debug("fcn  : " + fcn);
    logger.debug("args  : " + args);
    if (!chaincodeName) {
      res.json(getErrorMessage("'chaincodeName'", res));
      return;
    }
    if (!channelName) {
      res.json(getErrorMessage("'channelName'", res));
      return;
    }
    if (!fcn) {
      res.json(getErrorMessage("'fcn'", res));
      return;
    }
    if (!args) {
      res.json(getErrorMessage("'args'", res));
      return;
    }
  
    let message = await query.queryChaincode(
      channelName,
      chaincodeName,
      args,
      fcn,
      userName,
      orgName
    );
    console.log("message",message)
    message = JSON.parse(message)
     var headers =  [];
        message.map((result,index)=>{
          var data=result.Record;
          var number=data.actualQty.split(':');
              headers.push({
                "vendor_id":index,
                "cartonNo":data.cartonNo,
                "SenderName":data.senderName,
                "Processed":data.processed,
                "NewQty":data.newQty,
              })
        })
    res.send(headers);
  });

/**
 * @typedef getHistory
 * @property {string} userName.required - username - eg: user1
 * @property {string} orgName.required -   OrgName - eg: Org1
 * @property {string} cartonNo.required -   cartonNo - eg: D234CSDF234FS
 */
/**
 * This function comment is parsed by testing
 * @route POST /bcNetwork/getHistory
 * @group Network - Operations on Blockchain Network
 * @param {getHistory.model} getHistory.body.required - the new point
 * @returns {object} 200 - History of an asset info
 * @returns {Error}  default - Unexpected error
 * @security JWT
*/
router.post("/getHistory",passport.authenticate('jwt',{session:false}), async function(req, res) {
    logger.debug("==================== QUERY ON CHAINCODE getHistory ==================");
    var fcn = "getHistory";
    var cartonNo = req.body.cartonNo;
    var args = ['dummy',cartonNo];
    console.log("args",args);
    var userName = req.body.userName;
    var orgName = req.body.orgName;

    logger.debug("channelName  : " + channelName);
    logger.debug("chaincodeName : " + chaincodeName);
    logger.debug("fcn  : " + fcn);
    logger.debug("args  : " + args);
    if (!chaincodeName) {
      res.json(getErrorMessage("'chaincodeName'", res));
      return;
    }
    if (!channelName) {
      res.json(getErrorMessage("'channelName'", res));
      return;
    }
    if (!fcn) {
      res.json(getErrorMessage("'fcn'", res));
      return;
    }
    if (!args) {
      res.json(getErrorMessage("'args'", res));
      return;
    }
  
    let message = await query.queryChaincode(
      channelName,
      chaincodeName,
      args,
      fcn,
      userName,
      orgName
    );
    console.log("message",message)
    message = JSON.parse(message)
    res.send(message);
  });


/**
 * @typedef getCarton
 * @property {string} userName.required - userName - eg: user1
 * @property {string} orgName.required -   orgName - eg: Org1
 * @property {string} cartonNo.required -   cartonNo - eg: 2342532
 */
/**
 * This function comment is parsed by testing
 * @route POST /bcNetwork/getCarton
 * @group Network - Operations on Blockchain Network
 * @param {getCarton.model} getCarton.body.required - the new point
 * @returns {object} 200 - An array of user info
 * @returns {Error}  default - Unexpected error
 * @security JWT
*/
router.post("/getCarton",passport.authenticate('jwt',{session:false}), async function(req, res) {
    logger.debug("==================== QUERY ON CHAINCODE getCarton==================");
    var cartonNo=req.body.cartonNo;
    var fcn = "queryLedger";
    var args = [`{\"selector\":{\"docType\":\"CartonTypes\",\"cartonNo\":\"${cartonNo}\",\"processed\":false}}`];
    console.log("args",args);
    var userName = req.body.userName;
    var orgName = req.body.orgName;
  
  
    logger.debug("channelName  : " + channelName);
    logger.debug("chaincodeName : " + chaincodeName);
    logger.debug("fcn  : " + fcn);
    logger.debug("args  : " + args);
    if (!chaincodeName) {
      res.json(getErrorMessage("'chaincodeName'", res));
      return;
    }
    if (!channelName) {
      res.json(getErrorMessage("'channelName'", res));
      return;
    }
    if (!fcn) {
      res.json(getErrorMessage("'fcn'", res));
      return;
    }
    if (!args) {
      res.json(getErrorMessage("'args'", res));
      return;
    }
  
    let message = await query.queryChaincode(
      channelName,
      chaincodeName,
      args,
      fcn,
      userName,
      orgName
    );
    console.log("message",message)
    message = JSON.parse(message)
     var headers =  [];
        message.map((result,index)=>{
          var data=result.Record;
          var number=data.actualQty.split(':');
              headers.push({
                "vendor_id":index,
                "cartonNo":data.cartonNo,
                "SenderName":data.senderName,
		            "processed":data.processed
              })
        })
    res.send(headers);
  });
  
/**
 * @typedef getBlock
 * @property {string} channelName.required - channelName - eg: mychannel
 * @property {string} userName.required - username - eg: user1
 * @property {string} orgName.required -   OrgName - eg: Org1
 * @property {string} txid.required -   txid - eg: sfasfsafdy2343234sfasdf234234
 * @property {string} peers.required - args - eg: [""]
 */
/**
 * This function comment is parsed by testing
 * @route POST /bcNetwork/getBlock
 * @group Network - Operations on Blockchain Network
 * @param {getBlock.model} getBlock.body.required - the new point
 * @returns {object} 200 - An array of user info
 * @returns {Error}  default - Unexpected error
 * @security JWT
*/
router.post("/getBlock", passport.authenticate('jwt',{session:false}),async function(req, res) {
  logger.debug("==================== QUERY ON CHAINCODE ==================");
  var channelName = req.body.channelName;
  var userName = req.body.userName;
  var orgName = req.body.orgName;
  var txid = req.body.txid;
  var peers = req.body.peers;
  let message = await query.getTransactionByID(
    peers,
    channelName,
    txid,
    userName,
    orgName
  );
  res.send(message);
});

module.exports = router;