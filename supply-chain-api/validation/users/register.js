const Validator = require('validator');
const isEmpty = require('../is-empty');

module.exports = function validateRegisterInput(data){
    let errors = {};

    data.name       = !isEmpty(data.name) ? data.name : '';
    data.userType   = !isEmpty(data.userType) ? data.userType : '';
    data.email      = !isEmpty(data.email) ? data.email : '';
    data.mobile     = !isEmpty(data.mobile) ? data.mobile : '';
    data.password   = !isEmpty(data.password) ? data.password : '';
    data.password2  = !isEmpty(data.password2) ? data.password2 : '';


    if(!Validator.isLength(data.name,{min:2,max:30})){
      errors.name = 'Name must be between 2 and 30 Characters';
    }
    if(Validator.isEmpty(data.name)){
      errors.name= "Name field is required";
    }
    if(Validator.isEmpty(data.userType)){
      errors.userType= "UserType field is required";
    }
    if(Validator.isEmpty(data.email)){
      errors.email= "Email field is required";
    }
    if(Validator.isEmpty(data.mobile)){
      errors.mobile= "Mobile field is required";
    }
    if(Validator.isEmpty(data.password)){
      errors.password= "Password field is required";
    }
    if(Validator.isEmpty(data.password2)){
      errors.password2= "Confirm Password field is required";
    }
  

    if (!Validator.isEmail(data.email)){
      errors.email= "Email is Invalid";
    }
  
    if(!Validator.isLength(data.password,{min:6,max:30})){
      errors.password= "Password must be atleast 6 characters";
    }

    if(!Validator.equals(data.password,data.password2)){
      errors.password2= "Password must match";
    }
  

    return{
      errors,
      isValid: isEmpty(errors)
    };
};