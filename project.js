var express = require('express');
var app = express();
var bodyParser = require('body-parser');
var cookieParser = require('cookie-parser');
var cookieSession = require('cookie-session');
app.set('view engine', 'ejs');
var path = require('path');
var fs = require('fs');
var formidable = require('formidable');
var MongoClient = require('mongodb').MongoClient; 
var assert = require('assert');
var ObjectId = require('mongodb').ObjectID;
var mongourl = 'mongodb://franco:O4PLi71z@ds251362.mlab.com:51362/franco';

app.use(cookieParser());
app.use(bodyParser.urlencoded({ extended: true }));

app.use(cookieSession({
  name: 'session',
  keys: ['key1', 'key2']
}));

app.get('/', function(req,res) {
  res.render('login.ejs');
});


app.get('/rate', function(req, res) {
	res.render('rate.ejs',{link:'rate?_id='+req.query._id});
});

app.post('/rate', function(req, res) {
  criteria = {};
  grade = {};
  newValues = {};
  edit = false;
  max = 5;
  criteria['_id'] = ObjectId(req.query._id);
  grade['user']=req.session.id;
  grade['score']=req.body.r_score;
	MongoClient.connect(mongourl, function(err, db) {
	assert.equal(err,null);
	console.log('Connected to MongoDB\n');
	findRestaurants(db,criteria,max,function(restaurants) {
		if (restaurants.length == 0) {
			res.writeHead(500, {"Content-Type": "text/plain"});
			res.end('No this restaurant');
		}else{
	   		for(i in restaurants){
	     			for(a in restaurants[i].grades){
					if(restaurants[i].grades[a].user==null){
						edit=false;
					}
					if(restaurants[i].grades[a].user == req.session.id){
                        			edit = true;
					}
	      			}
	    		}
			if(edit == true){
				res.writeHead(200, {"Content-Type": "text/plain"});
				res.end("You have already rated");
			}else{
			MongoClient.connect(mongourl,function(err,db) {
  				assert.equal(err,null);
  				console.log('Connected to MongoDB\n');
				restaurants[0].grades.push(grade);
				newValues['grades'] = restaurants[0].grades;
  				updateRestaurant(db,criteria,newValues,function(result) {
				db.close();
				res.writeHead(200, {"Content-Type": "text/plain"});
				res.end("update was successful!");
			});
 			});
			}
		}
             
	});
	});
});

app.get('/edit', function(req, res) {
	res.render('update.ejs',{link:'edit?_id='+req.query._id});
});


app.post('/edit', function(req, res) {
  criteria = {};
  newValues = {};
  criteria['_id'] = ObjectId(req.query._id);
  max = 5;

  	MongoClient.connect(mongourl, function(err, db) {
	assert.equal(err,null);
	console.log('Connected to MongoDB\n');
	findRestaurants(db,criteria,max,function(restaurants) {
		db.close();
		console.log('Disconnected MongoDB\n');
		if (restaurants.length == 0) {
			res.writeHead(500, {"Content-Type": "text/plain"});
			res.end('No this restaurant');
		}else{
			if(req.session.id == restaurants[0].owner_id){
				if(req.body.select == 'building' || req.body.select == 'zipcode' 
				   || req.body.select == 'street' || req.body.select == 'x-coord' 
                                   || req.body.select == 'y-coord'){	
					address = restaurants[0].address;
					address[req.body.select] = req.body.edit;
					newValues['address'] = address;
	
				}else{
  					newValues[req.body.select] = req.body.edit;
				}
				MongoClient.connect(mongourl,function(err,db) {
  					assert.equal(err,null);
  					console.log('Connected to MongoDB\n');
  					updateRestaurant(db,criteria,newValues,function(result) {
						db.close();
						res.writeHead(200, {"Content-Type": "text/plain"});
						res.end("update was successful!");
					});
 	 			});
			}else{
				 res.writeHead(500, {"Content-Type": "text/plain"});
				 res.end('You are not the owner');
			}
		}
	});
	});
});

app.get('/new', function(req, res) {
	res.render('create.ejs');
});



app.post('/new', function(req, res) {
  var form = new formidable.IncomingForm();
  form.parse(req, function (err, fields, files) {
  var new_r = {};
  new_r['restaurant_id'] = fields.id;
  new_r['owner_id'] = req.session.id;
  new_r['borough'] = fields.borough;
  new_r['cuisine'] = fields.cuisine;
  new_r['name'] = fields.name;
  var filename = files.photo.path;
  fs.readFile(filename, function(err,data) {            
  new_r['photo'] = new Buffer(data).toString('base64');
  });
  new_r['mimetype'] = files.photo.type;
  address = {}
  address['building'] = fields.building;
  address['street'] = fields.street;
  address['zipcode'] = fields.zipcode;
  coord = {}
  coord['xcoord'] = fields.x_coordinate;
  coord['ycoord'] = fields.y_coordinate;
  address['coord'] = coord;
  new_r['address'] = address;
  grades = []
  grade = {}
  grade['user'] = null;
  grade['score'] = null;
  grades.push(grade);
  new_r['grades'] = grades;
  MongoClient.connect(mongourl,function(err,db) {
		assert.equal(err,null);
		console.log('Connected to MongoDB\n');
		insertRestaurant(db,new_r,function(result) {
			db.close();
      			res.set({"Content-Type":"text/plain"});
			res.write(JSON.stringify(new_r));
			res.end("\ninsert was successful!");			
		});
	});
   });
});

app.get('/remove', function(req, res) {
	criteria['_id'] = ObjectId(req.query._id);
	MongoClient.connect(mongourl,function(err,db) {
		findRestaurants(db,criteria,max,function(restaurants) {
		db.close();
		console.log('Disconnected MongoDB\n');
		if(req.session.id == restaurants[0].owner_id){
			MongoClient.connect(mongourl,function(err,db) {
				assert.equal(err,null);
				console.log('Connected to MongoDB\n');
				deleteRestaurant(db,criteria,function(result) {
					db.close();
					res.writeHead(200, {"Content-Type": "text/plain"});
					res.end("delete was successful!");			
					});
				});
			}else{
				res.writeHead(500, {"Content-Type": "text/plain"});
			        res.end('You are not the owner!');
			}
			});
	});
});

app.get('/search', function(req, res) {
	res.render('search.ejs');
});

app.post('/search', function(req, res) {
	criteria = {};
	max = 500;
	criteria[req.body.wsearch] = req.body.srh;
	MongoClient.connect(mongourl, function(err, db) {
	console.log(criteria);
	assert.equal(err,null);
	console.log('Connected to MongoDB\n');
		findRestaurants(db,criteria,max,function(restaurants) {
				if(restaurants.length==0){
					res.writeHead(500, {"Content-Type": "text/plain"});
			        	res.end('No result!');
				}
				db.close();
				res.render('read.ejs',{restaurants:restaurants,user:req.session.id});	
		});
	});
});

app.get('/display', function(req, res) {
  	criteria = {};
	max = 5;
	criteria['_id'] = ObjectId(req.query._id);
	MongoClient.connect(mongourl, function(err, db) {
	console.log(criteria);
	assert.equal(err,null);
	console.log('Connected to MongoDB\n');
		findRestaurants(db,criteria,max,function(restaurants) {
				db.close();
				var image = new Buffer(restaurants[0].photo,'base64');        
      				var contentType = {};
      				contentType['Content-Type'] = restaurants[0].mimetype;
      				console.log(contentType['Content-Type']);
      				if (contentType['Content-Type'] == "image/jpeg") {
        				res.render('photo.ejs',{restaurants:restaurants,link:'https://www.google.com/maps/@'+restaurants[0].address.coord.xcoord+','+restaurants[0].address.coord.ycoord+',20z',rlink: '/rate?_id='+restaurants[0]._id,elink: '/edit?_id='+restaurants[0]._id,mlink: '/remove?_id='+restaurants[0]._id});
      				} else{
					res.render('photo.ejs',{restaurants:restaurants,link:'https://www.google.com/maps/@'+restaurants[0].address.coord.xcoord+','+restaurants[0].address.coord.ycoord+',20z',rlink: '/rate?_id='+restaurants[0]._id,elink: '/edit?_id='+restaurants[0]._id,mlink: '/remove?_id='+restaurants[0]._id});
				}
		});
	});
});


app.post('/read', function(req, res) {
  	criteria = {};
	max = 500;
	req.session.id = req.body.id;
  	req.session.password = req.body.password;
	MongoClient.connect(mongourl, function(err, db) {
	console.log(criteria);
	assert.equal(err,null);
	console.log('Connected to MongoDB\n');
		findRestaurants(db,criteria,max,function(restaurants) {
				db.close();
        			res.render('read.ejs',{restaurants:restaurants,user:req.session.id});
		});
	});
});


app.get('/back', function(req, res) {
  	criteria = {};
	max = 500;
	MongoClient.connect(mongourl, function(err, db) {
	console.log(criteria);
	assert.equal(err,null);
	console.log('Connected to MongoDB\n');
		findRestaurants(db,criteria,max,function(restaurants) {
				db.close();
        			res.render('read.ejs',{restaurants:restaurants,user:req.session.id});
		});
	});
});

app.get('/api/restaurant/name/:name',function(req,res){
    var result = {};
    result['name'] = req.params.name;
    max = 5
    MongoClient.connect(mongourl, function(err, db) {
    assert.equal(err,null);
		findRestaurants(db,result,max,function(restaurants) {
				if(restaurants.length==0){
					db.close();
					res.status(500).json('{}').end();
				}else{
					for(i in restaurants){	
					    res.status(200).json(restaurants[0]);
					}
				}
				
		});
	});
});

app.get('/api/restaurant/borough/:borough',function(req,res){
    var result = {};
    result['borough'] = req.params.borough;
    max = 5
    MongoClient.connect(mongourl, function(err, db) {
    assert.equal(err,null);
		findRestaurants(db,result,max,function(restaurants) {
				if(restaurants.length==0){
					db.close();
					res.status(500).json('{}').end();
				}else{
					for(i in restaurants){	
					    res.status(200).json(restaurants[0]);
					}
				}
				
		});
	});
});

app.get('/api/restaurant/cuisine/:cuisine',function(req,res){
    var result = {};
    result['cuisine'] = req.params.cuisine;
    max = 5
    MongoClient.connect(mongourl, function(err, db) {
    assert.equal(err,null);
		findRestaurants(db,result,max,function(restaurants) {
				if(restaurants.length==0){
					db.close();
					res.status(500).json('{}').end();
				}else{
					for(i in restaurants){	
					    res.status(200).json(restaurants[0]);
					}
				}
				
		});
	});
});

app.post('/api/restaurant', function(req, res) {
	var new_r = {}; // document to be inserted
	if (req.body.restaurant_id) new_r['restaurant_id'] = req.body.restaurant_id;
	if (req.body.name) new_r['name'] = req.body.name;
	if (req.body.borough) new_r['borough'] = req.body.borough;
	if (req.body.cuisine) new_r['cuisine'] = req.body.cuisine;
	if (req.body.photo) new_r['photo'] = req.body.photo;
	if (req.body.photo_mimetype) new_r['photo_mimetype'] = req.body.photo_mimetype;

	if (req.body.building || req.body.street || req.body.zipcode || req.body.xcoord || req.body.ycoord) {
		var address = {};
		if (req.body.building) address['building'] = req.body.building;
		if (req.body.street) address['street'] = req.body.street;
		if (req.body.zipcode) address['zipcode'] = req.body.zipcode;
		if (req.body.xcoord || req.body.ycoord) address['coord'] = [req.body.xcoord, req.body.ycoord];
		new_r['address'] = address;
	}
	if (req.body.owner_id) new_r['owner_id'] = req.body.owner_id;

	console.log('About to insert: ' + JSON.stringify(new_r));

	if (new_r["name"] != null && new_r["owner"] != null) {
		MongoClient.connect(mongourl, function(err, db) {
			assert.equal(err, null);
			console.log('Connected to MongoDB\n');
			insertRestaurant(db, new_r, function(result) {
				db.close();
				console.log(JSON.stringify(result));
				res.json({ status: "ok", _id: new_r._id });

			});
		});

	}
	else {
		res.json({ status: "failed" });
	}


});


function insertRestaurant(db,r,callback) {
	const myDb = db.db('franco') ;	
	myDb.collection('restaurant').insertOne(r,function(err,result) {
		assert.equal(err,null);
		console.log("Insert was successful!");
		console.log(JSON.stringify(result));
		callback(result);
	});
}



function updateRestaurant(db,criteria,newValues,callback) {
	const myDb = db.db('franco') ;	
	myDb.collection('restaurant').updateOne(
		criteria,{$set: newValues},function(err,result) {
			assert.equal(err,null);
			console.log("update was successfully");
			callback(result);
	});
}

function deleteRestaurant(db,criteria,callback) {
	const myDb = db.db('franco') ;	
	myDb.collection('restaurant').deleteMany(criteria,function(err,result) {
		assert.equal(err,null);
		console.log("Delete was successfully");
		callback(result);
	});
}

function findRestaurants(db,criteria,max,callback) {
	var restaurants = [];
	const myDb = db.db('franco') 
	if (max > 0) {
		cursor = myDb.collection('restaurant').find(criteria).limit(max); 		
	} else {
		cursor = myDb.collection('restaurant').find(criteria); 				
	}
	cursor.each(function(err, doc) {
		assert.equal(err, null); 
		if (doc != null) {
			restaurants.push(doc);
		} else {
			callback(restaurants); 
		}
	});
}

app.listen(process.env.PORT || 5000, function () {
  console.log('Example app listening on port 5000!');
});
