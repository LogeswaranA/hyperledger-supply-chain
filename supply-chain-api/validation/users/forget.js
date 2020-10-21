const Validator = require('validator');
const isEmpty = require('../is-empty');


module.exports = function validateForgetInput(data){
    let errors = {};
    
    data.mobile   = !isEmpty(data.mobile) ? data.mobile : '';
    if(Validator.isEmpty(data.mobile)){
      errors.mobile= "Enter Mobile Number";
    }
  
    return{
      errors,
      isValid: isEmpty(errors)
    };
};