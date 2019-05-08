//Modules
const express = require('express'),
    bunyan = require('bunyan'),
    bodyParser = require('body-parser'),
    fetch = require("node-fetch");

//Load values from .env file
require('dotenv').config();

const app = express();
const log = bunyan.createLogger({ name: 'Authorization Code Flow' });

app.use(express.static('public'));

// parse application/x-www-form-urlencoded
app.use(bodyParser.urlencoded({ extended: false }));

app.set('view engine', 'ejs');

app.get('/', (req, res) => {
    res.render('index');
});

//Set 1: Ask the authorization code
app.get('/get/the/code', (req, res) => {

    const DeviceCode_Endpoint = `https://accounts.google.com/o/oauth2/device/code`;
    const Client_Id = "593767555101-6cdsou4a41hhirll0joq906peado0fh8.apps.googleusercontent.com";
    const Scope = 'email profile https://www.googleapis.com/auth/youtube.readonly';

    let body = `client_id=${Client_Id}&scope=${Scope}`;

    log.info(DeviceCode_Endpoint);

    fetch(DeviceCode_Endpoint, {
        method: 'POST',
        body: body,
        headers: {
            'Content-Type': 'application/x-www-form-urlencoded'
        }
    }).then(async response => {
        let json = await response.json();
        log.info(json);
        res.render('device-code', { code: JSON.stringify(json, undefined, 2), message: json.message, interval: json.interval, device_code: json.device_code }); //you shouldn't share the access token with the client-side

    }).catch(error => {
        log.error(error.message);
    });

});

//Step 2: Check if the user has signed and introduce the code
app.post('/checking', (req, res) => {

    const Token_Endpoint = `https://www.googleapis.com/oauth2/v4/token`;
    const Grant_Type = 'http://oauth.net/grant_type/device/1.0';
    const Client_Id = '593767555101-6cdsou4a41hhirll0joq906peado0fh8.apps.googleusercontent.com';
    const Client_Secret = 'nTjTQ2oBU93VGPEuDFlqUG4I';
    const Device_Code = req.body.device_code;

    let body = `grant_type=${Grant_Type}&client_id=${Client_Id}&client_secret=${Client_Secret}&code=${Device_Code}`;

    fetch(Token_Endpoint, {
        method: 'POST',
        body: body,
        headers: {
            'Content-Type': 'application/x-www-form-urlencoded'
        }
    }).then(async response => {

        let json = await response.json();
        log.info(json);

        if (response.ok) {
            res.send(200, json);
        }
        else {
            res.send(400);
        }

    }).catch(response => {
        log.error(response.error);
    });
});

//Step 3: Show the access token
app.get('/access/token', (req, res) => {

    res.render('access-token', { token: req.query.access_token }); //you shouldn't share the access token with the client-side

});

//Step 4: Call the protected API
app.post('/call/api', (req, res) => {

    let access_token = req.body.token;
    
    const Microsoft_Graph_Endpoint = 'https://www.googleapis.com';
    const Acction_That_I_Have_Access_Because_Of_My_Scope = '/youtube/v3/search?part=snippet&forMine=true&order=viewCount&type=video';

    //Call Microsoft Graph with your access token
    fetch(`${Microsoft_Graph_Endpoint}${Acction_That_I_Have_Access_Because_Of_My_Scope}`, {
        headers: {
            'Authorization': `Bearer ${access_token}`
        }
    }).then(async response => {

        let json = await response.json();
        res.render('calling-api', { response: JSON.stringify(json, undefined, 2) });
    });
});

app.listen(8000);