'use strict';
var axios = require('axios');

function getRequest(url, params) {
  return axios.get(url, {params: params})
    .then(function(res) {
      return res.data;
    }).catch(function(err) {
      console.error(err);
      throw new Error('cs-node-error');
    });
}

function postRequest(url, item, originalError) {
  return axios.post(url, item)
    .then(function(res) {
      return res.data;
    }).catch(function(err) {
      if (originalError) throw err;
      console.error(err);
      throw new Error('cs-node-error');
    });
}

module.exports = {
  getRequest: getRequest,
  postRequest: postRequest
};
