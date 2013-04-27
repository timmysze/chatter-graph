var Db = require('mongodb').Db,
    MongoClient = require('mongodb').MongoClient,
    Server = require('mongodb').Server,
    ReplSetServers = require('mongodb').ReplSetServers,
    ObjectID = require('mongodb').ObjectID,
    Binary = require('mongodb').Binary,
    GridStore = require('mongodb').GridStore,
    Code = require('mongodb').Code,
    BSON = require('mongodb').pure().BSON,
    assert = require('assert');

// Set up the connection to the local db
var mongoclient = new MongoClient(new Server("localhost", 27017, {native_parser: true}));

// Open the connection to the server
mongoclient.open(function(err, mongoclient) {

  // Get the first db and do an update document on it
  var db = mongoclient.db("integration_tests");
  db.collection('mongoclient_test').update({a:1}, {b:1}, {upsert:true}, function(err, result) {
    assert.equal(null, err);
    assert.equal(1, result);

    // Get another db and do an update document on it
    var db2 = mongoclient.db("integration_tests2");
    db2.collection('mongoclient_test').update({a:1}, {b:1}, {upsert:true}, function(err, result) {
      assert.equal(null, err);
      assert.equal(1, result);

      // Close the connection
      mongoclient.close();
    });
  });
});
