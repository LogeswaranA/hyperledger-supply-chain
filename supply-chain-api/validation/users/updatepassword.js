const Validator = require('validator');
const isEmpty = require('../is-empty');


module.exports = function validateUpdateInput(data){
    let errors = {};
    
    data.password   = !isEmpty(data.password) ? data.password : '';
    data.password2  = !isEmpty(data.password2) ? data.password2 : '';

    if(!Validator.equals(data.password,data.password2)){
      errors.password2= "Password must match";
    }

    if(Validator.isEmpty(data.password)){
      errors.password= "Password field is required";
    }
    if(Validator.isEmpty(data.password2)){
      errors.password2= "Confirm Password field is required";
    }

  
    return{
      errors,
      isValid: isEmpty(errors)
    };
};